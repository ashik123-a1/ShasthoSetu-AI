import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Home, LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { useAuth } from "../../lib/authContext";
import { useI18n } from "../../lib/i18n";
import { FOUR_ROLE_NAV_CONFIG } from "../../lib/roleNavigation";
import { LanguageSwitch, ThemeSwitch } from "../ui";
import { NotificationsPopover } from "./NotificationsPopover";
import { PageBackdropLayer } from "./PageBackdropLayer";

export function PortalLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const { locale, t } = useI18n();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!user) return null;
  const navItems = FOUR_ROLE_NAV_CONFIG[user.primary_role] || [];
  const backdropMap: Record<string, string> = {
    PATIENT: "/images/backgrounds/bg-services-lab.jpg",
    DOCTOR: "/images/backgrounds/bg-doctors-consult.jpg",
    ADMIN: "/images/backgrounds/bg-ai-research.jpg",
    SUPPORT: "/images/backgrounds/bg-bangla-voice.jpg",
  };
  const backdropSrc = backdropMap[user.primary_role] || "/images/backgrounds/bg-services-lab.jpg";

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="relative min-h-screen bg-[var(--color-canvas)] text-[var(--color-text)] flex flex-col overflow-x-clip">
      <PageBackdropLayer imageSrc={backdropSrc} mode="adaptive" />
      {/* Authenticated Top Header */}
      <header
        data-testid="portal-header"
        className="sticky top-0 z-30 h-16 px-4 sm:px-6 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={t("controls.openMenu")}
            data-testid="portal-mobile-menu-btn"
            className="lg:hidden min-h-11 min-w-11 rounded-xl border border-[var(--color-border)] flex items-center justify-center cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/" className="flex items-center gap-2 shrink-0 min-h-11">
            <img src="/shasthosetu-logo.png" alt="ShasthoSetu AI" className="w-9 h-9 rounded-full object-cover" />
            <span className="font-bold text-base hidden sm:inline">ShasthoSetu AI</span>
          </Link>

          <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] inline-flex items-center gap-1 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" /> {user.primary_role}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden md:inline text-xs font-medium text-[var(--color-text-muted)] max-w-44 truncate">
            {user.full_name}
          </span>
          <Link
            to="/"
            aria-label={t("portal.goHome")}
            className="min-h-11 px-3 rounded-full border border-[var(--color-border)] bg-[var(--color-canvas)] hover:bg-[var(--color-surface-alt)] text-xs font-medium inline-flex items-center gap-1.5"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">{t("portal.goHome")}</span>
          </Link>
          <NotificationsPopover />
          <div className="hidden sm:flex items-center gap-2">
            <LanguageSwitch />
            <ThemeSwitch />
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            data-testid="portal-logout-btn"
            className="min-h-11 px-3.5 rounded-full bg-rose-500/12 hover:bg-rose-500/20 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">{t("portal.logout")}</span>
          </button>
        </div>
      </header>

      <div className="relative z-10 flex-1 flex min-w-0">
        {/* Desktop Role Sidebar */}
        <aside
          data-testid="portal-sidebar"
          className="hidden lg:flex w-64 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] p-3 gap-1"
        >
          <div className="px-3 py-2 mb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            {locale === "bn" ? `${user.primary_role} পোর্টাল` : `${user.primary_role} PORTAL`}
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.previewPath}
                data-testid={`portal-nav-${item.id}`}
                className={({ isActive }) =>
                  `min-h-11 px-3 rounded-xl flex items-center gap-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)] font-semibold shadow-sm"
                      : "text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]"
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{t(item.labelKey)}</span>
              </NavLink>
            );
          })}
        </aside>

        {/* Mobile Drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex bg-black/50 backdrop-blur-sm">
            <div className="w-72 max-w-[85vw] bg-[var(--color-surface)] h-full p-4 flex flex-col gap-2 overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
                <span className="font-bold text-sm">{user.full_name}</span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label={t("controls.closeMenu")}
                  className="min-h-11 min-w-11 rounded-xl flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.id}
                    to={item.previewPath}
                    onClick={() => setDrawerOpen(false)}
                    className={({ isActive }) =>
                      `min-h-11 px-3 rounded-xl flex items-center gap-2.5 text-sm font-medium ${
                        isActive
                          ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)] font-semibold"
                          : "text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]"
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{t(item.labelKey)}</span>
                  </NavLink>
                );
              })}
              <div className="pt-3 mt-auto border-t border-[var(--color-border)] flex items-center gap-2">
                <LanguageSwitch />
                <ThemeSwitch />
              </div>
            </div>
            <div className="flex-1" onClick={() => setDrawerOpen(false)} />
          </div>
        )}

        {/* Main Workspace */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          <div className="border-b border-[var(--color-border)] pb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)]" data-testid="portal-page-title">
              {title}
            </h1>
            {subtitle && <p className="text-sm text-[var(--color-text-muted)] mt-1">{subtitle}</p>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
