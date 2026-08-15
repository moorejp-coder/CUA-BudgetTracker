from __future__ import annotations

from datetime import date as date_type

from sqlalchemy import Boolean, Date, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.mixins import IdMixin, TimestampMixin

CADENCES = ("weekly", "biweekly", "monthly", "quarterly", "annual", "custom")


class RecurringItem(IdMixin, TimestampMixin, Base):
    __tablename__ = "recurring_items"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    category_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    merchant: Mapped[str] = mapped_column(String(200))
    expected_amount: Mapped[float] = mapped_column(Numeric(14, 2))
    cadence: Mapped[str] = mapped_column(String(20), default="monthly")
    next_expected_date: Mapped[date_type | None] = mapped_column(Date, nullable=True)
    is_confirmed: Mapped[bool] = mapped_column(Boolean, default=True)  # False = system suggestion
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    category: Mapped["Category | None"] = relationship()
