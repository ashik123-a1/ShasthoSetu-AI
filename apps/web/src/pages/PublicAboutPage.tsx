import { Link } from "react-router-dom";
import { ShieldCheck, Lock, HeartHandshake } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { PublicFloatingHeader } from "../components/layout/PublicFloatingHeader";
import { PublicFooter } from "../components/layout/PublicFooter";

export function PublicAboutPage() {
  const { locale } = useI18n();
  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-text)] pt-24">
      <PublicFloatingHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 space-y-8">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold">
            {locale === "bn" ? "স্বাস্থ্যসেতু এআই সম্পর্কে" : "About ShasthoSetu AI"}
          </h1>
          <p className="text-base text-[var(--color-text-muted)] leading-relaxed">
            {locale === "bn"
              ? "স্বাস্থ্যসেতু এআই বাংলাদেশের পরিবারগুলোর জন্য বাংলা-প্রথম ডিজিটাল স্বাস্থ্যসেবা, মানব-যাচাইকৃত প্রেসক্রিপশন ভল্ট, সিমুলেটেড পেমেন্ট এবং স্বচ্ছ চিকিৎসা-গবেষণা উপস্থাপনার একটি পূর্ণাঙ্গ ৪-ভূমিকা প্ল্যাটফর্ম।"
              : "ShasthoSetu AI is a Bengali-first 4-role healthcare orchestration platform pairing deterministic SQLite clinical scheduling, mandatory human-verified OCR safety barriers, Zero-PHI support isolation, and honestly audited ML research tracks."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-2">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
            <h2 className="font-bold text-base">Zero-PHI Helpdesk & Privacy</h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Support teams resolve booking & billing tickets cleanly without seeing diagnoses, symptoms, or prescriptions.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-2">
            <Lock className="w-6 h-6 text-sky-500" />
            <h2 className="font-bold text-base">Human-in-the-Loop OCR</h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Medication reminders remain strictly locked (HTTP 422) until human reviewers manually verify critical OCR entries.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-2">
            <HeartHandshake className="w-6 h-6 text-violet-500" />
            <h2 className="font-bold text-base">Honest Research Governance</h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              All 6 ML tracks cite their exact benchmark splits & caveats; RAG (AI-01) and Voice (AI-02) remain transparently deferred.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link to="/doctors" className="min-h-11 px-5 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] font-semibold text-sm inline-flex items-center">
            {locale === "bn" ? "ডাক্তার খুঁজুন" : "Browse Approved Doctors"}
          </Link>
          <Link to="/research" className="min-h-11 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] font-semibold text-sm inline-flex items-center">
            {locale === "bn" ? "গবেষণা অডিট দেখুন" : "View Research Audit"}
          </Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
