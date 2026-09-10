import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CashflowPoint } from "@/types";
import { formatCurrency, formatNumber } from "@/lib/format";

export default function CashflowChart({ data }: { data: CashflowPoint[] }) {
  if (!data.length) {
    return (
      <div className="h-full min-h-[8rem] flex items-center justify-center text-ink/40 text-sm">
        No cash flow data for this range yet.
      </div>
    );
  }
  return (
    <div className="h-full min-h-[8rem]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee7db" vertical={false} />
          <XAxis dataKey="period" stroke="#a49a83" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#a49a83" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${formatNumber(v)}`} />
          <Tooltip
            contentStyle={{ background: "#fffefd", border: "1px solid #e9dcc5", borderRadius: 8, fontSize: 12 }}
            formatter={(value: number) => formatCurrency(value)}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="income" name="Income" fill="#3f825f" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" name="Expenses" fill="#c85d43" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
