import re
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.db.session import get_db
from app.models.category import Category
from app.models.user import User
from app.schemas.analytics import (
    LlmAskRequest,
    LlmAskResponse,
    LlmCategorizeRequest,
    LlmCategorizeResponse,
    LlmStatus,
)
from app.services import analytics as analytics_svc
from app.services import llm_client
from app.services.categorize import suggest_category

router = APIRouter(prefix="/llm", tags=["llm"])
settings = get_settings()


@router.get("/status", response_model=LlmStatus)
async def status():
    reachable = await llm_client.is_reachable()
    return LlmStatus(
        enabled=settings.LLM_ENABLED, reachable=reachable, base_url=settings.LLM_BASE_URL, model=settings.LLM_MODEL
    )


@router.post("/categorize", response_model=LlmCategorizeResponse)
async def categorize(
    payload: LlmCategorizeRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    categories = db.query(Category).filter(Category.user_id == user.id, Category.type == "expense").all()
    names = [c.name for c in categories]

    # Cheap deterministic pass first — this alone covers most real-world merchant strings.
    rule_match, confidence = suggest_category(payload.description, names)
    if rule_match:
        return LlmCategorizeResponse(suggested_category=rule_match, confidence=confidence, source="rules")

    # Fall back to the local LLM only if rules found nothing.
    if names:
        system = "You categorize a single bank transaction into exactly one of the given categories. Reply with only the category name, nothing else."
        prompt = f"Categories: {', '.join(names)}\nTransaction description: {payload.description}"
        reply = await llm_client.chat(system, prompt, max_tokens=20)
        if reply:
            cleaned = reply.strip().strip(".")
            if cleaned in names:
                return LlmCategorizeResponse(suggested_category=cleaned, confidence=0.6, source="llm")

    return LlmCategorizeResponse(suggested_category=None, confidence=0.0, source="none")


def _current_month() -> str:
    today = date.today()
    return f"{today.year}-{today.month:02d}"


@router.post("/ask", response_model=LlmAskResponse)
async def ask(payload: LlmAskRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Classifies the question against deterministic analytics endpoints, then (optionally)
    asks the local LLM to phrase a natural-language answer from those numbers only."""
    question = payload.question.lower()
    period = _current_month()
    if "last month" in question:
        today = date.today()
        year, month = today.year, today.month - 1
        if month == 0:
            year, month = year - 1, 12
        period = f"{year}-{month:02d}"

    data = analytics_svc.summary(db, user.id, period)

    if re.search(r"\bbudget\b|\bover\b", question):
        focus = {"period": period, "budget_status": data["budget_status"]}
    elif re.search(r"\bspen(d|t)\b|\bcost\b", question):
        focus = {
            "period": period,
            "total_expense": data["total_expense"],
            "top_categories": data["top_categories"],
        }
    else:
        focus = data

    reply = await llm_client.chat(
        "You are a personal finance assistant. Answer the user's question using ONLY the "
        "JSON data provided — never invent numbers. Be concise (2-3 sentences), and use "
        "dollar formatting.",
        f"Data: {focus}\n\nQuestion: {payload.question}",
        max_tokens=200,
    )
    if reply:
        return LlmAskResponse(answer=reply, data=focus, source="llm")

    # Deterministic fallback phrasing if the LLM is offline.
    fallback = (
        f"For {period}: income ${data['total_income']:.2f}, expenses ${data['total_expense']:.2f}, "
        f"net ${data['net']:.2f}."
    )
    if data["top_categories"]:
        top = data["top_categories"][0]
        fallback += f" Top spending category: {top['name']} (${top['total']:.2f})."
    return LlmAskResponse(answer=fallback, data=focus, source="deterministic")
