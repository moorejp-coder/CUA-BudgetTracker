import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, subMonths } from "date-fns";
import { Link } from "react-router-dom";
import { ArrowDownCircle, ArrowUpCircle, Scale, CalendarClock, ArrowRight } from "lucide-react";
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
        <StatCard label="Income" value={summary?.total_income ?? 0} tone="income" icon={ArrowUpCircle} style={{ animationDelay: "0ms" }} />
        <StatCard label="Expenses" value={summary?.total_expense ?? 0} tone="expense" icon={ArrowDownCircle} style={{ animationDelay: "40ms" }} />
        <StatCard
          label="Net"
          value={summary?.net ?? 0}
          tone={summary && summary.net < 0 ? "expense" : "income"}
          icon={Scale}
          style={{ animationDelay: "80ms" }}
        />
      </div>

      {summary && summary.budget_status.length > 0 && (
        <div className="card animate-fade-in-up" style={{ animationDelay: "120ms" }}>
          <h2 className="text-sm font-semibold mb-4">Budget status</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            {summary.budget_status.map((b) => {
              const pct = b.budget > 0 ? Math.min(100, (b.spent / b.budget) * 100) : 0;
              return (
                <div key={b.category_id}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium text-white/85">{b.category_name}</span>
                    <span className={`tabular text-xs ${b.over ? "text-expense" : "text-white/50"}`}>
                      ${b.spent.toFixed(0)} / ${b.budget.toFixed(0)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-sunken overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${b.over ? "bg-expense" : "bg-accent"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {b.over && <div className="text-xs text-expense mt-1">Over budget</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card animate-fade-in-up" style={{ animationDelay: "160ms" }}>
          <h2 className="text-sm font-semibold mb-3">Spending by category</h2>
          <CategoryDonut data={spendByCategory} />
        </div>
        <div className="card animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <h2 className="text-sm font-semibold mb-3">Income vs expenses (6 months)</h2>
          <CashflowChart data={cashflow} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card animate-fade-in-up" style={{ animationDelay: "240ms" }}>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <CalendarClock size={15} className="text-white/40" />
            Upcoming charges (30 days)
          </h2>
          {upcoming.length === 0 && <p className="text-sm text-white/40">No upcoming recurring charges detected.</p>}
          <ul className="space-y-0.5">
            {upcoming.map((u: any) => (
              <li key={u.id} className="flex justify-between items-center text-sm py-1.5 -mx-2 px-2 rounded-lg hover:bg-surface-raised/60 transition-colors">
                <span className="text-white/85">{u.merchant}</span>
                <span className="tabular text-white/50 text-xs">
                  ${u.expected_amount.toFixed(2)} · {u.date}
                </span>
              </li>
            ))}
          </ul>
          <Link to="/recurring" className="text-accent text-xs mt-3 inline-flex items-center gap-1 hover:gap-1.5 transition-all group">
            View all recurring
            <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="card animate-fade-in-up" style={{ animationDelay: "280ms" }}>
          <h2 className="text-sm font-semibold mb-3">Net worth</h2>
          <NetWorthChart data={netWorth} />
        </div>
      </div>
    </div>
  );
}
