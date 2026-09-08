import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.cookies import clear_auth_cookies, get_access_token, get_refresh_token, set_auth_cookies
from app.core.rate_limit import check_rate_limit
from app.core.security import (
    create_token,
    decode_token,
    hash_password,
    session_binding_status,
    token_matches_current_password,
    verify_password,
)
from app.db.session import get_db
from app.models.password_reset_token import PasswordResetToken
from app.models.revoked_token import RevokedToken
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    UserOut,
    ValidateResetTokenRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger("app.auth")

RESET_TOKEN_TTL_MINUTES = 30

# Applies to every endpoint that sets/changes a password (signup, reset, change) — a
# tighter, dedicated window on top of whatever endpoint-specific limit already exists, so
# password-guessing/spam against the password itself is capped independent of those.
PASSWORD_ATTEMPT_MAX = 5
PASSWORD_ATTEMPT_WINDOW_SECONDS = 60


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _check_password_attempt_rate(key: str) -> bool:
    # Reuses the same test-only kill switch as the submission-flood guard — every
    # attempt (not just failures) counts against this one, unlike the login/duplicate-email
    # limiters below, so a test suite making dozens of legitimate signups from one IP would
    # otherwise trip it in seconds. Full protection stays on any time this isn't explicitly
    # disabled, i.e. always in production.
    if not get_settings().ABUSE_RATE_LIMIT_ENABLED:
        return True
    return check_rate_limit(key, max_attempts=PASSWORD_ATTEMPT_MAX, window_seconds=PASSWORD_ATTEMPT_WINDOW_SECONDS)


def _purge_expired_revocations(db: Session) -> None:
    db.query(RevokedToken).filter(RevokedToken.expires_at < datetime.now(timezone.utc)).delete()


def _revoke(db: Session, data: dict) -> None:
    """Adds a decoded token's jti to the denylist, if not already there."""
    jti = data.get("jti")
    if not jti:
        return
    if not db.get(RevokedToken, jti):
        exp = datetime.fromtimestamp(data["exp"], tz=timezone.utc)
        db.add(RevokedToken(jti=jti, user_id=data.get("sub"), expires_at=exp))


def _issue_session(response: Response, user: User, request: Request) -> None:
    ua = request.headers.get("user-agent", "")
    ip = _client_ip(request)
    access = create_token(user.id, "access", user.password_changed_at, user_agent=ua, ip=ip)
    refresh = create_token(user.id, "refresh", user.password_changed_at, user_agent=ua, ip=ip)
    set_auth_cookies(response, access, refresh)


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    if not _check_password_attempt_rate(f"pw-attempt-ip:{_client_ip(request)}"):
        raise HTTPException(status_code=429, detail="Too many attempts, please try again in a minute")
    if db.query(User).filter(User.email == payload.email).first():
        # Only count failed registration attempts (duplicate-email probing) against the
        # limit — legitimate signups from a shared IP (office/NAT) must never be throttled.
        if not check_rate_limit(f"register-fail:{_client_ip(request)}"):
            raise HTTPException(status_code=429, detail="Too many attempts, please try again later")
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        display_name=payload.display_name or payload.email.split("@")[0],
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    _issue_session(response, user, request)
    return user


