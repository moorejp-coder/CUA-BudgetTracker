"""Deterministic cash-flow forecasting and what-if scenario engine.

Everything here is a simple, explainable heuristic model — trailing-average income/expense
plus known recurring items — not a statistical or ML forecast. That's a deliberate choice:
the numbers the AI gateway narrates need to be easy for a user to sanity-check by hand.
"""
from calendar import monthrange
from datetime import date, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.category import Category
from app.models.goal import Goal
from app.models.recurring import RecurringItem
from app.models.transaction import Transaction
from app.services.recurring_detection import upcoming_charges


def _trailing_months_bounds(months: int) -> tuple[date, date]:
    end = date.today()
    year, month = end.year, end.month - months
    while month <= 0:
        month += 12
        year -= 1
    start = date(year, month, 1)
    return start, end


def monthly_averages(db: Session, user_id: str, months: int = 3) -> dict:
    start, end = _trailing_months_bounds(months)
    income = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(Transaction.user_id == user_id, Transaction.type == "income", Transaction.date.between(start, end))
        .scalar()
    )
    expense = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(Transaction.user_id == user_id, Transaction.type == "expense", Transaction.date.between(start, end))
        .scalar()
    )
    span_months = max(1, (end.year - start.year) * 12 + (end.month - start.month) + 1)
    return {
        "avg_income": float(income or 0) / span_months,
        "avg_expense": float(expense or 0) / span_months,
    }


def category_monthly_averages(db: Session, user_id: str, months: int = 3) -> dict[str, dict]:
    start, end = _trailing_months_bounds(months)
    span_months = max(1, (end.year - start.year) * 12 + (end.month - start.month) + 1)
    rows = (
        db.query(Category.id, Category.name, func.sum(Transaction.amount))
        .join(Transaction, Transaction.category_id == Category.id)
        .filter(Transaction.user_id == user_id, Transaction.type == "expense", Transaction.date.between(start, end))
        .group_by(Category.id)
        .all()
    )
    return {r[1]: {"category_id": r[0], "avg_monthly": float(r[2]) / span_months} for r in rows}


def cashflow_forecast(db: Session, user_id: str, horizon_days: int = 30) -> dict:
    averages = monthly_averages(db, user_id, months=3)
    avg_income, avg_expense = averages["avg_income"], averages["avg_expense"]
    daily_net = (avg_income - avg_expense) / 30.44

    recurring_items = (
        db.query(RecurringItem).filter(RecurringItem.user_id == user_id, RecurringItem.active.is_(True)).all()
    )
    upcoming = upcoming_charges(recurring_items, days=horizon_days)
    upcoming_total = sum(u["expected_amount"] for u in upcoming)
    upcoming_by_date: dict[date, float] = {}
    for u in upcoming:
        upcoming_by_date[u["date"]] = upcoming_by_date.get(u["date"], 0) + u["expected_amount"]

    starting_balance = float(
        db.query(func.coalesce(func.sum(Account.current_balance), 0))
        .filter(Account.user_id == user_id, Account.is_liability.is_(False))
        .scalar()
        or 0
    )

    points = []
    running = starting_balance
    today = date.today()
    for i in range(1, horizon_days + 1):
        d = today + timedelta(days=i)
        running += daily_net
        running -= upcoming_by_date.get(d, 0)
        points.append({"date": d, "projected_net_cash": round(running, 2)})

    return {
        "horizon_days": horizon_days,
        "avg_monthly_income": round(avg_income, 2),
        "avg_monthly_expense": round(avg_expense, 2),
        "avg_monthly_net": round(avg_income - avg_expense, 2),
        "upcoming_recurring_total": round(upcoming_total, 2),
        "starting_balance": round(starting_balance, 2),
        "points": points,
    }


