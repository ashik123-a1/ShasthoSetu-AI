import { CheckCircle2, Clock, PauseCircle, ShieldAlert, XCircle } from "lucide-react";
import { useI18n } from "../../lib/i18n";

export type SemanticTone = "success" | "warning" | "danger" | "info" | "neutral";

export type AppStatus =
  | "BOOKING_PENDING"
  | "AWAITING_DEMO_PAYMENT"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "IN_CONSULTATION"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW"
  | "DEMO_PENDING"
  | "DEMO_PAID"
  | "DEMO_FAILED"
  | "DEMO_REFUNDED"
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_USER"
  | "ESCALATED"
  | "RESOLVED"
  | "CLOSED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED";

const STATUS_TONE: Record<AppStatus, SemanticTone> = {
  CONFIRMED: "success",
  CHECKED_IN: "info",
  IN_CONSULTATION: "info",
  COMPLETED: "success",
  DEMO_PAID: "success",
  RESOLVED: "success",
  APPROVED: "success",
  BOOKING_PENDING: "warning",
  AWAITING_DEMO_PAYMENT: "warning",
  DEMO_PENDING: "warning",
  WAITING_FOR_USER: "warning",
  PENDING: "warning",
  OPEN: "info",
  IN_PROGRESS: "info",
  DEMO_REFUNDED: "neutral",
  CLOSED: "neutral",
  CANCELLED: "danger",
  NO_SHOW: "danger",
  DEMO_FAILED: "danger",
  ESCALATED: "danger",
  REJECTED: "danger",
  SUSPENDED: "danger",
};

const TONE_STYLE: Record<SemanticTone, { icon: typeof CheckCircle2; bg: string; fg: string }> = {
  success: { icon: CheckCircle2, bg: "var(--color-success-soft)", fg: "var(--color-success)" },
  warning: { icon: Clock, bg: "var(--color-warning-soft)", fg: "var(--color-warning)" },
  danger: { icon: XCircle, bg: "var(--color-danger-soft)", fg: "var(--color-danger)" },
  info: { icon: ShieldAlert, bg: "var(--color-secondary-soft)", fg: "var(--color-secondary)" },
  neutral: { icon: PauseCircle, bg: "var(--color-surface-alt)", fg: "var(--color-text-muted)" },
};

export interface StatusBadgeProps {
  status: AppStatus | (string & {});
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const { t } = useI18n();
  const tone = STATUS_TONE[status as AppStatus] ?? "neutral";
  const cfg = TONE_STYLE[tone];
  const Icon = cfg.icon;
  const translated = t(`status.${status}`);
  const displayLabel = translated === `status.${status}` ? status : translated;

  return (
    <span
      data-testid={`status-badge-${status}`}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${className}`}
      style={{
        backgroundColor: cfg.bg,
        color: cfg.fg,
        border: `1px solid color-mix(in srgb, ${cfg.fg} 30%, transparent)`,
      }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{displayLabel}</span>
    </span>
  );
}
