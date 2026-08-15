"""Thin client for an OpenAI-compatible local LLM endpoint (e.g. Ollama's /v1, LM Studio,
vLLM's OpenAI server). No external/cloud calls — base URL defaults to localhost.

Every caller MUST handle `None` back from `chat()` — that's the "LLM unavailable" signal,
and every feature that uses this client has a deterministic fallback for that case.
"""
import httpx

from app.core.config import get_settings

settings = get_settings()


async def is_reachable() -> bool:
    if not settings.LLM_ENABLED:
        return False
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{settings.LLM_BASE_URL}/models", headers=_headers())
            return resp.status_code < 500
    except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPError):
        return False


def _headers() -> dict:
    return {"Authorization": f"Bearer {settings.LLM_API_KEY}"}


async def chat(system: str, user: str, max_tokens: int = 300) -> str | None:
    """Returns the model's text response, or None if the LLM is disabled/unreachable."""
    if not settings.LLM_ENABLED:
        return None
    payload = {
        "model": settings.LLM_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "max_tokens": max_tokens,
        "temperature": 0.2,
    }
    try:
        async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT_SECONDS) as client:
            resp = await client.post(
                f"{settings.LLM_BASE_URL}/chat/completions", json=payload, headers=_headers()
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"].strip()
    except (httpx.HTTPError, KeyError, IndexError, ValueError):
        return None
