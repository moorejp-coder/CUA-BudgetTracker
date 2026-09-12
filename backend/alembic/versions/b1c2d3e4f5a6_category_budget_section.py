"""add section to categories

Revision ID: b1c2d3e4f5a6
Revises: a7b8c9d0e1f2
Create Date: 2026-09-12 00:00:00.000000

Lets a user group expense categories into budgeting sections
(Essentials, Guilt Free, Debt/Investing, Short Term Goals, Long Term
Goals) so the Monthly budgets list can be organized by section instead
of one flat list. Nullable: existing categories are left ungrouped
until the user assigns them a section.
"""
import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision = 'b1c2d3e4f5a6'
down_revision = 'a7b8c9d0e1f2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('categories', sa.Column('section', sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column('categories', 'section')
