import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, subMonths } from "date-fns";
import { Link } from "react-router-dom";
import { ArrowRight, Clock } from "lucide-react";
import { AnalyticsApi, CategoriesApi, RecurringApi } from "@/api/resources";
import NetWorthChart from "@/components/NetWorthChart";
import { formatCurrency } from "@/lib/format";
import { getCategoryIcon } from "@/lib/categoryIcon";

export default function Dashboard() {
  const period = format(new Date(), "yyyy-MM");
  const start = format(startOfMonth(subMonths(new Date(), 5)), "yyyy-MM-dd");
  const end = format(new Date(), "yyyy-MM-dd");

  const { data: summary } = useQuery({ queryKey: ["summary", period], queryFn: () => AnalyticsApi.summary(period) });
  const { data: netWorth = [] } = useQuery({ queryKey: ["net-worth", start, end], queryFn: () => AnalyticsApi.netWorth(start, end) });
  const { data: upcoming = [] } = useQuery({ queryKey: ["upcoming"], queryFn: () => RecurringApi.upcoming(30) });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: CategoriesApi.list });

  const income = summary?.total_income ?? 0;
  const expense = summary?.total_expense ?? 0;
  const net = summary?.net ?? 0;
  const budgeted = summary?.budget_status.reduce((sum, b) => sum + b.budget, 0) ?? 0;
  const remaining = Math.max(0, budgeted - expense);
  const remainingPct = budgeted > 0 ? Math.min(100, Math.round((remaining / budgeted) * 100)) : 0;

  const netWorthNow = netWorth.length ? netWorth[netWorth.length - 1].net_worth : 0;
  const netWorthPrev = netWorth.length > 1 ? netWorth[netWorth.length - 2].net_worth : netWorthNow;
  const netWorthDelta = netWorthNow - netWorthPrev;

  const categoryByName = new Map(categories.map((c) => [c.name, c]));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-[28px] font-semibold text-ink tracking-tight">Dashboard</h1>
        <p className="text-ink/50 text-sm mt-1">{format(new Date(), "MMMM yyyy")}</p>
      </div>

      {/* Hero plan summary */}
      <section className="card overflow-hidden p-0">
        <div className="grid xl:grid-cols-[1.55fr_1.05fr_0.72fr_0.72fr_0.86fr]">
          <div className="flex min-h-[10.5rem] items-center gap-4 p-5 xl:border-r xl:border-border-subtle">
            <img src="/plant.png" alt="" className="w-24 h-24 flex-none object-contain" />
            <div>
              <h2 className="font-display text-[1.3rem] font-semibold text-ink">Your {format(new Date(), "MMMM")} plan</h2>
              <p className="mt-2 text-sm text-ink/55">
                {net >= 0 ? "You're on track to finish the month strong." : "Spending is running ahead of income this month."}
              </p>
              <p className="mt-2 text-sm font-semibold text-ink/70">{net >= 0 ? "Keep it up!" : "Time to reel it in."}</p>
            </div>
          </div>
          <div className="flex min-h-[8.25rem] flex-col justify-center border-t border-border-subtle p-5 xl:border-t-0">
            <p className="text-[0.78rem] font-semibold text-ink/70">Remaining to spend</p>
            <p className="numeral mt-1.5 text-[clamp(1.75rem,2.2vw,2.35rem)] leading-none text-income">
              {formatCurrency(remaining, 0)}
            </p>
            <p className="mt-3 text-xs text-ink/50">of {formatCurrency(budgeted, 0)} budgeted</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-1.5 flex-1 rounded-full bg-surface-sunken overflow-hidden">
                <div className="h-full rounded-full bg-income" style={{ width: `${remainingPct}%` }} />
              </div>
              <span className="text-xs font-semibold text-ink/50">{remainingPct}%</span>
            </div>
          </div>
          <div className="flex min-h-[8.25rem] flex-col justify-center border-t border-border-subtle p-5 xl:border-t-0 xl:border-l">
            <p className="text-[0.78rem] font-semibold text-ink/70">Income</p>
            <p className="numeral mt-1.5 text-[clamp(1.75rem,2.2vw,2.35rem)] leading-none text-income">
              {formatCurrency(income, 0)}
            </p>
            <p className="mt-3 text-xs text-ink/50">this period</p>
          </div>
          <div className="flex min-h-[8.25rem] flex-col justify-center border-t border-border-subtle p-5 xl:border-t-0 xl:border-l">
            <p className="text-[0.78rem] font-semibold text-ink/70">Spent</p>
            <p className="numeral mt-1.5 text-[clamp(1.75rem,2.2vw,2.35rem)] leading-none text-expense">
              {formatCurrency(expense, 0)}
            </p>
            <p className="mt-3 text-xs text-ink/50">of {formatCurrency(budgeted, 0)}</p>
          </div>
          <div className="flex min-h-[8.25rem] flex-col justify-center border-t border-border-subtle p-5 xl:border-t-0 xl:border-l">
            <p className="text-[0.78rem] font-semibold text-ink/70">Net worth</p>
            <p className="numeral mt-1.5 text-[clamp(1.75rem,2.2vw,2.35rem)] leading-none text-ink">
              {formatCurrency(netWorthNow, 0)}
            </p>
            {netWorth.length > 1 && (
              <span
                className={`mt-3 inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                  netWorthDelta >= 0 ? "bg-income-bg text-income" : "bg-expense-bg text-expense"
                }`}
              >
                {netWorthDelta >= 0 ? "↑" : "↓"} {formatCurrency(Math.abs(netWorthDelta), 0)} vs last
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-4">
        <section className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="panel-title">Spending by category</p>
            <Link to="/categories" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent/80 transition-colors">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {(!summary || summary.budget_status.length === 0) && (
            <p className="mt-6 text-sm text-ink/40">No budgets set for this period yet.</p>
          )}
          <div className="mt-3 divide-y divide-border-subtle">
            {summary?.budget_status.map((b) => {
              const percent = b.budget > 0 ? Math.round((b.spent / b.budget) * 100) : 0;
              const cat = categoryByName.get(b.category_name);
              const Icon = getCategoryIcon(b.category_name);
              return (
                <div
                  key={b.category_id}
                  className="grid grid-cols-[1.6fr_0.75fr_0.75fr_1fr] items-center gap-3 py-2.5 -mx-2 px-2 rounded-lg transition-colors hover:bg-surface-raised/60"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="category-icon" style={cat ? { background: `${cat.color}1a`, color: cat.color } : undefined}>
                      <Icon />
                    </span>
                    <span className="truncate text-sm font-medium text-ink">{b.category_name}</span>
                  </div>
                  <span className="numeral text-sm text-ink">{formatCurrency(b.spent, 0)}</span>
                  <span className="numeral text-sm text-ink/55">{formatCurrency(b.budget, 0)}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 min-w-12 flex-1 rounded-full bg-surface-sunken overflow-hidden shadow-[inset_0_1px_2px_rgba(74,54,27,0.08)]">
                      <div
                        className={`h-full rounded-full transition-[width] duration-300 ease-out ${b.over ? "bg-expense" : "bg-income"}`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                    <span className={`numeral w-8 text-right text-xs tabular-nums ${b.over ? "text-expense" : "text-ink/45"}`}>{percent}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <p className="panel-title">Upcoming charges (30 days)</p>
          <div className="mt-4 space-y-1 -mx-2">
            {upcoming.length === 0 && <p className="mx-2 text-sm text-ink/40">No upcoming recurring charges detected.</p>}
            {upcoming.slice(0, 5).map((u: any) => (
              <div key={u.id} className="flex items-center justify-between gap-3 px-2 py-2 rounded-lg transition-colors hover:bg-surface-raised/60">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="category-icon">
                    <Clock />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{u.merchant}</p>
                    <p className="text-xs text-ink/50">{u.cadence} · {u.date}</p>
                  </div>
                </div>
                <p className="numeral shrink-0 text-sm text-ink">{formatCurrency(u.expected_amount, 0)}</p>
              </div>
            ))}
          </div>
          <Link to="/recurring" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent/80 transition-colors">
            View all upcoming <ArrowRight size={14} />
          </Link>
        </section>

        <section className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="panel-title">Net worth</p>
            <Link to="/cashflow" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent/80 transition-colors">
              View history <ArrowRight size={14} />
            </Link>
          </div>
          <p className="numeral mt-4 text-3xl text-income-deep">{formatCurrency(netWorthNow, 0)}</p>
          {netWorth.length > 1 && (
            <p className={`mt-1 text-sm ${netWorthDelta >= 0 ? "text-income" : "text-expense"}`}>
              {netWorthDelta >= 0 ? "↑" : "↓"} {formatCurrency(Math.abs(netWorthDelta), 0)} vs last snapshot
            </p>
          )}
          <div className="mt-3">
            <NetWorthChart data={netWorth} />
          </div>
        </section>
      </div>
    </div>
  );
}
