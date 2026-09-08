from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class RevokedToken(Base):
    """Denylist of logged-out refresh tokens, keyed by their JWT id (jti).

    Rows are only ever needed until the token's own expiry, since an expired token is
    already invalid — callers should purge rows where expires_at is in the past.
    """

    __tablename__ = "revoked_tokens"

    jti: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
