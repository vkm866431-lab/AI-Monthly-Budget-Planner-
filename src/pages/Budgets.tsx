import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, AlertTriangle, Plus, Wallet, X } from 'lucide-react';
import BudgetCard from '../components/BudgetCard';
import ConfirmDialog from '../components/ConfirmDialog';
import DashboardCard from '../components/DashboardCard';
import { useExpense } from '../context/ExpenseContext';
import { api } from '../services/api';
import type { BudgetItem, BudgetSummary } from '../types/finance';
import { formatMoney, formatMonthLabel, getRecentMonthOptions } from '../utils/format';

export default function Budgets() {
  const { categories, settings, selectedMonth, setSelectedMonth, refreshTick, triggerRefresh, notify } =
    useExpense();
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [summary, setSummary] = useState<BudgetSummary>({
    total_budgeted: 0,
    total_spent: 0,
    total_remaining: 0,
    overall_utilization: 0,
    warning_count: 0,
    exceeded_count: 0,
  });
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetItem | null>(null);
  const [categoryId, setCategoryId] = useState<number>(0);
  const [limitAmount, setLimitAmount] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const [deletingBudget, setDeletingBudget] = useState<BudgetItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories]
  );

  const monthOptions = getRecentMonthOptions(12);

  const loadBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.budgets.list(selectedMonth);
      setBudgets(res.budgets);
      setSummary(res.summary);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to load budgets.');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, notify]);

  useEffect(() => {
    void loadBudgets();
  }, [loadBudgets, refreshTick]);

  function openCreateModal() {
    setEditingBudget(null);
    const existingIds = new Set(budgets.map((b) => b.category_id));
    const available = expenseCategories.find((c) => !existingIds.has(c.id)) || expenseCategories[0];
    setCategoryId(available ? available.id : 0);
    setLimitAmount('');
    setModalOpen(true);
  }

  function openEditModal(b: BudgetItem) {
    setEditingBudget(b);
    setCategoryId(b.category_id);
    setLimitAmount(String(b.limit_amount));
    setModalOpen(true);
  }

  async function handleSaveBudget(e: React.FormEvent) {
    e.preventDefault();
    const limit = Number(limitAmount);
    if (!Number.isFinite(limit) || limit <= 0) {
      notify('error', 'Budget limit must be greater than zero.');
      return;
    }
    setSaving(true);
    try {
      if (editingBudget) {
        await api.budgets.update(editingBudget.id, limit);
        notify('success', `${editingBudget.category_name} budget updated.`);
      } else {
        await api.budgets.save({
          category_id: categoryId,
          month: selectedMonth,
          limit_amount: limit,
        });
        notify('success', 'Monthly category budget saved.');
      }
      setModalOpen(false);
      triggerRefresh();
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to save budget.');
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingBudget) return;
    setDeleting(true);
    try {
      await api.budgets.remove(deletingBudget.id);
      notify('success', `${deletingBudget.category_name} budget removed.`);
      setDeletingBudget(null);
      triggerRefresh();
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to remove budget.');
    } finally {
      setDeleting(false);
    }
  }

  const sym = settings.currency_symbol;
  const cur = settings.currency;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-[#111827] dark:text-[#F9FAFB]">
            Monthly Category Budgets
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
            Set monthly spending limits per category with automatic 80% warning and exceeded alerts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            aria-label="Budget month"
            className="h-10 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] px-3 text-sm text-[#111827] dark:text-[#F9FAFB]"
          >
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={openCreateModal}
            className="h-10 px-4 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Set Budget</span>
          </button>
        </div>
      </div>

      {/* Alert Banners */}
      {summary.exceeded_count > 0 && (
        <div className="rounded-2xl border border-[#EF4444]/35 dark:border-red-900 bg-red-50/80 dark:bg-red-950/35 px-4 py-3 flex items-center gap-2.5 text-sm text-[#EF4444] dark:text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            <strong>{summary.exceeded_count}</strong>{' '}
            {summary.exceeded_count === 1 ? 'category has' : 'categories have'} exceeded the
            monthly spending limit for {formatMonthLabel(selectedMonth)}.
          </span>
        </div>
      )}

      {summary.warning_count > 0 && (
        <div className="rounded-2xl border border-[#F59E0B]/35 dark:border-amber-900 bg-amber-50/80 dark:bg-amber-950/35 px-4 py-3 flex items-center gap-2.5 text-sm text-amber-950 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0" />
          <span>
            <strong>{summary.warning_count}</strong>{' '}
            {summary.warning_count === 1 ? 'category has' : 'categories have'} reached 80% or more
            of the allocated budget.
          </span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Total Budgeted"
          value={formatMoney(summary.total_budgeted, sym, cur)}
          subtitle={formatMonthLabel(selectedMonth)}
          tone="indigo"
          icon={Wallet}
          loading={loading}
        />
        <DashboardCard
          title="Budget Spent"
          value={formatMoney(summary.total_spent, sym, cur)}
          subtitle="Across budgeted categories"
          tone="orange"
          loading={loading}
        />
        <DashboardCard
          title="Remaining Budget"
          value={formatMoney(summary.total_remaining, sym, cur)}
          subtitle={summary.total_remaining < 0 ? 'Over total budget' : 'Available to spend'}
          tone={summary.total_remaining < 0 ? 'red' : 'green'}
          loading={loading}
        />
        <DashboardCard
          title="Overall Utilization"
          value={`${summary.overall_utilization.toFixed(1)}%`}
          subtitle={`${budgets.length} categories configured`}
          tone={
            summary.overall_utilization > 100
              ? 'red'
              : summary.overall_utilization >= 80
              ? 'orange'
              : 'green'
          }
          loading={loading}
        />
      </div>

      {/* Budget Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-44 rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] animate-pulse"
            />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] py-14 px-6 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="mx-auto w-11 h-11 rounded-xl bg-[#F7F9FC] dark:bg-[#0B1120] border border-[#E5E7EB] dark:border-[#263247] flex items-center justify-center text-[#6B7280] dark:text-[#9CA3AF]">
            <Wallet className="w-5 h-5" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
            No monthly budgets configured for {formatMonthLabel(selectedMonth)}
          </h3>
          <p className="mt-1 text-xs text-[#6B7280] dark:text-[#9CA3AF] max-w-md mx-auto">
            Create category limits for Food, Rent, Education, or Travel to monitor spending
            progress and receive early warnings.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-4 px-4 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-medium"
          >
            Create First Budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onEdit={openEditModal}
              onDelete={(b) => setDeletingBudget(b)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Budget Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {editingBudget
                  ? `Edit ${editingBudget.category_name} Limit`
                  : `Set Monthly Budget (${formatMonthLabel(selectedMonth)})`}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="p-6 space-y-4">
              {!editingBudget && (
                <div>
                  <label
                    htmlFor="budget-category"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Expense Category
                  </label>
                  <select
                    id="budget-category"
                    value={categoryId}
                    onChange={(e) => setCategoryId(Number(e.target.value))}
                    className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100"
                  >
                    {expenseCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label
                  htmlFor="budget-limit"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Monthly Limit ({sym})
                </label>
                <input
                  id="budget-limit"
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={limitAmount}
                  onChange={(e) => setLimitAmount(e.target.value)}
                  placeholder="e.g., 5000"
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-mono-num text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deletingBudget)}
        title="Remove category budget?"
        description={`Delete the ${formatMonthLabel(selectedMonth)} budget limit for "${deletingBudget?.category_name}"? Your expense transactions will remain untouched.`}
        confirmLabel="Remove"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeletingBudget(null)}
      />
    </div>
  );
}
