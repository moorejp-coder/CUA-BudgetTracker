"""ASGI middleware that guards every mutating API request against four abuse patterns:

1. Cross-site request forgery — session cookies are httpOnly, so this double-submits a
   companion csrf_token cookie (readable by JS, set alongside the auth cookies) against an
   X-CSRF-Token header the frontend must echo back. A cross-site attacker page can trigger
   the browser to send the cookie automatically but can't read its value to put in the
   header, so a mismatch means the request didn't originate from this app's own frontend.
2. Submission flooding — more than SUBMIT_MAX writes to the same endpoint from the same
   caller (user if authenticated, else IP) within SUBMIT_WINDOW_SECONDS get a 429.
3. Attack-shaped input — string values containing SQL-injection or script-injection
   signatures, or absurdly long strings, are logged and rejected with a 400 before the
   request ever reaches route/schema validation.
4. A honeypot field — HONEYPOT_FIELD is never rendered for real users (see the frontend
   registration form) but a bot that blindly fills every input will populate it; any
   non-empty value there gets the request rejected.

Runs before FastAPI's own request parsing, so it protects every endpoint uniformly rather
than requiring each schema to opt in.
"""
import hmac
import json
import logging
import re
import time
from collections import defaultdict, deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.config import get_settings
from app.core.cookies import CSRF_COOKIE, get_access_token
from app.core.security import decode_token

logger = logging.getLogger("security")

_MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
_BODY_METHODS = {"POST", "PUT", "PATCH"}
_API_PREFIX = "/api/v1"
CSRF_HEADER = "x-csrf-token"
# No session cookie exists yet when hitting these — they establish one (or, for password
# reset, run entirely without one). Everything else that mutates state runs after login
# and must prove it holds the CSRF cookie's value.
_CSRF_EXEMPT_PATHS = {
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/forgot-password",
    "/api/v1/auth/reset-password",
    "/api/v1/auth/validate-reset-token",
    # A crash can happen before login (e.g. on the login page itself), when there's no
    # CSRF cookie yet to check against — and a forged report here has no state to protect,
    # just a log line; the existing submission-flood limit still caps abuse.
    "/api/v1/client-errors",
}

SUBMIT_WINDOW_SECONDS = 60
SUBMIT_MAX = 10
_submit_attempts: dict[str, deque[float]] = defaultdict(deque)

# Independent of any per-field schema limit — a blanket ceiling so a field with no (or a
# generous) max_length still can't be used to smuggle a multi-megabyte string.
_MAX_STRING_LENGTH = 20_000
_MAX_SCAN_DEPTH = 6
_MAX_LIST_ITEMS_SCANNED = 200

# Hidden form field: never sent by the real frontend forms, only ever set by a bot that
# fills every input it finds in the DOM. Chosen to look like a plausible real field (so a
# bot's heuristics don't skip it) rather than something obviously named "honeypot".
HONEYPOT_FIELD = "website"

_SQLI_PATTERNS = [
    re.compile(p, re.IGNORECASE)
    for p in [
        r"\bunion\s+select\b",
        r"\bdrop\s+table\b",
        r"\bdrop\s+database\b",
        r"\binsert\s+into\s+\w+\s*\(",
        r"\bdelete\s+from\s+\w+",
        r"\bxp_cmdshell\b",
        r"'\s*or\s+'?1'?\s*=\s*'?1",
        r"\bor\s+1\s*=\s*1\b",
        r";\s*drop\s+table\b",
    ]
]
_XSS_PATTERNS = [
    re.compile(p, re.IGNORECASE)
    for p in [
        r"<script\b",
        r"javascript:",
        r"on(?:error|load|click|mouseover|focus)\s*=\s*[\"']",
        r"<iframe\b",
        r"<img\b[^>]*\bonerror\b",
    ]
]


def _client_key(request: Request) -> str:
    """Authenticated caller -> their user id; otherwise the source IP."""
    token = get_access_token(request)
    if token:
        payload = decode_token(token)
        if payload and payload.get("type") == "access" and payload.get("sub"):
            return f"user:{payload['sub']}"
    ip = request.client.host if request.client else "unknown"
    return f"ip:{ip}"


def _csrf_ok(request: Request) -> bool:
    if request.url.path in _CSRF_EXEMPT_PATHS:
        return True
    cookie_value = request.cookies.get(CSRF_COOKIE)
    header_value = request.headers.get(CSRF_HEADER)
    if not cookie_value or not header_value:
        return False
    return hmac.compare_digest(cookie_value, header_value)


def _check_submit_rate(key: str, path: str) -> bool:
    bucket = _submit_attempts[f"{key}:{path}"]
    now = time.time()
    while bucket and now - bucket[0] > SUBMIT_WINDOW_SECONDS:
        bucket.popleft()
    if len(bucket) >= SUBMIT_MAX:
        return False
    bucket.append(now)
    return True


def _scan(value, path: str = "body", depth: int = 0):
    """Yields (field_path, reason) for the first suspicious string found under `value`."""
    if depth > _MAX_SCAN_DEPTH:
        return
    if isinstance(value, str):
        if len(value) > _MAX_STRING_LENGTH:
            yield path, "excessively long value"
            return
        for pat in _SQLI_PATTERNS:
            if pat.search(value):
                yield path, "sql-injection-like pattern"
                return
        for pat in _XSS_PATTERNS:
            if pat.search(value):
                yield path, "script-injection-like pattern"
                return
    elif isinstance(value, dict):
        for k, v in value.items():
            yield from _scan(v, f"{path}.{k}", depth + 1)
    elif isinstance(value, list):
        for i, v in enumerate(value[:_MAX_LIST_ITEMS_SCANNED]):
            yield from _scan(v, f"{path}[{i}]", depth + 1)


class AbuseProtectionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if request.method not in _MUTATING_METHODS or not path.startswith(_API_PREFIX):
            return await call_next(request)

        key = _client_key(request)

        if not _csrf_ok(request):
            logger.warning("csrf check failed: caller=%s path=%s", key, path)
            return JSONResponse(status_code=403, content={"detail": "CSRF token missing or invalid."})

        if get_settings().ABUSE_RATE_LIMIT_ENABLED and not _check_submit_rate(key, path):
            logger.warning("submission rate limit exceeded: caller=%s path=%s", key, path)
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many submissions — please slow down and try again in a minute."},
            )

        if request.method in _BODY_METHODS:
            body = await request.body()
            if body:
                try:
                    data = json.loads(body)
                except ValueError:
                    data = None  # non-JSON body (e.g. multipart file upload) — nothing to scan
                if isinstance(data, dict):
                    if str(data.get(HONEYPOT_FIELD) or "").strip():
                        logger.warning("honeypot field filled: caller=%s path=%s", key, path)
                        return JSONResponse(status_code=400, content={"detail": "Invalid submission."})

                    hit = next(_scan(data), None)
                    if hit:
                        field, reason = hit
                        logger.warning(
                            "attack-shaped input rejected: caller=%s path=%s field=%s reason=%s",
                            key, path, field, reason,
                        )
                        return JSONResponse(
                            status_code=400, content={"detail": "Input contains disallowed content."}
                        )

        return await call_next(request)
