import React, { useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAuth } from "../../lib/authContext";
import { useI18n } from "../../lib/i18n";
import { FOUR_ROLE_NAV_CONFIG } from "../../lib/roleNavigation";
import { LanguageSwitch, ThemeSwitch } from "../ui";
import { NotificationsPopover } from "./NotificationsPopover";
import { KineticBrandLogo } from "../common/KineticBrandLogo";

const ROLE_AVATARS: Record<string, string> = {
  PATIENT: "/images/doctors/doc-f-02.jpg",
  DOCTOR: "/images/doctors/doc-f-01.jpg",
  SUPPORT: "/images/doctors/doc-m-03.jpg",
  ADMIN: "/images/doctors/doc-m-01.jpg",
};

const ROLE_ACTIVE_CLASS: Record<string, string> = {
  PATIENT: "lg-sidebar-item-active-patient",
  DOCTOR: "lg-sidebar-item-active-doctor",
  SUPPORT: "lg-sidebar-item-active-support",
  ADMIN: "lg-sidebar-item-active-admin",
};

const ROLE_BADGE_CLASS: Record<string, string> = {
  PATIENT: "bg-cyan-950/90 text-cyan-300 border-cyan-500/40",
  DOCTOR: "bg-indigo-950/90 text-indigo-300 border-indigo-500/40",
  SUPPORT: "bg-amber-950/90 text-amber-300 border-amber-500/40",
  ADMIN: "bg-emerald-950/90 text-emerald-300 border-emerald-500/40",
};