def goal_forecast(db: Session, user_id: str) -> list[dict]:
    """When each goal will be hit given its current monthly_contribution rate — a standalone
    projection (the scenario engine also computes goal impact, but only relative to an
    adjustment; this is the plain baseline)."""
    goals = db.query(Goal).filter(Goal.user_id == user_id).all()
    today = date.today()
    results = []
    for g in goals:
        current = float(g.allocated_amount) + sum(float(a.current_balance) for a in g.accounts)
        target = float(g.target_amount)
        remaining = max(0.0, target - current)
        rate = float(g.monthly_contribution)

        months_to_goal = (remaining / rate) if rate > 0 else None
        projected_date = None
        if months_to_goal is not None:
            month_idx = today.year * 12 + (today.month - 1) + round(months_to_goal)
            projected_date = date(month_idx // 12, month_idx % 12 + 1, 1)

        on_pace = None
        if g.target_date:
            if remaining <= 0:
                on_pace = True
            elif rate <= 0:
                on_pace = False
            else:
                months_available = max(
                    0, (g.target_date.year - today.year) * 12 + (g.target_date.month - today.month)
                )
                on_pace = months_to_goal is not None and months_to_goal <= months_available

        results.append(
            {
                "goal_id": g.id,
                "goal_name": g.name,
                "target_amount": target,
                "current_amount": current,
                "remaining_amount": round(remaining, 2),
                "monthly_contribution": rate,
                "months_to_goal": round(months_to_goal, 1) if months_to_goal is not None else None,
                "projected_completion_date": projected_date,
                "target_date": g.target_date,
                "on_pace": on_pace,
            }
        )
    return results


def run_scenario(db: Session, user_id: str, adjustments: list[dict], base_months: int = 3) -> dict:
    """`adjustments` is a list of {"target": str, "value": float}. A target matching an
    existing expense category name applies a relative change (|value| <= 1) or an absolute
    monthly $ change (|value| > 1) to that category's average spend. Any other target is
    treated as a generic monthly contribution (e.g. toward a goal or general savings) that
    reduces net cash flow by `value` and, if it matches a goal name, accelerates that goal.
    """
    averages = monthly_averages(db, user_id, months=base_months)
    category_averages = category_monthly_averages(db, user_id, months=base_months)
    goals = db.query(Goal).filter(Goal.user_id == user_id).all()
    goals_by_name = {g.name.lower(): g for g in goals}

    baseline_expense = sum(c["avg_monthly"] for c in category_averages.values())
    category_projections = [
        {"category": name, "baseline_monthly": round(c["avg_monthly"], 2), "projected_monthly": round(c["avg_monthly"], 2)}
        for name, c in category_averages.items()
    ]
    projections_by_name = {p["category"]: p for p in category_projections}

    unmatched_adjustments = []
    extra_monthly_outflow = 0.0
    goal_contribution_by_goal: dict[str, float] = {}

    for adj in adjustments:
        target = adj["target"]
        value = adj["value"]
        cat_match = next((name for name in category_averages if name.lower() == target.lower()), None)
        if cat_match:
            baseline = category_averages[cat_match]["avg_monthly"]
            new_value = baseline * (1 + value) if abs(value) <= 1 else baseline + value
            new_value = max(0.0, new_value)
            projections_by_name[cat_match]["projected_monthly"] = round(new_value, 2)
            continue

        goal = goals_by_name.get(target.lower())
        if goal:
            goal_contribution_by_goal[goal.id] = goal_contribution_by_goal.get(goal.id, 0) + value
            extra_monthly_outflow += value
            continue

        unmatched_adjustments.append({"target": target, "value": value, "note": "no matching category or goal; treated as a generic monthly contribution"})
        extra_monthly_outflow += value

    projected_category_expense = sum(p["projected_monthly"] for p in category_projections)
    projected_expense = projected_category_expense + max(0.0, extra_monthly_outflow)
    baseline_net = averages["avg_income"] - baseline_expense
    projected_net = averages["avg_income"] - projected_category_expense - extra_monthly_outflow

    goal_impacts = []
    for g in goals:
        extra = goal_contribution_by_goal.get(g.id, 0)
        current = float(g.allocated_amount) + sum(float(a.current_balance) for a in g.accounts)
        remaining = max(0.0, float(g.target_amount) - current)
        base_rate = float(g.monthly_contribution) or 0.01
        new_rate = base_rate + extra
        months_at_base = remaining / base_rate if base_rate > 0 else None
        months_at_new = remaining / new_rate if new_rate > 0 else None
        months_saved = (months_at_base - months_at_new) if (months_at_base and months_at_new) else None
        goal_impacts.append(
            {
                "goal_id": g.id,
                "goal_name": g.name,
                "extra_monthly_contribution": round(extra, 2),
                "months_to_goal_baseline": round(months_at_base, 1) if months_at_base else None,
                "months_to_goal_projected": round(months_at_new, 1) if months_at_new else None,
                "months_saved": round(months_saved, 1) if months_saved else None,
            }
        )

    return {
        "baseline_monthly_income": round(averages["avg_income"], 2),
        "baseline_monthly_expense": round(baseline_expense, 2),
        "baseline_monthly_net": round(baseline_net, 2),
        "projected_monthly_expense": round(projected_expense, 2),
        "projected_monthly_net": round(projected_net, 2),
        "monthly_net_delta": round(projected_net - baseline_net, 2),
        "category_projections": category_projections,
        "goal_impacts": goal_impacts,
        "unmatched_adjustments": unmatched_adjustments,
    }
