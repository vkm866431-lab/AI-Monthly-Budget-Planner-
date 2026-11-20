import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { api } from '../services/api';
import type { Transaction, TransactionType } from '../types/finance';
import { getTodayIso } from '../utils/format';

interface TransactionFormProps {
  open: boolean;
  initialType?: TransactionType;
  lockType?: boolean;
  editingTransaction?: Transaction | null;
  onClose: () => void;
  onSaved: () => void;
}

const PAYMENT_METHODS = ['UPI', 'Debit Card', 'Credit Card', 'Net Banking', 'Cash'];

export default function TransactionForm({
  open,
  initialType = 'expense',
  lockType = false,
  editingTransaction = null,
  onClose,
  onSaved,
}: TransactionFormProps) {
  const { categories, settings, notify, triggerRefresh } = useExpense();

  const [type, setType] = useState<TransactionType>(initialType);
  const [categoryId, setCategoryId] = useState<number>(0);
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayIso());
  const [sourceOrMethod, setSourceOrMethod] = useState<string>('UPI');
  const [description, setDescription] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type]
  );

  useEffect(() => {
    if (!open) return;
    setError('');
    if (editingTransaction) {
      setType(editingTransaction.type);
      setCategoryId(editingTransaction.category_id);
      setAmount(String(editingTransaction.amount));
      setDate(editingTransaction.date);
      setSourceOrMethod(editingTransaction.source_or_method || (editingTransaction.type === 'expense' ? 'UPI' : ''));
      setDescription(editingTransaction.description || '');
    } else {
      setType(initialType);
      const firstCat = categories.find((c) => c.type === initialType);
      setCategoryId(firstCat ? firstCat.id : 0);
      setAmount('');
      setDate(getTodayIso());
      setSourceOrMethod(initialType === 'expense' ? 'UPI' : '');
      setDescription('');
    }
  }, [open, editingTransaction, initialType, categories]);

  useEffect(() => {
    if (!open || editingTransaction) return;
    const valid = filteredCategories.some((c) => c.id === categoryId);
    if (!valid && filteredCategories.length > 0) {
      setCategoryId(filteredCategories[0].id);
    }
    if (type === 'expense' && !PAYMENT_METHODS.includes(sourceOrMethod)) {
      setSourceOrMethod('UPI');
    } else if (type === 'income' && PAYMENT_METHODS.includes(sourceOrMethod)) {
      setSourceOrMethod('');
    }
  }, [type, filteredCategories, categoryId, open, editingTransaction, sourceOrMethod]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than zero.');
      return;
    }
    if (!categoryId) {
      setError('Please select a category.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Please select a valid date.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        type,
        category_id: categoryId,
        amount: parsedAmount,
        date,
        source_or_method: sourceOrMethod.trim(),
        description: description.trim(),
      };

      if (editingTransaction) {
        await api.transactions.update(editingTransaction.id, payload);
        notify('success', `${type === 'income' ? 'Income' : 'Expense'} updated.`);
      } else {
        await api.transactions.create(payload);
        notify('success', `${type === 'income' ? 'Income' : 'Expense'} recorded.`);
      }

      triggerRefresh();
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save transaction.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1120]/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] dark:border-[#263247]">
          <h2 id="tx-modal-title" className="text-base font-semibold text-[#111827] dark:text-[#F9FAFB]">
            {editingTransaction
              ? `Edit ${type === 'income' ? 'Income' : 'Expense'}`
              : lockType
              ? `Add ${type === 'income' ? 'Income' : 'Expense'}`
              : 'Record Transaction'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F9FAFB] hover:bg-[#F7F9FC] dark:hover:bg-[#1E293B]"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!lockType && !editingTransaction && (
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#F7F9FC] dark:bg-[#0B1120] border border-[#E5E7EB] dark:border-[#263247]">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`py-2 text-xs font-medium rounded-lg transition-colors ${
                  type === 'expense'
                    ? 'bg-white dark:bg-[#172033] text-[#111827] dark:text-[#F9FAFB] shadow-xs'
                    : 'text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F9FAFB]'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`py-2 text-xs font-medium rounded-lg transition-colors ${
                  type === 'income'
                    ? 'bg-white dark:bg-[#172033] text-[#111827] dark:text-[#F9FAFB] shadow-xs'
                    : 'text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F9FAFB]'
                }`}
              >
                Income
              </button>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-[#EF4444]/30 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-3.5 py-2.5 text-xs text-[#EF4444] dark:text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="tx-amount"
                className="block text-xs font-medium text-[#111827] dark:text-[#F9FAFB] mb-1.5"
              >
                Amount ({settings.currency_symbol})
              </label>
              <input
                id="tx-amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full h-10 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC] dark:bg-[#0B1120] px-3 text-sm font-mono-num text-[#111827] dark:text-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] dark:focus-visible:ring-[#818CF8]"
              />
            </div>

            <div>
              <label
                htmlFor="tx-date"
                className="block text-xs font-medium text-[#111827] dark:text-[#F9FAFB] mb-1.5"
              >
                Date
              </label>
              <input
                id="tx-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-10 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC] dark:bg-[#0B1120] px-3 text-sm text-[#111827] dark:text-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] dark:focus-visible:ring-[#818CF8]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="tx-category"
                className="block text-xs font-medium text-[#111827] dark:text-[#F9FAFB] mb-1.5"
              >
                Category
              </label>
              <select
                id="tx-category"
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                className="w-full h-10 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC] dark:bg-[#0B1120] px-3 text-sm text-[#111827] dark:text-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] dark:focus-visible:ring-[#818CF8]"
              >
                {filteredCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="tx-source-method"
                className="block text-xs font-medium text-[#111827] dark:text-[#F9FAFB] mb-1.5"
              >
                {type === 'income' ? 'Income Source' : 'Payment Method'}
              </label>
              {type === 'expense' ? (
                <select
                  id="tx-source-method"
                  value={sourceOrMethod}
                  onChange={(e) => setSourceOrMethod(e.target.value)}
                  className="w-full h-10 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC] dark:bg-[#0B1120] px-3 text-sm text-[#111827] dark:text-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] dark:focus-visible:ring-[#818CF8]"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="tx-source-method"
                  type="text"
                  required
                  value={sourceOrMethod}
                  onChange={(e) => setSourceOrMethod(e.target.value)}
                  placeholder="e.g., Merit Scholarship, Part-time"
                  className="w-full h-10 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC] dark:bg-[#0B1120] px-3 text-sm text-[#111827] dark:text-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] dark:focus-visible:ring-[#818CF8]"
                />
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="tx-description"
              className="block text-xs font-medium text-[#111827] dark:text-[#F9FAFB] mb-1.5"
            >
              Description / Notes
            </label>
            <input
              id="tx-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                type === 'income'
                  ? 'Optional details about this income'
                  : 'e.g., Campus mess, books, metro fare'
              }
              className="w-full h-10 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC] dark:bg-[#0B1120] px-3 text-sm text-[#111827] dark:text-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] dark:focus-visible:ring-[#818CF8]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-[#E5E7EB] dark:border-[#263247] text-[#111827] dark:text-[#F9FAFB] hover:bg-[#F7F9FC] dark:hover:bg-[#1E293B] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm font-medium rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white transition-colors disabled:opacity-60"
            >
              {submitting
                ? 'Saving...'
                : editingTransaction
                ? 'Save Changes'
                : type === 'income'
                ? 'Save Income'
                : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
