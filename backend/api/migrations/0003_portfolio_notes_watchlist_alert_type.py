from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_dailytrackerentry_date_index'),
    ]

    operations = [
        migrations.AddField(
            model_name='portfolio',
            name='notes',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='watchlist',
            name='alert_type',
            field=models.CharField(blank=True, default='above', max_length=10),
        ),
    ]
