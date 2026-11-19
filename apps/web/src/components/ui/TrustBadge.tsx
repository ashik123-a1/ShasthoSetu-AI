import { AlertTriangle, FlaskConical, Microscope, ShieldAlert, ShieldCheck } from "lucide-react";
import { useI18n } from "../../lib/i18n";

export type TrustVariant =
  | "DEMO_ONLY"
  | "NEEDS_VERIFICATION"
  | "HUMAN_VERIFIED"
  | "RESEARCH_PREVIEW"
  | "URGENT_REFERRAL";

const VARIANT_CONFIG: Record<
  TrustVariant,
  { icon: typeof FlaskConical; bgVar: string; textVar: string; borderVar: string }
> = {
  DEMO_ONLY: {
    icon: FlaskConical,
    bgVar: "var(--color-warning-soft)",
    textVar: "var(--color-warning)",
    borderVar: "var(--color-warning)",
  },
  NEEDS_VERIFICATION: {
    icon: AlertTriangle,
    bgVar: "var(--color-warning-soft)",
    textVar: "var(--color-warning)",
    borderVar: "var(--color-warning)",
  },
  HUMAN_VERIFIED: {
    icon: ShieldCheck,
    bgVar: "var(--color-success-soft)",
    textVar: "var(--color-success)",
    borderVar: "var(--color-success)",
  },
  RESEARCH_PREVIEW: {
    icon: Microscope,
    bgVar: "var(--color-research-soft)",
    textVar: "var(--color-research)",
    borderVar: "var(--color-research)",
  },
  URGENT_REFERRAL: {
    icon: ShieldAlert,
    bgVar: "var(--color-danger-soft)",
    textVar: "var(--color-danger)",
    borderVar: "var(--color-danger)",
  },
};

export interface TrustBadgeProps {
  variant?: TrustVariant;
  kind?: TrustVariant | "RESEARCH_ONLY";
  className?: string;
}

export function TrustBadge({ variant, kind, className = "" }: TrustBadgeProps) {
  const { t } = useI18n();
  const raw = variant ?? kind ?? "HUMAN_VERIFIED";
  const resolved: TrustVariant = raw === "RESEARCH_ONLY" ? "RESEARCH_PREVIEW" : raw;
  const cfg = VARIANT_CONFIG[resolved];
  const Icon = cfg.icon;

  return (
    <span
      data-testid={`trust-badge-${resolved}`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold tracking-tight ${className}`}
      style={{
        backgroundColor: cfg.bgVar,
        color: cfg.textVar,
        borderColor: `color-mix(in srgb, ${cfg.borderVar} 42%, transparent)`,
      }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{t(`trust.${resolved}`)}</span>
    </span>
  );
}
