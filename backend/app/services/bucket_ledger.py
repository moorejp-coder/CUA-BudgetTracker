"""Domain and balance-integrity logic for the Savings Buckets feature.

The ledger (BucketLedgerEvent rows) is the source of truth for every virtual
allocation change. Bucket.current_balance is a cached projection kept in sync
transactionally with each ledger write; rebuild_bucket_balance() derives the
same number independently from the ledger, and every mutation asserts the two
agree before committing (see assert_invariant).

Concurrency: this app runs as a single Uvicorn process against SQLite, and
FastAPI executes sync route handlers in a thread pool, so two requests against
the same account can interleave. A per-account in-process lock serializes the
read-check-write sequence for each account, which is sufficient here. A
multi-process/Postgres deployment would replace this with `SELECT ... FOR
UPDATE` row locks on the account (and buckets) instead.
"""
from __future__ import annotations

import threading
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Any

from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.bucket import BUCKET_COLORS, Bucket, BucketLedgerEvent
from app.models.user import User

TWO_PLACES = Decimal("0.01")

EVENT_LABELS = {
    "allocate_to_bucket": "Added to goal",
    "move_between_buckets": "Moved between goals",
    "unassign_from_bucket": "Returned to available funds",
    "bucket_archived": "Goal archived",
    "bucket_reassignment": "Goal reassigned",
}


class BucketDomainError(Exception):
    status_code = 400

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class NotFoundError(BucketDomainError):
    status_code = 404


class ValidationError(BucketDomainError):
    status_code = 400


class InvalidAmountError(BucketDomainError):
    status_code = 400


class InsufficientFundsError(BucketDomainError):
    status_code = 400


class ArchivedBucketError(BucketDomainError):
    status_code = 400


class BucketNotEmptyError(BucketDomainError):
    status_code = 400


class CrossAccountError(BucketDomainError):
    status_code = 400


class InvariantViolationError(BucketDomainError):
    status_code = 409


# ---------------------------------------------------------------------------
# Money helpers
# ---------------------------------------------------------------------------


def to_money(value: Any) -> Decimal:
    if value is None:
        raise InvalidAmountError("Amount is required")
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        raise InvalidAmountError("Amount must be a valid number")
    if amount.as_tuple().exponent < -2:
        raise InvalidAmountError("Amount cannot have more than 2 decimal places")
    return amount.quantize(TWO_PLACES)


def require_positive(amount: Decimal) -> None:
    if amount <= 0:
        raise InvalidAmountError("Amount must be greater than zero")


def d(value: Any) -> Decimal:
    return Decimal(str(value))


# ---------------------------------------------------------------------------
# Per-account locking
# ---------------------------------------------------------------------------

_account_locks: dict[str, threading.Lock] = {}
_locks_guard = threading.Lock()


def _get_account_lock(account_id: str) -> threading.Lock:
    with _locks_guard:
        lock = _account_locks.get(account_id)
        if lock is None:
            lock = threading.Lock()
            _account_locks[account_id] = lock
        return lock


# ---------------------------------------------------------------------------
# Balance queries + invariant
# ---------------------------------------------------------------------------


def get_active_bucket_balance_sum(db: Session, account_id: str) -> Decimal:
    buckets = db.query(Bucket).filter(Bucket.account_id == account_id, Bucket.status == "active").all()
    total = Decimal("0.00")
    for b in buckets:
        total += d(b.current_balance)
    return total


def get_unassigned_balance(db: Session, account: Account) -> Decimal:
    return d(account.current_balance) - get_active_bucket_balance_sum(db, account.id)


def rebuild_bucket_balance(db: Session, bucket_id: str) -> Decimal:
    """Recompute a bucket's balance purely from ledger events (ignores the cached column)."""
    events = (
        db.query(BucketLedgerEvent)
        .filter(or_(BucketLedgerEvent.source_id == bucket_id, BucketLedgerEvent.destination_id == bucket_id))
        .all()
    )
    balance = Decimal("0.00")
    for e in events:
        amount = d(e.amount)
        if e.destination_id == bucket_id:
            balance += amount
        if e.source_id == bucket_id:
            balance -= amount
    return balance


