# Design System

A calm, analytical, ledger-inspired dark theme — warm ink-and-brass instead of the generic
navy-and-blue that most AI-generated fintech dashboards default to. Numbers are set in a serif
(Fraunces) for an edited, considered feel; UI chrome stays in a functional grotesque (Inter) so
the two typefaces do different jobs and the pairing reads as a decision, not a default.

## Color tokens

```css
:root {
  /* Canvas — warm charcoal, not blue-black */
  --canvas:        #0d0c0a;
  --surface:        #17140f;
  --surface-raised: #211c15;
  --surface-sunken: #090806;
  --border:        #332c21;
  --border-subtle: #221d16;

  /* Text */
  --text-ink:       #faf7f2;             /* warm off-white, use with opacity: /90 /60 /40 */

  /* Semantic */
  --income:    #4fae7b;   /* grounded green, not neon */
  --income-bg: rgba(79,174,123,0.12);
  --expense:   #c6604a;   /* clay/terracotta, not stock red */
  --expense-bg: rgba(198,96,74,0.12);
  --warning:   #e08a3c;
  --warning-bg: rgba(224,138,60,0.12);
  --info:      #4fa3c4;
  --info-bg:   rgba(79,163,196,0.12);
  --accent:    #c99a4b;   /* brass/gold — primary interactive, money-adjacent without cliché blue */
  --accent-bg: rgba(201,154,75,0.14);

  /* Category palette (charts) — warm/cool mix, fixed order per category */
  --cat-1: #c99a4b;  --cat-2: #4fae7b;  --cat-3: #4fa3c4;  --cat-4: #c6604a;
  --cat-5: #9b7ebd;  --cat-6: #d4b483;  --cat-7: #6e8fa3;  --cat-8: #b5a45c;
  --cat-9: #a85c7c;  --cat-10: #7a7268;
}
```

Dark-only for v1 (`color-scheme: dark` on `<html>`); light mode is intentionally out of scope —
the dark canvas *is* the app's identity, not a preference toggle.

## Typography

Two families, two jobs:

- **Fraunces** (`font-display`) — page titles, the wordmark, and every currency figure. Weight
  600 for headings, 500–600 for numerals, italic for the wordmark and login copy. This is what
  keeps the app from reading as a generic dashboard template — numbers get weight and character
  instead of disappearing into another sans-serif grid.
- **Inter** (`font-sans`, the default) — nav, labels, table rows, buttons, body copy. Never used
  for hero numbers.

| Token       | Size / Line height | Family / Weight        | Use |
|-------------|---------------------|-------------------------|-----|
| Page H1     | 28px / 34px         | Fraunces 600            | Page titles |
| `numeral`   | inherit, tabular    | Fraunces 600            | All currency figures — apply the `.numeral` utility class |
| Panel title | 14px / 20px         | Inter 600               | Card/section headers |
| Body        | 14px / 20px         | Inter 400–500           | Table rows, form labels |
| Caption     | 12px / 16px         | Inter 500               | Metadata, timestamps |

Currency formatting: no cents on hero numbers (`$4,213`), cents in tables/forms (`$4,212.87`).
Negative amounts render in `--expense` with a leading `–`, never parentheses.

The wordmark is a lowercase italic Fraunces "b" in a brass tile, paired with the italic
"Budget Tracker" logotype — a deliberate mark instead of a generic icon-in-a-colored-square.

## Layout

- Fixed left sidebar (240px): wordmark, primary nav (Dashboard, Transactions, Cash Flow,
  Categories & Budgets, Accounts, Goals, Recurring), a secondary "AI Insights" group (Assistant,
  Forecasts, Subscriptions, Anomalies, Coach, Recaps), logout at the bottom.
- Content area: 16–32px padding, max content width 1280px.
- Dashboard = stat row (Income/Expenses/Net) → budget status card → 2-column chart row
  (category donut + cashflow bars) → upcoming charges / net worth row.

## Components

- **Card** (`.card`): `--surface` bg, 16px radius, 1px `--border-subtle`, 20px padding.
- **StatCard**: label (caption) + `.numeral` big number + tone-colored icon chip.
- **Charts** (Recharts): gridlines at `--border-subtle`, axis labels in a muted warm gray
  (`#8a7d68`), tooltips styled as `--surface-raised` cards; category charts use the `--cat-*`
  palette in a fixed order per category (assigned at creation).
- **Budget progress bar**: track `--surface-sunken`, fill in category color, switches to
  `--expense` past 100%.
- **Table** (transactions): sticky header, 44px rows, right-aligned tabular amounts, row hover
  `--surface-raised`.
- **Buttons**: primary = `--accent` fill; secondary = transparent + `--border`; destructive =
  `--expense` text, `--expense-bg` on hover.
- **Forms/modals**: `--surface-raised` panel, inputs on `--surface-sunken`, focus ring
  `--accent` at 40% opacity.

## Interaction patterns

- Hover: 120ms ease, no layout shift.
- Focus: visible ring always, 2px `--accent` at 60% opacity, offset 2px.
- Loading: skeleton blocks, not spinner-only panels.
- Empty states: one-line explanation + primary action.

## Principles

1. **Numbers are the product.** Every screen exists to answer "how much" — the serif numeral
   treatment and tabular figures make that the visual anchor, not a footnote.
2. **Warm, not corporate-blue.** Brass/terracotta/sage over the default SaaS blue-on-navy so the
   app doesn't read as an unmodified AI template.
3. **No landing-page moves.** No hero sections, no centered marketing copy, no gradients — every
   page is cards, tables, and charts arranged for scanning, not persuading.
4. **One accent, used sparingly.** Brass (`--accent`) marks the single primary action per view;
   everything else stays neutral so it doesn't compete with the data.
