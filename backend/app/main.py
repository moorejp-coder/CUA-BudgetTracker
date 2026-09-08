import logging
import math

from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import (
    accounts,
    analytics,
    assistant,
    auth,
    budgets,
    buckets,
    categories,
    client_errors,
    csv_imports,
    export,
    forecast,
    llm,
    nudges,
    recaps,
    recurring,
    transactions,
)
from app.core.abuse_protection import AbuseProtectionMiddleware
from app.core.config import get_settings
from app.db.session import Base, engine
from app.services import scheduler

settings = get_settings()

app = FastAPI(title=settings.APP_NAME, version="0.1.0")

# Added before CORSMiddleware so CORS ends up outermost (Starlette wraps middleware in
# reverse-registration order) — a request the abuse guard blocks still needs CORS headers
# on its response, or the browser hides the real 429/400 behind an opaque network error.
app.add_middleware(AbuseProtectionMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"
for router in (
    auth.router,
    accounts.router,
    buckets.router,
    categories.router,
    transactions.router,
    csv_imports.router,
    budgets.router,
    recurring.router,
    analytics.router,
    llm.router,
    export.router,
    assistant.router,
    forecast.router,
    recaps.router,
    nudges.router,
    client_errors.router,
):
    app.include_router(router, prefix=API_PREFIX)


def _json_safe(value):
    """Replace non-finite floats (NaN/Infinity) with a string so the error response
    itself is always valid JSON — Starlette's JSONResponse encodes with allow_nan=False,
    which otherwise turns a correctly-rejected NaN/Infinity input into a 500 instead of
    the 422 the client should see."""
    if isinstance(value, float) and not math.isfinite(value):
        return str(value)
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    return value


# Field names whose raw value must never be echoed back in an error response — Pydantic's
# validation errors otherwise include the exact offending input (e.g. a rejected password
# fails min_length or the breach-list check and its plaintext value comes back verbatim in
# the 422 body), which would then sit in browser devtools, any error-tracking/APM tool that
# captures response bodies, or a reverse proxy's access logs.
_SENSITIVE_FIELDS = {"password", "current_password", "new_password", "token", "refresh_token"}


def _redact_sensitive_input(errors: list[dict]) -> list[dict]:
    redacted = []
    for err in errors:
        loc = err.get("loc") or ()
        if any(str(part) in _SENSITIVE_FIELDS for part in loc):
            err = {**err, "input": "[redacted]"}
            err.pop("ctx", None)  # ctx can also carry the raw value for some error types
        redacted.append(err)
    return redacted


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = _redact_sensitive_input(jsonable_encoder(exc.errors()))
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        # Must stay wrapped in {"detail": [...]} — that's FastAPI's default validation-error
        # shape, and every frontend error handler (extractErrorMessage in Login.tsx etc.)
        # reads response.data.detail. A bare array here silently breaks every 422 message
        # shown to users app-wide, falling back to a generic "Something went wrong".
        content={"detail": _json_safe(errors)},
    )


error_logger = logging.getLogger("app.errors")


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Catches anything no route/dependency handled itself — a bug, a DB error, whatever.
    Starlette's own default for this (debug=False, which this app always runs with) is
    already a bare "Internal Server Error" with no traceback sent to the client, so
    nothing technical was ever leaking here — but it also never went through Python's
    logging module, so the only trace of it was whatever the ASGI server happened to print
    to stderr: not searchable, not attributable to a request, easy to lose. This makes
    that explicit: full traceback via logging (exc_info=True), a JSON body consistent with
    every other error response in the app (frontend code uniformly reads response.data.detail),
    and nothing about the exception itself in that body.

    Registering a handler for the base Exception does NOT shadow the more specific
    HTTPException/RequestValidationError handlers above — Starlette dispatches to the most
    specific matching handler for the raised type, and those stay closer matches."""
    error_logger.error(
        "unhandled exception: method=%s path=%s", request.method, request.url.path, exc_info=exc
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected error occurred. Please try again."},
    )


@app.on_event("startup")
def on_startup():
    # Dev convenience: create tables if they don't exist yet. Production deployments should
    # run `alembic upgrade head` instead (see README) so schema changes are tracked.
    Base.metadata.create_all(bind=engine)
    scheduler.start()


@app.on_event("shutdown")
def on_shutdown():
    scheduler.shutdown()


@app.get("/health")
def health():
    return {"status": "ok"}
