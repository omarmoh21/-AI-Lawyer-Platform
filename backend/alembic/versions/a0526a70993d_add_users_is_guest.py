"""add users.is_guest

Revision ID: a0526a70993d
Revises: e9a86b87699a
Create Date: 2026-07-25 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a0526a70993d'
down_revision: Union[str, Sequence[str], None] = 'e9a86b87699a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('is_guest', sa.Boolean(), nullable=False, server_default='0')
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('is_guest')