def assert_invariant(db: Session, account: Account, touched_bucket_ids: list[str]) -> None:
    """actual_account_balance == unassigned_balance + sum(active bucket balances).

    Also checks that each touched bucket's cached balance matches what an
    independent rebuild from the ledger produces, so a bug in the mutation
    logic is caught before it commits rather than silently corrupting state.
    """
    for bucket_id in touched_bucket_ids:
        bucket = db.get(Bucket, bucket_id)
        if bucket is None:
            continue
        rebuilt = rebuild_bucket_balance(db, bucket_id)
        if rebuilt != d(bucket.current_balance):
            raise InvariantViolationError(
                "This allocation could not be completed because the account balance changed. "
                "Refresh and try again."
            )

    active_sum = get_active_bucket_balance_sum(db, account.id)
    if active_sum < 0 or active_sum > d(account.current_balance):
        raise InvariantViolationError(
            "This allocation could not be completed because the account balance changed. Refresh and try again."
        )


# ---------------------------------------------------------------------------
# Bucket CRUD
# ---------------------------------------------------------------------------


def create_bucket(
    db: Session,
    user: User,
    account: Account,
    *,
    name: str,
    description: str = "",
    target_amount: Any = None,
    target_date=None,
    color: str | None = None,
    icon: str | None = None,
) -> Bucket:
    name = (name or "").strip()
    if not name:
        raise ValidationError("Goal name is required")

    normalized_target = None
    if target_amount is not None:
        normalized_target = to_money(target_amount)
        if normalized_target < 0:
            raise ValidationError("Target amount cannot be negative")

    existing_count = len(account.buckets)
    resolved_color = color or BUCKET_COLORS[existing_count % len(BUCKET_COLORS)]

    bucket = Bucket(
        account_id=account.id,
        user_id=user.id,
        name=name,
        description=description or "",
        target_amount=normalized_target,
        target_date=target_date,
        current_balance=Decimal("0.00"),
        color=resolved_color,
        icon=icon,
        sort_order=existing_count,
        status="active",
    )
    db.add(bucket)
    db.commit()
    db.refresh(bucket)
    return bucket


def update_bucket(db: Session, bucket: Bucket, **fields: Any) -> Bucket:
    if "name" in fields and fields["name"] is not None:
        name = fields["name"].strip()
        if not name:
            raise ValidationError("Goal name is required")
        bucket.name = name
    if "description" in fields and fields["description"] is not None:
        bucket.description = fields["description"]
    if "target_amount" in fields:
        target_amount = fields["target_amount"]
        if target_amount is None:
            bucket.target_amount = None
        else:
            normalized = to_money(target_amount)
            if normalized < 0:
                raise ValidationError("Target amount cannot be negative")
            bucket.target_amount = normalized
    if "target_date" in fields:
        bucket.target_date = fields["target_date"]
    if "color" in fields and fields["color"] is not None:
        bucket.color = fields["color"]
    if "icon" in fields:
        bucket.icon = fields["icon"]
    if "sort_order" in fields and fields["sort_order"] is not None:
        bucket.sort_order = fields["sort_order"]

    db.commit()
    db.refresh(bucket)
    return bucket


def archive_bucket(db: Session, user: User, account: Account, bucket: Bucket) -> Bucket:
    if bucket.status == "archived":
        return bucket
    if d(bucket.current_balance) != 0:
        raise BucketNotEmptyError(
            f"Move the remaining ${d(bucket.current_balance):.2f} out of this goal before archiving it."
        )
    bucket.status = "archived"
    event = BucketLedgerEvent(
        user_id=user.id,
        account_id=account.id,
        source_type="bucket",
        source_id=bucket.id,
        destination_type="bucket",
        destination_id=bucket.id,
        amount=Decimal("0.00"),
        event_type="bucket_archived",
        idempotency_key=f"archive:{bucket.id}:{bucket.updated_at.isoformat() if bucket.updated_at else ''}",
    )
    db.add(event)
    db.commit()
    db.refresh(bucket)
    return bucket


