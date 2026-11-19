export interface SkeletonProps {
  lines?: number;
  className?: string;
}

export function Skeleton({ lines = 3, className = "" }: SkeletonProps) {
  return (
    <div
      data-testid="ui-skeleton"
      aria-busy="true"
      aria-live="polite"
      className={`ss-card p-5 space-y-3 ${className}`}
    >
      <div className="ss-skeleton h-5 w-1/3 rounded-md" />
      {Array.from({ length: lines }).map((_, idx) => (
        <div
          key={idx}
          className="ss-skeleton h-4 rounded-md"
          style={{ width: idx === lines - 1 ? "68%" : "100%" }}
        />
      ))}
    </div>
  );
}
