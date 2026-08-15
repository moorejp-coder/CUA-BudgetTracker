from __future__ import annotations

from datetime import date as date_type

from sqlalchemy import Date, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.mixins import IdMixin, TimestampMixin

ACCOUNT_TYPES = ("checking", "savings", "credit_card", "loan", "investment", "cash", "other")


class Account(IdMixin, TimestampMixin, Base):
    __tablename__ = "accounts"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    type: Mapped[str] = mapped_column(String(20))  # one of ACCOUNT_TYPES
    institution: Mapped[str] = mapped_column(String(120), default="")
    is_liability: Mapped[bool] = mapped_column(default=False)
    current_balance: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    archived: Mapped[bool] = mapped_column(default=False)

    user: Mapped["User"] = relationship(back_populates="accounts")
    transactions: Mapped[list["Transaction"]] = relationship(
        back_populates="account", cascade="all, delete-orphan", foreign_keys="Transaction.account_id"
    )
    balance_snapshots: Mapped[list["AccountBalanceSnapshot"]] = relationship(
        back_populates="account", cascade="all, delete-orphan"
    )


class AccountBalanceSnapshot(IdMixin, Base):
    __tablename__ = "account_balance_snapshots"

    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), index=True)
    date: Mapped[date_type] = mapped_column(Date)
    balance: Mapped[float] = mapped_column(Numeric(14, 2))

    account: Mapped["Account"] = relationship(back_populates="balance_snapshots")
