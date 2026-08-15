"""Weekly/monthly recap generation and daily nudge evaluation, on a cadence, for every
user. Uses APScheduler's asyncio scheduler since the AI gateway calls are async (httpx).
Disabled entirely when SCHEDULER_ENABLED=false — useful for tests and for `--reload` dev
servers where you don't want two schedulers racing across worker reloads.
"""
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.user import User
from app.services import nudge_rules
from app.services.recap_builder import generate_and_store

logger = logging.getLogger("app.scheduler")
settings = get_settings()
scheduler = AsyncIOScheduler()


async def _for_each_user(coro_fn):
    db = SessionLocal()
    try:
        for user in db.query(User).all():
            try:
                await coro_fn(db, user.id)
            except Exception:
                logger.exception("scheduled job failed for user %s", user.id)
    finally:
        db.close()


async def run_weekly_recaps():
    await _for_each_user(lambda db, user_id: generate_and_store(db, user_id, "week"))


async def run_monthly_recaps():
    await _for_each_user(lambda db, user_id: generate_and_store(db, user_id, "month"))


async def run_daily_nudges():
    await _for_each_user(nudge_rules.generate_for_user)


def start():
    if not settings.SCHEDULER_ENABLED:
        logger.info("Scheduler disabled (SCHEDULER_ENABLED=false)")
        return
    scheduler.add_job(run_weekly_recaps, "cron", day_of_week="mon", hour=6, minute=0, id="weekly_recaps", replace_existing=True)
    scheduler.add_job(run_monthly_recaps, "cron", day=1, hour=6, minute=0, id="monthly_recaps", replace_existing=True)
    scheduler.add_job(run_daily_nudges, "cron", hour=7, minute=0, id="daily_nudges", replace_existing=True)
    scheduler.start()
    logger.info("Scheduler started: weekly recaps (Mon 06:00), monthly recaps (1st 06:00), nudges (daily 07:00)")


def shutdown():
    if scheduler.running:
        scheduler.shutdown(wait=False)
