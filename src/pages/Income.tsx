import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpCircle, Plus, Search } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import DashboardCard from '../components/DashboardCard';
import TransactionForm from '../components/TransactionForm';
import TransactionTable from '../components/TransactionTable';
import { useExpense } from '../context/ExpenseContext';
import { api } from '../services/api';
import type { Transaction } from '../types/finance';
import { formatMoney, formatMonthLabel, getRecentMonthOptions } from '../utils/format';

export default function Income() {
  const { categories, settings, selectedMonth, refreshTick, triggerRefresh, notify } = useExpense();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<number>(0);
  const [monthFilter, setMonthFilter] = useState<string>(selectedMonth);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === 'income'),
    [categories]
  );

  const monthOptions = getRecentMonthOptions(12);

  const loadIncome = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.transactions.list({
        type: 'income',
        category_id: categoryId || undefined,
        month: monthFilter || undefined,
        search: search.trim() || undefined,
        limit: 100,
      });
      setTransactions(res.transactions);
      setTotalIncome(res.summary.total_income);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to load income records.');
    } finally {
      setLoading(false);
    }
  }, [categoryId, monthFilter, search, notify]);

  useEffect(() => {
    void loadIncome();
  }, [loadIncome, refreshTick]);

  async function handleConfirmDelete() {
    if (!deletingTx) return;
    setDeleting(true);
    try {
      await api.transactions.remove(deletingTx.id);
      notify('success', 'Income record deleted.');
      setDeletingTx(null);
      triggerRefresh();
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to delete income.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-[#111827] dark:text-[#F9FAFB]">
            Income Ledger
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
            Track scholarships, allowances, salary, freelance milestones, and other inflows.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingTx(null);
            setFormOpen(true);
          }}
          className="h-10 px-4 rounded-xl bg-[#16A34A] hover:bg-green-700 text-white text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Income</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <DashboardCard
          title={monthFilter ? `Income (${formatMonthLabel(monthFilter)})` : 'All Filtered Income'}
          value={formatMoney(totalIncome, settings.currency_symbol, settings.currency)}
          subtitle={`${transactions.length} recorded entries`}
          tone="green"
          icon={ArrowUpCircle}
          loading={loading}
        />
        <DashboardCard
          title="Average Entry"
          value={formatMoney(
            transactions.length > 0 ? totalIncome / transactions.length : 0,
            settings.currency_symbol,
            settings.currency
          )}
          subtitle="Mean amount per inflow"
          tone="indigo"
          loading={loading}
        />
        <DashboardCard
          title="Active Categories"
          value={String(new Set(transactions.map((t) => t.category_name)).size)}
          subtitle="Distinct income streams"
          tone="slate"
          loading={loading}
        />
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] p-4 flex flex-col md:flex-row gap-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#6B7280] dark:text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by source, description, or category..."
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC] dark:bg-[#0B1120] text-sm text-[#111827] dark:text-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
          />
        </div>

        <select
          value={categoryId}
          onChange={(e) => setCategoryId(Number(e.target.value))}
          aria-label="Filter by income category"
          className="h-10 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC] dark:bg-[#0B1120] px-3 text-sm text-[#111827] dark:text-[#F9FAFB]"
        >
          <option value={0}>All Categories</option>
          {incomeCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
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
          emptyTitle="No income records found"
          emptyDescription="Add your monthly allowance, scholarship, salary, or freelance earnings."
          addFirstLabel="Add Income"
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
        initialType="income"
        lockType
        editingTransaction={editingTx}
        onClose={() => {
          setFormOpen(false);
          setEditingTx(null);
        }}
        onSaved={() => void loadIncome()}
      />

      <ConfirmDialog
        open={Boolean(deletingTx)}
        title="Delete income record?"
        description={`Remove "${deletingTx?.description || deletingTx?.category_name}" from your income ledger?`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeletingTx(null)}
      />
    </div>
  );
}
