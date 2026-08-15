from datetime import datetime

from pydantic import BaseModel


class NudgeOut(BaseModel):
    id: str
    event_type: str
    context: dict
    message: str
    source: str
    created_at: datetime
    delivered_at: datetime | None = None
    dismissed_at: datetime | None = None

    model_config = {"from_attributes": True}
