from datetime import date as date_type, datetime

from pydantic import BaseModel


class AccountCreate(BaseModel):
    name: str
    type: str
    institution: str = ""
    is_liability: bool = False
    current_balance: float = 0


class AccountUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    institution: str | None = None
    is_liability: bool | None = None
    current_balance: float | None = None
    archived: bool | None = None


class AccountOut(BaseModel):
    id: str
    name: str
    type: str
    institution: str
    is_liability: bool
    current_balance: float
    archived: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class BalanceSnapshotCreate(BaseModel):
    date: date_type
    balance: float


class BalanceSnapshotOut(BaseModel):
    id: str
    date: date_type
    balance: float

    model_config = {"from_attributes": True}
