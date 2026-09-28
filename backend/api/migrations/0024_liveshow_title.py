from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0023_liveshow_flyer_url'),
    ]

    operations = [
        migrations.AddField(
            model_name='liveshow',
            name='title',
            field=models.CharField(blank=True, help_text="Optional show title, e.g. 'Album release party'", max_length=255),
        ),
    ]
