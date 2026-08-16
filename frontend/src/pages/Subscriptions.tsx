import { useQuery } from "@tanstack/react-query";
import { AssistantApi } from "@/api/resources";

export default function Subscriptions() {
  const { data, isLoading } = useQuery({ queryKey: ["assistant-subscriptions"], queryFn: AssistantApi.subscriptions });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Subscriptions</h1>

      {isLoading && <p className="text-white/40 text-sm">Loading…</p>}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card">
              <div className="text-xs text-white/60 mb-1">Total monthly subscription cost</div>
              <div className="text-2xl font-bold tabular">
                ${data.subscriptions.reduce((s, sub) => s + sub.monthly_equivalent, 0).toFixed(2)}
              </div>
            </div>
            <div className="card">
              <div className="text-xs text-white/60 mb-1">Active subscriptions</div>
              <div className="text-2xl font-bold tabular">{data.subscriptions.length}</div>
            </div>
            <div className="card">
              <div className="text-xs text-white/60 mb-1">Price increases detected</div>
              <div className="text-2xl font-bold tabular text-warning">{data.anomalies.price_increases.length}</div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold mb-3">AI summary</h2>
            <div className="text-sm text-white/80 whitespace-pre-line">{data.summary}</div>
            <div className="text-[10px] text-white/30 mt-2 uppercase tracking-wide">{data.source}</div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold mb-3">Active subscriptions</h2>
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-white/50 text-xs uppercase">
                <tr>
                  <th className="text-left py-2">Merchant</th>
                  <th className="text-left py-2">Cadence</th>
                  <th className="text-right py-2">Amount</th>
                  <th className="text-right py-2">Monthly equivalent</th>
                </tr>
              </thead>
              <tbody>
                {data.subscriptions.map((s) => (
                  <tr key={s.id} className="border-t border-border-subtle">
                    <td className="py-2">{s.merchant}</td>
                    <td className="py-2 capitalize">{s.cadence}</td>
                    <td className="py-2 text-right tabular">${s.amount.toFixed(2)}</td>
                    <td className="py-2 text-right tabular font-semibold">${s.monthly_equivalent.toFixed(2)}</td>
                  </tr>
                ))}
                {data.subscriptions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-white/40">
                      No confirmed subscriptions yet — confirm suggestions on the Recurring page.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>

          {(data.anomalies.new_subscriptions.length > 0 || data.anomalies.price_increases.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="card">
                <h2 className="text-sm font-semibold mb-3">Newly detected</h2>
                <ul className="space-y-2 text-sm">
                  {data.anomalies.new_subscriptions.map((s, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{s.merchant}</span>
                      <span className="tabular text-white/60">${s.expected_amount.toFixed(2)} · {s.cadence}</span>
                    </li>
                  ))}
                  {data.anomalies.new_subscriptions.length === 0 && <p className="text-white/40 text-xs">None</p>}
                </ul>
              </div>
              <div className="card">
                <h2 className="text-sm font-semibold mb-3">Price increases</h2>
                <ul className="space-y-2 text-sm">
                  {data.anomalies.price_increases.map((p, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{p.merchant}</span>
                      <span className="tabular text-warning">
                        ${p.previous_average.toFixed(2)} → ${p.latest_amount.toFixed(2)} (+{p.increase_pct.toFixed(0)}%)
                      </span>
                    </li>
                  ))}
                  {data.anomalies.price_increases.length === 0 && <p className="text-white/40 text-xs">None</p>}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
