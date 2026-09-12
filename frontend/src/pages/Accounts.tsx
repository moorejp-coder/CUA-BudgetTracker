import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, GripVertical } from "lucide-react";
import { AccountsApi, BucketsApi, CategoriesApi, TransactionsApi } from "@/api/resources";
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
  const dragIdsRef = useRef<string[]>([]);

  const orderedAccounts = useMemo(() => {
    const byId = new Map(accounts.map((a) => [a.id, a]));
    const known = order.filter((id) => byId.has(id)).map((id) => byId.get(id)!);
    const knownIds = new Set(known.map((a) => a.id));
    const rest = accounts.filter((a) => !knownIds.has(a.id));
    return [...known, ...rest];
  }, [accounts, order]);

  const expandedAccount = accounts.find((a) => a.id === expanded) ?? null;

  function persistOrder(ids: string[]) {
    setOrder(ids);
    try {
      localStorage.setItem(ORDER_KEY, JSON.stringify(ids));
    } catch {
      // ignore storage errors (e.g. private browsing)
    }
  }

  // Pointer Events (not HTML5 drag-and-drop) so reordering works with touch too.
  function handleDragPointerDown(e: React.PointerEvent, id: string) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragIdsRef.current = orderedAccounts.map((a) => a.id);
    setDraggedId(id);
  }

  function handleDragPointerMove(e: React.PointerEvent) {
    if (!draggedId) return;
    e.preventDefault();
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const cardEl = target instanceof Element ? target.closest<HTMLElement>("[data-account-id]") : null;
    const overId = cardEl?.dataset.accountId;
    if (!overId || overId === draggedId) return;
    const ids = dragIdsRef.current;
    const from = ids.indexOf(draggedId);
    const to = ids.indexOf(overId);
    if (from === -1 || to === -1 || from === to) return;
    ids.splice(from, 1);
    ids.splice(to, 0, draggedId);
    setOrder([...ids]);
  }

  function handleDragPointerEnd() {
    if (draggedId) persistOrder(dragIdsRef.current);
    setDraggedId(null);
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
            data-account-id={a.id}
            onClick={() => setExpanded(a.id)}
            className={`card p-3.5 cursor-pointer transition-shadow ${draggedId === a.id ? "opacity-50 shadow-lg" : ""}`}
          >
            <div className="flex justify-between items-start gap-3">
              <div className="flex items-start gap-1.5 min-w-0">
                <button
                  type="button"
                  aria-label="Drag to reorder"
                  className="mt-0.5 shrink-0 text-ink/20 hover:text-ink/50 cursor-grab active:cursor-grabbing select-none touch-none"
                  style={{ touchAction: "none" }}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => handleDragPointerDown(e, a.id)}
                  onPointerMove={handleDragPointerMove}
                  onPointerUp={handleDragPointerEnd}
                  onPointerCancel={handleDragPointerEnd}
                >
                  <GripVertical size={14} />
                </button>
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-ink transition-colors">{a.name}</div>
                  <div className="text-[11px] text-ink/40 capitalize">
                    {a.type.replace("_", " ")} {a.institution && `· ${a.institution}`}
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeAccount(a.id);
                }}
                className="text-ink/30 hover:text-expense text-xs transition-colors shrink-0"
              >
                Delete
              </button>
            </div>
            <div className="flex justify-between items-start gap-3 mt-2">
              <div className="min-w-0 flex-1">
                <div className={`numeral text-xl ${a.is_liability ? "text-expense" : "text-ink"}`}>
                  {formatCurrency(a.current_balance)}
                </div>
                <button
                  className="mt-2 text-xs font-semibold text-accent transition-colors hover:text-accent/80"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSnapshotFor(snapshotFor === a.id ? null : a.id);
                  }}
                >
                  {snapshotFor === a.id ? "Cancel" : "Update balance"}
                </button>
                {snapshotFor === a.id && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <BalanceSnapshotForm accountId={a.id} onDone={() => setSnapshotFor(null)} />
                  </div>
                )}
              </div>
              <div className="shrink-0">
                <AccountGoalsSummary accountId={a.id} />
              </div>
            </div>
          </div>
          ))}
          {accounts.length === 0 && <p className="text-ink/40 text-sm">No accounts yet — add one above to start tracking balances.</p>}
        </div>
      </div>

      {expandedAccount && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/50 p-4" onClick={() => setExpanded(null)}>
          <div
            className="card w-full max-w-2xl max-h-[85vh] overflow-y-auto p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-1">
              <div>
                <h2 className="font-display text-xl font-semibold text-ink">{expandedAccount.name}</h2>
                <p className="text-xs text-ink/40 capitalize">
                  {expandedAccount.type.replace("_", " ")} {expandedAccount.institution && `· ${expandedAccount.institution}`}
                </p>
              </div>
              <button
                onClick={() => setExpanded(null)}
                aria-label="Close"
                className="text-ink/40 hover:text-ink transition-colors text-xl leading-none px-1"
              >
                ×
              </button>
            </div>
            <div
              className={`numeral text-2xl mt-1 ${expandedAccount.is_liability ? "text-expense" : "text-ink"}`}
            >
              {formatCurrency(expandedAccount.current_balance)}
            </div>
            <AccountBuckets accountId={expandedAccount.id} currentBalance={expandedAccount.current_balance} />
            <AccountTransactionHistory accountId={expandedAccount.id} />
          </div>
        </div>
      )}
    </div>
  );
}

function AccountGoalsSummary({ accountId }: { accountId: string }) {
  const { data: summary } = useQuery({ queryKey: ["bucket-summary", accountId], queryFn: () => BucketsApi.summary(accountId) });
  if (!summary) return null;

  const shown = summary.buckets.slice(0, 3);
  const extra = summary.buckets.length - shown.length;

  return (
    <div className="text-[11px] leading-relaxed min-w-[110px]">
      {shown.map((b) => (
        <div key={b.id} className="truncate">
          <span className="text-ink/50">{b.name}:</span>{" "}
          <span className="numeral text-ink/80">{formatCurrency(b.balance)}</span>
        </div>
      ))}
      {extra > 0 && <div className="text-ink/30">+{extra} more</div>}
      <div className="text-ink/50">
        Available:{" "}
        <span className={`numeral ${summary.unassigned_balance > 0 ? "text-income" : "text-ink/50"}`}>
          {formatCurrency(summary.unassigned_balance)}
        </span>
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
