from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0011_releasecountdown_header_image_file_and_crop"),
    ]

    operations = [
        migrations.CreateModel(
            name="GalleryImage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("image", models.ImageField(upload_to="gallery/")),
                ("caption", models.CharField(blank=True, max_length=255)),
                ("order", models.PositiveIntegerField(default=0, help_text="Display order (lower first)")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": ["order", "-created_at", "id"],
            },
        ),
    ]
