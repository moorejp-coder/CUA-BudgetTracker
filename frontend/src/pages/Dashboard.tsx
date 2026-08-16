import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, subMonths } from "date-fns";
import { Link } from "react-router-dom";
import { AnalyticsApi, RecurringApi } from "@/api/resources";
import StatCard from "@/components/StatCard";
import CategoryDonut from "@/components/CategoryDonut";
import CashflowChart from "@/components/CashflowChart";
import NetWorthChart from "@/components/NetWorthChart";

export default function Dashboard() {
  const period = format(new Date(), "yyyy-MM");
  const start = format(startOfMonth(subMonths(new Date(), 5)), "yyyy-MM-dd");
  const end = format(new Date(), "yyyy-MM-dd");

  const { data: summary } = useQuery({ queryKey: ["summary", period], queryFn: () => AnalyticsApi.summary(period) });
  const { data: cashflow = [] } = useQuery({ queryKey: ["cashflow", start, end], queryFn: () => AnalyticsApi.cashflow(start, end) });
  const { data: spendByCategory = [] } = useQuery({
    queryKey: ["spend-by-category", period],
    queryFn: () => AnalyticsApi.spendByCategory(startOfMonthStr(), end),
  });
  const { data: netWorth = [] } = useQuery({ queryKey: ["net-worth", start, end], queryFn: () => AnalyticsApi.netWorth(start, end) });
  const { data: upcoming = [] } = useQuery({ queryKey: ["upcoming"], queryFn: () => RecurringApi.upcoming(30) });

  function startOfMonthStr() {
    return format(startOfMonth(new Date()), "yyyy-MM-dd");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-white/50 text-sm">{format(new Date(), "MMMM yyyy")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Income" value={summary?.total_income ?? 0} tone="income" />
        <StatCard label="Expenses" value={summary?.total_expense ?? 0} tone="expense" />
        <StatCard label="Net" value={summary?.net ?? 0} tone={summary && summary.net < 0 ? "expense" : "income"} />
      </div>

      {summary && summary.budget_status.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold mb-3">Budget status</h2>
          <div className="flex flex-wrap gap-3">
            {summary.budget_status.map((b) => (
              <div
                key={b.category_id}
                className={`text-xs px-3 py-1.5 rounded-full ${b.over ? "bg-expense-bg text-expense" : "bg-income-bg text-income"}`}
              >
                {b.category_name}: ${b.spent.toFixed(0)} / ${b.budget.toFixed(0)}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="text-sm font-semibold mb-3">Spending by category</h2>
          <CategoryDonut data={spendByCategory} />
        </div>
        <div className="card">
          <h2 className="text-sm font-semibold mb-3">Income vs expenses (6 months)</h2>
          <CashflowChart data={cashflow} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="text-sm font-semibold mb-3">Upcoming charges (30 days)</h2>
          {upcoming.length === 0 && <p className="text-sm text-white/40">No upcoming recurring charges detected.</p>}
          <ul className="space-y-2">
            {upcoming.map((u: any) => (
              <li key={u.id} className="flex justify-between text-sm">
                <span>{u.merchant}</span>
                <span className="tabular text-white/60">
                  ${u.expected_amount.toFixed(2)} · {u.date}
                </span>
              </li>
            ))}
          </ul>
          <Link to="/recurring" className="text-accent text-xs mt-3 inline-block">
            View all recurring →
          </Link>
        </div>
        <div className="card">
          <h2 className="text-sm font-semibold mb-3">Net worth</h2>
          <NetWorthChart data={netWorth} />
        </div>
      </div>
    </div>
  );
}
