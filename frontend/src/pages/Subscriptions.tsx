import { useQuery } from "@tanstack/react-query";
import { AssistantApi } from "@/api/resources";
import { formatCurrency } from "@/lib/format";

export default function Subscriptions() {
  const { data, isLoading } = useQuery({ queryKey: ["assistant-subscriptions"], queryFn: AssistantApi.subscriptions });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-[28px] font-semibold text-ink tracking-tight">Subscriptions</h1>

      {isLoading && <p className="text-ink/40 text-sm">Loading…</p>}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card">
              <div className="text-xs text-ink/60 mb-1">Total monthly subscription cost</div>
              <div className="numeral text-2xl">
                {formatCurrency(data.subscriptions.reduce((s, sub) => s + sub.monthly_equivalent, 0))}
              </div>
            </div>
            <div className="card">
              <div className="text-xs text-ink/60 mb-1">Active subscriptions</div>
              <div className="numeral text-2xl">{data.subscriptions.length}</div>
            </div>
            <div className="card">
              <div className="text-xs text-ink/60 mb-1">Price increases detected</div>
              <div className="numeral text-2xl text-warning">{data.anomalies.price_increases.length}</div>
            </div>
          </div>

          <div className="card">
            <h2 className="panel-title">AI summary</h2>
            <p className="panel-subtitle mb-3">A plain-language read on your recurring charges this period.</p>
            <div className="text-sm text-ink/80 whitespace-pre-line">{data.summary}</div>
            <div className="text-[10px] text-ink/30 mt-2 uppercase tracking-wide">{data.source}</div>
          </div>

          <div className="card">
            <h2 className="panel-title">Active subscriptions</h2>
            <p className="panel-subtitle mb-3">Recurring charges you've confirmed as subscriptions.</p>
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-ink/50 text-xs uppercase">
                <tr>
                  <th className="text-left py-2">Merchant</th>
                  <th className="text-left py-2">Cadence</th>
                  <th className="text-right py-2">Amount</th>
                  <th className="text-right py-2">Monthly equivalent</th>
                </tr>
              </thead>
              <tbody>
                {data.subscriptions.map((s) => (
                  <tr key={s.id} className="border-t border-border-subtle transition-colors hover:bg-surface-raised/60">
                    <td className="py-2">{s.merchant}</td>
                    <td className="py-2 capitalize">{s.cadence}</td>
                    <td className="numeral py-2 text-right">{formatCurrency(s.amount)}</td>
                    <td className="numeral py-2 text-right font-semibold">{formatCurrency(s.monthly_equivalent)}</td>
                  </tr>
                ))}
                {data.subscriptions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-sm text-ink/40">
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
                <h2 className="panel-title">Newly detected</h2>
                <p className="panel-subtitle mb-3">Recurring charges that showed up for the first time recently.</p>
                <ul className="-mx-2">
                  {data.anomalies.new_subscriptions.map((s, i) => (
                    <li key={i} className="flex justify-between text-sm -mx-2 px-2 py-1.5 rounded-lg transition-colors hover:bg-surface-raised/60">
                      <span>{s.merchant}</span>
                      <span className="numeral text-ink/60">{formatCurrency(s.expected_amount)} · {s.cadence}</span>
                    </li>
                  ))}
                  {data.anomalies.new_subscriptions.length === 0 && (
                    <li className="text-xs text-ink/40 px-2 py-1.5">No newly detected subscriptions.</li>
                  )}
                </ul>
              </div>
              <div className="card">
                <h2 className="panel-title">Price increases</h2>
                <p className="panel-subtitle mb-3">Subscriptions whose price crept up since last billed.</p>
                <ul className="-mx-2">
                  {data.anomalies.price_increases.map((p, i) => (
                    <li key={i} className="flex justify-between text-sm -mx-2 px-2 py-1.5 rounded-lg transition-colors hover:bg-surface-raised/60">
                      <span>{p.merchant}</span>
                      <span className="numeral text-warning">
                        {formatCurrency(p.previous_average)} → {formatCurrency(p.latest_amount)} (+{p.increase_pct.toFixed(0)}%)
                      </span>
                    </li>
                  ))}
                  {data.anomalies.price_increases.length === 0 && (
                    <li className="text-xs text-ink/40 px-2 py-1.5">No price increases detected.</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
