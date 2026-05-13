"""
0005_userprofile_password_changed_at.py

Adds UserProfile.password_changed_at (DateTimeField, nullable).

Purpose: SEC-H3 — make password reset tokens single-use.
ForgotPasswordView embeds `iat` (issued-at epoch) in the signed token.
ResetPasswordView stamps password_changed_at after a successful reset.
Any subsequent attempt to use the same token is rejected because
token.iat < profile.password_changed_at.

Null means "never changed via the API" — tokens issued before this
migration are still valid until their normal 1-hour expiry.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0004_portfolio_user_index'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='password_changed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
