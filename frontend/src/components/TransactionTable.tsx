import type { Category, Transaction } from "@/types";

export default function TransactionTable({
  transactions,
  categories,
  onCategoryChange,
  onDelete,
  selected,
  onSelectionChange,
}: {
  transactions: Transaction[];
  categories: Category[];
  onCategoryChange: (id: string, categoryId: string) => void;
  onDelete: (id: string) => void;
  selected?: Set<string>;
  onSelectionChange?: (next: Set<string>) => void;
}) {
  const selectable = !!selected && !!onSelectionChange;
  const toggle = (id: string) => {
    if (!selectable) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange!(next);
  };

  return (
    <div className="card overflow-x-auto p-0">
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
              <td className="px-3 py-2.5">
                <select
                  value={t.category?.id ?? ""}
                  onChange={(e) => onCategoryChange(t.id, e.target.value)}
                  className="bg-transparent text-xs border border-border-subtle rounded-full px-2 py-1 group-hover:border-border"
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
              </td>
              <td className="px-3 py-2.5 text-ink/40 text-xs capitalize">{t.source}</td>
              <td
                className={`px-3 py-2.5 text-right tabular font-semibold ${
                  t.type === "income" ? "text-income" : t.type === "expense" ? "text-expense" : "text-ink/70"
                }`}
              >
                {t.type === "income" ? "+" : t.type === "expense" ? "-" : ""}${t.amount.toFixed(2)}
              </td>
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
  );
}
