import re
from datetime import date, timedelta



from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.category import Category
from app.models.goal import Goal
from app.models.user import User
from app.schemas.assistant import (
    AnomaliesAssistantResponse,
    AssistantQueryRequest,
    AssistantQueryResponse,
    ScenarioAdjustment,
    ScenarioQueryRequest,
    ScenarioQueryResponse,
    ScenarioRequest,
    SubscriptionsAssistantResponse,
)
from app.services import ai_gateway, analytics, forecasting

router = APIRouter(prefix="/assistant", tags=["assistant"])


def _resolve_period(question: str) -> str:
    today = date.today()
    if "last month" in question.lower():
        year, month = today.year, today.month - 1
        if month == 0:
            year, month = year - 1, 12
        return f"{year}-{month:02d}"
    return f"{today.year}-{today.month:02d}"


def _route_intents(question: str) -> list[str]:
    """First-iteration keyword router — deliberately simple and explicit rather than an
    LLM call, so the assistant stays fast and cheap for the common cases. See module intro
    in ai_gateway.py for where this could later move behind the LLM if the phrase space
    outgrows keyword matching."""
    q = question.lower()
    intents = []
    if re.search(r"\bbudget", q):
        intents.append("budget")
    if re.search(r"\bgoal", q):
        intents.append("goal")
    if re.search(r"\bsubscription|\brecurring", q):
        intents.append("subscriptions")
    if re.search(r"\bcash ?flow", q):
        intents.append("cashflow")
    if re.search(r"net worth", q):
        intents.append("net_worth")
    if re.search(r"\bspen(d|t)\b|\bcost\b|\bcategory\b", q):
        intents.append("spend")
    if not intents:
        intents.append("summary")
    return intents


@router.post("/query", response_model=AssistantQueryResponse)
async def assistant_query(
    payload: AssistantQueryRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    period = _resolve_period(payload.question)
    intents = _route_intents(payload.question)
    context: dict = {"period": period}

    # Always include the core summary — it's cheap and gives the LLM income/expense/net
    # baseline even when a more specific intent also matched.
    context.update(analytics.summary(db, user.id, period))

    if "goal" in intents:
        context["goals"] = analytics.goal_progress(db, user.id)
    if "subscriptions" in intents:
        subs = analytics.subscriptions(db, user.id)
        context["subscriptions"] = subs
        context["subscriptions_total_monthly"] = round(sum(s["monthly_equivalent"] for s in subs), 2)
    if "cashflow" in intents:
        end = date.today()
        start = date(end.year, end.month, 1) - timedelta(days=6 * 31)
        context["cashflow_last_6_months"] = analytics.cashflow(db, user.id, start, end)
    if "net_worth" in intents:
        end = date.today()
        start = date(end.year, end.month, 1) - timedelta(days=365)
        context["net_worth_history"] = analytics.net_worth(db, user.id, start, end)

    answer, source = await ai_gateway.answer_question(payload.question, context)
    return AssistantQueryResponse(answer=answer, data=context, source=source, intents=intents)


@router.post("/scenario", response_model=ScenarioQueryResponse)
async def assistant_scenario(
    payload: ScenarioQueryRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    categories = [c.name for c in db.query(Category).filter(Category.user_id == user.id, Category.type == "expense").all()]
    goals = [g.name for g in db.query(Goal).filter(Goal.user_id == user.id).all()]

    parsed = await ai_gateway.parse_scenario(payload.question, categories, goals)
    if parsed is None:
        parsed = ai_gateway.parse_scenario_regex_fallback(payload.question, categories)

    adjustments = [ScenarioAdjustment(target=k, value=v) for k, v in parsed.items()]
    scenario = ScenarioRequest(adjustments=adjustments)

    result = forecasting.run_scenario(db, user.id, [a.model_dump() for a in adjustments], base_months=scenario.base_months)

    if not adjustments:
        explanation = (
            "I couldn't identify specific adjustments in that question — try naming a "
            "category and a percentage or dollar amount, e.g. \"what if I cut dining out by "
            "20% and saved $200 more a month\"."
        )
        source = "deterministic"
    else:
        explanation, source = await ai_gateway.explain_scenario(payload.question, scenario.model_dump(), result)

    return ScenarioQueryResponse(explanation=explanation, scenario=scenario, result=result, source=source)


@router.get("/subscriptions", response_model=SubscriptionsAssistantResponse)
async def assistant_subscriptions(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    subs = analytics.subscriptions(db, user.id)
    anomalies = analytics.subscription_anomalies(db, user.id)
    context = {
        "subscriptions": subs,
        "total_monthly": round(sum(s["monthly_equivalent"] for s in subs), 2),
        "anomalies": anomalies,
    }
    summary_text, source = await ai_gateway.summarize_subscriptions(context)
    return SubscriptionsAssistantResponse(summary=summary_text, subscriptions=subs, anomalies=anomalies, source=source)


@router.get("/anomalies", response_model=AnomaliesAssistantResponse)
async def assistant_anomalies(
    days: int = 30, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    end = date.today()
    start = end - timedelta(days=days)
    anomalies = analytics.spending_anomalies(db, user.id, start, end)
    summary_text, source = await ai_gateway.summarize_anomalies({"anomalies": anomalies})
    return AnomaliesAssistantResponse(summary=summary_text, anomalies=anomalies, source=source)