@router.post("/login", response_model=UserOut)
def login(payload: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    # Only failed attempts consume the budget, so legitimate users on a shared IP (or a
    # user who simply logs in often) are never locked out — only credential-guessing is.
    ip_key = f"login-fail-ip:{_client_ip(request)}"
    email_key = f"login-fail-email:{payload.email.lower()}"
    if not check_rate_limit(ip_key, record=False) or not check_rate_limit(email_key, record=False):
        raise HTTPException(status_code=429, detail="Too many login attempts, please try again later")

    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        check_rate_limit(ip_key)
        check_rate_limit(email_key)
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    _issue_session(response, user, request)
    return user


@router.post("/refresh", status_code=status.HTTP_204_NO_CONTENT)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    raw = get_refresh_token(request)
    data = decode_token(raw) if raw else None
    if not data or data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    jti = data.get("jti")
    if jti and db.get(RevokedToken, jti):
        # Reuse of an already-rotated refresh token is the classic signal of a stolen
        # token racing the legitimate user — reject rather than silently issuing more.
        raise HTTPException(status_code=401, detail="Refresh token has been revoked")
    user = db.get(User, data.get("sub"))
    if not user:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if not token_matches_current_password(data, user.password_changed_at):
        # A password reset/change happened since this refresh token was issued — it must
        # not be able to keep minting fresh sessions after that.
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    ua_ok, ip_ok = session_binding_status(data, request.headers.get("user-agent", ""), _client_ip(request))
    if not ua_ok:
        logger.warning("refresh rejected: session binding failed (user-agent changed) user=%s jti=%s", user.id, jti)
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if not ip_ok:
        logger.warning("refresh: session IP changed user=%s jti=%s ip=%s", user.id, jti, _client_ip(request))

    # Rotate: this refresh token is single-use — revoke it immediately so it can't be
    # replayed, and hand back a fresh pair. A leaked-but-unused token is now only valid
    # until whichever of "next legitimate refresh" or expiry comes first, not for its
    # full lifetime regardless of use.
    _revoke(db, data)
    _purge_expired_revocations(db)
    db.commit()

    _issue_session(response, user, request)
    return None


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    """Revokes both the access and refresh token cookies server-side (not just clearing
    them from the browser) — so logout ends the session immediately. get_current_user
    checks the same denylist on every authenticated request, so a revoked access token
    stops working on its very next use, not merely on its next renewal."""
    refresh_raw = get_refresh_token(request)
    if refresh_raw:
        data = decode_token(refresh_raw)
        if data and data.get("type") == "refresh":
            _revoke(db, data)

    access_raw = get_access_token(request)
    if access_raw:
        data = decode_token(access_raw)
        if data and data.get("type") == "access":
            _revoke(db, data)

    _purge_expired_revocations(db)
    db.commit()
    clear_auth_cookies(response)
    # Always succeed regardless of cookie validity — logout is idempotent and should
    # never leak whether a given token was valid.
    return None


def _hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


@router.post("/forgot-password", status_code=status.HTTP_204_NO_CONTENT)
def forgot_password(payload: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    """No email infrastructure exists in this app, so the reset link is logged server-side
    rather than sent — an operator running this self-hosted instance can retrieve it from
    their own logs. Wire up real email delivery before relying on this for a deployment
    where a user can't just ask the operator to read the log line for them.

    Always responds 204 regardless of whether the email is registered or was rate-limited,
    so this endpoint can't be used to enumerate which emails have accounts."""
    ip_key = f"forgot-pw-ip:{_client_ip(request)}"
    email_key = f"forgot-pw-email:{payload.email.lower()}"
    if not check_rate_limit(ip_key) or not check_rate_limit(email_key):
        return None

    user = db.query(User).filter(User.email == payload.email).first()
    # Do the token generation and hashing unconditionally — only the DB write and log line
    # are skipped for a non-existent email — so a nonexistent-vs-real email can't be told
    # apart by response timing (the response body/status already don't differ either way).
    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_reset_token(raw_token)
    if user:
        expires = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_TTL_MINUTES)
        db.add(PasswordResetToken(user_id=user.id, token_hash=token_hash, expires_at=expires))
        db.commit()
        logger.warning(
            "PASSWORD RESET requested for %s — token=%s (single-use, expires in %d min)",
            user.email, raw_token, RESET_TOKEN_TTL_MINUTES,
        )
    return None


def _normalize_utc(dt: datetime | None) -> datetime | None:
    """See the SQLite naive-datetime note above — values read back from the DB lose their
    tzinfo even though they were written as UTC-aware."""
    if dt and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _find_valid_reset_record(db: Session, token: str) -> PasswordResetToken | None:
    token_hash = _hash_reset_token(token)
    record = db.query(PasswordResetToken).filter(PasswordResetToken.token_hash == token_hash).first()
    if not record:
        return None
    expires_at = _normalize_utc(record.expires_at)
    if record.used_at is not None or expires_at < datetime.now(timezone.utc):
        return None
    return record


@router.post("/validate-reset-token")
def validate_reset_token(payload: ValidateResetTokenRequest, db: Session = Depends(get_db)):
    """Lets the reset page confirm the token is still good (unused, unexpired) *before*
    showing the new-password form — so a stale/already-used link fails fast with a clear
    message instead of a form the user fills out only to have the final submit rejected.
    Doesn't consume the token — only /reset-password does that."""
    return {"valid": _find_valid_reset_record(db, payload.token) is not None}


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(payload: ResetPasswordRequest, request: Request, db: Session = Depends(get_db)):
    if not _check_password_attempt_rate(f"pw-attempt-ip:{_client_ip(request)}"):
        raise HTTPException(status_code=429, detail="Too many attempts, please try again in a minute")

    record = _find_valid_reset_record(db, payload.token)
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    user = db.get(User, record.user_id)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    now = datetime.now(timezone.utc)
    user.hashed_password = hash_password(payload.new_password)
    # Invalidates every access/refresh token issued before this moment — i.e. every other
    # session for this user — since get_current_user and /auth/refresh both compare a
    # token's embedded pwts claim against this value on every use.
    user.password_changed_at = now
    record.used_at = now
    db.commit()
    return None


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _check_password_attempt_rate(f"pw-attempt-user:{current_user.id}"):
        raise HTTPException(status_code=429, detail="Too many attempts, please try again in a minute")
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    current_user.hashed_password = hash_password(payload.new_password)
    current_user.password_changed_at = datetime.now(timezone.utc)
    db.commit()
    # Same invalidation as reset-password — but this session is authenticated (the caller
    # just proved they know the current password), so re-issue fresh cookies for it rather
    # than logging the user out of the device they're using right now. Every other
    # session's tokens (issued before this moment) still stop working immediately.
    _issue_session(response, current_user, request)
    return None


@router.post("/logout-all", status_code=status.HTTP_204_NO_CONTENT)
def logout_all(
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """'Log out everywhere': invalidates every session for this account, including the one
    used to call this endpoint — unlike change-password, this deliberately does NOT
    re-issue a fresh session for the current device, since the whole point is that every
    device (this one included) needs to log back in."""
    current_user.password_changed_at = datetime.now(timezone.utc)
    db.commit()
    clear_auth_cookies(response)
    return None


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
