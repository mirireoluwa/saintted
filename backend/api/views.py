import json
import logging
import threading
import urllib.request
from urllib.error import URLError

from django.conf import settings
from django.db import connection
from django.http import JsonResponse
from rest_framework import generics, status, viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import FeaturedVideo, GalleryImage, MailingListSubscriber, ReleaseCountdown, Track
from .permissions import ReadOnlyOrAuthenticated
from .serializers import (
    FeaturedVideoSerializer,
    GalleryImageSerializer,
    MailingListSubscriberSerializer,
    ReleaseCountdownSerializer,
    TrackDetailSerializer,
    TrackSerializer,
)

logger = logging.getLogger(__name__)


def _send_to_sheets(webhook_url: str, subscriber: MailingListSubscriber) -> None:
    """Fire-and-forget: POST subscriber data to a Google Apps Script webhook."""
    payload = json.dumps({
        "first_name": subscriber.first_name,
        "last_name": subscriber.last_name,
        "email": subscriber.email,
        "subscribed_at": subscriber.subscribed_at.isoformat(),
    }).encode("utf-8")
    try:
        req = urllib.request.Request(
            webhook_url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10):
            pass
    except (URLError, OSError, Exception) as exc:
        logger.warning("Google Sheets webhook failed for %s: %s", subscriber.email, exc)


