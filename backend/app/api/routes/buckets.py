from typing import Callable, TypeVar

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.account import Account
from app.models.bucket import Bucket
from app.models.user import User
from app.schemas.bucket import (
    AllocateRequest,
    BucketCreate,
    BucketOut,
    BucketSummaryOut,
    BucketTransferRequest,
    BucketUpdate,
    LedgerEventOut,
    MutationResultOut,
    UnassignRequest,
)
from app.services import bucket_ledger as svc
from app.services.bucket_ledger import BucketDomainError

router = APIRouter(tags=["buckets"])

T = TypeVar("T")


def _run(fn: Callable[[], T]) -> T:
    try:
        return fn()
    except BucketDomainError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


def _get_account(db: Session, user: User, account_id: str) -> Account:
    account = db.get(Account, account_id)
    if not account or account.user_id != user.id:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


def _get_bucket(db: Session, user: User, bucket_id: str) -> Bucket:
    bucket = db.get(Bucket, bucket_id)
    if not bucket or bucket.user_id != user.id:
        raise HTTPException(status_code=404, detail="Goal not found")
    return bucket


def _out(bucket: Bucket) -> BucketOut:
    return BucketOut(
        id=bucket.id,
        account_id=bucket.account_id,
        name=bucket.name,
        description=bucket.description,
        target_amount=float(bucket.target_amount) if bucket.target_amount is not None else None,
        target_date=bucket.target_date,
        current_balance=float(bucket.current_balance),
        progress_percentage=svc.bucket_progress_percentage(bucket),
        color=bucket.color,
        icon=bucket.icon,
        sort_order=bucket.sort_order,
        status=bucket.status,
        created_at=bucket.created_at,
    )


def _mutation_result(db: Session, account: Account, result: svc.MutationResult) -> MutationResultOut:
    return MutationResultOut(
        event=LedgerEventOut(**svc.serialize_ledger_event(db, result.event)),
        summary=BucketSummaryOut(**svc.get_summary(db, account)),
    )


@router.get("/accounts/{account_id}/buckets", response_model=list[BucketOut])
def list_buckets(account_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    account = _get_account(db, user, account_id)
    return [_out(b) for b in account.buckets]


@router.post("/accounts/{account_id}/buckets", response_model=BucketOut, status_code=201)
def create_bucket(
    account_id: str,
    payload: BucketCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    account = _get_account(db, user, account_id)
    bucket = _run(
        lambda: svc.create_bucket(
            db,
            user,
            account,
            name=payload.name,
            description=payload.description,
            target_amount=payload.target_amount,
            target_date=payload.target_date,
            color=payload.color,
            icon=payload.icon,
        )
    )
    return _out(bucket)


@router.patch("/buckets/{bucket_id}", response_model=BucketOut)
def update_bucket(
    bucket_id: str,
    payload: BucketUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    bucket = _get_bucket(db, user, bucket_id)
    bucket = _run(lambda: svc.update_bucket(db, bucket, **payload.model_dump(exclude_unset=True)))
    return _out(bucket)


@router.post("/buckets/{bucket_id}/archive", response_model=BucketOut)
def archive_bucket(bucket_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    bucket = _get_bucket(db, user, bucket_id)
    account = _get_account(db, user, bucket.account_id)
    bucket = _run(lambda: svc.archive_bucket(db, user, account, bucket))
    return _out(bucket)


@router.post("/buckets/{bucket_id}/allocate", response_model=MutationResultOut)
def allocate(
    bucket_id: str,
    payload: AllocateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    bucket = _get_bucket(db, user, bucket_id)
    account = _get_account(db, user, bucket.account_id)
    result = _run(
        lambda: svc.allocate_to_bucket(db, user, account, bucket, payload.amount, payload.idempotency_key)
    )
    return _mutation_result(db, account, result)


@router.post("/buckets/{bucket_id}/unassign", response_model=MutationResultOut)
def unassign(
    bucket_id: str,
    payload: UnassignRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    bucket = _get_bucket(db, user, bucket_id)
    account = _get_account(db, user, bucket.account_id)
    result = _run(
        lambda: svc.unassign_from_bucket(db, user, account, bucket, payload.amount, payload.idempotency_key)
    )
    return _mutation_result(db, account, result)


@router.post("/bucket-transfers", response_model=MutationResultOut)
def transfer(
    payload: BucketTransferRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    source = _get_bucket(db, user, payload.source_bucket_id)
    destination = _get_bucket(db, user, payload.destination_bucket_id)
    account = _get_account(db, user, source.account_id)
    result = _run(
        lambda: svc.move_between_buckets(
            db, user, account, source, destination, payload.amount, payload.idempotency_key
        )
    )
    return _mutation_result(db, account, result)


@router.get("/accounts/{account_id}/bucket-ledger", response_model=list[LedgerEventOut])
def bucket_ledger(
    account_id: str,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    account = _get_account(db, user, account_id)
    return [LedgerEventOut(**e) for e in svc.get_ledger(db, account, limit=limit)]


@router.get("/accounts/{account_id}/bucket-summary", response_model=BucketSummaryOut)
def bucket_summary(account_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    account = _get_account(db, user, account_id)
    return BucketSummaryOut(**svc.get_summary(db, account))
