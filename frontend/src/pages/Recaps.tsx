import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RecapsApi } from "@/api/resources";
import type { Recap } from "@/types";
import { formatCurrency } from "@/lib/format";

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
          <h2 className="panel-title">History</h2>
          <p className="panel-subtitle mb-3">Recaps you've generated, most recent first.</p>
          {isLoading && <p className="text-ink/40 text-sm">Loading…</p>}
          <ul className="-mx-2">
            {recaps.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => setSelected(r)}
                  className={`w-full text-left -mx-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active?.id === r.id ? "bg-surface-raised text-ink" : "text-ink/60 hover:bg-surface-raised/60"
                  }`}
                >
                  <div className="font-medium capitalize">{r.period_type}ly</div>
                  <div className="text-xs text-ink/40">
                    {r.period_start} – {r.period_end}
                  </div>
                </button>
              </li>
            ))}
            {recaps.length === 0 && !isLoading && <p className="text-ink/40 text-sm px-1">No recaps yet — generate one above.</p>}
          </ul>
        </div>

        <div className="card col-span-2">
          {active ? (
            <>
              <div className="flex items-center justify-between mb-1">
                <h2 className="panel-title capitalize">
                  {active.period_type}ly recap · {active.period_start} – {active.period_end}
                </h2>
                <span className="text-[10px] text-ink/30 uppercase tracking-wide">{active.source}</span>
              </div>
              <p className="panel-subtitle mb-4">An automated read on the period's income, spending, and savings rate.</p>
              <div className="text-sm text-ink/80 whitespace-pre-line leading-relaxed">{active.recap_text}</div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
                <div className="rounded-lg bg-surface-raised p-3.5 border border-border-subtle">
                  <div className="text-xs text-ink/50">Income</div>
                  <div className="numeral text-lg text-income mt-0.5">{formatCurrency(Number(active.context.income ?? 0), 0)}</div>
                </div>
                <div className="rounded-lg bg-surface-raised p-3.5 border border-border-subtle">
                  <div className="text-xs text-ink/50">Expenses</div>
                  <div className="numeral text-lg text-expense mt-0.5">{formatCurrency(Number(active.context.expenses ?? 0), 0)}</div>
                </div>
                <div className="rounded-lg bg-surface-raised p-3.5 border border-border-subtle">
                  <div className="text-xs text-ink/50">Savings rate</div>
                  <div className="numeral text-lg text-ink mt-0.5">{(Number(active.context.savings_rate ?? 0) * 100).toFixed(0)}%</div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-ink/40 text-sm">Generate a recap above to see it here.</p>
          )}
        </div>
      </div>
    </div>
  );
}
