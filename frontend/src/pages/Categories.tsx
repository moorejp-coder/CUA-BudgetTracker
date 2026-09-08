import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AnalyticsApi, BudgetsApi, CategoriesApi } from "@/api/resources";
import BudgetProgress from "@/components/BudgetProgress";
import { getCategoryIcon } from "@/lib/categoryIcon";

function CategoryIcon({ name }: { name: string }) {
  const Icon = getCategoryIcon(name);
  return <Icon />;
}

const PALETTE = ["#cf8e27", "#3f825f", "#6ea4bb", "#c85d43", "#9b7ebd", "#d4b483", "#6e8fa3", "#b5a45c", "#a85c7c", "#7a7268"];

export default function Categories() {
  const qc = useQueryClient();
  const period = format(new Date(), "yyyy-MM");
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: CategoriesApi.list });
  const { data: budgets = [] } = useQuery({ queryKey: ["budgets", period], queryFn: () => BudgetsApi.list(period) });
  const { data: suggestion } = useQuery({
    queryKey: ["budget-suggestion", period],
    queryFn: () => AnalyticsApi.budgetSuggestion(period),
  });
  const { data: homePlan } = useQuery({
    queryKey: ["home-savings-plan", period],
    queryFn: () => AnalyticsApi.homeSavingsPlan(period),
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
      <h1 className="font-display text-[28px] font-semibold text-ink tracking-tight">Categories &amp; Budgets</h1>

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
                <span className="flex items-center gap-2.5">
                  <span className="category-icon" style={{ background: `${c.color}1a`, color: c.color }}>
                    <CategoryIcon name={c.name} />
                  </span>
                  {c.name}
                </span>
                <button onClick={() => removeCategory(c.id)} className="text-ink/30 hover:text-expense text-xs">
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
                <span className="flex items-center gap-2.5">
                  <span className="category-icon" style={{ background: `${c.color}1a`, color: c.color }}>
                    <CategoryIcon name={c.name} />
                  </span>
                  {c.name}
                </span>
                <button onClick={() => removeCategory(c.id)} className="text-ink/30 hover:text-expense text-xs">
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
          <p className="text-xs text-ink/50 mb-4">
            Based on {suggestion.monthly_income.toLocaleString(undefined, { style: "currency", currency: "USD" })} of
            monthly income.{" "}
            {suggestion.has_debt
              ? "You have outstanding debt, so 10% is allocated to paying it down."
              : "You're debt-free, so that 10% is allocated to investing instead."}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {suggestion.buckets.map((b) => (
              <div key={b.key} className="rounded-lg bg-surface-raised p-3">
                <div className="text-xs text-ink/50">
                  {b.label} · {Math.round(b.pct * 100)}%
                </div>
                <div className="text-lg font-semibold text-ink">
                  {b.amount.toLocaleString(undefined, { style: "currency", currency: "USD" })}
                </div>
                <div className="text-[11px] text-ink/40 mt-1">{b.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {homePlan && homePlan.monthly_income > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold mb-1">House down payment plan — {period}</h2>
          <p className="text-xs text-ink/50 mb-4">
            Conventional 10% down, assuming no other debts.
            {homePlan.has_debt && " You currently have outstanding debt, so treat this as an optimistic ceiling."}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="rounded-lg bg-surface-raised p-3">
              <div className="text-xs text-ink/50">Max monthly payment</div>
              <div className="text-lg font-semibold text-ink">
                {homePlan.max_monthly_mortgage_payment.toLocaleString(undefined, { style: "currency", currency: "USD" })}
              </div>
              <div className="text-[11px] text-ink/40 mt-1">50% of monthly income</div>
            </div>
            <div className="rounded-lg bg-surface-raised p-3">
              <div className="text-xs text-ink/50">Max home price</div>
              <div className="text-lg font-semibold text-ink">
                {homePlan.max_home_price.toLocaleString(undefined, { style: "currency", currency: "USD" })}
              </div>
              <div className="text-[11px] text-ink/40 mt-1">Max payment ÷ $7.40 per $1,000 borrowed</div>
            </div>
            <div className="rounded-lg bg-surface-raised p-3">
              <div className="text-xs text-ink/50">Needed to close</div>
              <div className="text-lg font-semibold text-ink">
                {homePlan.amount_needed_to_close.toLocaleString(undefined, { style: "currency", currency: "USD" })}
              </div>
              <div className="text-[11px] text-ink/40 mt-1">10% down + 2% closing costs</div>
            </div>
            <div className="rounded-lg bg-surface-raised p-3">
              <div className="text-xs text-ink/50">Suggested savings</div>
              <div className="text-lg font-semibold text-ink">
                {homePlan.suggested_monthly_savings.toLocaleString(undefined, { style: "currency", currency: "USD" })}/mo
              </div>
              <div className="text-[11px] text-ink/40 mt-1">30% of monthly income</div>
            </div>
            <div className="rounded-lg bg-surface-raised p-3">
              <div className="text-xs text-ink/50">Time to save from $0</div>
              <div className="text-lg font-semibold text-ink">
                {homePlan.months_to_save_from_zero !== null ? `${homePlan.months_to_save_from_zero} months` : "—"}
              </div>
              <div className="text-[11px] text-ink/40 mt-1">Needed to close ÷ suggested savings</div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="text-sm font-semibold mb-4">Monthly budgets — {period}</h2>
        <div className="space-y-5">
          {expenseCategories.map((c) => {
            const budget = budgets.find((b) => b.category.id === c.id);
            return (
              <div key={c.id} className="space-y-2">
                {budget && <BudgetProgress budget={budget} />}
                {!budget && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2.5">
                      <span className="category-icon" style={{ background: `${c.color}1a`, color: c.color }}>
                        <CategoryIcon name={c.name} />
                      </span>
                      {c.name}
                    </span>
                  </div>
                )}
                <div className="flex justify-end">
                  <BudgetInlineForm
                    key={budget?.id ?? c.id}
                    initialAmount={budget?.amount}
                    initialRollover={budget?.rollover}
                    onSet={(amount, rollover) => setBudgetAmount(c.id, amount, budget?.id, rollover)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BudgetInlineForm({
  onSet,
  initialAmount,
  initialRollover,
}: {
  onSet: (amount: number, rollover: boolean) => void;
  initialAmount?: number;
  initialRollover?: boolean;
}) {
  const [amount, setAmount] = useState(initialAmount != null ? String(initialAmount) : "");
  const [rollover, setRollover] = useState(initialRollover ?? false);
  return (
    <div className="flex items-center gap-2">
      <input
        className="input w-24 text-right"
        placeholder="No limit"
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <label className="text-xs text-ink/50 flex items-center gap-1">
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
