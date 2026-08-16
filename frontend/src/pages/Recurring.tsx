import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RecurringApi } from "@/api/resources";

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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Recurring &amp; Subscriptions</h1>

      {suggestions.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold mb-3">Detected patterns — confirm to track</h2>
          <ul className="space-y-2">
            {suggestions.map((s, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span>
                  {s.merchant} · ${s.expected_amount.toFixed(2)} · {s.cadence} ({s.occurrences}x seen)
                </span>
                <button className="btn-secondary text-xs px-3 py-1" onClick={() => confirmSuggestion(s)}>
                  Confirm
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h2 className="text-sm font-semibold mb-3">Confirmed recurring items</h2>
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
          <thead className="text-white/50 text-xs uppercase">
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
              <tr key={r.id} className="border-t border-border-subtle">
                <td className="py-2">{r.merchant}</td>
                <td className="py-2 capitalize">{r.cadence}</td>
                <td className="py-2">{r.next_expected_date ?? "—"}</td>
                <td className="py-2 text-right tabular">${r.expected_amount.toFixed(2)}</td>
                <td className="py-2 text-right">
                  <input type="checkbox" checked={r.active} onChange={() => toggleActive(r.id, r.active)} />
                </td>
              </tr>
            ))}
            {recurring.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-white/40">
                  No confirmed recurring items yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
