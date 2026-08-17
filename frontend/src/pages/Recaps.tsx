import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RecapsApi } from "@/api/resources";
import type { Recap } from "@/types";

export default function Recaps() {
  const qc = useQueryClient();
  const { data: recaps = [], isLoading } = useQuery({ queryKey: ["recaps"], queryFn: RecapsApi.list });
  const [selected, setSelected] = useState<Recap | null>(null);
  const [generating, setGenerating] = useState<"week" | "month" | null>(null);

  async function generate(periodType: "week" | "month") {
    setGenerating(periodType);
    try {
      const recap = await RecapsApi.generate(periodType);
      qc.invalidateQueries({ queryKey: ["recaps"] });
      setSelected(recap);
    } finally {
      setGenerating(null);
    }
  }

  const active = selected ?? recaps[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[28px] font-semibold text-ink tracking-tight">Recaps</h1>
          <p className="text-sm text-ink/50 mt-1">
            Automated weekly and monthly summaries. In production these generate on a schedule
            (Mon 6am / 1st of month); trigger one manually below for the most recently completed period.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" disabled={generating !== null} onClick={() => generate("week")}>
            {generating === "week" ? "Generating…" : "Generate weekly"}
          </button>
          <button className="btn-primary" disabled={generating !== null} onClick={() => generate("month")}>
            {generating === "month" ? "Generating…" : "Generate monthly"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card col-span-1">
          <h2 className="text-sm font-semibold mb-3">History</h2>
          {isLoading && <p className="text-ink/40 text-sm">Loading…</p>}
          <ul className="space-y-1">
            {recaps.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => setSelected(r)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                    active?.id === r.id ? "bg-surface-raised text-ink" : "text-ink/60 hover:bg-surface-raised"
                  }`}
                >
                  <div className="font-medium capitalize">{r.period_type}ly</div>
                  <div className="text-xs text-ink/40">
                    {r.period_start} – {r.period_end}
                  </div>
                </button>
              </li>
            ))}
            {recaps.length === 0 && !isLoading && <p className="text-ink/40 text-sm px-1">No recaps yet.</p>}
          </ul>
        </div>

        <div className="card col-span-2">
          {active ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold capitalize">
                  {active.period_type}ly recap · {active.period_start} – {active.period_end}
                </h2>
                <span className="text-[10px] text-ink/30 uppercase tracking-wide">{active.source}</span>
              </div>
              <div className="text-sm text-ink/80 whitespace-pre-line leading-relaxed">{active.recap_text}</div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
                <div className="bg-surface-sunken rounded-lg p-3">
                  <div className="text-xs text-ink/50">Income</div>
                  <div className="text-lg numeral text-income">${Number(active.context.income ?? 0).toFixed(0)}</div>
                </div>
                <div className="bg-surface-sunken rounded-lg p-3">
                  <div className="text-xs text-ink/50">Expenses</div>
                  <div className="text-lg numeral text-expense">${Number(active.context.expenses ?? 0).toFixed(0)}</div>
                </div>
                <div className="bg-surface-sunken rounded-lg p-3">
                  <div className="text-xs text-ink/50">Savings rate</div>
                  <div className="text-lg numeral text-ink">{(Number(active.context.savings_rate ?? 0) * 100).toFixed(0)}%</div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-ink/40 text-sm">Generate a recap to see it here.</p>
          )}
        </div>
      </div>
    </div>
  );
}
