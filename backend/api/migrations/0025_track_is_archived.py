from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0024_liveshow_title'),
    ]

    operations = [
        migrations.AddField(
            model_name='track',
            name='is_archived',
            field=models.BooleanField(default=False, help_text='Archived tracks are hidden everywhere on the public site but kept here for later.'),
        ),
    ]
