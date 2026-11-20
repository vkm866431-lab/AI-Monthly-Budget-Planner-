import { TrendingDown, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ProgressBar } from './common';

interface DashboardCardProps {
  title: string;
  value: string;
  subtitle?: string;
  tone?: 'indigo' | 'blue' | 'green' | 'orange' | 'red' | 'slate';
  icon?: LucideIcon;
  loading?: boolean;
  trendPercent?: number | null;
  trendPositiveIsGood?: boolean;
  progressPercent?: number;
}

export default function DashboardCard({
  title,
  value,
  subtitle,
  tone = 'slate',
  icon: Icon,
  loading = false,
  trendPercent,
  trendPositiveIsGood = true,
  progressPercent,
}: DashboardCardProps) {
  const iconBadge = {
    indigo: 'text-[#4F46E5] dark:text-[#818CF8] bg-indigo-50 dark:bg-indigo-500/15',
    blue: 'text-[#4F46E5] dark:text-[#818CF8] bg-indigo-50 dark:bg-indigo-500/15',
    green: 'text-[#16A34A] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15',
    orange: 'text-[#F59E0B] dark:text-amber-400 bg-amber-50 dark:bg-amber-500/15',
    red: 'text-[#EF4444] dark:text-red-400 bg-red-50 dark:bg-red-500/15',
    slate: 'text-[#6B7280] dark:text-[#9CA3AF] bg-[#F7F9FC] dark:bg-[#0B1120]',
  }[tone];

  const valueColor = {
    indigo: 'text-[#4F46E5] dark:text-[#818CF8]',
    blue: 'text-[#111827] dark:text-[#F9FAFB]',
    green: 'text-[#16A34A] dark:text-emerald-400',
    orange: 'text-[#F59E0B] dark:text-amber-400',
    red: 'text-[#EF4444] dark:text-red-400',
    slate: 'text-[#111827] dark:text-[#F9FAFB]',
  }[tone];

  const hasTrend = trendPercent !== undefined && trendPercent !== null && Number.isFinite(trendPercent);
  const isUp = (trendPercent ?? 0) >= 0;
  const isGood = trendPositiveIsGood ? isUp : !isUp;

  return (
    <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#263247] bg-white dark:bg-[#172033] p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all hover:border-[#D1D5DB] dark:hover:border-[#334155]">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF]">{title}</span>
        {Icon && (
          <span className={`p-2 rounded-xl shrink-0 ${iconBadge}`}>
            <Icon className="w-4 h-4" />
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-3 space-y-2.5">
          <div className="h-7 w-32 rounded-lg bg-[#E5E7EB]/80 dark:bg-[#263247] animate-pulse" />
          <div className="h-3.5 w-24 rounded bg-[#E5E7EB]/50 dark:bg-[#263247]/60 animate-pulse" />
        </div>
      ) : (
        <>
          <p className={`mt-2.5 text-2xl font-semibold tracking-tight font-mono-num ${valueColor}`}>
            {value}
          </p>

          {typeof progressPercent === 'number' && (
            <div className="mt-3">
              <ProgressBar value={progressPercent} tone="green" size="sm" />
            </div>
          )}

          <div className="mt-2 flex items-center justify-between gap-2 text-xs">
            {hasTrend ? (
              <span
                className={`inline-flex items-center gap-1 font-medium font-mono-num ${
                  isGood
                    ? 'text-[#16A34A] dark:text-emerald-400'
                    : 'text-[#EF4444] dark:text-red-400'
                }`}
              >
                {isUp ? (
                  <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>
                  {isUp ? '+' : ''}
                  {trendPercent!.toFixed(1)}% vs last month
                </span>
              </span>
            ) : (
              subtitle && (
                <span className="text-[#6B7280] dark:text-[#9CA3AF] truncate">{subtitle}</span>
              )
            )}
          </div>
          {hasTrend && subtitle && (
            <p className="mt-0.5 text-[11px] text-[#6B7280] dark:text-[#9CA3AF] truncate">
              {subtitle}
            </p>
          )}
        </>
      )}
    </div>
  );
}
