from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.tag import Tag
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import (
    BulkUpdateRequest,
    Page,
    TransactionCreate,
    TransactionOut,
    TransactionUpdate,
)

router = APIRouter(prefix="/transactions", tags=["transactions"])


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
    account_id: str | None = None,
    category_id: str | None = None,
    tag: str | None = None,
    type: str | None = None,
    q: str | None = None,
    start: date | None = None,
    end: date | None = None,
    page: int = 1,
    page_size: int = Query(50, le=200),
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
    data = payload.model_dump(exclude={"tags"})
    txn = Transaction(user_id=user.id, source="manual", **data)
    txn.tags = _resolve_tags(db, user, payload.tags)
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return _serialize(txn)


@router.patch("/{transaction_id}", response_model=TransactionOut)
def update_transaction(
    transaction_id: str,
    payload: TransactionUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    txn = db.get(Transaction, transaction_id)
    if not txn or txn.user_id != user.id:
        raise HTTPException(status_code=404, detail="Transaction not found")
    data = payload.model_dump(exclude_unset=True, exclude={"tags"})
    for field, value in data.items():
        setattr(txn, field, value)
    if payload.tags is not None:
        txn.tags = _resolve_tags(db, user, payload.tags)
    db.commit()
    db.refresh(txn)
    return _serialize(txn)


@router.post("/bulk-update", response_model=dict)
def bulk_update(
    payload: BulkUpdateRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
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
def delete_transaction(
    transaction_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    txn = db.get(Transaction, transaction_id)
    if not txn or txn.user_id != user.id:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(txn)
    db.commit()
