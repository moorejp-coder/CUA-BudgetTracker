from typing import Literal

from pydantic import BaseModel, Field, field_validator

CategoryType = Literal["income", "expense"]

BudgetSection = Literal[
    "essentials",
    "guilt_free",
    "debt_investing",
    "short_term_goals",
    "long_term_goals",
]

_HEX_COLOR_RE = r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$"


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    type: CategoryType
    color: str = Field("#5b8def", pattern=_HEX_COLOR_RE)
    emoji: str = Field("", max_length=8)
    parent_id: str | None = Field(default=None, min_length=1, max_length=64)
    section: BudgetSection | None = None

    @field_validator("name")
    @classmethod
    def _strip_name(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name cannot be blank")
        return v


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    color: str | None = Field(default=None, pattern=_HEX_COLOR_RE)
    emoji: str | None = Field(default=None, max_length=8)
    parent_id: str | None = Field(default=None, min_length=1, max_length=64)
    section: BudgetSection | None = None

    @field_validator("name")
    @classmethod
    def _strip_name(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("name cannot be blank")
        return v


class CategoryOut(BaseModel):
    id: str
    name: str
    type: str
    color: str
    emoji: str
    parent_id: str | None = Field(default=None, min_length=1, max_length=64)
    section: str | None = None

    model_config = {"from_attributes": True}
