import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AccountsApi, ForecastApi, GoalsApi } from "@/api/resources";
import type { GoalForecastItem } from "@/types";

export default function Goals() {
  const qc = useQueryClient();
  const { data: goals = [] } = useQuery({ queryKey: ["goals"], queryFn: GoalsApi.list });
  const { data: accounts = [] } = useQuery({ queryKey: ["accounts"], queryFn: AccountsApi.list });
  const { data: forecasts = [] } = useQuery({ queryKey: ["goal-forecast"], queryFn: ForecastApi.goals });
  const forecastByGoal = new Map(forecasts.map((f) => [f.goal_id, f]));
  const [form, setForm] = useState({ name: "", target_amount: "", target_date: "", monthly_contribution: "", account_ids: [] as string[] });

  async function addGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.target_amount) return;
    await GoalsApi.create({
      name: form.name,
      target_amount: parseFloat(form.target_amount),
      target_date: form.target_date || null,
      monthly_contribution: parseFloat(form.monthly_contribution || "0"),
      account_ids: form.account_ids,
    } as any);
    setForm({ name: "", target_amount: "", target_date: "", monthly_contribution: "", account_ids: [] });
    qc.invalidateQueries({ queryKey: ["goals"] });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Goals</h1>

      <div className="card">
        <h2 className="text-sm font-semibold mb-3">New goal</h2>
        <form onSubmit={addGoal} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Target amount</label>
            <input type="number" className="input w-32" value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} />
          </div>
          <div>
            <label className="label">Target date</label>
            <input type="date" className="input" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} />
          </div>
          <div>
            <label className="label">Monthly contribution</label>
            <input
              type="number"
              className="input w-32"
              value={form.monthly_contribution}
              onChange={(e) => setForm({ ...form, monthly_contribution: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Linked account</label>
            <select
              className="input"
              value={form.account_ids[0] ?? ""}
              onChange={(e) => setForm({ ...form, account_ids: e.target.value ? [e.target.value] : [] })}
            >
              <option value="">None</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary">
            Add
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {goals.map((g) => {
          const pct = g.target_amount > 0 ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0;
          const forecast = forecastByGoal.get(g.id);
          return (
            <div key={g.id} className="card">
              <div className="font-semibold">{g.name}</div>
              {g.target_date && <div className="text-xs text-white/40">by {g.target_date}</div>}
              <div className="mt-3 text-lg font-bold tabular">
                ${g.current_amount.toFixed(0)} <span className="text-white/40 font-normal text-sm">/ ${g.target_amount.toFixed(0)}</span>
              </div>
              <div className="h-2 rounded-full bg-surface-sunken overflow-hidden mt-2">
                <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
              </div>
              {g.monthly_contribution > 0 && (
                <div className="text-xs text-white/40 mt-2">${g.monthly_contribution.toFixed(0)}/mo contribution</div>
              )}
              {forecast && <GoalForecastLine forecast={forecast} />}
            </div>
          );
        })}
        {goals.length === 0 && <p className="text-white/40 text-sm">No goals yet.</p>}
      </div>
    </div>
  );
}

function GoalForecastLine({ forecast }: { forecast: GoalForecastItem }) {
  if (forecast.months_to_goal === null) {
    return <div className="text-xs text-white/40 mt-2">Set a monthly contribution to project a completion date.</div>;
  }
  const paceColor = forecast.on_pace === false ? "text-expense" : forecast.on_pace === true ? "text-income" : "text-white/60";
  return (
    <div className="text-xs mt-2 pt-2 border-t border-white/5 space-y-0.5">
      <div className={paceColor}>
        {forecast.months_to_goal.toFixed(1)} months to go{forecast.projected_completion_date && ` — projected ${forecast.projected_completion_date}`}
      </div>
      {forecast.on_pace !== null && (
        <div className="text-white/40">{forecast.on_pace ? "On pace for target date" : "Behind target date at current rate"}</div>
      )}
    </div>
  );
}
