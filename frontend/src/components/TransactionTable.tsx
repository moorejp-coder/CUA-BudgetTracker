import { useState } from "react";
import type { Account, Category, Transaction } from "@/types";
import { formatCurrency } from "@/lib/format";

export default function TransactionTable({
  transactions,
  categories,
  accounts = [],
  onCategoryChange,
  onUpdate,
  onDelete,
  selected,
  onSelectionChange,
  compact = false,
}: {
  transactions: Transaction[];
  categories: Category[];
  accounts?: Account[];
  onCategoryChange: (id: string, categoryId: string) => void;
  onUpdate?: (id: string, data: Partial<Transaction>) => void;
  onDelete: (id: string) => void;
  selected?: Set<string>;
  onSelectionChange?: (next: Set<string>) => void;
  /** Force the no-scroll card layout — use when the table renders in a narrower container (e.g. embedded in a grid card) rather than the full page width. */
  compact?: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ date: "", payee: "", amount: "" });

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? "another account";
  const editable = !!onUpdate;

  const startEdit = (t: Transaction) => {
    setEditingId(t.id);
    setDraft({ date: t.date, payee: t.payee, amount: String(t.amount) });
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = (id: string) => {
    const amount = parseFloat(draft.amount);
    onUpdate!(id, {
      date: draft.date,
      payee: draft.payee,
      ...(Number.isFinite(amount) ? { amount } : {}),
    });
    setEditingId(null);
  };

  const categoryOrTransfer = (t: Transaction) =>
    t.type === "transfer" ? (
      <span className="text-xs text-ink/50 whitespace-nowrap">→ {accountName(t.transfer_account_id ?? "")}</span>
    ) : (
      categorySelect(t)
    );

  const selectable = !!selected && !!onSelectionChange;
  const toggle = (id: string) => {
    if (!selectable) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange!(next);
  };

  const categorySelect = (t: Transaction) => (
    <select
      value={t.category?.id ?? ""}
      onChange={(e) => onCategoryChange(t.id, e.target.value)}
      className="bg-transparent text-xs border border-border-subtle rounded-full px-2 py-1 group-hover:border-border max-w-full"
    >
      <option value="">Uncategorized</option>
      {categories
        .filter((c) => c.type === t.type)
        .map((c) => (
          <option key={c.id} value={c.id}>
            {c.emoji} {c.name}
          </option>
        ))}
    </select>
  );

  const amount = (t: Transaction) => (
    <span
      className={`tabular font-semibold ${
        t.type === "income" ? "text-income" : t.type === "expense" ? "text-expense" : "text-ink/70"
      }`}
    >
      {t.type === "income" ? "+" : t.type === "expense" ? "-" : ""}{formatCurrency(t.amount)}
    </span>
  );

  return (
    <div className="card p-0 overflow-hidden">
      {/* Card list — small/medium screens (or forced), no horizontal scrolling needed */}
      <div className={`${compact ? "block" : "md:hidden"} divide-y divide-border-subtle`}>
        {transactions.map((t) =>
          editingId === t.id ? (
            <div key={t.id} className="p-3 flex flex-col gap-2 bg-surface-raised">
              <div className="flex gap-2">
                <input
                  type="date"
                  className="input flex-1"
                  value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                />
                <input
                  type="number"
                  step="0.01"
                  className="input w-28"
                  value={draft.amount}
                  onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                />
              </div>
              <input
                className="input"
                placeholder="Payee / description"
                value={draft.payee}
                onChange={(e) => setDraft({ ...draft, payee: e.target.value })}
              />
              <div className="flex gap-2 justify-end">
                <button className="btn-secondary text-xs" onClick={cancelEdit}>
                  Cancel
                </button>
                <button className="btn-primary text-xs" onClick={() => saveEdit(t.id)}>
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div key={t.id} className="p-3 flex flex-col gap-2 hover:bg-surface-raised group">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{t.payee || "—"}</p>
                  <p className="text-ink/40 text-xs">{t.date}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {selectable && (
                    <input type="checkbox" checked={selected!.has(t.id)} onChange={() => toggle(t.id)} />
                  )}
                  {amount(t)}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">{categoryOrTransfer(t)}</div>
                <div className="flex items-center gap-3 shrink-0">
                  {editable && (
                    <button onClick={() => startEdit(t)} className="text-ink/30 hover:text-ink text-xs">
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(t.id)}
                    className="text-ink/30 hover:text-expense text-xs"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )
        )}
        {transactions.length === 0 && (
          <p className="px-3 py-10 text-center text-ink/40">No transactions match these filters.</p>
        )}
      </div>

      {/* Table — md and up (unless compact is forced) */}
      <div className={`${compact ? "hidden" : "hidden md:block"} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead className="bg-surface-sunken text-ink/50 text-xs uppercase tracking-wide">
            <tr>
              {selectable && <th className="w-10 px-4 py-3"></th>}
              <th className="text-left px-3 py-3">Date</th>
              <th className="text-left px-3 py-3">Payee</th>
              <th className="text-left px-3 py-3">Category</th>
              <th className="text-right px-3 py-3">Amount</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) =>
              editingId === t.id ? (
                <tr key={t.id} className="border-t border-border-subtle bg-surface-raised">
                  {selectable && <td className="px-4 py-2.5" />}
                  <td className="px-3 py-2.5">
                    <input
                      type="date"
                      className="input"
                      value={draft.date}
                      onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      className="input w-full"
                      value={draft.payee}
                      onChange={(e) => setDraft({ ...draft, payee: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2.5">{categoryOrTransfer(t)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <input
                      type="number"
                      step="0.01"
                      className="input w-28 text-right"
                      value={draft.amount}
                      onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <button className="text-ink/40 hover:text-ink text-xs mr-2" onClick={cancelEdit}>
                      Cancel
                    </button>
                    <button className="text-accent text-xs font-semibold" onClick={() => saveEdit(t.id)}>
                      Save
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={t.id} className="border-t border-border-subtle hover:bg-surface-raised group">
                  {selectable && (
                    <td className="px-4 py-2.5">
                      <input type="checkbox" checked={selected!.has(t.id)} onChange={() => toggle(t.id)} />
                    </td>
                  )}
                  <td className="px-3 py-2.5 text-ink/70 whitespace-nowrap">{t.date}</td>
                  <td className="px-3 py-2.5 font-medium">{t.payee || "—"}</td>
                  <td className="px-3 py-2.5">{categoryOrTransfer(t)}</td>
                  <td className="px-3 py-2.5 text-right">{amount(t)}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap opacity-0 group-hover:opacity-100 transition">
                    {editable && (
                      <button onClick={() => startEdit(t)} className="text-ink/30 hover:text-ink text-xs mr-3">
                        Edit
                      </button>
                    )}
                    <button onClick={() => onDelete(t.id)} className="text-ink/30 hover:text-expense text-xs">
                      Delete
                    </button>
                  </td>
                </tr>
              )
            )}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-ink/40">
                  No transactions match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
