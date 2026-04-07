from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0015_track_unreleased_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="track",
            name="art_file",
            field=models.ImageField(
                blank=True,
                help_text="Uploaded cover art (shown in preference to art URL when set)",
                null=True,
                upload_to="track-art/",
            ),
        ),
    ]
