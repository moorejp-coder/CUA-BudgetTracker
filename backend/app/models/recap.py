from __future__ import annotations

from datetime import date as date_type

from sqlalchemy import JSON, Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.mixins import IdMixin, TimestampMixin

PERIOD_TYPES = ("week", "month")


class Recap(IdMixin, TimestampMixin, Base):
    __tablename__ = "recaps"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    period_type: Mapped[str] = mapped_column(String(10))  # week | month
    period_start: Mapped[date_type] = mapped_column(Date)
    period_end: Mapped[date_type] = mapped_column(Date)
    recap_text: Mapped[str] = mapped_column(Text)
    context: Mapped[dict] = mapped_column(JSON, default=dict)
    source: Mapped[str] = mapped_column(String(20), default="deterministic")  # llm | deterministic
