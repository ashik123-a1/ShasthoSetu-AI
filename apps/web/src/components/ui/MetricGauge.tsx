export interface MetricGaugeProps {
  label: string;
  detail: string;
  value: number;
  max?: number;
  tone?: "primary" | "secondary" | "warning";
}

export function MetricGauge({
  label,
  detail,
  value,
  max = 100,
  tone = "primary",
}: MetricGaugeProps) {
  const clamped = Math.max(0, Math.min(max, value));
  const pct = Math.round((clamped / max) * 100);
  const strokeColor =
    tone === "warning"
      ? "var(--color-warning)"
      : tone === "secondary"
        ? "var(--color-secondary)"
        : "var(--color-primary)";

  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <div
      data-testid="ui-metric-gauge"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={clamped}
      className="ss-card flex items-center gap-4 p-4"
    >
      <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
        <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="6"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <span className="absolute font-mono text-xs font-bold text-[var(--color-text)]">{pct}%</span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--color-text)]">{label}</p>
        <p className="text-xs text-[var(--color-text-muted)]">{detail}</p>
      </div>
    </div>
  );
}
