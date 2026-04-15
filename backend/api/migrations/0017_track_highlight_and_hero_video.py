from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0016_track_art_file"),
    ]

    operations = [
        migrations.AddField(
            model_name="releasecountdown",
            name="header_video_file",
            field=models.FileField(
                blank=True,
                help_text="Optional uploaded hero/header video for the public home page",
                null=True,
                upload_to="hero-header-video/",
            ),
        ),
        migrations.AddField(
            model_name="releasecountdown",
            name="header_video_url",
            field=models.URLField(
                blank=True,
                default="",
                help_text="Optional hero/header video URL for the public home page",
            ),
        ),
        migrations.AddField(
            model_name="track",
            name="is_highlighted",
            field=models.BooleanField(
                default=False,
                help_text="Highlight this track as a featured/new release on the public site.",
            ),
        ),
    ]

