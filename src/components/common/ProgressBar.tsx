interface ProgressBarProps {
  value: number;
  tone?: 'indigo' | 'green' | 'amber' | 'red';
  size?: 'sm' | 'md';
  className?: string;
}

const TONE_FILL: Record<NonNullable<ProgressBarProps['tone']>, string> = {
  indigo: 'bg-[#4F46E5] dark:bg-[#818CF8]',
  green: 'bg-[#16A34A] dark:bg-emerald-500',
  amber: 'bg-[#F59E0B] dark:bg-amber-400',
  red: 'bg-[#EF4444] dark:bg-red-500',
};

export function ProgressBar({
  value,
  tone = 'indigo',
  size = 'md',
  className = '',
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const heightClass = size === 'sm' ? 'h-1.5' : 'h-2.5';

  return (
    <div
      className={`w-full rounded-full bg-[#E5E7EB]/80 dark:bg-[#263247] overflow-hidden ${heightClass} ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-all duration-300 ${TONE_FILL[tone]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
