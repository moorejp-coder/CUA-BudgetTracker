"""httpOnly-cookie session storage: access/refresh tokens never appear in a JSON response
body (so page JavaScript — and thus a future XSS bug — can't read them at all), and are
never sent by the frontend as a header, only as browser-managed cookies.

Both the frontend dev proxy (vite) and the production reverse proxy (nginx) put the API
under the same origin as the app itself, so these cookies are always first-party — no
cross-site cookie complications, and SameSite=Lax already blocks a cross-site POST from
carrying them. The X-CSRF-Token / csrf_token cookie pair (see AbuseProtectionMiddleware)
is defense-in-depth on top of that.
"""
import secrets

from fastapi import Request, Response

from app.core.config import get_settings

ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"
CSRF_COOKIE = "csrf_token"

_AUTH_PATH = "/api/v1"
# Narrower scope for the refresh token: only sent to the couple of endpoints that need
# it, not on every API call, so a request-logging bug elsewhere has less to expose.
_REFRESH_PATH = "/api/v1/auth"


def _secure() -> bool:
    # Secure-by-default: only the well-known local-dev value opts OUT of the Secure flag
    # (browsers require HTTPS to accept a Secure cookie at all, and local dev is plain
    # HTTP). Checking "== production" instead would silently ship insecure cookies if a
    # deployment ever forgot to set ENV, or set it to anything other than the exact
    # string "production" (a typo, "staging", etc.) — this way that mistake fails closed.
    return get_settings().ENV != "development"


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    secure = _secure()
    settings = get_settings()
    access_max_age = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    refresh_max_age = settings.REFRESH_TOKEN_EXPIRE_MINUTES * 60
    # Without max_age these would be session cookies (gone as soon as the browser closes),
    # which is more restrictive than the token itself — match each cookie's lifetime to
    # its JWT's actual expiry so "stay logged in" behaves the same as it did with
    # localStorage. The JWT's own exp claim is still what's actually enforced server-side;
    # this only controls how long the browser bothers holding onto the cookie.
    response.set_cookie(
        ACCESS_COOKIE, access_token, httponly=True, secure=secure, samesite="lax",
        path=_AUTH_PATH, max_age=access_max_age,
    )
    response.set_cookie(
        REFRESH_COOKIE, refresh_token, httponly=True, secure=secure, samesite="lax",
        path=_REFRESH_PATH, max_age=refresh_max_age,
    )
    # Readable by JS on purpose — this is the CSRF double-submit token, not a credential.
    # Path="/" (not _AUTH_PATH): a cookie's path controls both which *requests* carry it
    # AND which *page* can read it via document.cookie — the SPA's pages live under "/",
    # not "/api/v1", so scoping this to the API path would make it invisible to the very
    # frontend code that needs to read it and echo it back as a header.
    response.set_cookie(
        CSRF_COOKIE, secrets.token_urlsafe(32), httponly=False, secure=secure, samesite="lax",
        path="/", max_age=refresh_max_age,
    )


def clear_auth_cookies(response: Response) -> None:
    secure = _secure()
    response.delete_cookie(ACCESS_COOKIE, path=_AUTH_PATH, samesite="lax", secure=secure)
    response.delete_cookie(REFRESH_COOKIE, path=_REFRESH_PATH, samesite="lax", secure=secure)
    response.delete_cookie(CSRF_COOKIE, path="/", samesite="lax", secure=secure)


def get_access_token(request: Request) -> str | None:
    return request.cookies.get(ACCESS_COOKIE)


def get_refresh_token(request: Request) -> str | None:
    return request.cookies.get(REFRESH_COOKIE)
