import type { Account, Category, Transaction } from "@/types";
import { formatCurrency } from "@/lib/format";

export default function TransactionTable({
  transactions,
  categories,
  accounts = [],
  onCategoryChange,
  onDelete,
  selected,
  onSelectionChange,
  compact = false,
}: {
  transactions: Transaction[];
  categories: Category[];
  accounts?: Account[];
  onCategoryChange: (id: string, categoryId: string) => void;
  onDelete: (id: string) => void;
  selected?: Set<string>;
  onSelectionChange?: (next: Set<string>) => void;
  /** Force the no-scroll card layout — use when the table renders in a narrower container (e.g. embedded in a grid card) rather than the full page width. */
  compact?: boolean;
}) {
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? "another account";

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
        {transactions.map((t) => (
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
                <span className="text-ink/40 text-xs capitalize">{t.source}</span>
                <button
                  onClick={() => onDelete(t.id)}
                  className="text-ink/30 hover:text-expense text-xs"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
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
              <th className="text-left px-3 py-3">Source</th>
              <th className="text-right px-3 py-3">Amount</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-t border-border-subtle hover:bg-surface-raised group">
                {selectable && (
                  <td className="px-4 py-2.5">
                    <input type="checkbox" checked={selected!.has(t.id)} onChange={() => toggle(t.id)} />
                  </td>
                )}
                <td className="px-3 py-2.5 text-ink/70 whitespace-nowrap">{t.date}</td>
                <td className="px-3 py-2.5 font-medium">{t.payee || "—"}</td>
                <td className="px-3 py-2.5">{categoryOrTransfer(t)}</td>
                <td className="px-3 py-2.5 text-ink/40 text-xs capitalize">{t.source}</td>
                <td className="px-3 py-2.5 text-right">{amount(t)}</td>
                <td className="px-3 py-2.5 text-right">
                  <button onClick={() => onDelete(t.id)} className="text-ink/30 hover:text-expense text-xs opacity-0 group-hover:opacity-100 transition">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-ink/40">
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
