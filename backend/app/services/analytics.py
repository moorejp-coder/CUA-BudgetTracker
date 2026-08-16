"""Deterministic aggregation helpers used by both the /analytics/* endpoints and the AI
gateway (the LLM only ever gets the numbers these functions compute — never raw transaction
rows)."""
from calendar import monthrange
from collections import defaultdict
from datetime import date, timedelta
from statistics import mean, pstdev

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.account import Account, AccountBalanceSnapshot
from app.models.budget import Budget
from app.models.category import Category
from app.models.goal import Goal
from app.models.recurring import RecurringItem
from app.models.transaction import Transaction
from app.services.recurring_detection import detect_recurring, normalize_merchant

MONTHLY_EQUIVALENT = {"weekly": 4.33, "biweekly": 2.166, "monthly": 1, "quarterly": 1 / 3, "annual": 1 / 12}


def month_bounds(period: str) -> tuple[date, date]:
    year, month = (int(x) for x in period.split("-"))
    return date(year, month, 1), date(year, month, monthrange(year, month)[1])


def summary(db: Session, user_id: str, period: str) -> dict:
    start, end = month_bounds(period)
    base = lambda t: t.user_id == user_id and True  # noqa

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

    cat_rows = (
        db.query(Category.id, Category.name, Category.color, Category.emoji, func.sum(Transaction.amount))
        .join(Transaction, Transaction.category_id == Category.id)
        .filter(Transaction.user_id == user_id, Transaction.type == "expense", Transaction.date.between(start, end))
        .group_by(Category.id)
        .order_by(func.sum(Transaction.amount).desc())
        .limit(5)
        .all()
    )
    top_categories = [
        {"category_id": r[0], "name": r[1], "color": r[2], "emoji": r[3], "total": float(r[4])} for r in cat_rows
    ]

    merchant_rows = (
        db.query(Transaction.payee, func.sum(Transaction.amount))
        .filter(Transaction.user_id == user_id, Transaction.type == "expense", Transaction.date.between(start, end))
        .group_by(Transaction.payee)
        .order_by(func.sum(Transaction.amount).desc())
        .limit(5)
        .all()
    )
    top_merchants = [{"payee": r[0], "total": float(r[1])} for r in merchant_rows if r[0]]

    budgets = db.query(Budget).filter(Budget.user_id == user_id, Budget.period == period).all()
    budget_status = []
    for b in budgets:
        spent = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.user_id == user_id,
                Transaction.category_id == b.category_id,
                Transaction.type == "expense",
                Transaction.date.between(start, end),
            )
            .scalar()
        )
        budget_status.append(
            {
                "category_id": b.category_id,
                "category_name": b.category.name if b.category else "",
                "budget": float(b.amount),
                "spent": float(spent or 0),
                "over": float(spent or 0) > float(b.amount),
            }
        )

    return {
        "period": period,
        "total_income": float(income or 0),
        "total_expense": float(expense or 0),
        "net": float((income or 0) - (expense or 0)),
        "top_categories": top_categories,
        "top_merchants": top_merchants,
        "budget_status": budget_status,
    }


def cashflow(db: Session, user_id: str, start: date, end: date) -> list[dict]:
    rows = (
        db.query(Transaction.date, Transaction.type, Transaction.amount)
        .filter(Transaction.user_id == user_id, Transaction.date.between(start, end), Transaction.type != "transfer")
        .all()
    )
    buckets: dict[str, dict[str, float]] = defaultdict(lambda: {"income": 0.0, "expense": 0.0})
    for d, t, amount in rows:
        key = f"{d.year}-{d.month:02d}"
        buckets[key][t] += float(amount)

    result = []
    for period in sorted(buckets.keys()):
        income = buckets[period]["income"]
        expense = buckets[period]["expense"]
        result.append({"period": period, "income": income, "expense": expense, "net": income - expense})
    return result


def spend_by_category(db: Session, user_id: str, start: date, end: date) -> list[dict]:
    rows = (
        db.query(Category.id, Category.name, Category.color, Category.emoji, func.sum(Transaction.amount))
        .join(Transaction, Transaction.category_id == Category.id)
        .filter(Transaction.user_id == user_id, Transaction.type == "expense", Transaction.date.between(start, end))
        .group_by(Category.id)
        .order_by(func.sum(Transaction.amount).desc())
        .all()
    )
    return [
        {"category_id": r[0], "name": r[1], "color": r[2], "emoji": r[3], "total": float(r[4])} for r in rows
    ]


