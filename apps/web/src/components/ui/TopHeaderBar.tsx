import { BellRing, Menu, Pause, Play } from "lucide-react";
import { LanguageSwitch } from "./LanguageSwitch";
import { ThemeSwitch } from "./ThemeSwitch";
import { SlidePillTabs, type PillTabItem } from "./SlidePillTabs";
import { useI18n } from "../../lib/i18n";
import { usePreferences } from "../../lib/preferences";

export interface TopHeaderBarProps {
  onOpenMobileMenu: () => void;
  navTabs: PillTabItem[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onTriggerSampleToast: () => void;
}

export function TopHeaderBar({
  onOpenMobileMenu,
  navTabs,
  activeTabId,
  onSelectTab,
  onTriggerSampleToast,
}: TopHeaderBarProps) {
  const { t } = useI18n();
  const { motionPaused, toggleMotionPaused } = usePreferences();

  return (
    <header
      className="ss-glass-bar sticky top-0 z-40 border-b px-3 py-2.5 sm:px-6"
      style={{ borderColor: "var(--color-border)" }}
    >
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
        {/* Left: Hamburger + ShasthoSetu Identity */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            data-testid="mobile-menu-trigger"
            onClick={onOpenMobileMenu}
            aria-label={t("controls.openMenu")}
            className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-xl border lg:hidden"
            style={{
              borderColor: "var(--color-border)",
              backgroundColor: "var(--color-surface)",
              color: "var(--color-text)",
            }}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-2.5">
            <img
              src="/shasthosetu-logo.png"
              alt={t("app.brand")}
              data-testid="brand-header-logo"
              className="h-11 w-11 shrink-0 rounded-full border object-cover"
              style={{
                borderColor: "var(--color-border-strong)",
                boxShadow: "var(--shadow-pill)",
              }}
            />
            <div>
              <p className="text-sm font-bold leading-tight text-[var(--color-text)] sm:text-base">
                {t("app.brand")}
              </p>
              <p className="hidden text-[11px] font-medium text-[var(--color-text-muted)] sm:block">
                {t("app.brandSub")}
              </p>
            </div>
          </div>
        </div>

        {/* Center: AgriSense-Inspired Elastic Pill Tabs */}
        <div className="order-3 w-full overflow-x-auto pb-1 lg:order-2 lg:w-auto lg:pb-0">
          <SlidePillTabs
            items={navTabs}
            activeId={activeTabId}
            onChange={onSelectTab}
            ariaLabel={t("app.navAria")}
            layoutGroupId="header-showcase-tabs"
          />
        </div>

        {/* Right: Language, Theme, Pause Motion (WCAG 2.2.2), Toast Test */}
        <div className="order-2 flex items-center gap-1.5 sm:gap-2 lg:order-3">
          <LanguageSwitch />
          <ThemeSwitch />
          <button
            type="button"
            data-testid="pause-motion-toggle"
            onClick={toggleMotionPaused}
            aria-pressed={motionPaused}
            aria-label={t("controls.pauseMotionAria")}
            title={motionPaused ? t("controls.pauseMotionOn") : t("controls.pauseMotionOff")}
            className="hidden min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-semibold sm:inline-flex"
            style={{
              borderColor: "var(--color-border)",
              backgroundColor: motionPaused ? "var(--color-warning-soft)" : "var(--color-surface)",
              color: motionPaused ? "var(--color-warning)" : "var(--color-text)",
            }}
          >
            {motionPaused ? (
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Pause className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span className="hidden xl:inline">
              {motionPaused ? t("controls.pauseMotionOn") : t("controls.pauseMotionOff")}
            </span>
          </button>

          <button
            type="button"
            data-testid="trigger-toast-btn"
            onClick={onTriggerSampleToast}
            aria-label={t("controls.triggerToast")}
            title={t("controls.triggerToast")}
            className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border px-3 text-xs font-semibold hover:bg-[var(--color-surface-alt)]"
            style={{
              borderColor: "var(--color-border)",
              backgroundColor: "var(--color-surface)",
              color: "var(--color-primary)",
            }}
          >
            <BellRing className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
