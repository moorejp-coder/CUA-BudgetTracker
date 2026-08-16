"""Unit/integration tests for the deterministic analytics endpoints — no LLM involved.
These exist to guarantee the numbers the AI gateway narrates are actually correct."""
from datetime import date, timedelta

from tests.conftest import API


def _add_txn(client, headers, account_id, category_id, amount, txn_type, txn_date, payee="Test"):
    return client.post(
        f"{API}/transactions",
        json={
            "account_id": account_id,
            "category_id": category_id,
            "amount": amount,
            "type": txn_type,
            "date": txn_date.isoformat(),
            "payee": payee,
        },
        headers=headers,
    ).json()


def test_summary_totals_income_and_expense(client, auth_headers, seeded):
    today = date.today()
    _add_txn(client, auth_headers, seeded["account"]["id"], seeded["expense_category"]["id"], 42.50, "expense", today)
    _add_txn(client, auth_headers, seeded["account"]["id"], seeded["income_category"]["id"], 3000, "income", today)

    period = f"{today.year}-{today.month:02d}"
    resp = client.get(f"{API}/analytics/summary", params={"month": period}, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_income"] == 3000
    assert data["total_expense"] == 42.5
    assert data["net"] == 3000 - 42.5
    assert data["top_categories"][0]["name"] == "Groceries"


def test_spend_by_category_range(client, auth_headers, seeded):
    today = date.today()
    _add_txn(client, auth_headers, seeded["account"]["id"], seeded["expense_category"]["id"], 10, "expense", today)
    _add_txn(client, auth_headers, seeded["account"]["id"], seeded["expense_category"]["id"], 15, "expense", today)

    resp = client.get(
        f"{API}/analytics/spend-by-category",
        params={"start": (today - timedelta(days=5)).isoformat(), "end": today.isoformat()},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["total"] == 25


def test_subscriptions_monthly_equivalent(client, auth_headers):
    resp = client.post(
        f"{API}/recurring",
        json={"merchant": "Netflix", "expected_amount": 15.49, "cadence": "monthly"},
        headers=auth_headers,
    )
    assert resp.status_code == 201

    resp = client.get(f"{API}/analytics/subscriptions", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_monthly"] == 15.49
    assert data["subscriptions"][0]["merchant"] == "Netflix"


def test_spending_anomaly_flags_large_transaction(client, auth_headers, seeded):
    """Five small, similar transactions establish a baseline; a much larger sixth one in the
    scan window should get flagged."""
    today = date.today()
    for i in range(5):
        _add_txn(
            client,
            auth_headers,
            seeded["account"]["id"],
            seeded["expense_category"]["id"],
            20 + i,  # 20..24, low variance
            "expense",
            today - timedelta(days=30 + i * 10),  # within the 180-day baseline window, before the scan window
        )
    _add_txn(client, auth_headers, seeded["account"]["id"], seeded["expense_category"]["id"], 500, "expense", today, payee="Big One")

    resp = client.get(
        f"{API}/analytics/anomalies",
        params={"start": (today - timedelta(days=1)).isoformat(), "end": today.isoformat()},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    flagged = resp.json()
    assert any(a["payee"] == "Big One" for a in flagged)


def _shift_period(period: str, months: int) -> str:
    year, month = (int(x) for x in period.split("-"))
    idx = (year * 12 + (month - 1)) + months
    return f"{idx // 12}-{idx % 12 + 1:02d}"


def test_budget_variance_vs_target_and_prior_period(client, auth_headers, seeded):
    today = date.today()
    period = f"{today.year}-{today.month:02d}"
    prior_period = _shift_period(period, -1)
    prior_date = date.fromisoformat(f"{prior_period}-15")

    client.post(
        f"{API}/budgets",
        json={"category_id": seeded["expense_category"]["id"], "period": period, "amount": 100, "rollover": False},
        headers=auth_headers,
    )
    _add_txn(client, auth_headers, seeded["account"]["id"], seeded["expense_category"]["id"], 150, "expense", today)
    _add_txn(client, auth_headers, seeded["account"]["id"], seeded["expense_category"]["id"], 50, "expense", prior_date)

    resp = client.get(f"{API}/analytics/budget-variance", params={"period": period}, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["prior_period"] == prior_period
    row = data["categories"][0]
    assert row["target_budget"] == 100
    assert row["spent"] == 150
    assert row["variance_vs_target"] == 50
    assert row["over_target"] is True
    assert row["prior_spent"] == 50
    assert row["variance_vs_prior"] == 100


def test_budget_suggestion_splits_income_debt_free(client, auth_headers, seeded):
    today = date.today()
    period = f"{today.year}-{today.month:02d}"
    _add_txn(client, auth_headers, seeded["account"]["id"], seeded["income_category"]["id"], 4000, "income", today)

    resp = client.get(f"{API}/analytics/budget-suggestion", params={"period": period}, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["monthly_income"] == 4000
    assert data["has_debt"] is False

    by_key = {b["key"]: b for b in data["buckets"]}
    assert by_key["essential"]["amount"] == 2200  # 55%
    assert by_key["guilt_free"]["amount"] == 200  # 5%
    assert by_key["debt_or_invest"]["label"] == "Investing (debt-free)"
    assert by_key["debt_or_invest"]["amount"] == 400  # 10%
    assert by_key["short_term_investing"]["amount"] == 600  # 15%
    assert by_key["long_term_investing"]["amount"] == 600  # 15%


def test_budget_suggestion_routes_to_debt_paydown_with_liability(client, auth_headers, seeded):
    today = date.today()
    period = f"{today.year}-{today.month:02d}"
    _add_txn(client, auth_headers, seeded["account"]["id"], seeded["income_category"]["id"], 4000, "income", today)
    client.post(
        f"{API}/accounts",
        json={"name": "Credit Card", "type": "credit_card", "current_balance": 500, "is_liability": True},
        headers=auth_headers,
    )

    resp = client.get(f"{API}/analytics/budget-suggestion", params={"period": period}, headers=auth_headers)
    data = resp.json()
    assert data["has_debt"] is True
    by_key = {b["key"]: b for b in data["buckets"]}
    assert by_key["debt_or_invest"]["label"] == "Debt paydown"


def test_behavior_signals_budget_adherence(client, auth_headers, seeded):
    today = date.today()
    period = f"{today.year}-{today.month:02d}"
    client.post(
        f"{API}/budgets",
        json={"category_id": seeded["expense_category"]["id"], "period": period, "amount": 50, "rollover": False},
        headers=auth_headers,
    )
    _add_txn(client, auth_headers, seeded["account"]["id"], seeded["expense_category"]["id"], 60, "expense", today)

    resp = client.get(f"{API}/analytics/behavior-signals", params={"period": period}, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["budget_adherence"]["over_budget_count"] == 1
    assert data["budget_adherence"]["details"][0]["over"] is True