def net_worth(db: Session, user_id: str, start: date, end: date) -> list[dict]:
    accounts = db.query(Account).filter(Account.user_id == user_id).all()
    points_by_date: dict[date, dict[str, float]] = defaultdict(lambda: {"assets": 0.0, "liabilities": 0.0})

    for account in accounts:
        snapshots = (
            db.query(AccountBalanceSnapshot)
            .filter(AccountBalanceSnapshot.account_id == account.id, AccountBalanceSnapshot.date.between(start, end))
            .order_by(AccountBalanceSnapshot.date)
            .all()
        )
        bucket = "liabilities" if account.is_liability else "assets"
        for snap in snapshots:
            points_by_date[snap.date][bucket] += float(snap.balance)

    result = []
    for d in sorted(points_by_date.keys()):
        assets = points_by_date[d]["assets"]
        liabilities = points_by_date[d]["liabilities"]
        result.append({"date": d, "assets": assets, "liabilities": liabilities, "net_worth": assets - liabilities})
    return result


def net_worth_delta(db: Session, user_id: str, start: date, end: date) -> float | None:
    """Change in net worth between the closest snapshot at/before `start` and at/before `end`.
    Returns None if there isn't enough snapshot history to compute a delta."""
    points = net_worth(db, user_id, date(2000, 1, 1), end)
    if not points:
        return None
    before_start = [p for p in points if p["date"] <= start]
    at_end = [p for p in points if p["date"] <= end]
    if not at_end:
        return None
    start_value = before_start[-1]["net_worth"] if before_start else at_end[0]["net_worth"]
    return at_end[-1]["net_worth"] - start_value


# ---------------------------------------------------------------------------
# Subscriptions
# ---------------------------------------------------------------------------


def subscriptions(db: Session, user_id: str) -> list[dict]:
    """Confirmed recurring items, normalized to a monthly-equivalent cost."""
    items = db.query(RecurringItem).filter(RecurringItem.user_id == user_id, RecurringItem.active.is_(True)).all()
    result = []
    for item in items:
        monthly = float(item.expected_amount) * MONTHLY_EQUIVALENT.get(item.cadence, 1)
        result.append(
            {
                "id": item.id,
                "merchant": item.merchant,
                "category_id": item.category_id,
                "amount": float(item.expected_amount),
                "cadence": item.cadence,
                "monthly_equivalent": round(monthly, 2),
                "next_expected_date": item.next_expected_date,
            }
        )
    result.sort(key=lambda s: s["monthly_equivalent"], reverse=True)
    return result


def subscription_anomalies(db: Session, user_id: str, new_since_days: int = 45, price_increase_pct: float = 0.10) -> dict:
    """New recurring patterns and merchants whose latest charge is materially above their
    own historical average."""
    all_txns = db.query(Transaction).filter(Transaction.user_id == user_id, Transaction.type == "expense").all()
    detected = detect_recurring(all_txns)

    confirmed_merchants = {
        normalize_merchant(r.merchant)
        for r in db.query(RecurringItem).filter(RecurringItem.user_id == user_id).all()
    }

    cutoff = date.today() - timedelta(days=new_since_days)
    new_subscriptions = [
        {
            "merchant": d["merchant"],
            "expected_amount": d["expected_amount"],
            "cadence": d["cadence"],
            "first_seen": d["first_date"],
        }
        for d in detected
        if d["normalized_merchant"] not in confirmed_merchants and d["first_date"] >= cutoff
    ]

    price_increases = []
    for d in detected:
        amounts = [a for _, a in sorted(d["amounts_by_date"])]
        if len(amounts) < 3:
            continue
        *historical, latest = amounts
        avg_historical = mean(historical)
        if avg_historical > 0 and latest > avg_historical * (1 + price_increase_pct):
            price_increases.append(
                {
                    "merchant": d["merchant"],
                    "previous_average": round(avg_historical, 2),
                    "latest_amount": round(latest, 2),
                    "increase_pct": round((latest - avg_historical) / avg_historical * 100, 1),
                }
            )

    return {"new_subscriptions": new_subscriptions, "price_increases": price_increases}


# ---------------------------------------------------------------------------
# Anomaly detection
# ---------------------------------------------------------------------------


