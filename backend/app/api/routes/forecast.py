from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.forecast import CashflowForecastResponse
from app.schemas.assistant import ScenarioRequest, ScenarioResponse
from app.services import forecasting

router = APIRouter(prefix="/forecast", tags=["forecast"])


@router.get("/cashflow", response_model=CashflowForecastResponse)
def get_cashflow_forecast(
    days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    return forecasting.cashflow_forecast(db, user.id, horizon_days=days)


@router.post("/scenario", response_model=ScenarioResponse)
def post_scenario(
    payload: ScenarioRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    adjustments = [a.model_dump() for a in payload.adjustments]
    return forecasting.run_scenario(db, user.id, adjustments, base_months=payload.base_months)
