from __future__ import annotations

from datetime import date as date_type

from sqlalchemy import Date, ForeignKey, Numeric, String, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.mixins import IdMixin, TimestampMixin

TRANSACTION_TYPES = ("income", "expense", "transfer")
TRANSACTION_SOURCES = ("manual", "csv")

transaction_tags = Table(
    "transaction_tags",
    Base.metadata,
    Column("transaction_id", ForeignKey("transactions.id"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id"), primary_key=True),
)


class Transaction(IdMixin, TimestampMixin, Base):
    __tablename__ = "transactions"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), index=True)
    category_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id"), nullable=True, index=True)
    transfer_account_id: Mapped[str | None] = mapped_column(ForeignKey("accounts.id"), nullable=True)

    date: Mapped[date_type] = mapped_column(Date, index=True)
    amount: Mapped[float] = mapped_column(Numeric(14, 2))  # always positive; sign derived from type
    type: Mapped[str] = mapped_column(String(10))  # income | expense | transfer
    payee: Mapped[str] = mapped_column(String(200), default="")
    notes: Mapped[str] = mapped_column(String(1000), default="")
    source: Mapped[str] = mapped_column(String(10), default="manual")
    external_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)

    user: Mapped["User"] = relationship(back_populates="transactions")
    account: Mapped["Account"] = relationship(back_populates="transactions", foreign_keys=[account_id])
    category: Mapped["Category | None"] = relationship(back_populates="transactions")
    tags: Mapped[list["Tag"]] = relationship(secondary=transaction_tags)
