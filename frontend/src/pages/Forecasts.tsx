import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AssistantApi, ForecastApi } from "@/api/resources";
import ForecastChart from "@/components/ForecastChart";
import type { ScenarioAdjustment, ScenarioQueryResponse, ScenarioResult } from "@/types";
import { formatCurrency } from "@/lib/format";

export default function Forecasts() {
  const [horizon, setHorizon] = useState(30);
  const { data: forecast } = useQuery({ queryKey: ["forecast", horizon], queryFn: () => ForecastApi.cashflow(horizon) });

  const [rows, setRows] = useState<ScenarioAdjustment[]>([{ target: "", value: 0 }]);
  const [manualResult, setManualResult] = useState<ScenarioResult | null>(null);
  const [manualLoading, setManualLoading] = useState(false);

  const [nlQuestion, setNlQuestion] = useState("");
  const [nlResult, setNlResult] = useState<ScenarioQueryResponse | null>(null);
  const [nlLoading, setNlLoading] = useState(false);

  function updateRow(i: number, field: keyof ScenarioAdjustment, value: string) {
    const next = [...rows];
    next[i] = { ...next[i], [field]: field === "value" ? Number(value) : value };
    setRows(next);
  }

  async function runManualScenario() {
    setManualLoading(true);
    try {
      const valid = rows.filter((r) => r.target.trim());
      const result = await ForecastApi.scenario(valid);
      setManualResult(result);
    } finally {
      setManualLoading(false);
    }
  }

  async function askScenario(e: React.FormEvent) {
    e.preventDefault();
    if (!nlQuestion.trim()) return;
    setNlLoading(true);
    try {
      const res = await AssistantApi.scenario(nlQuestion);
      setNlResult(res);
    } finally {
      setNlLoading(false);
    }
  }

  return (
    <div className="h-full flex flex-col gap-4 min-h-0">
      <div className="shrink-0 flex items-center justify-between">
        <h1 className="font-display text-[28px] font-semibold text-ink tracking-tight">Forecasts</h1>
        <div className="flex gap-1">
          {[30, 60, 90].map((d) => (
            <button
              key={d}
              onClick={() => setHorizon(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${horizon === d ? "bg-accent text-ink" : "btn-secondary"}`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {forecast && (
        <div className="card flex-1 min-h-0 flex flex-col">
          <p className="shrink-0 panel-title">Projected balance</p>
          <p className="shrink-0 panel-subtitle mb-4">Based on your recent averages and upcoming recurring charges.</p>
          <div className="shrink-0 grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4 text-sm">
            <div>
              <div className="text-ink/50 text-xs">Avg monthly income</div>
              <div className="numeral text-income">{formatCurrency(forecast.avg_monthly_income, 0)}</div>
            </div>
            <div>
              <div className="text-ink/50 text-xs">Avg monthly expense</div>
              <div className="numeral text-expense">{formatCurrency(forecast.avg_monthly_expense, 0)}</div>
            </div>
            <div>
              <div className="text-ink/50 text-xs">Upcoming recurring ({horizon}d)</div>
              <div className="numeral text-ink">{formatCurrency(forecast.upcoming_recurring_total, 0)}</div>
            </div>
            <div>
              <div className="text-ink/50 text-xs">Starting balance</div>
              <div className="numeral text-ink">{formatCurrency(forecast.starting_balance, 0)}</div>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ForecastChart forecast={forecast} />
          </div>
        </div>
      )}

      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="panel-title">Scenario builder</h2>
          <p className="panel-subtitle mb-3">
            Target a category name for a % change (e.g. -0.2 = cut 20%) or any other label for
            an absolute $/month contribution change.
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {rows.map((row, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Category name"
                  value={row.target}
                  onChange={(e) => updateRow(i, "target", e.target.value)}
                />
                <input
                  className="input w-28"
                  type="number"
                  step="0.01"
                  placeholder="value"
                  value={row.value || ""}
                  onChange={(e) => updateRow(i, "value", e.target.value)}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => setRows([...rows, { target: "", value: 0 }])}>
              + Add adjustment
            </button>
            <button className="btn-primary text-xs px-3 py-1.5" disabled={manualLoading} onClick={runManualScenario}>
              {manualLoading ? "Running…" : "Run scenario"}
            </button>
          </div>

          {manualResult && <ScenarioResultView result={manualResult} />}
        </div>

        <div className="card">
          <h2 className="panel-title mb-3">Ask in plain English</h2>
          <form onSubmit={askScenario} className="flex gap-2 mb-3">
            <input
              className="input flex-1"
              placeholder='e.g. "What if I cut dining out by 20%?"'
              value={nlQuestion}
              onChange={(e) => setNlQuestion(e.target.value)}
            />
            <button className="btn-primary text-xs px-3" disabled={nlLoading}>
              {nlLoading ? "…" : "Ask"}
            </button>
          </form>
          {nlResult && (
            <>
              <div className="text-sm text-ink/80 bg-surface-sunken rounded-lg p-3 mb-3">{nlResult.explanation}</div>
              <ScenarioResultView result={nlResult.result} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ScenarioResultView({ result }: { result: ScenarioResult }) {
  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-ink/50 text-xs">Baseline net/mo</div>
          <div className="numeral text-ink">{formatCurrency(result.baseline_monthly_net)}</div>
        </div>
        <div>
          <div className="text-ink/50 text-xs">Projected net/mo</div>
          <div className={`numeral ${result.monthly_net_delta >= 0 ? "text-income" : "text-expense"}`}>
            {formatCurrency(result.projected_monthly_net)} ({result.monthly_net_delta >= 0 ? "+" : ""}
            {formatCurrency(result.monthly_net_delta)})
          </div>
        </div>
      </div>
    </div>
  );
}
