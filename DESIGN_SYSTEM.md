# Design System

A calm, analytical, ledger-inspired light theme — warm cream-and-ink instead of the generic
white-and-blue that most AI-generated fintech dashboards default to. Numbers are set in a serif
(Fraunces) for an edited, considered feel; UI chrome stays in a functional grotesque (Inter) so
the two typefaces do different jobs and the pairing reads as a decision, not a default.

This document describes the theme that is actually implemented in `tailwind.config.js` and
`src/styles/index.css`. An earlier version of this doc specified a dark ink-and-brass theme that
was never built — the app has been light-themed since its first commit. Dark mode is a real,
separate v2 project (with its own contrast/legibility QA), not a variant of this doc.

## Color tokens

Defined in `tailwind.config.js` under `theme.extend.colors`. Treat this file as the single
source of truth — never hardcode a hex value in a component or in `index.css` when a token
already exists; add a token instead.

```js
colors: {
  canvas:           "#fbfaf7",  // page background
  surface:          "#fffefd",  // card background
  "surface-raised":  "#f5f0e7",  // hover / nested surface
  "surface-sunken":  "#f8f5ef",  // track / recessed surface
  border: {
    DEFAULT: "#e9dcc5",
    subtle:  "#eee7db",
  },
  "border-strong":  "#ddc9a3",  // scrollbar/hover-only, never a default border

  ink:              "#1d201d",  // primary text — use with /90 /70 /60 /50 /40 /30 opacity

  income:           "#3f825f",
  "income-deep":    "#24573e",
  "income-bg":      "#eaf3e9",
  expense:          "#c85d43",
  "expense-bg":     "#faece7",
  warning:          "#b97815",
  "warning-bg":     "#fdf1de",
  info:             "#6ea4bb",
  "info-bg":        "rgba(110,164,187,0.12)",

  accent:           "#cf8e27",  // brass — primary interactive, money-adjacent without cliché blue
  "accent-bg":      "#fff5e3",
  "accent-soft":    "#f1d9ae",  // selection highlight, soft accent fills

  brand: {
    mark:        "#dfa94b",   // wordmark tile — deliberately lighter/warmer than --accent
    "mark-border": "#d9a84f",
  },
}
```

Category chart palette (fixed order per category, assigned at creation): `#cf8e27, #3f825f,
#6ea4bb, #c85d43, #9b7ebd, #d4b483, #6e8fa3, #b5a45c, #a85c7c, #7a7268`.

`color-scheme: light` on `<html>`; light-only for v1 — the cream canvas *is* the app's identity,
not a placeholder waiting for dark mode.

## Typography

Two families, two jobs:

- **Fraunces** (`font-display`) — page titles, the wordmark, and every currency figure via the
  `.numeral` utility (weight 600, tabular figures, tight tracking). This is what keeps the app
  from reading as a generic dashboard template — numbers get weight and character instead of
  disappearing into another sans-serif grid.
- **Inter** (`font-sans`, the default) — nav, labels, table rows, buttons, body copy. Never used
  for hero numbers.

| Token       | Size / Line height | Family / Weight        | Use |
|-------------|---------------------|-------------------------|-----|
| Page H1     | 28px / 34px         | Fraunces 600            | Page titles |
| `.numeral`  | inherit, tabular    | Fraunces 600            | Every currency figure — dashboard stats, budget suggestions, plan cards, table amounts |
| Panel title | 14–16px             | Inter 600 (`.panel-title`) | Card/section headers |
| Body        | 14px / 20px         | Inter 400–500           | Table rows, form labels |
| Caption     | 12px / 16px         | Inter 500               | Metadata, timestamps, `.panel-subtitle` |

Currency formatting: no cents on hero numbers (`$4,213`), cents in tables/forms (`$4,212.87`).
Negative amounts render in `--expense` with a leading `–`, never parentheses.

The wordmark is a lowercase italic Fraunces "b" in a brass tile (`.brand-mark`), paired with the
italic "Budget Tracker" logotype — a deliberate mark instead of a generic icon-in-a-colored-square.

**Rule: apply `.numeral` to every rendered currency amount, no exceptions** — including inside
suggestion/plan cards, not just top-level stat tiles. A number set in the default sans is a bug,
not a style choice.

## Layout

- Fixed left sidebar (240px): wordmark, primary nav (Dashboard, Transactions, Cash Flow,
  Categories & Budgets, Accounts, Recurring), a secondary "AI Insights" group (Assistant,
  Forecasts, Subscriptions, Anomalies, Coach, Recaps), Settings + logout at the bottom.
- Content area: 16–32px padding, max content width 1280px.
- Dashboard = stat row (Income/Expenses/Net) → budget status card → 2-column chart row
  (category donut + cashflow bars) → upcoming charges / net worth row.

## Components

- **Card** (`.card`): `--surface` bg, 16px radius, 1px `--border-subtle`, 20px padding, soft
  double-layer shadow (`0_1px_2px` contact shadow + `0_10px_28px` ambient shadow, both warm-toned
  rgba — never a neutral/black shadow, which reads as a dark-theme leftover on a light surface).
- **StatCard**: label (caption) + `.numeral` big number + tone-colored icon chip; lifts 2px and
  deepens its ambient shadow on hover.
- **Charts** (Recharts): gridlines at `--border-subtle`, axis labels in a muted warm gray,
  tooltips styled as `--surface-raised` cards; category charts use the fixed `--cat-*` order.
- **Budget progress bar**: 6px track on `--surface-sunken`, fill in category color with a rounded
  cap, switches to `--expense` past 100%. Pair every bar with a right-aligned `spent / limit`
  caption in tabular figures so the number and the bar tell the same story at a glance.
- **Table** (transactions): sticky header, 44px rows, right-aligned tabular amounts, row hover
  `--surface-raised`.
- **Buttons**: primary = `--accent` fill, white text; secondary = transparent + `--border`;
  destructive = `--expense` text, `--expense-bg` on hover. Keep destructive actions (delete)
  low-emphasis until hovered — a budgeting app should never make "delete" visually loud.
- **Forms/modals**: `--surface-raised` panel, inputs on `--surface`, focus ring `--accent` at 60%
  via `color-mix()`, never a raw un-tokenized rgba.

## Interaction patterns

- Hover: 120–150ms ease, no layout shift.
- Focus: visible ring always, 2px `--accent` at 60% opacity, offset 2px.
- Loading: skeleton blocks, not spinner-only panels.
- Empty states: one-line explanation + primary action, never a bare `—`.

## Principles

1. **Numbers are the product.** Every screen exists to answer "how much" — the serif numeral
   treatment and tabular figures make that the visual anchor, not a footnote. If it's a dollar
   amount, it wears `.numeral`.
2. **Warm, not corporate-blue.** Brass/terracotta/sage over the default SaaS blue-on-white so the
   app doesn't read as an unmodified AI template.
3. **No landing-page moves.** No hero sections, no centered marketing copy, no gradients — every
   page is cards, tables, and charts arranged for scanning, not persuading.
4. **One accent, used sparingly.** Brass (`--accent`) marks the single primary action per view;
   everything else stays neutral so it doesn't compete with the data.
5. **One source of truth for color.** Every color used anywhere in the app traces back to a
   token in `tailwind.config.js`. A hardcoded hex in a component or in `index.css` is a defect —
   add a token instead of copying a value.
