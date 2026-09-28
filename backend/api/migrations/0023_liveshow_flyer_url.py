from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0022_track_accent_color'),
    ]

    operations = [
        migrations.AddField(
            model_name='liveshow',
            name='flyer_url',
            field=models.URLField(blank=True, help_text='Optional flyer / poster image (used as the home-page story background)', max_length=500),
        ),
    ]
