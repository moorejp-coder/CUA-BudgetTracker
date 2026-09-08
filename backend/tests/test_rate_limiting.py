"""RateLimitMiddleware's per-category request-volume caps (app/core/rate_limit.py):
auth endpoints per-IP, read/write/upload endpoints per-user. Disabled by default under
pytest (ABUSE_RATE_LIMIT_ENABLED=false, see conftest.py) since the rest of the suite makes
many legitimate rapid-fire requests from one process/IP — these tests flip it on for their
own duration only, and reset the in-memory buckets so no other test's traffic bleeds in."""
import uuid

import pytest

from app.core import rate_limit as rl
from app.core.config import get_settings
from app.core.cookies import CSRF_COOKIE
from tests.conftest import API


@pytest.fixture()
def rate_limiting_enabled():
    settings = get_settings()
    original = settings.ABUSE_RATE_LIMIT_ENABLED
    settings.ABUSE_RATE_LIMIT_ENABLED = True
    rl._buckets.clear()
    try:
        yield
    finally:
        settings.ABUSE_RATE_LIMIT_ENABLED = original
        rl._buckets.clear()


def test_auth_endpoint_rate_limited_per_ip(client, rate_limiting_enabled):
    for i in range(rl.AUTH_LIMIT.max_requests):
        resp = client.post(f"{API}/auth/forgot-password", json={"email": f"user{i}@example.com"})
        assert resp.status_code == 204

    resp = client.post(f"{API}/auth/forgot-password", json={"email": "one-too-many@example.com"})
    assert resp.status_code == 429
    assert int(resp.headers["Retry-After"]) > 0


def test_read_endpoint_rate_limited_per_user(client, auth_headers, rate_limiting_enabled):
    for _ in range(rl.READ_LIMIT.max_requests):
        resp = client.get(f"{API}/categories", headers=auth_headers)
        assert resp.status_code == 200

    resp = client.get(f"{API}/categories", headers=auth_headers)
    assert resp.status_code == 429
    assert int(resp.headers["Retry-After"]) > 0


def test_write_endpoint_rate_limited_per_user(client, auth_headers, rate_limiting_enabled):
    for i in range(rl.WRITE_LIMIT.max_requests):
        resp = client.post(
            f"{API}/categories",
            json={"name": f"Cat {i}", "type": "expense", "color": "#f87171"},
            headers=auth_headers,
        )
        assert resp.status_code == 201, resp.text

    resp = client.post(
        f"{API}/categories",
        json={"name": "One too many", "type": "expense", "color": "#f87171"},
        headers=auth_headers,
    )
    assert resp.status_code == 429
    assert int(resp.headers["Retry-After"]) > 0


def test_upload_endpoint_rate_limited_per_user(client, auth_headers, rate_limiting_enabled):
    csv_bytes = b"date,amount,description\n2026-01-01,10.00,Coffee\n"

    for _ in range(rl.UPLOAD_LIMIT.max_requests):
        resp = client.post(
            f"{API}/csv-imports/preview",
            files={"file": ("transactions.csv", csv_bytes, "text/csv")},
            headers=auth_headers,
        )
        assert resp.status_code == 200, resp.text

    resp = client.post(
        f"{API}/csv-imports/preview",
        files={"file": ("transactions.csv", csv_bytes, "text/csv")},
        headers=auth_headers,
    )
    assert resp.status_code == 429
    assert int(resp.headers["Retry-After"]) > 0


def test_different_users_get_independent_write_budgets(client, client2, auth_headers, rate_limiting_enabled):
    """The write limit is keyed per-user, not globally — one user maxing out their budget
    must not affect another user's ability to write."""
    for i in range(rl.WRITE_LIMIT.max_requests):
        resp = client.post(
            f"{API}/categories",
            json={"name": f"Cat {i}", "type": "expense", "color": "#f87171"},
            headers=auth_headers,
        )
        assert resp.status_code == 201

    assert (
        client.post(
            f"{API}/categories",
            json={"name": "Over budget", "type": "expense", "color": "#f87171"},
            headers=auth_headers,
        ).status_code
        == 429
    )

    email = f"other-{uuid.uuid4().hex[:10]}@example.com"
    client2.post(f"{API}/auth/register", json={"email": email, "password": "testpass123"})
    csrf2 = client2.cookies.get(CSRF_COOKIE)
    headers2 = {"X-CSRF-Token": csrf2} if csrf2 else {}

    resp = client2.post(
        f"{API}/categories",
        json={"name": "Fresh budget", "type": "expense", "color": "#34d399"},
        headers=headers2,
    )
    assert resp.status_code == 201, resp.text
