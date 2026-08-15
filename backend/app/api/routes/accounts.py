from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.account import Account, AccountBalanceSnapshot
from app.models.user import User
from app.schemas.account import (
    AccountCreate,
    AccountOut,
    AccountUpdate,
    BalanceSnapshotCreate,
    BalanceSnapshotOut,
)

router = APIRouter(prefix="/accounts", tags=["accounts"])


def _get_owned(db: Session, user: User, account_id: str) -> Account:
    account = db.get(Account, account_id)
    if not account or account.user_id != user.id:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@router.get("", response_model=list[AccountOut])
def list_accounts(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Account).filter(Account.user_id == user.id).order_by(Account.created_at).all()


@router.post("", response_model=AccountOut, status_code=201)
def create_account(payload: AccountCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    account = Account(user_id=user.id, **payload.model_dump())
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.patch("/{account_id}", response_model=AccountOut)
def update_account(
    account_id: str,
    payload: AccountUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    account = _get_owned(db, user, account_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(account, field, value)
    db.commit()
    db.refresh(account)
    return account


@router.delete("/{account_id}", status_code=204)
def delete_account(account_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    account = _get_owned(db, user, account_id)
    db.delete(account)
    db.commit()


@router.post("/{account_id}/balance-snapshot", response_model=BalanceSnapshotOut, status_code=201)
def add_balance_snapshot(
    account_id: str,
    payload: BalanceSnapshotCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    account = _get_owned(db, user, account_id)
    snapshot = AccountBalanceSnapshot(account_id=account.id, date=payload.date, balance=payload.balance)
    account.current_balance = payload.balance
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return snapshot
