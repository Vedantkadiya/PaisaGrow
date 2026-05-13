# Generated migration: add db_index to DailyTrackerEntry.date
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='dailytrackerentry',
            name='date',
            field=models.DateField(db_index=True),
        ),
    ]
