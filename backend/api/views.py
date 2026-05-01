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
from rest_framework.permissions import AllowAny
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

        return Response(
            {"message": "You're on the list!", "already_subscribed": False},
            status=status.HTTP_201_CREATED,
        )
