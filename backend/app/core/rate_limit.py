"""Minimal in-memory sliding-window rate limiter.

Not a substitute for a shared limiter (e.g. Redis-backed) behind multiple app
processes/instances, but it stops naive single-process brute-force / credential
stuffing and caps blanket request volume without adding a new dependency.

Two independent things live in this module:

1. `check_rate_limit` — a general failed-attempt counter used directly by auth.py for
   brute-force-specific guards (credential stuffing against /auth/login, duplicate-email
   probing against /auth/register, password-reset abuse). These only consume budget on
   a *failed* attempt in most call sites, so a legitimate user is never locked out just
   for logging in a lot — only guessing is capped.
2. `RateLimitMiddleware` — a blanket, category-based cap on raw request *volume*
   (regardless of success/failure) applied uniformly across the whole API surface, per
   the standard tiers: auth endpoints per-IP, everything else per-user (falling back to
   per-IP when unauthenticated). This is a different axis of protection from (1) — it
   also caps a fully-authenticated user hammering read endpoints, which (1) never does.
"""
import math
import time
from collections import defaultdict, deque
from dataclasses import dataclass

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.config import get_settings
from app.core.cookies import get_access_token
from app.core.security import decode_token

_WINDOW_SECONDS = 15 * 60
_MAX_ATTEMPTS = 10

_attempts: dict[str, deque[float]] = defaultdict(deque)


def check_rate_limit(
    key: str,
    max_attempts: int = _MAX_ATTEMPTS,
    window_seconds: int = _WINDOW_SECONDS,
    record: bool = True,
) -> bool:
    """Returns False if `key` has already hit `max_attempts` within the window.

    When `record` is True (the default) this call itself also counts as an attempt.
    Pass `record=False` to only check the current count without consuming budget —
    useful for checking the limit before knowing whether an attempt will "count"
    (e.g. only failed logins should consume budget).
    """
    now = time.time()
    bucket = _attempts[key]
    while bucket and now - bucket[0] > window_seconds:
        bucket.popleft()
    if len(bucket) >= max_attempts:
        return False
    if record:
        bucket.append(now)
    return True


# ---------------------------------------------------------------------------
# Blanket per-category request-volume limiter (RateLimitMiddleware)
# ---------------------------------------------------------------------------

_API_PREFIX = "/api/v1"

# Every request that reaches the app-wide login/signup/password-reset surface — tight and
# per-IP, since no session exists yet to key on and this is the highest-value target for
# both credential stuffing and account-enumeration/token-guessing.
_AUTH_RATE_LIMITED_PATHS = {
    "/api/v1/auth/register",
    "/api/v1/auth/login",
    "/api/v1/auth/forgot-password",
    "/api/v1/auth/reset-password",
    "/api/v1/auth/validate-reset-token",
}

# The only endpoint in the app that accepts a file (see csv_imports.py) — capped tighter
# than a generic write since parsing an upload is comparatively expensive.
_UPLOAD_PATHS = {
    "/api/v1/csv-imports/preview",
}


@dataclass(frozen=True)
class _Limit:
    max_requests: int
    window_seconds: int


AUTH_LIMIT = _Limit(10, 60)
READ_LIMIT = _Limit(100, 60)
WRITE_LIMIT = _Limit(30, 60)
UPLOAD_LIMIT = _Limit(10, 60)

_buckets: dict[str, deque[float]] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _caller_id(request: Request) -> str:
    """Authenticated caller -> their user id; otherwise the source IP. Mirrors
    AbuseProtectionMiddleware's own caller-identification so the same visitor is keyed
    the same way by both middlewares."""
    token = get_access_token(request)
    if token:
        payload = decode_token(token)
        if payload and payload.get("type") == "access" and payload.get("sub"):
            return f"user:{payload['sub']}"
    return f"ip:{_client_ip(request)}"


def _classify(request: Request) -> tuple[str, _Limit] | None:
    """Returns (bucket_key, limit) for a request that should be rate limited, or None for
    anything outside the versioned API surface (docs, health check, ...)."""
    path = request.url.path
    if not path.startswith(_API_PREFIX):
        return None
    method = request.method

    if method == "POST" and path in _AUTH_RATE_LIMITED_PATHS:
        # Per-IP, not per-path: hitting login and register alternately from one IP still
        # shares one budget, since both are the same "guessing against auth" risk.
        return f"auth:{_client_ip(request)}", AUTH_LIMIT
    if path in _UPLOAD_PATHS:
        return f"upload:{_caller_id(request)}", UPLOAD_LIMIT
    if method in ("GET", "HEAD"):
        return f"read:{_caller_id(request)}", READ_LIMIT
    return f"write:{_caller_id(request)}", WRITE_LIMIT


def _check(key: str, limit: _Limit) -> tuple[bool, int]:
    """Returns (allowed, retry_after_seconds). retry_after is only meaningful when not
    allowed — it's how long until the oldest request in the window ages out."""
    now = time.time()
    bucket = _buckets[key]
    while bucket and now - bucket[0] > limit.window_seconds:
        bucket.popleft()
    if len(bucket) >= limit.max_requests:
        retry_after = math.ceil(limit.window_seconds - (now - bucket[0]))
        return False, max(retry_after, 1)
    bucket.append(now)
    return True, 0


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Off by default under pytest (the suite makes many legitimate rapid-fire requests
        # from one process/IP), on by default everywhere else — see ABUSE_RATE_LIMIT_ENABLED
        # in config.py.
        if not get_settings().ABUSE_RATE_LIMIT_ENABLED:
            return await call_next(request)

        classified = _classify(request)
        if classified is None:
            return await call_next(request)

        key, limit = classified
        allowed, retry_after = _check(key, limit)
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please try again later."},
                headers={"Retry-After": str(retry_after)},
            )
        return await call_next(request)
