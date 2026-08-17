"""AI gateway — the ONLY module in this app allowed to call the LLM HTTP API.

Every other module that wants natural-language output goes through one of the functions
below. Each function:
  1. Accepts already-computed, deterministic data (usually from `app.services.analytics`
     or `app.services.forecasting`) — never raw transaction rows, and never touches the DB
     itself.
  2. Builds a prompt that embeds a fixed safety preamble plus that data as JSON.
  3. Calls `llm_client.chat()` and returns `(text, source)` where source is "llm" or
     "deterministic" — callers use this to label the response and to fall back to a
     templated string when the LLM is disabled or unreachable, so every feature stays
     usable with LLM_ENABLED=false.

Nothing here invents numbers: prompts explicitly instruct the model to use only the
supplied JSON, and every deterministic fallback is built from the same JSON the LLM would
have seen.
"""
import json
import re

from app.services import llm_client

SAFETY_PREAMBLE = (
    "You are a personal finance assistant for a single self-hosted household budgeting "
    "app. You may ONLY use the JSON data provided in this prompt — never invent numbers, "
    "never assume data you were not given. You must NOT provide personalized investment, "
    "tax, or legal advice, and must not recommend specific securities, funds, or "
    "investment strategies; if asked, say that's outside what you can help with and "
    "redirect to budgeting/spending habits. Keep a supportive, non-judgmental tone."
)


def _json(data: dict) -> str:
    return json.dumps(data, default=str)


async def answer_question(question: str, context: dict) -> tuple[str, str]:
    system = SAFETY_PREAMBLE + " Answer the user's question using only the data below."
    prompt = f"Data: {_json(context)}\n\nQuestion: {question}"
    reply = await llm_client.chat(system, prompt, max_tokens=250)
    if reply:
        return reply, "llm"
    return _deterministic_answer(context), "deterministic"


def _deterministic_answer(context: dict) -> str:
    parts = []
    if "total_income" in context:
        parts.append(f"income ${context['total_income']:.2f}")
    if "total_expense" in context:
        parts.append(f"expenses ${context['total_expense']:.2f}")
    if "net" in context:
        parts.append(f"net ${context['net']:.2f}")
    summary = ", ".join(parts) if parts else "no matching data was found for this question"
    text = f"Based on your data: {summary}."
    top_categories = context.get("top_categories") or []
    if top_categories:
        top = top_categories[0]
        text += f" Your top spending category was {top.get('name')} at ${top.get('total', 0):.2f}."
    budget_status = context.get("budget_status") or []
    over = [b for b in budget_status if b.get("over")]
    if over:
        names = ", ".join(b["category_name"] for b in over)
        text += f" You're currently over budget in: {names}."

    goals = context.get("goals") or []
    if goals:
        parts = ", ".join(f"{g['name']} {g['pct_complete']:.0f}% (${g['current_amount']:.2f}/${g['target_amount']:.2f})" for g in goals)
        text += f" Goal progress: {parts}."

    subs = context.get("subscriptions") or []
    if subs:
        total = context.get("subscriptions_total_monthly", sum(s.get("monthly_equivalent", 0) for s in subs))
        text += f" You have {len(subs)} active subscriptions totaling ${total:.2f}/month."

    cashflow = context.get("cashflow_last_6_months") or []
    if cashflow:
        latest = cashflow[-1]
        text += f" Most recent month ({latest['period']}): income ${latest['income']:.2f}, expenses ${latest['expense']:.2f}, net ${latest['net']:.2f}."

    net_worth_history = context.get("net_worth_history") or []
    if net_worth_history:
        latest = net_worth_history[-1]
        text += f" Current net worth: ${latest['net_worth']:.2f} (assets ${latest['assets']:.2f}, liabilities ${latest['liabilities']:.2f})."

    return text


async def generate_recap(context: dict) -> tuple[str, str]:
    system = (
        SAFETY_PREAMBLE
        + " Summarize this period's finances in 4-6 concise bullet points (use '- ' prefix "
        "lines). Highlight the net-worth change if present, major spending categories, any "
        "budget issues, and end with 1-2 constructive, non-judgmental suggestions."
    )
    prompt = f"Period data: {_json(context)}"
    reply = await llm_client.chat(system, prompt, max_tokens=400)
    if reply:
        return reply, "llm"
    return _deterministic_recap(context), "deterministic"


