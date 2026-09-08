from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

Cadence = Literal["weekly", "biweekly", "monthly", "quarterly", "annual"]


class RecurringCreate(BaseModel):
    category_id: str | None = Field(default=None, min_length=1, max_length=64)
    merchant: str = Field(min_length=1, max_length=200)
    expected_amount: float = Field(gt=0, le=1_000_000_000, allow_inf_nan=False, strict=True)
    cadence: Cadence = "monthly"
    next_expected_date: date | None = None


class RecurringUpdate(BaseModel):
    category_id: str | None = Field(default=None, min_length=1, max_length=64)
    merchant: str | None = Field(default=None, min_length=1, max_length=200)
    expected_amount: float | None = Field(default=None, gt=0, le=1_000_000_000, allow_inf_nan=False, strict=True)
    cadence: Cadence | None = None
    next_expected_date: date | None = None
    is_confirmed: bool | None = None
    active: bool | None = None


class RecurringOut(BaseModel):
    id: str
    category_id: str | None = None
    merchant: str
    expected_amount: float
    cadence: str
    next_expected_date: date | None = None
    is_confirmed: bool
    active: bool

    model_config = {"from_attributes": True}


class RecurringSuggestion(BaseModel):
    merchant: str
    expected_amount: float
    cadence: str
    occurrences: int
    last_date: date
    next_expected_date: date


class UpcomingCharge(BaseModel):
    id: str
    merchant: str
    expected_amount: float
    cadence: str
    date: date
    category_id: str | None = None