def spending_anomalies(db: Session, user_id: str, start: date, end: date, z_threshold: float = 2.0) -> list[dict]:
    """Flags transactions in [start, end] that are unusually large relative to the user's
    own historical spend in that category (trailing 6 months, excluding the flagged window
    itself where possible). Categories with too little history fall back to a simple
    2x-average heuristic instead of a z-score."""
    baseline_start = start - timedelta(days=180)
    history = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            Transaction.date >= baseline_start,
            Transaction.date < start,
        )
        .all()
    )
    by_category: dict[str | None, list[float]] = defaultdict(list)
    for t in history:
        by_category[t.category_id].append(float(t.amount))

    candidates = (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id, Transaction.type == "expense", Transaction.date.between(start, end))
        .all()
    )

    flagged = []
    for t in candidates:
        baseline = by_category.get(t.category_id, [])
        amount = float(t.amount)
        reason = None
        if len(baseline) >= 5:
            avg = mean(baseline)
            std = pstdev(baseline) or 0.01
            z = (amount - avg) / std
            if z >= z_threshold:
                reason = f"{z:.1f}x standard deviations above your typical {t.category.name if t.category else 'category'} spend (avg ${avg:.2f})"
        elif baseline:
            avg = mean(baseline)
            if avg > 0 and amount > avg * 2:
                reason = f"more than double your average spend in this category (avg ${avg:.2f}, limited history)"
        if reason:
            flagged.append(
                {
                    "transaction_id": t.id,
                    "date": t.date,
                    "payee": t.payee,
                    "category_id": t.category_id,
                    "category_name": t.category.name if t.category else None,
                    "amount": amount,
                    "reason": reason,
                }
            )
    flagged.sort(key=lambda f: f["amount"], reverse=True)
    return flagged


# ---------------------------------------------------------------------------
# Behavior signals
# ---------------------------------------------------------------------------


def budget_adherence(db: Session, user_id: str, period: str) -> dict:
    start, end = month_bounds(period)
    budgets = db.query(Budget).filter(Budget.user_id == user_id, Budget.period == period).all()
    if not budgets:
        return {"tracked_categories": 0, "over_budget_count": 0, "over_budget_pct": 0.0, "details": []}

    details = []
    over_count = 0
    for b in budgets:
        spent = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.user_id == user_id,
                Transaction.category_id == b.category_id,
                Transaction.type == "expense",
                Transaction.date.between(start, end),
            )
            .scalar()
        )
        spent = float(spent or 0)
        pct_used = (spent / float(b.amount) * 100) if b.amount else 0
        over = spent > float(b.amount)
        if over:
            over_count += 1
        details.append(
            {
                "category_id": b.category_id,
                "category_name": b.category.name if b.category else "",
                "budget": float(b.amount),
                "spent": spent,
                "pct_used": round(pct_used, 1),
                "over": over,
            }
        )
    return {
        "tracked_categories": len(budgets),
        "over_budget_count": over_count,
        "over_budget_pct": round(over_count / len(budgets) * 100, 1),
        "details": details,
    }


def _shift_period(period: str, months: int) -> str:
    year, month = (int(x) for x in period.split("-"))
    idx = (year * 12 + (month - 1)) + months
    return f"{idx // 12}-{idx % 12 + 1:02d}"


def budget_variance(db: Session, user_id: str, period: str, compare_months: int = 1) -> dict:
    """Budget-vs-actual per category for `period`, plus variance against a prior period
    (default: previous month; pass compare_months=3 to compare against the same point three
    months back, e.g. quarter-over-quarter). The budget amount itself is the user-defined
    target, so `variance_vs_target` here IS the adherence variance the spec asks for."""
    start, end = month_bounds(period)
    prior_period = _shift_period(period, -compare_months)
    prior_start, prior_end = month_bounds(prior_period)

    budgets = db.query(Budget).filter(Budget.user_id == user_id, Budget.period == period).all()
    details = []
    for b in budgets:
        spent = float(
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.user_id == user_id,
                Transaction.category_id == b.category_id,
                Transaction.type == "expense",
                Transaction.date.between(start, end),
            )
            .scalar()
            or 0
        )
        prior_spent = float(
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.user_id == user_id,
                Transaction.category_id == b.category_id,
                Transaction.type == "expense",
                Transaction.date.between(prior_start, prior_end),
            )
            .scalar()
            or 0
        )
        target = float(b.amount)
        variance_vs_target = spent - target
        variance_vs_prior = spent - prior_spent
        details.append(
            {
                "category_id": b.category_id,
                "category_name": b.category.name if b.category else "",
                "target_budget": target,
                "spent": spent,
                "variance_vs_target": round(variance_vs_target, 2),
                "variance_vs_target_pct": round(variance_vs_target / target * 100, 1) if target else None,
                "over_target": spent > target,
                "prior_period": prior_period,
                "prior_spent": prior_spent,
                "variance_vs_prior": round(variance_vs_prior, 2),
                "variance_vs_prior_pct": round(variance_vs_prior / prior_spent * 100, 1) if prior_spent else None,
            }
        )
    return {"period": period, "prior_period": prior_period, "categories": details}


