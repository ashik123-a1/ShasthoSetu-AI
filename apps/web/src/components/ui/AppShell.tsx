import React, { useState } from "react";
import { FlaskConical } from "lucide-react";
import { OfflineBanner } from "./OfflineBanner";
import { TopHeaderBar } from "./TopHeaderBar";
import { RoleSidebar } from "./RoleSidebar";
import { MobileNavDrawer } from "./MobileNavDrawer";
import type { PillTabItem } from "./SlidePillTabs";
import { FOUR_ROLE_NAV_CONFIG, type AppRole } from "../../lib/roleNavigation";
import { useI18n } from "../../lib/i18n";

export interface AppShellProps {
  activeRole: AppRole;
  onChangeRole: (role: AppRole) => void;
  navTabs: PillTabItem[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  offlineSimulated: boolean;
  onTriggerSampleToast: () => void;
  children: React.ReactNode;
}

export function AppShell({
  activeRole,
  onChangeRole,
  navTabs,
  activeTabId,
  onSelectTab,
  offlineSimulated,
  onTriggerSampleToast,
  children,
}: AppShellProps) {
  const { t } = useI18n();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeNavItemId, setActiveNavItemId] = useState("pt-dash");

  const validActiveItemId = FOUR_ROLE_NAV_CONFIG[activeRole].some((i) => i.id === activeNavItemId)
    ? activeNavItemId
    : FOUR_ROLE_NAV_CONFIG[activeRole][0].id;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-canvas)] text-[var(--color-text)]">
      {/* WCAG 2.4.1 Skip Navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-[var(--color-primary)] focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-[var(--color-primary-contrast)]"
      >
        {t("app.skipToMain")}
      </a>

      {/* Explicit Unauthenticated Development Preview Notice */}
      <div
        data-testid="unauthenticated-dev-banner"
        className="flex items-center justify-center gap-2 border-b px-4 py-1.5 text-center text-xs font-semibold"
        style={{
          backgroundColor: "var(--color-warning-soft)",
          color: "var(--color-warning)",
          borderColor: "color-mix(in srgb, var(--color-warning) 30%, transparent)",
        }}
      >
        <FlaskConical className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{t("app.devPreviewBanner")}</span>
      </div>

      <OfflineBanner visible={offlineSimulated} />

      <TopHeaderBar
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
        navTabs={navTabs}
        activeTabId={activeTabId}
        onSelectTab={onSelectTab}
        onTriggerSampleToast={onTriggerSampleToast}
      />

      <div className="mx-auto flex w-full max-w-[1440px] flex-1">
        <RoleSidebar
          activeRole={activeRole}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
          activeItemId={validActiveItemId}
          onSelectItem={setActiveNavItemId}
        />

        <MobileNavDrawer
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          activeRole={activeRole}
          onChangeRole={onChangeRole}
          activeItemId={validActiveItemId}
          onSelectItem={setActiveNavItemId}
        />

        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>

      <footer
        className="border-t px-4 py-4 text-center text-xs text-[var(--color-text-muted)]"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
      >
        {t("app.footerNotice")}
      </footer>
    </div>
  );
}
