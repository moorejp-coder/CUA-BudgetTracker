"""Test config MUST set env vars before any `app.*` import — settings are cached with
lru_cache on first access, and several modules read them at import time."""
import os
import tempfile
import uuid

TEST_DB_PATH = os.path.join(
    tempfile.gettempdir(), f"budget_tracker_test_{os.getpid()}_{uuid.uuid4().hex[:8]}.db"
)

os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"
os.environ["LLM_ENABLED"] = "false"  # tests exercise the deterministic fallback path by default
os.environ["SCHEDULER_ENABLED"] = "false"  # never want background jobs firing during tests
os.environ["SECRET_KEY"] = "test-secret-not-for-production"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

API = "/api/v1"


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)


@pytest.fixture()
def auth_headers(client):
    """A fresh user per test so transaction/category data never leaks across tests."""
    email = f"user-{uuid.uuid4().hex[:10]}@example.com"
    client.post(f"{API}/auth/register", json={"email": email, "password": "testpass123"})
    resp = client.post(f"{API}/auth/login", json={"email": email, "password": "testpass123"})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def seeded(client, auth_headers):
    """A user with one checking account, one expense category, and one income category."""
    account = client.post(
        f"{API}/accounts", json={"name": "Checking", "type": "checking", "current_balance": 1000}, headers=auth_headers
    ).json()
    expense_category = client.post(
        f"{API}/categories", json={"name": "Groceries", "type": "expense", "color": "#f87171"}, headers=auth_headers
    ).json()
    income_category = client.post(
        f"{API}/categories", json={"name": "Salary", "type": "income", "color": "#34d399"}, headers=auth_headers
    ).json()
    return {"account": account, "expense_category": expense_category, "income_category": income_category}
