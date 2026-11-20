import React, { useState } from 'react';
import { Calendar, CheckCircle2, Clock, Edit2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useExpense } from '../context/ExpenseContext';
import type { SavingsGoalItem } from '../types/finance';
import { formatDate, formatMoney } from '../utils/format';

interface SavingsGoalProps {
  goal: SavingsGoalItem;
  onContribute: (goalId: number, addAmount: number) => Promise<void>;
  onEdit: (goal: SavingsGoalItem) => void;
  onDelete: (goal: SavingsGoalItem) => void;
}

export default function SavingsGoal({
  goal,
  onContribute,
  onEdit,
  onDelete,
}: SavingsGoalProps) {
  const { settings } = useExpense();
  const [adding, setAdding] = useState(false);
  const [contribution, setContribution] = useState('');
  const [saving, setSaving] = useState(false);

  const isCompleted = goal.status === 'completed';
  const remaining = Math.max(0, goal.target_amount - goal.current_amount);

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = Number(contribution);
    if (!Number.isFinite(val) || val <= 0) return;
    setSaving(true);
    try {
      await onContribute(goal.id, val);
      setContribution('');
      setAdding(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0.92, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors ${
        isCompleted
          ? 'border-[#16A34A]/35 dark:border-emerald-500/35 bg-gradient-to-b from-emerald-50/40 to-white dark:from-emerald-950/15 dark:to-[#172033]'
          : 'border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033]'
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-semibold text-[#111827] dark:text-[#F9FAFB] truncate">
                {goal.goal_name}
              </h3>
              {isCompleted && (
                <Sparkles className="w-4 h-4 text-[#16A34A] dark:text-emerald-400 shrink-0" />
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              <span
                className={`inline-flex items-center gap-1 font-medium ${
                  isCompleted
                    ? 'text-[#16A34A] dark:text-emerald-400'
                    : 'text-[#4F46E5] dark:text-[#818CF8]'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
                <span>{isCompleted ? 'Target Reached' : 'In Progress'}</span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 font-mono-num">
                <Calendar className="w-3 h-3" />
                {formatDate(goal.target_date, settings.date_format)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onEdit(goal)}
              className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#4F46E5] hover:bg-indigo-50 dark:text-[#9CA3AF] dark:hover:text-[#818CF8] dark:hover:bg-indigo-500/15 transition-colors"
              aria-label={`Edit ${goal.goal_name}`}
              title="Edit goal"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(goal)}
              className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#EF4444] hover:bg-red-50 dark:text-[#9CA3AF] dark:hover:text-red-400 dark:hover:bg-red-950/50 transition-colors"
              aria-label={`Delete ${goal.goal_name}`}
              title="Delete goal"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-baseline justify-between text-xs mb-2">
            <span className="text-[#6B7280] dark:text-[#9CA3AF]">
              Saved{' '}
              <strong className="font-mono-num text-[#111827] dark:text-[#F9FAFB]">
                {formatMoney(goal.current_amount, settings.currency_symbol, settings.currency)}
              </strong>{' '}
              of{' '}
              <span className="font-mono-num">
                {formatMoney(goal.target_amount, settings.currency_symbol, settings.currency)}
              </span>
            </span>
            <span className="font-mono-num font-semibold text-[#111827] dark:text-[#F9FAFB]">
              {goal.progress_percent.toFixed(1)}%
            </span>
          </div>

          <div className="h-2.5 w-full rounded-full bg-[#E5E7EB]/80 dark:bg-[#263247] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isCompleted
                  ? 'bg-[#16A34A] dark:bg-emerald-500'
                  : 'bg-[#4F46E5] dark:bg-[#818CF8]'
              }`}
              style={{ width: `${Math.min(100, goal.progress_percent)}%` }}
            />
          </div>
        </div>
      </div>

      {adding ? (
        <form onSubmit={handleAddSubmit} className="flex items-center gap-2 pt-1">
          <input
            type="number"
            min="1"
            step="0.01"
            required
            value={contribution}
            onChange={(e) => setContribution(e.target.value)}
            placeholder="Add amount"
            className="flex-1 h-9 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC] dark:bg-[#0B1120] px-3 text-xs font-mono-num text-[#111827] dark:text-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
          />
          <button
            type="submit"
            disabled={saving}
            className="h-9 px-3 rounded-xl bg-[#16A34A] hover:bg-green-700 text-white text-xs font-medium whitespace-nowrap shrink-0 disabled:opacity-60"
          >
            {saving ? 'Adding...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="h-9 px-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#263247] text-xs text-[#6B7280] dark:text-[#9CA3AF]"
          >
            Cancel
          </button>
        </form>
      ) : (
        <div className="flex items-center justify-between pt-2.5 border-t border-[#E5E7EB]/70 dark:border-[#263247]">
          <span
            className={`text-xs font-mono-num ${
              isCompleted
                ? 'text-[#16A34A] dark:text-emerald-400 font-medium'
                : 'text-[#6B7280] dark:text-[#9CA3AF]'
            }`}
          >
            {isCompleted
              ? 'Goal completed — well done!'
              : `${formatMoney(remaining, settings.currency_symbol, settings.currency)} remaining`}
          </span>
          {!isCompleted && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#4F46E5] dark:text-[#818CF8] hover:bg-indigo-50 dark:hover:bg-indigo-500/15 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Savings</span>
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
