"""Thin client for the app's LLM backend. Two providers, same interface:

- "local": an OpenAI-compatible endpoint (e.g. Ollama's /v1, LM Studio, vLLM's OpenAI
  server). No external/cloud calls — base URL defaults to localhost.
- "claude": the Anthropic API. Financial data in the prompt leaves this machine and is
  sent to Anthropic; only enable this if that tradeoff is acceptable for your deployment.

Selected via LLM_PROVIDER in settings. Every caller MUST handle `None` back from `chat()`
— that's the "LLM unavailable" signal, and every feature that uses this client has a
deterministic fallback for that case.
"""
import httpx

from app.core.config import get_settings

settings = get_settings()

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"


async def is_reachable() -> bool:
    if not settings.LLM_ENABLED:
        return False
    if settings.LLM_PROVIDER == "claude":
        if not settings.ANTHROPIC_API_KEY:
            return False
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(
                    f"{ANTHROPIC_API_URL.rsplit('/', 1)[0]}/models",
                    headers={"x-api-key": settings.ANTHROPIC_API_KEY, "anthropic-version": ANTHROPIC_VERSION},
                )
                return resp.status_code < 500
        except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPError):
            return False
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{settings.LLM_BASE_URL}/models", headers=_local_headers())
            return resp.status_code < 500
    except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPError):
        return False


def _local_headers() -> dict:
    return {"Authorization": f"Bearer {settings.LLM_API_KEY}"}


async def chat(system: str, user: str, max_tokens: int = 300) -> str | None:
    """Returns the model's text response, or None if the LLM is disabled/unreachable."""
    if not settings.LLM_ENABLED:
        return None
    if settings.LLM_PROVIDER == "claude":
        return await _chat_claude(system, user, max_tokens)
    return await _chat_local(system, user, max_tokens)


async def _chat_local(system: str, user: str, max_tokens: int) -> str | None:
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
                f"{settings.LLM_BASE_URL}/chat/completions", json=payload, headers=_local_headers()
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"].strip()
    except (httpx.HTTPError, KeyError, IndexError, ValueError):
        return None


async def _chat_claude(system: str, user: str, max_tokens: int) -> str | None:
    if not settings.ANTHROPIC_API_KEY:
        return None
    payload = {
        "model": settings.ANTHROPIC_MODEL,
        "system": system,
        "messages": [{"role": "user", "content": user}],
        "max_tokens": max_tokens,
    }
    headers = {
        "x-api-key": settings.ANTHROPIC_API_KEY,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT_SECONDS) as client:
            resp = await client.post(ANTHROPIC_API_URL, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            return "".join(block["text"] for block in data["content"] if block["type"] == "text").strip()
    except (httpx.HTTPError, KeyError, IndexError, ValueError):
        return None
