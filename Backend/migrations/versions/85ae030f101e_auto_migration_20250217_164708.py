"""auto_migration_20250217_164708

Revision ID: 85ae030f101e
Revises: 82b54f45360d
Create Date: 2025-02-17 16:47:10.282853

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '85ae030f101e'
down_revision: Union[str, None] = '82b54f45360d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('novel', sa.Column('summary', sa.Text(), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('novel', 'summary')
    # ### end Alembic commands ###
