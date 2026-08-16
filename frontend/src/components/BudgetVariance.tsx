import type { BudgetVarianceRow } from "@/types";

function fmt(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function VarianceBadge({ amount, pct }: { amount: number; pct: number | null }) {
  if (amount === 0) return <span className="text-white/40">flat</span>;
  const over = amount > 0;
  return (
    <span className={over ? "text-expense" : "text-income"}>
      {over ? "+" : ""}
      {fmt(amount)}
      {pct !== null && ` (${over ? "+" : ""}${pct.toFixed(0)}%)`}
    </span>
  );
}

export default function BudgetVariance({ row }: { row: BudgetVarianceRow }) {
  return (
    <div className="flex items-center justify-between text-sm py-1.5 border-b border-white/5 last:border-0">
      <span className="font-medium">{row.category_name}</span>
      <div className="flex items-center gap-6 tabular text-xs">
        <div className="text-right">
          <div className="text-white/40">vs target (${row.target_budget.toFixed(0)})</div>
          <VarianceBadge amount={row.variance_vs_target} pct={row.variance_vs_target_pct} />
        </div>
        <div className="text-right">
          <div className="text-white/40">vs {row.prior_period}</div>
          <VarianceBadge amount={row.variance_vs_prior} pct={row.variance_vs_prior_pct} />
        </div>
      </div>
    </div>
  );
}
