# Release countdown singleton (home page)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0007_seed_featured_youtube_videos"),
    ]

    operations = [
        migrations.CreateModel(
            name="ReleaseCountdown",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "enabled",
                    models.BooleanField(default=False, help_text="Show countdown on the public site"),
                ),
                (
                    "song_title",
                    models.CharField(
                        blank=True,
                        help_text="e.g. Single name shown above the timer",
                        max_length=255,
                    ),
                ),
                (
                    "release_at",
                    models.DateTimeField(
                        blank=True,
                        help_text="When the song drops (stored in UTC; use admin timezone awareness)",
                        null=True,
                    ),
                ),
                (
                    "presave_url",
                    models.URLField(
                        blank=True,
                        help_text="Pre-save / pre-add link (Spotify, Apple, Linkfire, etc.)",
                    ),
                ),
            ],
            options={
                "verbose_name": "Release countdown",
                "verbose_name_plural": "Release countdown",
            },
        ),
    ]
