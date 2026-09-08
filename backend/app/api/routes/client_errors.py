"""Receives error reports from the frontend (React error boundary crashes, uncaught JS
exceptions) so they land in the same server-side logs as backend errors, instead of only
ever being visible in whichever user's own browser devtools happened to be open.

Deliberately doesn't require auth — a crash can happen before login (e.g. on the login
page itself) and still needs to be reportable. Best-effort attaches the caller's user id
to the log line when a valid session cookie happens to be present.
"""
import logging

from fastapi import APIRouter, Request, status

from app.core.cookies import get_access_token
from app.core.security import decode_token
from app.schemas.client_error import ClientErrorReport

router = APIRouter(prefix="/client-errors", tags=["client-errors"])
logger = logging.getLogger("app.errors")


@router.post("", status_code=status.HTTP_204_NO_CONTENT)
def report_client_error(payload: ClientErrorReport, request: Request):
    user_id = None
    token = get_access_token(request)
    if token:
        data = decode_token(token)
        if data and data.get("type") == "access":
            user_id = data.get("sub")

    logger.error(
        "client-side error: user=%s url=%s message=%s\nstack=%s\ncomponent_stack=%s",
        user_id, payload.url, payload.message, payload.stack, payload.component_stack,
    )
    return None