def goal_progress(db: Session, user_id: str) -> list[dict]:
    goals = db.query(Goal).filter(Goal.user_id == user_id).all()
    results = []
    today = date.today()
    for g in goals:
        current = sum(float(a.current_balance) for a in g.accounts)
        pct_complete = (current / float(g.target_amount) * 100) if g.target_amount else 0

        expected_pct = None
        behind_pct = None
        if g.target_date and g.target_date > today:
            total_days = max((g.target_date - g.created_at.date()).days, 1) if g.created_at else None
            if total_days:
                elapsed_days = (today - g.created_at.date()).days
                expected_pct = min(100.0, max(0.0, elapsed_days / total_days * 100))
                behind_pct = expected_pct - pct_complete

        results.append(
            {
                "goal_id": g.id,
                "name": g.name,
                "target_amount": float(g.target_amount),
                "current_amount": current,
                "pct_complete": round(pct_complete, 1),
                "target_date": g.target_date,
                "expected_pct_by_now": round(expected_pct, 1) if expected_pct is not None else None,
                "behind_pct": round(behind_pct, 1) if behind_pct is not None else None,
                "monthly_contribution": float(g.monthly_contribution),
            }
        )
    return results


def weekday_weekend_pattern(db: Session, user_id: str, days: int = 90) -> dict:
    """Compares average per-day spend on weekends vs weekdays over a trailing window.
    Note: transactions only carry a date (no time-of-day), so this covers weekday/weekend
    patterns only — true time-of-day nudges would need a timestamp column."""
    start = date.today() - timedelta(days=days)
    txns = (
        db.query(Transaction.date, Transaction.amount)
        .filter(Transaction.user_id == user_id, Transaction.type == "expense", Transaction.date >= start)
        .all()
    )
    weekday_total, weekend_total = 0.0, 0.0
    weekday_days, weekend_days = set(), set()
    for d, amount in txns:
        if d.weekday() >= 5:
            weekend_total += float(amount)
            weekend_days.add(d)
        else:
            weekday_total += float(amount)
            weekday_days.add(d)

    weekday_avg = weekday_total / len(weekday_days) if weekday_days else 0
    weekend_avg = weekend_total / len(weekend_days) if weekend_days else 0
    ratio = (weekend_avg / weekday_avg) if weekday_avg else None

    return {
        "weekday_avg_daily_spend": round(weekday_avg, 2),
        "weekend_avg_daily_spend": round(weekend_avg, 2),
        "weekend_to_weekday_ratio": round(ratio, 2) if ratio is not None else None,
        "notable": bool(ratio and ratio > 1.5),
    }


def totals_for_range(db: Session, user_id: str, start: date, end: date) -> dict:
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
    return {"income": float(income or 0), "expense": float(expense or 0)}


def top_merchants_for_range(db: Session, user_id: str, start: date, end: date, limit: int = 5) -> list[dict]:
    rows = (
        db.query(Transaction.payee, func.sum(Transaction.amount))
        .filter(Transaction.user_id == user_id, Transaction.type == "expense", Transaction.date.between(start, end))
        .group_by(Transaction.payee)
        .order_by(func.sum(Transaction.amount).desc())
        .limit(limit)
        .all()
    )
    return [{"payee": r[0], "total": float(r[1])} for r in rows if r[0]]


def behavior_signals(db: Session, user_id: str, period: str) -> dict:
    return {
        "period": period,
        "budget_adherence": budget_adherence(db, user_id, period),
        "goal_progress": goal_progress(db, user_id),
        "weekday_weekend_pattern": weekday_weekend_pattern(db, user_id),
    }


# ---------------------------------------------------------------------------
# Budget suggestion (55/5/10/15/15 rule)
# ---------------------------------------------------------------------------

BUDGET_SUGGESTION_RULE = {
    "essential": 0.55,
    "guilt_free": 0.05,
    "debt_or_invest": 0.10,
    "short_term_investing": 0.15,
    "long_term_investing": 0.15,
}


def _monthly_income(db: Session, user_id: str, period: str) -> float:
    """Income for the given period, falling back to the average of the prior three
    months when the current period has no income recorded yet."""
    start, end = month_bounds(period)
    current = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(Transaction.user_id == user_id, Transaction.type == "income", Transaction.date.between(start, end))
        .scalar()
    )
    if current:
        return float(current)

    year, month = (int(x) for x in period.split("-"))
    totals = []
    for i in range(1, 4):
        m = month - i
        y = year
        while m < 1:
            m += 12
            y -= 1
        p_start, p_end = month_bounds(f"{y}-{m:02d}")
        total = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.user_id == user_id,
                Transaction.type == "income",
                Transaction.date.between(p_start, p_end),
            )
            .scalar()
        )
        if total:
            totals.append(float(total))
    return mean(totals) if totals else 0.0


