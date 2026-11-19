import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Baby,
  BadgeCheck,
  CalendarClock,
  CalendarHeart,
  ChevronDown,
  FileLock2,
  FlaskConical,
  HeartPulse,
  Lock,
  Radio,
  ScanText,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Video,
} from "lucide-react";
import { apiGet } from "../lib/apiClient";
import { formatBdtFromPoisha } from "../lib/formatters";
import { useI18n } from "../lib/i18n";
import { usePreferences } from "../lib/preferences";
import { HomeSectionRail } from "../components/layout/HomeSectionRail";
import { PublicFloatingHeader } from "../components/layout/PublicFloatingHeader";
import { PublicFooter } from "../components/layout/PublicFooter";
import { BangladeshCareMap, type MapDoctor, type MapFacility } from "../components/map/BangladeshCareMap";
import { StaticCareLatticeFallback } from "../components/three/StaticCareLatticeFallback";
import { TrustBadge } from "../components/ui";

const LazyHeroCareLattice = lazy(() =>
  import("../components/three/HeroCareLattice").then((m) => ({ default: m.HeroCareLattice }))
);

interface OverviewStats {
  approved_doctors: number;
  open_slots: number;
  specialties: number;
  diagnostic_tests: number;
  healthcare_plans: number;
  facilities: number;
  frozen_research_modules: number;
  audit_lock_verdict: string;
}

interface PublicDoctor extends MapDoctor {
  degrees: string;
  experience_years: number;
}

interface PublicServicesPayload {
  diagnostic_tests: Array<{ id: string; code: string; name_bn: string; name_en: string; category: string; sample_type: string; fee_minor_poisha: number; turnaround_hours: number }>;
  healthcare_plans: Array<{ id: string; code: string; name_bn: string; name_en: string; description_bn: string; description_en: string; monthly_fee_minor_poisha: number; max_family_members: number }>;
  facilities: MapFacility[];
}

interface ResearchDatasetRow {
  module: string;
  dataset_or_scope: string;
  reconciled_count: string;
  scientific_classification: string;
  limitations: string;
}

