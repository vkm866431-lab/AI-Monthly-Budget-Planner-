import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownCircle, Plus, Search } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import DashboardCard from '../components/DashboardCard';
import { ProgressBar } from '../components/common';
import TransactionForm from '../components/TransactionForm';
import TransactionTable from '../components/TransactionTable';
import { useExpense } from '../context/ExpenseContext';
import { api } from '../services/api';
import type { Transaction } from '../types/finance';
import { formatMoney, formatMonthLabel, getRecentMonthOptions } from '../utils/format';

const PAYMENT_METHODS = ['UPI', 'Debit Card', 'Credit Card', 'Net Banking', 'Cash'];

export default function Expenses() {
  const { categories, settings, selectedMonth, refreshTick, triggerRefresh, notify } = useExpense();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalExpense, setTotalExpense] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [monthFilter, setMonthFilter] = useState<string>(selectedMonth);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories]
  );

  const monthOptions = getRecentMonthOptions(12);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.transactions.list({
        type: 'expense',
        category_id: categoryId || undefined,
        payment_method: paymentMethod || undefined,
        month: monthFilter || undefined,
        search: search.trim() || undefined,
        limit: 100,
      });
      setTransactions(res.transactions);
      setTotalExpense(res.summary.total_expense);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to load expense records.');
    } finally {
      setLoading(false);
    }
  }, [categoryId, paymentMethod, monthFilter, search, notify]);

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses, refreshTick]);

  async function handleConfirmDelete() {
    if (!deletingTx) return;
    setDeleting(true);
    try {
      await api.transactions.remove(deletingTx.id);
      notify('success', 'Expense deleted.');
      setDeletingTx(null);
      triggerRefresh();
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to delete expense.');
    } finally {
      setDeleting(false);
    }
  }

  const largestExpense = transactions.reduce(
    (max, t) => (t.amount > max ? t.amount : max),
    0
  );

  const categoryBreakdown = useMemo(() => {
    const grouped = new Map<
      number,
      { id: number; name: string; color: string; total: number; count: number }
    >();
    for (const tx of transactions) {
      const existing = grouped.get(tx.category_id);
      if (existing) {
        existing.total += tx.amount;
        existing.count += 1;
      } else {
        grouped.set(tx.category_id, {
          id: tx.category_id,
          name: tx.category_name,
          color: tx.category_color || '#4F46E5',
          total: tx.amount,
          count: 1,
        });
      }
    }
    return Array.from(grouped.values()).sort((a, b) => b.total - a.total);
  }, [transactions]);

  const sym = settings.currency_symbol;
  const cur = settings.currency;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-[#111827] dark:text-[#F9FAFB]">
            Expense Management
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
            Log daily spending across Food, Education, Rent, Transportation, Utilities, and more.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingTx(null);
            setFormOpen(true);
          }}
          className="h-10 px-4 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <DashboardCard
          title={monthFilter ? `Expenses (${formatMonthLabel(monthFilter)})` : 'All Filtered Expenses'}
          value={formatMoney(totalExpense, sym, cur)}
          subtitle={`${transactions.length} recorded expenses`}
          tone="red"
          icon={ArrowDownCircle}
          loading={loading}
        />
        <DashboardCard
          title="Largest Single Expense"
          value={formatMoney(largestExpense, sym, cur)}
          subtitle="Peak transaction in filter"
          tone="orange"
          loading={loading}
        />
        <DashboardCard
          title="Average Expense"
          value={formatMoney(
            transactions.length > 0 ? totalExpense / transactions.length : 0,
            sym,
            cur
          )}
          subtitle="Mean amount per spend"
          tone="slate"
          loading={loading}
        />
      </div>

      {/* Category-Wise Expense Summary Cards */}
      {!loading && categoryBreakdown.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">
              Category Breakdown
            </h3>
            {categoryId !== 0 && (
              <button
                type="button"
                onClick={() => setCategoryId(0)}
                className="text-xs font-medium text-[#4F46E5] dark:text-[#818CF8] hover:underline"
              >
                Show all categories
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {categoryBreakdown.slice(0, 8).map((cat) => {
              const sharePct = totalExpense > 0 ? (cat.total / totalExpense) * 100 : 0;
              const isSelected = categoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(isSelected ? 0 : cat.id)}
                  className={`text-left rounded-2xl border p-4 transition-all shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${
                    isSelected
                      ? 'border-[#4F46E5] dark:border-[#818CF8] bg-indigo-50/40 dark:bg-indigo-500/10'
                      : 'border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] hover:border-[#D1D5DB] dark:hover:border-[#334155]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                        aria-hidden="true"
                      />
                      <span className="text-xs font-semibold text-[#111827] dark:text-[#F9FAFB] truncate">
                        {cat.name}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono-num text-[#6B7280] dark:text-[#9CA3AF] shrink-0">
                      {sharePct.toFixed(0)}%
                    </span>
                  </div>
                  <p className="mt-2 text-base font-semibold font-mono-num text-[#111827] dark:text-[#F9FAFB]">
                    {formatMoney(cat.total, sym, cur)}
                  </p>
                  <div className="mt-2">
                    <ProgressBar value={sharePct} tone="indigo" size="sm" />
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                    {cat.count} {cat.count === 1 ? 'entry' : 'entries'}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Filters */}
      <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="relative">
          <Search className="w-4 h-4 text-[#6B7280] dark:text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search description or category..."
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC] dark:bg-[#0B1120] text-sm text-[#111827] dark:text-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
          />
        </div>

        <select
          value={categoryId}
          onChange={(e) => setCategoryId(Number(e.target.value))}
          aria-label="Filter by expense category"
          className="h-10 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC] dark:bg-[#0B1120] px-3 text-sm text-[#111827] dark:text-[#F9FAFB]"
        >
          <option value={0}>All Categories</option>
          {expenseCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          aria-label="Filter by payment method"
          className="h-10 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC] dark:bg-[#0B1120] px-3 text-sm text-[#111827] dark:text-[#F9FAFB]"
        >
          <option value="">All Payment Methods</option>
          {PAYMENT_METHODS.map((pm) => (
            <option key={pm} value={pm}>
              {pm}
            </option>
          ))}
        </select>

        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          aria-label="Filter by month"
          className="h-10 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC] dark:bg-[#0B1120] px-3 text-sm text-[#111827] dark:text-[#F9FAFB]"
        >
          <option value="">All Months</option>
          {monthOptions.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <TransactionTable
          transactions={transactions}
          loading={loading}
          emptyTitle="No expense records found"
          emptyDescription="Log your daily expenses to monitor category spending and budget utilization."
          addFirstLabel="Add Expense"
          onAddFirst={() => {
            setEditingTx(null);
            setFormOpen(true);
          }}
          onEdit={(tx) => {
            setEditingTx(tx);
            setFormOpen(true);
          }}
          onDelete={(tx) => setDeletingTx(tx)}
        />
      </div>

      <TransactionForm
        open={formOpen}
        initialType="expense"
        lockType
        editingTransaction={editingTx}
        onClose={() => {
          setFormOpen(false);
          setEditingTx(null);
        }}
        onSaved={() => void loadExpenses()}
      />

      <ConfirmDialog
        open={Boolean(deletingTx)}
        title="Delete expense?"
        description={`Remove "${deletingTx?.description || deletingTx?.category_name}" from your expense records?`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeletingTx(null)}
      />
    </div>
  );
}
