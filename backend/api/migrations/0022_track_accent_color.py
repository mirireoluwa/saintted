from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0021_live_show_about_content'),
    ]

    operations = [
        migrations.AddField(
            model_name='track',
            name='accent_color',
            field=models.CharField(blank=True, default='', help_text="Optional #rrggbb accent for this track's countdown page. Blank = site default.", max_length=7),
        ),
    ]
