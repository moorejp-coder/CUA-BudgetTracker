import logging

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.cookies import get_access_token
from app.core.security import decode_token, session_binding_status, token_matches_current_password
from app.db.session import get_db
from app.models.revoked_token import RevokedToken
from app.models.user import User

logger = logging.getLogger("app.auth")


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    token = get_access_token(request)
    if not token:
        raise credentials_error
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise credentials_error
    # Checked on every authenticated request (not just refresh) so logout actually ends
    # the session immediately, rather than merely blocking the token from being renewed.
    jti = payload.get("jti")
    if jti and db.get(RevokedToken, jti):
        raise credentials_error
    user = db.get(User, payload.get("sub"))
    if not user:
        raise credentials_error
    # A password change/reset since this token was issued invalidates it — this is what
    # actually kills every other session on password reset, without needing to track and
    # individually revoke each one's jti (see User.password_changed_at).
    if not token_matches_current_password(payload, user.password_changed_at):
        raise credentials_error

    # Session binding: a token used from a different browser/device than the one it was
    # issued to is a strong hijack signal (see session_binding_status's docstring for why
    # UA and IP are treated differently) — hard-reject on UA change, only log on IP change.
    ua_ok, ip_ok = session_binding_status(payload, request.headers.get("user-agent", ""), _client_ip(request))
    if not ua_ok:
        logger.warning("session binding failed (user-agent changed): user=%s jti=%s", user.id, jti)
        raise credentials_error
    if not ip_ok:
        logger.warning("session IP changed: user=%s jti=%s ip=%s", user.id, jti, _client_ip(request))

    return user
