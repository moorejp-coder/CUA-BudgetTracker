import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AnalyticsApi, BudgetsApi, CategoriesApi } from "@/api/resources";
import BudgetProgress from "@/components/BudgetProgress";
import BudgetVariance from "@/components/BudgetVariance";

const PALETTE = ["#5b8def", "#34d399", "#f59e0b", "#f87171", "#a78bfa", "#22d3ee", "#f472b6", "#84cc16", "#fb923c", "#64748b"];

export default function Categories() {
  const qc = useQueryClient();
  const period = format(new Date(), "yyyy-MM");
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: CategoriesApi.list });
  const { data: budgets = [] } = useQuery({ queryKey: ["budgets", period], queryFn: () => BudgetsApi.list(period) });
  const { data: suggestion } = useQuery({
    queryKey: ["budget-suggestion", period],
    queryFn: () => AnalyticsApi.budgetSuggestion(period),
  });

  const [compareMonths, setCompareMonths] = useState(1);
  const { data: variance } = useQuery({
    queryKey: ["budget-variance", period, compareMonths],
    queryFn: () => AnalyticsApi.budgetVariance(period, compareMonths),
  });

  const [newCat, setNewCat] = useState({ name: "", type: "expense" as "income" | "expense", emoji: "" });

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCat.name.trim()) return;
    const color = PALETTE[categories.length % PALETTE.length];
    await CategoriesApi.create({ ...newCat, color });
    setNewCat({ name: "", type: "expense", emoji: "" });
    qc.invalidateQueries({ queryKey: ["categories"] });
  }

  async function removeCategory(id: string) {
    if (!confirm("Delete this category? Its transactions keep their history but lose the category link.")) return;
    await CategoriesApi.remove(id);
    qc.invalidateQueries({ queryKey: ["categories"] });
  }

  async function setBudgetAmount(categoryId: string, amount: number, existing?: string, rollover?: boolean) {
    if (existing) {
      await BudgetsApi.update(existing, { amount });
    } else {
      await BudgetsApi.create({ category_id: categoryId, period, amount, rollover: rollover ?? false });
    }
    qc.invalidateQueries({ queryKey: ["budgets", period] });
  }

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Categories &amp; Budgets</h1>

      <div className="card">
        <h2 className="text-sm font-semibold mb-3">Add category</h2>
        <form onSubmit={addCategory} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">Name</label>
            <input className="input" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Emoji</label>
            <input className="input w-16" value={newCat.emoji} onChange={(e) => setNewCat({ ...newCat, emoji: e.target.value })} />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={newCat.type} onChange={(e) => setNewCat({ ...newCat, type: e.target.value as any })}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <button type="submit" className="btn-primary">
            Add
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="text-sm font-semibold mb-3">Expense categories</h2>
          <ul className="space-y-2">
            {expenseCategories.map((c) => (
              <li key={c.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c.color }} />
                  {c.emoji} {c.name}
                </span>
                <button onClick={() => removeCategory(c.id)} className="text-white/30 hover:text-expense text-xs">
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2 className="text-sm font-semibold mb-3">Income categories</h2>
          <ul className="space-y-2">
            {incomeCategories.map((c) => (
              <li key={c.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c.color }} />
                  {c.emoji} {c.name}
                </span>
                <button onClick={() => removeCategory(c.id)} className="text-white/30 hover:text-expense text-xs">
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {suggestion && suggestion.monthly_income > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold mb-1">Suggested budget — {period}</h2>
          <p className="text-xs text-white/50 mb-4">
            Based on {suggestion.monthly_income.toLocaleString(undefined, { style: "currency", currency: "USD" })} of
            monthly income.{" "}
            {suggestion.has_debt
              ? "You have outstanding debt, so 10% is allocated to paying it down."
              : "You're debt-free, so that 10% is allocated to investing instead."}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {suggestion.buckets.map((b) => (
              <div key={b.key} className="rounded-lg bg-white/5 p-3">
                <div className="text-xs text-white/50">
                  {b.label} · {Math.round(b.pct * 100)}%
                </div>
                <div className="text-lg font-semibold text-white">
                  {b.amount.toLocaleString(undefined, { style: "currency", currency: "USD" })}
                </div>
                <div className="text-[11px] text-white/40 mt-1">{b.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {variance && variance.categories.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Budget variance — {period}</h2>
            <div className="flex gap-1">
              <button
                onClick={() => setCompareMonths(1)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium ${compareMonths === 1 ? "bg-accent text-white" : "btn-secondary"}`}
              >
                vs last month
              </button>
              <button
                onClick={() => setCompareMonths(3)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium ${compareMonths === 3 ? "bg-accent text-white" : "btn-secondary"}`}
              >
                vs last quarter
              </button>
            </div>
          </div>
          <div>
            {variance.categories.map((row) => (
              <BudgetVariance key={row.category_id} row={row} />
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="text-sm font-semibold mb-4">Monthly budgets — {period}</h2>
        <div className="space-y-5">
          {expenseCategories.map((c) => {
            const budget = budgets.find((b) => b.category.id === c.id);
            return budget ? (
              <BudgetProgress key={c.id} budget={budget} />
            ) : (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c.color }} />
                  {c.emoji} {c.name}
                </span>
                <BudgetInlineForm onSet={(amount, rollover) => setBudgetAmount(c.id, amount, undefined, rollover)} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BudgetInlineForm({ onSet }: { onSet: (amount: number, rollover: boolean) => void }) {
  const [amount, setAmount] = useState("");
  const [rollover, setRollover] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <input
        className="input w-24 text-right"
        placeholder="No limit"
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <label className="text-xs text-white/50 flex items-center gap-1">
        <input type="checkbox" checked={rollover} onChange={(e) => setRollover(e.target.checked)} />
        rollover
      </label>
      <button
        className="btn-secondary text-xs px-2 py-1"
        onClick={() => amount && onSet(parseFloat(amount), rollover)}
      >
        Set
      </button>
    </div>
  );
}
