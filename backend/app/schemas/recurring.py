from datetime import date

from pydantic import BaseModel


class RecurringCreate(BaseModel):
    category_id: str | None = None
    merchant: str
    expected_amount: float
    cadence: str = "monthly"
    next_expected_date: date | None = None


class RecurringUpdate(BaseModel):
    category_id: str | None = None
    merchant: str | None = None
    expected_amount: float | None = None
    cadence: str | None = None
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
