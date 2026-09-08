"""Reusable authentication + per-resource authorization dependency for FastAPI routes.

Every route that takes a resource ID from the URL (e.g. `/accounts/{account_id}`) needs
the same three things: confirm the caller is logged in, confirm they're specifically
allowed to touch *this* id (not just that they're logged in at all), and do something
observable when either check fails. `require_resource` bundles all three into one
dependency factory so routes stop hand-rolling `db.get(...); if not x or x.user_id !=
user.id: raise HTTPException(...)` individually.
"""
import logging
from typing import Callable, TypeVar

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User

logger = logging.getLogger("security")

ModelT = TypeVar("ModelT")


def require_resource(
    model: type[ModelT],
    id_param: str,
    is_authorized: Callable[[ModelT, User], bool],
    *,
    denied_status: int = 403,
    not_found_detail: str = "Not found",
    denied_detail: str | None = None,
):
    """Builds a FastAPI dependency that loads `model` by primary key from the URL path
    parameter named `id_param`, then checks `is_authorized(resource, user)`.

    - (1) No valid session at all -> 401. Comes for free: this depends on
      `get_current_user`, which is what already raises 401 for every other endpoint in
      the app, so behavior stays identical to routes that check auth "manually".
    - (2) `is_authorized` is *your* function — pass whatever specific-resource check
      applies: simple ownership (`lambda order, user: order.user_id == user.id`), a
      shared/collaborator check, a role check, anything that takes (resource, user) and
      returns a bool.
    - (3) Row doesn't exist at all -> 404 (nothing to be unauthorized *about*).
      `is_authorized` returns False -> `denied_status` (default 403, as requested).
      Note: this app's own existing ownership checks (accounts, transactions, etc.) use
      404 for both cases on purpose, so a non-owner can't tell "doesn't exist" apart from
      "exists but isn't yours" (OWASP's recommendation for object-level authz failures).
      Pass `denied_status=404` to match that convention for a given resource; the default
      here is 403 to match what you asked for.
    - (4) Every denial (missing row or failed check) is logged via the same "security"
      logger the rest of the app's abuse/CSRF logging already uses, with the caller, the
      model, the id, and the path — so these show up alongside other flagged attempts.

    On success, the dependency's *return value* is the loaded resource — inject it
    directly into your route instead of re-fetching it.
    """
    detail = denied_detail if denied_detail is not None else not_found_detail

    def dependency(
        request: Request,
        db: Session = Depends(get_db),
        user: User = Depends(get_current_user),
    ) -> ModelT:
        resource_id = request.path_params.get(id_param)
        resource = db.get(model, resource_id) if resource_id else None

        if not resource:
            logger.warning(
                "authz denied (no such resource): user=%s model=%s id=%s path=%s",
                user.id, model.__name__, resource_id, request.url.path,
            )
            raise HTTPException(status_code=404, detail=not_found_detail)

        if not is_authorized(resource, user):
            logger.warning(
                "authz denied (not authorized): user=%s model=%s id=%s path=%s",
                user.id, model.__name__, resource_id, request.url.path,
            )
            raise HTTPException(status_code=denied_status, detail=detail)

        return resource

    return dependency
