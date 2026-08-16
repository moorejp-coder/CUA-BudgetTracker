# Budget Tracker (self-hosted)

A private, self-hosted Copilot Money–style budgeting app. No Plaid, no bank APIs, no
third-party aggregators — you enter transactions manually or import CSVs exported from your
bank's own website. Everything runs on a server you control.

**Live demo:** http://54.175.240.105 (AWS EC2, Free Tier — static via Elastic IP)

See [PROJECT_SUMMARY.pdf](PROJECT_SUMMARY.pdf) for a one-page overview (problem, solution, AI
usage, key learnings). For more detail: [ARCHITECTURE.md](ARCHITECTURE.md) for the stack/ER
diagram/API surface and
[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) for the UI design tokens. The original static
localStorage prototype from before this rewrite lives in [`legacy-static/`](legacy-static/).

## Problem, users, and success criteria

**Problem.** AI-powered budgeting tools (Copilot Money, Cleo, etc.) get their intelligence
by linking directly to your bank accounts through an aggregator like Plaid — which means
handing a third party read access to every transaction you make. Privacy-conscious users are
stuck choosing between "dumb but private" spreadsheets and "smart but exposed" fintech apps.

**Target user.** Anyone who wants AI-level budgeting insight — spend analysis, forecasting,
proactive nudges — without connecting their bank accounts to a third-party service. In
practice: privacy-conscious individuals and households who are comfortable manually entering
transactions or importing a CSV they exported themselves.

**AI solution.** A conversational assistant, automatic recaps, cash-flow forecasting with
what-if scenarios, subscription/anomaly detection, and behavioral nudging — all narrated by
an LLM but computed from a deterministic analytics layer underneath, so every feature has a
non-AI fallback and the model never invents a number it wasn't given. The LLM backend is
pluggable: a fully local/self-hosted model (Ollama, LM Studio) for maximum privacy, or the
Claude API when cloud inference is preferred (`LLM_PROVIDER` in `backend/.env`).

**Success criteria.**
1. A user can register, log in, and fully track transactions/budgets/goals with zero
   third-party bank connections.
2. The AI Assistant answers spending questions using only the user's own data — no
   hallucinated numbers, verifiable against the deterministic analytics endpoints.
3. Weekly/monthly recaps and behavioral nudges generate automatically via a background
   scheduler, with no manual step required.
4. Every AI feature keeps working (with a templated/rule-based fallback) if the LLM is
   disabled or unreachable — `LLM_ENABLED=false` never breaks functionality.
5. The app is deployed on AWS Free Tier, publicly reachable, and gated behind a real login
   (hashed passwords, working logout, no user data exposed on public endpoints).

## Quick start (Docker Compose — recommended)

```bash
cp backend/.env.example backend/.env
# edit backend/.env: set a real SECRET_KEY, LLM_BASE_URL if you run a local model, and
# SCHEDULER_ENABLED=true if you want automatic weekly/monthly recaps + daily nudges
# (safe here since Docker runs a single backend process — see "AI features" below)

docker compose up --build
```

- Frontend: http://localhost:8080
- Backend API + docs: http://localhost:8000/docs

First run: register an account from the login screen (this creates your user in the local
SQLite database, which lives in the `budget-data` Docker volume).

## Running without Docker (local dev)

Requires **Python 3.12** and **Node 20**.

```bash
# Backend
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — Vite proxies `/api` to `http://localhost:8000`.

## Checklist for a fresh server

1. Install Docker + Docker Compose (or Python 3.12 / Node 20 for the non-Docker path).
2. Clone/copy this repo onto the server.
3. `cp backend/.env.example backend/.env` and set a real `SECRET_KEY`
   (`python3 -c "import secrets; print(secrets.token_hex(32))"`).
4. Decide on the LLM endpoint (see below) or set `LLM_ENABLED=false`.
5. `docker compose up -d --build`.
6. Visit the frontend URL, register your account, add your accounts and categories.
7. Export CSVs from your bank(s) and import them via **Transactions → Import CSV**.
8. Set up a periodic backup of the `budget-data` volume (see below).

## Configuring or disabling the LLM

Two providers are supported, selected with `LLM_PROVIDER` in `backend/.env`:

