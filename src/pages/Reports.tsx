import { useCallback, useEffect, useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import DashboardCard from '../components/DashboardCard';
import { useExpense } from '../context/ExpenseContext';
import { api, downloadReportFile } from '../services/api';
import type { ReportData } from '../types/finance';
import { formatDate, formatMoney, formatMonthLabel, getRecentMonthOptions } from '../utils/format';

export default function Reports() {
  const { selectedMonth, settings, refreshTick, notify } = useExpense();
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [monthValue, setMonthValue] = useState(selectedMonth);
  const [yearValue, setYearValue] = useState(selectedMonth.slice(0, 4));
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);

  const activeValue = period === 'monthly' ? monthValue : yearValue;
  const monthOptions = getRecentMonthOptions(12);
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(String);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.analytics.report(period, activeValue);
      setReport(res);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  }, [period, activeValue, notify]);

  useEffect(() => {
    void loadReport();
  }, [loadReport, refreshTick]);

  async function handleExport(format: 'csv' | 'pdf') {
    setExporting(format);
    try {
      await downloadReportFile(format, period, activeValue);
      notify('success', `${format.toUpperCase()} financial report downloaded.`);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : `Failed to export ${format.toUpperCase()}.`);
    } finally {
      setExporting(null);
    }
  }

  const sym = settings.currency_symbol;
  const cur = settings.currency;
  const summary = report?.summary;
  const totalExpenses = summary?.total_expense || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-[#111827] dark:text-[#F9FAFB]">
            Financial Reports & Exports
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
            Generate monthly or annual statements and download formatted CSV or PDF reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="inline-flex p-1 rounded-xl bg-white dark:bg-[#172033] border border-[#E5E7EB] dark:border-[#263247]">
            <button
              type="button"
              onClick={() => setPeriod('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                period === 'monthly'
                  ? 'bg-[#4F46E5] text-white shadow-xs'
                  : 'text-[#6B7280] dark:text-[#9CA3AF]'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setPeriod('yearly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                period === 'yearly'
                  ? 'bg-[#4F46E5] text-white shadow-xs'
                  : 'text-[#6B7280] dark:text-[#9CA3AF]'
              }`}
            >
              Yearly
            </button>
          </div>

          {period === 'monthly' ? (
            <select
              value={monthValue}
              onChange={(e) => setMonthValue(e.target.value)}
              aria-label="Report month"
              className="h-9 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] px-3 text-xs font-medium text-[#111827] dark:text-[#F9FAFB]"
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={yearValue}
              onChange={(e) => setYearValue(e.target.value)}
              aria-label="Report year"
              className="h-9 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] px-3 text-xs font-medium text-[#111827] dark:text-[#F9FAFB]"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            disabled={exporting !== null}
            onClick={() => void handleExport('csv')}
            className="h-9 px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] hover:bg-[#F7F9FC] dark:hover:bg-[#1E293B] text-[#111827] dark:text-[#F9FAFB] text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#16A34A]" />
            <span>{exporting === 'csv' ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          <button
            type="button"
            disabled={exporting !== null}
            onClick={() => void handleExport('pdf')}
            className="h-9 px-3.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 disabled:opacity-60 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exporting === 'pdf' ? 'Building PDF...' : 'Export PDF'}</span>
          </button>
        </div>
      </div>

      {/* Report Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Total Income"
          value={formatMoney(summary?.total_income ?? 0, sym, cur)}
          subtitle={period === 'monthly' ? formatMonthLabel(activeValue) : `Year ${activeValue}`}
          tone="green"
          loading={loading}
        />
        <DashboardCard
          title="Total Expenses"
          value={formatMoney(summary?.total_expense ?? 0, sym, cur)}
          subtitle={`${summary?.transaction_count ?? 0} total entries`}
          tone="red"
          loading={loading}
        />
        <DashboardCard
          title="Net Balance"
          value={formatMoney(summary?.net_balance ?? 0, sym, cur)}
          subtitle="Income minus expenses"
          tone={(summary?.net_balance ?? 0) >= 0 ? 'indigo' : 'red'}
          loading={loading}
        />
        <DashboardCard
          title="Savings Rate"
          value={`${(summary?.savings_rate ?? 0).toFixed(1)}%`}
          subtitle="Net retained percentage"
          tone={(summary?.savings_rate ?? 0) >= 20 ? 'green' : 'slate'}
          loading={loading}
        />
      </div>

      {/* Category Breakdown Table */}
      <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="px-5 py-4 border-b border-[#E5E7EB] dark:border-[#263247] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
              Category-Wise Breakdown
            </h3>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              Aggregated totals grouped by category for{' '}
              {period === 'monthly' ? formatMonthLabel(activeValue) : activeValue}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-5 rounded bg-[#E5E7EB]/60 dark:bg-[#263247] animate-pulse" />
            ))}
          </div>
        ) : (report?.category_breakdown || []).length === 0 ? (
          <div className="py-12 px-6 text-center">
            <FileText className="w-6 h-6 text-[#6B7280] dark:text-[#9CA3AF] mx-auto" />
            <p className="mt-2 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              No transactions recorded for this reporting period.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC]/60 dark:bg-[#0B1120]/40 text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF]">
                  <th className="py-3 px-5">Category</th>
                  <th className="py-3 px-5">Type</th>
                  <th className="py-3 px-5 text-right">Transactions</th>
                  <th className="py-3 px-5 text-right">Expense Share</th>
                  <th className="py-3 px-5 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]/70 dark:divide-[#263247] text-sm">
                {report!.category_breakdown.map((item, idx) => {
                  const share =
                    item.type === 'expense' && totalExpenses > 0
                      ? `${((item.total / totalExpenses) * 100).toFixed(1)}%`
                      : '-';
                  return (
                    <tr key={`${item.type}-${item.category_name}-${idx}`}>
                      <td className="py-3 px-5 font-medium text-[#111827] dark:text-[#F9FAFB]">
                        {item.category_name}
                      </td>
                      <td className="py-3 px-5 text-xs text-[#6B7280] dark:text-[#9CA3AF] capitalize">
                        {item.type}
                      </td>
                      <td className="py-3 px-5 text-right font-mono-num text-[#6B7280] dark:text-[#9CA3AF]">
                        {item.tx_count}
                      </td>
                      <td className="py-3 px-5 text-right font-mono-num text-[#6B7280] dark:text-[#9CA3AF]">
                        {share}
                      </td>
                      <td
                        className={`py-3 px-5 text-right font-mono-num font-semibold ${
                          item.type === 'income'
                            ? 'text-[#16A34A] dark:text-emerald-400'
                            : 'text-[#EF4444] dark:text-red-400'
                        }`}
                      >
                        {formatMoney(item.total, sym, cur)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Period Statement Preview */}
      {!loading && (report?.transactions || []).length > 0 && (
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="px-5 py-4 border-b border-[#E5E7EB] dark:border-[#263247]">
            <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
              Statement Entries ({report!.transactions.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC]/60 dark:bg-[#0B1120]/40 text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF]">
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5">Category</th>
                  <th className="py-3 px-5">Description</th>
                  <th className="py-3 px-5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]/70 dark:divide-[#263247] text-sm">
                {report!.transactions.slice(0, 20).map((tx) => (
                  <tr key={tx.id}>
                    <td className="py-2.5 px-5 text-xs font-mono-num text-[#6B7280] dark:text-[#9CA3AF] whitespace-nowrap">
                      {formatDate(tx.date, settings.date_format)}
                    </td>
                    <td className="py-2.5 px-5 text-xs font-medium text-[#111827] dark:text-[#F9FAFB] whitespace-nowrap">
                      {tx.category_name}
                    </td>
                    <td className="py-2.5 px-5 text-xs text-[#6B7280] dark:text-[#9CA3AF] truncate max-w-md">
                      {tx.description || tx.source_or_method || '-'}
                    </td>
                    <td
                      className={`py-2.5 px-5 text-right font-mono-num font-semibold whitespace-nowrap ${
                        tx.type === 'income'
                          ? 'text-[#16A34A] dark:text-emerald-400'
                          : 'text-[#EF4444] dark:text-red-400'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatMoney(tx.amount, sym, cur)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
