from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0014_track_is_published"),
    ]

    operations = [
        migrations.AddField(
            model_name="track",
            name="is_unreleased",
            field=models.BooleanField(
                default=False,
                help_text="When on, track appears as upcoming on the site; detail page shows countdown + pre-save.",
            ),
        ),
        migrations.AddField(
            model_name="track",
            name="release_at",
            field=models.DateTimeField(
                blank=True,
                help_text="Drop time for unreleased tracks (UTC in DB; set via admin in local time).",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="track",
            name="presave_url",
            field=models.URLField(
                blank=True,
                help_text="Pre-save / pre-add link for this track (shown on unreleased detail page).",
            ),
        ),
    ]
