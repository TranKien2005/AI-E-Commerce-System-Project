"""add shop context to conversations

Revision ID: c8a9f0d1e2b3
Revises: b7f3c2d9a4e1
Create Date: 2026-05-12 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "c8a9f0d1e2b3"
down_revision = "b7f3c2d9a4e1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("conversations", sa.Column("shop_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_conversations_shop_id_shops", "conversations", "shops", ["shop_id"], ["id"])
    op.execute("""
        UPDATE conversations
        SET shop_id = shops.id
        FROM shops
        WHERE conversations.seller_id = shops.owner_id
          AND conversations.shop_id IS NULL
    """)


def downgrade() -> None:
    op.drop_constraint("fk_conversations_shop_id_shops", "conversations", type_="foreignkey")
    op.drop_column("conversations", "shop_id")
