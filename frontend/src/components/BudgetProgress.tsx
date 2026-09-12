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
    <div className="group rounded-lg transition-colors hover:bg-surface-raised/60 px-2 py-0.5">
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <span className="flex items-center gap-1.5 min-w-[60px] flex-1">
          <span
            className="shrink-0 grid place-items-center rounded-md"
            style={{ width: 18, height: 18, background: `${budget.category.color}1a`, color: budget.category.color }}
          >
            <Icon width={11} height={11} />
          </span>
          <span className="font-medium text-ink truncate min-w-0 text-[12px]">{budget.category.name}</span>
        </span>
        <span className="numeral text-[10px] text-ink/60 whitespace-nowrap shrink-0">
          {formatCurrency(budget.spent, 0)}
          <span className="text-ink/35">/</span>
          {formatCurrency(effectiveLimit, 0)}
        </span>
        <div className="h-1.5 w-9 shrink-0 rounded-full bg-surface-sunken overflow-hidden shadow-[inset_0_1px_1px_rgba(74,54,27,0.08)]">
          <div
            className="h-full rounded-full transition-[width] duration-300 ease-out"
            style={{ width: `${Math.max(pct, budget.spent > 0 ? 3 : 0)}%`, background: over ? "#c85d43" : budget.category.color }}
          />
        </div>
        <span className={`numeral text-[9px] w-5 text-right shrink-0 tabular-nums ${over ? "text-expense" : "text-ink/35"}`}>
          {Math.round(pct)}%
        </span>
        {right}
      </div>
      {note && <div className={`text-[9px] mt-0.5 ${over ? "text-expense font-medium" : "text-ink/40"}`}>{note}</div>}
    </div>
  );
}
