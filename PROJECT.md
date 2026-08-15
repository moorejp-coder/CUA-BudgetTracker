# Project Brief

**Budget Tracker** is a self-hosted, Copilot Money–style personal budgeting app for people
who want the intelligence of an AI-powered finance tool without handing their transaction
data to a third-party aggregator (Plaid, bank APIs, etc.). The user manually enters
transactions or imports CSVs exported from their own bank's website, and the entire
application — including its AI layer — runs on a server they control. The AI does the work
a spreadsheet can't: it answers free-text questions about spending ("Assistant" chat),
generates weekly/monthly recaps, forecasts cash flow and runs what-if scenarios, flags
subscription price creep and category anomalies, and proactively nudges the user when a
budget is trending over or a goal is falling behind pace — all backed by a rules engine with
deterministic fallbacks so functionality never breaks if the model is unavailable.

## Stack

- **Backend**: FastAPI (Python), SQLAlchemy + Alembic, SQLite, APScheduler for background jobs
- **Frontend**: React + TypeScript, Vite, Tailwind, TanStack Query/Table, Recharts
- **AI layer**: local/self-hosted OpenAI-compatible LLM (Ollama, LM Studio, vLLM) via
  `ai_gateway.py` — no financial data ever leaves the user's own infrastructure

## Contest AI requirement

The contest's onboarding guide assumes the Claude API is the AI feature's backbone. This
project's core design choice is the opposite: privacy-first, local-only inference. To
satisfy the contest's Claude API requirement without abandoning that architecture, plan to
add an **optional Claude API-backed mode** alongside the local LLM (selectable via config,
same as the existing `LLM_ENABLED` toggle), so the app can demo real Claude usage while
still supporting a fully private deployment as the default. Tracked in ROADMAP.md.
