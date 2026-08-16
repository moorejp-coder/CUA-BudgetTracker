# Roadmap

Milestones are organized by phase rather than calendar dates (the dates in the onboarding
docs turned out to be stale — see PROJECT.md history). Each phase maps to a gate in the
contest's milestone checklist. Check items should become GitHub issues as they're picked up.

## Phase 1 — Foundation (contest "Week 1" gate)

- [x] Public-facing thesis committed (README problem/users/success-criteria section)
- [x] GitHub repository created, initial commit, iterative history
- [x] AWS Free Tier account active — billing alerts + root MFA enabled
- [x] Tech stack locked: FastAPI + React/TypeScript, Docker Compose, SQLite
- [x] Hello-world deployed with a real login screen, reachable at a public URL — the Budget
      Tracker app itself, on EC2 (see README). The contest's separate Amplify+Cognito
      "Hello World" checkpoint also exists in-repo at `hello-contest/` (its own
      `amplify.yml`), submitted independently and not part of the Budget Tracker deploy.
- [x] `deploy.sh` — one-command pull + rebuild on the server
- [ ] Repository flipped from private to **public** (required before submission)
- [ ] License question resolved with Prof. Yoest (proprietary vs. contest's MIT-or-similar requirement)

## Phase 2 — Core build (contest "Week 2" gate)

- [x] Data model + schema (accounts, transactions, categories, budgets, goals — see
      ARCHITECTURE.md for the ER diagram)
- [x] Core user flow works end-to-end without AI: register → add account → add transaction →
      view dashboard
- [x] First real AI call wired up and rendering to the user (Assistant chat)
- [x] Secrets handled correctly: `.env` gitignored, `.env.example` committed, server `.env`
      populated directly over SSH (never through chat/commit history)
- [x] Claude API added as a second LLM provider alongside the local/self-hosted option

## Phase 3 — AI depth, security, UX (contest "Week 3" gate)

- [x] Primary AI features complete end-to-end: conversational assistant, recaps, forecasting
      + what-if scenarios, subscription/anomaly detection, behavioral nudging
- [x] Every AI feature has a deterministic, no-LLM fallback (verified via test suite with
      `LLM_ENABLED=false`)
- [x] Access control hardened — confirmed hashed passwords, working session/token refresh, and
      logout; every route requires auth except `/health`; ownership checks verified on every
      `db.get(...)` lookup (no IDOR); password length now enforced server-side, not just in
      the React form; `/llm/status` no longer unauthenticated
- [x] PII separation audit — confirmed no user data in URLs, logs, or public API responses;
      export endpoints correctly scoped to the requesting user
- [x] Error handling pass — backend has no debug mode, so unhandled exceptions return generic
      500s, not stack traces; added a React ErrorBoundary so a frontend crash shows a friendly
      message instead of a blank screen
- [ ] UX pass with a non-technical tester — labels, button copy. Mobile layout done: fixed a
      sidebar that broke the app entirely on phones, plus grid/table overflow across every
      page (see commit `1c10e58`); still need a real non-technical tester for copy/labels

## Phase 4 — Polish, package, submit

- [ ] Feature freeze — bug fixes and docs only after this point
- [x] One-page summary written (problem, solution, AI usage, key learnings) — PDF in repo
- [ ] 5–10 minute demo script prepared and rehearsed at least once
- [ ] README screenshots/demo GIF added
- [x] Live URL confirmed stable — Elastic IP allocated and associated (`54.175.240.105`),
      survives instance stop/restart
- [ ] Final repo cleanup: no secrets in history (checked — clean) and no broken links
      (checked — clean); license still needs to be finalized (see known risks)

## Known risks

- **Repo visibility.** Currently private; must be public before judges can review commit
  history (15% of the score).
- **License.** Currently proprietary; contest rules ask for MIT-or-similar. Needs a decision
  from Prof. Yoest.
