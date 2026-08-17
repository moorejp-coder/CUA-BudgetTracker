import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AccountsApi, CategoriesApi, TransactionsApi } from "@/api/resources";
import TransactionTable from "@/components/TransactionTable";

export default function Transactions() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ q: "", category_id: "", type: "", account_id: "" });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);

  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: CategoriesApi.list });
  const { data: accounts = [] } = useQuery({ queryKey: ["accounts"], queryFn: AccountsApi.list });
  const { data } = useQuery({
    queryKey: ["transactions", filters, page],
    queryFn: () => TransactionsApi.list({ ...filters, page, page_size: 50 }),
  });

  async function handleCategoryChange(id: string, categoryId: string) {
    await TransactionsApi.update(id, { category_id: categoryId || null } as any);
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[28px] font-semibold text-ink tracking-tight">Transactions</h1>
        <div className="flex gap-2">
          <Link to="/transactions/import" className="btn-secondary">
            Import CSV
          </Link>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            + Add Transaction
          </button>
        </div>
      </div>

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

      {selected.size > 0 && (
        <div className="card flex items-center gap-3 py-3">
          <span className="text-sm text-ink/60">{selected.size} selected</span>
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

      <TransactionTable
        transactions={data?.items ?? []}
        categories={categories}
        onCategoryChange={handleCategoryChange}
        onDelete={handleDelete}
        selected={selected}
        onSelectionChange={setSelected}
      />

      {data && data.total > data.page_size && (
        <div className="flex justify-center gap-3 text-sm">
          <button className="btn-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span className="py-2 text-ink/50">
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
  const [type, setType] = useState<"income" | "expense">("expense");
  const [form, setForm] = useState({
    amount: "",
    payee: "",
    account_id: accounts[0]?.id ?? "",
    category_id: "",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await TransactionsApi.create({ ...form, amount: parseFloat(form.amount), type } as any);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">Add Transaction</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["expense", "income"] as const).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 py-2 text-sm font-semibold capitalize ${
                  type === t ? (t === "income" ? "bg-income text-black" : "bg-expense text-black") : "text-ink/50"
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
            <label className="label">Account</label>
            <select required className="input w-full" value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
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
          <div>
            <label className="label">Date</label>
            <input required type="date" className="input w-full" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
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
