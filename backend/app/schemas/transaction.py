from datetime import date as date_type
from typing import Annotated, Literal

from pydantic import BaseModel, Field

from app.schemas.category import CategoryOut

TransactionType = Literal["income", "expense", "transfer"]
Tag = Annotated[str, Field(min_length=1, max_length=60)]
EntityId = Annotated[str, Field(min_length=1, max_length=64)]


class TransactionCreate(BaseModel):
    account_id: EntityId
    category_id: EntityId | None = None
    transfer_account_id: EntityId | None = None
    date: date_type
    amount: float = Field(gt=0, le=1_000_000_000, allow_inf_nan=False)
    type: TransactionType
    payee: str = Field("", max_length=200)
    notes: str = Field("", max_length=1000)
    tags: list[Tag] = Field(default=[], max_length=20)


class TransactionUpdate(BaseModel):
    account_id: EntityId | None = None
    category_id: EntityId | None = None
    transfer_account_id: EntityId | None = None
    date: date_type | None = None
    amount: float | None = Field(default=None, gt=0, le=1_000_000_000, allow_inf_nan=False)
    type: TransactionType | None = None
    payee: str | None = Field(default=None, max_length=200)
    notes: str | None = Field(default=None, max_length=1000)
    tags: list[Tag] | None = Field(default=None, max_length=20)


class BulkUpdateRequest(BaseModel):
    transaction_ids: list[EntityId] = Field(min_length=1, max_length=500)
    category_id: EntityId | None = None
    tags: list[Tag] | None = Field(default=None, max_length=20)


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
