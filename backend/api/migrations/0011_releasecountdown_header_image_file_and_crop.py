from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0010_releasecountdown_header_image_url"),
    ]

    operations = [
        migrations.AddField(
            model_name="releasecountdown",
            name="header_image_crop",
            field=models.CharField(
                choices=[
                    ("center", "Center"),
                    ("top", "Top"),
                    ("bottom", "Bottom"),
                    ("left", "Left"),
                    ("right", "Right"),
                ],
                default="center",
                help_text="How the hero/header image should be cropped",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="releasecountdown",
            name="header_image_file",
            field=models.FileField(
                blank=True,
                help_text="Optional uploaded hero/header image for the public home page",
                null=True,
                upload_to="hero-header/",
            ),
        ),
    ]
