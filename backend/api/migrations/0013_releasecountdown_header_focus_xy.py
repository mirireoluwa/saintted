from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0012_galleryimage"),
    ]

    operations = [
        migrations.AddField(
            model_name="releasecountdown",
            name="header_image_focus_x",
            field=models.FloatField(
                default=50.0,
                help_text="Horizontal focal point in percent (0 = left, 100 = right)",
                validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
            ),
        ),
        migrations.AddField(
            model_name="releasecountdown",
            name="header_image_focus_y",
            field=models.FloatField(
                default=50.0,
                help_text="Vertical focal point in percent (0 = top, 100 = bottom)",
                validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
            ),
        ),
    ]
