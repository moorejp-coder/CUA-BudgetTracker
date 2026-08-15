# Architecture

Self-hosted personal finance app. No bank APIs, no aggregators. All data enters via manual
entry or CSV upload. Everything runs on a server you control (a home server, a NAS, a small
VPS, or just `docker compose up` on your Mac).

## Stack

| Layer      | Choice                                                                 | Why |
|------------|-------------------------------------------------------------------------|-----|
| Backend    | **FastAPI** (Python 3.12)                                              | Typed, async, auto-generated OpenAPI docs, small footprint, easy to read/extend as a solo dev |
| ORM/DB     | **SQLAlchemy 2.0 + SQLite** (file-backed, `alembic` migrations)         | Zero-ops single-file DB, trivial backup (`cp app.db app.db.bak`); swappable to Postgres by changing `DATABASE_URL` — the code is DB-agnostic |
| Auth       | **JWT** (access + refresh) via `python-jose` + `passlib[bcrypt]`        | Stateless, works fine for a private single/few-user deployment |
| Frontend   | **React 18 + TypeScript + Vite**                                       | Fast dev loop, huge ecosystem, no server component needed |
| Styling    | **Tailwind CSS** + small custom design-token layer                     | Matches the "dark navy canvas + cards" Copilot look without a heavy component framework |
| Charts     | **Recharts**                                                            | Composable, good tooltip/interaction support, React-native |
| Data fetching | **TanStack Query**                                                  | Caching, invalidation, optimistic updates for CRUD screens |
| Tables     | **TanStack Table**                                                     | Sortable/filterable transaction grid with bulk-edit |
| LLM        | Abstracted client hitting an **OpenAI-compatible local endpoint** (default `http://localhost:11434/v1`, e.g. Ollama) | Swappable/disable-able; app is 100% functional with it off |
| Deployment | **Docker Compose** (backend, frontend, optional Postgres) | One command to run everywhere |

## Repository layout

```
Budget Tracker/
├── legacy-static/          # original localStorage prototype (kept for reference)
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/            # config, security
│   │   ├── db/               # engine/session, base
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic request/response models
│   │   ├── api/routes/       # one router per resource
│   │   └── services/         # csv import, recurring detection, analytics, llm client
│   ├── alembic/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── api/
│   │   └── styles/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── ARCHITECTURE.md
├── DESIGN_SYSTEM.md
└── README.md
```

## Entity-relationship model

```
User
 ├─< Account            (checking, savings, credit_card, loan, investment, cash)
 ├─< Category           (type: income|expense; name, color, emoji, parent_id for grouping)
 ├─< Transaction         ── belongs to Account, Category (nullable), User
 │                          fields: date, amount (signed decimal), type (income|expense|transfer),
 │                          payee, notes, tags (many-to-many via TransactionTag), source
 │                          (manual|csv), transfer_account_id (for transfers), external_hash
 │                          (for CSV dedupe)
 ├─< Tag                ── many-to-many with Transaction
 ├─< Budget              per Category, per period (month or custom start/end), amount, rollover flag
 ├─< RecurringItem       merchant pattern, expected amount, cadence (weekly/monthly/annual/custom),
 │                        next_expected_date, linked Category, is_confirmed (manual vs suggested)
 ├─< Goal                name, target_amount, target_date, linked Account(s), current_amount (derived)
 ├─< CsvImportTemplate   bank name, column mapping (json), date format, sign convention
 └─< AccountBalanceSnapshot   account_id, date, balance   (for net worth history)
```

Relationships:
- `Account 1—N Transaction`
- `Category 1—N Transaction`, `Category 1—N Budget`, `Category 1—N RecurringItem`
- `Transaction N—N Tag` via join table
- `Goal N—N Account` via join table (a goal can track progress across multiple accounts)
- Everything scoped by `user_id` (row-level ownership, enforced in every query — this is a
  private multi-user-*capable* app but designed for a household running one instance)

## Core API surface (REST, prefixed `/api/v1`)

