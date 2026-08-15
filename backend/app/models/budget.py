from __future__ import annotations

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.mixins import IdMixin, TimestampMixin


class Budget(IdMixin, TimestampMixin, Base):
    __tablename__ = "budgets"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    category_id: Mapped[str] = mapped_column(ForeignKey("categories.id"), index=True)
    period: Mapped[str] = mapped_column(String(7))  # "YYYY-MM"
    amount: Mapped[float] = mapped_column(Numeric(14, 2))
    rollover: Mapped[bool] = mapped_column(default=False)

    category: Mapped["Category"] = relationship()
