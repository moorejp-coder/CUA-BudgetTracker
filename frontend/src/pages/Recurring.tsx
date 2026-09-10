import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { RecurringApi } from "@/api/resources";
import { formatCurrency } from "@/lib/format";

export default function Recurring() {
  const qc = useQueryClient();
  const { data: recurring = [] } = useQuery({ queryKey: ["recurring"], queryFn: RecurringApi.list });
  const { data: suggestions = [] } = useQuery({ queryKey: ["recurring-suggestions"], queryFn: RecurringApi.suggestions });

  async function confirmSuggestion(s: any) {
    await RecurringApi.create({
      merchant: s.merchant,
      expected_amount: s.expected_amount,
      cadence: s.cadence,
      next_expected_date: s.next_expected_date,
    });
    qc.invalidateQueries({ queryKey: ["recurring"] });
    qc.invalidateQueries({ queryKey: ["recurring-suggestions"] });
  }

  async function toggleActive(id: string, active: boolean) {
    await RecurringApi.update(id, { active: !active });
    qc.invalidateQueries({ queryKey: ["recurring"] });
  }

  return (
    <div className="h-full flex flex-col gap-4 min-h-0">
      <h1 className="shrink-0 font-display text-[28px] font-semibold text-ink tracking-tight">Recurring &amp; Subscriptions</h1>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
      {suggestions.length > 0 ? (
        <div className="card min-h-0 flex flex-col">
          <h2 className="shrink-0 panel-title">Detected patterns</h2>
          <p className="shrink-0 panel-subtitle mb-3">Recurring charges we noticed in your transactions — confirm to start tracking them.</p>
          <ul className="flex-1 min-h-0 overflow-y-auto -mx-2">
            {suggestions.map((s, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 text-sm px-2 py-2 rounded-lg transition-colors hover:bg-surface-raised/60"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="category-icon">
                    <Clock />
                  </span>
                  <span className="min-w-0 truncate">
                    <span className="font-medium text-ink">{s.merchant}</span>{" "}
                    <span className="text-ink/50">
                      · <span className="numeral">{formatCurrency(s.expected_amount)}</span> · {s.cadence} ({s.occurrences}x seen)
                    </span>
                  </span>
                </span>
                <button className="btn-secondary text-xs px-3 py-1 shrink-0" onClick={() => confirmSuggestion(s)}>
                  Confirm
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="card min-h-0 hidden lg:flex flex-col items-center justify-center text-sm text-ink/40">
          No detected patterns right now — we'll flag recurring charges here as we spot them.
        </div>
      )}

      <div className="card min-h-0 flex flex-col">
        <h2 className="shrink-0 panel-title">Confirmed recurring items</h2>
        <p className="shrink-0 panel-subtitle mb-3">Subscriptions and bills tracked on a schedule.</p>
        <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
          <thead className="text-ink/50 text-xs uppercase">
            <tr>
              <th className="text-left py-2">Merchant</th>
              <th className="text-left py-2">Cadence</th>
              <th className="text-left py-2">Next expected</th>
              <th className="text-right py-2">Amount</th>
              <th className="text-right py-2">Active</th>
            </tr>
          </thead>
          <tbody>
            {recurring.map((r) => (
              <tr key={r.id} className="border-t border-border-subtle transition-colors hover:bg-surface-raised/60">
                <td className="py-2">
                  <span className="flex items-center gap-2.5">
                    <span className="category-icon">
                      <Clock />
                    </span>
                    {r.merchant}
                  </span>
                </td>
                <td className="py-2 capitalize">{r.cadence}</td>
                <td className="py-2">{r.next_expected_date ?? "—"}</td>
                <td className="py-2 text-right numeral text-ink">{formatCurrency(r.expected_amount)}</td>
                <td className="py-2 text-right">
                  <input type="checkbox" checked={r.active} onChange={() => toggleActive(r.id, r.active)} />
                </td>
              </tr>
            ))}
            {recurring.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm text-ink/40">
                  No confirmed recurring items yet — confirmed items will appear here once you add them.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
      </div>
    </div>
  );
}