def has_outstanding_debt(db: Session, user_id: str) -> bool:
    return (
        db.query(Account)
        .filter(
            Account.user_id == user_id,
            Account.archived.is_(False),
            Account.is_liability.is_(True),
            Account.current_balance > 0,
        )
        .first()
        is not None
    )


def budget_suggestion(db: Session, user_id: str, period: str) -> dict:
    income = _monthly_income(db, user_id, period)
    debt = has_outstanding_debt(db, user_id)

    debt_label = "debt_paydown" if debt else "investing"
    buckets = [
        {
            "key": "essential",
            "label": "Essential expenses",
            "description": "Housing, utilities, groceries, transportation",
            "pct": BUDGET_SUGGESTION_RULE["essential"],
            "amount": round(income * BUDGET_SUGGESTION_RULE["essential"], 2),
        },
        {
            "key": "guilt_free",
            "label": "Guilt-free money",
            "description": "Spend on whatever you want, no tracking guilt",
            "pct": BUDGET_SUGGESTION_RULE["guilt_free"],
            "amount": round(income * BUDGET_SUGGESTION_RULE["guilt_free"], 2),
        },
        {
            "key": "debt_or_invest",
            "label": "Debt paydown" if debt else "Investing (debt-free)",
            "description": (
                "Extra payments toward loans and credit cards" if debt else "No outstanding debt — invest this instead"
            ),
            "pct": BUDGET_SUGGESTION_RULE["debt_or_invest"],
            "amount": round(income * BUDGET_SUGGESTION_RULE["debt_or_invest"], 2),
        },
        {
            "key": "short_term_investing",
            "label": "Short-term goals",
            "description": "Vacation, car, down payment",
            "pct": BUDGET_SUGGESTION_RULE["short_term_investing"],
            "amount": round(income * BUDGET_SUGGESTION_RULE["short_term_investing"], 2),
        },
        {
            "key": "long_term_investing",
            "label": "Long-term wealth",
            "description": "Retirement and long-term investing",
            "pct": BUDGET_SUGGESTION_RULE["long_term_investing"],
            "amount": round(income * BUDGET_SUGGESTION_RULE["long_term_investing"], 2),
        },
    ]

    return {
        "period": period,
        "monthly_income": round(income, 2),
        "has_debt": debt,
        "debt_bucket_label": debt_label,
        "buckets": buckets,
    }


# ---------------------------------------------------------------------------
# House down payment savings plan
# ---------------------------------------------------------------------------

HOME_MAX_PAYMENT_PCT = 0.5  # max monthly mortgage payment as a share of monthly income, debt-free
HOME_PAYMENT_PER_1000 = 7.4  # ~monthly P&I per $1,000 borrowed at a conventional 30yr rate
HOME_DOWN_PAYMENT_PCT = 0.10
HOME_CLOSING_COST_PCT = 0.02
HOME_SAVINGS_RATE_PCT = 0.30  # share of monthly income suggested to save toward the home fund


def home_savings_plan(db: Session, user_id: str, period: str) -> dict:
    """Conventional 10%-down affordability + savings-timeline estimate, assuming no other debts."""
    income = _monthly_income(db, user_id, period)
    debt = has_outstanding_debt(db, user_id)

    max_monthly_payment = round(income * HOME_MAX_PAYMENT_PCT, 2)
    max_home_price = round(max_monthly_payment / HOME_PAYMENT_PER_1000 * 1000, 2)
    total_to_close_pct = HOME_DOWN_PAYMENT_PCT + HOME_CLOSING_COST_PCT
    amount_needed_to_close = round(max_home_price * total_to_close_pct, 2)
    suggested_monthly_savings = round(income * HOME_SAVINGS_RATE_PCT, 2)
    months_to_save = (
        round(amount_needed_to_close / suggested_monthly_savings, 1) if suggested_monthly_savings > 0 else None
    )

    return {
        "period": period,
        "monthly_income": round(income, 2),
        "has_debt": debt,
        "max_monthly_mortgage_payment": max_monthly_payment,
        "max_home_price": max_home_price,
        "down_payment_pct": HOME_DOWN_PAYMENT_PCT,
        "closing_cost_pct": HOME_CLOSING_COST_PCT,
        "amount_needed_to_close": amount_needed_to_close,
        "suggested_monthly_savings": suggested_monthly_savings,
        "months_to_save_from_zero": months_to_save,
    }
