"""Savings Buckets: bucket CRUD, allocation/transfer/unassign, ledger integrity,
idempotency, authorization, and the account balance invariant.

    actual_account_balance == unassigned_balance + sum(active bucket balances)

is asserted after every successful mutation via `_assert_invariant`.
"""
import threading
import uuid

from tests.conftest import API


def _account_id(seeded):
    return seeded["account"]["id"]


def _create_bucket(client, headers, account_id, **overrides):
    payload = {"name": "Emergency Fund"}
    payload.update(overrides)
    resp = client.post(f"{API}/accounts/{account_id}/buckets", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


def _summary(client, headers, account_id):
    resp = client.get(f"{API}/accounts/{account_id}/bucket-summary", headers=headers)
    assert resp.status_code == 200, resp.text
    return resp.json()


def _assert_invariant(client, headers, account_id):
    summary = _summary(client, headers, account_id)
    active_sum = sum(b["balance"] for b in summary["buckets"])
    assert round(summary["unassigned_balance"] + active_sum, 2) == round(summary["account_balance"], 2)
    return summary


def _key() -> str:
    return uuid.uuid4().hex


def _second_user_headers(client):
    email = f"user-{uuid.uuid4().hex[:10]}@example.com"
    client.post(f"{API}/auth/register", json={"email": email, "password": "testpass123"})
    resp = client.post(f"{API}/auth/login", json={"email": email, "password": "testpass123"})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------


def test_create_bucket_does_not_change_balances(client, auth_headers, seeded):
    account_id = _account_id(seeded)
    bucket = _create_bucket(client, auth_headers, account_id, name="Vacation", target_amount="1200.00")
    assert bucket["current_balance"] == 0
    assert bucket["status"] == "active"
    summary = _assert_invariant(client, auth_headers, account_id)
    assert summary["unassigned_balance"] == 1000
    assert summary["assigned_balance"] == 0


def test_edit_bucket_does_not_affect_balances(client, auth_headers, seeded):
    account_id = _account_id(seeded)
    bucket = _create_bucket(client, auth_headers, account_id)
    resp = client.patch(
        f"{API}/buckets/{bucket['id']}",
        json={"name": "Rainy Day", "target_amount": "3000.00", "target_date": "2027-01-01"},
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text
    updated = resp.json()
    assert updated["name"] == "Rainy Day"
    assert updated["target_amount"] == 3000.0
    assert updated["current_balance"] == 0
    _assert_invariant(client, auth_headers, account_id)


def test_archive_empty_bucket_succeeds(client, auth_headers, seeded):
    account_id = _account_id(seeded)
    bucket = _create_bucket(client, auth_headers, account_id)
    resp = client.post(f"{API}/buckets/{bucket['id']}/archive", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "archived"


def test_archive_non_empty_bucket_is_blocked(client, auth_headers, seeded):
    account_id = _account_id(seeded)
    bucket = _create_bucket(client, auth_headers, account_id)
    client.post(
        f"{API}/buckets/{bucket['id']}/allocate",
        json={"amount": "200.00", "idempotency_key": _key()},
        headers=auth_headers,
    )
    resp = client.post(f"{API}/buckets/{bucket['id']}/archive", headers=auth_headers)
    assert resp.status_code == 400
    assert "before archiving" in resp.json()["detail"]
    _assert_invariant(client, auth_headers, account_id)


# ---------------------------------------------------------------------------
# Allocation / transfer / unassign
# ---------------------------------------------------------------------------


def test_allocate_from_unassigned(client, auth_headers, seeded):
    account_id = _account_id(seeded)
    bucket = _create_bucket(client, auth_headers, account_id)
    resp = client.post(
        f"{API}/buckets/{bucket['id']}/allocate",
        json={"amount": "250.00", "idempotency_key": _key()},
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["summary"]["unassigned_balance"] == 750
    assert body["summary"]["buckets"][0]["balance"] == 250
    assert body["event"]["event_type"] == "allocate_to_bucket"
    assert body["event"]["label"] == "Added to goal"
    _assert_invariant(client, auth_headers, account_id)


def test_move_between_buckets(client, auth_headers, seeded):
    account_id = _account_id(seeded)
    emergency = _create_bucket(client, auth_headers, account_id, name="Emergency Fund")
    vacation = _create_bucket(client, auth_headers, account_id, name="Vacation")
    client.post(
        f"{API}/buckets/{emergency['id']}/allocate",
        json={"amount": "500.00", "idempotency_key": _key()},
        headers=auth_headers,
    )
    resp = client.post(
        f"{API}/bucket-transfers",
        json={
            "source_bucket_id": emergency["id"],
            "destination_bucket_id": vacation["id"],
            "amount": "150.00",
            "idempotency_key": _key(),
        },
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text
    summary = resp.json()["summary"]
    balances = {b["id"]: b["balance"] for b in summary["buckets"]}
    assert balances[emergency["id"]] == 350
    assert balances[vacation["id"]] == 150
    assert summary["unassigned_balance"] == 500
    _assert_invariant(client, auth_headers, account_id)


def test_move_to_unassigned(client, auth_headers, seeded):
    account_id = _account_id(seeded)
    bucket = _create_bucket(client, auth_headers, account_id)
    client.post(
        f"{API}/buckets/{bucket['id']}/allocate",
        json={"amount": "400.00", "idempotency_key": _key()},
        headers=auth_headers,
    )
    resp = client.post(
        f"{API}/buckets/{bucket['id']}/unassign",
        json={"amount": "150.00", "idempotency_key": _key()},
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text
    summary = resp.json()["summary"]
    assert summary["buckets"][0]["balance"] == 250
    assert summary["unassigned_balance"] == 750
    _assert_invariant(client, auth_headers, account_id)


def test_insufficient_unassigned_funds(client, auth_headers, seeded):
    account_id = _account_id(seeded)
    bucket = _create_bucket(client, auth_headers, account_id)
    resp = client.post(
        f"{API}/buckets/{bucket['id']}/allocate",
        json={"amount": "5000.00", "idempotency_key": _key()},
        headers=auth_headers,
    )
    assert resp.status_code == 400
    assert "available to allocate" in resp.json()["detail"]


def test_insufficient_bucket_funds(client, auth_headers, seeded):
    account_id = _account_id(seeded)
    bucket = _create_bucket(client, auth_headers, account_id)
    client.post(
        f"{API}/buckets/{bucket['id']}/allocate",
        json={"amount": "100.00", "idempotency_key": _key()},
        headers=auth_headers,
    )
    resp = client.post(
        f"{API}/buckets/{bucket['id']}/unassign",
        json={"amount": "500.00", "idempotency_key": _key()},
        headers=auth_headers,
    )
    assert resp.status_code == 400
    assert "available" in resp.json()["detail"]


def test_negative_amount_rejected(client, auth_headers, seeded):
    account_id = _account_id(seeded)
    bucket = _create_bucket(client, auth_headers, account_id)
    resp = client.post(
        f"{API}/buckets/{bucket['id']}/allocate",
        json={"amount": "-10.00", "idempotency_key": _key()},
        headers=auth_headers,
    )
    assert resp.status_code == 400


def test_zero_amount_rejected(client, auth_headers, seeded):
    account_id = _account_id(seeded)
    bucket = _create_bucket(client, auth_headers, account_id)
    resp = client.post(
        f"{API}/buckets/{bucket['id']}/allocate",
        json={"amount": "0", "idempotency_key": _key()},
        headers=auth_headers,
    )
    assert resp.status_code == 400


def test_invalid_precision_rejected(client, auth_headers, seeded):
    account_id = _account_id(seeded)
    bucket = _create_bucket(client, auth_headers, account_id)
    resp = client.post(
        f"{API}/buckets/{bucket['id']}/allocate",
        json={"amount": "10.999", "idempotency_key": _key()},
        headers=auth_headers,
    )
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Authorization
# ---------------------------------------------------------------------------


def test_unauthorized_account_access(client, auth_headers, seeded):
    account_id = _account_id(seeded)
    other_headers = _second_user_headers(client)
    resp = client.get(f"{API}/accounts/{account_id}/buckets", headers=other_headers)
    assert resp.status_code == 404


def test_unauthorized_bucket_access(client, auth_headers, seeded):
    account_id = _account_id(seeded)
    bucket = _create_bucket(client, auth_headers, account_id)
    other_headers = _second_user_headers(client)
    resp = client.post(
        f"{API}/buckets/{bucket['id']}/allocate",
        json={"amount": "10.00", "idempotency_key": _key()},
        headers=other_headers,
    )
    assert resp.status_code == 404


def test_cross_account_transfer_prevented(client, auth_headers, seeded):
    account_id = _account_id(seeded)
    other_headers = _second_user_headers(client)
    other_account = client.post(
        f"{API}/accounts", json={"name": "Other Savings", "type": "savings", "current_balance": 500}, headers=other_headers
    ).json()

    mine = _create_bucket(client, auth_headers, account_id)
    theirs = _create_bucket(client, other_headers, other_account["id"], name="Theirs")

    # Can't even see the other user's bucket, so the cross-account attempt 404s before
    # it could ever reach the cross-account balance check.
    resp = client.post(
        f"{API}/bucket-transfers",
        json={
            "source_bucket_id": mine["id"],
            "destination_bucket_id": theirs["id"],
            "amount": "10.00",
            "idempotency_key": _key(),
        },
        headers=auth_headers,
    )
    assert resp.status_code == 404


def test_archived_bucket_cannot_receive_allocations(client, auth_headers, seeded):
    account_id = _account_id(seeded)
    bucket = _create_bucket(client, auth_headers, account_id)
    client.post(f"{API}/buckets/{bucket['id']}/archive", headers=auth_headers)
    resp = client.post(
        f"{API}/buckets/{bucket['id']}/allocate",
        json={"amount": "10.00", "idempotency_key": _key()},
        headers=auth_headers,
    )
    assert resp.status_code == 400
    assert "archived" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# Idempotency + concurrency
# ---------------------------------------------------------------------------


def test_duplicate_idempotency_key_is_not_applied_twice(client, auth_headers, seeded):
    account_id = _account_id(seeded)
    bucket = _create_bucket(client, auth_headers, account_id)
    key = _key()
    first = client.post(
        f"{API}/buckets/{bucket['id']}/allocate", json={"amount": "100.00", "idempotency_key": key}, headers=auth_headers
    )
    second = client.post(
        f"{API}/buckets/{bucket['id']}/allocate", json={"amount": "100.00", "idempotency_key": key}, headers=auth_headers
    )
    assert first.status_code == 200
    assert second.status_code == 200
    summary = _summary(client, auth_headers, account_id)
    assert summary["buckets"][0]["balance"] == 100  # not 200
    _assert_invariant(client, auth_headers, account_id)


def test_concurrent_allocations_do_not_overspend_unassigned(client, auth_headers, seeded):
    account_id = _account_id(seeded)  # starts with $1000 unassigned
    buckets = [_create_bucket(client, auth_headers, account_id, name=f"Goal {i}") for i in range(5)]

    results = []
    lock = threading.Lock()

    def worker(bucket):
        resp = client.post(
            f"{API}/buckets/{bucket['id']}/allocate",
            json={"amount": "300.00", "idempotency_key": _key()},
            headers=auth_headers,
        )
        with lock:
            results.append(resp.status_code)

    threads = [threading.Thread(target=worker, args=(b,)) for b in buckets]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    successes = results.count(200)
    # $1000 / $300 => at most 3 can succeed; never more than Unassigned allows.
    assert successes <= 3
    summary = _assert_invariant(client, auth_headers, account_id)
    assert summary["assigned_balance"] == successes * 300
    assert summary["unassigned_balance"] == 1000 - successes * 300


# ---------------------------------------------------------------------------
# Ledger projection + invariant
# ---------------------------------------------------------------------------


def test_ledger_records_every_mutation(client, auth_headers, seeded):
    account_id = _account_id(seeded)
    emergency = _create_bucket(client, auth_headers, account_id, name="Emergency Fund")
    vacation = _create_bucket(client, auth_headers, account_id, name="Vacation")
    client.post(
        f"{API}/buckets/{emergency['id']}/allocate", json={"amount": "500.00", "idempotency_key": _key()}, headers=auth_headers
    )
    client.post(
        f"{API}/bucket-transfers",
        json={
            "source_bucket_id": emergency["id"],
            "destination_bucket_id": vacation["id"],
            "amount": "100.00",
            "idempotency_key": _key(),
        },
        headers=auth_headers,
    )
    client.post(
        f"{API}/buckets/{vacation['id']}/unassign", json={"amount": "50.00", "idempotency_key": _key()}, headers=auth_headers
    )

    ledger = client.get(f"{API}/accounts/{account_id}/bucket-ledger", headers=auth_headers).json()
    event_types = [e["event_type"] for e in ledger]
    assert "allocate_to_bucket" in event_types
    assert "move_between_buckets" in event_types
    assert "unassign_from_bucket" in event_types


def test_ledger_projection_rebuild_matches_cached_balance(client, auth_headers, seeded):
    from app.db.session import SessionLocal
    from app.services.bucket_ledger import rebuild_bucket_balance

    account_id = _account_id(seeded)
    bucket = _create_bucket(client, auth_headers, account_id)
    client.post(
        f"{API}/buckets/{bucket['id']}/allocate", json={"amount": "300.00", "idempotency_key": _key()}, headers=auth_headers
    )
    client.post(
        f"{API}/buckets/{bucket['id']}/unassign", json={"amount": "80.00", "idempotency_key": _key()}, headers=auth_headers
    )

    db = SessionLocal()
    try:
        rebuilt = rebuild_bucket_balance(db, bucket["id"])
    finally:
        db.close()
    assert float(rebuilt) == 220.0


def test_balance_invariant_holds_after_full_lifecycle(client, auth_headers, seeded):
    account_id = _account_id(seeded)
    emergency = _create_bucket(client, auth_headers, account_id, name="Emergency Fund")
    vacation = _create_bucket(client, auth_headers, account_id, name="Vacation")

    client.post(
        f"{API}/buckets/{emergency['id']}/allocate", json={"amount": "600.00", "idempotency_key": _key()}, headers=auth_headers
    )
    _assert_invariant(client, auth_headers, account_id)
    client.post(
        f"{API}/bucket-transfers",
        json={
            "source_bucket_id": emergency["id"],
            "destination_bucket_id": vacation["id"],
            "amount": "200.00",
            "idempotency_key": _key(),
        },
        headers=auth_headers,
    )
    _assert_invariant(client, auth_headers, account_id)
    client.post(
        f"{API}/buckets/{vacation['id']}/unassign", json={"amount": "200.00", "idempotency_key": _key()}, headers=auth_headers
    )
    final = _assert_invariant(client, auth_headers, account_id)
    assert final["account_balance"] == 1000  # never touched by any bucket operation


# ---------------------------------------------------------------------------
# End-to-end flow (spec's 10-step scenario, exercised as one integration test —
# no browser/e2e runner is configured in this repo)
# ---------------------------------------------------------------------------


def test_end_to_end_bucket_lifecycle(client, auth_headers, seeded):
    account_id = _account_id(seeded)
    starting_balance = _summary(client, auth_headers, account_id)["account_balance"]

    emergency = _create_bucket(client, auth_headers, account_id, name="Emergency Fund")
    assert emergency["current_balance"] == 0

    alloc = client.post(
        f"{API}/buckets/{emergency['id']}/allocate", json={"amount": "400.00", "idempotency_key": _key()}, headers=auth_headers
    ).json()
    assert alloc["summary"]["buckets"][0]["balance"] == 400
    assert alloc["summary"]["unassigned_balance"] == starting_balance - 400

    vacation = _create_bucket(client, auth_headers, account_id, name="Vacation")

    client.post(
        f"{API}/bucket-transfers",
        json={
            "source_bucket_id": emergency["id"],
            "destination_bucket_id": vacation["id"],
            "amount": "150.00",
            "idempotency_key": _key(),
        },
        headers=auth_headers,
    )
    client.post(
        f"{API}/buckets/{vacation['id']}/unassign", json={"amount": "150.00", "idempotency_key": _key()}, headers=auth_headers
    )

    archive_resp = client.post(f"{API}/buckets/{vacation['id']}/archive", headers=auth_headers)
    assert archive_resp.status_code == 200
    assert archive_resp.json()["status"] == "archived"

    final = _summary(client, auth_headers, account_id)
    assert final["account_balance"] == starting_balance
    assert round(final["unassigned_balance"] + sum(b["balance"] for b in final["buckets"]), 2) == starting_balance
