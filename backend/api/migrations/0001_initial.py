# Generated migration

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Track",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=255)),
                ("slug", models.SlugField(max_length=255, unique=True)),
                ("meta", models.CharField(help_text="e.g. Single, Single (Sound), EP", max_length=128)),
                ("art_url", models.URLField(blank=True, help_text="Cover art image URL")),
                ("link_url", models.URLField(blank=True, help_text="Streaming or purchase link")),
                ("order", models.PositiveIntegerField(default=0, help_text="Display order (lower first)")),
            ],
            options={
                "ordering": ["order", "title"],
            },
        ),
    ]
