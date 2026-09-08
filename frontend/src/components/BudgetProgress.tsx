import type { Budget } from "@/types";
import { formatCurrency } from "@/lib/format";
import { getCategoryIcon } from "@/lib/categoryIcon";

export default function BudgetProgress({ budget }: { budget: Budget }) {
  const effectiveLimit = budget.amount + budget.rolled_over_amount;
  const pct = effectiveLimit > 0 ? Math.min(100, (budget.spent / effectiveLimit) * 100) : 0;
  const over = budget.spent > effectiveLimit;
  const Icon = getCategoryIcon(budget.category.name);

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="flex items-center gap-2 font-medium">
          <span
            className="category-icon"
            style={{ background: `${budget.category.color}1a`, color: budget.category.color }}
          >
            <Icon />
          </span>
          {budget.category.name}
        </span>
        <span className="tabular text-ink/60">
          {formatCurrency(budget.spent, 0)} / {formatCurrency(effectiveLimit, 0)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-surface-sunken overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: over ? "#c85d43" : budget.category.color }}
        />
      </div>
      {budget.rollover && budget.rolled_over_amount > 0 && (
        <div className="text-xs text-ink/40 mt-1">+{formatCurrency(budget.rolled_over_amount, 0)} rolled over</div>
      )}
      {over && <div className="text-xs text-expense mt-1">Over budget</div>}
    </div>
  );
}