```
POST   /auth/register
POST   /auth/login                 -> { access_token, refresh_token }
POST   /auth/refresh
GET    /auth/me

GET    /accounts
POST   /accounts
PATCH  /accounts/{id}
DELETE /accounts/{id}
POST   /accounts/{id}/balance-snapshot     # manual balance entry for net worth tracking

GET    /categories
POST   /categories
PATCH  /categories/{id}
DELETE /categories/{id}

GET    /transactions?account_id=&category_id=&tag=&type=&q=&start=&end=&page=
POST   /transactions
PATCH  /transactions/{id}
POST   /transactions/bulk-update          # bulk category/tag assignment
DELETE /transactions/{id}

POST   /csv-imports/preview               # upload file, return parsed rows + column guess
POST   /csv-imports/commit                # commit with confirmed column mapping + template save
GET    /csv-imports/templates
POST   /csv-imports/templates

GET    /budgets?period=2026-08
POST   /budgets
PATCH  /budgets/{id}

GET    /recurring
POST   /recurring
PATCH  /recurring/{id}
GET    /recurring/suggestions             # heuristic-detected candidates from transaction history
GET    /recurring/upcoming?days=30

GET    /goals
POST   /goals
PATCH  /goals/{id}

GET    /analytics/summary?month=2026-08              # income, expense, net, top categories/merchants
GET    /analytics/cashflow?start=&end=&granularity=month
GET    /analytics/spend-by-category?start=&end=
GET    /analytics/net-worth?start=&end=
GET    /analytics/subscriptions                      # confirmed recurring items, normalized to monthly cost
GET    /analytics/subscriptions/anomalies             # new recurring patterns + price increases
GET    /analytics/anomalies?start=&end=                # outlier transactions vs. the user's own category baseline
GET    /analytics/behavior-signals?period=2026-08      # budget adherence, goal pace, weekday/weekend spend ratio

POST   /llm/categorize                    # legacy: { description } -> suggested category (rule-based first, LLM fallback)
POST   /llm/ask                           # legacy: simple single-shot Q&A, superseded by /assistant/query
GET    /llm/status                        # whether the local LLM endpoint is reachable

POST   /assistant/query                   # { question } -> keyword-routed analytics context + LLM (or deterministic) answer
POST   /assistant/scenario                # { question } -> LLM parses adjustments -> /forecast/scenario -> LLM explains
GET    /assistant/subscriptions           # subscriptions + anomalies + LLM narrative summary
GET    /assistant/anomalies?days=30       # spending anomalies + LLM narrative summary

GET    /forecast/cashflow?days=30|60|90               # trailing-3mo averages + upcoming recurring, projected forward
POST   /forecast/scenario                              # { adjustments: [{target, value}], base_months } -> projected impact

GET    /recaps                            # list generated recaps
GET    /recaps/{id}
POST   /recaps/generate                   # { period_type: week|month } -> builds context, calls LLM, stores + returns

GET    /nudges?include_dismissed=         # active behavior-based nudges
POST   /nudges/generate                   # manually run the rule engine (scheduler runs this daily in production)
POST   /nudges/{id}/dismiss

GET    /export/json
GET    /export/csv
```

## Frontend routes

```
/login
/                     Dashboard: budget status, cash-flow chart, spend-by-category, upcoming
                      recurring charges, net worth snapshot
/transactions         Table + filters/search + bulk edit + manual add
/transactions/import  CSV import wizard (upload -> map columns -> preview -> confirm)
/categories           Category & budget management (grouped by income/expense)
/budgets              Monthly budget configuration, progress bars, rollover toggle
/cashflow             Interactive income/expense/net timeline, filterable
/accounts             Account list, balances, manual balance snapshot entry
/goals                Goal cards with progress rings
/recurring            Recurring items list + suggestions + upcoming 30/90-day forecast
/assistant            Chat-style Money Assistant backed by /assistant/query
/forecasts            Cash-flow chart + form-based and natural-language what-if scenarios
/subscriptions        Subscription dashboard: list, monthly total, AI summary, anomalies
/anomalies            Outlier-transaction table + AI summary
/coach                Behavioral nudge feed (dismiss, jump to related category/goal)
/recaps               Weekly/monthly recap history + detail view
```

## LLM integration boundary

- `services/llm_client.py` is the only module that makes the raw HTTP call to an
  OpenAI-compatible `/chat/completions` endpoint. Base URL, model, and enabled flag are env
  vars (`LLM_BASE_URL`, `LLM_MODEL`, `LLM_ENABLED`); `chat()` returns `None` on any failure
  or when disabled, rather than raising.
- `services/ai_gateway.py` is the only module that imports `llm_client` for anything beyond
  the legacy `/llm/*` routes — it's the single call site for every prompt built anywhere in
  the app (assistant answers, recap bullet points, scenario explanations, subscription/
  anomaly summaries, nudge messages). Every function there takes already-computed
  deterministic data as input (never a DB session, never raw transaction rows) and returns
  `(text, source)` where `source` is `"llm"` or `"deterministic"` — every feature has a
  matching deterministic fallback baked into the same function, so `LLM_ENABLED=false` (or a
  down endpoint) degrades quality but never breaks a feature.
- A fixed safety preamble (`ai_gateway.SAFETY_PREAMBLE`) is prepended to every system prompt:
  use only the supplied JSON, never invent numbers, no personalized investment/tax/legal
  advice — redirect to budgeting/spending habits instead.
- Natural-language what-if scenarios (`/assistant/scenario`) are the one place the LLM's
  output feeds back into a deterministic computation: the LLM (or a regex fallback) only
  extracts `{category_or_goal: adjustment}` JSON from the question — the actual forecast math
  runs entirely in `services/forecasting.py`, and only the *results* of that deterministic
  computation go back to the LLM for narration.
