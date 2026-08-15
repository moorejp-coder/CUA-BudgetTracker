from datetime import date as date_type, datetime

from pydantic import BaseModel


class RecapOut(BaseModel):
    id: str
    period_type: str
    period_start: date_type
    period_end: date_type
    recap_text: str
    context: dict
    source: str
    created_at: datetime

    model_config = {"from_attributes": True}


class RecapGenerateRequest(BaseModel):
    period_type: str = "month"  # week | month
