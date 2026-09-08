from tests.conftest import API


def _balance(client, auth_headers, account_id):
    accs = client.get(f"{API}/accounts", headers=auth_headers).json()
    return next(a["current_balance"] for a in accs if a["id"] == account_id)


def test_account_balance_updates_on_transaction_crud(client, auth_headers, seeded):
    account_id = seeded["account"]["id"]
    expense_cat = seeded["expense_category"]["id"]

    assert _balance(client, auth_headers, account_id) == 1000

    txn = client.post(
        f"{API}/transactions",
        json={
            "account_id": account_id,
            "category_id": expense_cat,
            "date": "2026-01-01",
            "amount": 50,
            "type": "expense",
        },
        headers=auth_headers,
    ).json()
    assert _balance(client, auth_headers, account_id) == 950

    client.patch(f"{API}/transactions/{txn['id']}", json={"amount": 75}, headers=auth_headers)
    assert _balance(client, auth_headers, account_id) == 925

    client.delete(f"{API}/transactions/{txn['id']}", headers=auth_headers)
    assert _balance(client, auth_headers, account_id) == 1000


def test_account_balance_updates_on_income(client, auth_headers, seeded):
    account_id = seeded["account"]["id"]
    income_cat = seeded["income_category"]["id"]

    client.post(
        f"{API}/transactions",
        json={
            "account_id": account_id,
            "category_id": income_cat,
            "date": "2026-01-01",
            "amount": 200,
            "type": "income",
        },
        headers=auth_headers,
    )
    assert _balance(client, auth_headers, account_id) == 1200


def _second_account(client, auth_headers, balance=500):
    return client.post(
        f"{API}/accounts",
        json={"name": "Savings", "type": "savings", "current_balance": balance},
        headers=auth_headers,
    ).json()


def test_transfer_moves_balance_between_accounts(client, auth_headers, seeded):
    source_id = seeded["account"]["id"]
    dest = _second_account(client, auth_headers)

    resp = client.post(
        f"{API}/transactions",
        json={
            "account_id": source_id,
            "transfer_account_id": dest["id"],
            "date": "2026-01-01",
            "amount": 100,
            "type": "transfer",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    txn = resp.json()
    assert txn["transfer_account_id"] == dest["id"]
    assert _balance(client, auth_headers, source_id) == 900
    assert _balance(client, auth_headers, dest["id"]) == 600

    client.delete(f"{API}/transactions/{txn['id']}", headers=auth_headers)
    assert _balance(client, auth_headers, source_id) == 1000
    assert _balance(client, auth_headers, dest["id"]) == 500


def test_transfer_requires_transfer_account_id(client, auth_headers, seeded):
    account_id = seeded["account"]["id"]
    resp = client.post(
        f"{API}/transactions",
        json={"account_id": account_id, "date": "2026-01-01", "amount": 50, "type": "transfer"},
        headers=auth_headers,
    )
    assert resp.status_code == 422


def test_transfer_rejects_same_account(client, auth_headers, seeded):
    account_id = seeded["account"]["id"]
    resp = client.post(
        f"{API}/transactions",
        json={
            "account_id": account_id,
            "transfer_account_id": account_id,
            "date": "2026-01-01",
            "amount": 50,
            "type": "transfer",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 422


def test_transfer_update_reroutes_balances(client, auth_headers, seeded):
    source_id = seeded["account"]["id"]
    dest_a = _second_account(client, auth_headers, balance=500)
    dest_b = _second_account(client, auth_headers, balance=300)

    txn = client.post(
        f"{API}/transactions",
        json={
            "account_id": source_id,
            "transfer_account_id": dest_a["id"],
            "date": "2026-01-01",
            "amount": 100,
            "type": "transfer",
        },
        headers=auth_headers,
    ).json()
    assert _balance(client, auth_headers, dest_a["id"]) == 600

    client.patch(
        f"{API}/transactions/{txn['id']}",
        json={"transfer_account_id": dest_b["id"]},
        headers=auth_headers,
    )
    assert _balance(client, auth_headers, dest_a["id"]) == 500
    assert _balance(client, auth_headers, dest_b["id"]) == 400
    assert _balance(client, auth_headers, source_id) == 900
