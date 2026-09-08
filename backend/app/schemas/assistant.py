from pydantic import BaseModel, Field


class AssistantQueryRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)


class AssistantQueryResponse(BaseModel):
    answer: str
    data: dict
    source: str  # llm | deterministic | policy (out-of-scope redirect, never reaches the LLM)
    intents: list[str] = []


class ScenarioQueryRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)


class ScenarioAdjustment(BaseModel):
    target: str = Field(min_length=1, max_length=200)
    value: float = Field(ge=-1_000_000, le=1_000_000, strict=True)  # |value| <= 1 => relative % change; otherwise absolute $/month change


class ScenarioRequest(BaseModel):
    adjustments: list[ScenarioAdjustment] = Field(max_length=50)
    base_months: int = Field(3, ge=1, le=24)
    horizon_days: int = Field(90, ge=1, le=365)


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
