import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowRight,
  ArrowUpCircle,
  Database,
  PiggyBank,
  Plus,
  Wallet,
} from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import DashboardCard from '../components/DashboardCard';
import {
  BudgetVsActualChart,
  CategoryExpenseDoughnut,
  IncomeExpenseBarChart,
  SpendingTrendLineChart,
} from '../components/ExpenseChart';
import { ErrorState, ProgressBar } from '../components/common';
import TransactionForm from '../components/TransactionForm';
import TransactionTable from '../components/TransactionTable';
import { useExpense } from '../context/ExpenseContext';
import { api } from '../services/api';
import type { DashboardData, Transaction } from '../types/finance';
import { formatMoney, formatMonthLabel } from '../utils/format';

function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function Dashboard() {
  const { user, selectedMonth, settings, refreshTick, triggerRefresh, notify } = useExpense();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [seeding, setSeeding] = useState(false);

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.analytics.dashboard(selectedMonth);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard, refreshTick]);

  async function handleSeedSample() {
    setSeeding(true);
    try {
      await api.settings.seedSample(selectedMonth);
      notify('success', 'Sample semester records loaded into SQLite.');
      triggerRefresh();
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to load sample data.');
    } finally {
      setSeeding(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingTx) return;
    setDeleting(true);
    try {
      await api.transactions.remove(deletingTx.id);
      notify('success', 'Transaction deleted.');
      setDeletingTx(null);
      triggerRefresh();
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to delete transaction.');
    } finally {
      setDeleting(false);
    }
  }

  const sym = settings.currency_symbol;
  const cur = settings.currency;
  const kpis = data?.kpis;
  const firstName = (user?.full_name || 'User').trim().split(' ')[0];
  const todayLabel = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const alertBudgets = (data?.budgets || []).filter(
    (b) => b.status === 'warning' || b.status === 'exceeded'
  );

  const savingsProgressPct =
    (kpis?.savings_target ?? 0) > 0
      ? Math.min(100, ((kpis?.total_savings ?? 0) / kpis!.savings_target) * 100)
      : 0;

  const isCompletelyEmpty =
    !loading &&
    data &&
    data.recent_transactions.length === 0 &&
    data.budgets.length === 0 &&
    kpis?.total_goals === 0;

  const budgetChartData = (data?.budgets || []).map((b) => ({
    category_name: b.category_name,
    budgeted: b.limit_amount,
    actual: b.spent_amount,
  }));

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF]">{todayLabel}</p>
          <h2 className="mt-1 font-display text-xl sm:text-2xl font-semibold tracking-tight text-[#111827] dark:text-[#F9FAFB]">
            {getTimeOfDayGreeting()}, {firstName}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            Cashflow, budget limits, and savings snapshot for {formatMonthLabel(selectedMonth)}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingTx(null);
            setFormOpen(true);
          }}
          className="h-10 px-4 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 self-start md:self-auto shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Transaction</span>
        </button>
      </section>

      {error && <ErrorState message={error} onRetry={() => void loadDashboard()} />}

      {/* Empty State Onboarding Banner for New Accounts */}
      {isCompletelyEmpty && (
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div>
            <h3 className="text-base font-semibold text-[#111827] dark:text-[#F9FAFB]">
              Your financial ledger is ready
            </h3>
            <p className="mt-1 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
              Start by logging your first income or expense, or load optional sample semester records
              to explore charts and budget alerts immediately.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingTx(null);
                setFormOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-medium transition-colors whitespace-nowrap"
            >
              Log First Entry
            </button>
            <button
              type="button"
              onClick={() => void handleSeedSample()}
              disabled={seeding}
              className="px-4 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#263247] text-[#111827] dark:text-[#F9FAFB] hover:bg-[#F7F9FC] dark:hover:bg-[#1E293B] text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap disabled:opacity-60"
            >
              <Database className="w-3.5 h-3.5" />
              <span>{seeding ? 'Seeding...' : 'Load Sample Data'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Budget Alert Banner */}
      {alertBudgets.length > 0 && (
        <div className="rounded-2xl border border-[#F59E0B]/35 dark:border-amber-900/70 bg-amber-50/80 dark:bg-amber-950/30 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5 text-xs sm:text-sm text-amber-950 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5 sm:mt-0" />
            <span>
              <strong>Budget Alert ({formatMonthLabel(selectedMonth)}):</strong>{' '}
              {alertBudgets
                .map(
                  (b) =>
                    `${b.category_name} (${b.utilization_percent.toFixed(0)}%${
                      b.status === 'exceeded' ? ' exceeded' : ''
                    })`
                )
                .join(' · ')}
            </span>
          </div>
          <Link
            to="/budgets"
            className="text-xs font-medium text-amber-900 dark:text-amber-300 hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <span>Review Budgets</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* 4 Financial Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <DashboardCard
          title="Total Income"
          value={formatMoney(kpis?.monthly_income ?? 0, sym, cur)}
          subtitle={`Month of ${formatMonthLabel(selectedMonth)}`}
          tone="green"
          icon={ArrowUpCircle}
          loading={loading}
          trendPercent={kpis?.income_change_percent}
          trendPositiveIsGood={true}
        />
        <DashboardCard
          title="Total Expenses"
          value={formatMoney(kpis?.monthly_expense ?? 0, sym, cur)}
          subtitle={`Month of ${formatMonthLabel(selectedMonth)}`}
          tone="red"
          icon={ArrowDownCircle}
          loading={loading}
          trendPercent={kpis?.expense_change_percent}
          trendPositiveIsGood={false}
        />
        <DashboardCard
          title="Available Balance"
          value={formatMoney(kpis?.available_balance ?? 0, sym, cur)}
          subtitle={`Month net: ${formatMoney(kpis?.monthly_balance ?? 0, sym, cur)} · Savings rate ${(
            kpis?.savings_rate ?? 0
          ).toFixed(1)}%`}
          tone={(kpis?.available_balance ?? 0) >= 0 ? 'indigo' : 'red'}
          icon={Wallet}
          loading={loading}
        />
        <DashboardCard
          title="Total Savings"
          value={formatMoney(kpis?.total_savings ?? 0, sym, cur)}
          subtitle={
            (kpis?.savings_target ?? 0) > 0
              ? `${savingsProgressPct.toFixed(0)}% of ${formatMoney(
                  kpis?.savings_target ?? 0,
                  sym,
                  cur
                )} target (${kpis?.completed_goals ?? 0}/${kpis?.total_goals ?? 0} goals)`
              : `${kpis?.completed_goals ?? 0} of ${kpis?.total_goals ?? 0} goals completed`
          }
          tone="green"
          icon={PiggyBank}
          loading={loading}
          progressPercent={(kpis?.savings_target ?? 0) > 0 ? savingsProgressPct : undefined}
        />
      </section>

      {/* Charts Row 1: Income vs Expenses & Category Doughnut */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
                Income vs Expenses
              </h3>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                6-month rolling cashflow from SQLite ledger
              </p>
            </div>
            <Link
              to="/analytics"
              className="text-xs font-medium text-[#4F46E5] dark:text-[#818CF8] hover:underline whitespace-nowrap"
            >
              Full Analytics
            </Link>
          </div>
          <div className="h-72">
            {loading ? (
              <div className="h-full w-full rounded-xl bg-[#F7F9FC] dark:bg-[#0B1120] animate-pulse" />
            ) : (
              <IncomeExpenseBarChart data={data?.monthly_trend || []} />
            )}
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
                Expense Categories
              </h3>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                Breakdown for {formatMonthLabel(selectedMonth)}
              </p>
            </div>
            <Link
              to="/expenses"
              className="text-xs font-medium text-[#4F46E5] dark:text-[#818CF8] hover:underline whitespace-nowrap"
            >
              Manage
            </Link>
          </div>
          <div className="h-72 flex items-center justify-center">
            {loading ? (
              <div className="h-48 w-48 rounded-full bg-[#F7F9FC] dark:bg-[#0B1120] animate-pulse" />
            ) : (data?.category_breakdown || []).length === 0 ? (
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] text-center">
                No expenses recorded for {formatMonthLabel(selectedMonth)}.
              </p>
            ) : (
              <CategoryExpenseDoughnut data={data?.category_breakdown || []} />
            )}
          </div>
        </div>
      </section>

      {/* Charts Row 2: Monthly Spending Trend & Budget Utilization Chart */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
                Monthly Spending & Net Savings Trend
              </h3>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                6-month spending curve vs net savings trajectory
              </p>
            </div>
            <Link
              to="/reports"
              className="text-xs font-medium text-[#4F46E5] dark:text-[#818CF8] hover:underline whitespace-nowrap"
            >
              Statements
            </Link>
          </div>
          <div className="h-64">
            {loading ? (
              <div className="h-full w-full rounded-xl bg-[#F7F9FC] dark:bg-[#0B1120] animate-pulse" />
            ) : (
              <SpendingTrendLineChart data={data?.monthly_trend || []} />
            )}
          </div>
        </div>

        <div className="lg:col-span-6 rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
                Budget Utilization Progress
              </h3>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                Budgeted limit vs actual spend for {formatMonthLabel(selectedMonth)}
              </p>
            </div>
            <Link
              to="/budgets"
              className="text-xs font-medium text-[#4F46E5] dark:text-[#818CF8] hover:underline whitespace-nowrap"
            >
              Configure
            </Link>
          </div>
          <div className="h-64 flex items-center justify-center">
            {loading ? (
              <div className="h-full w-full rounded-xl bg-[#F7F9FC] dark:bg-[#0B1120] animate-pulse" />
            ) : budgetChartData.length === 0 ? (
              <div className="text-center">
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                  No category budgets configured for {formatMonthLabel(selectedMonth)}.
                </p>
                <Link
                  to="/budgets"
                  className="mt-3 inline-block px-3.5 py-1.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-medium"
                >
                  Set Category Budgets
                </Link>
              </div>
            ) : (
              <BudgetVsActualChart data={budgetChartData} />
            )}
          </div>
        </div>
      </section>

      {/* Budget Overview List + Recent Transactions */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
                Category Budget Overview
              </h3>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                {formatMoney(kpis?.total_budget_spent ?? 0, sym, cur)} spent of{' '}
                {formatMoney(kpis?.total_budgeted ?? 0, sym, cur)} budgeted
              </p>
            </div>
            <Link
              to="/budgets"
              className="text-xs font-medium text-[#4F46E5] dark:text-[#818CF8] hover:underline whitespace-nowrap"
            >
              Manage All
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="h-3 w-36 bg-[#E5E7EB] dark:bg-[#263247] rounded animate-pulse" />
                  <div className="h-2 w-full bg-[#E5E7EB]/60 dark:bg-[#263247]/60 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : (data?.budgets || []).length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                No monthly category budgets set for {formatMonthLabel(selectedMonth)}.
              </p>
              <Link
                to="/budgets"
                className="mt-3 inline-block px-3.5 py-1.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-medium"
              >
                Set Category Budgets
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {data!.budgets.slice(0, 6).map((b) => {
                const tone =
                  b.status === 'exceeded'
                    ? 'red'
                    : b.status === 'warning'
                    ? 'amber'
                    : 'indigo';
                return (
                  <div key={b.id}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-[#111827] dark:text-[#F9FAFB]">
                        {b.category_name}
                      </span>
                      <span className="font-mono-num text-[#6B7280] dark:text-[#9CA3AF]">
                        {formatMoney(b.spent_amount, sym, cur)} /{' '}
                        {formatMoney(b.limit_amount, sym, cur)} ({b.utilization_percent.toFixed(0)}%)
                      </span>
                    </div>
                    <ProgressBar value={b.utilization_percent} tone={tone} size="sm" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-7 rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="px-5 py-4 border-b border-[#E5E7EB] dark:border-[#263247] flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
                Recent Transactions
              </h3>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                Latest income and expense activity
              </p>
            </div>
            <Link
              to="/transactions"
              className="text-xs font-medium text-[#4F46E5] dark:text-[#818CF8] hover:underline whitespace-nowrap"
            >
              View All Transactions
            </Link>
          </div>
          <TransactionTable
            transactions={data?.recent_transactions || []}
            loading={loading}
            onAddFirst={() => {
              setEditingTx(null);
              setFormOpen(true);
            }}
            addFirstLabel="Log Transaction"
            onEdit={(tx) => {
              setEditingTx(tx);
              setFormOpen(true);
            }}
            onDelete={(tx) => setDeletingTx(tx)}
          />
        </div>
      </section>

      <TransactionForm
        open={formOpen}
        editingTransaction={editingTx}
        onClose={() => {
          setFormOpen(false);
          setEditingTx(null);
        }}
        onSaved={() => void loadDashboard()}
      />

      <ConfirmDialog
        open={Boolean(deletingTx)}
        title="Delete transaction?"
        description={`This will permanently remove "${
          deletingTx?.description || deletingTx?.category_name || 'this record'
        }" from your financial ledger.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeletingTx(null)}
      />
    </div>
  );
}