# ---------------------------------------------------------------------------
# Money movement
# ---------------------------------------------------------------------------


@dataclass
class MutationResult:
    event: BucketLedgerEvent
    already_applied: bool


def _find_by_idempotency_key(db: Session, user_id: str, idempotency_key: str) -> BucketLedgerEvent | None:
    return (
        db.query(BucketLedgerEvent)
        .filter(BucketLedgerEvent.user_id == user_id, BucketLedgerEvent.idempotency_key == idempotency_key)
        .first()
    )


def _move_money(
    db: Session,
    *,
    user: User,
    account: Account,
    source_bucket: Bucket | None,
    destination_bucket: Bucket | None,
    amount: Any,
    event_type: str,
    idempotency_key: str,
    metadata: dict | None = None,
) -> MutationResult:
    if not idempotency_key or not idempotency_key.strip():
        raise ValidationError("idempotency_key is required")

    with _get_account_lock(account.id):
        existing = _find_by_idempotency_key(db, user.id, idempotency_key)
        if existing is not None:
            return MutationResult(event=existing, already_applied=True)

        normalized_amount = to_money(amount)
        require_positive(normalized_amount)

        if source_bucket is not None:
            if source_bucket.account_id != account.id:
                raise CrossAccountError("Both goals must belong to the same account")
            if d(source_bucket.current_balance) < normalized_amount:
                raise InsufficientFundsError(f"This goal only has ${d(source_bucket.current_balance):.2f} available.")
        else:
            unassigned = get_unassigned_balance(db, account)
            if unassigned < normalized_amount:
                raise InsufficientFundsError(f"You only have ${unassigned:.2f} available to allocate.")

        if destination_bucket is not None:
            if destination_bucket.account_id != account.id:
                raise CrossAccountError("Both goals must belong to the same account")
            if destination_bucket.status != "active":
                raise ArchivedBucketError("This goal is archived and cannot receive new money.")

        if source_bucket is not None:
            source_bucket.current_balance = d(source_bucket.current_balance) - normalized_amount
        if destination_bucket is not None:
            destination_bucket.current_balance = d(destination_bucket.current_balance) + normalized_amount

        event = BucketLedgerEvent(
            user_id=user.id,
            account_id=account.id,
            source_type="bucket" if source_bucket is not None else "unassigned",
            source_id=source_bucket.id if source_bucket is not None else None,
            destination_type="bucket" if destination_bucket is not None else "unassigned",
            destination_id=destination_bucket.id if destination_bucket is not None else None,
            amount=normalized_amount,
            event_type=event_type,
            idempotency_key=idempotency_key,
            event_metadata=metadata,
        )
        db.add(event)

        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            existing = _find_by_idempotency_key(db, user.id, idempotency_key)
            if existing is not None:
                return MutationResult(event=existing, already_applied=True)
            raise

        touched = [b.id for b in (source_bucket, destination_bucket) if b is not None]
        try:
            assert_invariant(db, account, touched)
        except InvariantViolationError:
            db.rollback()
            raise

        db.commit()
        db.refresh(event)
        return MutationResult(event=event, already_applied=False)


def allocate_to_bucket(
    db: Session, user: User, account: Account, bucket: Bucket, amount: Any, idempotency_key: str
) -> MutationResult:
    if bucket.account_id != account.id:
        raise CrossAccountError("This goal does not belong to this account")
    if bucket.status != "active":
        raise ArchivedBucketError("This goal is archived and cannot receive new money.")
    return _move_money(
        db,
        user=user,
        account=account,
        source_bucket=None,
        destination_bucket=bucket,
        amount=amount,
        event_type="allocate_to_bucket",
        idempotency_key=idempotency_key,
    )