const PORTAL_CSS_VARS = {
  "--color-canvas": "#070b16",
  "--color-surface": "#0b1529",
  "--color-surface-alt": "#111f38",
  "--color-border": "rgba(56, 189, 248, 0.18)",
  "--color-text": "#f1f5f9",
  "--color-text-muted": "#94a3b8",
  "--color-primary": "#22d3ee",
  "--color-primary-contrast": "#020617",
  "--color-primary-soft": "rgba(34, 211, 238, 0.14)",
} as React.CSSProperties;

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
  const [collapsed, setCollapsed] = useState(false);
  const [navFilter, setNavFilter] = useState("");

  const role = user?.primary_role || "PATIENT";
  const rawNavItems = FOUR_ROLE_NAV_CONFIG[role] || [];
  const filteredNavItems = useMemo(() => {
    const q = navFilter.trim().toLowerCase();
    if (!q) return rawNavItems;
    return rawNavItems.filter(
      (item) => t(item.labelKey).toLowerCase().includes(q) || item.id.toLowerCase().includes(q)
    );
  }, [rawNavItems, navFilter, t]);

  if (!user) return null;

  const activeRoleClass = ROLE_ACTIVE_CLASS[role] || ROLE_ACTIVE_CLASS.PATIENT;
  const badgeClass = ROLE_BADGE_CLASS[role] || ROLE_BADGE_CLASS.PATIENT;
  const avatarSrc = ROLE_AVATARS[role] || ROLE_AVATARS.PATIENT;

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div
      style={PORTAL_CSS_VARS}
      className="lg-portal-ambient-bg relative min-h-screen bg-[#070b16] text-slate-100 flex flex-col lg:flex-row overflow-x-clip"
    >
      {/* Desktop Land-Guard Floating Frosted Glass Sidebar */}
      <aside
        data-testid="portal-sidebar"
        className={`lg-sidebar hidden lg:flex shrink-0 flex-col m-2.5 rounded-[28px] p-3.5 gap-2.5 relative z-20 self-start sticky top-2.5 max-h-[calc(100vh-20px)] ${
          collapsed ? "collapsed" : ""
        }`}
      >
        {/* Top Window Dots & Collapse Pill */}
        <div className="lg-sidebar-header-wrapper flex items-center justify-between gap-2 pb-1">
          <div className="lg-window-dots lg-sidebar-header-branding">
            <span className="lg-dot-red" />
            <span className="lg-dot-yellow" />
            <span className="lg-dot-green" />
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="lg-collapse-pill"
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            <span className="lg-sidebar-text">{collapsed ? "" : "Menu"}</span>
          </button>
        </div>

        {/* Top User Profile Card */}
        <div className="lg-sidebar-top-profile">
          <img
            src={avatarSrc}
            alt={user.full_name}
            className="w-10 h-10 rounded-xl object-cover border border-cyan-400/50 shrink-0"
          />
          <div className="lg-sidebar-user-details min-w-0 flex-1">
            <div className="text-xs font-bold text-white truncate">{user.full_name}</div>
            <div className="text-[10px] font-mono text-cyan-300 truncate">{role} PORTAL</div>
          </div>
        </div>

        {/* Sidebar Search Input */}
        <div className="lg-sidebar-search-box lg-sidebar-text">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={navFilter}
            onChange={(e) => setNavFilter(e.target.value)}
            placeholder={locale === "bn" ? "মেনু খুঁজুন..." : "Filter portal modules..."}
          />
        </div>

        {/* Section Title */}
        <div className="lg-nav-section-title lg-sidebar-section-header">
          {locale === "bn" ? `${role} মডিউল` : `${role} WORKSPACE`}
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto space-y-1 pr-0.5">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.previewPath}
                title={t(item.labelKey)}
                data-testid={`portal-nav-${item.id}`}
                className={({ isActive }) =>
                  `lg-sidebar-item lg-sidebar-link min-h-10 ${isActive ? activeRoleClass : ""}`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="lg-sidebar-text truncate flex-1">{t(item.labelKey)}</span>
                {item.sampleBadge && (
                  <span className="lg-sidebar-badge text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-950/60 border border-white/10">
                    {item.sampleBadge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Rose Sign Out Pill */}
        <div className="pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="w-full min-h-10 px-3 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="lg-sidebar-text">{t("portal.logout")}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex bg-black/70 backdrop-blur-sm">
          <div className="w-72 max-w-[85vw] bg-[#0b1328] border-r border-cyan-500/25 h-full p-4 flex flex-col gap-2 overflow-y-auto text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <img src={avatarSrc} alt={user.full_name} className="w-9 h-9 rounded-xl object-cover border border-cyan-400/50" />
                <div className="min-w-0">
                  <div className="font-bold text-xs text-white truncate">{user.full_name}</div>
                  <div className="font-mono text-[10px] text-cyan-300">{role}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label={t("controls.closeMenu")}
                className="min-h-10 min-w-10 rounded-xl flex items-center justify-center text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {rawNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.id}
                  to={item.previewPath}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) =>
                    `lg-sidebar-item min-h-10 ${isActive ? activeRoleClass : ""}`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t(item.labelKey)}</span>
                </NavLink>
              );
            })}
            <div className="pt-3 mt-auto border-t border-slate-800 flex items-center justify-between gap-2">
              <LanguageSwitch />
              <ThemeSwitch />
            </div>
          </div>
          <div className="flex-1" onClick={() => setDrawerOpen(false)} />
        </div>
      )}

      {/* Right Main Column */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        {/* Land-Guard Topbar */}
        <header
          data-testid="portal-header"
          className="sticky top-0 z-30 h-16 px-4 sm:px-6 border-b border-white/10 bg-[#080f22]/85 backdrop-blur-xl flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label={t("controls.openMenu")}
              data-testid="portal-mobile-menu-btn"
              className="lg:hidden min-h-10 min-w-10 rounded-xl border border-slate-700 bg-slate-900/80 flex items-center justify-center text-slate-200 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden sm:block shrink-0">
              <KineticBrandLogo to="/" compact />
            </div>

            <span
              className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5 shrink-0 ${badgeClass}`}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> {role}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-[10px] font-mono text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
            </span>

            <Link
              to="/"
              aria-label={t("portal.goHome")}
              className="min-h-10 px-3 rounded-full border border-slate-700/80 bg-slate-900/80 hover:border-cyan-400/50 text-slate-200 text-xs font-medium inline-flex items-center gap-1.5"
            >
              <Home className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">{t("portal.goHome")}</span>
            </Link>

            <NotificationsPopover />

            <div className="hidden sm:flex items-center gap-1.5">
              <LanguageSwitch />
            </div>

            <button
              type="button"
              onClick={() => void handleLogout()}
              data-testid="portal-logout-btn"
              className="min-h-10 px-3.5 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-300 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{t("portal.logout")}</span>
            </button>
          </div>
        </header>

        {/* Main Workspace */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white" data-testid="portal-page-title">
                {title}
              </h1>
              {subtitle && <p className="text-xs sm:text-sm text-slate-400 mt-1">{subtitle}</p>}
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Signed in as <span className="text-cyan-300 font-semibold">{user.full_name}</span>
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
