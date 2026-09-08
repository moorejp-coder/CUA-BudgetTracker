"""ASGI middleware that guards every mutating API request against four abuse patterns:

1. Cross-origin origin spoofing — the browser sets the Origin header (falling back to
   Referer for the rare client that omits it) and neither can be forged by page JavaScript,
   unlike a request body or a custom header a naive attacker page might try to replay. A
   mutating request whose Origin/Referer isn't this app's own frontend is rejected before
   the CSRF-cookie check even runs, so this also covers browsers/proxies that (mis)handle
   SameSite cookies in a way the CSRF check alone wouldn't catch.
2. Cross-site request forgery — session cookies are httpOnly, so this double-submits a
   companion csrf_token cookie (readable by JS, set alongside the auth cookies) against an
   X-CSRF-Token header the frontend must echo back. A cross-site attacker page can trigger
   the browser to send the cookie automatically but can't read its value to put in the
   header, so a mismatch means the request didn't originate from this app's own frontend.
3. Attack-shaped input — string values containing SQL-injection or script-injection
   signatures, or absurdly long strings, are logged and rejected with a 400 before the
   request ever reaches route/schema validation.
4. A honeypot field — HONEYPOT_FIELD is never rendered for real users (see the frontend
   registration form) but a bot that blindly fills every input will populate it; any
   non-empty value there gets the request rejected.

Blanket request-volume limiting (the "more than N writes per minute" kind of guard) used
to live here too, as a flat 10/min-per-endpoint cap. It's been superseded by
RateLimitMiddleware (see app/core/rate_limit.py), which applies the app's documented
per-category limits (auth/read/write/upload) uniformly and returns a Retry-After header —
this module no longer duplicates that.

Runs before FastAPI's own request parsing, so it protects every endpoint uniformly rather
than requiring each schema to opt in.
"""
import hmac
import json
import logging
import re
from urllib.parse import urlsplit

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
    # just a log line; RateLimitMiddleware's write-category limit still caps abuse.
    "/api/v1/client-errors",
}

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


def _origin_ok(request: Request) -> bool:
    """Origin can't be read or set by an attacker's cross-site page — the browser attaches
    it itself, so this is one of the few signals a CSRF attempt genuinely cannot fake.
    Referer is the fallback for the rare legitimate client that omits Origin; if neither
    header is present we fail closed, since every browser sends at least one on a
    credentialed fetch/XHR to a mutating endpoint — a request with both missing is not a
    case this app's own frontend produces.

    Checked against CORS_ORIGINS — the same allowlist CORSMiddleware already trusts. Even
    when the frontend and API share an origin behind a reverse proxy in production (see
    cookies.py), browsers still attach Origin on same-origin, non-GET fetch/XHR requests,
    so CORS_ORIGINS must include that public origin for this check to pass — it is not
    solely a cross-origin-dev setting once this check is in place. Deliberately NOT derived
    from the request's own scheme/host: behind nginx, Uvicorn sees the proxy's plain-HTTP
    internal connection rather than the browser's real (likely HTTPS) origin, so a
    self-computed fallback would be wrong in exactly the deployment this app ships with."""
    origin = request.headers.get("origin")
    if not origin:
        referer = request.headers.get("referer")
        if not referer:
            return False
        parsed = urlsplit(referer)
        if not parsed.scheme or not parsed.netloc:
            return False
        origin = f"{parsed.scheme}://{parsed.netloc}"
    return origin in get_settings().CORS_ORIGINS


def _csrf_ok(request: Request) -> bool:
    if request.url.path in _CSRF_EXEMPT_PATHS:
        return True
    cookie_value = request.cookies.get(CSRF_COOKIE)
    header_value = request.headers.get(CSRF_HEADER)
    if not cookie_value or not header_value:
        return False
    return hmac.compare_digest(cookie_value, header_value)


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

        if not _origin_ok(request):
            logger.warning(
                "origin/referer check failed: caller=%s path=%s origin=%s referer=%s",
                key, path, request.headers.get("origin"), request.headers.get("referer"),
            )
            return JSONResponse(status_code=403, content={"detail": "Request origin not allowed."})

        if not _csrf_ok(request):
            logger.warning("csrf check failed: caller=%s path=%s", key, path)
            return JSONResponse(status_code=403, content={"detail": "CSRF token missing or invalid."})

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
