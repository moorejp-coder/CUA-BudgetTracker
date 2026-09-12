import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AnalyticsApi, BudgetsApi, CategoriesApi } from "@/api/resources";
import BudgetProgress from "@/components/BudgetProgress";
import { getCategoryIcon } from "@/lib/categoryIcon";
import type { BudgetSection, Category } from "@/types";

function CategoryIcon({ name }: { name: string }) {
  const Icon = getCategoryIcon(name);
  return <Icon />;
}

const PALETTE = ["#cf8e27", "#3f825f", "#6ea4bb", "#c85d43", "#9b7ebd", "#d4b483", "#6e8fa3", "#b5a45c", "#a85c7c", "#7a7268"];

const SECTION_ORDER: BudgetSection[] = ["essentials", "guilt_free", "debt_investing", "short_term_goals", "long_term_goals"];

const SECTION_LABELS: Record<BudgetSection, string> = {
  essentials: "Essentials",
  guilt_free: "Guilt Free",
  debt_investing: "Debt/Investing",
  short_term_goals: "Short Term Goals",
  long_term_goals: "Long Term Goals",
};

function groupBySection(categories: Category[]) {
  const groups = new Map<string, Category[]>();
  for (const c of categories) {
    const key = c.section ?? "unassigned";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }
  const ordered: Array<{ key: string; label: string; categories: Category[] }> = [];
  for (const key of SECTION_ORDER) {
    const group = groups.get(key);
    if (group?.length) ordered.push({ key, label: SECTION_LABELS[key], categories: group });
  }
  const unassigned = groups.get("unassigned");
  if (unassigned?.length) ordered.push({ key: "unassigned", label: "Unassigned", categories: unassigned });
  return ordered;
}

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

  const [newCat, setNewCat] = useState({ name: "", type: "expense" as "income" | "expense", emoji: "", section: "" as BudgetSection | "" });
  const [openPanel, setOpenPanel] = useState<"suggestion" | "homePlan" | "expense" | "income" | null>(null);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCat.name.trim()) return;
    const color = PALETTE[categories.length % PALETTE.length];
    await CategoriesApi.create({
      name: newCat.name,
      type: newCat.type,
      emoji: newCat.emoji,
      color,
      section: newCat.type === "expense" && newCat.section ? newCat.section : null,
    });
    setNewCat({ name: "", type: "expense", emoji: "", section: "" });
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

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[300px_1fr] lg:items-start gap-4">
        {/* Left column: add category + category lists */}
        <div className="min-h-0 flex flex-col gap-4 lg:max-h-[calc(100vh-160px)] lg:overflow-y-auto">
          <div className="card shrink-0 p-4">
            <h2 className="text-[13px] font-semibold text-ink">Add category</h2>
            <form onSubmit={addCategory} className="flex flex-col gap-2 mt-3">
              <input
                className="input w-full"
                placeholder="e.g. Dining Out"
                value={newCat.name}
                onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
              />
              <div className="flex gap-2">
                <input
                  className="input w-14 text-center shrink-0"
                  placeholder="🍽️"
                  value={newCat.emoji}
                  onChange={(e) => setNewCat({ ...newCat, emoji: e.target.value })}
                />
                <select className="input flex-1" value={newCat.type} onChange={(e) => setNewCat({ ...newCat, type: e.target.value as any })}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              {newCat.type === "expense" && (
                <select
                  className="input w-full"
                  value={newCat.section}
                  onChange={(e) => setNewCat({ ...newCat, section: e.target.value as BudgetSection | "" })}
                >
                  <option value="">No section</option>
                  {SECTION_ORDER.map((key) => (
                    <option key={key} value={key}>
                      {SECTION_LABELS[key]}
                    </option>
                  ))}
                </select>
              )}
              <button type="submit" className="btn-primary" disabled={!newCat.name.trim()}>
                Add category
              </button>
            </form>
          </div>

          <div className="shrink-0 flex flex-col gap-3">
            <SummaryButton
              title="Expense categories"
              stat={`${expenseCategories.length}`}
              subtitle={expenseCategories.length > 0 ? expenseCategories.map((c) => c.name).join(", ") : "No expense categories yet."}
              onClick={() => setOpenPanel("expense")}
            />

            <SummaryButton
              title="Income categories"
              stat={`${incomeCategories.length}`}
              subtitle={incomeCategories.length > 0 ? incomeCategories.map((c) => c.name).join(", ") : "No income categories yet."}
              onClick={() => setOpenPanel("income")}
            />

            {suggestion && suggestion.monthly_income > 0 && (
              <SummaryButton
                title={`Suggested budget — ${period}`}
                stat="View →"
                subtitle={
                  <>
                    Based on{" "}
                    <span className="numeral">
                      {suggestion.monthly_income.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
                    </span>{" "}
                    of monthly income
                  </>
                }
                onClick={() => setOpenPanel("suggestion")}
              />
            )}

            {homePlan && homePlan.monthly_income > 0 && (
              <SummaryButton
                title={`House down payment plan — ${period}`}
                stat="View →"
                subtitle={
                  <>
                    Max home price{" "}
                    <span className="numeral">
                      {homePlan.max_home_price.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
                    </span>
                  </>
                }
                onClick={() => setOpenPanel("homePlan")}
              />
            )}
          </div>
        </div>

        {/* Right column: monthly budgets, sized to content up to the available height */}
        <div className="min-h-0 flex flex-col gap-4">
          <div className="card flex flex-col max-h-full lg:max-h-[calc(100vh-160px)]">
            <h2 className="shrink-0 panel-title">Monthly budgets — {period}</h2>
            <p className="shrink-0 panel-subtitle mb-3">Set a monthly limit per category and track spending against it.</p>
            <div className="min-h-0 overflow-y-auto">
              {groupBySection(expenseCategories).map((group) => (
                <div key={group.key} className="mb-3 last:mb-0">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ink/40 px-2 mb-1">{group.label}</h3>
                  {group.categories.map((c) => {
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
                      <div key={c.id}>
                        {budget ? (
                          <BudgetProgress budget={budget} right={form} />
                        ) : (
                          <div className="group rounded-lg transition-colors hover:bg-surface-raised/60 px-2 py-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="flex items-center gap-2 min-w-[90px] flex-1">
                                <span
                                  className="shrink-0 grid place-items-center rounded-md"
                                  style={{ width: 22, height: 22, background: `${c.color}1a`, color: c.color }}
                                >
                                  <CategoryIcon name={c.name} />
                                </span>
                                <span className="font-medium text-ink truncate min-w-0 text-[13px]">{c.name}</span>
                              </span>
                              <span className="text-[11px] text-ink/40 shrink-0">No budget set</span>
                              {form}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {openPanel === "expense" && (
        <DetailModal title="Expense categories" onClose={() => setOpenPanel(null)}>
          <CategoryList categories={expenseCategories} onRemove={removeCategory} emptyLabel="No expense categories yet." />
        </DetailModal>
      )}

      {openPanel === "income" && (
        <DetailModal title="Income categories" onClose={() => setOpenPanel(null)}>
          <CategoryList categories={incomeCategories} onRemove={removeCategory} emptyLabel="No income categories yet." />
        </DetailModal>
      )}

      {openPanel === "suggestion" && suggestion && (
        <DetailModal title={`Suggested budget — ${period}`} onClose={() => setOpenPanel(null)}>
          <p className="text-sm text-ink/60 mb-4 leading-snug">
            Based on <span className="numeral">{suggestion.monthly_income.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })}</span> of
            monthly income.{" "}
            {suggestion.has_debt
              ? "You have outstanding debt, so 10% is allocated to paying it down."
              : "You're debt-free, so that 10% is allocated to investing instead."}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {suggestion.buckets.map((b) => (
              <div key={b.key} className="rounded-lg bg-surface-raised p-3 border border-border-subtle">
                <div className="text-xs text-ink/50 leading-4">
                  {b.label} · {Math.round(b.pct * 100)}%
                </div>
                <div className="numeral text-lg text-ink mt-0.5">
                  {b.amount.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
                </div>
              </div>
            ))}
          </div>
        </DetailModal>
      )}

      {openPanel === "homePlan" && homePlan && (
        <DetailModal title={`House down payment plan — ${period}`} onClose={() => setOpenPanel(null)}>
          <p className="text-sm text-ink/60 mb-4 leading-snug">
            Conventional 10% down, assuming no other debts.
            {homePlan.has_debt && " You currently have outstanding debt, so treat this as an optimistic ceiling."}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-lg bg-surface-raised p-3 border border-border-subtle">
              <div className="text-xs text-ink/50 leading-4">Max monthly payment</div>
              <div className="numeral text-lg text-ink mt-0.5">
                {homePlan.max_monthly_mortgage_payment.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="rounded-lg bg-surface-raised p-3 border border-border-subtle">
              <div className="text-xs text-ink/50 leading-4">Max home price</div>
              <div className="numeral text-lg text-ink mt-0.5">
                {homePlan.max_home_price.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="rounded-lg bg-surface-raised p-3 border border-border-subtle">
              <div className="text-xs text-ink/50 leading-4">Needed to close</div>
              <div className="numeral text-lg text-ink mt-0.5">
                {homePlan.amount_needed_to_close.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="rounded-lg bg-surface-raised p-3 border border-border-subtle">
              <div className="text-xs text-ink/50 leading-4">Suggested savings</div>
              <div className="numeral text-lg text-ink mt-0.5">
                {homePlan.suggested_monthly_savings.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })}/mo
              </div>
            </div>
            <div className="rounded-lg bg-surface-raised p-3 border border-border-subtle">
              <div className="text-xs text-ink/50 leading-4">Time to save from $0</div>
              <div className="numeral text-lg text-ink mt-0.5">
                {homePlan.months_to_save_from_zero !== null ? `${homePlan.months_to_save_from_zero} months` : "—"}
              </div>
            </div>
          </div>
        </DetailModal>
      )}
    </div>
  );
}

function SummaryButton({
  title,
  stat,
  subtitle,
  onClick,
}: {
  title: string;
  stat: string;
  subtitle: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card text-left p-3.5 hover:border-accent/40 hover:bg-surface-raised/40 transition-colors cursor-pointer"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
        <span className="text-ink/30 text-xs shrink-0 tabular-nums">{stat}</span>
      </div>
      <p className="text-[11px] text-ink/50 mt-0.5 leading-snug truncate">{subtitle}</p>
    </button>
  );
}

function CategoryList({
  categories,
  onRemove,
  emptyLabel,
}: {
  categories: Array<{ id: string; name: string; color: string }>;
  onRemove: (id: string) => void;
  emptyLabel: string;
}) {
  if (categories.length === 0) {
    return <p className="text-sm text-ink/40">{emptyLabel}</p>;
  }
  return (
    <ul className="-mx-2 max-h-[60vh] overflow-y-auto">
      {categories.map((c) => (
        <li key={c.id} className="group flex items-center justify-between text-[15px] font-medium text-ink px-2 py-2.5 rounded-lg transition-colors hover:bg-surface-raised/60">
          <span className="flex items-center gap-3 min-w-0 truncate">
            <span className="category-icon" style={{ background: `${c.color}1a`, color: c.color }}>
              <CategoryIcon name={c.name} />
            </span>
            {c.name}
          </span>
          <button
            onClick={() => onRemove(c.id)}
            className="text-xs font-normal text-ink/40 hover:text-expense opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}

function DetailModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-4 mb-1">
          <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-ink/40 hover:text-ink text-xl leading-none shrink-0"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {children}
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
        className="input w-20 px-2 text-right text-xs py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
