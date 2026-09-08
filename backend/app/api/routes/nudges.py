from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.authz import require_resource
from app.db.session import get_db
from app.models.nudge import NudgeEvent
from app.models.user import User
from app.schemas.nudge import NudgeOut
from app.services import nudge_rules

router = APIRouter(prefix="/nudges", tags=["nudges"])

get_owned_nudge = require_resource(
    NudgeEvent,
    "nudge_id",
    lambda nudge, user: nudge.user_id == user.id,
    denied_status=404,
    not_found_detail="Nudge not found",
)


@router.get("", response_model=list[NudgeOut])
def list_nudges(
    include_dismissed: bool = False, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    query = db.query(NudgeEvent).filter(NudgeEvent.user_id == user.id)
    if not include_dismissed:
        query = query.filter(NudgeEvent.dismissed_at.is_(None))
    return query.order_by(NudgeEvent.created_at.desc()).all()


@router.post("/generate", response_model=list[NudgeOut])
async def generate_nudges(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Manually trigger the nudge rule engine for dev/testing — the scheduler runs this
    automatically once a day in production."""
    return await nudge_rules.generate_for_user(db, user.id)


@router.post("/{nudge_id}/dismiss", response_model=NudgeOut)
def dismiss_nudge(db: Session = Depends(get_db), nudge: NudgeEvent = Depends(get_owned_nudge)):
    nudge.dismissed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(nudge)
    return nudge