- `LLM_PROVIDER=local` (default) — a self-hosted, OpenAI-compatible endpoint. Financial data
  never leaves the machine running the model.
- `LLM_PROVIDER=claude` — the Anthropic API. Set `ANTHROPIC_API_KEY` (from
  console.anthropic.com — set a spend cap there) and optionally `ANTHROPIC_MODEL`. Financial
  data in prompts is sent to Anthropic; only use this mode if that tradeoff is acceptable for
  your deployment.

Both go through the same `llm_client.chat()` interface, so every AI feature and its
deterministic fallback behave identically regardless of provider.

### Local provider setup

The default config assumes [Ollama](https://ollama.com) running on the host:

```bash
ollama pull llama3.1
ollama serve   # exposes http://localhost:11434/v1
```

In `backend/.env`:

```
LLM_ENABLED=true
LLM_BASE_URL=http://host.docker.internal:11434/v1   # Mac/Windows Docker Desktop
LLM_MODEL=llama3.1
```

On native Linux, `host.docker.internal` isn't available by default — either add
`extra_hosts: ["host.docker.internal:host-gateway"]` to the `backend` service in
`docker-compose.yml`, or point `LLM_BASE_URL` at another container/IP running your model
server (LM Studio, vLLM's OpenAI server, etc. all work — anything OpenAI-compatible).

To turn LLM features off entirely (categorization falls back to keyword rules, "Ask" falls
back to templated summaries — nothing breaks):

```
LLM_ENABLED=false
```

`GET /api/v1/llm/status` reports whether the endpoint is currently reachable; the Assistant
page shows this live.

## AI features

Five features sit on top of the deterministic analytics layer, all going through one
module — `backend/app/services/ai_gateway.py` — that is the **only** code allowed to call
the LLM HTTP API. Every one of them has a deterministic, no-LLM fallback, so
`LLM_ENABLED=false` degrades quality but never breaks functionality.

| Feature | Backend | Frontend |
|---|---|---|
| Conversational assistant | `POST /assistant/query` — keyword-routes the question to the relevant `/analytics/*` calls, then asks the LLM to answer using only that JSON | **Assistant** page — chat UI with history, suggested questions, LLM/deterministic badge |
| Weekly/monthly recaps | `POST /recaps/generate`, `GET /recaps` — `app/services/recap_builder.py` computes income/expense/savings-rate/net-worth-delta/category-deltas for the period, `ai_gateway.generate_recap` turns it into bullet points; a background scheduler (`app/services/scheduler.py`, APScheduler) runs this automatically (Mon 06:00 for weekly, 1st-of-month 06:00 for monthly) when `SCHEDULER_ENABLED=true` | **Recaps** page — history list + detail view with key numbers |
| Forecasting & what-if scenarios | `GET /forecast/cashflow?days=30\|60\|90` (trailing-3-month averages + known recurring charges, projected forward), `POST /forecast/scenario` (category % or goal $ adjustments → projected net cash + goal timeline impact); `POST /assistant/scenario` lets the LLM parse a free-text question into the same adjustment JSON (regex fallback if the LLM can't parse it) and then narrates the result | **Forecasts** page — cash-flow chart, a form-based scenario builder, and a plain-English scenario question box |
| Subscription & anomaly detection | `GET /analytics/subscriptions`, `GET /analytics/subscriptions/anomalies` (new recurring patterns + price increases, built on the existing recurring-detection heuristics), `GET /analytics/anomalies` (per-category z-score outlier detection over a trailing 6-month baseline); `GET /assistant/subscriptions` and `GET /assistant/anomalies` add an LLM narrative on top | **Subscriptions** and **Anomalies** pages |
| Behavioral nudging | `GET /analytics/behavior-signals` (budget adherence %, goal pace, weekend-vs-weekday spend ratio); `app/services/nudge_rules.py` is a plain rule engine (budget ≥80% used mid-period, 3-consecutive-period overspend, goal falling behind pace, notable weekend spending) that raises **nudge events**, deduped for 7 days, each phrased by `ai_gateway.generate_nudge_message`; runs daily via the scheduler | **Coach** page — nudge feed with dismiss + jump-to-context links |

All five are also independently triggerable via API for local dev without waiting on the
scheduler: `POST /recaps/generate`, `POST /nudges/generate`.

**Where the LLM boundary actually is:** nothing outside `ai_gateway.py` constructs a prompt
or imports `llm_client` directly (except `llm.py`'s legacy `/llm/categorize` and `/llm/ask`
routes, kept for backward compatibility with the earlier CSV-categorization feature — new
code should go through `ai_gateway`). Every `ai_gateway` function takes already-computed
analytics data as input, never a raw DB session, and every prompt states explicitly that the
model must only use the supplied JSON and must not give investment/tax/legal advice.

**Privacy guarantee (local provider):** with `LLM_PROVIDER=local`, no analytics or AI feature
ever calls an external API. The endpoint is configurable but defaults to `localhost`; if you
point it at a real local model (Ollama, LM Studio, vLLM), your financial data never leaves
the machine running that model. Switching to `LLM_PROVIDER=claude` trades this guarantee for
cloud inference — analytics JSON (not raw transaction rows, but aggregated numbers) is sent
to Anthropic in each prompt. Turn `LLM_ENABLED=false` to remove the LLM from the picture
entirely and get keyword-rule / templated-summary behavior everywhere, regardless of provider.

To enable the background scheduler (weekly/monthly recaps + daily nudges) in a real
deployment, set in `backend/.env`:

```
SCHEDULER_ENABLED=true
```

It's `false` by default so `--reload` dev servers and test runs don't accidentally spin up
duplicate cron jobs.

## Backup and restore

SQLite is a single file, so backup is just copying it:

```bash
# Backup (Docker)
docker compose exec backend sh -c "cp /app/data/app.db /app/data/app.db.bak"
docker cp $(docker compose ps -q backend):/app/data/app.db.bak ./budget-tracker-backup-$(date +%F).db

# Restore
docker cp ./budget-tracker-backup-2026-08-14.db $(docker compose ps -q backend):/app/data/app.db
docker compose restart backend
```

Alternatively, use the in-app export: **sidebar → Export** (or `GET /api/v1/export/json` /
`/export/csv`) to download a portable JSON/CSV snapshot of your data independent of the
database engine.

## Switching to Postgres

Set `DATABASE_URL=postgresql+psycopg2://budget:budget@postgres:5432/budget_tracker` in
`backend/.env`, uncomment the `postgres` service and `postgres-data` volume in
`docker-compose.yml`, add `psycopg2-binary` to `backend/requirements.txt`, then
`alembic upgrade head` against the new database. No application code changes needed —
SQLAlchemy/Alembic are database-agnostic here.

## Running the backend tests

```bash
cd backend
source .venv/bin/activate
pip install -r requirements-dev.txt
python -m pytest tests/ -v
```

Tests run against a temp SQLite file with `LLM_ENABLED=false` and `SCHEDULER_ENABLED=false`
(set in `tests/conftest.py` before any app import), so they exercise the deterministic
fallback path by default — the same path your real deployment falls back to if the local
LLM goes offline. A couple of tests monkeypatch `llm_client.chat` directly to confirm the
"llm" path (routing, prompt construction, response labeling) also works without needing a
real model running.

## Project layout

```
backend/
  app/
    api/routes/    one router per resource, incl. assistant.py, forecast.py, recaps.py, nudges.py
    services/      analytics.py, forecasting.py, ai_gateway.py, llm_client.py, recap_builder.py,
                   nudge_rules.py, recurring_detection.py, scheduler.py, csv_import.py, categorize.py
    models/        SQLAlchemy models (Recap, NudgeEvent added alongside the core entities)
  tests/           pytest suite (analytics correctness + assistant/recap/nudge integration flows)
frontend/    React + TypeScript + Vite + Tailwind + Recharts
  src/pages/       Assistant.tsx, Forecasts.tsx, Subscriptions.tsx, Anomalies.tsx, Coach.tsx, Recaps.tsx
                   alongside the core Dashboard/Transactions/Budgets/etc. pages
legacy-static/   original localStorage-only prototype (kept for reference)
hello-contest/   separate Create React App + Amplify/Cognito scaffold — not part of the Budget
                 Tracker app; it's the standalone "Hello World + Login" checkpoint from the
                 contest's AWS setup guide, deployed independently via the root amplify.yml
```

## License

Proprietary and confidential — all rights reserved. See [LICENSE](LICENSE) for details.
