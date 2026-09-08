from datetime import date as date_type

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.authz import require_resource
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

# One dependency, reused by every route below that takes {account_id} — denied_status=404
# to match this app's existing convention for ownership checks (a non-owner can't tell
# "doesn't exist" apart from "exists but isn't yours"); pass denied_status=403 instead for
# a resource where confirming existence to a non-owner isn't a concern.
get_owned_account = require_resource(
    Account,
    "account_id",
    lambda account, user: account.user_id == user.id,
    denied_status=404,
    not_found_detail="Account not found",
)


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
    payload: AccountUpdate,
    db: Session = Depends(get_db),
    account: Account = Depends(get_owned_account),
):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(account, field, value)
    db.commit()
    db.refresh(account)
    return account


@router.delete("/{account_id}", status_code=204)
def delete_account(db: Session = Depends(get_db), account: Account = Depends(get_owned_account)):
    db.delete(account)
    db.commit()


@router.post("/{account_id}/balance-snapshot", response_model=BalanceSnapshotOut, status_code=201)
def add_balance_snapshot(
    payload: BalanceSnapshotCreate,
    db: Session = Depends(get_db),
    account: Account = Depends(get_owned_account),
):
    snapshot = AccountBalanceSnapshot(account_id=account.id, date=payload.date, balance=payload.balance)
    account.current_balance = payload.balance
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return snapshot
