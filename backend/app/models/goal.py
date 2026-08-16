from __future__ import annotations

from datetime import date as date_type

from sqlalchemy import Column, Date, ForeignKey, Numeric, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.mixins import IdMixin, TimestampMixin

goal_accounts = Table(
    "goal_accounts",
    Base.metadata,
    Column("goal_id", ForeignKey("goals.id"), primary_key=True),
    Column("account_id", ForeignKey("accounts.id"), primary_key=True),
)


class Goal(IdMixin, TimestampMixin, Base):
    __tablename__ = "goals"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    target_amount: Mapped[float] = mapped_column(Numeric(14, 2))
    target_date: Mapped[date_type | None] = mapped_column(Date, nullable=True)
    monthly_contribution: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    allocated_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0)

    accounts: Mapped[list["Account"]] = relationship(secondary=goal_accounts)
