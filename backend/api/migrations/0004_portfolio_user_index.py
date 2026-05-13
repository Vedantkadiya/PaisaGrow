"""
0004_portfolio_user_index.py — Add DB index on Portfolio.user_id

PERF: Every list/buy/summary view filters Portfolio by user_id via a FK.
      Without an explicit index, PostgreSQL does a sequential scan on the table.
      Django adds an index for FK columns automatically — this migration makes
      the intent explicit and adds a composite index (user_id, created_at) for
      the common "list all holdings for user, ordered by -created_at" query.

      Also adds index on WalletTransaction.user_id + timestamp for the
      wallet transaction list and CSV export queries.

WORKLOAD THIS HELPS: Any user with >50 holdings; any deployment with >1000 users
      where the table has >50k total rows (PostgreSQL planner will use the index).
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_portfolio_notes_watchlist_alert_type'),
    ]

    operations = [
        # Composite index: covers ORDER BY -created_at for the portfolio list view
        migrations.AddIndex(
            model_name='portfolio',
            index=models.Index(fields=['user', '-created_at'], name='portfolio_user_created_idx'),
        ),
        # Composite index: covers ORDER BY -timestamp for the wallet transaction list
        migrations.AddIndex(
            model_name='wallettransaction',
            index=models.Index(fields=['user', '-timestamp'], name='wallet_tx_user_ts_idx'),
        ),
        # Composite index for the SIP unique-together lookup (year, month per user)
        migrations.AddIndex(
            model_name='siplog',
            index=models.Index(fields=['user', 'year', 'month'], name='siplog_user_year_month_idx'),
        ),
    ]
