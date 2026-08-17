import type { LucideIcon } from "lucide-react";

const fmt = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function StatCard({
  label,
  value,
  tone = "neutral",
  delta,
  icon: Icon,
  style,
}: {
  label: string;
  value: number;
  tone?: "income" | "expense" | "neutral";
  delta?: string;
  icon?: LucideIcon;
  style?: React.CSSProperties;
}) {
  const toneClass = tone === "income" ? "text-income" : tone === "expense" ? "text-expense" : "text-ink";
  const iconToneClass =
    tone === "income" ? "bg-income-bg text-income" : tone === "expense" ? "bg-expense-bg text-expense" : "bg-accent-bg text-accent";

  return (
    <div className="card animate-fade-in-up hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)]" style={style}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-medium text-ink/60">{label}</div>
        {Icon && (
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconToneClass}`}>
            <Icon size={14} strokeWidth={2.25} />
          </div>
        )}
      </div>
      <div className={`text-[28px] leading-[34px] numeral ${toneClass}`}>{fmt(value)}</div>
      {delta && (
        <div className="mt-2 inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-accent-bg text-accent">
          {delta}
        </div>
      )}
    </div>
  );
}
