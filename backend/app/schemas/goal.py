from datetime import date

from pydantic import BaseModel


class GoalCreate(BaseModel):
    name: str
    target_amount: float
    target_date: date | None = None
    monthly_contribution: float = 0
    account_ids: list[str] = []


class GoalUpdate(BaseModel):
    name: str | None = None
    target_amount: float | None = None
    target_date: date | None = None
    monthly_contribution: float | None = None
    account_ids: list[str] | None = None


class GoalOut(BaseModel):
    id: str
    name: str
    target_amount: float
    target_date: date | None = None
    monthly_contribution: float
    current_amount: float = 0
    account_ids: list[str] = []

    model_config = {"from_attributes": True}
