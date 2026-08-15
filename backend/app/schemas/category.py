from pydantic import BaseModel


class CategoryCreate(BaseModel):
    name: str
    type: str  # income | expense
    color: str = "#5b8def"
    emoji: str = ""
    parent_id: str | None = None


class CategoryUpdate(BaseModel):
    name: str | None = None
    color: str | None = None
    emoji: str | None = None
    parent_id: str | None = None


class CategoryOut(BaseModel):
    id: str
    name: str
    type: str
    color: str
    emoji: str
    parent_id: str | None = None

    model_config = {"from_attributes": True}
