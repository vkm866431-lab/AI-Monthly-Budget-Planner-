import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="px-4 py-3 border-t border-[#E5E7EB] dark:border-[#263247] flex items-center justify-between text-xs text-[#6B7280] dark:text-[#9CA3AF]">
      <span className="font-mono-num">
        Page {page} of {totalPages}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="h-8 px-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] text-[#111827] dark:text-[#F9FAFB] disabled:opacity-40 inline-flex items-center gap-1 hover:bg-[#F7F9FC] dark:hover:bg-[#1E293B] transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Prev</span>
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          className="h-8 px-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] text-[#111827] dark:text-[#F9FAFB] disabled:opacity-40 inline-flex items-center gap-1 hover:bg-[#F7F9FC] dark:hover:bg-[#1E293B] transition-colors"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
