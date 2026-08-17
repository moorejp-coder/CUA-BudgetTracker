import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, subMonths } from "date-fns";
import { AnalyticsApi } from "@/api/resources";
import CashflowChart from "@/components/CashflowChart";

export default function CashFlow() {
  const [months, setMonths] = useState(12);
  const start = format(startOfMonth(subMonths(new Date(), months - 1)), "yyyy-MM-dd");
  const end = format(new Date(), "yyyy-MM-dd");

  const { data: cashflow = [] } = useQuery({ queryKey: ["cashflow", start, end], queryFn: () => AnalyticsApi.cashflow(start, end) });

  const totalIncome = cashflow.reduce((s, p) => s + p.income, 0);
  const totalExpense = cashflow.reduce((s, p) => s + p.expense, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[28px] font-semibold text-ink tracking-tight">Cash Flow</h1>
        <select className="input" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
          <option value={3}>Last 3 months</option>
          <option value={6}>Last 6 months</option>
          <option value={12}>Last 12 months</option>
          <option value={24}>Last 24 months</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-xs text-ink/60 mb-1">Total income</div>
          <div className="text-2xl font-bold text-income tabular">${totalIncome.toFixed(0)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-ink/60 mb-1">Total expenses</div>
          <div className="text-2xl font-bold text-expense tabular">${totalExpense.toFixed(0)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-ink/60 mb-1">Net</div>
          <div className={`text-2xl numeral ${totalIncome - totalExpense < 0 ? "text-expense" : "text-income"}`}>
            ${(totalIncome - totalExpense).toFixed(0)}
          </div>
        </div>
      </div>

      <div className="card">
        <CashflowChart data={cashflow} />
      </div>
    </div>
  );
}
