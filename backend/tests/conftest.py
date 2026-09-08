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
os.environ["ABUSE_RATE_LIMIT_ENABLED"] = "false"  # tests make many legit requests from one IP

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.core.config import get_settings  # noqa: E402
from app.core.cookies import CSRF_COOKIE  # noqa: E402
from app.main import app  # noqa: E402

API = "/api/v1"


@pytest.fixture(scope="session", autouse=True)
def _cleanup_db():
    yield
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)


@pytest.fixture()
def client():
    # Function-scoped (not session-scoped) on purpose: auth is now cookie-based, and a
    # TestClient's cookie jar is where the session lives — sharing one jar across tests
    # would leak one test's login into another's requests. The DB itself still persists
    # across the whole run (see _cleanup_db above); only the client/cookie-jar is fresh
    # per test, matching how a real browser isolates one user's session from another's.
    with TestClient(app) as c:
        # A real browser always attaches Origin on a credentialed fetch/XHR; TestClient
        # doesn't, so set one here to match AbuseProtectionMiddleware's origin check
        # instead of stamping it onto every individual request in every test.
        c.headers["Origin"] = get_settings().CORS_ORIGINS[0]
        yield c


@pytest.fixture()
def client2():
    """A second, independent cookie jar — for tests that need two users logged in
    simultaneously (e.g. cross-account authorization checks). One TestClient can only
    hold one active session at a time now that auth lives in cookies rather than a
    per-request Authorization header, so those tests need a second browser-equivalent."""
    with TestClient(app) as c:
        c.headers["Origin"] = get_settings().CORS_ORIGINS[0]
        yield c


@pytest.fixture()
def auth_headers(client):
    """A fresh user per test so transaction/category data never leaks across tests.
    Registering logs the client's cookie jar in (httpOnly access/refresh cookies plus a
    JS-readable csrf_token cookie) — mutating requests also need the CSRF header, which is
    what this fixture returns for use as `headers=auth_headers` at call sites."""
    email = f"user-{uuid.uuid4().hex[:10]}@example.com"
    client.post(f"{API}/auth/register", json={"email": email, "password": "testpass123"})
    csrf = client.cookies.get(CSRF_COOKIE)
    return {"X-CSRF-Token": csrf} if csrf else {}


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
