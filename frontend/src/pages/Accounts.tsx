import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, GripVertical } from "lucide-react";
import { AccountsApi, CategoriesApi, TransactionsApi } from "@/api/resources";
import AccountBuckets from "@/components/AccountBuckets";
import TransactionTable from "@/components/TransactionTable";
import { formatCurrency } from "@/lib/format";

const TYPES = ["checking", "savings", "credit_card", "loan", "investment", "cash", "other"];
const ORDER_KEY = "accounts-card-order";

function loadOrder(): string[] {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function Accounts() {
  const qc = useQueryClient();
  const { data: accounts = [] } = useQuery({ queryKey: ["accounts"], queryFn: AccountsApi.list });
  const [form, setForm] = useState({ name: "", type: "checking", institution: "", current_balance: "", is_liability: false });
  const [snapshotFor, setSnapshotFor] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [order, setOrder] = useState<string[]>(loadOrder);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const orderedAccounts = useMemo(() => {
    const byId = new Map(accounts.map((a) => [a.id, a]));
    const known = order.filter((id) => byId.has(id)).map((id) => byId.get(id)!);
    const knownIds = new Set(known.map((a) => a.id));
    const rest = accounts.filter((a) => !knownIds.has(a.id));
    return [...known, ...rest];
  }, [accounts, order]);

  function persistOrder(ids: string[]) {
    setOrder(ids);
    try {
      localStorage.setItem(ORDER_KEY, JSON.stringify(ids));
    } catch {
      // ignore storage errors (e.g. private browsing)
    }
  }

  function handleDrop(targetId: string) {
    if (draggedId && draggedId !== targetId) {
      const ids = orderedAccounts.map((a) => a.id);
      const from = ids.indexOf(draggedId);
      const to = ids.indexOf(targetId);
      ids.splice(from, 1);
      ids.splice(to, 0, draggedId);
      persistOrder(ids);
    }
    setDraggedId(null);
    setDragOverId(null);
  }

  async function addAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    await AccountsApi.create({ ...form, current_balance: parseFloat(form.current_balance || "0") });
    setForm({ name: "", type: "checking", institution: "", current_balance: "", is_liability: false });
    qc.invalidateQueries({ queryKey: ["accounts"] });
  }

  async function removeAccount(id: string) {
    if (!confirm("Delete this account and all its transactions?")) return;
    await AccountsApi.remove(id);
    qc.invalidateQueries({ queryKey: ["accounts"] });
  }

  return (
    <div className="h-full flex flex-col gap-4 min-h-0">
      <h1 className="shrink-0 font-display text-[28px] font-semibold text-ink tracking-tight">Accounts</h1>

      <div className="card shrink-0">
        <h2 className="panel-title">Add account</h2>
        <p className="panel-subtitle mb-4">Track a checking, savings, credit card, loan, or investment account.</p>
        <form onSubmit={addAccount} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Institution</label>
            <input className="input" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} />
          </div>
          <div>
            <label className="label">Starting balance</label>
            <input
              type="number"
              step="0.01"
              className="input w-32"
              value={form.current_balance}
              onChange={(e) => setForm({ ...form, current_balance: e.target.value })}
            />
          </div>
          <label className="text-xs text-ink/60 flex items-center gap-1.5 pb-2">
            <input type="checkbox" checked={form.is_liability} onChange={(e) => setForm({ ...form, is_liability: e.target.checked })} />
            Liability (credit card / loan)
          </label>
          <button type="submit" className="btn-primary">
            Add
          </button>
        </form>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {orderedAccounts.map((a) => (
          <div
            key={a.id}
            draggable
            onDragStart={() => setDraggedId(a.id)}
            onDragOver={(e) => {
              e.preventDefault();
              if (draggedId && draggedId !== a.id) setDragOverId(a.id);
            }}
            onDragLeave={() => setDragOverId((id) => (id === a.id ? null : id))}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(a.id);
            }}
            onDragEnd={() => {
              setDraggedId(null);
              setDragOverId(null);
            }}
            className={`card p-3.5 cursor-grab active:cursor-grabbing transition-shadow ${
              draggedId === a.id ? "opacity-50" : ""
            } ${dragOverId === a.id ? "ring-2 ring-accent/50" : ""}`}
          >
            <div className="flex justify-between items-start">
              <button className="text-left flex items-start gap-1.5 min-w-0" onClick={() => setExpanded(expanded === a.id ? null : a.id)}>
                <GripVertical size={14} className="mt-0.5 shrink-0 text-ink/20" />
                <span className="min-w-0">
                  <div className="font-semibold text-sm text-ink transition-colors hover:text-accent">{a.name}</div>
                  <div className="text-[11px] text-ink/40 capitalize">
                    {a.type.replace("_", " ")} {a.institution && `· ${a.institution}`}
                  </div>
                </span>
              </button>
              <button onClick={() => removeAccount(a.id)} className="text-ink/30 hover:text-expense text-xs transition-colors shrink-0">
                Delete
              </button>
            </div>
            <button
              className={`numeral mt-2 block text-xl transition-colors hover:text-accent ${a.is_liability ? "text-expense" : "text-ink"}`}
              onClick={() => setExpanded(expanded === a.id ? null : a.id)}
            >
              {formatCurrency(a.current_balance)}
            </button>
            <button
              className="mt-2 text-xs font-semibold text-accent transition-colors hover:text-accent/80"
              onClick={() => setSnapshotFor(snapshotFor === a.id ? null : a.id)}
            >
              {snapshotFor === a.id ? "Cancel" : "Update balance"}
            </button>
            {snapshotFor === a.id && <BalanceSnapshotForm accountId={a.id} onDone={() => setSnapshotFor(null)} />}
            <AccountBuckets accountId={a.id} currentBalance={a.current_balance} />
            {expanded === a.id && <AccountTransactionHistory accountId={a.id} />}
          </div>
          ))}
          {accounts.length === 0 && <p className="text-ink/40 text-sm">No accounts yet — add one above to start tracking balances.</p>}
        </div>
      </div>
    </div>
  );
}