def _build_circle_email_html(first: str, subject: str) -> str:
    """Return the HTML body for The Circle welcome / confirmation email."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{subject}</title>
  <style>
    @font-face {{
      font-family: 'Saintted Regular';
      src: url('https://framerusercontent.com/assets/LimSbtxVlVTxPCPPurHl7ZiNzU.woff2') format('woff2');
      font-weight: 400;
      font-style: normal;
    }}
  </style>
</head>
<body style="margin:0;padding:0;background:#000000;font-family:'Space Grotesk',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:48px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#000000;border:1px solid rgba(255,255,255,0.1);border-radius:12px;overflow:hidden;">

          <!-- Header band -->
          <tr>
            <td style="padding:36px 40px 28px;border-bottom:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0;font-family:'DM Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.3);">saintted's circle</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:44px 40px 36px;">
              <h1 style="margin:0 0 28px;font-family:'Saintted Regular','Space Grotesk',system-ui,sans-serif;font-size:38px;font-weight:400;letter-spacing:-0.01em;color:#ffffff;line-height:1.15;">
                welcome to<br/>The Circle.
              </h1>
              <p style="margin:0 0 16px;font-family:'Saintted Regular','Space Grotesk',system-ui,sans-serif;font-size:18px;font-weight:400;color:rgba(255,255,255,0.55);line-height:1.7;">
                hey {first},
              </p>
              <p style="margin:0 0 16px;font-family:'Saintted Regular','Space Grotesk',system-ui,sans-serif;font-size:18px;font-weight:400;color:rgba(255,255,255,0.55);line-height:1.7;">
                you're now part of something i hold close — a small, intentional community of people who actually care about the music.
              </p>
              <p style="margin:0 0 36px;font-family:'Saintted Regular','Space Grotesk',system-ui,sans-serif;font-size:18px;font-weight:400;color:rgba(255,255,255,0.55);line-height:1.7;">
                you'll hear from me when it matters: new music, honest updates, and things i only share in here. glad you're here.
              </p>
              <a href="https://saintted.com" style="display:inline-block;padding:13px 30px;background:#ffffff;color:#000000;font-family:'DM Mono',ui-monospace,monospace;font-size:11px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;text-decoration:none;border-radius:8px;margin-right:12px;">
                visit saintted.com
              </a>
              <a href="https://chat.whatsapp.com/FXNIdq5z0r92PaMzEXQkkF" style="display:inline-block;padding:13px 30px;background:transparent;color:rgba(255,255,255,0.7);font-family:'DM Mono',ui-monospace,monospace;font-size:11px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;text-decoration:none;border-radius:8px;border:1px solid rgba(255,255,255,0.2);">
                join the whatsapp
              </a>
            </td>
          </tr>

          <!-- Footer / signature -->
          <tr>
            <td style="padding:28px 40px;border-top:1px solid rgba(255,255,255,0.08);">
              <img
                src="https://saintted.com/love-saintted.png"
                alt="love, saintted"
                width="120"
                style="display:block;height:auto;margin-bottom:16px;opacity:0.8;"
              />
              <p style="margin:0;font-family:'DM Mono',ui-monospace,monospace;font-size:10px;letter-spacing:0.1em;text-transform:lowercase;color:rgba(255,255,255,0.2);">
                © 2026 saintted. all rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _send_via_resend(*, from_email: str, to: list[str], subject: str, html: str, text: str) -> None:
    """Send a single email via the Resend SDK. Raises on failure."""
    import resend as _resend  # installed via requirements.txt
    _resend.api_key = settings.RESEND_API_KEY
    _resend.Emails.send({
        "from": from_email,
        "to": to,
        "subject": subject,
        "html": html,
        "text": text,
    })


def _send_confirmation_email(subscriber: MailingListSubscriber) -> None:
    """Fire-and-forget: send a welcome email to a new subscriber via Resend."""
    api_key = getattr(settings, "RESEND_API_KEY", "").strip()
    if not api_key:
        logger.info("RESEND_API_KEY not set — skipping confirmation email for %s", subscriber.email)
        return

    subject = getattr(settings, "MAILING_LIST_CONFIRMATION_SUBJECT", "you're on the list.")
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "saintted <noreply@saintted.com>")
    first = subscriber.first_name

    text_body = (
        f"hey {first},\n\n"
        "welcome to The Circle.\n\n"
        "you're now part of something i hold close — a small, intentional community "
        "of people who actually care about the music.\n\n"
        "you'll hear from me when it matters: new music, honest updates, "
        "and things i only share in here.\n\n"
        "glad you're here.\n\n"
        "join the whatsapp channel: https://chat.whatsapp.com/FXNIdq5z0r92PaMzEXQkkF\n\n"
        "love, saintted\n"
        "saintted.com\n"
    )
    html_body = _build_circle_email_html(first, subject)

    try:
        logger.info("Sending confirmation email to %s via Resend", subscriber.email)
        _send_via_resend(
            from_email=from_email,
            to=[subscriber.email],
            subject=subject,
            html=html_body,
            text=text_body,
        )
        logger.info("Confirmation email sent OK to %s", subscriber.email)
    except Exception as exc:
        logger.error("Confirmation email FAILED for %s: %s", subscriber.email, exc, exc_info=True)


def api_email_diagnostic(request):
    """
    GET /api/diagnostic/email/?to=you@example.com
    Sends a test email via Resend and reports success or the exact error.
    Requires token auth so it is not publicly abusable.
    """
    user = getattr(request, "user", None)
    if not (user and user.is_authenticated):
        return JsonResponse({"error": "authentication required"}, status=401)

    to = (request.GET.get("to") or "").strip()
    if not to:
        return JsonResponse({"error": "pass ?to=your@email.com"}, status=400)

    api_key = getattr(settings, "RESEND_API_KEY", "").strip()
    out: dict = {
        "provider": "resend",
        "resend_api_key_set": bool(api_key),
        "from": getattr(settings, "DEFAULT_FROM_EMAIL", "(not set)"),
        "sent": False,
    }
    if not api_key:
        out["error"] = "RESEND_API_KEY is not set"
        return JsonResponse(out)
    try:
        _send_via_resend(
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[to],
            subject="saintted email diagnostic",
            html="<p>If you received this, Resend email sending is working correctly.</p>",
            text="If you received this, Resend email sending is working correctly.",
        )
        out["sent"] = True
    except Exception as exc:
        out["error"] = str(exc)
    return JsonResponse(out)


def api_db_diagnostic(_request):
    """
    Plain Django view (not DRF) — GET /api/diagnostic/db/
    Helps when every DRF list returns 500: usually DB URL / missing migrations.
    """
    out: dict = {"select1": False, "track_table": False}
    try:
        with connection.cursor() as c:
            c.execute("SELECT 1")
        out["select1"] = True
        out["track_count"] = Track.objects.count()
        out["track_table"] = True
    except Exception as e:
        out["error"] = str(e)
        out["error_type"] = type(e).__name__
    return JsonResponse(out)


class TrackViewSet(viewsets.ModelViewSet):
    """
    List/retrieve/update tracks. Public GET; POST/PATCH/PUT/DELETE need token auth.
    Detail by slug: /api/tracks/<slug>/
    Unauthenticated reads only see published tracks; authenticated users see all.
    Accepts JSON or multipart (for cover art upload / clear).
    """

    serializer_class = TrackSerializer
    permission_classes = [ReadOnlyOrAuthenticated]
    lookup_field = "slug"
    lookup_url_kwarg = "slug"
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return TrackDetailSerializer
        return TrackSerializer

    def get_queryset(self):
        qs = Track.objects.all()
        user = getattr(self.request, "user", None)
        if user and user.is_authenticated:
            return qs
        return qs.filter(is_published=True)


class FeaturedVideoViewSet(viewsets.ModelViewSet):
    """Featured YouTube videos: public GET; writes need authentication."""
    queryset = FeaturedVideo.objects.all()
    serializer_class = FeaturedVideoSerializer
    permission_classes = [ReadOnlyOrAuthenticated]


class GalleryImageViewSet(viewsets.ModelViewSet):
    """Public gallery images: public GET; writes need authentication."""
    queryset = GalleryImage.objects.all()
    serializer_class = GalleryImageSerializer
    permission_classes = [ReadOnlyOrAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]


class ReleaseCountdownDetailView(generics.RetrieveUpdateAPIView):
    """
    Singleton settings for home-page release countdown + pre-save link.
    GET is public; PATCH/PUT require authentication.
    """
    serializer_class = ReleaseCountdownSerializer
    permission_classes = [ReadOnlyOrAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        obj, _ = ReleaseCountdown.objects.get_or_create(
            pk=1,
            defaults={
                "enabled": False,
                "song_title": "",
                "release_at": None,
                "presave_url": "",
                "header_image_url": "",
                "header_image_crop": "center",
                "header_image_focus_x": 50.0,
                "header_image_focus_y": 50.0,
            },
        )
        return obj


class MailingListSubscribeView(APIView):
    """
    POST /api/mailing-list/subscribe/
    Public endpoint. Saves subscriber to DB and asynchronously syncs to
    Google Sheets if GOOGLE_SHEETS_WEBHOOK_URL is configured.
    """
    permission_classes = [AllowAny]
    parser_classes = [JSONParser, FormParser]

    def post(self, request):
        serializer = MailingListSubscriberSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data["email"].lower().strip()

        if MailingListSubscriber.objects.filter(email=email).exists():
            return Response(
                {"message": "You're already on the list!", "already_subscribed": True},
                status=status.HTTP_200_OK,
            )

        subscriber = MailingListSubscriber.objects.create(
            first_name=serializer.validated_data["first_name"].strip(),
            last_name=serializer.validated_data["last_name"].strip(),
            email=email,
        )

        webhook_url = getattr(settings, "GOOGLE_SHEETS_WEBHOOK_URL", "").strip()
        if webhook_url:
            threading.Thread(
                target=_send_to_sheets,
                args=(webhook_url, subscriber),
                daemon=True,
            ).start()

        threading.Thread(
            target=_send_confirmation_email,
            args=(subscriber,),
            daemon=True,
        ).start()

        return Response(
            {"message": "You're on the list!", "already_subscribed": False},
            status=status.HTTP_201_CREATED,
        )


class MailingListSubscribersView(APIView):
    """
    GET /api/mailing-list/subscribers/
    Admin-only: return subscriber count + list (newest first).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        subscribers = MailingListSubscriber.objects.all().order_by("-subscribed_at")
        data = [
            {
                "id": s.id,
                "first_name": s.first_name,
                "last_name": s.last_name,
                "email": s.email,
                "subscribed_at": s.subscribed_at.isoformat(),
            }
            for s in subscribers
        ]
        return Response({"count": len(data), "subscribers": data})


