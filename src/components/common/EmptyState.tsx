import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="py-12 px-6 text-center">
      <div className="mx-auto w-11 h-11 rounded-xl bg-[#F7F9FC] dark:bg-[#0B1120] border border-[#E5E7EB] dark:border-[#263247] flex items-center justify-center text-[#6B7280] dark:text-[#9CA3AF]">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">{title}</h3>
      <p className="mt-1 text-xs text-[#6B7280] dark:text-[#9CA3AF] max-w-sm mx-auto leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
