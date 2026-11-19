import { WifiOff } from "lucide-react";
import { useI18n } from "../../lib/i18n";

export interface OfflineBannerProps {
  visible: boolean;
}

export function OfflineBanner({ visible }: OfflineBannerProps) {
  const { t } = useI18n();
  if (!visible) return null;

  return (
    <div
      data-testid="ui-offline-banner"
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-xs font-medium"
      style={{
        backgroundColor: "var(--color-warning-soft)",
        color: "var(--color-warning)",
        borderColor: "color-mix(in srgb, var(--color-warning) 35%, transparent)",
      }}
    >
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{t("states.offlineMsg")}</span>
      </div>
      <span
        className="rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-bold"
        style={{ borderColor: "currentColor" }}
      >
        {t("states.offlineBadge")}
      </span>
    </div>
  );
}
