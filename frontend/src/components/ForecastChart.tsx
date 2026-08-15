import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CashflowForecast } from "@/types";

export default function ForecastChart({ forecast }: { forecast: CashflowForecast }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={forecast.points}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1f38" vertical={false} />
          <XAxis dataKey="date" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} minTickGap={30} />
          <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            contentStyle={{ background: "#171c33", border: "1px solid #232948", borderRadius: 8, fontSize: 12 }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, "Projected balance"]}
          />
          <Line type="monotone" dataKey="projected_net_cash" stroke="#5b8def" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
