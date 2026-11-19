import { AlertOctagon, RefreshCw } from "lucide-react";

export interface ErrorStateProps {
  title: string;
  description: string;
  errorCode?: string;
  retryLabel: string;
  onRetry: () => void;
}

export function ErrorState({
  title,
  description,
  errorCode = "ERR_SAMPLE_FETCH",
  retryLabel,
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      data-testid="ui-error-state"
      role="alert"
      className="ss-card flex flex-col items-center justify-center gap-3 px-6 py-10 text-center"
      style={{ borderColor: "color-mix(in srgb, var(--color-danger) 40%, transparent)" }}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{ backgroundColor: "var(--color-danger-soft)", color: "var(--color-danger)" }}
      >
        <AlertOctagon className="h-6 w-6" aria-hidden="true" />
      </div>
      <span
        className="rounded-md px-2.5 py-0.5 font-mono text-xs font-semibold"
        style={{ backgroundColor: "var(--color-danger-soft)", color: "var(--color-danger)" }}
      >
        {errorCode}
      </span>
      <h3 className="text-base font-semibold text-[var(--color-text)]">{title}</h3>
      <p className="max-w-md text-sm text-[var(--color-text-muted)]">{description}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-full border px-5 text-sm font-semibold transition-colors"
        style={{
          borderColor: "var(--color-danger)",
          color: "var(--color-danger)",
          backgroundColor: "transparent",
        }}
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        <span>{retryLabel}</span>
      </button>
    </div>
  );
}
