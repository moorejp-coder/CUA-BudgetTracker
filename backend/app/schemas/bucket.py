from datetime import date as date_type, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class BucketCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = Field("", max_length=2000)
    target_amount: Decimal | None = Field(default=None, gt=0, le=1_000_000_000, allow_inf_nan=False)
    target_date: date_type | None = None
    color: str | None = Field(default=None, max_length=32)
    icon: str | None = Field(default=None, max_length=32)


class BucketUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    target_amount: Decimal | None = Field(default=None, gt=0, le=1_000_000_000, allow_inf_nan=False)
    target_date: date_type | None = None
    color: str | None = Field(default=None, max_length=32)
    icon: str | None = Field(default=None, max_length=32)
    sort_order: int | None = Field(default=None, ge=0, le=10_000)


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
    # Positivity/precision are intentionally left to the ledger service (to_money() /
    # require_positive()) rather than enforced here — it returns a domain-specific 400
    # with a precise reason, which a schema-level 422 would preempt and flatten.
    amount: Decimal
    idempotency_key: str = Field(min_length=1, max_length=200)


class UnassignRequest(BaseModel):
    amount: Decimal
    idempotency_key: str = Field(min_length=1, max_length=200)


class BucketTransferRequest(BaseModel):
    source_bucket_id: str = Field(min_length=1, max_length=64)
    destination_bucket_id: str = Field(min_length=1, max_length=64)
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
