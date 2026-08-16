import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategorySpend } from "@/types";

const fmt0 = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function CategoryDonut({ data }: { data: CategorySpend[] }) {
  if (!data.length) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-white/40 text-sm gap-1">
        <span className="text-2xl">–</span>
        No expense data for this period
      </div>
    );
  }

  const total = data.reduce((sum, c) => sum + c.total, 0);

  return (
    <div>
      <div className="h-56 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="name"
              innerRadius={64}
              outerRadius={100}
              paddingAngle={2}
              cornerRadius={3}
              animationDuration={500}
              animationEasing="ease-out"
            >
              {data.map((entry) => (
                <Cell key={entry.category_id} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "#171c33", border: "1px solid #232948", borderRadius: 8, fontSize: 12 }}
              itemStyle={{ color: "#fff" }}
              formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-[22px] font-bold tabular text-white leading-none">{fmt0(total)}</div>
          <div className="text-[11px] text-white/40 mt-1">total spent</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 text-xs">
        {data.map((c) => (
          <div key={c.category_id} className="flex items-center gap-1.5 text-white/70">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: c.color }} />
            <span aria-hidden>{c.emoji}</span>
            <span>{c.name}</span>
            <span className="tabular text-white/45">${c.total.toFixed(0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
