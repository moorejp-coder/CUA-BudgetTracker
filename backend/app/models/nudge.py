from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.mixins import IdMixin, TimestampMixin

NUDGE_EVENT_TYPES = (
    "budget_warning",       # over 80% of category budget mid-period
    "budget_overspend",     # repeated overspending N consecutive periods
    "weekend_overspend",    # weekend spending materially higher than weekday baseline
)


class NudgeEvent(IdMixin, TimestampMixin, Base):
    __tablename__ = "nudges"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    event_type: Mapped[str] = mapped_column(String(40))
    context: Mapped[dict] = mapped_column(JSON, default=dict)
    message: Mapped[str] = mapped_column(Text, default="")
    source: Mapped[str] = mapped_column(String(20), default="deterministic")  # llm | deterministic
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    dismissed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
