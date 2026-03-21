# Generated migration

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0002_seed_tracks"),
    ]

    operations = [
        migrations.AddField(
            model_name="track",
            name="description",
            field=models.TextField(blank=True, help_text="About the song"),
        ),
        migrations.AddField(
            model_name="track",
            name="year",
            field=models.PositiveIntegerField(blank=True, help_text="Release year", null=True),
        ),
        migrations.AddField(
            model_name="track",
            name="youtube_url",
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name="track",
            name="apple_music_url",
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name="track",
            name="spotify_url",
            field=models.URLField(blank=True),
        ),
    ]
