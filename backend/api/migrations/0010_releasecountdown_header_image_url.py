from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0009_releasecountdown_singleton_row"),
    ]

    operations = [
        migrations.AddField(
            model_name="releasecountdown",
            name="header_image_url",
            field=models.URLField(
                blank=True,
                default="",
                help_text="Optional hero/header image URL for the public home page",
            ),
        ),
    ]
