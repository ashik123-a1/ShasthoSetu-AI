import { Link } from "react-router-dom";
import {
  ArrowUp,
  Github,
  Globe,
  MessageCircle,
  Pause,
  PhoneCall,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { usePreferences } from "../../lib/preferences";

export function PublicFooter() {
  const { locale, t } = useI18n();
  const { motionPaused, toggleMotionPaused, replayPreloader } = usePreferences();

  return (
    <footer className="relative z-10 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md text-[var(--color-text)] py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Col 1: Brand and Medical Disclaimer */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <img src="/shasthosetu-logo.png" alt="ShasthoSetu AI" className="w-9 h-9 rounded-full object-cover ring-1 ring-sky-400/40" />
            <div>
              <p className="font-bold text-base tracking-wide">
                SHASTHOSETU <span className="text-[var(--color-primary)]">AI</span>
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">Smart Health. Accessible Care. Better Tomorrow.</p>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
            {t("app.footerNotice")}
          </p>
          <div className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            {locale === "bn" ? "সকল গবেষণা মডেল ক্লিনিকাল রোগ নির্ণয়ের জন্য নয়" : "Research Models Non-Diagnostic • Synthetic Demo Data"}
          </div>
        </div>

        {/* Col 2: Platform Pillars */}
        <div className="space-y-2 text-sm">
          <h3 className="font-semibold text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
            {locale === "bn" ? "মূল প্ল্যাটফর্ম" : "Platform Pillars"}
          </h3>
          <ul className="space-y-1.5">
            <li><Link className="hover:text-[var(--color-primary)] inline-block py-1" to="/services">{t("publicSite.nav.services")}</Link></li>
            <li><Link className="hover:text-[var(--color-primary)] inline-block py-1 text-rose-400 font-semibold" to="/blood-connect">{t("publicSite.nav.bloodConnect")}</Link></li>
            <li><Link className="hover:text-[var(--color-primary)] inline-block py-1" to="/find-care">{t("publicSite.nav.findCare")}</Link></li>
            <li><Link className="hover:text-[var(--color-primary)] inline-block py-1" to="/research">{t("publicSite.nav.research")}</Link></li>
            <li><Link className="hover:text-[var(--color-primary)] inline-block py-1" to="/journal">{t("publicSite.nav.journal")}</Link></li>
          </ul>
        </div>

        {/* Col 3: About, Portals & Dev */}
        <div className="space-y-2 text-sm">
          <h3 className="font-semibold text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
            {locale === "bn" ? "পরিচিতি, পোর্টাল ও ডক্স" : "About, Team & Portals"}
          </h3>
          <ul className="space-y-1.5">
            <li><Link className="hover:text-[var(--color-primary)] inline-block py-1 font-medium" to="/about">{locale === "bn" ? "আমাদের সম্পর্কে, মিশন ও টিম" : "About · Team · Mission · Contact"}</Link></li>
            <li><Link className="hover:text-[var(--color-primary)] inline-block py-1" to="/login">{t("publicSite.nav.login")}</Link></li>
            <li><Link className="hover:text-[var(--color-primary)] inline-block py-1" to="/register">{t("publicSite.nav.register")}</Link></li>
            <li><Link className="hover:text-[var(--color-primary)] inline-block py-1" to="/doctor-apply">{t("auth.doctorApplyLink")}</Link></li>
            <li><Link className="hover:text-[var(--color-primary)] inline-block py-1 font-mono text-xs" to="/dev/design-system">Dev Design System</Link></li>
          </ul>
        </div>

        {/* Col 4: 24/7 Helpline & Demo Social Channels */}
        <div className="space-y-3.5 text-xs">
          <h3 className="font-semibold text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
            {locale === "bn" ? "২৪/৭ জরুরি হেল্পলাইন ও সোশ্যাল ডেমো" : "24/7 Helpline & Social Demo"}
          </h3>

          <div className="space-y-2">
            <a
              href="tel:+8809612742786"
              className="p-2.5 rounded-xl border border-cyan-500/30 bg-cyan-950/20 hover:bg-cyan-900/30 flex items-center gap-2.5 text-cyan-200 transition"
            >
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-300 shrink-0">
                <PhoneCall className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-mono text-slate-400 uppercase">24/7 Care Telehealth</div>
                <div className="font-mono font-bold text-xs text-white">+880 9612-SHASTHO (74278)</div>
              </div>
            </a>
          </div>

          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              Connect With Us (Demo):
            </span>
            <div className="flex flex-wrap gap-2">
              <a
                href="https://facebook.com/#shasthosetu"
                target="_blank"
                rel="noreferrer"
                title="Facebook Demo"
                className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white font-mono text-[10px] inline-flex items-center gap-1.5 transition"
              >
                <Globe className="w-3 h-3 text-sky-400" /> Facebook
              </a>
              <a
                href="https://instagram.com/#shasthosetu"
                target="_blank"
                rel="noreferrer"
                title="Instagram Demo"
                className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700 hover:border-pink-400 text-slate-300 hover:text-white font-mono text-[10px] inline-flex items-center gap-1.5 transition"
              >
                <Sparkles className="w-3 h-3 text-pink-400" /> Instagram
              </a>
              <a
                href="https://wa.me/8801771449164?text=Hello%20ShasthoSetu%20AI%20Support"
                target="_blank"
                rel="noreferrer"
                title="WhatsApp Demo"
                className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700 hover:border-emerald-400 text-slate-300 hover:text-white font-mono text-[10px] inline-flex items-center gap-1.5 transition"
              >
                <MessageCircle className="w-3 h-3 text-emerald-400" /> WhatsApp
              </a>
              <a
                href="https://github.com/ashik123-a1/ShasthoSetu-AI"
                target="_blank"
                rel="noreferrer"
                title="GitHub Repo"
                className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-mono text-[10px] inline-flex items-center gap-1.5 transition"
              >
                <Github className="w-3 h-3 text-slate-300" /> GitHub
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom accessibility & quick return bar matching ShadowAstra Chrome Footer */}
      <div className="max-w-7xl mx-auto mt-8 pt-5 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--color-text-muted)]">
        <span className="font-mono">© 2026 ShasthoSetu AI · Dhaka, Bangladesh</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={replayPreloader}
            aria-label="Replay intro animation"
            className="min-h-11 px-3 rounded-full border border-[var(--color-border)] hover:border-cyan-400 text-sky-400 hover:text-sky-300 inline-flex items-center gap-1.5 font-medium cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{locale === "bn" ? "ইন্ট্রো দেখুন" : "Replay Intro"}</span>
          </button>
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
