"""Deterministic rule engine: turns behavior signals into candidate nudge events. Pure
functions over already-computed analytics — no LLM calls here (that happens once per
candidate event, in the AI gateway, to phrase the actual message)."""
from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.nudge import NudgeEvent
from app.services import ai_gateway, analytics

BUDGET_WARNING_THRESHOLD_PCT = 80.0
CONSECUTIVE_OVERSPEND_PERIODS = 3


def _previous_periods(period: str, count: int) -> list[str]:
    year, month = (int(x) for x in period.split("-"))
    periods = []
    for _ in range(count):
        periods.append(f"{year}-{month:02d}")
        month -= 1
        if month == 0:
            month, year = 12, year - 1
    return periods


def evaluate(db: Session, user_id: str, reference: date | None = None) -> list[dict]:
    today = reference or date.today()
    period = f"{today.year}-{today.month:02d}"
    candidates: list[dict] = []

    # 1) Budget warning: >= 80% of a category's budget used, with time left in the period.
    adherence = analytics.budget_adherence(db, user_id, period)
    days_in_month = (date(today.year + (today.month == 12), (today.month % 12) + 1, 1) - date(today.year, today.month, 1)).days
    pct_of_period_elapsed = today.day / days_in_month * 100
    if pct_of_period_elapsed < 95:  # don't warn in the last couple of days — too late to act
        for detail in adherence["details"]:
            if BUDGET_WARNING_THRESHOLD_PCT <= detail["pct_used"] < 100:
                candidates.append(
                    {
                        "event_type": "budget_warning",
                        "dedupe_key": f"budget_warning:{detail['category_id']}:{period}",
                        "context": {
                            "category_name": detail["category_name"],
                            "pct_used": detail["pct_used"],
                            "spent": detail["spent"],
                            "budget": detail["budget"],
                            "period": period,
                        },
                    }
                )

    # 2) Repeated overspending: same category over budget for N consecutive periods.
    periods = _previous_periods(period, CONSECUTIVE_OVERSPEND_PERIODS)
    adherence_by_period = {p: analytics.budget_adherence(db, user_id, p) for p in periods}
    category_names_current = {d["category_id"]: d["category_name"] for d in adherence["details"]}
    for category_id, category_name in category_names_current.items():
        streak = 0
        for p in periods:
            detail = next((d for d in adherence_by_period[p]["details"] if d["category_id"] == category_id), None)
            if detail and detail["over"]:
                streak += 1
            else:
                break
        if streak >= CONSECUTIVE_OVERSPEND_PERIODS:
            candidates.append(
                {
                    "event_type": "budget_overspend",
                    "dedupe_key": f"budget_overspend:{category_id}:{period}",
                    "context": {"category_name": category_name, "streak": streak, "period": period},
                }
            )

    # 3) Weekend spending materially higher than weekday spending.
    pattern = analytics.weekday_weekend_pattern(db, user_id)
    if pattern["notable"]:
        candidates.append(
            {
                "event_type": "weekend_overspend",
                "dedupe_key": f"weekend_overspend:{period}",
                "context": pattern,
            }
        )

    return candidates


async def generate_for_user(db: Session, user_id: str, reference: date | None = None) -> list[NudgeEvent]:
    """Evaluates rules, skips anything already raised recently (dedupe_key match within the
    last 7 days), phrases a message for each new candidate via the AI gateway, and persists
    it. Returns the newly created NudgeEvent rows (empty list if nothing new fired)."""
    candidates = evaluate(db, user_id, reference)
    if not candidates:
        return []

    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    recent = db.query(NudgeEvent).filter(NudgeEvent.user_id == user_id, NudgeEvent.created_at >= cutoff).all()
    recent_keys = {n.context.get("dedupe_key") for n in recent if isinstance(n.context, dict)}

    created = []
    for candidate in candidates:
        dedupe_key = candidate["dedupe_key"]
        if dedupe_key in recent_keys:
            continue
        message, source = await ai_gateway.generate_nudge_message(candidate["event_type"], candidate["context"])
        context = dict(candidate["context"])
        context["dedupe_key"] = dedupe_key
        nudge = NudgeEvent(
            user_id=user_id,
            event_type=candidate["event_type"],
            context=context,
            message=message,
            source=source,
            delivered_at=datetime.now(timezone.utc),
        )
        db.add(nudge)
        created.append(nudge)

    if created:
        db.commit()
        for n in created:
            db.refresh(n)
    return created
