from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0013_releasecountdown_header_focus_xy"),
    ]

    operations = [
        migrations.AddField(
            model_name="track",
            name="is_published",
            field=models.BooleanField(
                default=True,
                help_text="When off, track is hidden from public API and site (draft).",
            ),
        ),
    ]
