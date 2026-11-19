import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Globe, LayoutDashboard, LogIn, LogOut, Menu, Moon, Pause, Play, Search, Settings, Sun, X } from "lucide-react";
import { roleHomePath, useAuth } from "../../lib/authContext";
import { useI18n } from "../../lib/i18n";
import { getEdges, slideFill } from "../../lib/pillMotion";
import { usePreferences } from "../../lib/preferences";
import { CommandSearchModal } from "./CommandSearchModal";
import { NotificationsPopover } from "./NotificationsPopover";

export function PublicFloatingHeader({ transparentHero = false }: { transparentHero?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  const { theme, toggleTheme, motionPaused, toggleMotionPaused } = usePreferences();
  const { user, authenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  const navContainerRef = useRef<HTMLDivElement>(null);
  const fillLayerRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const isHeroGlass = transparentHero && !scrolled;
  const darkSurface = isHeroGlass || theme === "dark";

  const navItems = useMemo(
    () => [
      { to: "/", label: t("publicSite.nav.home"), matchPrefix: false },
      { to: "/doctors", label: t("publicSite.nav.doctors"), matchPrefix: true },
      { to: "/consultations", label: t("publicSite.nav.consultations"), matchPrefix: true },
      { to: "/services", label: t("publicSite.nav.services"), matchPrefix: true },
      { to: "/research", label: t("publicSite.nav.research"), matchPrefix: true },
      {
        to: authenticated && user ? roleHomePath(user) : "/login",
        label: authenticated && user ? t("publicSite.nav.dashboard") : t("publicSite.nav.portals"),
        matchPrefix: true,
      },
      { to: "/about", label: t("publicSite.nav.about"), matchPrefix: true },
    ],
    [authenticated, user, t]
  );

  const secondaryLinks = useMemo(
    () => [
      { to: "/care-map", label: t("publicSite.nav.careMap") },
      { to: "/features/pcos", label: t("publicSite.nav.pcosCare") },
      { to: "/features/prescription-ocr", label: t("publicSite.nav.safeOcr") },
      { to: "/features/pediatric-rash", label: t("publicSite.nav.pediatricRash") },
    ],
    [t]
  );

  const activePath = useMemo(() => {
    const found = navItems.find((item) =>
      item.matchPrefix ? location.pathname.startsWith(item.to) : location.pathname === item.to
    );
    return found?.to ?? null;
  }, [navItems, location.pathname]);

  const targetPath = hoveredPath || activePath;

  useLayoutEffect(() => {
    const container = navContainerRef.current;
    const fill = fillLayerRef.current;
    const btn = targetPath ? linkRefs.current[targetPath] : null;
    if (!container || !fill) return;
    if (!btn) {
      fill.style.opacity = "0";
      return;
    }
    fill.style.opacity = "1";
    const immediate = isInitialMountRef.current || motionPaused;
    slideFill(fill, getEdges(container, btn), immediate);
    isInitialMountRef.current = false;
  }, [targetPath, locale, motionPaused]);

  useEffect(() => {
    const syncImmediate = () => {
      const container = navContainerRef.current;
      const fill = fillLayerRef.current;
      const btn = targetPath ? linkRefs.current[targetPath] : null;
      if (container && fill && btn) {
        fill.style.opacity = "1";
        slideFill(fill, getEdges(container, btn), true);
      }
    };
    window.addEventListener("resize", syncImmediate);
    return () => window.removeEventListener("resize", syncImmediate);
  }, [targetPath]);

  const handleLogout = async () => {
    setSettingsOpen(false);
    await logout();
    navigate("/");
  };

  return (
    <>
      <header
        data-testid="public-floating-header"
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 pointer-events-none ${
          isHeroGlass ? "pt-3 pb-2" : "py-2.5 bg-[var(--glass-bg)]/80 backdrop-blur-xl border-b border-[var(--glass-border)] shadow-sm"
        }`}
      >
        <div className="max-w-[1540px] mx-auto px-4 sm:px-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          {/* LEFT ZONE: Brand Mark matching AgriSense screenshot */}
          <Link
            to="/"
            data-testid="header-brand-link"
            className="pointer-events-auto justify-self-start inline-flex items-center gap-2.5 min-h-11 pr-1 shrink-0"
          >
            <img
              src="/shasthosetu-logo.png"
              alt="ShasthoSetu AI Logo"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-sky-400/50 shadow-[0_4px_16px_rgba(56,189,248,0.32)]"
            />
            <span className="hidden sm:inline-flex items-baseline gap-1.5 whitespace-nowrap">
              <span
                className={`text-[13px] font-bold tracking-[0.16em] ${
                  darkSurface ? "text-slate-100" : "text-[var(--color-text)]"
                }`}
              >
                SHASTHOSETU
              </span>
              <span className="text-[12px] font-bold tracking-[0.16em] text-sky-400">
                AI
              </span>
            </span>
          </Link>

          {/* CENTER ZONE: Floating Glass 7-Tab Pill Bar with GSAP Dual-Edge Slide Fill */}
          <div
            className={`pointer-events-auto hidden xl:flex items-center justify-center rounded-full p-1.5 transition-all ${
              darkSurface ? "ss-glass-capsule" : "ss-glass-capsule-scrolled"
            }`}
          >
            <nav
              ref={navContainerRef}
              aria-label="Primary Public Navigation"
              data-testid="floating-pill-navbar"
              onMouseLeave={() => setHoveredPath(null)}
              className="relative inline-flex items-center gap-1 rounded-full"
            >
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={!item.matchPrefix}
                  ref={(el) => {
                    linkRefs.current[item.to] = el;
                  }}
                  onMouseEnter={() => setHoveredPath(item.to)}
                  onFocus={() => setHoveredPath(item.to)}
                  onBlur={() => setHoveredPath(null)}
                  className={`relative z-[1] min-h-11 px-4 rounded-full text-[13px] font-semibold inline-flex items-center whitespace-nowrap transition-colors ${
                    darkSurface ? "text-slate-200 hover:text-white" : "text-[var(--color-text)]"
                  }`}
                >
                  {item.label}
                </NavLink>
              ))}

              {/* GSAP Adaptive Sliding Pill Overlay */}
              <div
                ref={fillLayerRef}
                aria-hidden="true"
                className="absolute inset-0 z-[2] inline-flex items-center gap-1 pointer-events-none rounded-full transition-opacity duration-200"
                style={{
                  background: "var(--nav-pill-bg)",
                  color: "var(--nav-pill-fg)",
                  boxShadow: "var(--nav-pill-shadow)",
                  clipPath: "inset(0px 100% 0px 0px round 9999px)",
                  willChange: "clip-path",
                }}
              >
                {navItems.map((item) => (
                  <span
                    key={item.to}
                    className="min-h-11 px-4 rounded-full text-[13px] font-bold inline-flex items-center whitespace-nowrap"
                    style={{ color: "var(--nav-pill-fg)" }}
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            </nav>
          </div>

          {/* RIGHT ZONE: Exact Two-Piece Screenshot Cluster ([ Sun/Moon ] + [ Ctrl K | Bell | Settings/Account ]) */}
          <div className="pointer-events-auto justify-self-end col-start-3 flex items-center gap-2 shrink-0">
            {/* 1. Standalone Circular Theme Toggle Capsule */}
            <div
              className={`hidden sm:inline-flex items-center rounded-full p-1 transition-all ${
                darkSurface ? "ss-glass-capsule" : "ss-glass-capsule-scrolled"
              }`}
            >
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? t("controls.themeLight") : t("controls.themeDark")}
                data-testid="public-theme-switch"
                className="min-h-11 min-w-11 rounded-full flex items-center justify-center transition cursor-pointer hover:bg-white/10"
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4 text-teal-300" />
                ) : (
                  <Moon className="w-4 h-4 text-sky-400" />
                )}
              </button>
            </div>

            {/* 2. Grouped Frosted Utility Capsule: [ Search Ctrl K | Bell | Settings/Profile ] */}
            <div
              className={`hidden sm:inline-flex items-center gap-1.5 rounded-full p-1.5 transition-all ${
                darkSurface ? "ss-glass-capsule" : "ss-glass-capsule-scrolled"
              }`}
            >
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label={t("publicSite.nav.searchHint")}
                data-testid="header-search-btn"
                className={`min-h-11 px-3.5 rounded-full inline-flex items-center gap-2 text-xs font-medium transition cursor-pointer ${
                  darkSurface
                    ? "bg-white/5 hover:bg-white/15 border border-white/15 text-slate-100"
                    : "bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] border border-[var(--color-border)] text-[var(--color-text)]"
                }`}
              >
                <Search className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-mono text-[11px]">Ctrl K</span>
              </button>

              <NotificationsPopover darkOverlay={darkSurface} variant="capsule" />

              {/* Settings + Account / Language / Motion Gear Trigger */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSettingsOpen((v) => !v)}
                  aria-label="Account, Language & Motion Settings"
                  data-testid="public-settings-btn"
                  className={`min-h-11 min-w-11 px-2.5 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold transition cursor-pointer ${
                    darkSurface
                      ? "bg-white/5 hover:bg-white/15 border border-white/15 text-slate-100"
                      : "bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] border border-[var(--color-border)] text-[var(--color-text)]"
                  }`}
                >
                  <Settings className={`w-4 h-4 ${authenticated ? "text-teal-400" : ""}`} />
                  {authenticated && user && (
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-sky-400/20 text-sky-300">
                      {user.primary_role}
                    </span>
                  )}
                </button>

                {settingsOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-2xl p-3.5 space-y-3 z-50">
                    <div className="space-y-1.5 border-b border-[var(--color-border)] pb-2.5">
                      {authenticated && user ? (
                        <>
                          <div className="text-xs font-bold truncate">{user.full_name}</div>
                          <div className="flex gap-2">
                            <Link
                              to={roleHomePath(user)}
                              onClick={() => setSettingsOpen(false)}
                              data-testid="header-dashboard-link"
                              className="flex-1 min-h-11 px-3 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                            >
                              <LayoutDashboard className="w-3.5 h-3.5" /> {t("publicSite.nav.dashboard")}
                            </Link>
                            <button
                              type="button"
                              onClick={() => void handleLogout()}
                              data-testid="header-logout-btn"
                              className="min-h-11 px-3 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-300 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <LogOut className="w-3.5 h-3.5" /> {t("publicSite.nav.logout")}
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex gap-2">
                          <Link
                            to="/login"
                            onClick={() => setSettingsOpen(false)}
                            data-testid="header-login-link"
                            className="flex-1 min-h-11 px-3 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                          >
                            <LogIn className="w-3.5 h-3.5" /> {t("publicSite.nav.login")}
                          </Link>
                          <Link
                            to="/register"
                            onClick={() => setSettingsOpen(false)}
                            className="flex-1 min-h-11 px-3 rounded-xl border border-[var(--color-border)] text-xs font-semibold inline-flex items-center justify-center"
                          >
                            {t("publicSite.nav.register")}
                          </Link>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5" /> {t("controls.langLabel")}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setLocale("bn")}
                          data-testid="public-lang-bn"
                          className={`min-h-11 rounded-xl text-xs font-semibold cursor-pointer ${
                            locale === "bn"
                              ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)]"
                              : "bg-[var(--color-surface-alt)] text-[var(--color-text)]"
                          }`}
                        >
                          বাংলা
                        </button>
                        <button
                          type="button"
                          onClick={() => setLocale("en")}
                          data-testid="public-lang-en"
                          className={`min-h-11 rounded-xl text-xs font-semibold cursor-pointer ${
                            locale === "en"
                              ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)]"
                              : "bg-[var(--color-surface-alt)] text-[var(--color-text)]"
                          }`}
                        >
                          English
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={toggleMotionPaused}
                      data-testid="public-pause-motion-btn"
                      className="w-full min-h-11 px-3 rounded-xl bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-xs font-semibold flex items-center justify-between cursor-pointer"
                    >
                      <span>{motionPaused ? t("controls.pauseMotionOn") : t("controls.pauseMotionOff")}</span>
                      {motionPaused ? <Play className="w-4 h-4 text-teal-400" /> : <Pause className="w-4 h-4" />}
                    </button>

                    <div className="pt-2 border-t border-[var(--color-border)] grid grid-cols-2 gap-1.5">
                      {secondaryLinks.map((sec) => (
                        <Link
                          key={sec.to}
                          to={sec.to}
                          onClick={() => setSettingsOpen(false)}
                          className="min-h-10 px-2.5 rounded-lg bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[11px] font-semibold inline-flex items-center justify-center text-center"
                        >
                          {sec.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Controls (< sm & < xl) */}
            <div className="flex xl:hidden items-center gap-1.5">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? t("controls.themeLight") : t("controls.themeDark")}
                className={`sm:hidden min-h-11 min-w-11 rounded-full border flex items-center justify-center cursor-pointer ${
                  darkSurface ? "ss-glass-capsule text-sky-300" : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)]"
                }`}
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label={t("publicSite.nav.searchHint")}
                className={`sm:hidden min-h-11 min-w-11 rounded-full border flex items-center justify-center cursor-pointer ${
                  darkSurface ? "ss-glass-capsule text-white" : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)]"
                }`}
              >
                <Search className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label={mobileMenuOpen ? t("controls.closeMenu") : t("controls.openMenu")}
                data-testid="public-mobile-menu-btn"
                className={`min-h-11 min-w-11 rounded-full border flex items-center justify-center cursor-pointer ${
                  darkSurface
                    ? "ss-glass-capsule text-white"
                    : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)]"
                }`}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden pointer-events-auto mt-2 mx-4 rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text)] p-3 shadow-2xl space-y-1.5">
            {[...navItems, ...secondaryLinks.map((s) => ({ ...s, matchPrefix: true }))].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={!item.matchPrefix}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `min-h-11 px-4 rounded-xl flex items-center text-sm font-medium ${
                    isActive
                      ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)] font-semibold"
                      : "hover:bg-[var(--color-surface-alt)]"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="pt-2 border-t border-[var(--color-border)] flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLocale(locale === "bn" ? "en" : "bn")}
                className="flex-1 min-h-11 rounded-xl bg-[var(--color-surface-alt)] text-xs font-semibold cursor-pointer"
              >
                {locale === "bn" ? "English" : "বাংলা"}
              </button>
              <button
                type="button"
                onClick={toggleMotionPaused}
                className="flex-1 min-h-11 rounded-xl bg-[var(--color-surface-alt)] text-xs font-semibold cursor-pointer"
              >
                {motionPaused ? t("controls.pauseMotionOn") : t("controls.pauseMotionOff")}
              </button>
            </div>
          </div>
        )}
      </header>

      <CommandSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
