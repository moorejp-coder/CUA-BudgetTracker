from pydantic import BaseModel


class AssistantQueryRequest(BaseModel):
    question: str


class AssistantQueryResponse(BaseModel):
    answer: str
    data: dict
    source: str  # llm | deterministic | policy (out-of-scope redirect, never reaches the LLM)
    intents: list[str] = []


class ScenarioQueryRequest(BaseModel):
    question: str


class ScenarioAdjustment(BaseModel):
    target: str
    value: float  # |value| <= 1 => relative % change; otherwise absolute $/month change


class ScenarioRequest(BaseModel):
    adjustments: list[ScenarioAdjustment]
    base_months: int = 3
    horizon_days: int = 90


class ScenarioResponse(BaseModel):
    baseline_monthly_income: float
    baseline_monthly_expense: float
    baseline_monthly_net: float
    projected_monthly_expense: float
    projected_monthly_net: float
    monthly_net_delta: float
    category_projections: list[dict]
    unmatched_adjustments: list[dict]


class ScenarioQueryResponse(BaseModel):
    explanation: str
    scenario: ScenarioRequest
    result: ScenarioResponse
    source: str


class SubscriptionsAssistantResponse(BaseModel):
    summary: str
    subscriptions: list[dict]
    anomalies: dict
    source: str


class AnomaliesAssistantResponse(BaseModel):
    summary: str
    anomalies: list[dict]
    source: str
