from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.routes.transactions import _apply_transaction_effect
from app.db.session import get_db
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


@router.post("/preview", response_model=CsvPreviewResponse)
async def preview(file: UploadFile, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    raw = await file.read()
    columns, rows = svc.parse_csv_bytes(raw)
    if not columns:
        raise HTTPException(status_code=400, detail="Could not read any columns from this CSV")
    token = svc.stash_upload(columns, rows)
    return CsvPreviewResponse(
        columns=columns,
        sample_rows=rows[:5],
        guessed_mapping=svc.guess_mapping(columns),
        upload_token=token,
    )


@router.post("/commit", response_model=CsvCommitResponse)
def commit(payload: CsvCommitRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    stashed = svc.get_stashed_upload(payload.upload_token)
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
            description = row.get(desc_col, "") if desc_col else ""
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
        except Exception as e:  # noqa: BLE001 — surface per-row errors, keep importing
            errors.append(f"Row {i + 1}: {e}")

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
