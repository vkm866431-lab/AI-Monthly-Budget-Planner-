import { useCallback, useEffect, useState } from 'react';
import {
  BudgetVsActualChart,
  CategoryExpenseDoughnut,
  IncomeExpenseBarChart,
  SavingsProgressChart,
  SpendingTrendLineChart,
} from '../components/ExpenseChart';
import { useExpense } from '../context/ExpenseContext';
import { api } from '../services/api';
import type { AnalyticsData } from '../types/finance';
import { formatMoney, formatMonthLabel } from '../utils/format';

export default function Analytics() {
  const { selectedMonth, settings, refreshTick, notify } = useExpense();
  const [year, setYear] = useState(selectedMonth.slice(0, 4));
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(String);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.analytics.charts(year, selectedMonth);
      setData(res);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  }, [year, selectedMonth, notify]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics, refreshTick]);

  const sym = settings.currency_symbol;
  const cur = settings.currency;
  const totalYearExpense = (data?.category_expenses || []).reduce((acc, c) => acc + c.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-[#111827] dark:text-[#F9FAFB]">
            Financial Analytics
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
            Interactive visualizations derived directly from your SQLite financial records.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="analytics-year" className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
            Year:
          </label>
          <select
            id="analytics-year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="h-9 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] px-3 text-sm text-[#111827] dark:text-[#F9FAFB]"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 1. Monthly Income vs Expense & 2. Monthly Spending Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
            Monthly Income vs Expenses ({year})
          </h3>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mb-4">
            12-month cashflow comparison
          </p>
          <div className="h-72">
            {loading ? (
              <div className="h-full rounded-xl bg-[#F7F9FC] dark:bg-[#0B1120] animate-pulse" />
            ) : (
              <IncomeExpenseBarChart data={data?.monthly_series || []} />
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
            Monthly Spending & Net Savings Trend ({year})
          </h3>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mb-4">
            Track monthly burn rate alongside net savings trajectory
          </p>
          <div className="h-72">
            {loading ? (
              <div className="h-full rounded-xl bg-[#F7F9FC] dark:bg-[#0B1120] animate-pulse" />
            ) : (
              <SpendingTrendLineChart data={data?.monthly_series || []} />
            )}
          </div>
        </div>
      </div>

      {/* 3. Category-wise Expenses & 4. Budget vs Actual */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
            Category-Wise Expenses ({year})
          </h3>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mb-4">
            Total annual spend:{' '}
            <span className="font-mono-num font-medium text-[#111827] dark:text-[#F9FAFB]">
              {formatMoney(totalYearExpense, sym, cur)}
            </span>
          </p>
          <div className="h-72 flex items-center justify-center">
            {loading ? (
              <div className="h-48 w-48 rounded-full bg-[#F7F9FC] dark:bg-[#0B1120] animate-pulse" />
            ) : (data?.category_expenses || []).length === 0 ? (
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                No expenses recorded in {year}.
              </p>
            ) : (
              <CategoryExpenseDoughnut data={data?.category_expenses || []} />
            )}
          </div>
        </div>

        <div className="lg:col-span-7 rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
            Budget vs Actual Expenses ({formatMonthLabel(selectedMonth)})
          </h3>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mb-4">
            Overspent categories highlight in red
          </p>
          <div className="h-72 flex items-center justify-center">
            {loading ? (
              <div className="h-full w-full rounded-xl bg-[#F7F9FC] dark:bg-[#0B1120] animate-pulse" />
            ) : (data?.budget_vs_actual || []).length === 0 ? (
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                No category budgets configured for {formatMonthLabel(selectedMonth)}.
              </p>
            ) : (
              <BudgetVsActualChart data={data?.budget_vs_actual || []} />
            )}
          </div>
        </div>
      </div>

      {/* 5. Savings Goals Progress */}
      <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
          Savings Goals Progress
        </h3>
        <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mb-4">
          Current saved amount vs target across all savings goals
        </p>
        <div className="h-64 flex items-center justify-center">
          {loading ? (
            <div className="h-full w-full rounded-xl bg-[#F7F9FC] dark:bg-[#0B1120] animate-pulse" />
          ) : (data?.savings_progress || []).length === 0 ? (
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              No savings goals created yet.
            </p>
          ) : (
            <SavingsProgressChart data={data?.savings_progress || []} />
          )}
        </div>
      </div>
    </div>
  );
}
