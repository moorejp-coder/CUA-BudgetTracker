"""End-to-end flows: assistant query -> analytics -> LLM gateway -> response, and
recap job -> analytics -> LLM gateway -> recap stored. LLM_ENABLED=false globally (see
conftest.py), so by default these exercise the deterministic fallback path — the same
path a real deployment falls back to if the local LLM is offline. A couple of tests
monkeypatch `llm_client.chat` directly to prove the "llm" path also wires up correctly
without needing a real model running.
"""
from datetime import date

import pytest

from app.services import llm_client
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


def test_assistant_query_deterministic_fallback(client, auth_headers, seeded):
    today = date.today()
    _add_txn(client, auth_headers, seeded["account"]["id"], seeded["expense_category"]["id"], 42.5, "expense", today)

    resp = client.post(f"{API}/assistant/query", json={"question": "How much did I spend this month?"}, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["source"] == "deterministic"
    assert "42.5" in data["answer"] or "42.50" in data["answer"]
    assert "spend" in data["intents"]


def test_assistant_query_routes_budget_intent(client, auth_headers, seeded):
    today = date.today()
    period = f"{today.year}-{today.month:02d}"
    client.post(
        f"{API}/budgets",
        json={"category_id": seeded["expense_category"]["id"], "period": period, "amount": 10, "rollover": False},
        headers=auth_headers,
    )
    _add_txn(client, auth_headers, seeded["account"]["id"], seeded["expense_category"]["id"], 50, "expense", today)

    resp = client.post(f"{API}/assistant/query", json={"question": "am I over budget?"}, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "budget" in data["intents"]
    assert data["data"]["budget_status"][0]["over"] is True


def test_assistant_query_uses_llm_when_reachable(client, auth_headers, monkeypatch):
    async def fake_chat(system, user, max_tokens=300):
        assert "ONLY" in system  # safety preamble made it into the prompt
        return "Canned LLM answer."

    monkeypatch.setattr(llm_client, "chat", fake_chat)

    resp = client.post(f"{API}/assistant/query", json={"question": "How am I doing?"}, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["source"] == "llm"
    assert data["answer"] == "Canned LLM answer."


def test_assistant_scenario_percentage_cut(client, auth_headers, seeded):
    today = date.today()
    for i in range(3):
        _add_txn(client, auth_headers, seeded["account"]["id"], seeded["expense_category"]["id"], 100, "expense", today)

    resp = client.post(f"{API}/forecast/scenario", json={"adjustments": [{"target": "Groceries", "value": -0.5}]}, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    projected = next(c for c in data["category_projections"] if c["category"] == "Groceries")
    assert projected["projected_monthly"] == pytest.approx(projected["baseline_monthly"] * 0.5, rel=0.01)
    assert data["monthly_net_delta"] > 0  # cutting spend improves net cash flow


def test_recap_generate_and_list(client, auth_headers, seeded):
    resp = client.post(f"{API}/recaps/generate", json={"period_type": "month"}, headers=auth_headers)
    assert resp.status_code == 201
    recap = resp.json()
    assert recap["recap_text"]
    assert recap["period_type"] == "month"
    assert recap["source"] == "deterministic"

    resp = client.get(f"{API}/recaps", headers=auth_headers)
    assert resp.status_code == 200
    recaps = resp.json()
    assert any(r["id"] == recap["id"] for r in recaps)


def test_nudge_generate_and_dismiss(client, auth_headers, seeded):
    today = date.today()
    period = f"{today.year}-{today.month:02d}"
    client.post(
        f"{API}/budgets",
        json={"category_id": seeded["expense_category"]["id"], "period": period, "amount": 100, "rollover": False},
        headers=auth_headers,
    )
    _add_txn(client, auth_headers, seeded["account"]["id"], seeded["expense_category"]["id"], 90, "expense", today)

    resp = client.post(f"{API}/nudges/generate", headers=auth_headers)
    assert resp.status_code == 200
    nudges = resp.json()
    assert any(n["event_type"] == "budget_warning" for n in nudges)

    nudge_id = nudges[0]["id"]
    resp = client.post(f"{API}/nudges/{nudge_id}/dismiss", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["dismissed_at"] is not None

    resp = client.get(f"{API}/nudges", headers=auth_headers)
    assert all(n["id"] != nudge_id for n in resp.json())  # dismissed nudges excluded by default
