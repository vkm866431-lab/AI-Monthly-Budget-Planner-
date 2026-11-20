import { AlertCircle, AlertTriangle, CheckCircle2, Edit2, Trash2 } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import type { BudgetItem } from '../types/finance';
import { formatMoney } from '../utils/format';

interface BudgetCardProps {
  budget: BudgetItem;
  onEdit: (budget: BudgetItem) => void;
  onDelete: (budget: BudgetItem) => void;
}

export default function BudgetCard({ budget, onEdit, onDelete }: BudgetCardProps) {
  const { settings } = useExpense();
  const cappedPercent = Math.min(100, budget.utilization_percent);

  const statusMeta =
    budget.status === 'exceeded'
      ? {
          label: 'Budget Exceeded',
          icon: AlertCircle,
          textClass: 'text-[#EF4444] dark:text-red-400',
          barClass: 'bg-[#EF4444] dark:bg-red-500',
          bannerClass: 'bg-red-50/70 dark:bg-red-950/35 border-red-200 dark:border-red-900/60',
        }
      : budget.status === 'warning'
      ? {
          label: 'Approaching Limit (80%+)',
          icon: AlertTriangle,
          textClass: 'text-[#F59E0B] dark:text-amber-400',
          barClass: 'bg-[#F59E0B] dark:bg-amber-400',
          bannerClass: 'bg-amber-50/70 dark:bg-amber-950/35 border-amber-200 dark:border-amber-900/60',
        }
      : {
          label: 'On Track',
          icon: CheckCircle2,
          textClass: 'text-[#16A34A] dark:text-emerald-400',
          barClass: 'bg-[#4F46E5] dark:bg-[#818CF8]',
          bannerClass: 'bg-[#F7F9FC] dark:bg-[#0B1120] border-[#E5E7EB] dark:border-[#263247]',
        };

  const StatusIcon = statusMeta.icon;

  return (
    <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] flex flex-col justify-between gap-4">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-[#111827] dark:text-[#F9FAFB]">
              {budget.category_name}
            </h3>
            <div className={`mt-1 flex items-center gap-1.5 text-xs font-medium ${statusMeta.textClass}`}>
              <StatusIcon className="w-3.5 h-3.5 shrink-0" />
              <span>{statusMeta.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(budget)}
              className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#4F46E5] hover:bg-indigo-50 dark:text-[#9CA3AF] dark:hover:text-[#818CF8] dark:hover:bg-indigo-500/15 transition-colors"
              aria-label={`Edit ${budget.category_name} budget`}
              title="Edit limit"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(budget)}
              className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#EF4444] hover:bg-red-50 dark:text-[#9CA3AF] dark:hover:text-red-400 dark:hover:bg-red-950/50 transition-colors"
              aria-label={`Delete ${budget.category_name} budget`}
              title="Remove budget"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-baseline justify-between text-xs mb-2">
            <span className="text-[#6B7280] dark:text-[#9CA3AF]">
              Spent:{' '}
              <span className="font-mono-num font-semibold text-[#111827] dark:text-[#F9FAFB]">
                {formatMoney(budget.spent_amount, settings.currency_symbol, settings.currency)}
              </span>
            </span>
            <span className="font-mono-num font-semibold text-[#111827] dark:text-[#F9FAFB]">
              {budget.utilization_percent.toFixed(1)}%
            </span>
          </div>

          <div className="h-2.5 w-full rounded-full bg-[#E5E7EB]/80 dark:bg-[#263247] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${statusMeta.barClass}`}
              style={{ width: `${cappedPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className={`rounded-xl border px-3 py-2 flex items-center justify-between text-xs ${statusMeta.bannerClass}`}>
        <span className="text-[#6B7280] dark:text-[#9CA3AF]">
          Limit:{' '}
          <strong className="font-mono-num text-[#111827] dark:text-[#F9FAFB]">
            {formatMoney(budget.limit_amount, settings.currency_symbol, settings.currency)}
          </strong>
        </span>
        <span
          className={`font-mono-num font-medium ${
            budget.remaining_amount < 0
              ? 'text-[#EF4444] dark:text-red-400'
              : 'text-[#16A34A] dark:text-emerald-400'
          }`}
        >
          {budget.remaining_amount < 0 ? 'Over by ' : 'Left: '}
          {formatMoney(Math.abs(budget.remaining_amount), settings.currency_symbol, settings.currency)}
        </span>
      </div>
    </div>
  );
}
