"""
Management command: check_releases
-----------------------------------
Run on a schedule (e.g. every minute via Railway Cron) to:
  1. Find tracks whose release_at has passed and the announcement email hasn't been sent yet.
  2. Mark them as released (is_unreleased=False).
  3. Send a release announcement email to all mailing list subscribers via Resend.

Railway Cron setup:
  - Add a new Cron service in Railway pointing at this backend repo.
  - Set the schedule to: * * * * *  (every minute)
  - Set the command to:  python manage.py check_releases
  - Make sure DATABASE_URL and RESEND_API_KEY env vars are present on the cron service.
"""
import logging

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import MailingListSubscriber, Track

logger = logging.getLogger(__name__)

SAINTTED_FONT_URL = "https://framerusercontent.com/assets/LimSbtxVlVTxPCPPurHl7ZiNzU.woff2"


def _build_release_email_html(track: Track, subject: str) -> str:
    art_img = ""
    if track.art_url:
        art_img = f"""
              <img
                src="{track.art_url}"
                alt="{track.title}"
                width="200"
                style="display:block;height:auto;border-radius:8px;margin:0 0 32px;"
              />"""

    streaming_link = track.link_url or track.spotify_url or track.apple_music_url or ""
    cta = ""
    if streaming_link:
        cta = f"""
              <a href="{streaming_link}" style="display:block;padding:13px 30px;background:#ffffff;color:#000000;font-family:'Space Mono',ui-monospace,monospace;font-size:11px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;text-decoration:none;border-radius:8px;text-align:center;margin-bottom:12px;">
                listen now
              </a>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{subject}</title>
  <style>
    @font-face {{
      font-family: 'Saintted Regular';
      src: url('{SAINTTED_FONT_URL}') format('woff2');
      font-weight: 400;
      font-style: normal;
    }}
  </style>
</head>
<body style="margin:0;padding:0;background:#000000;font-family:'Space Mono',ui-monospace,monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:48px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#000000;border:1px solid rgba(255,255,255,0.1);border-radius:12px;overflow:hidden;">

          <!-- Header band -->
          <tr>
            <td style="padding:36px 40px 28px;border-bottom:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0;font-family:'Space Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.3);">saintted's circle</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:44px 40px 36px;">
              {art_img}
              <p style="margin:0 0 12px;font-family:'Space Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.35);">new release</p>
              <h1 style="margin:0 0 28px;font-family:'Saintted Regular','Space Mono',ui-monospace,monospace;font-size:42px;font-weight:400;letter-spacing:-0.01em;color:#ffffff;line-height:1.1;">
                {track.title}
              </h1>
              <p style="margin:0 0 16px;font-family:'Space Mono',ui-monospace,monospace;font-size:15px;font-weight:400;color:rgba(255,255,255,0.55);line-height:1.8;">
                it's out. go listen.
              </p>
              {f'<p style="margin:0 0 32px;font-family:\'Space Mono\',ui-monospace,monospace;font-size:15px;font-weight:400;color:rgba(255,255,255,0.55);line-height:1.8;">{track.description}</p>' if track.description else '<p style="margin:0 0 32px;"></p>'}
              <table cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 12px;">
                <tr>
                  <td>{cta}</td>
                </tr>
                <tr>
                  <td>
                    <a href="https://saintted.com" style="display:block;padding:13px 30px;background:transparent;color:rgba(255,255,255,0.7);font-family:'Space Mono',ui-monospace,monospace;font-size:11px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;text-decoration:none;border-radius:8px;border:1px solid rgba(255,255,255,0.2);text-align:center;">
                      visit saintted.com
                    </a>
                  </td>
                </tr>
              </table>
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
              <p style="margin:0;font-family:'Space Mono',ui-monospace,monospace;font-size:10px;letter-spacing:0.1em;text-transform:lowercase;color:rgba(255,255,255,0.2);">
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


class Command(BaseCommand):
    help = "Check for tracks whose release time has passed and send announcement emails."

    def handle(self, *args, **kwargs):
        now = timezone.now()
        due_tracks = Track.objects.filter(
            is_unreleased=True,
            is_published=True,
            release_at__lte=now,
            release_email_sent=False,
        )

        if not due_tracks.exists():
            self.stdout.write("No tracks due for release.")
            return

        api_key = getattr(settings, "RESEND_API_KEY", "").strip()
        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "saintted <noreply@mail.saintted.com>")
        subscribers = list(MailingListSubscriber.objects.values_list("email", flat=True))

        for track in due_tracks:
            self.stdout.write(f"Releasing: {track.title} (pk={track.pk})")

            # Mark as released
            track.is_unreleased = False
            track.release_email_sent = True
            track.save(update_fields=["is_unreleased", "release_email_sent"])

            if not api_key:
                logger.warning("RESEND_API_KEY not set — skipping release email for %s", track.title)
                self.stdout.write(self.style.WARNING("  RESEND_API_KEY not set, email skipped."))
                continue

            if not subscribers:
                self.stdout.write("  No subscribers to email.")
                continue

            subject = f"new music: {track.title}"
            html = _build_release_email_html(track, subject)
            text = (
                f"new music: {track.title}\n\n"
                f"it's out. go listen.\n\n"
                f"{track.description + chr(10) + chr(10) if track.description else ''}"
                f"{track.link_url or track.spotify_url or track.apple_music_url or 'saintted.com'}\n\n"
                f"love, saintted\nsaintted.com\n"
            )

            try:
                import resend as _resend
                _resend.api_key = api_key

                BATCH_SIZE = 100
                total_sent = 0
                for i in range(0, len(subscribers), BATCH_SIZE):
                    batch = subscribers[i: i + BATCH_SIZE]
                    messages = [
                        {"from": from_email, "to": [email], "subject": subject, "html": html, "text": text}
                        for email in batch
                    ]
                    _resend.Batch.send(messages)
                    total_sent += len(batch)

                self.stdout.write(self.style.SUCCESS(f"  Sent to {total_sent} subscribers."))
                logger.info("Release email sent for '%s' to %d subscribers", track.title, total_sent)

            except Exception as exc:
                # Don't re-flip release_email_sent — it stays True so we don't spam on next run.
                # Admin can manually re-send via broadcast if needed.
                logger.error("Release email FAILED for '%s': %s", track.title, exc, exc_info=True)
                self.stdout.write(self.style.ERROR(f"  Email failed: {exc}"))
