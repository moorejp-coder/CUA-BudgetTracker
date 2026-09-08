"""user password_changed_at

Revision ID: f5a6b7c8d9e0
Revises: e4f5a6b7c8d9
Create Date: 2026-09-03 00:00:00.000000

"""
import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision = 'f5a6b7c8d9e0'
down_revision = 'e4f5a6b7c8d9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('password_changed_at', sa.DateTime(timezone=True), nullable=True))
    # Backfill existing rows to created_at so no one already registered gets logged out by
    # this migration — every token they hold predates "now" either way.
    op.execute('UPDATE users SET password_changed_at = created_at WHERE password_changed_at IS NULL')
    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column('password_changed_at', nullable=False)


def downgrade() -> None:
    op.drop_column('users', 'password_changed_at')
