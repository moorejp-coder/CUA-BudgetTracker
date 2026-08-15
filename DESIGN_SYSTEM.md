# Design System

Copilot Money–inspired: a cinematic dark navy canvas, charts as first-class UI, confident
numerals, calm semantic color.

## Color tokens

```css
:root {
  /* Canvas */
  --canvas:        #0b0e1a;   /* page background */
  --surface:       #111524;   /* card/panel background */
  --surface-raised: #171c33;  /* modal, popover, hovered card */
  --surface-sunken: #080a13;  /* insets, table header */
  --border:        #232948;
  --border-subtle: #1a1f38;

  /* Text */
  --text-primary:   rgba(255,255,255,0.92);
  --text-secondary: rgba(255,255,255,0.62);
  --text-muted:     rgba(255,255,255,0.40);

  /* Semantic */
  --income:    #34d399;   /* green */
  --income-bg: rgba(52,211,153,0.12);
  --expense:   #f87171;   /* red */
  --expense-bg: rgba(248,113,113,0.12);
  --warning:   #fbbf24;   /* amber */
  --warning-bg: rgba(251,191,36,0.12);
  --accent:    #5b8def;   /* blue — primary interactive */
  --accent-bg: rgba(91,141,239,0.14);

  /* Category palette (charts) — desaturated, distinguishable in dark mode */
  --cat-1: #5b8def;  --cat-2: #34d399;  --cat-3: #f59e0b;  --cat-4: #f87171;
  --cat-5: #a78bfa;  --cat-6: #22d3ee;  --cat-7: #f472b6;  --cat-8: #84cc16;
  --cat-9: #fb923c;  --cat-10: #64748b;
}
```

Light mode is out of scope for v1 (Copilot's identity *is* the dark canvas); the app ships
dark-only, with `color-scheme: dark` set on `<html>`.

## Typography

Font stack: `"Inter", -apple-system, "Segoe UI", sans-serif` (Inter for numerals — good
tabular-figure support via `font-variant-numeric: tabular-nums`).

| Token         | Size / Line height | Weight | Use |
|---------------|---------------------|--------|-----|
| `display-lg`  | 40px / 44px         | 700    | Net worth / hero dashboard number |
| `display-md`  | 28px / 34px         | 700    | Card headline numbers (income, spend) |
| `heading`     | 18px / 24px         | 600    | Panel titles |
| `body`        | 14px / 20px         | 400–500| Table rows, form labels |
| `caption`     | 12px / 16px         | 500    | Metadata, timestamps, badges |
| `mono-figure` | inherit             | 600    | All currency values — `font-variant-numeric: tabular-nums` |

Currency formatting: no cents on hero numbers (`$4,213`), cents shown in tables and forms
(`$4,212.87`). Negative amounts render in `--expense` with a leading `–`, not parentheses.

## Layout

- Fixed left sidebar (240px): logo, nav (Dashboard, Transactions, Cash Flow, Categories &
  Budgets, Accounts, Goals, Recurring, Ask), account switcher/user menu at bottom.
- Content area: 24–32px padding, max content width 1280px, 16px gap grid.
- Dashboard = 12-column responsive grid: hero stat row (3 cards), 2-column chart row
  (cash-flow line + category donut), then full-width rows for recurring/upcoming and net
  worth.

## Components

- **Card**: `--surface` bg, 16px radius, 1px `--border-subtle`, 20px padding, subtle shadow
  (`0 1px 2px rgba(0,0,0,.4)`). Hover state only on interactive cards (`--surface-raised`).
- **StatCard**: label (`caption`, `--text-secondary`) + big number (`display-md`) + delta
  chip (`+4.2%` in `--income`/`--expense` bg pill).
- **Charts**: no gridlines heavier than `--border-subtle`; axis labels `caption`/`--text-muted`;
  tooltips are `--surface-raised` cards with a 1px border, currency formatted; category charts
  use the `--cat-*` palette in a fixed, stable order per category (assigned at category
  creation, not re-randomized).
- **Table** (transactions): sticky header on `--surface-sunken`, 44px rows, category shown as
  a colored dot + emoji + name pill, right-aligned tabular amounts, row hover
  `--surface-raised`, checkbox column for bulk actions appears on hover/selection.
- **Budget progress bar**: track `--surface-sunken`, fill in category color, switches to
  `--expense` past 100%, caption below (`$320 of $400 · rolls over`).
- **Forms/modals**: `--surface-raised` panel, 12px radius, inputs use `--surface-sunken` bg
  with `--border` outline, focus ring `--accent` at 40% opacity, 2px.
- **CSV Import Wizard**: 3-step horizontal stepper (Upload → Map Columns → Review & Confirm),
  each step a full-width card; column mapping step shows a live preview table of the first 5
  rows re-rendered with mapped field names as the user adjusts dropdowns.
- **Buttons**: primary = `--accent` fill, white text, 8px radius; secondary = transparent with
  `--border`; destructive = `--expense` text on transparent, `--expense-bg` on hover.

## Interaction patterns

- Hover: 120ms ease background/border transition, no layout shift.
- Focus: visible focus ring always (keyboard users), 2px `--accent` at 40% opacity offset 2px.
- Chart hover → tooltip + optional "click to filter" (clicking a category slice filters the
  Transactions table by that category and navigates there).
- Loading: skeleton blocks (`--surface-raised` shimmer), never spinners-only for data panels.
- Toasts for async confirmation (transaction saved, CSV import committed), bottom-right,
  `--surface-raised`, auto-dismiss 4s.
- Empty states: icon + one-line explanation + primary action (e.g. Transactions empty →
  "No transactions yet" + "Add manually" / "Import CSV" buttons).
