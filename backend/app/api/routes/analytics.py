from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.analytics import (
    BehaviorSignalsResponse,
    BudgetSuggestionResponse,
    BudgetVarianceResponse,
    CashflowPoint,
    CategorySpend,
    HomeSavingsPlanResponse,
    NetWorthPoint,
    SpendingAnomaly,
    SubscriptionAnomaliesResponse,
    SubscriptionsResponse,
    SummaryResponse,
)
from app.services import analytics as svc

router = APIRouter(prefix="/analytics", tags=["analytics"])

_PERIOD_RE = r"^\d{4}-(0[1-9]|1[0-2])$"


def _period_query() -> str:
    """A fresh Query() instance per call — FastAPI's dependency analysis breaks if the
    same FieldInfo object is reused as the default for more than one parameter."""
    return Query(pattern=_PERIOD_RE)


@router.get("/summary", response_model=SummaryResponse)
def get_summary(
    month: str = _period_query(), db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    return svc.summary(db, user.id, month)


@router.get("/cashflow", response_model=list[CashflowPoint])
def get_cashflow(start: date, end: date, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return svc.cashflow(db, user.id, start, end)


@router.get("/spend-by-category", response_model=list[CategorySpend])
def get_spend_by_category(
    start: date, end: date, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    return svc.spend_by_category(db, user.id, start, end)


@router.get("/net-worth", response_model=list[NetWorthPoint])
def get_net_worth(start: date, end: date, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return svc.net_worth(db, user.id, start, end)


@router.get("/budget-variance", response_model=BudgetVarianceResponse)
def get_budget_variance(
    period: str = _period_query(),
    compare_months: int = Query(1, ge=1, le=24),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return svc.budget_variance(db, user.id, period, compare_months=compare_months)


@router.get("/subscriptions", response_model=SubscriptionsResponse)
def get_subscriptions(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    subs = svc.subscriptions(db, user.id)
    return {"subscriptions": subs, "total_monthly": round(sum(s["monthly_equivalent"] for s in subs), 2)}


@router.get("/subscriptions/anomalies", response_model=SubscriptionAnomaliesResponse)
def get_subscription_anomalies(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return svc.subscription_anomalies(db, user.id)


@router.get("/anomalies", response_model=list[SpendingAnomaly])
def get_anomalies(start: date, end: date, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return svc.spending_anomalies(db, user.id, start, end)


@router.get("/behavior-signals", response_model=BehaviorSignalsResponse)
def get_behavior_signals(
    period: str = _period_query(), db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    return svc.behavior_signals(db, user.id, period)


@router.get("/budget-suggestion", response_model=BudgetSuggestionResponse)
def get_budget_suggestion(
    period: str = _period_query(), db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    return svc.budget_suggestion(db, user.id, period)


@router.get("/home-savings-plan", response_model=HomeSavingsPlanResponse)
def get_home_savings_plan(
    period: str = _period_query(), db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    return svc.home_savings_plan(db, user.id, period)
