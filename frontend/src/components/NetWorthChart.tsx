import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { NetWorthPoint } from "@/types";
import { formatCurrency, formatNumber } from "@/lib/format";

export default function NetWorthChart({ data }: { data: NetWorthPoint[] }) {
  if (!data.length) {
    return (
      <div className="h-full min-h-[8rem] flex items-center justify-center text-ink/40 text-sm">
        No balance snapshots yet — add one from the Accounts page.
      </div>
    );
  }
  return (
    <div className="h-full min-h-[8rem]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee7db" vertical={false} />
          <XAxis dataKey="date" stroke="#a49a83" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#a49a83" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${formatNumber(v)}`} />
          <Tooltip
            contentStyle={{ background: "#fffefd", border: "1px solid #e9dcc5", borderRadius: 8, fontSize: 12 }}
            formatter={(value: number) => formatCurrency(value)}
          />
          <Line type="monotone" dataKey="net_worth" name="Net worth" stroke="#3f825f" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
