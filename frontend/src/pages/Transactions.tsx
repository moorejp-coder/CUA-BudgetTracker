import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { AccountsApi, CategoriesApi, TransactionsApi } from "@/api/resources";
import TransactionTable from "@/components/TransactionTable";

export default function Transactions() {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    q: "",
    category_id: "",
    type: "",
    account_id: searchParams.get("account_id") ?? "",
  });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);

  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: CategoriesApi.list });
  const { data: accounts = [] } = useQuery({ queryKey: ["accounts"], queryFn: AccountsApi.list });
  const { data } = useQuery({
    queryKey: ["transactions", filters, page],
    queryFn: () => {
      const cleaned = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      return TransactionsApi.list({ ...cleaned, page, page_size: 50 });
    },
  });

  async function handleCategoryChange(id: string, categoryId: string) {
    await TransactionsApi.update(id, { category_id: categoryId || null } as any);
    qc.invalidateQueries({ queryKey: ["transactions"] });
  }

  async function handleUpdate(id: string, data: any) {
    await TransactionsApi.update(id, data);
    qc.invalidateQueries({ queryKey: ["transactions"] });
  }

  async function handleDelete(id: string) {
    await TransactionsApi.remove(id);
    qc.invalidateQueries({ queryKey: ["transactions"] });
  }

  async function handleBulkCategory(categoryId: string) {
    if (selected.size === 0) return;
    await TransactionsApi.bulkUpdate(Array.from(selected), categoryId);
    setSelected(new Set());
    qc.invalidateQueries({ queryKey: ["transactions"] });
  }

  return (
    <div className="h-full flex flex-col gap-4 min-h-0">
      <div className="shrink-0 flex items-center justify-between">
        <h1 className="font-display text-[28px] font-semibold text-ink tracking-tight">Transactions</h1>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            + Add Transaction
          </button>
        </div>
      </div>

      <div className="shrink-0 card">
        <h2 className="panel-title">Filter transactions</h2>
        <p className="panel-subtitle mb-4">Narrow the list below by description, account, category, or type.</p>
        <div className="flex flex-wrap gap-3">
          <input
            className="input flex-1 min-w-[200px]"
            placeholder="Search description…"
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          />
          <select className="input" value={filters.account_id} onChange={(e) => setFilters({ ...filters, account_id: e.target.value })}>
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select className="input" value={filters.category_id} onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
          <select className="input" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="shrink-0 card flex items-center gap-3 py-3">
          <span className="text-sm font-medium text-ink/60">{selected.size} selected</span>
          <select className="input" onChange={(e) => e.target.value && handleBulkCategory(e.target.value)} defaultValue="">
            <option value="" disabled>
              Set category…
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col">
        <TransactionTable
          transactions={data?.items ?? []}
          categories={categories}
          accounts={accounts}
          onCategoryChange={handleCategoryChange}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          selected={selected}
          onSelectionChange={setSelected}
        />
      </div>

      {data && data.total > data.page_size && (
        <div className="shrink-0 flex justify-center items-center gap-3 text-sm">
          <button className="btn-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span className="py-2 numeral text-ink/50">
            Page {page} of {Math.ceil(data.total / data.page_size)}
          </span>
          <button className="btn-secondary" disabled={page * data.page_size >= data.total} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      )}

      {showAdd && (
        <AddTransactionModal
          accounts={accounts}
          categories={categories}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            qc.invalidateQueries({ queryKey: ["transactions"] });
          }}
        />
      )}
    </div>
  );
}

function AddTransactionModal({
  accounts,
  categories,
  onClose,
  onSaved,
}: {
  accounts: any[];
  categories: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<"income" | "expense" | "transfer">("expense");
  const [form, setForm] = useState({
    amount: "",
    payee: "",
    account_id: accounts[0]?.id ?? "",
    category_id: "",
    transfer_account_id: "",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (type === "transfer" && (!form.transfer_account_id || form.transfer_account_id === form.account_id)) {
      setError("Choose a different account to transfer to");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await TransactionsApi.create({
        ...form,
        amount: parseFloat(form.amount),
        type,
        category_id: type === "transfer" ? null : form.category_id || null,
        transfer_account_id: type === "transfer" ? form.transfer_account_id : null,
      } as any);
      onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to save transaction");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-xl font-semibold text-ink mb-4">Add transaction</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["expense", "income", "transfer"] as const).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 py-2 text-sm font-semibold capitalize transition-colors ${
                  type === t
                    ? t === "income"
                      ? "bg-income text-white"
                      : t === "expense"
                        ? "bg-expense text-white"
                        : "bg-ink/20 text-ink"
                    : "text-ink/50 hover:bg-surface-raised"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div>
            <label className="label">Amount</label>
            <input
              required
              type="number"
              step="0.01"
              className="input w-full"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Payee / description</label>
            <input required className="input w-full" value={form.payee} onChange={(e) => setForm({ ...form, payee: e.target.value })} />
          </div>
          <div>
            <label className="label">{type === "transfer" ? "From account" : "Account"}</label>
            <select required className="input w-full" value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          {type === "transfer" ? (
            <div>
              <label className="label">To account</label>
              <select
                required
                className="input w-full"
                value={form.transfer_account_id}
                onChange={(e) => setForm({ ...form, transfer_account_id: e.target.value })}
              >
                <option value="">Select account…</option>
                {accounts
                  .filter((a: any) => a.id !== form.account_id)
                  .map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="label">Category</label>
              <select className="input w-full" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Uncategorized</option>
                {categories.filter((c: any) => c.type === type).map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label">Date</label>
            <input required type="date" className="input w-full" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          {error && <p className="text-sm text-expense">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
