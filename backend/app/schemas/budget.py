from pydantic import BaseModel, Field

from app.schemas.category import CategoryOut

_PERIOD_RE = r"^\d{4}-(0[1-9]|1[0-2])$"


class BudgetCreate(BaseModel):
    category_id: str = Field(min_length=1, max_length=64)
    period: str = Field(pattern=_PERIOD_RE)  # "YYYY-MM"
    amount: float = Field(gt=0, le=1_000_000_000, allow_inf_nan=False)
    rollover: bool = False


class BudgetUpdate(BaseModel):
    amount: float | None = Field(default=None, gt=0, le=1_000_000_000, allow_inf_nan=False)
    rollover: bool | None = None


class BudgetOut(BaseModel):
    id: str
    category: CategoryOut
    period: str
    amount: float
    rollover: bool
    spent: float = 0
    rolled_over_amount: float = 0

    model_config = {"from_attributes": True}
