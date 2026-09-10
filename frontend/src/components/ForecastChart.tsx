import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CashflowForecast } from "@/types";
import { formatCurrency, formatNumber } from "@/lib/format";

export default function ForecastChart({ forecast }: { forecast: CashflowForecast }) {
  if (!forecast.points.length) {
    return (
      <div className="h-full min-h-[8rem] flex items-center justify-center text-ink/40 text-sm">
        Not enough data yet to project a forecast.
      </div>
    );
  }
  return (
    <div className="h-full min-h-[8rem]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={forecast.points}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee7db" vertical={false} />
          <XAxis dataKey="date" stroke="#a49a83" fontSize={11} tickLine={false} axisLine={false} minTickGap={30} />
          <YAxis stroke="#a49a83" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${formatNumber(v)}`} />
          <Tooltip
            contentStyle={{ background: "#fffefd", border: "1px solid #e9dcc5", borderRadius: 8, fontSize: 12 }}
            formatter={(value: number) => [formatCurrency(value), "Projected balance"]}
          />
          <Line type="monotone" dataKey="projected_net_cash" stroke="#cf8e27" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
