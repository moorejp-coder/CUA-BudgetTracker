import type { Budget } from "@/types";
import { formatCurrency } from "@/lib/format";
import { getCategoryIcon } from "@/lib/categoryIcon";

export default function BudgetProgress({ budget, right }: { budget: Budget; right?: React.ReactNode }) {
  const effectiveLimit = budget.amount + budget.rolled_over_amount;
  const pct = effectiveLimit > 0 ? Math.min(100, (budget.spent / effectiveLimit) * 100) : 0;
  const over = budget.spent > effectiveLimit;
  const Icon = getCategoryIcon(budget.category.name);
  const note = over
    ? "Over budget"
    : budget.rollover && budget.rolled_over_amount > 0
      ? `+${formatCurrency(budget.rolled_over_amount, 0)} rolled over`
      : null;

  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_110px_auto] items-center text-sm gap-4">
        <span className="flex items-center gap-2 font-medium min-w-0 truncate">
          <span
            className="category-icon"
            style={{ background: `${budget.category.color}1a`, color: budget.category.color }}
          >
            <Icon />
          </span>
          {budget.category.name}
        </span>
        <span className="tabular text-ink/60 text-xs text-right whitespace-nowrap">
          {formatCurrency(budget.spent, 0)} / {formatCurrency(effectiveLimit, 0)}
        </span>
        {right}
      </div>
      <div className="h-1.5 rounded-full bg-surface-sunken overflow-hidden mt-1.5">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: over ? "#c85d43" : budget.category.color }}
        />
      </div>
      {note && (
        <div className={`text-xs mt-0.5 ${over ? "text-expense" : "text-ink/40"}`}>{note}</div>
      )}
    </div>
  );
}
