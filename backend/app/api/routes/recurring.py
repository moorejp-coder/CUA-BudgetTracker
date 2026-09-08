from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.authz import require_resource
from app.db.session import get_db
from app.models.category import Category
from app.models.recurring import RecurringItem
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.recurring import (
    RecurringCreate,
    RecurringOut,
    RecurringSuggestion,
    RecurringUpdate,
    UpcomingCharge,
)
from app.services.recurring_detection import detect_recurring, upcoming_charges

router = APIRouter(prefix="/recurring", tags=["recurring"])

get_owned_recurring_item = require_resource(
    RecurringItem,
    "item_id",
    lambda item, user: item.user_id == user.id,
    denied_status=404,
    not_found_detail="Recurring item not found",
)


def _check_category_owned(db: Session, user: User, category_id: str | None) -> None:
    if category_id is None:
        return
    category = db.get(Category, category_id)
    if not category or category.user_id != user.id:
        raise HTTPException(status_code=404, detail="Category not found")


@router.get("", response_model=list[RecurringOut])
def list_recurring(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return (
        db.query(RecurringItem)
        .filter(RecurringItem.user_id == user.id, RecurringItem.is_confirmed.is_(True))
        .all()
    )


@router.post("", response_model=RecurringOut, status_code=201)
def create_recurring(
    payload: RecurringCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    _check_category_owned(db, user, payload.category_id)
    item = RecurringItem(user_id=user.id, is_confirmed=True, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{item_id}", response_model=RecurringOut)
def update_recurring(
    payload: RecurringUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    item: RecurringItem = Depends(get_owned_recurring_item),
):
    if "category_id" in payload.model_fields_set:
        _check_category_owned(db, user, payload.category_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.get("/suggestions", response_model=list[RecurringSuggestion])
def suggestions(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    txns = db.query(Transaction).filter(Transaction.user_id == user.id).all()
    already_confirmed = {
        item.merchant for item in db.query(RecurringItem).filter(RecurringItem.user_id == user.id).all()
    }
    detected = detect_recurring(txns)
    return [d for d in detected if d["merchant"] not in already_confirmed]


@router.get("/upcoming", response_model=list[UpcomingCharge])
def upcoming(days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    items = db.query(RecurringItem).filter(RecurringItem.user_id == user.id, RecurringItem.active.is_(True)).all()
    return upcoming_charges(items, days=days)
