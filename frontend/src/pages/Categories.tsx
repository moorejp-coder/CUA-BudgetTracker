import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { BudgetsApi, CategoriesApi } from "@/api/resources";
import BudgetProgress from "@/components/BudgetProgress";

const PALETTE = ["#5b8def", "#34d399", "#f59e0b", "#f87171", "#a78bfa", "#22d3ee", "#f472b6", "#84cc16", "#fb923c", "#64748b"];

export default function Categories() {
  const qc = useQueryClient();
  const period = format(new Date(), "yyyy-MM");
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: CategoriesApi.list });
  const { data: budgets = [] } = useQuery({ queryKey: ["budgets", period], queryFn: () => BudgetsApi.list(period) });

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
