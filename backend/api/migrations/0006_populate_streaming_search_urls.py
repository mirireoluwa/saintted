# Populate streaming fields with platform search URLs (Saintted + track title).
# Public APIs did not expose stable per-track IDs; admin can replace with direct links.

import urllib.parse

from django.db import migrations


def _spotify(q: str) -> str:
    return "https://open.spotify.com/search/" + urllib.parse.quote(q)


def _apple(q: str) -> str:
    return "https://music.apple.com/us/search?term=" + urllib.parse.quote(q)


def _youtube(q: str) -> str:
    return "https://www.youtube.com/results?search_query=" + urllib.parse.quote(q)


def populate(apps, schema_editor):
    Track = apps.get_model("api", "Track")
    for t in Track.objects.all():
        q = f"Saintted {t.title}".strip()
        updates = {}
        if not (t.youtube_url or "").strip():
            updates["youtube_url"] = _youtube(q)
        if not (t.apple_music_url or "").strip():
            updates["apple_music_url"] = _apple(q)
        if not (t.spotify_url or "").strip():
            updates["spotify_url"] = _spotify(q)
        if updates:
            Track.objects.filter(pk=t.pk).update(**updates)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0005_featuredvideo"),
    ]

    operations = [
        migrations.RunPython(populate, noop),
    ]
