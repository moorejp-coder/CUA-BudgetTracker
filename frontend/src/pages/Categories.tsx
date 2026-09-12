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
      await BudgetsApi.update(existing, { amount, rollover: rollover ?? false });
    } else {
      await BudgetsApi.create({ category_id: categoryId, period, amount, rollover: rollover ?? false });
    }
    qc.invalidateQueries({ queryKey: ["budgets", period] });
  }

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");

  return (
    <div className="h-full flex flex-col gap-4 min-h-0">
      <h1 className="shrink-0 font-display text-[28px] font-semibold text-ink tracking-tight">Categories &amp; Budgets</h1>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
        {/* Left column: add category + category lists */}
        <div className="min-h-0 flex flex-col gap-4">
          <div className="card shrink-0">
            <h2 className="panel-title">Add category</h2>
            <p className="panel-subtitle mb-4">Create a category to start budgeting and tagging transactions against it.</p>
            <form onSubmit={addCategory} className="flex flex-col gap-3">
              <div>
                <label className="label">Name</label>
                <input
                  className="input w-full"
                  placeholder="e.g. Dining Out"
                  value={newCat.name}
                  onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                />
              </div>
              <div className="flex gap-3">
                <div className="w-16">
                  <label className="label">Emoji</label>
                  <input className="input w-full text-center" placeholder="🍽️" value={newCat.emoji} onChange={(e) => setNewCat({ ...newCat, emoji: e.target.value })} />
                </div>
                <div className="flex-1">
                  <label className="label">Type</label>
                  <select className="input w-full" value={newCat.type} onChange={(e) => setNewCat({ ...newCat, type: e.target.value as any })}>
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn-primary" disabled={!newCat.name.trim()}>
                Add category
              </button>
            </form>
          </div>

          <div className="card flex-1 min-h-0 flex flex-col">
            <h2 className="shrink-0 panel-title flex items-center justify-between">
              Expense categories
              <span className="text-xs font-medium text-ink/35 tabular-nums">{expenseCategories.length}</span>
            </h2>
            <ul className="mt-3 flex-1 min-h-0 overflow-y-auto -mx-2">
              {expenseCategories.length === 0 && (
                <li className="text-sm text-ink/40 px-2 py-3">No expense categories yet.</li>
              )}
              {expenseCategories.map((c) => (
                <li key={c.id} className="group flex items-center justify-between text-[15px] font-medium text-ink px-2 py-2.5 rounded-lg transition-colors hover:bg-surface-raised/60">
                  <span className="flex items-center gap-3 min-w-0 truncate">
                    <span className="category-icon" style={{ background: `${c.color}1a`, color: c.color }}>
                      <CategoryIcon name={c.name} />
                    </span>
                    {c.name}
                  </span>
                  <button
                    onClick={() => removeCategory(c.id)}
                    className="text-xs font-normal text-ink/40 hover:text-expense opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="card flex-1 min-h-0 flex flex-col">
            <h2 className="shrink-0 panel-title flex items-center justify-between">
              Income categories
              <span className="text-xs font-medium text-ink/35 tabular-nums">{incomeCategories.length}</span>
            </h2>
            <ul className="mt-3 flex-1 min-h-0 overflow-y-auto -mx-2">
              {incomeCategories.length === 0 && (
                <li className="text-sm text-ink/40 px-2 py-3">No income categories yet.</li>
              )}
              {incomeCategories.map((c) => (
                <li key={c.id} className="group flex items-center justify-between text-[15px] font-medium text-ink px-2 py-2.5 rounded-lg transition-colors hover:bg-surface-raised/60">
                  <span className="flex items-center gap-3 min-w-0 truncate">
                    <span className="category-icon" style={{ background: `${c.color}1a`, color: c.color }}>
                      <CategoryIcon name={c.name} />
                    </span>
                    {c.name}
                  </span>
                  <button
                    onClick={() => removeCategory(c.id)}
                    className="text-xs text-ink/30 hover:text-expense opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right column: suggestion + home plan (fixed) + monthly budgets (scrollable) */}
        <div className="min-h-0 flex flex-col gap-4">
          {suggestion && suggestion.monthly_income > 0 && (
            <div className="card shrink-0 p-3.5">
              <h2 className="text-[13px] font-semibold text-ink">Suggested budget — {period}</h2>
              <p className="text-[11px] text-ink/50 mt-0.5 mb-2 leading-snug">
                Based on <span className="numeral">{suggestion.monthly_income.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })}</span> of
                monthly income.{" "}
                {suggestion.has_debt
                  ? "You have outstanding debt, so 10% is allocated to paying it down."
                  : "You're debt-free, so that 10% is allocated to investing instead."}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {suggestion.buckets.map((b) => (
                  <div key={b.key} className="rounded-lg bg-surface-raised px-2 py-1.5 border border-border-subtle">
                    <div className="text-[10px] text-ink/50 leading-3.5 truncate">
                      {b.label} · {Math.round(b.pct * 100)}%
                    </div>
                    <div className="numeral text-sm text-ink mt-0.5">
                      {b.amount.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {homePlan && homePlan.monthly_income > 0 && (
            <div className="card shrink-0 p-3.5">
              <h2 className="text-[13px] font-semibold text-ink">House down payment plan — {period}</h2>
              <p className="text-[11px] text-ink/50 mt-0.5 mb-2 leading-snug">
                Conventional 10% down, assuming no other debts.
                {homePlan.has_debt && " You currently have outstanding debt, so treat this as an optimistic ceiling."}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                <div className="rounded-lg bg-surface-raised px-2 py-1.5 border border-border-subtle">
                  <div className="text-[10px] text-ink/50 leading-3.5 truncate">Max monthly payment</div>
                  <div className="numeral text-sm text-ink mt-0.5">
                    {homePlan.max_monthly_mortgage_payment.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="rounded-lg bg-surface-raised px-2 py-1.5 border border-border-subtle">
                  <div className="text-[10px] text-ink/50 leading-3.5 truncate">Max home price</div>
                  <div className="numeral text-sm text-ink mt-0.5">
                    {homePlan.max_home_price.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="rounded-lg bg-surface-raised px-2 py-1.5 border border-border-subtle">
                  <div className="text-[10px] text-ink/50 leading-3.5 truncate">Needed to close</div>
                  <div className="numeral text-sm text-ink mt-0.5">
                    {homePlan.amount_needed_to_close.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="rounded-lg bg-surface-raised px-2 py-1.5 border border-border-subtle">
                  <div className="text-[10px] text-ink/50 leading-3.5 truncate">Suggested savings</div>
                  <div className="numeral text-sm text-ink mt-0.5">
                    {homePlan.suggested_monthly_savings.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })}/mo
                  </div>
                </div>
                <div className="rounded-lg bg-surface-raised px-2 py-1.5 border border-border-subtle">
                  <div className="text-[10px] text-ink/50 leading-3.5 truncate">Time to save from $0</div>
                  <div className="numeral text-sm text-ink mt-0.5">
                    {homePlan.months_to_save_from_zero !== null ? `${homePlan.months_to_save_from_zero} months` : "—"}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="card flex-1 min-h-0 flex flex-col">
            <h2 className="shrink-0 panel-title">Monthly budgets — {period}</h2>
            <p className="shrink-0 panel-subtitle mb-3">Set a monthly limit per category and track spending against it.</p>
            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border-subtle">
              {expenseCategories.map((c) => {
                const budget = budgets.find((b) => b.category.id === c.id);
                const form = (
                  <BudgetInlineForm
                    key={budget?.id ?? c.id}
                    initialAmount={budget?.amount}
                    initialRollover={budget?.rollover}
                    onSet={(amount, rollover) => setBudgetAmount(c.id, amount, budget?.id, rollover)}
                  />
                );
                return (
                  <div key={c.id} className="py-2 first:pt-0 last:pb-0">
                    {budget ? (
                      <BudgetProgress budget={budget} right={form} />
                    ) : (
                      <div className="grid grid-cols-[minmax(0,1fr)_110px_auto] items-center text-[15px] gap-4 px-2 py-1.5">
                        <span className="flex items-center gap-3 font-medium text-ink min-w-0 truncate">
                          <span className="category-icon" style={{ background: `${c.color}1a`, color: c.color }}>
                            <CategoryIcon name={c.name} />
                          </span>
                          {c.name}
                        </span>
                        <span className="text-xs text-ink/40 text-right">No budget set</span>
                        {form}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
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
  onSet: (amount: number, rollover: boolean) => Promise<unknown>;
  initialAmount?: number;
  initialRollover?: boolean;
}) {
  const [amount, setAmount] = useState(initialAmount != null ? String(initialAmount) : "");
  const rollover = initialRollover ?? false;
  const [saving, setSaving] = useState(false);

  async function handleSet() {
    if (!amount || saving) return;
    setSaving(true);
    try {
      await onSet(parseFloat(amount), rollover);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <input
        className="input w-24 px-2 text-right text-xs py-1"
        placeholder="—"
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button
        className="btn-secondary text-xs px-1.5 py-1 disabled:opacity-50"
        onClick={handleSet}
        disabled={saving}
      >
        {saving ? "…" : "Set"}
      </button>
    </div>
  );
}
