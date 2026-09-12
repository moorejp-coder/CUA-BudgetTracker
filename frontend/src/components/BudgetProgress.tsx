import type { Budget } from "@/types";
import { formatCurrency } from "@/lib/format";
import { getCategoryIcon } from "@/lib/categoryIcon";

export default function BudgetProgress({ budget, right }: { budget: Budget; right?: React.ReactNode }) {
  const effectiveLimit = budget.amount + budget.rolled_over_amount;
  const pct = effectiveLimit > 0 ? Math.min(100, (budget.spent / effectiveLimit) * 100) : 0;
  const over = budget.spent > effectiveLimit;
  const Icon = getCategoryIcon(budget.category.name);
  const note = over
    ? `${formatCurrency(budget.spent - effectiveLimit, 0)} over budget`
    : budget.rollover && budget.rolled_over_amount > 0
      ? `+${formatCurrency(budget.rolled_over_amount, 0)} rolled over`
      : null;

  return (
    <div className="group -mx-2 px-2 py-1.5 rounded-lg transition-colors hover:bg-surface-raised/60">
      <div className="flex flex-col gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_110px_auto] sm:items-center sm:gap-4 text-[15px]">
        <span className="flex items-center gap-3 font-medium text-ink min-w-0 truncate">
          <span
            className="category-icon"
            style={{ background: `${budget.category.color}1a`, color: budget.category.color }}
          >
            <Icon />
          </span>
          {budget.category.name}
        </span>
        <div className="flex items-center justify-between gap-3 sm:contents">
          <span className="numeral text-sm text-ink/70 whitespace-nowrap sm:text-right">
            {formatCurrency(budget.spent, 0)} <span className="text-ink/35">/</span> {formatCurrency(effectiveLimit, 0)}
          </span>
          {right}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <div className="h-2 flex-1 rounded-full bg-surface-sunken overflow-hidden shadow-[inset_0_1px_2px_rgba(74,54,27,0.08)]">
          <div
            className="h-full rounded-full transition-[width] duration-300 ease-out"
            style={{ width: `${Math.max(pct, budget.spent > 0 ? 3 : 0)}%`, background: over ? "#c85d43" : budget.category.color }}
          />
        </div>
        <span className={`numeral text-[11px] w-9 text-right tabular-nums ${over ? "text-expense" : "text-ink/35"}`}>
          {Math.round(pct)}%
        </span>
      </div>
      {note && <div className={`text-xs mt-1 ${over ? "text-expense font-medium" : "text-ink/40"}`}>{note}</div>}
    </div>
  );
}
