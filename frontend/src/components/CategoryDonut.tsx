import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategorySpend } from "@/types";

export default function CategoryDonut({ data }: { data: CategorySpend[] }) {
  if (!data.length) {
    return <div className="h-64 flex items-center justify-center text-white/40 text-sm">No expense data for this period</div>;
  }
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="total" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
            {data.map((entry) => (
              <Cell key={entry.category_id} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: "#171c33", border: "1px solid #232948", borderRadius: 8, fontSize: 12 }}
            formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-3 mt-3 text-xs">
        {data.map((c) => (
          <div key={c.category_id} className="flex items-center gap-1.5 text-white/70">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c.color }} />
            {c.emoji} {c.name} — ${c.total.toFixed(0)}
          </div>
        ))}
      </div>
    </div>
  );
}
