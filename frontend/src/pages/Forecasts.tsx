import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AssistantApi, ForecastApi } from "@/api/resources";
import ForecastChart from "@/components/ForecastChart";
import type { ScenarioAdjustment, ScenarioQueryResponse, ScenarioResult } from "@/types";

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Forecasts</h1>
        <div className="flex gap-1">
          {[30, 60, 90].map((d) => (
            <button
              key={d}
              onClick={() => setHorizon(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${horizon === d ? "bg-accent text-white" : "btn-secondary"}`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {forecast && (
        <div className="card">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4 text-sm">
            <div>
              <div className="text-white/50 text-xs">Avg monthly income</div>
              <div className="text-income font-semibold tabular">${forecast.avg_monthly_income.toFixed(0)}</div>
            </div>
            <div>
              <div className="text-white/50 text-xs">Avg monthly expense</div>
              <div className="text-expense font-semibold tabular">${forecast.avg_monthly_expense.toFixed(0)}</div>
            </div>
            <div>
              <div className="text-white/50 text-xs">Upcoming recurring ({horizon}d)</div>
              <div className="font-semibold tabular">${forecast.upcoming_recurring_total.toFixed(0)}</div>
            </div>
            <div>
              <div className="text-white/50 text-xs">Starting balance</div>
              <div className="font-semibold tabular">${forecast.starting_balance.toFixed(0)}</div>
            </div>
          </div>
          <ForecastChart forecast={forecast} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="text-sm font-semibold mb-3">Scenario builder</h2>
          <p className="text-xs text-white/50 mb-3">
            Target a category name for a % change (e.g. -0.2 = cut 20%) or a goal name for an
            absolute $/month contribution change.
          </p>
          <div className="space-y-2">
            {rows.map((row, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Category or goal name"
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
          <h2 className="text-sm font-semibold mb-3">Ask in plain English</h2>
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
              <div className="text-sm text-white/80 bg-surface-sunken rounded-lg p-3 mb-3">{nlResult.explanation}</div>
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
          <div className="text-white/50 text-xs">Baseline net/mo</div>
          <div className="font-semibold tabular">${result.baseline_monthly_net.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-white/50 text-xs">Projected net/mo</div>
          <div className={`font-semibold tabular ${result.monthly_net_delta >= 0 ? "text-income" : "text-expense"}`}>
            ${result.projected_monthly_net.toFixed(2)} ({result.monthly_net_delta >= 0 ? "+" : ""}
            {result.monthly_net_delta.toFixed(2)})
          </div>
        </div>
      </div>
      {result.goal_impacts.filter((g) => g.extra_monthly_contribution !== 0).length > 0 && (
        <div className="text-xs text-white/60">
          {result.goal_impacts
            .filter((g) => g.extra_monthly_contribution !== 0)
            .map((g) => (
              <div key={g.goal_id}>
                {g.goal_name}: {g.months_saved ? `${g.months_saved.toFixed(1)} months sooner` : "impact unclear"}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
