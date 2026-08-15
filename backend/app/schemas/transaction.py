from datetime import date as date_type

from pydantic import BaseModel

from app.schemas.category import CategoryOut


class TransactionCreate(BaseModel):
    account_id: str
    category_id: str | None = None
    transfer_account_id: str | None = None
    date: date_type
    amount: float
    type: str  # income | expense | transfer
    payee: str = ""
    notes: str = ""
    tags: list[str] = []


class TransactionUpdate(BaseModel):
    account_id: str | None = None
    category_id: str | None = None
    date: date_type | None = None
    amount: float | None = None
    type: str | None = None
    payee: str | None = None
    notes: str | None = None
    tags: list[str] | None = None


class BulkUpdateRequest(BaseModel):
    transaction_ids: list[str]
    category_id: str | None = None
    tags: list[str] | None = None


class TransactionOut(BaseModel):
    id: str
    account_id: str
    category: CategoryOut | None = None
    date: date_type
    amount: float
    type: str
    payee: str
    notes: str
    source: str
    tags: list[str] = []

    model_config = {"from_attributes": True}


class Page(BaseModel):
    items: list[TransactionOut]
    total: int
    page: int
    page_size: int
