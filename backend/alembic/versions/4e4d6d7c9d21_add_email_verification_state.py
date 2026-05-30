"""add email verification state

Revision ID: 4e4d6d7c9d21
Revises: 8494b1c58eb0
Create Date: 2026-05-07 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "4e4d6d7c9d21"
down_revision = "8494b1c58eb0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute(
        "UPDATE users SET email_verified_at = created_at WHERE status = 'active' AND email_verified_at IS NULL"
    )


def downgrade() -> None:
    op.drop_column("users", "email_verified_at")
