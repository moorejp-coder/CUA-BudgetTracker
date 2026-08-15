from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    accounts,
    analytics,
    assistant,
    auth,
    budgets,
    categories,
    csv_imports,
    export,
    forecast,
    goals,
    llm,
    nudges,
    recaps,
    recurring,
    transactions,
)
from app.core.config import get_settings
from app.db.session import Base, engine
from app.services import scheduler

settings = get_settings()

app = FastAPI(title=settings.APP_NAME, version="0.1.0")

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
    categories.router,
    transactions.router,
    csv_imports.router,
    budgets.router,
    recurring.router,
    goals.router,
    analytics.router,
    llm.router,
    export.router,
    assistant.router,
    forecast.router,
    recaps.router,
    nudges.router,
):
    app.include_router(router, prefix=API_PREFIX)


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
