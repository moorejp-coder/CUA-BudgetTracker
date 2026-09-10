import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { NudgesApi } from "@/api/resources";

const EVENT_LABELS: Record<string, { label: string; tone: string; link?: string }> = {
  budget_warning: { label: "Budget warning", tone: "bg-warning-bg text-warning", link: "/categories" },
  budget_overspend: { label: "Repeated overspend", tone: "bg-expense-bg text-expense", link: "/categories" },
  weekend_overspend: { label: "Weekend spending", tone: "bg-accent-bg text-accent", link: "/cashflow" },
};

export default function Coach() {
  const qc = useQueryClient();
  const { data: nudges = [], isLoading } = useQuery({ queryKey: ["nudges"], queryFn: () => NudgesApi.list() });
  const [generating, setGenerating] = useState(false);

  async function dismiss(id: string) {
    await NudgesApi.dismiss(id);
    qc.invalidateQueries({ queryKey: ["nudges"] });
  }

  async function generate() {
    setGenerating(true);
    try {
      await NudgesApi.generate();
      qc.invalidateQueries({ queryKey: ["nudges"] });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="h-full flex flex-col gap-4 min-h-0">
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="font-display text-[28px] font-semibold text-ink tracking-tight">Coach</h1>
          <p className="text-sm text-ink/50 mt-1">
            Behavior-based nudges — budget pace and spending patterns. Runs automatically once
            a day in production.
          </p>
        </div>
        <button className="btn-secondary" disabled={generating} onClick={generate}>
          {generating ? "Checking…" : "Check now"}
        </button>
      </div>

      {isLoading && <p className="shrink-0 text-ink/40 text-sm">Loading…</p>}

      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-0.5">
        {nudges.map((n) => {
          const meta = EVENT_LABELS[n.event_type] ?? { label: n.event_type, tone: "bg-surface-sunken text-ink/60" };
          return (
            <div key={n.id} className="card flex items-start justify-between gap-4">
              <div className="flex-1">
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${meta.tone}`}>{meta.label}</span>
                <p className="text-sm text-ink/80 mt-2">{n.message}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[10px] text-ink/30 uppercase tracking-wide">{n.source}</span>
                  {meta.link && (
                    <Link
                      to={meta.link}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent/80 transition-colors"
                    >
                      View details <ArrowRight size={12} />
                    </Link>
                  )}
                </div>
              </div>
              <button onClick={() => dismiss(n.id)} className="text-ink/30 hover:text-ink text-xs shrink-0">
                Dismiss
              </button>
            </div>
          );
        })}
        {nudges.length === 0 && !isLoading && (
          <div className="card text-center py-10 text-ink/40 text-sm">
            No active nudges right now — nothing needs your attention.
          </div>
        )}
      </div>
    </div>
  );
}
