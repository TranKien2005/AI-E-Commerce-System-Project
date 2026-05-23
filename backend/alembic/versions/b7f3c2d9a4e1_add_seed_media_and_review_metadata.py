"""add seed media and review metadata

Revision ID: b7f3c2d9a4e1
Revises: 4e4d6d7c9d21
Create Date: 2026-05-12 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "b7f3c2d9a4e1"
down_revision = "4e4d6d7c9d21"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("product_images", sa.Column("variant", sa.String(length=50), nullable=False, server_default=""))
    op.add_column("product_images", sa.Column("source_size", sa.String(length=20), nullable=False, server_default=""))

    op.create_table(
        "product_videos",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("url", sa.String(length=500), nullable=False),
        sa.Column("source_user_id", sa.String(length=255), nullable=False, server_default=""),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.add_column("reviews", sa.Column("title", sa.String(length=255), nullable=False, server_default=""))
    op.add_column("reviews", sa.Column("verified_purchase", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("reviews", sa.Column("helpful_votes", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("reviews", sa.Column("source_user_id", sa.String(length=255), nullable=False, server_default=""))
    op.add_column("reviews", sa.Column("source_review_id", sa.String(length=64), nullable=False, server_default=""))
    op.create_index(op.f("ix_reviews_source_review_id"), "reviews", ["source_review_id"], unique=False)

    op.alter_column("product_images", "variant", server_default=None)
    op.alter_column("product_images", "source_size", server_default=None)
    op.alter_column("product_videos", "title", server_default=None)
    op.alter_column("product_videos", "source_user_id", server_default=None)
    op.alter_column("reviews", "title", server_default=None)
    op.alter_column("reviews", "verified_purchase", server_default=None)
    op.alter_column("reviews", "helpful_votes", server_default=None)
    op.alter_column("reviews", "source_user_id", server_default=None)
    op.alter_column("reviews", "source_review_id", server_default=None)


def downgrade() -> None:
    op.drop_index(op.f("ix_reviews_source_review_id"), table_name="reviews")
    op.drop_column("reviews", "source_review_id")
    op.drop_column("reviews", "source_user_id")
    op.drop_column("reviews", "helpful_votes")
    op.drop_column("reviews", "verified_purchase")
    op.drop_column("reviews", "title")
    op.drop_table("product_videos")
    op.drop_column("product_images", "source_size")
    op.drop_column("product_images", "variant")
