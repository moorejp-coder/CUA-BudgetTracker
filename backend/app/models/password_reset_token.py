from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.mixins import IdMixin, TimestampMixin


class PasswordResetToken(IdMixin, TimestampMixin, Base):
    """Single-use, time-limited password reset tokens.

    Only the SHA-256 hash of the token is stored — same principle as a password — so a
    database leak alone can't be used to reset anyone's account; the raw token only ever
    exists in the link handed to the user and in transit.
    """

    __tablename__ = "password_reset_tokens"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
