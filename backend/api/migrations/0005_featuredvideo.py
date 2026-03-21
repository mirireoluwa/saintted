# Generated migration

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0004_populate_track_details"),
    ]

    operations = [
        migrations.CreateModel(
            name="FeaturedVideo",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(blank=True, help_text="Optional display title", max_length=255)),
                ("youtube_id", models.CharField(help_text="YouTube video ID (e.g. from watch?v=VIDEO_ID)", max_length=20)),
                ("order", models.PositiveIntegerField(default=0, help_text="Display order (lower first)")),
            ],
            options={
                "ordering": ["order", "title"],
            },
        ),
    ]
