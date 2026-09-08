"""dedupe budgets, drop orphans, enforce one budget per category/period

Revision ID: a7b8c9d0e1f2
Revises: f5a6b7c8d9e0
Create Date: 2026-09-08 00:00:00.000000

The "Set" button on the Categories page had no protection against a double
submit (no disabled-while-pending state, and the create endpoint always
inserted a new row). Users who clicked it more than once while the request
was in flight ended up with several Budget rows for the same
(user, category, period), which then all showed up as separate lines in the
"Spending by category" summary. Deleting a category also left its budgets
behind with a dangling category_id, producing blank-name rows in that same
summary. This migration cleans up both classes of bad data and adds a
uniqueness constraint so it can't recur; the API layer now upserts instead
of blindly inserting, and category deletion cascades to its budgets.
"""
from alembic import op
import sqlalchemy as sa


revision = 'a7b8c9d0e1f2'
down_revision = 'f5a6b7c8d9e0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()

    # Drop budgets whose category no longer exists (left behind by category deletes
    # that didn't cascade).
    bind.execute(sa.text(
        "DELETE FROM budgets WHERE category_id NOT IN (SELECT id FROM categories)"
    ))

    # De-duplicate: keep the most recently created budget for each
    # (user_id, category_id, period), drop the rest.
    bind.execute(sa.text("""
        DELETE FROM budgets
        WHERE id NOT IN (
            SELECT keep_id FROM (
                SELECT id AS keep_id,
                       ROW_NUMBER() OVER (
                           PARTITION BY user_id, category_id, period
                           ORDER BY created_at DESC, id DESC
                       ) AS rn
                FROM budgets
            ) ranked
            WHERE rn = 1
        )
    """))

    with op.batch_alter_table('budgets') as batch_op:
        batch_op.create_unique_constraint(
            'uq_budget_user_category_period', ['user_id', 'category_id', 'period']
        )


def downgrade() -> None:
    with op.batch_alter_table('budgets') as batch_op:
        batch_op.drop_constraint('uq_budget_user_category_period', type_='unique')
