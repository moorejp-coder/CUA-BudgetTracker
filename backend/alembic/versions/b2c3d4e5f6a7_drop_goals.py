"""drop goals feature

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-09-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_table("goal_accounts")
    op.drop_table("goals")


def downgrade() -> None:
    op.create_table(
        "goals",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("target_amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("target_date", sa.Date(), nullable=True),
        sa.Column("monthly_contribution", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("allocated_amount", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_goals_user_id"), "goals", ["user_id"])
    op.create_table(
        "goal_accounts",
        sa.Column("goal_id", sa.String(), sa.ForeignKey("goals.id"), primary_key=True),
        sa.Column("account_id", sa.String(), sa.ForeignKey("accounts.id"), primary_key=True),
    )
