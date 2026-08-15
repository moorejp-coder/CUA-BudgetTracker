"""Computes the deterministic `recap_context` dict for a week/month period, and the
matching period bounds. Used by both the manual `/recaps/generate` endpoint and the
scheduled recap job — same code path either way."""
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models.recap import Recap
from app.services import ai_gateway, analytics


def period_bounds(period_type: str, reference: date | None = None) -> tuple[date, date]:
    """Bounds of the most recently *completed* week (Mon-Sun) or calendar month, as of
    `reference` (defaults to today)."""
    today = reference or date.today()
    if period_type == "week":
        end = today - timedelta(days=today.weekday() + 1)  # last Sunday before this week
        start = end - timedelta(days=6)
    else:
        first_of_this_month = today.replace(day=1)
        end = first_of_this_month - timedelta(days=1)
        start = end.replace(day=1)
    return start, end


def _previous_window(start: date, end: date) -> tuple[date, date]:
    span = (end - start).days + 1
    prev_end = start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=span - 1)
    return prev_start, prev_end


def build_recap_context(db: Session, user_id: str, period_type: str, reference: date | None = None) -> dict:
    start, end = period_bounds(period_type, reference)
    prev_start, prev_end = _previous_window(start, end)

    totals = analytics.totals_for_range(db, user_id, start, end)
    income, expense = totals["income"], totals["expense"]
    savings_rate = (income - expense) / income if income > 0 else 0.0

    top_categories = analytics.spend_by_category(db, user_id, start, end)[:5]
    top_merchants = analytics.top_merchants_for_range(db, user_id, start, end)

    budget_status: list[dict] = []
    if period_type == "month":
        adherence = analytics.budget_adherence(db, user_id, start.strftime("%Y-%m"))
        budget_status = adherence["details"]

    net_worth_delta = analytics.net_worth_delta(db, user_id, start, end)

    prev_categories = {c["name"]: c["total"] for c in analytics.spend_by_category(db, user_id, prev_start, prev_end)}
    category_deltas = []
    for c in top_categories:
        prev_total = prev_categories.get(c["name"], 0.0)
        category_deltas.append(
            {"name": c["name"], "current": c["total"], "previous": prev_total, "delta": c["total"] - prev_total}
        )

    return {
        "period": period_type,
        "period_start": start,
        "period_end": end,
        "net_worth_delta": net_worth_delta,
        "income": income,
        "expenses": expense,
        "savings_rate": round(savings_rate, 4),
        "top_categories": top_categories,
        "top_merchants": top_merchants,
        "budget_status": budget_status,
        "category_deltas": category_deltas,
    }


async def generate_and_store(db: Session, user_id: str, period_type: str, reference: date | None = None) -> Recap:
    """Shared by the manual `/recaps/generate` endpoint and the scheduled job — one code
    path for building context, calling the AI gateway, and persisting the result."""
    context = build_recap_context(db, user_id, period_type, reference)
    text, source = await ai_gateway.generate_recap(context)
    recap = Recap(
        user_id=user_id,
        period_type=period_type,
        period_start=context["period_start"],
        period_end=context["period_end"],
        recap_text=text,
        context=context,
        source=source,
    )
    db.add(recap)
    db.commit()
    db.refresh(recap)
    return recap