class MailingListSubscriberDetailView(APIView):
    """
    DELETE /api/mailing-list/subscribers/<pk>/
    Admin-only: remove a single subscriber.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk: int):
        try:
            subscriber = MailingListSubscriber.objects.get(pk=pk)
        except MailingListSubscriber.DoesNotExist:
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        subscriber.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class BroadcastEmailView(APIView):
    """
    POST /api/mailing-list/broadcast/
    Admin-only: send a custom HTML email to every subscriber via Resend batch API.

    Request body (JSON):
      { "subject": "...", "html": "...", "text": "..." (optional) }

    Resend batch limit is 100 per call — we chunk automatically.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def post(self, request):
        subject = (request.data.get("subject") or "").strip()
        html = (request.data.get("html") or "").strip()
        text = (request.data.get("text") or "").strip()

        if not subject:
            return Response({"error": "subject is required"}, status=status.HTTP_400_BAD_REQUEST)
        if not html:
            return Response({"error": "html is required"}, status=status.HTTP_400_BAD_REQUEST)

        api_key = getattr(settings, "RESEND_API_KEY", "").strip()
        if not api_key:
            return Response(
                {"error": "RESEND_API_KEY is not configured on the server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "saintted <noreply@saintted.com>")
        subscribers = list(MailingListSubscriber.objects.all().values_list("email", flat=True))
        if not subscribers:
            return Response({"sent": 0, "message": "No subscribers found."})

        try:
            import resend as _resend
            _resend.api_key = api_key

            # Resend batch: max 100 per call
            BATCH_SIZE = 100
            total_sent = 0
            for i in range(0, len(subscribers), BATCH_SIZE):
                batch_emails = subscribers[i: i + BATCH_SIZE]
                messages = [
                    {
                        "from": from_email,
                        "to": [email],
                        "subject": subject,
                        "html": html,
                        **({"text": text} if text else {}),
                    }
                    for email in batch_emails
                ]
                _resend.Batch.send(messages)
                total_sent += len(batch_emails)

            logger.info("Broadcast sent to %d subscribers: %s", total_sent, subject)
            return Response({"sent": total_sent})
        except Exception as exc:
            logger.error("Broadcast email FAILED: %s", exc, exc_info=True)
            return Response(
                {"error": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
