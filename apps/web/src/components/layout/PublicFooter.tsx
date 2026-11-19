import { Link } from "react-router-dom";
import { ArrowUp, Pause, Play, ShieldCheck } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { usePreferences } from "../../lib/preferences";

export function PublicFooter() {
  const { locale, t } = useI18n();
  const { motionPaused, toggleMotionPaused } = usePreferences();

  return (
    <footer className="relative z-10 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md text-[var(--color-text)] py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center gap-2.5">
            <img src="/shasthosetu-logo.png" alt="ShasthoSetu AI" className="w-9 h-9 rounded-full object-cover ring-1 ring-sky-400/40" />
            <div>
              <p className="font-bold text-base tracking-wide">
                SHASTHOSETU <span className="text-[var(--color-primary)]">AI</span>
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">Smart Health. Accessible Care. Better Tomorrow.</p>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-[var(--color-text-muted)] max-w-lg">
            {t("app.footerNotice")}
          </p>
          <div className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            {locale === "bn" ? "সকল গবেষণা মডেল ক্লিনিকাল রোগ নির্ণয়ের জন্য নয়" : "Research Models Non-Diagnostic • Synthetic Demo Data"}
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <h3 className="font-semibold text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
            {locale === "bn" ? "পাবলিক রুট" : "Explore"}
          </h3>
          <ul className="space-y-1.5">
            <li><Link className="hover:text-[var(--color-primary)] inline-block py-1" to="/doctors">{t("publicSite.nav.doctors")}</Link></li>
            <li><Link className="hover:text-[var(--color-primary)] inline-block py-1" to="/consultations">{t("publicSite.nav.consultations")}</Link></li>
            <li><Link className="hover:text-[var(--color-primary)] inline-block py-1" to="/services">{t("publicSite.nav.services")}</Link></li>
            <li><Link className="hover:text-[var(--color-primary)] inline-block py-1" to="/research">{t("publicSite.nav.research")}</Link></li>
          </ul>
        </div>

        <div className="space-y-2 text-sm">
          <h3 className="font-semibold text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
            {locale === "bn" ? "পোর্টাল ও ডকুমেন্টেশন" : "Portals & Docs"}
          </h3>
          <ul className="space-y-1.5">
            <li><Link className="hover:text-[var(--color-primary)] inline-block py-1" to="/login">{t("publicSite.nav.login")}</Link></li>
            <li><Link className="hover:text-[var(--color-primary)] inline-block py-1" to="/register">{t("publicSite.nav.register")}</Link></li>
            <li><Link className="hover:text-[var(--color-primary)] inline-block py-1" to="/doctor-apply">{t("auth.doctorApplyLink")}</Link></li>
            <li><Link className="hover:text-[var(--color-primary)] inline-block py-1" to="/about">{t("publicSite.nav.about")}</Link></li>
            <li><Link className="hover:text-[var(--color-primary)] inline-block py-1 font-mono text-xs" to="/dev/design-system">Dev Design System</Link></li>
          </ul>
        </div>
      </div>

      {/* Bottom accessibility & quick return bar matching ShadowAstra Chrome Footer */}
      <div className="max-w-7xl mx-auto mt-8 pt-5 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--color-text-muted)]">
        <span className="font-mono">© 2026 ShasthoSetu AI · Dhaka, Bangladesh</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleMotionPaused}
            aria-pressed={motionPaused}
            className="min-h-11 px-3 rounded-full border border-[var(--color-border)] hover:border-[var(--color-primary)] inline-flex items-center gap-1.5 font-medium cursor-pointer"
          >
            {motionPaused ? <Play className="w-3.5 h-3.5 text-[var(--color-primary)]" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{motionPaused ? t("controls.pauseMotionOn") : t("controls.pauseMotionOff")}</span>
          </button>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: motionPaused ? "auto" : "smooth" })}
            aria-label="Back to top"
            className="min-h-11 px-3 rounded-full border border-[var(--color-border)] hover:border-[var(--color-primary)] inline-flex items-center gap-1.5 font-medium cursor-pointer"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>Top</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
