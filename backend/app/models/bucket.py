from __future__ import annotations

from datetime import date as date_type

from sqlalchemy import JSON, Date, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.mixins import IdMixin, TimestampMixin

BUCKET_COLORS = (
    "#c99a4b",  # brass (accent)
    "#4fae7b",  # green
    "#4fa3c4",  # blue
    "#c6604a",  # terracotta
    "#e08a3c",  # orange
    "#8a7bc9",  # purple
    "#c94b8a",  # pink
    "#6bb0a0",  # teal
)

BUCKET_STATUSES = ("active", "archived")

# Ledger endpoints are always either the account's Unassigned pool or a specific bucket.
LEDGER_ENDPOINT_TYPES = ("unassigned", "bucket")

LEDGER_EVENT_TYPES = (
    "allocate_to_bucket",
    "move_between_buckets",
    "unassign_from_bucket",
    "bucket_reassignment",
    "bucket_archived",
)


class Bucket(IdMixin, TimestampMixin, Base):
    __tablename__ = "buckets"

    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(String(500), default="")
    target_amount: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    target_date: Mapped[date_type | None] = mapped_column(Date, nullable=True)
    # Cached projection of the ledger, kept in sync transactionally with every ledger write.
    # The ledger (BucketLedgerEvent rows) is the source of truth; this column can always be
    # rebuilt from it (see services.bucket_ledger.rebuild_bucket_balance).
    current_balance: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    color: Mapped[str] = mapped_column(String(20), default=BUCKET_COLORS[0])
    icon: Mapped[str | None] = mapped_column(String(40), nullable=True)
    sort_order: Mapped[int] = mapped_column(default=0)
    status: Mapped[str] = mapped_column(String(20), default="active")

    account: Mapped["Account"] = relationship(back_populates="buckets")


class BucketLedgerEvent(IdMixin, TimestampMixin, Base):
    """Append-only record of every virtual allocation change. Never updated or deleted."""

    __tablename__ = "bucket_ledger_events"
    __table_args__ = (UniqueConstraint("user_id", "idempotency_key", name="uq_bucket_ledger_idempotency"),)

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), index=True)
    source_type: Mapped[str] = mapped_column(String(20))  # "unassigned" | "bucket"
    source_id: Mapped[str | None] = mapped_column(ForeignKey("buckets.id"), nullable=True)
    destination_type: Mapped[str] = mapped_column(String(20))
    destination_id: Mapped[str | None] = mapped_column(ForeignKey("buckets.id"), nullable=True)
    amount: Mapped[float] = mapped_column(Numeric(14, 2))
    event_type: Mapped[str] = mapped_column(String(40))
    idempotency_key: Mapped[str] = mapped_column(String(200))
    event_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)
