"""Heuristic recurring-charge detection: groups transactions by normalized merchant name,
looks for roughly-regular intervals and stable amounts, and proposes candidates.

Purely local/deterministic — no external calls.
"""
import re
from collections import defaultdict
from datetime import date, timedelta
from statistics import mean, pstdev

from app.models.transaction import Transaction

CADENCE_BY_DAYS = [
    (6, 8, "weekly"),
    (13, 15, "biweekly"),
    (27, 33, "monthly"),
    (85, 95, "quarterly"),
    (360, 370, "annual"),
]


def normalize_merchant(payee: str) -> str:
    s = payee.upper()
    s = re.sub(r"\d{4,}", "", s)  # strip long numbers (card/ref numbers)
    s = re.sub(r"[^A-Z0-9 &]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s[:40]


def _cadence_from_gaps(gaps: list[int]) -> str | None:
    if not gaps:
        return None
    avg_gap = mean(gaps)
    for low, high, label in CADENCE_BY_DAYS:
        if low <= avg_gap <= high:
            return label
    return None


def detect_recurring(transactions: list[Transaction], min_occurrences: int = 3) -> list[dict]:
    groups: dict[str, list[Transaction]] = defaultdict(list)
    for txn in transactions:
        if txn.type != "expense":
            continue
        groups[normalize_merchant(txn.payee)].append(txn)

    suggestions = []
    for merchant, txns in groups.items():
        if len(txns) < min_occurrences or not merchant:
            continue
        txns.sort(key=lambda t: t.date)
        amounts = [float(t.amount) for t in txns]
        avg_amount = mean(amounts)
        # amounts should be reasonably stable (subscriptions rarely swing >15%)
        if avg_amount == 0 or (pstdev(amounts) / avg_amount) > 0.15:
            continue

        gaps = [(txns[i].date - txns[i - 1].date).days for i in range(1, len(txns))]
        cadence = _cadence_from_gaps(gaps)
        if not cadence:
            continue

        last_date = txns[-1].date
        interval_days = {"weekly": 7, "biweekly": 14, "monthly": 30, "quarterly": 91, "annual": 365}[cadence]
        next_expected = last_date + timedelta(days=interval_days)

        suggestions.append(
            {
                "merchant": txns[-1].payee or merchant,
                "normalized_merchant": merchant,
                "expected_amount": round(avg_amount, 2),
                "cadence": cadence,
                "occurrences": len(txns),
                "first_date": txns[0].date,
                "last_date": last_date,
                "next_expected_date": next_expected,
                "amounts_by_date": [(t.date, float(t.amount)) for t in txns],
            }
        )
    suggestions.sort(key=lambda s: s["next_expected_date"])
    return suggestions


def upcoming_charges(recurring_items, days: int = 30) -> list[dict]:
    horizon = date.today() + timedelta(days=days)
    upcoming = []
    for item in recurring_items:
        if not item.active or not item.next_expected_date:
            continue
        if item.next_expected_date <= horizon:
            upcoming.append(
                {
                    "id": item.id,
                    "merchant": item.merchant,
                    "expected_amount": float(item.expected_amount),
                    "cadence": item.cadence,
                    "date": item.next_expected_date,
                    "category_id": item.category_id,
                }
            )
    upcoming.sort(key=lambda x: x["date"])
    return upcoming
