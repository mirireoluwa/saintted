# Ensure pk=1 exists for ReleaseCountdown (idempotent).

from django.db import migrations


def forwards(apps, schema_editor):
    ReleaseCountdown = apps.get_model("api", "ReleaseCountdown")
    ReleaseCountdown.objects.get_or_create(
        pk=1,
        defaults={
            "enabled": False,
            "song_title": "",
            "release_at": None,
            "presave_url": "",
        },
    )


def backwards(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0008_releasecountdown"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
