import { Inbox } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: LucideIcon;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon = Inbox,
}: EmptyStateProps) {
  return (
    <div
      data-testid="ui-empty-state"
      className="ss-card flex flex-col items-center justify-center gap-3 px-6 py-10 text-center"
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{ backgroundColor: "var(--color-primary-soft)", color: "var(--color-primary)" }}
      >
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-[var(--color-text)]">{title}</h3>
      <p className="max-w-md text-sm text-[var(--color-text-muted)]">{description}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-1 inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors"
          style={{
            backgroundColor: "var(--color-primary)",
            color: "var(--color-primary-contrast)",
          }}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
