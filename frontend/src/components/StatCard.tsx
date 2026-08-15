const fmt = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function StatCard({
  label,
  value,
  tone = "neutral",
  delta,
}: {
  label: string;
  value: number;
  tone?: "income" | "expense" | "neutral";
  delta?: string;
}) {
  const toneClass = tone === "income" ? "text-income" : tone === "expense" ? "text-expense" : "text-white";
  return (
    <div className="card">
      <div className="text-xs text-white/60 mb-2">{label}</div>
      <div className={`text-[28px] font-bold tabular ${toneClass}`}>{fmt(value)}</div>
      {delta && (
        <div className="mt-2 inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-accent-bg text-accent">
          {delta}
        </div>
      )}
    </div>
  );
}
