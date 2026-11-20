import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Baby,
  BookOpen,
  CalendarClock,
  CalendarHeart,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Database,
  Droplet,
  FileLock2,
  FlaskConical,
  HeartPulse,
  Lock,
  Pause,
  Play,
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
import { PublicFloatingHeader } from "../components/layout/PublicFloatingHeader";
import { PublicFooter } from "../components/layout/PublicFooter";
import { DepartmentSectorGrid } from "../components/doctors/DepartmentSectorGrid";
import { HERO_DOCTOR_SLIDES } from "../components/home/HeroDoctorShowcase";
import {
  DigitalObservatoryDeck,
  InteractiveBarGraph,
  type TelemetryDeckCard,
} from "../components/charts/AgriStyleTelemetry";
import {
  AnimatedClinicalPipeline,
  CohortWaffleMatrixChart,
  HexRadarTaxonomyChart,
  PCOS_DIAL_PRESETS,
  PCOS_SPARKLINE_ITEMS,
  SemiCircleRiskDial,
  SparklineKpiStrip,
  UncertaintyTrendCurveChart,
} from "../components/charts/VariedClinicalVisuals";
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
  dataset_name?: string;
  dataset_or_scope?: string;
  total_units_raw?: string | number;
  total_independent_groups?: string | number;
  grouping_level?: string;
  admissible_units?: string | number;
  quarantined_units?: string | number;
  cross_split_leakage_detected?: string | boolean;
  reconciliation_notes?: string;
  reconciled_count?: string;
  scientific_classification?: string;
  limitations?: string;
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
  "SQLITE 3 WAL • 54 TABLES",
  "BLOOD CONNECT • 5/10/20 KM PRIVACY MATCHING",
  "LIVE BANGLA VOICE AI • WHISPER-BN + QWEN2.5 RAG",
  "HEALTH JOURNAL • স্বাস্থ্যবার্তা",
  "ARGON2ID + HTTPONLY SESSION",
  "ZERO-PHI SUPPORT GUARD (403)",
  "SAFE-OCR VERIFICATION (422)",
  "ATOMIC SLOT LOCK (BEGIN IMMEDIATE)",
  "PCOS M01/M02 AUDITED BENCHMARK",
  "MCVSLD 755-FAMILY LEAK-FREE SPLIT",
  "DERMOPED 22-PATIENT VERIFIED",
  "WATERMARKED DEMO RECEIPTS",
];

/** Full-bleed dark sapphire photographic backdrop with smooth edge blends for vertical scroll chapters. */
function ChapterBackdrop({ src, position = "center" }: { src: string; position?: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none">
      <img
        src={src}
        alt=""
        loading="lazy"
        className="w-full h-full object-cover scale-[1.02]"
        style={{
          objectPosition: position,
          opacity: 0.48,
          filter: "saturate(1.16) brightness(0.96) contrast(1.06)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(105deg, rgba(4,9,20,0.72) 0%, rgba(4,9,20,0.44) 52%, rgba(4,9,20,0.58) 100%), linear-gradient(180deg, rgba(4,9,20,0.78) 0%, rgba(4,9,20,0.14) 22%, rgba(4,9,20,0.14) 78%, rgba(4,9,20,0.82) 100%)",
        }}
      />
    </div>
  );
}

