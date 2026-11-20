import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, Plus, Target, X } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import DashboardCard from '../components/DashboardCard';
import SavingsGoal from '../components/SavingsGoal';
import { useExpense } from '../context/ExpenseContext';
import { api } from '../services/api';
import type { SavingsGoalItem, SavingsSummary } from '../types/finance';
import { formatMoney, getTodayIso } from '../utils/format';

export default function Savings() {
  const { settings, refreshTick, triggerRefresh, notify } = useExpense();
  const [goals, setGoals] = useState<SavingsGoalItem[]>([]);
  const [summary, setSummary] = useState<SavingsSummary>({
    total_saved: 0,
    total_target: 0,
    completed_count: 0,
    pending_count: 0,
  });
  const [statusFilter, setStatusFilter] = useState<'' | 'pending' | 'completed'>('');
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoalItem | null>(null);
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [targetDate, setTargetDate] = useState(getTodayIso());
  const [saving, setSaving] = useState(false);

  const [deletingGoal, setDeletingGoal] = useState<SavingsGoalItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadGoals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.savings.list(statusFilter || undefined);
      setGoals(res.goals);
      setSummary(res.summary);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to load savings goals.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, notify]);

  useEffect(() => {
    void loadGoals();
  }, [loadGoals, refreshTick]);

  function openCreateModal() {
    setEditingGoal(null);
    setGoalName('');
    setTargetAmount('');
    setCurrentAmount('0');
    setTargetDate(getTodayIso());
    setModalOpen(true);
  }

  function openEditModal(g: SavingsGoalItem) {
    setEditingGoal(g);
    setGoalName(g.goal_name);
    setTargetAmount(String(g.target_amount));
    setCurrentAmount(String(g.current_amount));
    setTargetDate(g.target_date);
    setModalOpen(true);
  }

  async function handleSaveGoal(e: React.FormEvent) {
    e.preventDefault();
    const target = Number(targetAmount);
    const current = Number(currentAmount || 0);
    if (goalName.trim().length < 2) {
      notify('error', 'Goal name must be at least 2 characters.');
      return;
    }
    if (!Number.isFinite(target) || target <= 0) {
      notify('error', 'Target amount must be greater than zero.');
      return;
    }
    if (!Number.isFinite(current) || current < 0) {
      notify('error', 'Current saved amount cannot be negative.');
      return;
    }

    setSaving(true);
    try {
      if (editingGoal) {
        await api.savings.update(editingGoal.id, {
          goal_name: goalName.trim(),
          target_amount: target,
          current_amount: current,
          target_date: targetDate,
        });
        notify('success', 'Savings goal updated.');
      } else {
        await api.savings.create({
          goal_name: goalName.trim(),
          target_amount: target,
          current_amount: current,
          target_date: targetDate,
        });
        notify('success', 'Savings goal created.');
      }
      setModalOpen(false);
      triggerRefresh();
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Unable to save goal.');
    } finally {
      setSaving(false);
    }
  }

  async function handleContribute(goalId: number, addAmount: number) {
    try {
      await api.savings.update(goalId, { add_amount: addAmount });
      notify('success', 'Savings contribution added.');
      triggerRefresh();
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Unable to add contribution.');
    }
  }

  async function handleConfirmDelete() {
    if (!deletingGoal) return;
    setDeleting(true);
    try {
      await api.savings.remove(deletingGoal.id);
      notify('success', 'Savings goal deleted.');
      setDeletingGoal(null);
      triggerRefresh();
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Unable to delete goal.');
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
            Savings Goals
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
            Plan targets for laptops, emergency reserves, tuition, or travel and track contributions.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="h-10 px-4 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Goal</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Total Saved"
          value={formatMoney(summary.total_saved, sym, cur)}
          subtitle="Across visible goals"
          tone="green"
          icon={Target}
          loading={loading}
        />
        <DashboardCard
          title="Combined Targets"
          value={formatMoney(summary.total_target, sym, cur)}
          subtitle="Total savings commitment"
          tone="indigo"
          loading={loading}
        />
        <DashboardCard
          title="Pending Goals"
          value={String(summary.pending_count)}
          subtitle="Actively saving"
          tone="orange"
          icon={Clock}
          loading={loading}
        />
        <DashboardCard
          title="Completed Goals"
          value={String(summary.completed_count)}
          subtitle="Targets achieved"
          tone="green"
          icon={CheckCircle2}
          loading={loading}
        />
      </div>

      {/* Filter Tabs */}
      <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-[#172033] border border-[#E5E7EB] dark:border-[#263247]">
        {(
          [
            { key: '', label: 'All Goals' },
            { key: 'pending', label: 'In Progress' },
            { key: 'completed', label: 'Completed' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              statusFilter === tab.key
                ? 'bg-[#4F46E5] text-white shadow-xs'
                : 'text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F9FAFB]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-44 rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] animate-pulse"
            />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] py-14 px-6 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="mx-auto w-11 h-11 rounded-xl bg-[#F7F9FC] dark:bg-[#0B1120] border border-[#E5E7EB] dark:border-[#263247] flex items-center justify-center text-[#6B7280] dark:text-[#9CA3AF]">
            <Target className="w-5 h-5" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
            No savings goals found
          </h3>
          <p className="mt-1 text-xs text-[#6B7280] dark:text-[#9CA3AF] max-w-sm mx-auto">
            Define a savings goal with a target amount and deadline to track your progress.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-4 px-4 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-medium"
          >
            Create Savings Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {goals.map((goal) => (
            <SavingsGoal
              key={goal.id}
              goal={goal}
              onContribute={handleContribute}
              onEdit={openEditModal}
              onDelete={(g) => setDeletingGoal(g)}
            />
          ))}
        </div>
      )}

      {/* Goal Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {editingGoal ? 'Edit Savings Goal' : 'Create Savings Goal'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="p-6 space-y-4">
              <div>
                <label
                  htmlFor="goal-name"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Goal Name
                </label>
                <input
                  id="goal-name"
                  type="text"
                  required
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  placeholder="e.g., New Laptop Fund"
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="goal-target"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Target Amount ({sym})
                  </label>
                  <input
                    id="goal-target"
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-mono-num text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="goal-current"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Saved So Far ({sym})
                  </label>
                  <input
                    id="goal-current"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-mono-num text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="goal-date"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Target Date
                </label>
                <input
                  id="goal-date"
                  type="date"
                  required
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100"
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
                  {saving ? 'Saving...' : 'Save Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deletingGoal)}
        title="Delete savings goal?"
        description={`Remove "${deletingGoal?.goal_name}" from your savings targets?`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeletingGoal(null)}
      />
    </div>
  );
}