function DonutGaugeSvg({ pct, centerLabel, subLabel, color }: { pct: number; centerLabel: string; subLabel: string; color: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const dash = (clamped / 100) * c;
  return (
    <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
      <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90" aria-hidden="true">
        <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeOpacity="0.14" strokeWidth="5.5" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-mono text-[11px] font-bold leading-none">{centerLabel}</span>
        <span className="font-mono text-[9px] text-[var(--color-text-muted)] mt-0.5">{subLabel}</span>
      </div>
    </div>
  );
}

const FOCUS_PHRASES_EN = [
  "doctor discovery.",
  "human-verified OCR.",
  "Zero-PHI helpdesk.",
  "audited ML transparency.",
];
const FOCUS_PHRASES_BN = [
  "চিকিৎসক নিয়োগ ও স্লট লক।",
  "মানব-যাচাইকৃত প্রেসক্রিপশন OCR।",
  "Zero-PHI সাপোর্ট নিরাপত্তা।",
  "নিরীক্ষিত এআই গবেষণা স্বচ্ছতা।",
];

const SOURCE_MARQUEE_ITEMS = [
  "SQLITE 3 WAL • 36 TABLES",
  "ARGON2ID + HTTPONLY SESSION",
  "ZERO-PHI SUPPORT GUARD (403)",
  "SAFE-OCR VERIFICATION (422)",
  "ATOMIC SLOT LOCK (BEGIN IMMEDIATE)",
  "PCOS M01/M02 AUDITED BENCHMARK",
  "MCVSLD 755-FAMILY LEAK-FREE SPLIT",
  "DERMOPED 22-PATIENT VERIFIED",
  "WATERMARKED DEMO RECEIPTS",
];

export function PublicHomePage() {
  const { locale, t } = useI18n();
  const { motionPaused } = usePreferences();
  const navigate = useNavigate();

  const [activeLayer, setActiveLayer] = useState(0);
  const [heroMode, setHeroMode] = useState<"SQLite" | "HTTP 422" | "Zero-PHI" | "Audit">("SQLite");
  const [autoRotate, setAutoRotate] = useState(true);
  const [heroSearch, setHeroSearch] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mount3d, setMount3d] = useState(false);
  const [wordIdx, setWordIdx] = useState(0);

  // Interactive Section States (Sections 05 & 08)
  const [activeArchLayer, setActiveArchLayer] = useState(0);
  const [activeHudTab, setActiveHudTab] = useState<"labs" | "plans" | "ocr" | "triage">("labs");

  const [overview, setOverview] = useState<OverviewStats>({
    approved_doctors: 3,
    open_slots: 27,
    specialties: 5,
    diagnostic_tests: 4,
    healthcare_plans: 2,
    facilities: 4,
    frozen_research_modules: 6,
    audit_lock_verdict: "RESEARCH_AUDIT_PASS_WITH_LIMITATIONS",
  });
  const [doctors, setDoctors] = useState<PublicDoctor[]>([]);
  const [services, setServices] = useState<PublicServicesPayload | null>(null);
  const [datasets, setDatasets] = useState<ResearchDatasetRow[]>([]);

  useEffect(() => {
    const tId = setTimeout(() => setMount3d(true), 120);
    return () => clearTimeout(tId);
  }, []);

  useEffect(() => {
    if (motionPaused) return;
    const id = window.setInterval(() => setWordIdx((i) => i + 1), 2800);
    return () => clearInterval(id);
  }, [motionPaused]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [ov, docRes, svcRes, resData] = await Promise.all([
          apiGet<OverviewStats>("/v1/public/overview"),
          apiGet<{ doctors: PublicDoctor[] }>("/v1/public/doctors"),
          apiGet<PublicServicesPayload>("/v1/public/services"),
          apiGet<{ datasets: ResearchDatasetRow[] }>("/v1/public/research"),
        ]);
        if (!active) return;
        setOverview(ov);
        setDoctors(docRes.doctors || []);
        setServices(svcRes);
        setDatasets(resData.datasets || []);
      } catch {
        // Keep clean defaults while API wakes
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const heroLayers = useMemo(
    () => [
      {
        id: 0,
        label: t("publicSite.hero.layer01"),
        metricLabel: locale === "bn" ? "স্লট বুকিং গার্ড" : "Atomic Slot Guard",
        metricValue: "SQLite 409 Lock",
        noteBn: "একই স্লটে দুই রোগীর বুকিং ঠেকাতে SQLite BEGIN IMMEDIATE লক সক্রিয়।",
        noteEn: "Atomic SQLite BEGIN IMMEDIATE slot locking prevents double bookings.",
      },
      {
        id: 1,
        label: t("publicSite.hero.layer02"),
        metricLabel: locale === "bn" ? "OCR নিরাপত্তা নীতি" : "OCR Safety Barrier",
        metricValue: "HTTP 422 Gate",
        noteBn: "মানুষ প্রতিটি ওষুধ যাচাই না করলে রিমাইন্ডার সক্রিয় হয় না।",
        noteEn: "Medication reminders stay blocked (HTTP 422) until a human verifies critical fields.",
      },
      {
        id: 2,
        label: t("publicSite.hero.layer03"),
        metricLabel: locale === "bn" ? "শিশু ও মাতৃ ট্রায়াজ" : "Red-Flag Rules",
        metricValue: "Zero-PHI / Rules",
        noteBn: "শিশুর বিপদচিহ্ন ও PCOS চক্র ট্র্যাকিং আলাদা নিরাপদ প্রোফাইলে সংরক্ষিত।",
        noteEn: "Dependent child triage rules & PCOS logs isolate family PHI cleanly.",
      },
      {
        id: 3,
        label: t("publicSite.hero.layer04"),
        metricLabel: t("publicSite.hero.telemetryResearch"),
        metricValue: `${overview.frozen_research_modules} Locked`,
        noteBn: "সব ৬টি গবেষণা মডেলের মেট্রিক চূড়ান্ত অডিট ফাইল থেকে সরাসরি প্রদর্শিত।",
        noteEn: "All 6 frozen benchmarks stream verbatim from audited final_lock manifests.",
      },
    ],
    [overview, locale, t]
  );

  const currentLayer = heroLayers[activeLayer] ?? heroLayers[0];
  const phrases = locale === "bn" ? FOCUS_PHRASES_BN : FOCUS_PHRASES_EN;
  const activePhrase = phrases[wordIdx % phrases.length];

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(heroSearch.trim() ? `/doctors?q=${encodeURIComponent(heroSearch.trim())}` : "/doctors");
  };

  const quickSymptomChips = [
    { key: "pcos", bn: "পিসিওএস / অনিয়মিত পিরিয়ড", en: "PCOS & Irregular Cycles" },
    { key: "child fever", bn: "শিশুর জ্বর ও টিকা", en: "Child Fever & Vaccines" },
    { key: "skin rash", bn: "ভাইরাল র‍্যাশ ও চর্মরোগ", en: "Viral Skin Rash" },
    { key: "consultation", bn: "সাধারণ চিকিৎসা পরামর্শ", en: "General Consultation" },
  ];

  const archLayers = [
    {
      titleBn: "০১ • রোগী পোর্টাল, PHR ভল্ট ও ডেমো পেমেন্ট",
      titleEn: "01 • Patient Portal, PHR Vault & Demo Checkout",
      badge: "PATIENT RBAC",
      descBn: "স্বয়ং ও শিশু-নির্ভরশীল প্রোফাইল, অ্যাটমিক বুকিং, bKash/Nagad/Card ডেমো রসিদ ও মানব-যাচাইকৃত OCR।",
      descEn: "Adult & child dependent isolation, atomic slot reservations, watermarked simulated receipts, and human-gated OCR schedules.",
      ctaPath: "/patient/dashboard",
    },
    {
      titleBn: "০২ • চিকিৎসক সময়সূচী, কিউ ও ই-প্রেসক্রিপশন",
      titleEn: "02 • Doctor Schedule, Queue & Signed e-Rx",
      badge: "APPROVED GATE",
      descBn: "অ্যাডমিন অনুমোদন ছাড়া স্লট বন্ধ, আসন্ন রোগী তালিকা, স্লট ওভারল্যাপ ব্লক (409) এবং ডিজিটাল ই-প্রেসক্রিপশন।",
      descEn: "Pending doctor onboarding block until Admin APPROVED, overlap trigger (409), signed clinical notes, and demo e-prescriptions.",
      ctaPath: "/doctor/dashboard",
    },
    {
      titleBn: "০৩ • সাপোর্ট হেল্পডেস্ক ও Zero-PHI নীতি",
      titleEn: "03 • Support Helpdesk & Strict Zero-PHI Barrier",
      badge: "HTTP 403 PHI",
      descBn: "সাপোর্ট টিম কেবল টিকেট, বুকিং রেফারেন্স ও ডেমো পেমেন্ট অবস্থা দেখে — রোগীর প্রেসক্রিপশন বা নোট সম্পূর্ণ ব্লকড।",
      descEn: "Support queries physically exclude symptoms, diagnoses, prescriptions, and clinical notes; clinical probe endpoints return HTTP 403.",
      ctaPath: "/support/dashboard",
    },
    {
      titleBn: "০৪ • অ্যাডমিন গভর্নেন্স ও প্রাইভেসি অডিট",
      titleEn: "04 • Admin Governance & Immutable Audit Logs",
      badge: "AUDIT TRAIL",
      descBn: "ডাক্তার অনুমোদন/স্থগিত, ডেমো রিফান্ড, ফিচার ফ্ল্যাগ ও অপরিবর্তনীয় অডিট লগ — তবে গোপন চিকিৎসা নোট অ্যাডমিনের কাছেও লুকানো।",
      descEn: "Doctor approval workflow, staff provisioning, simulated refunds, feature flags, and immutable audit logs with 403 clinical-note redaction.",
      ctaPath: "/admin/dashboard",
    },
  ];

  const impactMetrics = [
    { label: "PCOS CLINICAL XGBOOST", value: "88.57%", pct: 88.6, sub: "CV BAL", color: "#38bdf8", desc: "Repeated stratified 5-fold CV on N=88 cleaned cohort; held-out 17/18 (94.44%)." },
    { label: "PCOS ULTRASOUND RESNET18", value: "86.67%", pct: 86.7, sub: "TEST", color: "#2dd4bf", desc: "39/45 unique held-out ultrasound images; graded strictly as PCOM structural signal." },
    { label: "VIRAL RASH GROUPED RESNET", value: "84.65%", pct: 84.7, sub: "VAL", color: "#818cf8", desc: "Grouped split across 755 independent visual families (zero leakage)." },
    { label: "SQLITE 3 WAL NORMALIZED", value: "36", pct: 100, sub: "TABLES", color: "#f2c879", desc: "Foreign keys ON, partial unique indexes, CHECK gates & interval-overlap triggers." },
    { label: "BILINGUAL KEY PARITY", value: "100%", pct: 100, sub: "BN/EN", color: "#38bdf8", desc: "Recursive Vitest check across every Bengali & English UI dictionary entry." },
    { label: "SUPPORT PHI EXPOSURE", value: "0", pct: 100, sub: "ISOLATED", color: "#2dd4bf", desc: "Zero clinical prose columns selected in Support queries (403 PHI_ACCESS_DENIED)." },
  ];

  const faqs = [
    {
      qBn: "স্বাস্থ্যসেতু এআই-এর পেমেন্ট সিস্টেম কি আসল টাকা কাটে?",
      qEn: "Are payments in ShasthoSetu AI real monetary charges?",
      aBn: "না। এই প্ল্যাটফর্মের bKash/Nagad/Card চেকআউট সম্পূর্ণ সিমুলেটেড (DEMO / SIMULATED)। এখানে কোনো আসল পিন, ওটিপি বা কার্ড নম্বর নেওয়া হয় না এবং প্রতিটি রসিদে স্পষ্ট ওয়াটারমার্ক থাকে।",
      aEn: "No. Every bKash/Nagad/Card checkout is strictly SIMULATED / DEMO with zero PIN, OTP, CVV, or card storage and a watermarked simulation notice on every receipt.",
    },
    {
      qBn: "প্রেসক্রিপশন OCR কি নিজে থেকেই ওষুধের রিমাইন্ডার চালু করে?",
      qEn: "Can prescription OCR automatically schedule medication reminders?",
      aBn: "না। ক্লিনিকাল নিরাপত্তার জন্য সব অনিশ্চিত OCR ক্ষেত্র রোগী নিজে যাচাই ও নিশ্চিত না করা পর্যন্ত সার্ভার HTTP 422 দিয়ে রিমাইন্ডার চালু করা ব্লক করে রাখে।",
      aEn: "Never. Under the Safe-OCR safety gate, the server rejects reminder activation with HTTP 422 UNVERIFIED_OCR_FIELDS until a human verifies every critical field.",
    },
    {
      qBn: "সাপোর্ট টিম বা অ্যাডমিন কি রোগীর গোপন চিকিৎসা নোট পড়তে পারে?",
      qEn: "Can Support agents or Admins view private patient diagnoses or clinical notes?",
      aBn: "না। সাপোর্ট ডেস্ক কঠোর Zero-PHI নীতিতে কেবল টিকেট, বুকিং রেফারেন্স ও ডেমো পেমেন্ট অবস্থা দেখে। অ্যাডমিন গভর্নেন্সেও ডাক্তারের প্রাইভেট ক্লিনিকাল নোট প্রোজ রেডাক্টেড থাকে (HTTP 403)।",
      aEn: "No. Support operates under Zero-PHI SQL projection (blocked from clinical columns with HTTP 403 PHI_ACCESS_DENIED), and Admin Governance APIs also block raw doctor prose (HTTP 403).",
    },
    {
      qBn: "AI-01 চ্যাটবট এবং AI-02 ভয়েস এআই কোথায়?",
      qEn: "Where are AI-01 Medical Chatbot/RAG and AI-02 Bangla Voice integration?",
      aBn: "মালিকের সিদ্ধান্ত এবং SRS v2.0 ফেজ-জি অনুযায়ী AI-01 ও AI-02 আপাতত DEFERRED অবস্থায় রাখা হয়েছে। ৪টি রোল পোর্টাল, ডেমো পেমেন্ট ও নিরাপদ ওসিআর আগে সম্পন্ন করা হয়েছে।",
      aEn: "Per Master SRS v2.0 Phase G and project governance, AI-01 RAG and AI-02 Voice AI remain transparently marked DEFERRED while the 4-role healthcare workflow and research showcase are live.",
    },
  ];

  return (
    <div className="ss-sapphire-always min-h-screen overflow-x-clip">
      <HomeSectionRail />
      <PublicFloatingHeader transparentHero />

      {/* =================================================================
          SECTION 01 · FULL-VIEWPORT MIDNIGHT SAPPHIRE 3D HERO STAGE
          ================================================================= */}
      <section
        id="hero"
        data-testid="public-hero-section"
        className="relative min-h-screen pt-24 pb-10 px-4 sm:px-6 flex items-center overflow-hidden text-white border-b border-sky-400/20"
      >

        <div className="relative z-10 max-w-[1440px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* LEFT EDITORIAL COLUMN */}
          <div className="lg:col-span-6 min-w-0 space-y-5">
            <div className="flex items-center gap-3 text-[11px] font-mono tracking-[0.16em] uppercase text-slate-300">
              <span className="w-7 h-px bg-sky-400/60 shrink-0" />
              <span>{t("publicSite.hero.credibilityPill")}</span>
            </div>

            <h1
              className="text-4xl sm:text-5xl xl:text-6xl font-bold tracking-tight leading-[1.09]"
              data-testid="public-hero-heading"
            >
              <span className="block bg-gradient-to-b from-white via-sky-200 to-sky-400 bg-clip-text text-transparent">
                {t("publicSite.hero.headlineTop")}
              </span>
              <span className="block bg-gradient-to-b from-teal-100 via-teal-300 to-teal-500 bg-clip-text text-transparent">
                {t("publicSite.hero.headlineMid")}
              </span>
              <span className="block text-[#f2c879] mt-0.5">
                {t("publicSite.hero.headlineBottom")}
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-200/90 max-w-xl leading-relaxed">
              {t("publicSite.hero.subtitle")}{" "}
              <strong className="text-sky-300 font-semibold">{activePhrase}</strong>
            </p>

            {/* Quick Doctor/Symptom Search Bar */}
            <form onSubmit={handleQuickSearch} className="flex flex-col sm:flex-row gap-2.5 max-w-xl">
              <div className="flex-1 flex items-center gap-2 rounded-full bg-white/10 border border-sky-400/30 backdrop-blur-md px-4 min-h-12">
                <Search className="w-4 h-4 text-sky-300 shrink-0" />
                <input
                  type="text"
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                  placeholder={
                    locale === "bn"
                      ? "উপসর্গ, বিশেষজ্ঞ বা ডাক্তারের নাম লিখুন..."
                      : "Search specialty, symptom (PCOS, fever, rash), or doctor..."
                  }
                  className="w-full bg-transparent text-white placeholder:text-slate-300/80 text-sm focus:outline-none"
                  data-testid="hero-search-input"
                />
              </div>
              <button
                type="submit"
                className="min-h-12 px-6 rounded-full bg-gradient-to-r from-sky-400 to-teal-400 hover:from-sky-300 hover:to-teal-300 text-slate-950 font-bold text-sm inline-flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(56,189,248,0.35)] transition cursor-pointer shrink-0"
              >
                {t("publicSite.hero.ctaPrimary")} <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Crisp Editorial Pill CTAs matching AgriSense */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/services"
                className="min-h-11 px-5 rounded-full bg-white text-slate-950 hover:bg-sky-50 font-semibold text-sm inline-flex items-center gap-2 shadow-lg transition"
              >
                {t("publicSite.hero.ctaSecondary")} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                data-testid="hero-portal-login-btn"
                className="min-h-11 px-5 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 text-white text-sm font-medium inline-flex items-center gap-2 backdrop-blur-md transition"
              >
                <Lock className="w-4 h-4 text-sky-300" /> {t("publicSite.hero.ctaPortal")}
              </Link>
            </div>

            {/* Trust Badges Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
              <div className="rounded-xl bg-white/8 border border-sky-400/20 px-3 py-2 flex items-center gap-1.5 text-sky-200">
                <ScanText className="w-3.5 h-3.5 shrink-0" />
                <span>{t("publicSite.badges.humanOcr")}</span>
              </div>
              <div className="rounded-xl bg-white/8 border border-teal-400/20 px-3 py-2 flex items-center gap-1.5 text-teal-200">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>{t("publicSite.badges.zeroPhi")}</span>
              </div>
              <div className="rounded-xl bg-white/8 border border-amber-400/25 px-3 py-2 flex items-center gap-1.5 text-amber-200">
                <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
                <span>{t("publicSite.badges.demoPay")}</span>
              </div>
              <div className="rounded-xl bg-white/8 border border-indigo-400/25 px-3 py-2 flex items-center gap-1.5 text-indigo-200">
                <FlaskConical className="w-3.5 h-3.5 shrink-0" />
                <span>{t("publicSite.badges.nonDiagAi")}</span>
              </div>
            </div>
          </div>

          {/* RIGHT: 3D LATTICE + AGRISENSE VERTICAL CONTROL RAIL + LIVE TELEMETRY HUD */}
          <div className="lg:col-span-6 min-w-0 relative flex flex-col justify-between min-h-[380px] lg:min-h-[540px]">
            <div className="flex-1 flex items-center gap-3 min-w-0">
              <div className="flex-1 min-w-0 overflow-hidden h-[340px] sm:h-[420px] relative">
                {mount3d ? (
                  <Suspense fallback={<StaticCareLatticeFallback activeLayer={activeLayer} reducedMotion={motionPaused} />}>
                    <LazyHeroCareLattice activeLayer={activeLayer} autoRotate={autoRotate} />
                  </Suspense>
                ) : (
                  <StaticCareLatticeFallback activeLayer={activeLayer} reducedMotion={motionPaused} />
                )}
              </div>

              {/* AgriSense-style Far-Right Vertical Control Rail */}
              <aside
                aria-label="Hero Architecture Layer & Safety Mode Rail"
                className="hidden sm:flex flex-col gap-1.5 w-[142px] shrink-0 rounded-2xl bg-[#071022]/85 border border-sky-400/25 backdrop-blur-xl p-2.5 shadow-2xl"
              >
                <span className="font-mono text-[9px] font-bold tracking-[0.14em] uppercase text-slate-400 text-center">
                  Layers
                </span>
                <div className="flex flex-col gap-1" role="tablist" data-testid="hero-layer-switcher">
                  {heroLayers.map((layer) => (
                    <button
                      key={layer.id}
                      type="button"
                      role="tab"
                      aria-selected={activeLayer === layer.id}
                      onClick={() => setActiveLayer(layer.id)}
                      data-testid={`hero-layer-btn-${layer.id}`}
                      className={`min-h-11 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold transition cursor-pointer ${
                        activeLayer === layer.id
                          ? "bg-gradient-to-r from-sky-400 to-teal-400 text-slate-950 font-bold shadow"
                          : "text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      {layer.label}
                    </button>
                  ))}
                </div>

                <div className="h-px bg-white/10 my-0.5" />
                <span className="font-mono text-[9px] font-bold tracking-[0.14em] uppercase text-slate-400 text-center">
                  Guard
                </span>
                <div className="grid grid-cols-2 gap-1">
                  {(["SQLite", "HTTP 422", "Zero-PHI", "Audit"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setHeroMode(m)}
                      className={`py-1 px-1 rounded text-[9.5px] font-mono font-bold transition cursor-pointer whitespace-nowrap ${
                        heroMode === m ? "bg-[#f2c879] text-slate-950" : "text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <div className="h-px bg-white/10 my-0.5" />
                <button
                  type="button"
                  onClick={() => setAutoRotate((r) => !r)}
                  className={`py-1 rounded text-[10px] font-mono font-bold border transition cursor-pointer ${
                    autoRotate
                      ? "bg-sky-400/20 border-sky-400/40 text-sky-300"
                      : "border-white/15 text-slate-400"
                  }`}
                >
                  Auto: {autoRotate ? "ON" : "OFF"}
                </button>
              </aside>
            </div>

            {/* Bottom-Right Frosted Live Clinical Telemetry Card */}
            <div
              data-testid="hero-telemetry-card"
              className="mt-4 rounded-2xl border border-sky-400/25 bg-[#071022]/80 backdrop-blur-xl p-4 shadow-2xl space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-300 inline-flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5" />
                  {t("publicSite.hero.telemetryTitle")}
                </span>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-teal-400/15 text-teal-300 border border-teal-400/30">
                  {overview.audit_lock_verdict}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="rounded-xl bg-black/30 p-2.5 border border-white/5">
                  <div className="text-lg sm:text-xl font-bold font-mono text-white">{overview.approved_doctors}</div>
                  <div className="text-[11px] text-slate-300">{t("publicSite.hero.telemetryDoctors")}</div>
                </div>
                <div className="rounded-xl bg-black/30 p-2.5 border border-white/5">
                  <div className="text-lg sm:text-xl font-bold font-mono text-sky-300">{overview.open_slots}</div>
                  <div className="text-[11px] text-slate-300">{t("publicSite.hero.telemetrySlots")}</div>
                </div>
                <div className="rounded-xl bg-black/30 p-2.5 border border-white/5">
                  <div className="text-sm sm:text-base font-bold font-mono text-[#f2c879] pt-1">{currentLayer.metricValue}</div>
                  <div className="text-[11px] text-slate-300">{currentLayer.metricLabel}</div>
                </div>
              </div>

              <p className="text-xs text-slate-200/90 leading-relaxed">
                {locale === "bn" ? currentLayer.noteBn : currentLayer.noteEn}
              </p>

              {/* Mobile Layer Switcher */}
              <div className="flex sm:hidden gap-1.5 overflow-x-auto pt-1">
                {heroLayers.map((layer) => (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => setActiveLayer(layer.id)}
                    className={`min-h-11 px-3 rounded-full text-xs whitespace-nowrap cursor-pointer ${
                      activeLayer === layer.id ? "bg-sky-400 text-slate-950 font-semibold" : "bg-white/10 text-white"
                    }`}
                  >
                    {layer.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================
          DATA PROVENANCE & ARCHITECTURE MARQUEE (ShadowAstra Pattern)
          ================================================================= */}
      <div className="relative overflow-hidden border-y border-sky-400/20 bg-black/30 backdrop-blur-md py-3.5">
        <div className="ss-animate-marquee flex w-max gap-10 whitespace-nowrap" aria-hidden="true">
          {[...SOURCE_MARQUEE_ITEMS, ...SOURCE_MARQUEE_ITEMS].map((item, idx) => (
            <span key={idx} className="inline-flex items-center gap-10 font-mono text-[11px] tracking-[0.2em] text-sky-200/80 uppercase">
              <span>{item}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
            </span>
          ))}
        </div>
      </div>

      {/* =================================================================
          SECTION 02 · CORE SPECIALIZED MODULES HUB (SEPARATE FEATURE PAGES)
          ================================================================= */}
      <section id="core-modules" className="py-16 px-4 sm:px-6 border-b border-sky-400/20">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-[#38bdf8] mb-1">
                02 • CORE HEALTHCARE &amp; AI FEATURE WORKBENCHES
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                {locale === "bn"
                  ? "পৃথক ডেডিকেটেড মডিউল: পিসিওএস, নিরাপদ OCR ও শিশু র‍্যাশ"
                  : "Dedicated Core Feature Pages: PCOS, Safe OCR & Pediatric Triage"}
              </h2>
            </div>
            <Link
              to="/research"
              className="min-h-11 px-4 rounded-full border border-sky-400/35 bg-sky-400/10 hover:bg-sky-400/20 text-sky-200 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              {locale === "bn" ? "সব ৬টি গবেষণা ট্র্যাক" : "View All 6 Research Tracks"}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* 1. PCOS Clinical AI */}
            <article className="ss-sapphire-card rounded-3xl p-6 flex flex-col justify-between gap-4 hover:border-sky-400/60 transition">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-sky-400/15 border border-sky-400/35 flex items-center justify-center text-sky-300">
                    <CalendarHeart className="w-5 h-5" />
                  </div>
                  <TrustBadge kind="RESEARCH_ONLY" />
                </div>
                <div className="font-mono text-[11px] text-sky-300">M01 XGBoost • Age, BMI &amp; Hormone Form</div>
                <h3 className="text-lg font-bold text-white">1. PCOS Clinical AI</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Structured 20-feature clinical profile input with SimpleImputer running the real `model_best.joblib` probability pipeline (88.57% CV bal acc).
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/research?module=pcos-clinical"
                  className="flex-1 min-h-11 px-4 rounded-full bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 font-bold text-xs inline-flex items-center justify-center gap-1.5"
                >
                  Try Research Demo <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to="/features/pcos"
                  data-testid="home-goto-pcos"
                  className="min-h-11 px-3.5 rounded-full border border-white/20 text-xs text-slate-200 inline-flex items-center justify-center"
                >
                  PCOS Page
                </Link>
              </div>
            </article>

            {/* 2. PCOS Ultrasound AI */}
            <article className="ss-sapphire-card rounded-3xl p-6 flex flex-col justify-between gap-4 hover:border-teal-400/60 transition">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-teal-400/15 border border-teal-400/35 flex items-center justify-center text-teal-300">
                    <FlaskConical className="w-5 h-5" />
                  </div>
                  <TrustBadge kind="RESEARCH_ONLY" />
                </div>
                <div className="font-mono text-[11px] text-teal-300">M02 ResNet18 • Ultrasound Upload (JPG/PNG)</div>
                <h3 className="text-lg font-bold text-white">2. PCOS Ultrasound AI</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Upload ovarian ultrasound scans with CyberScan inspection to classify PCOM / Dominant Follicle / Normal morphology (86.67% held-out test).
                </p>
              </div>
              <Link
                to="/research?module=pcos-ultrasound"
                className="min-h-11 px-4 rounded-full bg-gradient-to-r from-[#2dd4bf] to-[#38bdf8] text-slate-950 font-bold text-xs inline-flex items-center justify-between"
              >
                <span>Try Research Demo</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </article>

            {/* 3. Viral Rash AI */}
            <article className="ss-sapphire-card rounded-3xl p-6 flex flex-col justify-between gap-4 hover:border-indigo-400/60 transition">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-indigo-400/15 border border-indigo-400/35 flex items-center justify-center text-indigo-300">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-400/15 text-indigo-200 border border-indigo-400/35">
                    755-FAMILY SPLIT
                  </span>
                </div>
                <div className="font-mono text-[11px] text-indigo-300">M03 Grouped ResNet18 • Skin Lesion Upload</div>
                <h3 className="text-lg font-bold text-white">3. Viral Rash AI</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Upload skin rash images for leak-free 6-class research softmax probabilities (Chickenpox, Measles, HFMD, Cowpox, Monkeypox, Healthy).
                </p>
              </div>
              <Link
                to="/research?module=viral-rash"
                className="min-h-11 px-4 rounded-full bg-gradient-to-r from-[#818cf8] to-[#38bdf8] text-slate-950 font-bold text-xs inline-flex items-center justify-between"
              >
                <span>Try Research Demo</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </article>

            {/* 4. Prescription OCR */}
            <article className="ss-sapphire-card rounded-3xl p-6 flex flex-col justify-between gap-4 hover:border-amber-400/60 transition">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-[#f2c879]/15 border border-[#f2c879]/40 flex items-center justify-center text-[#f2c879]">
                    <ScanText className="w-5 h-5" />
                  </div>
                  <TrustBadge kind="HUMAN_VERIFIED" />
                </div>
                <div className="font-mono text-[11px] text-[#f2c879]">M04 EasyOCR bn+en • Image/PDF Upload</div>
                <h3 className="text-lg font-bold text-white">4. Prescription OCR</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Laser scan + EasyOCR extracts bilingual text &amp; editable medicine fields locked behind HTTP 422 human verification.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/research?module=prescription-ocr"
                  className="flex-1 min-h-11 px-4 rounded-full bg-gradient-to-r from-[#f2c879] to-[#2dd4bf] text-slate-950 font-bold text-xs inline-flex items-center justify-center gap-1.5"
                >
                  Try Research Demo <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to="/features/prescription-ocr"
                  data-testid="home-goto-ocr"
                  className="min-h-11 px-3.5 rounded-full border border-white/20 text-xs text-slate-200 inline-flex items-center justify-center"
                >
                  OCR Page
                </Link>
              </div>
            </article>

            {/* 5. Bangla Voice AI (Phase G) */}
            <article className="ss-sapphire-card rounded-3xl p-6 flex flex-col justify-between gap-4 hover:border-purple-400/60 transition">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-400/15 border border-purple-400/35 flex items-center justify-center text-purple-300">
                    <Radio className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-200 border border-amber-400/35">
                    PHASE G DEFERRED
                  </span>
                </div>
                <div className="font-mono text-[11px] text-purple-300">M05 Whisper-Small-BN • 39.09% WER</div>
                <h3 className="text-lg font-bold text-white">5. Bangla Voice AI</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Audited on 26 human FLEURS clips (98.37% Bengali Unicode). Interactive mic/RAG flow activates in Phase G per project roadmap.
                </p>
              </div>
              <Link
                to="/research?module=bangla-voice"
                className="min-h-11 px-4 rounded-full border border-purple-400/40 bg-purple-500/15 hover:bg-purple-500/25 text-purple-200 font-bold text-xs inline-flex items-center justify-between"
              >
                <span>View Phase G Preview</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </article>

            {/* 6. DermoPed AI */}
            <article className="ss-sapphire-card rounded-3xl p-6 flex flex-col justify-between gap-4 hover:border-emerald-400/60 transition">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-400/15 border border-emerald-400/35 flex items-center justify-center text-emerald-300">
                    <Baby className="w-5 h-5" />
                  </div>
                  <TrustBadge kind="RESEARCH_ONLY" />
                </div>
                <div className="font-mono text-[11px] text-emerald-300">M06 EXP_B ResNet18 • N=22 Patients</div>
                <h3 className="text-lg font-bold text-white">6. DermoPed AI</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Pediatric chickenpox / pediculosis research classifier with mandatory clinician review warnings &amp; strict small-cohort disclosure.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/research?module=dermoped"
                  className="flex-1 min-h-11 px-4 rounded-full bg-gradient-to-r from-[#34d399] to-[#38bdf8] text-slate-950 font-bold text-xs inline-flex items-center justify-center gap-1.5"
                >
                  Try Research Demo <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to="/features/pediatric-rash"
                  data-testid="home-goto-pediatric"
                  className="min-h-11 px-3.5 rounded-full border border-white/20 text-xs text-slate-200 inline-flex items-center justify-center"
                >
                  Triage Page
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* =================================================================
          SECTION 03 · INTERACTIVE BANGLADESH HEALTHCARE ATLAS & MAP
          ================================================================= */}
      <section id="care-map" className="py-16 px-4 sm:px-6 border-b border-sky-400/20">
        <div className="max-w-7xl mx-auto">
          <BangladeshCareMap
            compact
            facilities={services?.facilities || []}
            doctors={doctors}
          />
        </div>
      </section>

      {/* =================================================================
          SECTION 04 · VERIFIED CLINICIAN DIRECTORY & QUICK DISCOVERY
          ================================================================= */}
      <section id="journey" className="py-16 px-4 sm:px-6 border-b border-sky-400/20">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-[#38bdf8] mb-1">
                  04 • CLINICIAN DISCOVERY &amp; BOOKING
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  {locale === "bn" ? "অনুমোদিত ডেমো চিকিৎসক ও উপসর্গ অনুসন্ধান" : "Verified Demo Clinicians & Instant Symptom Filter"}
                </h2>
              </div>
              <Link to="/doctors" className="min-h-11 inline-flex items-center gap-1.5 text-sm font-semibold text-[#38bdf8] hover:underline">
                {locale === "bn" ? "সব চিকিৎসক দেখুন" : "Browse All Doctors"} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {quickSymptomChips.map((chip) => (
                <Link
                  key={chip.key}
                  to={`/doctors?q=${encodeURIComponent(chip.key)}`}
                  className="ss-sapphire-card min-h-14 p-4 rounded-2xl hover:border-sky-400/60 flex items-center justify-between transition text-white"
                >
                  <span className="font-semibold text-sm">{locale === "bn" ? chip.bn : chip.en}</span>
                  <ArrowRight className="w-4 h-4 text-[#38bdf8] shrink-0" />
                </Link>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5" data-testid="home-doctors-grid">
            {doctors.map((doc) => (
              <article
                key={doc.id}
                className="ss-sapphire-card rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-sky-400/60 transition text-white"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-lg">
                        {locale === "bn" && doc.display_name_bn ? doc.display_name_bn : doc.display_name}
                      </h3>
                      <p className="text-xs font-semibold text-sky-300">{doc.degrees}</p>
                    </div>
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                        doc.is_online_now
                          ? "bg-teal-400/15 text-teal-300 border border-teal-400/30"
                          : "bg-white/10 text-slate-300"
                      }`}
                    >
                      {doc.is_online_now ? (locale === "bn" ? "অনলাইন" : "Online Now") : (locale === "bn" ? "নির্ধারিত" : "Scheduled")}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300">{doc.specialty} • {doc.district}</p>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-white/10">
                    <span className="text-slate-300">{doc.experience_years} {locale === "bn" ? "বছরের অভিজ্ঞতা" : "yrs exp"}</span>
                    <span className="font-mono font-bold text-sm text-[#f2c879]">
                      {formatBdtFromPoisha(doc.consultation_fee_minor_poisha, locale)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-300">
                    {doc.open_slots_count} {locale === "bn" ? "টি স্লট খালি" : "open slots"}
                  </span>
                  <Link
                    to={`/doctors/${doc.id}`}
                    className="min-h-11 px-4 rounded-xl bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 text-sm font-bold inline-flex items-center gap-1.5"
                  >
                    {locale === "bn" ? "স্লট ও বুকিং" : "Book Slot"} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* =================================================================
          SECTION 05 · 4-LAYER ROLE ARCHITECTURE & DEVICE PREVIEW
          ================================================================= */}
      <section id="care-twin" className="py-16 px-4 sm:px-6 border-b border-sky-400/20">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-[#38bdf8] mb-1">
                05 • ANATOMY OF THE 4-ROLE CARE OS
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                {locale === "bn" ? "রোগী, চিকিৎসক, সাপোর্ট ও অ্যাডমিন স্তরসমূহ" : "Anatomy of a Strict 4-Role Clinical Architecture"}
              </h2>
            </div>
            <Link to="/consultations" className="min-h-11 px-4 rounded-xl border border-sky-400/35 bg-sky-400/10 text-sky-200 text-sm font-semibold inline-flex items-center gap-2">
              <Video className="w-4 h-4 text-[#38bdf8]" />
              {locale === "bn" ? "ভিডিও ডিভাইস প্রিভিউ" : "Open Consultation Demo"}
            </Link>
          </div>

          <div className="flex flex-wrap gap-2">
            {archLayers.map((layer, idx) => (
              <button
                key={layer.badge}
                type="button"
                onClick={() => setActiveArchLayer(idx)}
                className={`min-h-11 px-4 rounded-full text-xs font-semibold border transition cursor-pointer ${
                  activeArchLayer === idx
                    ? "bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 border-transparent font-bold shadow"
                    : "bg-white/5 border-white/15 text-slate-200 hover:bg-white/10"
                }`}
              >
                {locale === "bn" ? layer.titleBn : layer.titleEn}
              </button>
            ))}
          </div>

          <div className="ss-sapphire-card rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-2xl">
              <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-sky-400/15 text-sky-300 border border-sky-400/30">
                {archLayers[activeArchLayer].badge}
              </span>
              <h3 className="text-xl font-bold text-white">
                {locale === "bn" ? archLayers[activeArchLayer].titleBn : archLayers[activeArchLayer].titleEn}
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {locale === "bn" ? archLayers[activeArchLayer].descBn : archLayers[activeArchLayer].descEn}
              </p>
            </div>
            <Link
              to={archLayers[activeArchLayer].ctaPath}
              className="min-h-12 px-6 rounded-full bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 font-bold text-sm inline-flex items-center gap-2 shrink-0"
            >
              {locale === "bn" ? "পোর্টাল খুলুন" : "Inspect Portal"} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* =================================================================
          SECTION 06 · CLINICAL SAFETY CHALLENGES & AUDITED M1–M6 BENCHMARKS
          ================================================================= */}
      <section id="challenge" className="py-16 px-4 sm:px-6 border-b border-sky-400/20">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="space-y-6">
            <div>
              <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-[#38bdf8] mb-1">
                06 • FAIL-CLOSED HEALTHCARE SAFETY &amp; RESEARCH BENCHMARKS
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                {locale === "bn" ? "সার্ভার নিরাপত্তা গার্ড ও নিরীক্ষিত গবেষণা" : "Fail-Closed Safety Barriers & Audited M1–M6 Models"}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="ss-sapphire-card rounded-2xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <ScanText className="w-6 h-6 text-[#f2c879]" />
                  <TrustBadge kind="HUMAN_VERIFIED" />
                </div>
                <h3 className="text-lg font-bold text-white">Prescription OCR Safety Lock</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Uncertain automated OCR reads can misread dosages. ShasthoSetu rejects schedule activation with HTTP 422 UNVERIFIED_OCR_FIELDS until a human verifies every critical item.
                </p>
                <Link to="/features/prescription-ocr" className="text-xs font-semibold text-sky-300 hover:underline inline-flex items-center gap-1">
                  Open Safe OCR Feature <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="ss-sapphire-card rounded-2xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <CalendarClock className="w-6 h-6 text-[#38bdf8]" />
                  <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-sky-400/15 text-sky-300 border border-sky-400/30 font-bold">
                    BEGIN IMMEDIATE
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">Zero Concurrent Double-Booking</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  ThreadPool races on a single-capacity slot yield strictly [201, 409] via SQLite WAL transaction locking plus interval-overlap triggers (`ISS-006` resolved).
                </p>
                <Link to="/doctors" className="text-xs font-semibold text-sky-300 hover:underline inline-flex items-center gap-1">
                  Inspect Live Slots <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="ss-sapphire-card rounded-2xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <FileLock2 className="w-6 h-6 text-[#2dd4bf]" />
                  <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-teal-400/15 text-teal-300 border border-teal-400/30 font-bold">
                    ZERO-PHI 403
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">Support &amp; Admin Clinical Privacy</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Support ticket SQL projections exclude diagnoses, symptoms, and e-Rx columns; Admin Governance APIs redact private doctor prose with audited HTTP 403 responses.
                </p>
                <Link to="/support/dashboard" className="text-xs font-semibold text-sky-300 hover:underline inline-flex items-center gap-1">
                  Inspect Zero-PHI Desk <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          <div id="science" className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-[#818cf8]" />
                  {locale === "bn" ? "নিরীক্ষিত ৬টি এআই গবেষণা মডিউল (নন-ডায়াগনস্টিক)" : "Audited 6-Track ML Showcase (FINAL_LOCK)"}
                </h3>
              </div>
              <Link to="/research" className="min-h-11 px-5 rounded-full bg-[#818cf8] text-slate-950 font-bold text-xs inline-flex items-center gap-2">
                {locale === "bn" ? "সম্পূর্ণ গবেষণা রিপোর্ট" : "Open Research Lab"} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {datasets.map((ds) => (
                <div key={ds.module} className="ss-sapphire-card rounded-2xl p-5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-white">{ds.module}</span>
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#818cf8]/20 text-[#c7d2fe] font-bold">
                      {ds.scientific_classification}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{ds.dataset_or_scope}</p>
                  <div className="text-xs font-mono font-bold text-sky-300">Reconciled: {ds.reconciled_count}</div>
                  <p className="text-xs text-slate-400 border-t border-white/10 pt-2">
                    {ds.limitations}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================
          SECTION 07 · BY THE NUMBERS (AGRISENSE SVG DONUT + PROGRESS CARDS)
          ================================================================= */}
      <section id="impact" className="py-16 px-4 sm:px-6 border-b border-sky-400/20">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-[#38bdf8] mb-1">
              07 • EMPIRICAL RIGOR &amp; VERIFIED TELEMETRY
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              {locale === "bn" ? "পরিসংখ্যান ও অডিটকৃত ফলাফল" : "By the Numbers: Audited Metrics & Engineering Parity"}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {impactMetrics.map((m) => (
              <div key={m.label} className="ss-sapphire-card rounded-2xl p-5 space-y-3 text-white">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-mono text-[11px] font-bold tracking-wider" style={{ color: m.color }}>
                      {m.label}
                    </div>
                    <div className="font-mono text-2xl sm:text-3xl font-bold mt-1">{m.value}</div>
                  </div>
                  <DonutGaugeSvg pct={m.pct} centerLabel={m.value} subLabel={m.sub} color={m.color} />
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: m.color }} />
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =================================================================
          SECTION 08 · INTERACTIVE SERVICES HUD & BILINGUAL FAQ
          ================================================================= */}
      <section id="preview" className="py-16 px-4 sm:px-6 border-b border-sky-400/20 space-y-12">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-[#38bdf8] mb-1">
                08 • INTERACTIVE SERVICES &amp; CARE HUD
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                {locale === "bn" ? "ল্যাব টেস্ট, পারিবারিক প্যাকেজ ও নিরাপদ ক্লিনিক্যাল মডিউল" : "DocTime-Inspired Diagnostics, Family Plans & Care Trackers"}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["labs", locale === "bn" ? "ল্যাব টেস্ট" : "Diagnostic Labs"],
                  ["plans", locale === "bn" ? "স্বাস্থ্য প্যাকেজ" : "Family Plans"],
                  ["ocr", locale === "bn" ? "OCR ভল্ট" : "OCR Safety"],
                  ["triage", locale === "bn" ? "শিশু ও পিসিওএস" : "Pediatric & PCOS"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveHudTab(key)}
                  className={`min-h-11 px-4 rounded-full text-xs font-semibold border cursor-pointer transition ${
                    activeHudTab === key
                      ? "bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 border-transparent font-bold"
                      : "bg-white/5 border-white/15 text-slate-200 hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {activeHudTab === "labs" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(services?.diagnostic_tests || []).map((test) => (
                <div key={test.id} className="ss-sapphire-card rounded-2xl p-5 space-y-2 text-white">
                  <div className="flex justify-between text-xs font-mono text-teal-300">
                    <span>{test.code}</span>
                    <span>{test.turnaround_hours}h</span>
                  </div>
                  <h3 className="font-bold text-base">{locale === "bn" ? test.name_bn : test.name_en}</h3>
                  <p className="text-xs text-slate-300">{test.category} • {test.sample_type}</p>
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-[#f2c879]">{formatBdtFromPoisha(test.fee_minor_poisha, locale)}</span>
                    <Link to="/patient/diagnostics" className="text-xs font-semibold text-sky-300 hover:underline">
                      Order (Demo) →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeHudTab === "plans" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(services?.healthcare_plans || []).map((plan) => (
                <div key={plan.id} className="ss-sapphire-card rounded-2xl p-6 flex items-center justify-between gap-4 text-white">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-300">
                      <HeartPulse className="w-4 h-4" /> DEMO FAMILY PLAN
                    </div>
                    <h3 className="font-bold text-lg">{locale === "bn" ? plan.name_bn : plan.name_en}</h3>
                    <p className="text-xs text-slate-300">{locale === "bn" ? plan.description_bn : plan.description_en}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-xl text-[#f2c879]">{formatBdtFromPoisha(plan.monthly_fee_minor_poisha, locale)}/mo</div>
                    <div className="text-xs text-slate-300">Up to {plan.max_family_members} profiles</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeHudTab === "ocr" && (
            <div className="ss-sapphire-card rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-white">
              <div className="space-y-1.5">
                <TrustBadge kind="HUMAN_VERIFIED" />
                <h3 className="text-xl font-bold">Human-Verified Prescription OCR Pipeline</h3>
                <p className="text-sm text-slate-300 max-w-2xl">
                  Draft OCR entries remain blocked behind HTTP 422 UNVERIFIED_OCR_FIELDS until each medicine name, strength, and frequency is manually approved.
                </p>
              </div>
              <Link to="/features/prescription-ocr" className="min-h-11 px-5 rounded-full bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 font-bold text-sm inline-flex items-center gap-1.5">
                Inspect Safe OCR Page <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {activeHudTab === "triage" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="ss-sapphire-card rounded-2xl p-6 space-y-2 text-white">
                <Baby className="w-6 h-6 text-[#2dd4bf]" />
                <h3 className="font-bold text-lg">Pediatric Red-Flag Rules &amp; EPI Vaccines</h3>
                <p className="text-xs text-slate-300">Deterministic clinician rules highlight breathing distress, lethargy, or prolonged fever without speculative AI guesswork.</p>
                <Link to="/features/pediatric-rash" className="text-xs font-semibold text-sky-300 hover:underline inline-flex items-center gap-1">Open Pediatric &amp; Rash Page →</Link>
              </div>
              <div className="ss-sapphire-card rounded-2xl p-6 space-y-2 text-white">
                <Activity className="w-6 h-6 text-[#818cf8]" />
                <h3 className="font-bold text-lg">Women&apos;s Health &amp; PCOS Studio</h3>
                <p className="text-xs text-slate-300">Structured menstrual cycle &amp; symptom tracking isolated from non-diagnostic M01/M02 research previews.</p>
                <Link to="/features/pcos" className="text-xs font-semibold text-sky-300 hover:underline inline-flex items-center gap-1">Open PCOS Feature Page →</Link>
              </div>
            </div>
          )}
        </div>

        {/* Bilingual FAQ Accordion */}
        <div className="max-w-4xl mx-auto space-y-4">
          <h2 className="text-2xl font-bold text-center text-white">
            {locale === "bn" ? "সচরাচর জিজ্ঞাসিত প্রশ্ন (FAQ)" : "Frequently Asked Questions"}
          </h2>
          <div className="space-y-2.5">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="ss-sapphire-card rounded-2xl overflow-hidden text-white">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full min-h-12 px-5 py-3.5 text-left font-semibold text-sm flex items-center justify-between gap-3 cursor-pointer hover:bg-white/5"
                  >
                    <span>{locale === "bn" ? faq.qBn : faq.qEn}</span>
                    <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-sm text-slate-300 leading-relaxed border-t border-white/10 pt-3">
                      {locale === "bn" ? faq.aBn : faq.aEn}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =================================================================
          SECTION 09 · FINAL CONVERSION CTA
          ================================================================= */}
      <section id="final-cta" className="py-16 px-4 sm:px-6 text-white">
        <div className="max-w-6xl mx-auto ss-sapphire-card rounded-3xl p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-sky-300 uppercase tracking-widest">
              <Sparkles className="w-4 h-4" /> READY TO EXPLORE
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Stethoscope className="w-6 h-6 text-teal-300" />
              {locale === "bn" ? "৪টি রোল পোর্টাল লাইভ পরীক্ষা করতে প্রস্তুত?" : "Ready to Test All 4 Live SQLite Clinical Portals?"}
            </h2>
            <p className="text-sm text-slate-300">
              {locale === "bn"
                ? "রোগী, ডাক্তার, সাপোর্ট বা অ্যাডমিন অ্যাকাউন্ট দিয়ে সাইন ইন করুন অথবা নতুন রোগী হিসেবে নিবন্ধন করুন।"
                : "Sign in with synthetic demo accounts or register a fresh Patient or Doctor application right now."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link to="/login" className="min-h-12 px-6 rounded-full bg-gradient-to-r from-sky-400 to-teal-400 text-slate-950 font-bold text-sm inline-flex items-center gap-2 hover:from-sky-300 hover:to-teal-300 shadow-lg">
              {t("publicSite.nav.login")} <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/doctor-apply" className="min-h-12 px-6 rounded-full border border-white/25 bg-white/5 hover:bg-white/10 text-white font-semibold text-sm inline-flex items-center">
              {t("auth.doctorApplyLink")}
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
