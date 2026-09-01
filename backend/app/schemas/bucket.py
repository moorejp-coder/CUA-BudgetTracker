from datetime import date as date_type, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class BucketCreate(BaseModel):
    name: str
    description: str = ""
    target_amount: Decimal | None = None
    target_date: date_type | None = None
    color: str | None = None
    icon: str | None = None


class BucketUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    target_amount: Decimal | None = None
    target_date: date_type | None = None
    color: str | None = None
    icon: str | None = None
    sort_order: int | None = None


class BucketOut(BaseModel):
    id: str
    account_id: str
    name: str
    description: str
    target_amount: float | None
    target_date: date_type | None
    current_balance: float
    progress_percentage: float | None = None
    color: str
    icon: str | None
    sort_order: int
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AllocateRequest(BaseModel):
    amount: Decimal
    idempotency_key: str = Field(min_length=1, max_length=200)


class UnassignRequest(BaseModel):
    amount: Decimal
    idempotency_key: str = Field(min_length=1, max_length=200)


class BucketTransferRequest(BaseModel):
    source_bucket_id: str
    destination_bucket_id: str
    amount: Decimal
    idempotency_key: str = Field(min_length=1, max_length=200)


class LedgerEventOut(BaseModel):
    id: str
    event_type: str
    label: str
    amount: float
    source_type: str
    source_id: str | None
    source_name: str
    destination_type: str
    destination_id: str | None
    destination_name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SummaryBucketOut(BaseModel):
    id: str
    name: str
    balance: float
    target_amount: float | None
    target_date: date_type | None
    progress_percentage: float | None
    color: str
    icon: str | None
    status: str


class BucketSummaryOut(BaseModel):
    account_id: str
    account_balance: float
    assigned_balance: float
    unassigned_balance: float
    buckets: list[SummaryBucketOut]


class MutationResultOut(BaseModel):
    event: LedgerEventOut
    summary: BucketSummaryOut