function AccountTransactionHistory({ accountId }: { accountId: string }) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: CategoriesApi.list });
  const { data: accounts = [] } = useQuery({ queryKey: ["accounts"], queryFn: AccountsApi.list });
  const { data } = useQuery({
    queryKey: ["transactions", { account_id: accountId }, page],
    queryFn: () => TransactionsApi.list({ account_id: accountId, page, page_size: 10 }),
  });

  async function handleCategoryChange(id: string, categoryId: string) {
    await TransactionsApi.update(id, { category_id: categoryId || null } as any);
    qc.invalidateQueries({ queryKey: ["transactions"] });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this transaction?")) return;
    await TransactionsApi.remove(id);
    qc.invalidateQueries({ queryKey: ["transactions"] });
    qc.invalidateQueries({ queryKey: ["accounts"] });
  }

  return (
    <div className="mt-4 pt-4 border-t border-border-subtle">
      <div className="flex items-center justify-between mb-2">
        <h3 className="panel-title">Transaction history</h3>
        <Link
          to={`/transactions?account_id=${accountId}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition-colors hover:text-accent/80"
        >
          View all <ArrowRight size={14} />
        </Link>
      </div>
      <TransactionTable
        transactions={data?.items ?? []}
        categories={categories}
        accounts={accounts}
        onCategoryChange={handleCategoryChange}
        onDelete={handleDelete}
        compact
      />
      {data && data.total > data.page_size && (
        <div className="flex justify-center gap-3 text-sm mt-3">
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
    </div>
  );
}

function BalanceSnapshotForm({ accountId, onDone }: { accountId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const [balance, setBalance] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await AccountsApi.addSnapshot(accountId, date, parseFloat(balance));
    qc.invalidateQueries({ queryKey: ["accounts"] });
    qc.invalidateQueries({ queryKey: ["net-worth"] });
    onDone();
  }

  return (
    <form onSubmit={submit} className="flex gap-2 mt-2">
      <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
      <input type="number" step="0.01" placeholder="Balance" className="input w-28" value={balance} onChange={(e) => setBalance(e.target.value)} />
      <button className="btn-primary text-xs px-2">Save</button>
    </form>
  );
}
