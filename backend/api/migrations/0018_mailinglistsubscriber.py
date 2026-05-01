from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0017_track_highlight_and_hero_video"),
    ]

    operations = [
        migrations.CreateModel(
            name="MailingListSubscriber",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("first_name", models.CharField(max_length=100)),
                ("last_name", models.CharField(max_length=100)),
                ("email", models.EmailField(max_length=254, unique=True)),
                ("subscribed_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "verbose_name": "Mailing list subscriber",
                "verbose_name_plural": "Mailing list subscribers",
                "ordering": ["-subscribed_at"],
            },
        ),
    ]
