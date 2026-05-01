from django.db import migrations, models


def seed_gallery_images(apps, schema_editor):
    GalleryImage = apps.get_model("api", "GalleryImage")
    entries = [
        {
            "external_url": "https://saintted.com/saintted-1.jpg",
            "caption": "",
            "order": 0,
        },
        {
            "external_url": "https://saintted.com/saintted-2.jpg",
            "caption": "",
            "order": 1,
        },
    ]
    for entry in entries:
        if not GalleryImage.objects.filter(external_url=entry["external_url"]).exists():
            GalleryImage.objects.create(**entry)


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0018_mailinglistsubscriber"),
    ]

    operations = [
        migrations.AddField(
            model_name="galleryimage",
            name="external_url",
            field=models.URLField(
                blank=True,
                default="",
                help_text="External image URL (used when no file is uploaded, e.g. Vercel-hosted /public assets)",
            ),
        ),
        migrations.AlterField(
            model_name="galleryimage",
            name="image",
            field=models.ImageField(blank=True, null=True, upload_to="gallery/"),
        ),
        migrations.RunPython(seed_gallery_images, migrations.RunPython.noop),
    ]
