from calendar import monthrange
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.authz import require_resource
from app.db.session import get_db
from app.models.budget import Budget
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.budget import BudgetCreate, BudgetOut, BudgetUpdate

router = APIRouter(prefix="/budgets", tags=["budgets"])

_PERIOD_RE = r"^\d{4}-(0[1-9]|1[0-2])$"

get_owned_budget = require_resource(
    Budget,
    "budget_id",
    lambda budget, user: budget.user_id == user.id,
    denied_status=404,
    not_found_detail="Budget not found",
)


def _period_bounds(period: str) -> tuple[date, date]:
    year, month = (int(x) for x in period.split("-"))
    last_day = monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last_day)


def _spent_for(db: Session, user: User, category_id: str, period: str) -> float:
    start, end = _period_bounds(period)
    total = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(
            Transaction.user_id == user.id,
            Transaction.category_id == category_id,
            Transaction.type == "expense",
            Transaction.date >= start,
            Transaction.date <= end,
        )
        .scalar()
    )
    return float(total or 0)


def _previous_period(period: str) -> str:
    year, month = (int(x) for x in period.split("-"))
    if month == 1:
        return f"{year - 1}-12"
    return f"{year}-{month - 1:02d}"


def _serialize(db: Session, user: User, budget: Budget) -> dict:
    spent = _spent_for(db, user, budget.category_id, budget.period)
    rolled_over = 0.0
    if budget.rollover:
        prev_period = _previous_period(budget.period)
        prev_budget = (
            db.query(Budget)
            .filter(
                Budget.user_id == user.id,
                Budget.category_id == budget.category_id,
                Budget.period == prev_period,
            )
            .first()
        )
        if prev_budget:
            prev_spent = _spent_for(db, user, budget.category_id, prev_period)
            rolled_over = max(0.0, float(prev_budget.amount) - prev_spent)
    return {
        "id": budget.id,
        "category": budget.category,
        "period": budget.period,
        "amount": float(budget.amount),
        "rollover": budget.rollover,
        "spent": spent,
        "rolled_over_amount": rolled_over,
    }


@router.get("", response_model=list[BudgetOut])
def list_budgets(
    period: str = Query(pattern=_PERIOD_RE), db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    budgets = db.query(Budget).filter(Budget.user_id == user.id, Budget.period == period).all()
    return [_serialize(db, user, b) for b in budgets]


@router.post("", response_model=BudgetOut, status_code=201)
def create_budget(payload: BudgetCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    category = db.get(Category, payload.category_id)
    if not category or category.user_id != user.id:
        raise HTTPException(status_code=404, detail="Category not found")
    budget = Budget(user_id=user.id, **payload.model_dump())
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return _serialize(db, user, budget)


@router.patch("/{budget_id}", response_model=BudgetOut)
def update_budget(
    payload: BudgetUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    budget: Budget = Depends(get_owned_budget),
):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(budget, field, value)
    db.commit()
    db.refresh(budget)
    return _serialize(db, user, budget)
