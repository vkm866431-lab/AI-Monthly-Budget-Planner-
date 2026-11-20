interface LoadingSkeletonProps {
  rows?: number;
  className?: string;
}

export function LoadingSkeleton({ rows = 4, className = '' }: LoadingSkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded-lg bg-[#E5E7EB]/80 dark:bg-[#263247]/80 animate-pulse"
          style={{ width: `${Math.max(48, 100 - i * 11)}%` }}
        />
      ))}
    </div>
  );
}
