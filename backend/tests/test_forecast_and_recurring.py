"""Direct coverage for endpoints only exercised indirectly elsewhere: forecast/cashflow,
analytics/cashflow, analytics/net-worth, recurring/suggestions, and the assistant endpoints
that weren't covered by test_assistant_integration.py (NL scenario parsing fallback,
subscriptions/anomalies narration)."""
from datetime import date, timedelta

import pytest

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


def test_forecast_goals_projects_completion_from_contribution_rate(client, auth_headers, seeded):
    today = date.today()
    resp = client.post(
        f"{API}/goals",
        json={
            "name": "Emergency Fund",
            "target_amount": 2000,
            "monthly_contribution": 500,
            "account_ids": [seeded["account"]["id"]],
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201

    resp = client.get(f"{API}/forecast/goals", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    goal = next(g for g in data if g["goal_name"] == "Emergency Fund")
    # seeded account starts at $1000 current_balance -> $1000 remaining at $500/mo -> 2 months
    assert goal["remaining_amount"] == 1000
    assert goal["months_to_goal"] == 2.0
    assert goal["projected_completion_date"] is not None


def test_forecast_goals_no_contribution_never_completes(client, auth_headers, seeded):
    resp = client.post(
        f"{API}/goals",
        json={"name": "Vague Goal", "target_amount": 5000, "monthly_contribution": 0, "account_ids": []},
        headers=auth_headers,
    )
    assert resp.status_code == 201

    resp = client.get(f"{API}/forecast/goals", headers=auth_headers)
    assert resp.status_code == 200
    goal = next(g for g in resp.json() if g["goal_name"] == "Vague Goal")
    assert goal["months_to_goal"] is None
    assert goal["projected_completion_date"] is None


def test_forecast_cashflow_uses_trailing_averages_and_recurring(client, auth_headers, seeded):
    today = date.today()
    for i in range(3):
        _add_txn(
            client, auth_headers, seeded["account"]["id"], seeded["income_category"]["id"],
            2000, "income", today - timedelta(days=30 * i),
        )
        _add_txn(
            client, auth_headers, seeded["account"]["id"], seeded["expense_category"]["id"],
            500, "expense", today - timedelta(days=30 * i),
        )

    resp = client.get(f"{API}/forecast/cashflow", params={"days": 30}, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["horizon_days"] == 30
    # Trailing-average window spans whole calendar months, so the exact denominator depends
    # on today's day-of-month — assert the derived relationship instead of a hardcoded figure.
    assert data["avg_monthly_income"] > 0
    assert data["avg_monthly_expense"] > 0
    assert data["avg_monthly_net"] == pytest.approx(data["avg_monthly_income"] - data["avg_monthly_expense"])
    assert data["avg_monthly_income"] > data["avg_monthly_expense"]  # 2000 income vs 500 expense per occurrence
    assert len(data["points"]) > 0
    # Cumulative projection should trend upward given positive net cash flow.
    assert data["points"][-1]["projected_net_cash"] > data["points"][0]["projected_net_cash"]


def test_analytics_cashflow_buckets_by_month(client, auth_headers, seeded):
    today = date.today()
    _add_txn(client, auth_headers, seeded["account"]["id"], seeded["income_category"]["id"], 1000, "income", today)
    _add_txn(client, auth_headers, seeded["account"]["id"], seeded["expense_category"]["id"], 300, "expense", today)

    resp = client.get(
        f"{API}/analytics/cashflow",
        params={"start": (today - timedelta(days=5)).isoformat(), "end": today.isoformat()},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    period = f"{today.year}-{today.month:02d}"
    bucket = next(p for p in data if p["period"] == period)
    assert bucket["income"] == 1000
    assert bucket["expense"] == 300
    assert bucket["net"] == 700


def test_analytics_net_worth_reflects_balance_snapshots(client, auth_headers, seeded):
    today = date.today()
    earlier = today - timedelta(days=30)
    account_id = seeded["account"]["id"]

    client.post(
        f"{API}/accounts/{account_id}/balance-snapshot",
        json={"date": earlier.isoformat(), "balance": 1000},
        headers=auth_headers,
    )
    resp = client.post(
        f"{API}/accounts/{account_id}/balance-snapshot",
        json={"date": today.isoformat(), "balance": 1500},
        headers=auth_headers,
    )
    assert resp.status_code == 201

    resp = client.get(
        f"{API}/analytics/net-worth",
        params={"start": (earlier - timedelta(days=1)).isoformat(), "end": today.isoformat()},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    points = resp.json()
    assert points[0]["net_worth"] == 1000
    assert points[-1]["net_worth"] == 1500


def test_recurring_suggestions_detects_stable_monthly_pattern(client, auth_headers, seeded):
    today = date.today()
    for i in range(4):
        _add_txn(
            client, auth_headers, seeded["account"]["id"], seeded["expense_category"]["id"],
            15.49, "expense", today - timedelta(days=30 * i), payee="Netflix",
        )

    resp = client.get(f"{API}/recurring/suggestions", headers=auth_headers)
    assert resp.status_code == 200
    suggestions = resp.json()
    assert any(s["merchant"] == "Netflix" and s["cadence"] == "monthly" for s in suggestions)

    # Confirming it should remove it from future suggestions.
    client.post(
        f"{API}/recurring",
        json={"merchant": "Netflix", "expected_amount": 15.49, "cadence": "monthly"},
        headers=auth_headers,
    )
    resp = client.get(f"{API}/recurring/suggestions", headers=auth_headers)
    assert all(s["merchant"] != "Netflix" for s in resp.json())


def test_assistant_scenario_nl_question_falls_back_to_regex_parser(client, auth_headers, seeded):
    today = date.today()
    for _ in range(3):
        _add_txn(client, auth_headers, seeded["account"]["id"], seeded["expense_category"]["id"], 100, "expense", today)

    resp = client.post(
        f"{API}/assistant/scenario", json={"question": "what if I cut Groceries by 20%"}, headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["source"] == "deterministic"  # LLM_ENABLED=false in tests -> regex fallback
    assert data["scenario"]["adjustments"][0]["target"] == "Groceries"
    assert data["scenario"]["adjustments"][0]["value"] == -0.2
    assert data["result"]["monthly_net_delta"] > 0


def test_assistant_scenario_unparseable_question_returns_helpful_message(client, auth_headers, seeded):
    resp = client.post(f"{API}/assistant/scenario", json={"question": "what should I do"}, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["scenario"]["adjustments"] == []
    assert "try naming a category" in data["explanation"]


def test_assistant_subscriptions_summary(client, auth_headers, seeded):
    client.post(
        f"{API}/recurring",
        json={"merchant": "Spotify", "expected_amount": 9.99, "cadence": "monthly"},
        headers=auth_headers,
    )
    resp = client.get(f"{API}/assistant/subscriptions", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["source"] == "deterministic"
    assert data["subscriptions"][0]["merchant"] == "Spotify"
    assert "Spotify" in data["summary"] or "1 recurring" in data["summary"]


def test_assistant_anomalies_summary(client, auth_headers, seeded):
    today = date.today()
    for i in range(5):
        _add_txn(
            client, auth_headers, seeded["account"]["id"], seeded["expense_category"]["id"],
            20, "expense", today - timedelta(days=30 + i * 10),
        )
    _add_txn(client, auth_headers, seeded["account"]["id"], seeded["expense_category"]["id"], 500, "expense", today, payee="Big One")

    resp = client.get(f"{API}/assistant/anomalies", params={"days": 30}, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["source"] == "deterministic"
    assert any(a["payee"] == "Big One" for a in data["anomalies"])
