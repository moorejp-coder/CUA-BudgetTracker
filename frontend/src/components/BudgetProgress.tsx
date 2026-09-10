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
      <div className="grid grid-cols-[minmax(0,1fr)_110px_auto] items-center text-sm gap-4">
        <span className="flex items-center gap-2.5 font-medium min-w-0 truncate">
          <span
            className="category-icon"
            style={{ background: `${budget.category.color}1a`, color: budget.category.color }}
          >
            <Icon />
          </span>
          {budget.category.name}
        </span>
        <span className="numeral text-[13px] text-ink/60 text-right whitespace-nowrap">
          {formatCurrency(budget.spent, 0)} <span className="text-ink/35">/</span> {formatCurrency(effectiveLimit, 0)}
        </span>
        {right}
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
