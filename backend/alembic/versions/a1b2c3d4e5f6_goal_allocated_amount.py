"""goal allocated amount

Revision ID: a1b2c3d4e5f6
Revises: f30392985229
Create Date: 2026-08-16 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'f30392985229'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "goals",
        sa.Column("allocated_amount", sa.Numeric(14, 2), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("goals", "allocated_amount")
