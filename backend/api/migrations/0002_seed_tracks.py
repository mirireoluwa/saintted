# Data migration: seed initial tracks

from django.db import migrations


def seed_tracks(apps, schema_editor):
    Track = apps.get_model("api", "Track")
    tracks = [
        {"title": "one chance", "slug": "one-chance", "meta": "Single", "order": 0},
        {"title": "shimmer", "slug": "shimmer", "meta": "Single (Sound)", "order": 1},
        {"title": "hyperphoria", "slug": "hyperphoria", "meta": "Single", "order": 2},
        {"title": "runaway", "slug": "runaway", "meta": "Single", "order": 3},
        {"title": "home", "slug": "home", "meta": "Single", "order": 4},
    ]
    for t in tracks:
        Track.objects.get_or_create(slug=t["slug"], defaults=t)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_tracks, noop),
    ]
