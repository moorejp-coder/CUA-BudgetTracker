from __future__ import annotations

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.mixins import IdMixin, TimestampMixin

CATEGORY_TYPES = ("income", "expense")


class Category(IdMixin, TimestampMixin, Base):
    __tablename__ = "categories"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(80))
    type: Mapped[str] = mapped_column(String(10))  # income | expense
    color: Mapped[str] = mapped_column(String(9), default="#5b8def")
    emoji: Mapped[str] = mapped_column(String(8), default="")
    parent_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id"), nullable=True)

    user: Mapped["User"] = relationship(back_populates="categories")
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="category")
