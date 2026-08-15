from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.recap import Recap
from app.models.user import User
from app.schemas.recap import RecapGenerateRequest, RecapOut
from app.services.recap_builder import generate_and_store

router = APIRouter(prefix="/recaps", tags=["recaps"])


@router.get("", response_model=list[RecapOut])
def list_recaps(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Recap).filter(Recap.user_id == user.id).order_by(Recap.period_start.desc()).all()


@router.get("/{recap_id}", response_model=RecapOut)
def get_recap(recap_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    recap = db.get(Recap, recap_id)
    if not recap or recap.user_id != user.id:
        raise HTTPException(status_code=404, detail="Recap not found")
    return recap


@router.post("/generate", response_model=RecapOut, status_code=201)
async def generate_recap(
    payload: RecapGenerateRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    """Manually trigger a recap for dev/testing — the scheduler calls the same
    `generate_and_store` helper automatically on a cadence (see app.services.scheduler)."""
    return await generate_and_store(db, user.id, payload.period_type)