export function PublicHomePage() {
  const { locale, t } = useI18n();
  const { motionPaused } = usePreferences();
  const navigate = useNavigate();

  const [activeLayer, setActiveLayer] = useState(0);
  const [heroSlideIdx, setHeroSlideIdx] = useState(0);
  const [heroSlidePaused, setHeroSlidePaused] = useState(false);
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
    if (motionPaused || heroSlidePaused) return;
    const id = window.setInterval(() => {
      setHeroSlideIdx((prev) => (prev + 1) % HERO_DOCTOR_SLIDES.length);
    }, 5500);
    return () => clearInterval(id);
  }, [motionPaused, heroSlidePaused]);

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
      descBn: "স্বয়ং ও শিশু-নির্ভরশীল প্রোফাইল, অ্যাটমিক বুকিং, ShasthoPay MFS / কার্ড ডেমো রসিদ ও মানব-যাচাইকৃত OCR।",
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

  const observatoryCards = useMemo<TelemetryDeckCard[]>(
    () => [
      {
        id: "pcos-m01",
        tag: "M01 PCOS CLINICAL",
        value: "94.44%",
        sub: "17/18 Held-Out • 88.57% CV",
        accent: "#38bdf8",
        icon: CalendarHeart,
        pieCenter: "94.4%",
        pieSub: "BAL",
        pieSegments: [
          { label: "Held-out Balanced Acc", pct: 94.44, color: "#38bdf8" },
          { label: "Uncertainty Margin", pct: 5.56, color: "#0e1d38" },
        ],
        barSegments: [
          { label: "5-Fold CV", pct: 88.57, color: "#38bdf8" },
          { label: "Test Lift", pct: 5.87, color: "#2dd4bf" },
        ],
        barFootnote: "N=88 clinical profiles • M02 Ultrasound 86.67% kept strictly separate",
      },
      {
        id: "rash-m03",
        tag: "M03 VIRAL RASH",
        value: "84.65%",
        sub: "755-Family Leak-Free Split",
        accent: "#818cf8",
        icon: Sparkles,
        pieCenter: "84.7%",
        pieSub: "VAL",
        pieSegments: [
          { label: "Val Image Acc", pct: 84.65, color: "#818cf8" },
          { label: "Residual", pct: 15.35, color: "#0e1d38" },
        ],
        barSegments: [
          { label: "Train Families (528)", pct: 70, color: "#818cf8" },
          { label: "Val (113)", pct: 15, color: "#38bdf8" },
          { label: "Test (114)", pct: 15, color: "#2dd4bf" },
        ],
        barFootnote: "0% cross-split family leakage • 84.22% Macro F1",
      },
      {
        id: "ocr-m04",
        tag: "M04 SAFE OCR GATE",
        value: "1,000",
        sub: "992 Admissible • 8 Quarantined",
        accent: "#f2c879",
        icon: ScanText,
        pieCenter: "99.2%",
        pieSub: "ADMIT",
        pieSegments: [
          { label: "Admissible Rows", pct: 99.2, color: "#f2c879" },
          { label: "Quarantined (8)", pct: 0.8, color: "#fb7185" },
        ],
        barSegments: [
          { label: "Train (697)", pct: 69.7, color: "#f2c879" },
          { label: "Val (150)", pct: 15.0, color: "#38bdf8" },
          { label: "Test (152)", pct: 15.3, color: "#2dd4bf" },
        ],
        barFootnote: "HTTP 422 mandatory human lock on all unverified Rx dosages",
      },
      {
        id: "derm-m06",
        tag: "M06 DERMOPED + VOICE",
        value: "92.73%",
        sub: "22 Patients • 98.37% BN Script",
        accent: "#2dd4bf",
        icon: Baby,
        pieCenter: "92.7%",
        pieSub: "TEST",
        pieSegments: [
          { label: "DermoPed EXP_B Test", pct: 92.73, color: "#2dd4bf" },
          { label: "Remainder", pct: 7.27, color: "#0e1d38" },
        ],
        barSegments: [
          { label: "Chickenpox (19 pts)", pct: 86.4, color: "#2dd4bf" },
          { label: "Pediculosis (3 pts)", pct: 13.6, color: "#fbbf24" },
        ],
        barFootnote: "M05 FLEURS BN Unicode 98.37% • Live Whisper-BN + Qwen2.5 RAG + MMS-TTS",
      },
    ],
    []
  );

  const auditedTrackGraphItems = useMemo(
    () => [
      {
        label: "M01 • PCOS Clinical XGBoost",
        value: 94.44,
        maxValue: 100,
        displayValue: "94.44% Held-Out (88.57% CV)",
        sublabel: "N=88 Cohort",
        color: "#38bdf8",
      },
      {
        label: "M06 • DermoPed Pediatric EXP_B",
        value: 92.73,
        maxValue: 100,
        displayValue: "92.73% Test Image Acc",
        sublabel: "22 Patients",
        color: "#34d399",
      },
      {
        label: "M02 • PCOS Ultrasound ResNet18",
        value: 86.67,
        maxValue: 100,
        displayValue: "86.67% Test (39/45)",
        sublabel: "299 Unique Scans",
        color: "#2dd4bf",
      },
      {
        label: "M03 • Viral Rash Grouped ResNet18",
        value: 84.65,
        maxValue: 100,
        displayValue: "84.65% Val Acc (84.22% F1)",
        sublabel: "755 Families • 0% Leak",
        color: "#818cf8",
      },
      {
        label: "M04 • Safe Prescription OCR Admission",
        value: 99.2,
        maxValue: 100,
        displayValue: "99.20% Admissible (992/1,000)",
        sublabel: "HTTP 422 Human Gate",
        color: "#f2c879",
      },
      {
        label: "M05 • Bangla Voice FLEURS Script Integrity (Live)",
        value: 98.37,
        maxValue: 100,
        displayValue: "98.37% BN Unicode (39.09% WER)",
        sublabel: "26 Clips • Live Voice RAG",
        color: "#c084fc",
      },
    ],
    []
  );

  const faqs = [
    {
      qBn: "স্বাস্থ্যসেতু এআই-এর পেমেন্ট সিস্টেম কি আসল টাকা কাটে?",
      qEn: "Are payments in ShasthoSetu AI real monetary charges?",
      aBn: "না। এই প্ল্যাটফর্মের ShasthoPay MFS / কার্ড চেকআউট সম্পূর্ণ সিমুলেটেড (DEMO / SIMULATED)। এখানে কোনো আসল পিন, ওটিপি বা কার্ড নম্বর নেওয়া হয় না এবং প্রতিটি রসিদে স্পষ্ট ওয়াটারমার্ক থাকে।",
      aEn: "No. Every ShasthoPay / Card checkout is strictly SIMULATED / DEMO with zero PIN, OTP, CVV, or card storage and a watermarked simulation notice on every receipt.",
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
      qBn: "AI-01 চ্যাটবট এবং AI-02 বাংলা ভয়েস এআই কি এখন সক্রিয়?",
      qEn: "Are AI-01 Medical Chatbot/RAG and AI-02 Bangla Voice integration active?",
      aBn: "হ্যাঁ। AI-01 মেডিকেল চ্যাটবট/RAG (Qwen2.5:7b + bge-m3) এবং AI-02 বাংলা ভয়েস AI (Whisper-Small-BN + 3D অর্ব + MMS-TTS) এখন Health Services-এ লাইভ সক্রিয় রয়েছে।",
      aEn: "Yes. AI-01 Medical Chatbot/RAG (Qwen2.5:7b + bge-m3) and AI-02 Bangla Voice AI (Whisper-Small-BN + 3D Land-Guard Orb + MMS-TTS) are live inside Health Services alongside Blood Connect, Safe-OCR, and all 4 role portals.",
    },
  ];

  return (
    <div className="ss-sapphire-always min-h-screen overflow-x-clip">
      <PublicFloatingHeader transparentHero />

      {/* =================================================================
          SECTION 01 · FULL-VIEWPORT AGRISENSE-PROPORTION 3D HERO OVER FULL-BLEED DOCTOR SLIDES
          ================================================================= */}
      <section
        id="hero"
        data-testid="public-hero-section"
        className="relative min-h-screen pt-20 pb-8 px-4 sm:px-6 flex flex-col justify-center overflow-hidden text-white border-b border-sky-400/20"
      >
        {/* Full-Bleed Animated Clinical Doctor Photography Background (Back-to-Back Doctors Slide 1) */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          {HERO_DOCTOR_SLIDES.map((s, idx) => {
            const isActive = idx === heroSlideIdx;
            return (
              <img
                key={s.id}
                src={s.src}
                alt={locale === "bn" ? s.titleBn : s.titleEn}
                className="absolute inset-0 w-full h-full object-cover object-[center_22%] transition-all duration-[1400ms] ease-out"
                style={{
                  opacity: isActive ? 0.72 : 0,
                  transform: isActive && !motionPaused ? "scale(1.04)" : "scale(1)",
                }}
              />
            );
          })}
          {/* AgriSense Left-to-Right Directional Vignette keeping left typography & doctors crisp */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(4,9,20,0.94) 0%, rgba(4,9,20,0.72) 44%, rgba(4,9,20,0.28) 76%, rgba(4,9,20,0.52) 100%), linear-gradient(180deg, rgba(4,9,20,0.68) 0%, transparent 24%, rgba(4,9,20,0.92) 100%)",
            }}
          />
        </div>

        <div className="relative z-10 max-w-[1440px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-center py-6">
          {/* LEFT EDITORIAL COLUMN — Strict AgriSense Typography & 2-Pill CTA Cadence */}
          <div className="lg:col-span-6 min-w-0 max-w-[540px] space-y-5">
            <div className="flex items-center gap-3 text-[11px] font-mono tracking-[0.18em] uppercase text-slate-300">
              <span className="w-[26px] h-px bg-sky-400/75 shrink-0" />
              <span>{t("publicSite.hero.credibilityPill")}</span>
            </div>

            <h1
              className="font-bold tracking-[-0.025em]"
              style={{ fontSize: "clamp(2.3rem, 3.6vw, 3.55rem)", lineHeight: 1.07 }}
              data-testid="public-hero-heading"
            >
              <span className="block bg-gradient-to-b from-white via-sky-200 to-sky-400 bg-clip-text text-transparent">
                {t("publicSite.hero.headlineTop")}
              </span>
              <span className="block bg-gradient-to-b from-teal-100 via-teal-300 to-teal-500 bg-clip-text text-transparent">
                {t("publicSite.hero.headlineMid")}
              </span>
              <span
                className="block text-[#f2c879] mt-0.5"
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontStyle: "italic",
                  fontWeight: 500,
                }}
              >
                {t("publicSite.hero.headlineBottom")}
              </span>
            </h1>

            <p className="text-[15px] text-slate-200/90 max-w-[450px] leading-relaxed">
              {t("publicSite.hero.subtitle")}{" "}
              <strong className="text-sky-300 font-semibold">{activePhrase}</strong>
            </p>

            {/* Clean AgriSense 2-Pill Primary CTA Row + Quick Portal Sign In */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                to="/doctors"
                className="h-10 px-5 rounded-full bg-white text-slate-950 hover:bg-sky-50 font-semibold text-[13px] inline-flex items-center gap-2 shadow-[0_8px_24px_rgba(255,255,255,0.16)] transition"
              >
                {t("publicSite.hero.ctaPrimary")} <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#pcos-chapter"
                className="h-10 px-5 rounded-full bg-[#040a18]/75 hover:bg-white/15 border border-white/25 text-white text-[13px] font-medium inline-flex items-center gap-2 backdrop-blur-md transition"
              >
                {locale === "bn" ? "৫টি এআই অধ্যায় দেখুন" : "Explore AI Chapters"}
              </a>
              <Link
                to="/login"
                data-testid="hero-portal-login-btn"
                className="h-10 px-4 rounded-full border border-sky-400/30 bg-sky-400/10 hover:bg-sky-400/20 text-sky-200 text-xs font-semibold inline-flex items-center gap-1.5 backdrop-blur-md transition"
              >
                <Lock className="w-3.5 h-3.5" /> {t("publicSite.hero.ctaPortal")}
              </Link>
            </div>

            {/* Subtle Unobtrusive Background Photo Carousel Controls */}
            <div className="pt-3 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#040a18]/75 border border-white/15 backdrop-blur-md px-3 py-1.5 text-[11px] font-mono text-slate-200">
                <button
                  type="button"
                  aria-label="Previous clinician background"
                  onClick={() =>
                    setHeroSlideIdx((prev) => (prev - 1 + HERO_DOCTOR_SLIDES.length) % HERO_DOCTOR_SLIDES.length)
                  }
                  className="p-0.5 text-slate-300 hover:text-white cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={heroSlidePaused ? "Resume hero slideshow" : "Pause hero slideshow"}
                  onClick={() => setHeroSlidePaused((p) => !p)}
                  className="p-0.5 text-sky-300 hover:text-white cursor-pointer"
                >
                  {heroSlidePaused || motionPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  aria-label="Next clinician background"
                  onClick={() => setHeroSlideIdx((prev) => (prev + 1) % HERO_DOCTOR_SLIDES.length)}
                  className="p-0.5 text-slate-300 hover:text-white cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <span className="h-3 w-px bg-white/15" />
                <span className="text-sky-300 font-bold">
                  0{heroSlideIdx + 1}/0{HERO_DOCTOR_SLIDES.length}
                </span>
                <span className="hidden sm:inline text-slate-300 truncate max-w-[210px]">
                  {(HERO_DOCTOR_SLIDES[heroSlideIdx] ?? HERO_DOCTOR_SLIDES[0]).tag}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {HERO_DOCTOR_SLIDES.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-label={`Hero slide ${idx + 1}`}
                    onClick={() => setHeroSlideIdx(idx)}
                    className="h-1.5 rounded-full transition-all cursor-pointer"
                    style={{
                      width: idx === heroSlideIdx ? "22px" : "7px",
                      background: idx === heroSlideIdx ? s.accent : "rgba(255,255,255,0.28)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT FOREGROUND STAGE — Restored Transparent 3D Care Lattice + Slim 88px AgriSense Rail + Compact HUD */}
          <div className="lg:col-span-6 min-w-0 relative flex flex-col justify-between min-h-[380px] lg:min-h-[530px]">
            <div className="flex-1 flex items-center gap-2.5 min-w-0">
              {/* Transparent Foreground 3D Care Lattice floating cleanly over Rotating Doctor Photography */}
              <div className="flex-1 min-w-0 relative h-[340px] sm:h-[430px]">
                {mount3d ? (
                  <Suspense fallback={<StaticCareLatticeFallback activeLayer={activeLayer} reducedMotion={motionPaused} />}>
                    <LazyHeroCareLattice activeLayer={activeLayer} autoRotate={autoRotate} />
                  </Suspense>
                ) : (
                  <StaticCareLatticeFallback activeLayer={activeLayer} reducedMotion={motionPaused} />
                )}
              </div>

              {/* AgriSense Slim Far-Right Vertical Control Rail */}
              <aside
                aria-label="Hero Architecture Layer & Safety Mode Rail"
                className="hidden sm:flex flex-col gap-1 w-[92px] sm:w-[98px] shrink-0 rounded-2xl bg-[#071022]/85 border border-sky-400/25 backdrop-blur-xl p-2 shadow-2xl"
              >
                <span className="font-mono text-[8.5px] font-bold tracking-[0.14em] uppercase text-slate-400 text-center">
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
                      className={`py-1.5 px-1.5 rounded-lg text-left text-[10px] font-semibold leading-tight transition cursor-pointer ${
                        activeLayer === layer.id
                          ? "bg-gradient-to-r from-sky-400 to-teal-400 text-slate-950 font-bold shadow"
                          : "text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      {layer.label}
                    </button>
                  ))}
                </div>

                <div className="h-px bg-white/10 my-1" />
                <button
                  type="button"
                  onClick={() => setAutoRotate((r) => !r)}
                  className={`py-1.5 rounded text-[10px] font-mono font-bold border transition cursor-pointer ${
                    autoRotate
                      ? "bg-sky-400/20 border-sky-400/40 text-sky-300"
                      : "border-white/15 text-slate-400"
                  }`}
                >
                  Auto: {autoRotate ? "ON" : "OFF"}
                </button>
              </aside>
            </div>

            {/* Compact AgriSense-Sized Bottom-Right Telemetry HUD Card */}
            <div
              data-testid="hero-telemetry-card"
              className="ss-glow-card mt-2 max-w-[390px] w-full ml-auto rounded-2xl border border-sky-400/25 bg-[#071022]/82 backdrop-blur-xl p-3.5 shadow-2xl space-y-2"
            >
              <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                <span className="font-bold uppercase tracking-wider text-sky-300 inline-flex items-center gap-1.5 truncate">
                  <Radio className="w-3 h-3 shrink-0" />
                  Live 3D Care Twin • SQLite 37 Tables
                </span>
                <span className="px-2 py-0.5 rounded bg-teal-400/15 text-teal-300 border border-teal-400/30 font-bold shrink-0">
                  60 FPS
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-black/35 px-2 py-1.5 border border-white/5">
                  <div className="text-sm font-bold font-mono text-white">{overview.approved_doctors}</div>
                  <div className="text-[10px] text-slate-300 truncate">{t("publicSite.hero.telemetryDoctors")}</div>
                </div>
                <div className="rounded-lg bg-black/35 px-2 py-1.5 border border-white/5">
                  <div className="text-sm font-bold font-mono text-sky-300">{overview.open_slots}</div>
                  <div className="text-[10px] text-slate-300 truncate">{t("publicSite.hero.telemetrySlots")}</div>
                </div>
                <div className="rounded-lg bg-black/35 px-2 py-1.5 border border-white/5">
                  <div className="text-[11px] font-bold font-mono text-[#f2c879] pt-0.5 truncate">{currentLayer.metricValue}</div>
                  <div className="text-[10px] text-slate-300 truncate">{currentLayer.metricLabel}</div>
                </div>
              </div>

              <p className="text-[11px] text-slate-200/90 leading-snug">
                {locale === "bn" ? currentLayer.noteBn : currentLayer.noteEn}
              </p>

              {/* Mobile Layer Switcher */}
              <div className="flex sm:hidden gap-1.5 overflow-x-auto pt-1">
                {heroLayers.map((layer) => (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => setActiveLayer(layer.id)}
                    className={`min-h-9 px-3 rounded-full text-xs whitespace-nowrap cursor-pointer ${
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
          CHAPTER 01 (#pcos-chapter) · PCOS CLINICAL & ULTRASOUND AI
          ================================================================= */}
      <section
        id="pcos-chapter"
        className="relative min-h-[76vh] py-20 px-4 sm:px-6 flex items-center overflow-hidden border-b border-sky-400/20"
      >
        <ChapterBackdrop src="/images/backgrounds/bg-pcos-lab.jpg" />
        <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.2em] uppercase text-[#38bdf8]">
                <CalendarHeart className="w-4 h-4" /> CHAPTER 01 • PCOS AI (M01 + M02)
              </span>
              <TrustBadge kind="RESEARCH_ONLY" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
              {locale === "bn" ? (
                <>
                  পিসিওএস ক্লিনিকাল ও{" "}
                  <span className="bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] bg-clip-text text-transparent">
                    আল্ট্রাসাউন্ড গবেষণা অধ্যায়
                  </span>
                </>
              ) : (
                <>
                  PCOS Clinical &amp;{" "}
                  <span className="bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] bg-clip-text text-transparent">
                    Ovarian Ultrasound Studio
                  </span>
                </>
              )}
            </h2>
            <p className="text-sm sm:text-base text-slate-200/90 leading-relaxed">
              {locale === "bn"
                ? "রটারডাম মানদণ্ড অনুযায়ী ২০-ফিচার হরমোন প্রোফাইল (M01 XGBoost: ৯৪.৪৪% হেল্ড-আউট) এবং ২৯৯টি ডুপ্লিকেটমুক্ত আল্ট্রাসাউন্ড স্ক্যান (M02 ResNet18: ৮৬.৬৭%) সম্পূর্ণ পৃথকভাবে বিশ্লেষণ করা হয়েছে।"
                : "Keeps 20-feature clinical classification (M01 XGBoost • 94.44% balanced holdout, 88.57% CV) strictly separated from ovarian PCOM morphology ultrasound (M02 ResNet18 • 86.67% on 299 pHash-clustered scans)."}
            </p>
            <div className="flex flex-wrap gap-2.5 pt-1">
              <Link
                to="/features/pcos?tab=clinical"
                data-testid="home-goto-pcos"
                className="min-h-11 px-5 rounded-full bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-lg"
              >
                Open PCOS Clinical Workbench <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/features/pcos?tab=ultrasound"
                className="min-h-11 px-4 rounded-full border border-sky-400/35 bg-[#040a18]/75 hover:bg-white/10 text-sky-200 font-semibold text-xs inline-flex items-center gap-1.5"
              >
                Upload Ultrasound Scan
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <SemiCircleRiskDial presets={PCOS_DIAL_PRESETS} pauseMotion={motionPaused} />
            <SparklineKpiStrip items={PCOS_SPARKLINE_ITEMS} pauseMotion={motionPaused} />
          </div>
        </div>
      </section>

      {/* =================================================================
          CHAPTER 02 (#viral-rash-chapter) · VIRAL RASH GROUPED MCVSLD
          ================================================================= */}
      <section
        id="viral-rash-chapter"
        className="relative min-h-[76vh] py-20 px-4 sm:px-6 flex items-center overflow-hidden border-b border-sky-400/20"
      >
        <ChapterBackdrop src="/images/backgrounds/bg-viral-rash.jpg" />
        <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 order-2 lg:order-1">
            <HexRadarTaxonomyChart pauseMotion={motionPaused} />
          </div>

          <div className="lg:col-span-5 order-1 lg:order-2 space-y-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.2em] uppercase text-[#818cf8]">
                <Sparkles className="w-4 h-4" /> CHAPTER 02 • M03 VIRAL RASH AI
              </span>
              <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-400/15 text-indigo-200 border border-indigo-400/35">
                755-FAMILY LEAK-FREE SPLIT
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
              {locale === "bn" ? (
                <>
                  ভাইরাল র‍্যাশ ভিশন ও{" "}
                  <span className="bg-gradient-to-r from-[#818cf8] to-[#38bdf8] bg-clip-text text-transparent">
                    ৭৫৫-ফ্যামিলি লিকেজ-মুক্ত নিরীক্ষা
                  </span>
                </>
              ) : (
                <>
                  Viral Rash Vision &amp;{" "}
                  <span className="bg-gradient-to-r from-[#818cf8] to-[#38bdf8] bg-clip-text text-transparent">
                    6-Class Taxonomy Radar
                  </span>
                </>
              )}
            </h2>
            <p className="text-sm sm:text-base text-slate-200/90 leading-relaxed">
              {locale === "bn"
                ? "আগের ৯৯.১০% ডেটা-লিকেজ মডেলটি কোয়ারেন্টাইন করে ৭৫৫টি পৃথক ফ্যামিলি গ্রুপে বিভক্ত ResNet18 দ্বারা Chickenpox, Measles, HFMD, Cowpox, Monkeypox ও Healthy শ্রেণিতে গবেষণামূলক বিশ্লেষণ প্রদান করা হয়।"
                : "Quarantines legacy 99.10% leaked splits and evaluates skin scans across 6 viral skin classes using 755 source-grouped families (84.65% val accuracy, 84.22% macro F1, 0% overlap)."}
            </p>
            <div className="flex flex-wrap gap-2.5 pt-1">
              <Link
                to="/features/viral-rash"
                data-testid="home-goto-viral-rash"
                className="min-h-11 px-5 rounded-full bg-gradient-to-r from-[#818cf8] to-[#38bdf8] text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-lg"
              >
                Open Viral Rash Workbench <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/research#res-models"
                className="min-h-11 px-4 rounded-full border border-indigo-400/35 bg-[#040a18]/75 hover:bg-white/10 text-indigo-200 font-semibold text-xs inline-flex items-center gap-1.5"
              >
                Inspect Quarantine Audit
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================
          CHAPTER 03 (#ocr-chapter) · HUMAN-GATED PRESCRIPTION OCR
          ================================================================= */}
      <section
        id="ocr-chapter"
        className="relative min-h-[76vh] py-20 px-4 sm:px-6 flex items-center overflow-hidden border-b border-sky-400/20"
      >
        <ChapterBackdrop src="/images/backgrounds/bg-prescription-ocr.jpg" />
        <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.2em] uppercase text-[#f2c879]">
                <ScanText className="w-4 h-4" /> CHAPTER 03 • M04 SAFE OCR GATE
              </span>
              <TrustBadge kind="HUMAN_VERIFIED" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
              {locale === "bn" ? (
                <>
                  প্রেসক্রিপশন ওসিআর ও{" "}
                  <span className="bg-gradient-to-r from-[#f2c879] to-[#2dd4bf] bg-clip-text text-transparent">
                    HTTP 422 মানব-যাচাইকৃত পাইপলাইন
                  </span>
                </>
              ) : (
                <>
                  Prescription OCR &amp;{" "}
                  <span className="bg-gradient-to-r from-[#f2c879] to-[#2dd4bf] bg-clip-text text-transparent">
                    Human-Verified Med Pipeline
                  </span>
                </>
              )}
            </h2>
            <p className="text-sm sm:text-base text-slate-200/90 leading-relaxed">
              {locale === "bn"
                ? "বাস্তব EasyOCR (বাংলা+ইংরেজি) এবং pypdf স্ক্যানের পর রোগী প্রতিটি ওষুধের নাম ও মাত্রা যাচাই না করলে রিমাইন্ডার চালু হয় না (HTTP 422 নিরাপত্তা বাধা)।"
                : "Upload prescription photos or PDFs through EasyOCR (bn+en) and pypdf extraction. Server-side HTTP 422 UNVERIFIED_OCR_FIELDS locks out unverified schedules until a human confirms each item."}
            </p>
            <div className="flex flex-wrap gap-2.5 pt-1">
              <Link
                to="/features/prescription-ocr"
                data-testid="home-goto-ocr"
                className="min-h-11 px-5 rounded-full bg-gradient-to-r from-[#f2c879] to-[#2dd4bf] text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-lg"
              >
                Open Prescription OCR Lab <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/patient/ocr-review"
                className="min-h-11 px-4 rounded-full border border-[#f2c879]/40 bg-[#040a18]/75 hover:bg-white/10 text-[#f2c879] font-semibold text-xs inline-flex items-center gap-1.5"
              >
                SQLite OCR Queue
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7">
            <AnimatedClinicalPipeline pauseMotion={motionPaused} />
          </div>
        </div>
      </section>

      {/* =================================================================
          CHAPTER 04 (#voice-chapter) · LIVE BILINGUAL VOICE AI + RAG
          ================================================================= */}
      <section
        id="voice-chapter"
        className="relative min-h-[76vh] py-20 px-4 sm:px-6 flex items-center overflow-hidden border-b border-sky-400/20"
      >
        <ChapterBackdrop src="/images/backgrounds/bg-bangla-voice.jpg" />
        <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 order-2 lg:order-1">
            <UncertaintyTrendCurveChart pauseMotion={motionPaused} />
          </div>

          <div className="lg:col-span-5 order-1 lg:order-2 space-y-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.2em] uppercase text-purple-300">
                <Radio className="w-4 h-4" /> CHAPTER 04 • M05 BANGLA VOICE AI
              </span>
              <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-teal-400/15 text-teal-200 border border-teal-400/35">
                LIVE BILINGUAL VOICE AI • WHISPER-SMALL-BN + QWEN2.5 RAG
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
              {locale === "bn" ? (
                <>
                  বাংলা ভয়েস এআই ও{" "}
                  <span className="bg-gradient-to-r from-[#c084fc] to-[#38bdf8] bg-clip-text text-transparent">
                    লাইভ ৩ডি ভয়েস RAG স্টুডিও
                  </span>
                </>
              ) : (
                <>
                  Bangla &amp; English Voice AI &amp;{" "}
                  <span className="bg-gradient-to-r from-[#c084fc] to-[#38bdf8] bg-clip-text text-transparent">
                    3D Acoustic RAG Studio
                  </span>
                </>
              )}
            </h2>
            <p className="text-sm sm:text-base text-slate-200/90 leading-relaxed">
              {locale === "bn"
                ? "২৬টি মানব-কণ্ঠের FLEURS ক্লিপে Whisper-Small-BN দ্বারা ৯৮.৩৭% বাংলা ইউনিকোড ও ৩৯.০৯% Norm WER নিরীক্ষিত হয়েছে। এখন 3D Land-Guard ভয়েস অর্ব, Whisper ASR, Qwen2.5 মেডিকেল RAG ও MMS-TTS ভয়েস আউটপুট সহ লাইভ চালু রয়েছে।"
                : "Audited across 26 human FLEURS Bengali utterances (98.37% BN script purity, 39.09% norm WER vs 242.8% Whisper Base). Now live with interactive 3D Land-Guard Voice Orb, Whisper-Small-BN/EN ASR, Qwen2.5 medical RAG, and MMS-TTS voice synthesis."}
            </p>
            <div className="flex flex-wrap gap-2.5 pt-1">
              <Link
                to="/services?tool=bangla-voice"
                data-testid="home-goto-voice"
                className="min-h-11 px-5 rounded-full bg-gradient-to-r from-[#c084fc] to-[#38bdf8] text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-lg"
              >
                {locale === "bn" ? "লাইভ ভয়েস এআই স্টুডিও খুলুন" : "Open Live Voice AI Studio"} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/features/bangla-voice"
                className="min-h-11 px-4 rounded-full border border-white/25 bg-[#040a18]/75 hover:bg-white/10 text-slate-200 font-semibold text-xs inline-flex items-center gap-1.5"
              >
                {locale === "bn" ? "ভয়েস বেঞ্চমার্ক প্রমাণ" : "Voice Benchmark Proof"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================
          CHAPTER 05 (#dermoped-chapter) · DERMOPED & PEDIATRIC RED-FLAG TRIAGE
          ================================================================= */}
      <section
        id="dermoped-chapter"
        className="relative min-h-[76vh] py-20 px-4 sm:px-6 flex items-center overflow-hidden border-b border-sky-400/20"
      >
        <ChapterBackdrop src="/images/backgrounds/bg-pediatric-care.jpg" />
        <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.2em] uppercase text-[#34d399]">
                <Baby className="w-4 h-4" /> CHAPTER 05 • M06 DERMOPED &amp; PEDIATRIC
              </span>
              <TrustBadge kind="RESEARCH_ONLY" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
              {locale === "bn" ? (
                <>
                  ডার্মোপিড ও{" "}
                  <span className="bg-gradient-to-r from-[#34d399] to-[#38bdf8] bg-clip-text text-transparent">
                    ২২-রোগী কোহর্ট ওয়াফেল ম্যাট্রিক্স
                  </span>
                </>
              ) : (
                <>
                  DermoPed AI &amp;{" "}
                  <span className="bg-gradient-to-r from-[#34d399] to-[#38bdf8] bg-clip-text text-transparent">
                    Patient-Isolated Triage Lab
                  </span>
                </>
              )}
            </h2>
            <p className="text-sm sm:text-base text-slate-200/90 leading-relaxed">
              {locale === "bn"
                ? "২২ জন রোগীর (১৯ Chickenpox, ৩ Pediculosis) রোগী-বিচ্ছিন্ন EXP_B মডেলে ৯২.৭৩% ইমেজ অ্যাকিউরেসি অর্জিত হয়েছে। পাশাপাশি নিশ্চিত শিশু বিপদচিহ্ন ট্রায়াজ ও ইপিআই টিকা গাইড যুক্ত আছে।"
                : "Executes patient-isolated EXP_B ResNet18 predictions (92.73% test image accuracy) paired with explicit N=22 cohort disclosures and deterministic FR-PED-01..07 pediatric red-flag triage rules."}
            </p>
            <div className="flex flex-wrap gap-2.5 pt-1">
              <Link
                to="/features/pediatric-rash"
                data-testid="home-goto-pediatric"
                className="min-h-11 px-5 rounded-full bg-gradient-to-r from-[#34d399] to-[#38bdf8] text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-lg"
              >
                Open DermoPed &amp; Triage Page <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/patient/pediatric"
                className="min-h-11 px-4 rounded-full border border-emerald-400/35 bg-[#040a18]/75 hover:bg-white/10 text-emerald-200 font-semibold text-xs inline-flex items-center gap-1.5"
              >
                Child Portal &amp; EPI
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7">
            <CohortWaffleMatrixChart />
          </div>
        </div>
      </section>

      {/* =================================================================
          CHAPTER 06 (#blood-journal-chapter) · BLOOD CONNECT & HEALTH JOURNAL SPOTLIGHT
          ================================================================= */}
      <section
        id="blood-journal-chapter"
        className="relative min-h-[72vh] py-20 px-4 sm:px-6 flex items-center overflow-hidden border-b border-sky-400/20"
      >
        <ChapterBackdrop src="/images/backgrounds/bg-blood-connect.jpg" />
        <div className="relative z-10 max-w-7xl mx-auto w-full space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-rose-300">
                CHAPTER 06 • BLOOD CONNECT &amp; HEALTH JOURNAL
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
                {locale === "bn" ? (
                  <>
                    জরুরি{" "}
                    <span className="bg-gradient-to-r from-rose-300 via-[#38bdf8] to-[#2dd4bf] bg-clip-text text-transparent">
                      ব্লাড কানেক্ট ও স্বাস্থ্যবার্তা জার্নাল
                    </span>
                  </>
                ) : (
                  <>
                    Emergency{" "}
                    <span className="bg-gradient-to-r from-rose-300 via-[#38bdf8] to-[#2dd4bf] bg-clip-text text-transparent">
                      Blood Connect &amp; Health Journal
                    </span>
                  </>
                )}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-200/90 max-w-md">
              {locale === "bn"
                ? "৮টি বিভাগে গোপনীয়তা-সুরক্ষিত রক্তদাতা সমন্বয় এবং যাচাইকৃত বাংলা ও ইংরেজি জনস্বাস্থ্য প্রতিবেদন।"
                : "Consent-gated blood donor coordination across all 8 divisions paired with bilingual verified public health reporting."}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <article className="ss-sapphire-card rounded-3xl p-7 space-y-4 text-white flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-rose-300">
                    <Droplet className="w-4 h-4" /> BLOOD CONNECT • 5 / 10 / 20 KM
                  </span>
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-400/35 text-rose-200 font-bold">
                    HIDDEN_UNTIL_CONSENT
                  </span>
                </div>
                <h3 className="text-2xl font-bold">
                  {locale === "bn" ? "স্বাস্থ্যসেতু ব্লাড কানেক্ট নেটওয়ার্ক" : "ShasthoSetu Blood Connect Engine"}
                </h3>
                <p className="text-sm text-slate-200/90 leading-relaxed">
                  {locale === "bn"
                    ? "Haversine ৫/১০/২০ কিমি দূরত্ব ফিল্টার, হাসপাতাল-যাচাইকৃত জরুরি অনুরোধ, দ্বিমুখী রক্তদান নিশ্চিতকরণ এবং দাতার ফোন নম্বর সম্মতি ছাড়া গোপন রাখার নিরাপত্তা ব্যবস্থা।"
                    : "Real-time Haversine 5 / 10 / 20 km donor radius matching across 8 Bangladesh divisions, hospital-verified emergency requests, dual confirmation, masked phone sharing until explicit consent, and no fixed 90-day cutoff rule."}
                </p>
                <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                  <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-rose-200">
                    Masked Phone Privacy
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-sky-200">
                    Hospital Cross-Match Guard
                  </span>
                </div>
              </div>
              <div className="pt-2">
                <Link
                  to="/blood-connect"
                  data-testid="home-goto-blood-connect"
                  className="min-h-11 px-5 rounded-full bg-gradient-to-r from-rose-400 to-[#38bdf8] text-slate-950 font-bold text-xs inline-flex items-center gap-2 shadow-lg"
                >
                  {locale === "bn" ? "ব্লাড কানেক্ট খুলুন" : "Open Blood Connect"} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </article>

            <article className="ss-sapphire-card rounded-3xl p-7 space-y-4 text-white flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-[#2dd4bf]">
                    <BookOpen className="w-4 h-4" /> HEALTH JOURNAL • স্বাস্থ্যবার্তা
                  </span>
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-teal-400/15 border border-teal-400/35 text-teal-200 font-bold">
                    BN + EN EDITORIAL
                  </span>
                </div>
                <h3 className="text-2xl font-bold">
                  {locale === "bn" ? "জনস্বাস্থ্য ও ক্লিনিক্যাল গবেষণা বার্তা" : "Medical News, Research Notes & Prevention"}
                </h3>
                <p className="text-sm text-slate-200/90 leading-relaxed">
                  {locale === "bn"
                    ? "ডেঙ্গু সতর্কতা, পিসিওএস সচেতনতা, নিরাপদ প্রেসক্রিপশন OCR ও শিশু চর্মরোগ সম্পর্কে বাংলা এবং ইংরেজিতে যাচাইকৃত চিকিৎসাবিজ্ঞান প্রতিবেদন।"
                    : "Verified bilingual medical articles, dengue alerts, PCOS cycle literacy, safe prescription practices, and model validation briefings written cleanly for patients and judges."}
                </p>
                <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                  <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-teal-200">
                    Public Health Guides
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[#f2c879]">
                    Model Transparency Updates
                  </span>
                </div>
              </div>
              <div className="pt-2">
                <Link
                  to="/journal"
                  data-testid="home-goto-journal"
                  className="min-h-11 px-5 rounded-full bg-gradient-to-r from-[#2dd4bf] to-[#38bdf8] text-slate-950 font-bold text-xs inline-flex items-center gap-2 shadow-lg"
                >
                  {locale === "bn" ? "স্বাস্থ্যবার্তা পড়ুন" : "Read Health Journal"} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* =================================================================
          SECTION 08 · INTERACTIVE BANGLADESH HEALTHCARE ATLAS & MAP
          ================================================================= */}
      <section id="care-map" className="relative overflow-hidden py-16 px-4 sm:px-6 border-b border-sky-400/20">
        <ChapterBackdrop src="/images/backgrounds/dhaka-aerial-map-bg.jpg" />
        <div className="relative z-10 max-w-7xl mx-auto space-y-5">
          <div>
            <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-[#38bdf8] mb-1">
              08 • NATIONAL HOSPITAL &amp; CARE FINDER ATLAS
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              {locale === "bn" ? "বাংলাদেশ হাসপাতাল, ফার্মেসি ও ব্লাড ব্যাংক মানচিত্র" : "Bangladesh Clinical Atlas & Proximity Network"}
            </h2>
          </div>
          <BangladeshCareMap
            compact
            facilities={services?.facilities || []}
            doctors={doctors}
          />
        </div>
      </section>

      {/* =================================================================
          SECTION 09 · VERIFIED CLINICIAN DIRECTORY & INSTANT SYMPTOM SEARCH
          ================================================================= */}
      <section id="journey" className="relative overflow-hidden py-16 px-4 sm:px-6 border-b border-sky-400/20">
        <ChapterBackdrop src="/images/backgrounds/bg-doctors-consult.jpg" position="center top" />
        <div className="relative z-10 max-w-7xl mx-auto space-y-10">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-[#38bdf8] mb-1">
                  09 • CLINICAL DEPARTMENTS &amp; SYMPTOM SEARCH
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  {locale === "bn" ? "ক্লিনিক্যাল বিভাগ ও উপসর্গ অনুযায়ী ডাক্তার খুঁজুন" : "Clinical Departments & Instant Symptom Filter"}
                </h2>
              </div>
              <Link to="/find-care" className="min-h-11 inline-flex items-center gap-1.5 text-sm font-semibold text-[#38bdf8] hover:underline">
                {locale === "bn" ? "স্বাস্থ্যসেবা ও চিকিৎসক খুঁজুন" : "Browse All Doctors & Care"} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <form onSubmit={handleQuickSearch} className="flex flex-col sm:flex-row gap-2.5 max-w-2xl">
              <div className="flex-1 flex items-center gap-2 rounded-full bg-white/10 border border-sky-400/30 backdrop-blur-md px-4 min-h-12">
                <Search className="w-4 h-4 text-sky-300 shrink-0" />
                <input
                  type="text"
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                  placeholder={
                    locale === "bn"
                      ? "উপসর্গ বা ডিপার্টমেন্ট লিখুন (যেমন: PCOS, জ্বর, চর্মরোগ)..."
                      : "Search specialty or symptom (PCOS, fever, rash)..."
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

          <div data-testid="home-doctors-grid" className="pt-2">
            <DepartmentSectorGrid
              doctors={doctors}
              locale={locale}
              showAllButton
              onSelectSector={(key) => navigate(`/find-care?specialty=${encodeURIComponent(key)}`)}
              onToggleShowAll={() => navigate("/find-care?showAll=1")}
            />
          </div>
        </div>
      </section>

      {/* =================================================================
          SECTION 10 · 4-LAYER ROLE ARCHITECTURE & DEVICE PREVIEW
          ================================================================= */}
      <section id="care-twin" className="relative overflow-hidden py-16 px-4 sm:px-6 border-b border-sky-400/20">
        <ChapterBackdrop src="/images/hero/hero-doctors-team-care.jpg" position="center 20%" />
        <div className="relative z-10 max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-[#38bdf8] mb-1">
                10 • ANATOMY OF THE 4-ROLE CARE OS
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                {locale === "bn" ? "রোগী, চিকিৎসক, সাপোর্ট ও অ্যাডমিন স্তরসমূহ" : "Anatomy of a Strict 4-Role Clinical Architecture"}
              </h2>
            </div>
            <Link to="/services#section-consultations" className="min-h-11 px-4 rounded-xl border border-sky-400/35 bg-sky-400/10 text-sky-200 text-sm font-semibold inline-flex items-center gap-2">
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
          SECTION 11 · CLINICAL SAFETY CHALLENGES & AUDITED M1–M6 BENCHMARKS
          ================================================================= */}
      <section id="challenge" className="relative overflow-hidden py-16 px-4 sm:px-6 border-b border-sky-400/20">
        <ChapterBackdrop src="/images/backgrounds/bg-ai-research.jpg" />
        <div className="relative z-10 max-w-7xl mx-auto space-y-12">
          <div className="space-y-6">
            <div>
              <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-[#38bdf8] mb-1">
                11 • FAIL-CLOSED HEALTHCARE SAFETY &amp; RESEARCH BENCHMARKS
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
              {datasets.map((ds) => {
                const leakFree = String(ds.cross_split_leakage_detected).toLowerCase() === "false";
                const rawUnits = ds.total_units_raw ?? ds.reconciled_count ?? "Verified";
                const admitted = ds.admissible_units ?? ds.reconciled_count ?? "Verified";
                const quarantined = ds.quarantined_units ?? "0";
                return (
                  <div key={ds.module} className="ss-sapphire-card rounded-2xl p-5 flex flex-col justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-sm text-white inline-flex items-center gap-1.5">
                          <Database className="w-4 h-4 text-[#38bdf8] shrink-0" />
                          <span>{ds.module}</span>
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold shrink-0 border inline-flex items-center gap-1 ${
                            leakFree
                              ? "bg-emerald-500/15 border-emerald-400/35 text-emerald-200"
                              : "bg-indigo-400/20 border-indigo-400/35 text-indigo-200"
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          {leakFree ? "0% LEAK VERIFIED" : ds.scientific_classification || "AUDIT CHECK"}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-sky-200">
                        {ds.dataset_name || ds.dataset_or_scope || ds.module}
                      </p>
                      <div className="rounded-xl bg-[#040a18]/80 border border-white/10 p-2.5 space-y-1 font-mono text-[11px]">
                        <div className="text-emerald-300 font-bold">
                          Admissible: {admitted} / {rawUnits}
                        </div>
                        <div className="text-[#f2c879] text-[10px]">
                          Quarantined: {quarantined}
                          {ds.total_independent_groups ? ` • ${ds.total_independent_groups} groups` : ""}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 border-t border-white/10 pt-2 leading-relaxed">
                      {ds.reconciliation_notes || ds.limitations}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================
          SECTION 12 · BY THE NUMBERS (AGRISENSE 60FPS DIGITAL DATA & GRAPH SYSTEM)
          ================================================================= */}
      <section id="impact" className="relative overflow-hidden py-16 px-4 sm:px-6 border-b border-sky-400/20">
        <ChapterBackdrop src="/images/backgrounds/bg-observatory-lab.jpg" />
        <div className="relative z-10 max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-[#38bdf8] mb-1">
                12 • EMPIRICAL RIGOR &amp; AGRISENSE-STYLE DIGITAL TELEMETRY
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                {locale === "bn"
                  ? "ডিজিটাল ডেটা ড্যাশবোর্ড ও নিরীক্ষিত ফলাফল গ্রাফ"
                  : "Digital Telemetry Observatory & Audited Cross-Model Graph"}
              </h2>
            </div>
            <Link
              to="/research"
              className="min-h-11 px-4 rounded-full border border-sky-400/35 bg-sky-400/10 hover:bg-sky-400/20 text-sky-200 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              {locale === "bn" ? "সব মডেলে গ্রাফ দেখুন" : "Inspect Live Models"} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <DigitalObservatoryDeck
            badgeLabel="SHASTHOSETU FINAL_LOCK • AUDITED 60FPS TELEMETRY"
            statusLabel={overview.audit_lock_verdict}
            cards={observatoryCards}
            breakdownTitle={
              locale === "bn"
                ? "ক্লিনিকাল প্ল্যাটফর্ম ও গবেষণা সমতা বিভাজন"
                : "Platform Integrity & Research Parity Breakdown"
            }
            breakdownBars={[
              { name: "SQLite 3 WAL Schema", pct: 100, valueLabel: "54 Tables", color: "#f2c879", note: "BEGIN IMMEDIATE + FK + Triggers" },
              { name: "Bilingual i18n Parity", pct: 100, valueLabel: "100% BN/EN", color: "#38bdf8", note: "Zero untranslated UI keys" },
              { name: "Zero-PHI Support Guard", pct: 100, valueLabel: "403 Block", color: "#2dd4bf", note: "Clinical prose excluded" },
              { name: "HTTP 422 OCR Lockout", pct: 100, valueLabel: "Human-Gated", color: "#818cf8", note: "No auto-scheduled Rx" },
            ]}
            pauseMotion={motionPaused}
          />

          <InteractiveBarGraph
            title={
              locale === "bn"
                ? "৬টি অডিটকৃত এআই গবেষণা ট্র্যাকের তুলনামূলক গ্রাফ"
                : "Audited Benchmark Comparison Across All 6 Research Modules"
            }
            subtitle={
              locale === "bn"
                ? "হোভার করে প্রতিটি মডেলের চূড়ান্ত অডিটেড ফলাফল ও ডেটাসেট পরিসর দেখুন (শুধুমাত্র গবেষণা-প্রোটোটাইপ)।"
                : "Hover any bar to inspect exact final_lock benchmark metrics and sample scopes across all M01–M06 tracks."
            }
            items={auditedTrackGraphItems}
            thresholdValue={85}
            thresholdLabel="85% Reference Line"
            pauseMotion={motionPaused}
          />
        </div>
      </section>

      {/* =================================================================
          SECTION 13 · INTERACTIVE SERVICES HUD & BILINGUAL FAQ
          ================================================================= */}
      <section id="preview" className="relative overflow-hidden py-16 px-4 sm:px-6 border-b border-sky-400/20 space-y-12">
        <ChapterBackdrop src="/images/backgrounds/bg-health-journal.jpg" />
        <div className="relative z-10 max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-[#38bdf8] mb-1">
                13 • INTERACTIVE SERVICES &amp; CARE HUD
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
        <div className="relative z-10 max-w-4xl mx-auto space-y-4">
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
          SECTION 14 · FINAL CONVERSION CTA
          ================================================================= */}
      <section id="final-cta" className="relative overflow-hidden py-16 px-4 sm:px-6 text-white">
        <ChapterBackdrop src="/images/hero/hero-doctors-telemedicine.jpg" position="center 22%" />
        <div className="relative z-10 max-w-6xl mx-auto ss-sapphire-card rounded-3xl p-8 sm:p-10 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-sky-300 uppercase tracking-widest">
              <Sparkles className="w-4 h-4" /> 14 • READY TO EXPLORE
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Stethoscope className="w-6 h-6 text-teal-300" />
              {locale === "bn"
                ? "স্বাস্থ্যসেতু এআই ক্লিনিক্যাল টেলিহেলথ প্ল্যাটফর্ম পরীক্ষা করতে প্রস্তুত?"
                : "Ready to Test ShasthoSetu AI Clinical Telehealth Platform?"}
            </h2>
            <p className="text-sm text-slate-300">
              {locale === "bn"
                ? "রোগী, ডাক্তার, সাপোর্ট বা অ্যাডমিন অ্যাকাউন্ট দিয়ে সাইন ইন করুন অথবা ব্লাড কানেক্ট, স্বাস্থ্যসেবা ও স্বাস্থ্যবার্তা ঘুরে দেখুন।"
                : "Sign in with synthetic demo accounts, register a fresh Patient or Doctor application, or launch Blood Connect, Health Services, and Health Journal."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <Link to="/login" className="min-h-11 px-5 rounded-full bg-gradient-to-r from-sky-400 to-teal-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2 hover:from-sky-300 hover:to-teal-300 shadow-lg">
              {t("publicSite.nav.login")} <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/blood-connect" className="min-h-11 px-4 rounded-full border border-rose-400/40 bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 font-semibold text-xs inline-flex items-center gap-1.5">
              <Droplet className="w-3.5 h-3.5" /> {locale === "bn" ? "ব্লাড কানেক্ট" : "Blood Connect"}
            </Link>
            <Link to="/journal" className="min-h-11 px-4 rounded-full border border-teal-400/35 bg-teal-400/15 hover:bg-teal-400/25 text-teal-200 font-semibold text-xs inline-flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> {locale === "bn" ? "স্বাস্থ্যবার্তা" : "Health Journal"}
            </Link>
            <Link to="/doctor-apply" className="min-h-11 px-4 rounded-full border border-white/25 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs inline-flex items-center">
              {t("auth.doctorApplyLink")}
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
