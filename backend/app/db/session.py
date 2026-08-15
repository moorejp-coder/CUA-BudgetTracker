import json
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import get_settings

settings = get_settings()

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    if db_path not in (":memory:",):
        os.makedirs(os.path.dirname(db_path) or ".", exist_ok=True)

# JSON columns (Recap.context, NudgeEvent.context, CsvImportTemplate.column_mapping) hold
# dicts that often include date/datetime values from the analytics layer — default=str
# makes those serialize as ISO strings instead of raising.
engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    json_serializer=lambda obj: json.dumps(obj, default=str),
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
