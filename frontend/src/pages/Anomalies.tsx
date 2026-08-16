import { useQuery } from "@tanstack/react-query";
import { AssistantApi } from "@/api/resources";

export default function Anomalies() {
  const { data, isLoading } = useQuery({
    queryKey: ["assistant-anomalies"],
    queryFn: () => AssistantApi.anomalies(30),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Anomalies</h1>
        <p className="text-sm text-white/50 mt-1">
          Transactions from the last 30 days that stand out from your own historical spending
          in that category — not a judgment, just a flag worth a second look.
        </p>
      </div>

      {isLoading && <p className="text-white/40 text-sm">Loading…</p>}

      {data && (
        <>
          <div className="card">
            <h2 className="text-sm font-semibold mb-3">AI summary</h2>
            <div className="text-sm text-white/80 whitespace-pre-line">{data.summary}</div>
            <div className="text-[10px] text-white/30 mt-2 uppercase tracking-wide">{data.source}</div>
          </div>

          <div className="card">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-white/50 text-xs uppercase">
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
                  <tr key={a.transaction_id} className="border-t border-border-subtle">
                    <td className="py-2 whitespace-nowrap">{a.date}</td>
                    <td className="py-2">{a.payee || "—"}</td>
                    <td className="py-2">{a.category_name ?? "Uncategorized"}</td>
                    <td className="py-2 text-right tabular font-semibold text-expense">${a.amount.toFixed(2)}</td>
                    <td className="py-2 text-white/50 text-xs">{a.reason}</td>
                  </tr>
                ))}
                {data.anomalies.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-white/40">
                      No anomalies detected in the last 30 days.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
