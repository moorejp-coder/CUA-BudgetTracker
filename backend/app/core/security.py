import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _epoch(dt: datetime) -> float:
    # SQLite (unlike Postgres) returns naive datetimes even for tz-aware columns, and a
    # naive datetime's .timestamp() is interpreted in the *system's local* timezone, not
    # UTC — silently producing a wrong epoch offset by the host's UTC delta. Every value
    # stored via utcnow()/datetime.now(timezone.utc) is UTC in intent, so normalize before
    # converting rather than trusting whatever tzinfo (or lack of it) came back from the DB.
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.timestamp()


def fingerprint(value: str) -> str:
    """Short, non-reversible fingerprint of a UA string or IP — embedded in the token
    rather than the raw value so decoding a token (its payload is base64, not encrypted)
    doesn't hand over more than a comparable hash."""
    return hashlib.sha256((value or "").encode()).hexdigest()[:16]


def create_token(
    subject: str,
    token_type: Literal["access", "refresh"],
    password_changed_at: datetime,
    user_agent: str = "",
    ip: str = "",
) -> str:
    expire_minutes = (
        settings.ACCESS_TOKEN_EXPIRE_MINUTES
        if token_type == "access"
        else settings.REFRESH_TOKEN_EXPIRE_MINUTES
    )
    expire = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
    payload = {
        "sub": subject,
        "type": token_type,
        "exp": expire,
        "jti": str(uuid.uuid4()),
        # Password-version marker (see User.password_changed_at) — a token stays valid
        # only as long as no password change/reset has happened since it was issued.
        "pwts": _epoch(password_changed_at),
        # Session-binding fingerprints, checked on every use (see session_binding_status)
        # — a User-Agent change mid-session is a strong hijack signal (browsers don't
        # normally change UA between requests) so it hard-invalidates; an IP change is
        # common for legitimate users (mobile networks, VPNs, roaming) so it's only
        # flagged, not rejected on its own.
        "ua": fingerprint(user_agent),
        "ip": fingerprint(ip),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def session_binding_status(payload: dict, user_agent: str, ip: str) -> tuple[bool, bool]:
    """Returns (user_agent_matches, ip_matches) comparing the current request's
    fingerprints against what was embedded in the token at issuance."""
    ua_ok = payload.get("ua") == fingerprint(user_agent)
    ip_ok = payload.get("ip") == fingerprint(ip)
    return ua_ok, ip_ok


def token_matches_current_password(payload: dict, password_changed_at: datetime) -> bool:
    """False if `password_changed_at` is newer than what the token was issued against —
    i.e. a password change/reset has happened since, so every token issued before that
    moment (this one included) must stop working."""
    token_ts = payload.get("pwts")
    if token_ts is None:
        return False
    # Exact comparison, no slack: a token issued in the same request that set
    # password_changed_at carries that exact value (see _issue_session), so equality
    # means "still current" — any later reset strictly increases the stored value, and a
    # slack window here would just be a window where a just-invalidated token still works.
    return float(token_ts) >= _epoch(password_changed_at)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None
