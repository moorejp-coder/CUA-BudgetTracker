from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.analytics import CashflowPoint, CategorySpend, NetWorthPoint, SummaryResponse
from app.services import analytics as svc

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=SummaryResponse)
def get_summary(month: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
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


@router.get("/subscriptions")
def get_subscriptions(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    subs = svc.subscriptions(db, user.id)
    return {"subscriptions": subs, "total_monthly": round(sum(s["monthly_equivalent"] for s in subs), 2)}


@router.get("/subscriptions/anomalies")
def get_subscription_anomalies(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return svc.subscription_anomalies(db, user.id)


@router.get("/anomalies")
def get_anomalies(start: date, end: date, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return svc.spending_anomalies(db, user.id, start, end)


@router.get("/behavior-signals")
def get_behavior_signals(period: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return svc.behavior_signals(db, user.id, period)
