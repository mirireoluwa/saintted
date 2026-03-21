# Seed featured section with two YouTube embeds (idempotent per youtube_id).

from django.db import migrations


def forwards(apps, schema_editor):
    FeaturedVideo = apps.get_model("api", "FeaturedVideo")
    rows = [
        # https://youtu.be/CZ5orlyaDd8
        {"youtube_id": "CZ5orlyaDd8", "order": 0, "title": ""},
        # https://youtu.be/zB1PkrtOBGU
        {"youtube_id": "zB1PkrtOBGU", "order": 1, "title": ""},
    ]
    for row in rows:
        FeaturedVideo.objects.get_or_create(
            youtube_id=row["youtube_id"],
            defaults={"order": row["order"], "title": row["title"]},
        )


def backwards(apps, schema_editor):
    FeaturedVideo = apps.get_model("api", "FeaturedVideo")
    FeaturedVideo.objects.filter(
        youtube_id__in=["CZ5orlyaDd8", "zB1PkrtOBGU"]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0006_populate_streaming_search_urls"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
