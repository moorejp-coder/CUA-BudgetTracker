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
