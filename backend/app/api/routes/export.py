import csv
import io
import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.account import Account
from app.models.budget import Budget
from app.models.category import Category
from app.models.goal import Goal
from app.models.transaction import Transaction
from app.models.user import User

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/json")
def export_json(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    def dump(rows, fields):
        return [{f: str(getattr(r, f)) for f in fields} for r in rows]

    payload = {
        "accounts": dump(
            db.query(Account).filter(Account.user_id == user.id).all(),
            ["id", "name", "type", "institution", "current_balance", "is_liability"],
        ),
        "categories": dump(
            db.query(Category).filter(Category.user_id == user.id).all(),
            ["id", "name", "type", "color", "emoji"],
        ),
        "transactions": dump(
            db.query(Transaction).filter(Transaction.user_id == user.id).all(),
            ["id", "account_id", "category_id", "date", "amount", "type", "payee", "notes", "source"],
        ),
        "budgets": dump(
            db.query(Budget).filter(Budget.user_id == user.id).all(),
            ["id", "category_id", "period", "amount", "rollover"],
        ),
        "goals": dump(
            db.query(Goal).filter(Goal.user_id == user.id).all(),
            ["id", "name", "target_amount", "target_date", "monthly_contribution"],
        ),
    }
    buf = io.BytesIO(json.dumps(payload, indent=2).encode())
    return StreamingResponse(
        buf,
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=budget-tracker-export.json"},
    )


@router.get("/csv")
def export_csv(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    txns = db.query(Transaction).filter(Transaction.user_id == user.id).order_by(Transaction.date).all()
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["date", "amount", "type", "payee", "category", "account_id", "notes", "source"])
    for t in txns:
        writer.writerow(
            [t.date, t.amount, t.type, t.payee, t.category.name if t.category else "", t.account_id, t.notes, t.source]
        )
    out = io.BytesIO(buf.getvalue().encode())
    return StreamingResponse(
        out,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transactions-export.csv"},
    )