def _deterministic_recap(context: dict) -> str:
    lines = [
        f"- Income: ${context.get('income', 0):.2f}, Expenses: ${context.get('expenses', 0):.2f}, "
        f"Savings rate: {context.get('savings_rate', 0) * 100:.0f}%",
    ]
    if context.get("net_worth_delta") is not None:
        lines.append(f"- Net worth changed by ${context['net_worth_delta']:.2f} this period")
    top_categories = context.get("top_categories") or []
    if top_categories:
        cats = ", ".join(f"{c['name']} (${c['total']:.0f})" for c in top_categories[:3])
        lines.append(f"- Top spending categories: {cats}")
    over_budget = [b for b in (context.get("budget_status") or []) if b.get("over")]
    if over_budget:
        names = ", ".join(b["category_name"] for b in over_budget)
        lines.append(f"- Over budget in: {names}")
    else:
        lines.append("- All tracked budgets were within limits this period")
    lines.append("- Consider reviewing your top category next period to see if it still fits your priorities")
    return "\n".join(lines)


_JSON_BLOCK_RE = re.compile(r"\{.*\}", re.DOTALL)


async def parse_scenario(question: str, category_names: list[str], goal_names: list[str]) -> dict[str, float] | None:
    """Ask the LLM to turn a free-text what-if question into {target: value} adjustments.

    Returns None if the LLM is unavailable or its output can't be parsed as such an object —
    callers should fall back to a simple regex parser (see `parse_scenario_regex_fallback`).
    """
    system = (
        "Extract numeric budget adjustments from the user's question as a flat JSON object "
        "mapping a target name to a number. If the target is an expense category, use a "
        "value between -1 and 1 representing the relative percentage change (e.g. -0.20 for "
        "'cut by 20%'). If the target is a goal or a generic savings amount, use the raw "
        "dollar amount per month (e.g. 200 for 'save $200 more a month'). "
        f"Valid category names: {category_names}. Valid goal names: {goal_names}. "
        "Reply with ONLY the JSON object, no explanation."
    )
    reply = await llm_client.chat(system, question, max_tokens=150)
    if not reply:
        return None
    match = _JSON_BLOCK_RE.search(reply)
    if not match:
        return None
    try:
        parsed = json.loads(match.group(0))
        return {str(k): float(v) for k, v in parsed.items()}
    except (ValueError, TypeError):
        return None


def parse_scenario_regex_fallback(question: str, category_names: list[str]) -> dict[str, float]:
    """Deterministic best-effort parser used when the LLM is disabled/unreachable/unparsable.

    Handles the two patterns explicitly called out in the spec:
      "cut/reduce <category> by <N>%"  -> {category: -N/100}
      "add/save/put $<N> ... <goal or generic>" -> best matched against goal/category names
    """
    adjustments: dict[str, float] = {}
    lowered = question.lower()

    for cat in category_names:
        cat_l = cat.lower()
        if cat_l in lowered:
            pct_match = re.search(rf"{re.escape(cat_l)}.{{0,20}}?by\s+(\d+(?:\.\d+)?)\s*%", lowered)
            if not pct_match:
                pct_match = re.search(rf"(\d+(?:\.\d+)?)\s*%.{{0,20}}?{re.escape(cat_l)}", lowered)
            if pct_match:
                pct = float(pct_match.group(1)) / 100
                sign = -1 if re.search(r"cut|reduce|lower|decrease", lowered) else 1
                adjustments[cat] = sign * pct

    dollar_match = re.search(r"\$?(\d+(?:\.\d+)?)\s*(?:more|extra|/month|per month)?", lowered)
    if "saving" in lowered or "emergency fund" in lowered or "goal" in lowered:
        amount_match = re.search(r"\$(\d+(?:\.\d+)?)", lowered)
        if amount_match:
            adjustments["Savings"] = float(amount_match.group(1))

    return adjustments


async def explain_scenario(question: str, scenario: dict, result: dict) -> tuple[str, str]:
    system = (
        SAFETY_PREAMBLE
        + " Explain the forecast results below using ONLY the provided numbers. Be concise "
        "(2-4 sentences). State the projected monthly change in net cash flow, and if goal "
        "impacts are present, mention how much sooner (or later) a goal would be reached."
    )
    prompt = f"Original question: {question}\n\nScenario: {_json(scenario)}\n\nForecast result: {_json(result)}"
    reply = await llm_client.chat(system, prompt, max_tokens=250)
    if reply:
        return reply, "llm"
    return _deterministic_scenario_explanation(result), "deterministic"


