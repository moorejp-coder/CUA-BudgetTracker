from pydantic import BaseModel

from app.schemas.category import CategoryOut


class BudgetCreate(BaseModel):
    category_id: str
    period: str  # "YYYY-MM"
    amount: float
    rollover: bool = False


class BudgetUpdate(BaseModel):
    amount: float | None = None
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
