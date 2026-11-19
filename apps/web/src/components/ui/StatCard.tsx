import type { LucideIcon } from "lucide-react";
import { Skeleton } from "./Skeleton";

export interface StatCardProps {
  title?: string;
  label?: string;
  value: string;
  delta?: string;
  tag?: string;
  icon: LucideIcon;
  tone?: "primary" | "secondary" | "warning" | "research";
  loading?: boolean;
}

const TONE_MAP = {
  primary: { fg: "var(--color-primary)", bg: "var(--color-primary-soft)" },
  secondary: { fg: "var(--color-secondary)", bg: "var(--color-secondary-soft)" },
  warning: { fg: "var(--color-warning)", bg: "var(--color-warning-soft)" },
  research: { fg: "var(--color-research)", bg: "var(--color-research-soft)" },
};

export function StatCard({
  title,
  label,
  value,
  delta,
  tag,
  icon: Icon,
  tone = "primary",
  loading = false,
}: StatCardProps) {
  if (loading) {
    return <Skeleton lines={2} />;
  }

  const colors = TONE_MAP[tone];
  const headingText = title ?? label ?? "";

  return (
    <article
      data-testid="ui-stat-card"
      className="ss-card flex flex-col justify-between gap-3 p-5 transition-colors hover:border-[var(--color-border-strong)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: colors.bg, color: colors.fg }}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            {headingText}
          </h3>
        </div>
        {tag ? (
          <span
            className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
            style={{ backgroundColor: colors.bg, color: colors.fg }}
          >
            {tag}
          </span>
        ) : null}
      </div>

      <div>
        <p className="font-mono text-2xl font-bold tracking-tight text-[var(--color-text)]">{value}</p>
        {delta ? <p className="mt-1 text-xs text-[var(--color-text-muted)]">{delta}</p> : null}
      </div>
    </article>
  );
}
