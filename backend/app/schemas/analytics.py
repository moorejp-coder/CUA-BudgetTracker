from datetime import date as date_type

from pydantic import BaseModel, Field


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


class BudgetVarianceCategory(BaseModel):
    category_id: str | None
    category_name: str
    target_budget: float
    spent: float
    variance_vs_target: float
    variance_vs_target_pct: float | None
    over_target: bool
    prior_period: str
    prior_spent: float
    variance_vs_prior: float
    variance_vs_prior_pct: float | None


class BudgetVarianceResponse(BaseModel):
    period: str
    prior_period: str
    categories: list[BudgetVarianceCategory]


class Subscription(BaseModel):
    id: str
    merchant: str
    category_id: str | None
    amount: float
    cadence: str
    monthly_equivalent: float
    next_expected_date: date_type | None


class SubscriptionsResponse(BaseModel):
    subscriptions: list[Subscription]
    total_monthly: float


class NewSubscription(BaseModel):
    merchant: str
    expected_amount: float
    cadence: str
    first_seen: date_type


class SubscriptionPriceIncrease(BaseModel):
    merchant: str
    previous_average: float
    latest_amount: float
    increase_pct: float


class SubscriptionAnomaliesResponse(BaseModel):
    new_subscriptions: list[NewSubscription]
    price_increases: list[SubscriptionPriceIncrease]


class SpendingAnomaly(BaseModel):
    transaction_id: str
    date: date_type
    payee: str
    category_id: str | None
    category_name: str | None
    amount: float
    reason: str


class BudgetAdherenceDetail(BaseModel):
    category_id: str | None
    category_name: str
    budget: float
    spent: float
    pct_used: float
    over: bool


class BudgetAdherence(BaseModel):
    tracked_categories: int
    over_budget_count: int
    over_budget_pct: float
    details: list[BudgetAdherenceDetail]


class WeekdayWeekendPattern(BaseModel):
    weekday_avg_daily_spend: float
    weekend_avg_daily_spend: float
    weekend_to_weekday_ratio: float | None
    notable: bool


class BehaviorSignalsResponse(BaseModel):
    period: str
    budget_adherence: BudgetAdherence
    weekday_weekend_pattern: WeekdayWeekendPattern


class BudgetSuggestionBucket(BaseModel):
    key: str
    label: str
    description: str
    pct: float
    amount: float


class BudgetSuggestionResponse(BaseModel):
    period: str
    monthly_income: float
    has_debt: bool
    debt_bucket_label: str
    buckets: list[BudgetSuggestionBucket]


class HomeSavingsPlanResponse(BaseModel):
    period: str
    monthly_income: float
    has_debt: bool
    max_monthly_mortgage_payment: float
    max_home_price: float
    down_payment_pct: float
    closing_cost_pct: float
    amount_needed_to_close: float
    suggested_monthly_savings: float
    months_to_save_from_zero: float | None


class LlmCategorizeRequest(BaseModel):
    description: str = Field(min_length=1, max_length=500)


class LlmCategorizeResponse(BaseModel):
    suggested_category: str | None
    confidence: float
    source: str  # "llm" | "rules" | "none"


class LlmAskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)


class LlmAskResponse(BaseModel):
    answer: str
    data: dict
    source: str  # "llm" | "deterministic"


class LlmStatus(BaseModel):
    enabled: bool
    reachable: bool
    base_url: str
    model: str