def unassign_from_bucket(
    db: Session, user: User, account: Account, bucket: Bucket, amount: Any, idempotency_key: str
) -> MutationResult:
    if bucket.account_id != account.id:
        raise CrossAccountError("This goal does not belong to this account")
    return _move_money(
        db,
        user=user,
        account=account,
        source_bucket=bucket,
        destination_bucket=None,
        amount=amount,
        event_type="unassign_from_bucket",
        idempotency_key=idempotency_key,
    )


def move_between_buckets(
    db: Session,
    user: User,
    account: Account,
    source_bucket: Bucket,
    destination_bucket: Bucket,
    amount: Any,
    idempotency_key: str,
) -> MutationResult:
    if source_bucket.id == destination_bucket.id:
        raise ValidationError("Source and destination goals must be different")
    if source_bucket.account_id != account.id or destination_bucket.account_id != account.id:
        raise CrossAccountError("Both goals must belong to the same account")
    if source_bucket.status != "active":
        raise ArchivedBucketError("This goal is archived and cannot send money.")
    if destination_bucket.status != "active":
        raise ArchivedBucketError("This goal is archived and cannot receive new money.")
    return _move_money(
        db,
        user=user,
        account=account,
        source_bucket=source_bucket,
        destination_bucket=destination_bucket,
        amount=amount,
        event_type="move_between_buckets",
        idempotency_key=idempotency_key,
    )


# ---------------------------------------------------------------------------
# Read models
# ---------------------------------------------------------------------------


def bucket_progress_percentage(bucket: Bucket) -> float | None:
    if bucket.target_amount is None or d(bucket.target_amount) == 0:
        return None
    pct = (d(bucket.current_balance) / d(bucket.target_amount)) * Decimal("100")
    return float(pct.quantize(Decimal("0.01")))


def get_summary(db: Session, account: Account) -> dict:
    active_buckets = [b for b in account.buckets if b.status == "active"]
    assigned = sum((d(b.current_balance) for b in active_buckets), Decimal("0.00"))
    unassigned = d(account.current_balance) - assigned
    return {
        "account_id": account.id,
        "account_balance": float(d(account.current_balance)),
        "assigned_balance": float(assigned),
        "unassigned_balance": float(unassigned),
        "buckets": [
            {
                "id": b.id,
                "name": b.name,
                "balance": float(d(b.current_balance)),
                "target_amount": float(d(b.target_amount)) if b.target_amount is not None else None,
                "target_date": b.target_date,
                "progress_percentage": bucket_progress_percentage(b),
                "color": b.color,
                "icon": b.icon,
                "status": b.status,
            }
            for b in active_buckets
        ],
    }


def _endpoint_name(db: Session, endpoint_type: str, endpoint_id: str | None) -> str:
    if endpoint_type == "unassigned":
        return "Available to allocate"
    if endpoint_id is None:
        return "Available to allocate"
    bucket = db.get(Bucket, endpoint_id)
    return bucket.name if bucket else "Deleted goal"


def serialize_ledger_event(db: Session, event: BucketLedgerEvent) -> dict:
    return {
        "id": event.id,
        "event_type": event.event_type,
        "label": EVENT_LABELS.get(event.event_type, event.event_type),
        "amount": float(d(event.amount)),
        "source_type": event.source_type,
        "source_id": event.source_id,
        "source_name": _endpoint_name(db, event.source_type, event.source_id),
        "destination_type": event.destination_type,
        "destination_id": event.destination_id,
        "destination_name": _endpoint_name(db, event.destination_type, event.destination_id),
        "created_at": event.created_at,
    }


def get_ledger(db: Session, account: Account, limit: int = 50) -> list[dict]:
    events = (
        db.query(BucketLedgerEvent)
        .filter(BucketLedgerEvent.account_id == account.id)
        .order_by(BucketLedgerEvent.created_at.desc())
        .limit(limit)
        .all()
    )
    return [serialize_ledger_event(db, e) for e in events]
