from datetime import date as date_type, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

AccountType = Literal[
    "checking", "savings", "credit_card", "investment", "loan", "cash", "other"
]

_BALANCE_BOUNDS = {"ge": -1_000_000_000, "le": 1_000_000_000, "allow_inf_nan": False, "strict": True}


class AccountCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    type: AccountType
    institution: str = Field("", max_length=200)
    is_liability: bool = False
    current_balance: float = Field(0, **_BALANCE_BOUNDS)

    @field_validator("name")
    @classmethod
    def _strip_name(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name cannot be blank")
        return v


class AccountUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    type: AccountType | None = None
    institution: str | None = Field(default=None, max_length=200)
    is_liability: bool | None = None
    current_balance: float | None = Field(default=None, **_BALANCE_BOUNDS)
    archived: bool | None = None

    @field_validator("name")
    @classmethod
    def _strip_name(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("name cannot be blank")
        return v


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
    balance: float = Field(**_BALANCE_BOUNDS)


class BalanceSnapshotOut(BaseModel):
    id: str
    date: date_type
    balance: float

    model_config = {"from_attributes": True}
