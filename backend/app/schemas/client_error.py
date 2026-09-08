from pydantic import BaseModel, Field


class ClientErrorReport(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    stack: str = Field("", max_length=8000)
    component_stack: str = Field("", max_length=8000)
    url: str = Field("", max_length=500)
