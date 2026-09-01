"""add savings buckets

Adds the Savings Buckets feature: a `buckets` table (virtual named allocations
against a savings account's balance) and an append-only `bucket_ledger_events`
table recording every allocation change. bucket_ledger_events is the source of
truth for bucket balances; buckets.current_balance is a cached projection kept
in sync with it and can always be rebuilt from the ledger.

Revision ID: d5e6f7a8b9c0
Revises: b2c3d4e5f6a7
Create Date: 2026-09-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd5e6f7a8b9c0'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "buckets",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("account_id", sa.String(), sa.ForeignKey("accounts.id"), nullable=False),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("description", sa.String(500), nullable=False, server_default=""),
        sa.Column("target_amount", sa.Numeric(14, 2), nullable=True),
        sa.Column("target_date", sa.Date(), nullable=True),
        sa.Column("current_balance", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("color", sa.String(20), nullable=False, server_default="#c99a4b"),
        sa.Column("icon", sa.String(40), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_buckets_account_id"), "buckets", ["account_id"])
    op.create_index(op.f("ix_buckets_user_id"), "buckets", ["user_id"])

    op.create_table(
        "bucket_ledger_events",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("account_id", sa.String(), sa.ForeignKey("accounts.id"), nullable=False),
        sa.Column("source_type", sa.String(20), nullable=False),
        sa.Column("source_id", sa.String(), sa.ForeignKey("buckets.id"), nullable=True),
        sa.Column("destination_type", sa.String(20), nullable=False),
        sa.Column("destination_id", sa.String(), sa.ForeignKey("buckets.id"), nullable=True),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("event_type", sa.String(40), nullable=False),
        sa.Column("idempotency_key", sa.String(200), nullable=False),
        sa.Column("event_metadata", sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "idempotency_key", name="uq_bucket_ledger_idempotency"),
    )
    op.create_index(op.f("ix_bucket_ledger_events_user_id"), "bucket_ledger_events", ["user_id"])
    op.create_index(op.f("ix_bucket_ledger_events_account_id"), "bucket_ledger_events", ["account_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_bucket_ledger_events_account_id"), table_name="bucket_ledger_events")
    op.drop_index(op.f("ix_bucket_ledger_events_user_id"), table_name="bucket_ledger_events")
    op.drop_table("bucket_ledger_events")

    op.drop_index(op.f("ix_buckets_user_id"), table_name="buckets")
    op.drop_index(op.f("ix_buckets_account_id"), table_name="buckets")
    op.drop_table("buckets")
