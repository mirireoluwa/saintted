from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0019_galleryimage_external_url_and_seed"),
    ]

    operations = [
        migrations.AddField(
            model_name="track",
            name="release_email_sent",
            field=models.BooleanField(
                default=False,
                help_text="Set automatically when the release announcement email has been sent to subscribers.",
            ),
        ),
    ]
