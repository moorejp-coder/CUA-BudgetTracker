import type { Budget } from "@/types";

export default function BudgetProgress({ budget }: { budget: Budget }) {
  const effectiveLimit = budget.amount + budget.rolled_over_amount;
  const pct = effectiveLimit > 0 ? Math.min(100, (budget.spent / effectiveLimit) * 100) : 0;
  const over = budget.spent > effectiveLimit;

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="flex items-center gap-2 font-medium">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: budget.category.color }} />
          {budget.category.emoji} {budget.category.name}
        </span>
        <span className="tabular text-ink/60">
          ${budget.spent.toFixed(0)} / ${effectiveLimit.toFixed(0)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-surface-sunken overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: over ? "#c6604a" : budget.category.color }}
        />
      </div>
      {budget.rollover && budget.rolled_over_amount > 0 && (
        <div className="text-xs text-ink/40 mt-1">+${budget.rolled_over_amount.toFixed(0)} rolled over</div>
      )}
      {over && <div className="text-xs text-expense mt-1">Over budget</div>}
    </div>
  );
}
