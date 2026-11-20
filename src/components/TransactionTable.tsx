import { Edit2, Receipt, Trash2 } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import type { Transaction } from '../types/finance';
import { formatDate, formatMoney } from '../utils/format';

interface TransactionTableProps {
  transactions: Transaction[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onAddFirst?: () => void;
  addFirstLabel?: string;
  onEdit?: (tx: Transaction) => void;
  onDelete?: (tx: Transaction) => void;
  showActions?: boolean;
}

export default function TransactionTable({
  transactions,
  loading = false,
  emptyTitle = 'No transactions recorded',
  emptyDescription = 'Start logging your income or expenses to see them organized here.',
  onAddFirst,
  addFirstLabel = 'Add Entry',
  onEdit,
  onDelete,
  showActions = true,
}: TransactionTableProps) {
  const { settings } = useExpense();

  if (loading) {
    return (
      <div className="divide-y divide-[#E5E7EB] dark:divide-[#263247]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-5 py-3.5 flex items-center justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="h-4 w-48 rounded bg-[#E5E7EB] dark:bg-[#263247] animate-pulse" />
              <div className="h-3 w-32 rounded bg-[#E5E7EB]/60 dark:bg-[#263247]/60 animate-pulse" />
            </div>
            <div className="h-4 w-24 rounded bg-[#E5E7EB] dark:bg-[#263247] animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="py-12 px-6 text-center">
        <div className="mx-auto w-11 h-11 rounded-xl bg-[#F7F9FC] dark:bg-[#0B1120] border border-[#E5E7EB] dark:border-[#263247] flex items-center justify-center text-[#6B7280] dark:text-[#9CA3AF]">
          <Receipt className="w-5 h-5" />
        </div>
        <h3 className="mt-3 text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
          {emptyTitle}
        </h3>
        <p className="mt-1 text-xs text-[#6B7280] dark:text-[#9CA3AF] max-w-sm mx-auto">
          {emptyDescription}
        </p>
        {onAddFirst && (
          <button
            type="button"
            onClick={onAddFirst}
            className="mt-4 px-4 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-medium transition-colors"
          >
            {addFirstLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC]/60 dark:bg-[#0B1120]/40 text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF]">
            <th className="py-3 px-4 whitespace-nowrap">Date</th>
            <th className="py-3 px-4 whitespace-nowrap">Category & Description</th>
            <th className="py-3 px-4 whitespace-nowrap hidden sm:table-cell">Source / Method</th>
            <th className="py-3 px-4 whitespace-nowrap text-right">Amount</th>
            {showActions && <th className="py-3 px-4 whitespace-nowrap text-right">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E7EB]/70 dark:divide-[#263247]/80 text-sm">
          {transactions.map((tx) => {
            const isIncome = tx.type === 'income';
            return (
              <tr
                key={tx.id}
                className="hover:bg-[#F7F9FC] dark:hover:bg-[#1E293B]/40 transition-colors"
              >
                <td className="py-3 px-4 whitespace-nowrap text-xs font-mono-num text-[#6B7280] dark:text-[#9CA3AF]">
                  {formatDate(tx.date, settings.date_format)}
                </td>
                <td className="py-3 px-4 min-w-[200px]">
                  <div className="font-medium text-[#111827] dark:text-[#F9FAFB] truncate max-w-xs">
                    {tx.description || tx.category_name}
                  </div>
                  <div className="text-xs text-[#6B7280] dark:text-[#9CA3AF] flex items-center gap-1.5 mt-0.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: tx.category_color || '#4F46E5' }}
                      aria-hidden="true"
                    />
                    <span>{tx.category_name}</span>
                    <span aria-hidden="true">·</span>
                    <span>{isIncome ? 'Income' : 'Expense'}</span>
                  </div>
                </td>
                <td className="py-3 px-4 whitespace-nowrap text-xs text-[#6B7280] dark:text-[#9CA3AF] hidden sm:table-cell">
                  {tx.source_or_method || '-'}
                </td>
                <td
                  className={`py-3 px-4 whitespace-nowrap text-right font-mono-num font-semibold ${
                    isIncome
                      ? 'text-[#16A34A] dark:text-emerald-400'
                      : 'text-[#EF4444] dark:text-red-400'
                  }`}
                >
                  {isIncome ? '+' : '-'}
                  {formatMoney(tx.amount, settings.currency_symbol, settings.currency)}
                </td>
                {showActions && (
                  <td className="py-3 px-4 whitespace-nowrap text-right">
                    <div className="inline-flex items-center gap-1">
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(tx)}
                          className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#4F46E5] hover:bg-indigo-50 dark:text-[#9CA3AF] dark:hover:text-[#818CF8] dark:hover:bg-indigo-500/15 transition-colors"
                          aria-label={`Edit ${tx.description || tx.category_name}`}
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(tx)}
                          className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#EF4444] hover:bg-red-50 dark:text-[#9CA3AF] dark:hover:text-red-400 dark:hover:bg-red-950/50 transition-colors"
                          aria-label={`Delete ${tx.description || tx.category_name}`}
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
