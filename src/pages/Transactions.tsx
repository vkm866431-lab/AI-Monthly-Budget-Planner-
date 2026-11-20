import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowUpDown, Download, Plus, RotateCcw, Search } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import { Pagination } from '../components/common';
import TransactionForm from '../components/TransactionForm';
import TransactionTable from '../components/TransactionTable';
import { useExpense } from '../context/ExpenseContext';
import { api } from '../services/api';
import type { Transaction } from '../types/finance';
import { formatMoney, getRecentMonthOptions } from '../utils/format';

function escapeCsvCell(value: unknown): string {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default function Transactions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const { categories, settings, refreshTick, triggerRefresh, notify } = useExpense();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({ total_income: 0, total_expense: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [search, setSearch] = useState(initialSearch);
  const [typeFilter, setTypeFilter] = useState<'' | 'income' | 'expense'>('');
  const [categoryId, setCategoryId] = useState<number>(0);
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  const monthOptions = getRecentMonthOptions(12);

  useEffect(() => {
    const paramQuery = searchParams.get('search') || '';
    setSearch(paramQuery);
    setPage(1);
  }, [searchParams]);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.transactions.list({
        type: typeFilter || undefined,
        category_id: categoryId || undefined,
        month: monthFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        search: search.trim() || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        limit: 12,
      });
      setTransactions(res.transactions);
      setTotalRecords(res.pagination.total);
      setTotalPages(res.pagination.total_pages);
      setSummary(res.summary);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to load transaction history.');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, categoryId, monthFilter, startDate, endDate, search, sortBy, sortOrder, page, notify]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions, refreshTick]);

  function resetFilters() {
    setSearch('');
    setTypeFilter('');
    setCategoryId(0);
    setMonthFilter('');
    setStartDate('');
    setEndDate('');
    setSortBy('date');
    setSortOrder('desc');
    setPage(1);
    if (searchParams.has('search')) {
      setSearchParams({});
    }
  }

  async function handleExportCsv() {
    setExporting(true);
    try {
      const res = await api.transactions.list({
        type: typeFilter || undefined,
        category_id: categoryId || undefined,
        month: monthFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        search: search.trim() || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page: 1,
        limit: 500,
      });

      const headers = ['Date', 'Type', 'Category', 'Description', 'Source / Method', `Amount (${settings.currency})`];
      const rows = res.transactions.map((tx) =>
        [
          escapeCsvCell(tx.date),
          escapeCsvCell(tx.type),
          escapeCsvCell(tx.category_name),
          escapeCsvCell(tx.description),
          escapeCsvCell(tx.source_or_method),
          escapeCsvCell(tx.amount.toFixed(2)),
        ].join(',')
      );

      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${monthFilter || 'filtered'}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notify('success', `Exported ${res.transactions.length} transactions to CSV.`);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to export CSV.');
    } finally {
      setExporting(false);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-[#111827] dark:text-[#F9FAFB]">
            Transaction History
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
            Search, filter, sort, export, and audit every recorded income and expense entry.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          <button
            type="button"
            disabled={exporting}
            onClick={() => void handleExportCsv()}
            className="h-10 px-3.5 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] hover:bg-[#F7F9FC] dark:hover:bg-[#1E293B] text-[#111827] dark:text-[#F9FAFB] text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
          >
            <Download className="w-4 h-4 text-[#16A34A]" />
            <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingTx(null);
              setFormOpen(true);
            }}
            className="h-10 px-4 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] p-4 space-y-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#6B7280] dark:text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search description, source, category..."
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC] dark:bg-[#0B1120] text-sm text-[#111827] dark:text-[#F9FAFB]"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as '' | 'income' | 'expense');
              setCategoryId(0);
              setPage(1);
            }}
            aria-label="Filter by type"
            className="h-10 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC] dark:bg-[#0B1120] px-3 text-sm text-[#111827] dark:text-[#F9FAFB]"
          >
            <option value="">All Types</option>
            <option value="income">Income Only</option>
            <option value="expense">Expenses Only</option>
          </select>

          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(Number(e.target.value));
              setPage(1);
            }}
            aria-label="Filter by category"
            className="h-10 rounded-xl border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC] dark:bg-[#0B1120] px-3 text-sm text-[#111827] dark:text-[#F9FAFB]"
          >
            <option value={0}>All Categories</option>
            {categories
              .filter((c) => !typeFilter || c.type === typeFilter)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
          </select>

          <select
            value={monthFilter}
            onChange={(e) => {
              setMonthFilter(e.target.value);
              setPage(1);
            }}
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

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E5E7EB]/70 dark:border-[#263247]">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              <span>From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="h-8 rounded-lg border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC] dark:bg-[#0B1120] px-2 text-xs text-[#111827] dark:text-[#F9FAFB]"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              <span>To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="h-8 rounded-lg border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC] dark:bg-[#0B1120] px-2 text-xs text-[#111827] dark:text-[#F9FAFB]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <select
                value={`${sortBy}:${sortOrder}`}
                onChange={(e) => {
                  const [sb, so] = e.target.value.split(':') as ['date' | 'amount', 'asc' | 'desc'];
                  setSortBy(sb);
                  setSortOrder(so);
                  setPage(1);
                }}
                aria-label="Sort transactions"
                className="h-8 rounded-lg border border-[#E5E7EB] dark:border-[#263247] bg-[#F7F9FC] dark:bg-[#0B1120] px-2 text-xs text-[#111827] dark:text-[#F9FAFB]"
              >
                <option value="date:desc">Newest First</option>
                <option value="date:asc">Oldest First</option>
                <option value="amount:desc">Highest Amount</option>
                <option value="amount:asc">Lowest Amount</option>
              </select>
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="h-8 px-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#263247] text-xs text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F7F9FC] dark:hover:bg-[#1E293B] inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filtered Summary Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
        <span>
          Showing <strong className="text-[#111827] dark:text-[#F9FAFB] font-mono-num">{totalRecords}</strong>{' '}
          matching records
        </span>
        <div className="flex items-center gap-4 font-mono-num">
          <span>
            Income:{' '}
            <strong className="text-[#16A34A] dark:text-emerald-400">
              {formatMoney(summary.total_income, sym, cur)}
            </strong>
          </span>
          <span>
            Expenses:{' '}
            <strong className="text-[#EF4444] dark:text-red-400">
              {formatMoney(summary.total_expense, sym, cur)}
            </strong>
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <TransactionTable
          transactions={transactions}
          loading={loading}
          emptyTitle="No matching transactions"
          emptyDescription="Adjust your search filters or record a new transaction."
          addFirstLabel="Add Transaction"
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

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <TransactionForm
        open={formOpen}
        editingTransaction={editingTx}
        onClose={() => {
          setFormOpen(false);
          setEditingTx(null);
        }}
        onSaved={() => void loadTransactions()}
      />

      <ConfirmDialog
        open={Boolean(deletingTx)}
        title="Delete transaction?"
        description={`Remove "${deletingTx?.description || deletingTx?.category_name}" permanently?`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeletingTx(null)}
      />
    </div>
  );
}
