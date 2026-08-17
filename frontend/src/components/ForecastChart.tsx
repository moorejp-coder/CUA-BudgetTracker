import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CashflowForecast } from "@/types";

export default function ForecastChart({ forecast }: { forecast: CashflowForecast }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={forecast.points}>
          <CartesianGrid strokeDasharray="3 3" stroke="#221d16" vertical={false} />
          <XAxis dataKey="date" stroke="#8a7d68" fontSize={11} tickLine={false} axisLine={false} minTickGap={30} />
          <YAxis stroke="#8a7d68" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            contentStyle={{ background: "#211c15", border: "1px solid #332c21", borderRadius: 8, fontSize: 12 }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, "Projected balance"]}
          />
          <Line type="monotone" dataKey="projected_net_cash" stroke="#c99a4b" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
