from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.authz import require_resource
from app.db.session import get_db
from app.models.account import Account
from app.models.category import Category
from app.models.tag import Tag
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import (
    BulkUpdateRequest,
    Page,
    TransactionCreate,
    TransactionOut,
    TransactionType,
    TransactionUpdate,
)

router = APIRouter(prefix="/transactions", tags=["transactions"])

get_owned_transaction = require_resource(
    Transaction,
    "transaction_id",
    lambda txn, user: txn.user_id == user.id,
    denied_status=404,
    not_found_detail="Transaction not found",
)


def _check_account_owned(db: Session, user: User, account_id: str | None) -> None:
    if account_id is None:
        return
    account = db.get(Account, account_id)
    if not account or account.user_id != user.id:
        raise HTTPException(status_code=404, detail="Account not found")


def _check_category_owned(db: Session, user: User, category_id: str | None) -> None:
    if category_id is None:
        return
    category = db.get(Category, category_id)
    if not category or category.user_id != user.id:
        raise HTTPException(status_code=404, detail="Category not found")


def _serialize(txn: Transaction) -> dict:
    return {
        "id": txn.id,
        "account_id": txn.account_id,
        "category": txn.category,
        "date": txn.date,
        "amount": float(txn.amount),
        "type": txn.type,
        "payee": txn.payee,
        "notes": txn.notes,
        "source": txn.source,
        "tags": [t.name for t in txn.tags],
    }


def _signed_amount(amount: float, type: str) -> float:
    return amount if type == "income" else -amount


def _apply_transaction_effect(db: Session, txn: Transaction, sign: int) -> None:
    account = db.get(Account, txn.account_id)
    if account:
        account.current_balance = float(account.current_balance) + sign * _signed_amount(
            float(txn.amount), txn.type
        )
    if txn.type == "transfer" and txn.transfer_account_id:
        transfer_account = db.get(Account, txn.transfer_account_id)
        if transfer_account:
            transfer_account.current_balance = float(transfer_account.current_balance) + sign * float(txn.amount)


def _resolve_tags(db: Session, user: User, tag_names: list[str]) -> list[Tag]:
    tags = []
    for name in tag_names:
        tag = db.query(Tag).filter(Tag.user_id == user.id, Tag.name == name).first()
        if not tag:
            tag = Tag(user_id=user.id, name=name)
            db.add(tag)
            db.flush()
        tags.append(tag)
    return tags


@router.get("", response_model=Page)
def list_transactions(
    account_id: str | None = Query(default=None, min_length=1, max_length=64),
    category_id: str | None = Query(default=None, min_length=1, max_length=64),
    tag: str | None = Query(default=None, min_length=1, max_length=60),
    type: TransactionType | None = None,
    q: str | None = Query(default=None, min_length=1, max_length=200),
    start: date | None = None,
    end: date | None = None,
    page: int = Query(1, ge=1, le=100_000),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Transaction).filter(Transaction.user_id == user.id)
    if account_id:
        query = query.filter(Transaction.account_id == account_id)
    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    if type:
        query = query.filter(Transaction.type == type)
    if start:
        query = query.filter(Transaction.date >= start)
    if end:
        query = query.filter(Transaction.date <= end)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(Transaction.payee.ilike(like), Transaction.notes.ilike(like)))
    if tag:
        query = query.join(Transaction.tags).filter(Tag.name == tag)

    total = query.count()
    items = (
        query.order_by(Transaction.date.desc(), Transaction.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return Page(items=[_serialize(t) for t in items], total=total, page=page, page_size=page_size)


@router.post("", response_model=TransactionOut, status_code=201)
def create_transaction(
    payload: TransactionCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    _check_account_owned(db, user, payload.account_id)
    _check_category_owned(db, user, payload.category_id)
    if payload.type == "transfer":
        _check_account_owned(db, user, payload.transfer_account_id)
    data = payload.model_dump(exclude={"tags"})
    txn = Transaction(user_id=user.id, source="manual", **data)
    txn.tags = _resolve_tags(db, user, payload.tags)
    db.add(txn)
    db.flush()
    _apply_transaction_effect(db, txn, sign=1)
    db.commit()
    db.refresh(txn)
    return _serialize(txn)


@router.patch("/{transaction_id}", response_model=TransactionOut)
def update_transaction(
    payload: TransactionUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    txn: Transaction = Depends(get_owned_transaction),
):
    _check_account_owned(db, user, payload.account_id)
    _check_category_owned(db, user, payload.category_id)
    _check_account_owned(db, user, payload.transfer_account_id)
    _apply_transaction_effect(db, txn, sign=-1)
    data = payload.model_dump(exclude_unset=True, exclude={"tags"})
    for field, value in data.items():
        setattr(txn, field, value)
    if payload.tags is not None:
        txn.tags = _resolve_tags(db, user, payload.tags)
    _apply_transaction_effect(db, txn, sign=1)
    db.commit()
    db.refresh(txn)
    return _serialize(txn)


@router.post("/bulk-update", response_model=dict)
def bulk_update(
    payload: BulkUpdateRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    _check_category_owned(db, user, payload.category_id)
    query = db.query(Transaction).filter(
        Transaction.user_id == user.id, Transaction.id.in_(payload.transaction_ids)
    )
    txns = query.all()
    for txn in txns:
        if payload.category_id is not None:
            txn.category_id = payload.category_id
        if payload.tags is not None:
            txn.tags = _resolve_tags(db, user, payload.tags)
    db.commit()
    return {"updated": len(txns)}


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(db: Session = Depends(get_db), txn: Transaction = Depends(get_owned_transaction)):
    _apply_transaction_effect(db, txn, sign=-1)
    db.delete(txn)
    db.commit()
