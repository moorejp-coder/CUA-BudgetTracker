import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.routes.transactions import _apply_transaction_effect
from app.db.session import get_db
from app.models.account import Account
from app.models.csv_template import CsvImportTemplate
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.csv_import import (
    CsvCommitRequest,
    CsvCommitResponse,
    CsvPreviewResponse,
    CsvTemplateOut,
)
from app.services import csv_import as svc

router = APIRouter(prefix="/csv-imports", tags=["csv-imports"])
logger = logging.getLogger("app.errors")

_MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB
_MAX_ROWS = 20_000
_ALLOWED_CONTENT_TYPES = {
    "text/csv",
    "application/vnd.ms-excel",
    "application/octet-stream",
    "text/plain",
    "",
    None,
}


def _check_account_owned(db: Session, user: User, account_id: str) -> None:
    account = db.get(Account, account_id)
    if not account or account.user_id != user.id:
        raise HTTPException(status_code=404, detail="Account not found")


@router.post("/preview", response_model=CsvPreviewResponse)
async def preview(file: UploadFile, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if file.content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="File must be a CSV")
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must have a .csv extension")

    raw = await file.read(_MAX_UPLOAD_BYTES + 1)
    if len(raw) > _MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="CSV file is too large (5 MB limit)")

    columns, rows = svc.parse_csv_bytes(raw)
    if not columns:
        raise HTTPException(status_code=400, detail="Could not read any columns from this CSV")
    if len(rows) > _MAX_ROWS:
        raise HTTPException(status_code=400, detail=f"CSV has too many rows ({_MAX_ROWS} max)")
    token = svc.stash_upload(columns, rows, user.id)
    return CsvPreviewResponse(
        columns=columns,
        sample_rows=rows[:5],
        guessed_mapping=svc.guess_mapping(columns),
        upload_token=token,
    )


@router.post("/commit", response_model=CsvCommitResponse)
def commit(payload: CsvCommitRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_account_owned(db, user, payload.account_id)
    stashed = svc.get_stashed_upload(payload.upload_token, user.id)
    if not stashed:
        raise HTTPException(status_code=400, detail="Upload expired, please re-upload the file")
    rows, _ = stashed

    date_col = payload.column_mapping.get("date")
    amount_col = payload.column_mapping.get("amount")
    desc_col = payload.column_mapping.get("description")
    if not date_col or not amount_col:
        raise HTTPException(status_code=400, detail="date and amount columns must be mapped")

    imported = 0
    duplicates_skipped = 0
    errors: list[str] = []

    for i, row in enumerate(rows):
        try:
            dt = svc.parse_date(row.get(date_col, ""), payload.date_format)
            amount, txn_type = svc.parse_amount(
                row.get(amount_col, "0"), payload.amount_sign_convention, row, payload.column_mapping
            )
            description = svc.sanitize_text(row.get(desc_col, "") if desc_col else "", max_length=200)
            h = svc.external_hash(payload.account_id, dt.date().isoformat(), str(amount), description)

            exists = (
                db.query(Transaction)
                .filter(Transaction.user_id == user.id, Transaction.external_hash == h)
                .first()
            )
            if exists:
                duplicates_skipped += 1
                continue

            txn = Transaction(
                user_id=user.id,
                account_id=payload.account_id,
                date=dt.date(),
                amount=amount,
                type=txn_type,
                payee=description,
                source="csv",
                external_hash=h,
            )
            db.add(txn)
            db.flush()
            _apply_transaction_effect(db, txn, sign=1)
            imported += 1
        except (ValueError, KeyError) as e:
            # Expected, user-actionable parsing failures (bad date format, non-numeric
            # amount, ...) — safe and useful to show verbatim, it's about their own data.
            db.rollback()
            errors.append(f"Row {i + 1}: {e}")
        except Exception:  # noqa: BLE001 — anything else (e.g. a DB error) must not leak
            # A raw DB exception's message can include the actual SQL statement and bound
            # values — never put that in a response. Log it fully server-side instead and
            # show the user a generic, still row-specific message.
            db.rollback()
            logger.error("csv import row failed unexpectedly: row=%d", i + 1, exc_info=True)
            errors.append(f"Row {i + 1}: could not import this row")

    if payload.save_as_template:
        template = CsvImportTemplate(
            user_id=user.id,
            name=payload.save_as_template,
            column_mapping=payload.column_mapping,
            date_format=payload.date_format,
            amount_sign_convention=payload.amount_sign_convention,
        )
        db.add(template)

    db.commit()
    return CsvCommitResponse(imported=imported, duplicates_skipped=duplicates_skipped, errors=errors)


@router.get("/templates", response_model=list[CsvTemplateOut])
def list_templates(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(CsvImportTemplate).filter(CsvImportTemplate.user_id == user.id).all()
