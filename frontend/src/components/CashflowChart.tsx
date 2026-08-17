import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CashflowPoint } from "@/types";

export default function CashflowChart({ data }: { data: CashflowPoint[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#221d16" vertical={false} />
          <XAxis dataKey="period" stroke="#8a7d68" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#8a7d68" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            contentStyle={{ background: "#211c15", border: "1px solid #332c21", borderRadius: 8, fontSize: 12 }}
            formatter={(value: number) => `$${value.toFixed(2)}`}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="income" name="Income" fill="#4fae7b" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" name="Expenses" fill="#c6604a" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