def _deterministic_scenario_explanation(result: dict) -> str:
    delta = result.get("monthly_net_delta", 0)
    direction = "increase" if delta >= 0 else "decrease"
    text = f"This scenario would {direction} your net monthly cash flow by ${abs(delta):.2f}."
    for impact in result.get("goal_impacts", []):
        if impact.get("months_saved"):
            text += (
                f" Your goal '{impact['goal_name']}' would be reached about "
                f"{impact['months_saved']:.1f} months sooner."
            )
    return text


async def summarize_subscriptions(context: dict) -> tuple[str, str]:
    system = (
        SAFETY_PREAMBLE
        + " Summarize the subscriptions and anomalies below in 3-5 bullet points. Highlight "
        "total monthly subscription cost and any price increases. Suggest 1-2 practical "
        "ways to reduce or optimize these expenses."
    )
    reply = await llm_client.chat(system, _json(context), max_tokens=300)
    if reply:
        return reply, "llm"
    return _deterministic_subscription_summary(context), "deterministic"


def _deterministic_subscription_summary(context: dict) -> str:
    subs = context.get("subscriptions", [])
    total = sum(s.get("monthly_equivalent", 0) for s in subs)
    lines = [f"- You have {len(subs)} recurring subscriptions totaling ${total:.2f}/month"]
    increases = context.get("anomalies", {}).get("price_increases", [])
    if increases:
        names = ", ".join(i["merchant"] for i in increases)
        lines.append(f"- Price increases detected on: {names}")
    new_subs = context.get("anomalies", {}).get("new_subscriptions", [])
    if new_subs:
        names = ", ".join(s["merchant"] for s in new_subs)
        lines.append(f"- Newly detected recurring charges: {names}")
    if subs:
        priciest = max(subs, key=lambda s: s.get("monthly_equivalent", 0))
        lines.append(f"- Your most expensive subscription is {priciest['merchant']} — worth double-checking you still use it")
    return "\n".join(lines)


async def summarize_anomalies(context: dict) -> tuple[str, str]:
    system = (
        SAFETY_PREAMBLE
        + " Summarize the unusual transactions below in 2-4 sentences. Mention the largest "
        "or most surprising ones by name and amount. Keep it observational, not alarmist — "
        "these are just outliers relative to the user's own history, not necessarily mistakes."
    )
    reply = await llm_client.chat(system, _json(context), max_tokens=200)
    if reply:
        return reply, "llm"
    return _deterministic_anomaly_summary(context), "deterministic"


def _deterministic_anomaly_summary(context: dict) -> str:
    anomalies = context.get("anomalies", [])
    if not anomalies:
        return "No unusual spending detected in this period relative to your history."
    lines = [f"Found {len(anomalies)} transaction(s) that stand out from your usual spending:"]
    for a in anomalies[:3]:
        lines.append(f"- {a.get('payee', 'Unknown')}: ${a.get('amount', 0):.2f} — {a.get('reason', '')}")
    return "\n".join(lines)


async def generate_nudge_message(event_type: str, context: dict) -> tuple[str, str]:
    system = (
        "You are a supportive financial coach embedded in a personal budgeting app. Using "
        "ONLY the context JSON below, write a 2-3 sentence nudge that is constructive and "
        "non-judgmental. Do not give regulated investment advice; focus on budgeting and "
        "spending habits. Do not invent numbers not present in the context."
    )
    prompt = f"Event type: {event_type}\nContext: {_json(context)}"
    reply = await llm_client.chat(system, prompt, max_tokens=150)
    if reply:
        return reply, "llm"
    return _deterministic_nudge(event_type, context), "deterministic"


def _deterministic_nudge(event_type: str, context: dict) -> str:
    if event_type == "budget_warning":
        return (
            f"Heads up — you've used {context.get('pct_used', 0):.0f}% of your "
            f"{context.get('category_name', 'category')} budget with time left in the period. "
            "Worth a quick check-in before it adds up further."
        )
    if event_type == "budget_overspend":
        return (
            f"{context.get('category_name', 'This category')} has run over budget "
            f"{context.get('streak', 0)} periods in a row. Might be worth adjusting the "
            "budget amount or taking a closer look at what's driving it."
        )
    if event_type == "goal_behind":
        return (
            f"Your goal '{context.get('goal_name', '')}' is tracking behind pace — "
            f"about {context.get('behind_pct', 0):.0f}% below where a steady contribution "
            "would put you. A small top-up now can close the gap."
        )
    if event_type == "weekend_overspend":
        return (
            "Weekend spending has been notably higher than weekday spending recently. "
            "Not necessarily a problem — just flagging it in case it's worth a look."
        )
    return "Here's a quick check-in on your recent activity — take a look when you have a moment."
