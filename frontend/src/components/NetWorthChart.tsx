import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { NetWorthPoint } from "@/types";

export default function NetWorthChart({ data }: { data: NetWorthPoint[] }) {
  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-white/40 text-sm">
        No balance snapshots yet — add one from the Accounts page.
      </div>
    );
  }
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1f38" vertical={false} />
          <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            contentStyle={{ background: "#171c33", border: "1px solid #232948", borderRadius: 8, fontSize: 12 }}
            formatter={(value: number) => `$${value.toFixed(2)}`}
          />
          <Line type="monotone" dataKey="net_worth" name="Net worth" stroke="#5b8def" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
