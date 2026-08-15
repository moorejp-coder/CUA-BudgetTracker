from datetime import date as date_type

from pydantic import BaseModel


class SummaryResponse(BaseModel):
    period: str
    total_income: float
    total_expense: float
    net: float
    top_categories: list[dict]
    top_merchants: list[dict]
    budget_status: list[dict]


class CashflowPoint(BaseModel):
    period: str
    income: float
    expense: float
    net: float


class CategorySpend(BaseModel):
    category_id: str
    name: str
    color: str
    emoji: str
    total: float


class NetWorthPoint(BaseModel):
    date: date_type
    assets: float
    liabilities: float
    net_worth: float


class LlmCategorizeRequest(BaseModel):
    description: str


class LlmCategorizeResponse(BaseModel):
    suggested_category: str | None
    confidence: float
    source: str  # "llm" | "rules" | "none"


class LlmAskRequest(BaseModel):
    question: str


class LlmAskResponse(BaseModel):
    answer: str
    data: dict
    source: str  # "llm" | "deterministic"


class LlmStatus(BaseModel):
    enabled: bool
    reachable: bool
    base_url: str
    model: str
