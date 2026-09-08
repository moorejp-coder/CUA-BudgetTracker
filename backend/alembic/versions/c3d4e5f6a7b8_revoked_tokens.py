"""revoked tokens

Revision ID: c3d4e5f6a7b8
Revises: d5e6f7a8b9c0
Create Date: 2026-09-03 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c3d4e5f6a7b8'
down_revision = 'd5e6f7a8b9c0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'revoked_tokens',
        sa.Column('jti', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('jti'),
    )
    op.create_index(op.f('ix_revoked_tokens_user_id'), 'revoked_tokens', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_revoked_tokens_user_id'), table_name='revoked_tokens')
    op.drop_table('revoked_tokens')
