from __future__ import annotations

from sqlalchemy import JSON, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.mixins import IdMixin, TimestampMixin


class CsvImportTemplate(IdMixin, TimestampMixin, Base):
    __tablename__ = "csv_import_templates"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))  # e.g. "Chase Checking"
    column_mapping: Mapped[dict] = mapped_column(JSON)  # {"date": "Transaction Date", "amount": "Amount", ...}
    date_format: Mapped[str] = mapped_column(String(40), default="%Y-%m-%d")
    amount_sign_convention: Mapped[str] = mapped_column(String(20), default="negative_is_expense")
