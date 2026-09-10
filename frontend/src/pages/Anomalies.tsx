import { useQuery } from "@tanstack/react-query";
import { AssistantApi } from "@/api/resources";
import { formatCurrency } from "@/lib/format";

export default function Anomalies() {
  const { data, isLoading } = useQuery({
    queryKey: ["assistant-anomalies"],
    queryFn: () => AssistantApi.anomalies(30),
  });

  return (
    <div className="h-full flex flex-col gap-4 min-h-0">
      <div className="shrink-0">
        <h1 className="font-display text-[28px] font-semibold text-ink tracking-tight">Anomalies</h1>
        <p className="text-sm text-ink/50 mt-1">
          Transactions from the last 30 days that stand out from your own historical spending
          in that category — not a judgment, just a flag worth a second look.
        </p>
      </div>

      {isLoading && <p className="shrink-0 text-ink/40 text-sm">Loading…</p>}

      {data && (
        <div className="flex-1 min-h-0 flex flex-col gap-4">
          <div className="card shrink-0">
            <h2 className="panel-title">AI summary</h2>
            <p className="panel-subtitle mb-3">A plain-language read of what stood out.</p>
            <div className="text-sm text-ink/80 whitespace-pre-line">{data.summary}</div>
            <div className="text-[10px] text-ink/30 mt-2 uppercase tracking-wide">{data.source}</div>
          </div>

          <div className="card flex-1 min-h-0 flex flex-col">
            <h2 className="shrink-0 panel-title">Flagged transactions</h2>
            <p className="shrink-0 panel-subtitle mb-3">Transactions that stand out from your typical spending in that category.</p>
            <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-ink/50 text-xs uppercase">
                <tr>
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Payee</th>
                  <th className="text-left py-2">Category</th>
                  <th className="text-right py-2">Amount</th>
                  <th className="text-left py-2">Why it's flagged</th>
                </tr>
              </thead>
              <tbody>
                {data.anomalies.map((a) => (
                  <tr key={a.transaction_id} className="border-t border-border-subtle transition-colors hover:bg-surface-raised/60">
                    <td className="py-2 whitespace-nowrap">{a.date}</td>
                    <td className="py-2">{a.payee || "—"}</td>
                    <td className="py-2">{a.category_name ?? "Uncategorized"}</td>
                    <td className="py-2 text-right numeral text-expense">{formatCurrency(a.amount)}</td>
                    <td className="py-2">
                      <span className="inline-block rounded-full bg-warning-bg px-2 py-0.5 text-xs font-medium text-warning">
                        {a.reason}
                      </span>
                    </td>
                  </tr>
                ))}
                {data.anomalies.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-ink/40">
                      No anomalies detected in the last 30 days — nothing stood out from your usual spending.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
