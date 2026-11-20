import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Baby,
  Bot,
  CalendarCheck,
  CalendarHeart,
  Droplets,
  FileLock2,
  FlaskConical,
  HeartPulse,
  LifeBuoy,
  Pill,
  Scale,
  Sparkles,
  Stethoscope,
  Video,
} from "lucide-react";
import { apiGet } from "../lib/apiClient";
import { formatBdtFromPoisha } from "../lib/formatters";
import { useI18n } from "../lib/i18n";
import { PublicFloatingHeader } from "../components/layout/PublicFloatingHeader";
import { PublicFooter } from "../components/layout/PublicFooter";
import { PageBackdropLayer } from "../components/layout/PageBackdropLayer";
import { LocalDevicePreviewCard } from "../components/consultations/LocalDevicePreviewCard";
import { CyberScanWorkbench } from "../components/ai/CyberScanWorkbench";
import { EpharmaStoreWidget, type EpharmaMedicineItem } from "../components/pharmacy/EpharmaStoreWidget";
import { DiagnosticLabSectorGrid } from "../components/diagnostics/DiagnosticLabSectorGrid";
import { type AiModuleKey } from "../components/three/AiModuleScene3D";
import { Skeleton, TrustBadge } from "../components/ui";

interface ServicesResponse {
  diagnostic_tests: Array<{
    id: string;
    code: string;
    name_bn: string;
    name_en: string;
    category: string;
    sample_type: string;
    fee_minor_poisha: number;
    turnaround_hours: number;
  }>;
  healthcare_plans: Array<{
    id: string;
    code: string;
    name_bn: string;
    name_en: string;
    description_bn: string;
    description_en: string;
    monthly_fee_minor_poisha: number;
    max_family_members: number;
  }>;
  facilities: Array<{ id: string; name: string; facility_type: string; district: string; address: string }>;
  medicines?: EpharmaMedicineItem[];
}

const SERVICE_AI_TOOLS: Array<{
  num: string;
  key: AiModuleKey;
  titleEn: string;
  titleBn: string;
  ioDesc: string;
  modelSlug: string;
  studioTo: string;
  badge: string;
  accent: string;
}> = [
  {
    num: "01",
    key: "pcos-clinical",
    titleEn: "1. PCOS Clinical AI",
    titleBn: "১. PCOS ক্লিনিকাল এআই",
    ioDesc: "Structured 20-feature endocrine form -> XGBoost real joblib research risk index (94.44% Holdout).",
    modelSlug: "pcos-clinical",
    studioTo: "/features/pcos",
    badge: "M01 • REAL JOBLIB",
    accent: "#38bdf8",
  },
  {
    num: "02",
    key: "pcos-ultrasound",
    titleEn: "2. PCOS Ultrasound AI",
    titleBn: "২. PCOS আল্ট্রাসাউন্ড এআই",
    ioDesc: "Ovarian ultrasound scan (JPG/PNG) -> PCOM / Dominant Follicle / Normal morphology classification.",
    modelSlug: "pcos-ultrasound",
    studioTo: "/features/pcos",
    badge: "M02 • RESNET18",
    accent: "#2dd4bf",
  },
  {
    num: "03",
    key: "viral-rash",
    titleEn: "3. Viral Rash AI",
    titleBn: "৩. ভাইরাল র‍্যাশ ভিশন এআই",
    ioDesc: "Skin lesion image -> Leak-free 755-family 6-class research softmax probabilities & clinical warning.",
    modelSlug: "viral-rash",
    studioTo: "/features/viral-rash",
    badge: "M03 • 755-FAMILY",
    accent: "#818cf8",
  },
  {
    num: "04",
    key: "prescription-ocr",
    titleEn: "4. Prescription OCR",
    titleBn: "৪. প্রেসক্রিপশন OCR ও যাচাই গেট",
    ioDesc: "Rx photo/PDF -> EasyOCR bilingual Bengali+English extraction & editable draft gated by HTTP 422.",
    modelSlug: "prescription-ocr",
    studioTo: "/features/prescription-ocr",
    badge: "M04 • HUMAN GATE",
    accent: "#f2c879",
  },
  {
    num: "05",
    key: "dermoped",
    titleEn: "5. DermoPed AI",
    titleBn: "৫. ডার্মোপিড শিশু ত্বক এআই",
    ioDesc: "Pediatric skin scan -> ResNet18 EXP_B research classifier with strict N=22 small-cohort disclosure.",
    modelSlug: "dermoped",
    studioTo: "/features/pediatric-rash",
    badge: "M06 • N=22 CAVEAT",
    accent: "#34d399",
  },
  {
    num: "06",
    key: "bangla-voice",
    titleEn: "6. Bangla Voice AI",
    titleBn: "৬. বাংলা ভয়েস ও কথোপকথন এআই",
    ioDesc: "Live Mic + Land-Guard 3D Particle Orb -> Whisper-Small-BN + Qwen2.5 RAG + Neural TTS playback.",
    modelSlug: "bangla-voice",
    studioTo: "/features/bangla-voice",
    badge: "M05 • LIVE 3D VOICE",
    accent: "#c084fc",
  },
];

const VALID_TOOLS = new Set<AiModuleKey>(SERVICE_AI_TOOLS.map((t) => t.key));

function scrollToDomId(id: string) {
  if (typeof document === "undefined") return;
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function PublicServicesPage() {
  const { locale } = useI18n();
  const [searchParams] = useSearchParams();
  const [focusedTool, setFocusedTool] = useState<AiModuleKey>("pcos-clinical");
  const [data, setData] = useState<ServicesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Diagnostics + BMI Calculator
  const [bmiHeightCm, setBmiHeightCm] = useState<number>(168);
  const [bmiWeightKg, setBmiWeightKg] = useState<number>(64);

  const bmiValue = bmiHeightCm > 0 ? Number((bmiWeightKg / Math.pow(bmiHeightCm / 100, 2)).toFixed(1)) : 0;
  const bmiBand =
    bmiValue < 18.5
      ? { label: "Underweight", color: "text-sky-300", badge: "bg-sky-500/20 border-sky-400/40 text-sky-200" }
      : bmiValue < 25
        ? { label: "Healthy Normal", color: "text-emerald-400", badge: "bg-emerald-500/20 border-emerald-400/40 text-emerald-200" }
        : bmiValue < 30
          ? { label: "Overweight", color: "text-amber-300", badge: "bg-amber-500/20 border-amber-400/40 text-amber-200" }
          : { label: "Obese Range", color: "text-rose-400", badge: "bg-rose-500/20 border-rose-400/40 text-rose-200" };

  useEffect(() => {
    const tParam = searchParams.get("tool") as AiModuleKey | null;
    if (tParam && VALID_TOOLS.has(tParam)) {
      setFocusedTool(tParam);
      const timer = window.setTimeout(() => scrollToDomId(`tool-${tParam}`), 200);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await apiGet<ServicesResponse>("/v1/public/services");
        if (active) setData(res);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="ss-sapphire-always relative min-h-screen flex flex-col pt-24 overflow-x-clip text-white" data-testid="health-services-workspace">
      <PageBackdropLayer imageSrc="/images/backgrounds/bg-services-lab.jpg" />
      <PublicFloatingHeader transparentHero />

      <main className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 pb-16 space-y-12 flex-1">
        {/* Workspace Hero Header + Quick-Jump Smooth-Scroll Pills */}
        <section className="ss-sapphire-card rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
            <div className="space-y-2 max-w-3xl">
              <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[#2dd4bf]">
                <Sparkles className="w-4 h-4" /> UNIFIED HEALTH SERVICES WORKSPACE • CONTINUOUS SCROLL FLOW
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold">
                {locale === "bn"
                  ? "স্বাস্থ্যসেবা: পরামর্শ, ৬টি এআই টুল ও পারিবারিক সেবা"
                  : "Health Services: Consultations, All 6 AI Tools & Care Hub"}
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                {locale === "bn"
                  ? "কোনো ট্যাবে আটকে না থেকে নিচে স্ক্রল করলেই পাচ্ছেন টেলিমেডিসিন ডিভাইস পরীক্ষা, ৬টি বাস্তব এআই মডিউলের প্রতিটি এবং ডায়াগনস্টিক ও পারিবারিক সেবা।"
                  : "Scroll continuously through doctor video/mic check, every single one of our 6 interactive AI model workbenches (stacked live below — no hidden tabs), and diagnostic/family packages."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5 shrink-0">
              <Link
                to="/services/ai-assistant"
                className="min-h-11 px-5 rounded-full bg-gradient-to-r from-indigo-400 to-cyan-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
              >
                <Bot className="w-4 h-4" /> Live Bilingual AI Voice &amp; Chat (No Login Needed)
              </Link>
              <Link
                to="/find-care"
                className="min-h-11 px-5 rounded-full bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 font-bold text-xs inline-flex items-center gap-1.5"
              >
                <CalendarCheck className="w-4 h-4" /> Book Approved Doctor
              </Link>
              <Link
                to="/research"
                className="min-h-11 px-4 rounded-full border border-indigo-400/40 bg-indigo-500/15 text-indigo-200 font-semibold text-xs inline-flex items-center gap-1.5"
              >
                <FlaskConical className="w-4 h-4" /> View Model Evidence →
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => scrollToDomId("section-consultations")}
              className="min-h-9 px-3.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-sky-200 cursor-pointer"
            >
              A. Consultations &amp; Camera ↓
            </button>
            {SERVICE_AI_TOOLS.map((tool) => (
              <button
                key={tool.key}
                type="button"
                onClick={() => {
                  setFocusedTool(tool.key);
                  scrollToDomId(`tool-${tool.key}`);
                }}
                className={`min-h-9 px-3.5 rounded-full text-xs font-bold border transition cursor-pointer ${
                  focusedTool === tool.key
                    ? "bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 border-transparent"
                    : "bg-[#040a18]/80 border-white/15 text-slate-200 hover:border-sky-400/50"
                }`}
              >
                {locale === "bn" ? tool.titleBn : tool.titleEn} ↓
              </button>
            ))}
            <button
              type="button"
              onClick={() => scrollToDomId("section-other-services")}
              className="min-h-9 px-3.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-[#f2c879] cursor-pointer"
            >
              C. Diagnostics &amp; Plans ↓
            </button>
          </div>
        </section>

        {/* SECTION A: DOCTOR & CONSULTATION SERVICES (WITH EMBEDDED LOCAL DEVICE PREVIEW) */}
        <section id="section-consultations" className="scroll-mt-28 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#38bdf8]">
                A • DOCTOR &amp; CONSULTATION SERVICES
              </span>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2 mt-0.5">
                <Video className="w-5 h-5 text-[#38bdf8]" />
                {locale === "bn"
                  ? "টেলিমেডিসিন ডিভাইস পরীক্ষা, বুকিং ও ই-প্রেসক্রিপশন"
                  : "Consultation Queue, Local Camera/Mic Preview & Signed e-Rx"}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/patient/appointments" className="min-h-10 px-4 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold inline-flex items-center gap-1.5">
                My Appointments
              </Link>
              <Link to="/patient/payments" className="min-h-10 px-4 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold inline-flex items-center gap-1.5">
                Demo Receipts
              </Link>
              <Link to="/doctor/dashboard" className="min-h-10 px-4 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold inline-flex items-center gap-1.5">
                Doctor Queue
              </Link>
            </div>
          </div>

          <LocalDevicePreviewCard darkCard />
        </section>

        {/* SECTION B: ALL 6 AI HEALTH TOOLS STACKED VERTICALLY DOWN THE PAGE */}
        <section id="section-ai-tools" className="scroll-mt-28 space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#818cf8]">
                B • ALL 6 INTERACTIVE AI HEALTH TOOLS (SCROLL DOWN • ZERO HIDDEN TABS)
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mt-0.5">
                {locale === "bn"
                  ? "৬টি বাস্তব এআই মডিউল নিচে একের পর এক ব্যবহার করুন"
                  : "All 6 Live AI Health Workbenches Stacked Vertically"}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <TrustBadge kind="RESEARCH_ONLY" />
              <Link
                to="/research#res-3d-scanner"
                className="min-h-10 px-4 rounded-full border border-cyan-400/40 bg-cyan-500/15 text-cyan-200 text-xs font-bold inline-flex items-center gap-1.5"
              >
                Open 3D Scanner &amp; Graphs <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="space-y-8">
            {SERVICE_AI_TOOLS.map((tool) => (
              <div
                key={tool.key}
                id={`tool-${tool.key}`}
                className="scroll-mt-28 ss-sapphire-card rounded-3xl p-5 sm:p-6 space-y-5 border"
                style={{ borderColor: `${tool.accent}42` }}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-white/10">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="w-7 h-7 rounded-full font-mono text-xs font-extrabold text-slate-950 inline-flex items-center justify-center"
                        style={{ backgroundColor: tool.accent }}
                      >
                        {tool.num}
                      </span>
                      <span className="font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: tool.accent }}>
                        {tool.badge}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white">{locale === "bn" ? tool.titleBn : tool.titleEn}</h3>
                    <p className="text-xs text-slate-300">{tool.ioDesc}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Link
                      to={`/research/${tool.modelSlug}`}
                      className="min-h-10 px-4 rounded-full bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-bold inline-flex items-center gap-1.5"
                    >
                      Inspect Evidence <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      to={tool.studioTo}
                      className="min-h-10 px-4 rounded-full border border-white/20 hover:bg-white/10 text-slate-200 text-xs font-semibold inline-flex items-center"
                    >
                      Full Studio View
                    </Link>
                  </div>
                </div>

                {/* Live CyberScan Workbench (Zero extra WebGL canvases on /services to protect WebGL context limits) */}
                <CyberScanWorkbench activeModule={tool.key} />
              </div>
            ))}
          </div>
        </section>

        {/* SECTION C: OTHER HEALTHCARE SERVICES (DIAGNOSTICS, PLANS, PORTAL SHORTCUTS) */}
        <section id="section-other-services" className="scroll-mt-28 space-y-6">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#f2c879]">
              C • DIAGNOSTICS, FAMILY PLANS, PHARMACY &amp; PORTAL SHORTCUTS
            </span>
            <h2 className="text-2xl font-bold text-white mt-0.5">
              {locale === "bn" ? "ডায়াগনস্টিক ল্যাব, ফ্যামিলি প্যাকেজ ও ক্লিনিক্যাল ভল্ট" : "Diagnostic Catalogs, Family Plans & Care Workspaces"}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Pill, title: "Medication Reminders & Safe OCR", desc: "Active schedules strictly blocked until HTTP 422 human verification.", to: "/patient/medicines", accent: "text-[#f2c879]" },
              { icon: FileLock2, title: "Family Profiles & Medical Vault", desc: "Adult/child dependent isolation with medical document history.", to: "/patient/records", accent: "text-sky-300" },
              { icon: CalendarHeart, title: "PCOS Cycle & Visit Prep Journal", desc: "Non-diagnostic cycle diary and structured OB-GYN visit brief.", to: "/patient/pcos", accent: "text-teal-300" },
              { icon: Baby, title: "Pediatric Triage & EPI Vaccines", desc: "Deterministic red-flag danger rules & childhood vaccination schedule.", to: "/patient/pediatric", accent: "text-emerald-300" },
              { icon: Droplets, title: "Blood Connect Emergency Network", desc: "5/10/20 km geo-matching donors with consent-gated contact privacy.", to: "/blood-connect", accent: "text-rose-400" },
              { icon: LifeBuoy, title: "Zero-PHI Support Desk", desc: "Ticketing strictly isolated from patient clinical notes (HTTP 403).", to: "/support/dashboard", accent: "text-indigo-300" },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.title}
                  to={card.to}
                  className="ss-sapphire-card rounded-2xl p-5 flex items-start gap-3.5 hover:border-sky-400/60 transition"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <Icon className={`w-5 h-5 ${card.accent}`} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-white">{card.title}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">{card.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>

          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (() => {
            const allTests = data?.diagnostic_tests || [];

            return (
              <div className="space-y-10">
                {/* 12 Diagnostic Tests with Sector Grid and Visual Icons */}
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <span className="font-mono text-[11px] uppercase tracking-wider text-teal-300">
                        DIAGNOSTIC LAB TESTING &amp; HOME COLLECTION (12 PANELS)
                      </span>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2 mt-0.5">
                        <Activity className="w-5 h-5 text-[#2dd4bf]" />
                        {locale === "bn" ? "ডায়াগনস্টিক ল্যাব টেস্ট ক্যাটালগ (১২টি প্যানেল)" : "Diagnostic Lab Tests (12 Panels)"}
                      </h3>
                    </div>
                    <Link to="/patient/diagnostics" className="text-xs font-semibold text-sky-300 hover:underline">
                      Order Demo Lab Online →
                    </Link>
                  </div>

                  <DiagnosticLabSectorGrid tests={allTests} locale={locale} />
                </div>

                {/* Family Plans + BMI Calculator */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Column 1: Interactive BMI & Wellness Gauge */}
                  <div className="space-y-5">
                    {/* Interactive BMI & Wellness Gauge */}
                    <div className="bento-card rounded-3xl p-5 space-y-4 border-cyan-400/30">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <Scale className="w-4 h-4 text-cyan-400" />
                          {locale === "bn" ? "বিএমআই (BMI) ও স্বাস্থ্য ক্যালকুলেটর" : "Interactive BMI & Wellness Check"}
                        </h3>
                        <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${bmiBand.badge}`}>
                          {bmiBand.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <label className="space-y-1">
                          <span className="text-slate-300 font-semibold">Height: {bmiHeightCm} cm</span>
                          <input
                            type="range"
                            min={120}
                            max={210}
                            value={bmiHeightCm}
                            onChange={(e) => setBmiHeightCm(Number(e.target.value))}
                            className="w-full accent-cyan-400"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-slate-300 font-semibold">Weight: {bmiWeightKg} kg</span>
                          <input
                            type="range"
                            min={30}
                            max={140}
                            value={bmiWeightKg}
                            onChange={(e) => setBmiWeightKg(Number(e.target.value))}
                            className="w-full accent-emerald-400"
                          />
                        </label>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-mono uppercase text-slate-400">CALCULATED BMI INDEX</div>
                          <div className={`text-3xl font-black font-mono ${bmiBand.color}`}>{bmiValue}</div>
                        </div>
                        <div className="text-right text-[11px] text-slate-400">
                          <div>Healthy Target:</div>
                          <div className="font-mono text-slate-200 font-bold">
                            {Math.round(18.5 * Math.pow(bmiHeightCm / 100, 2))}–{Math.round(24.9 * Math.pow(bmiHeightCm / 100, 2))} kg
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] font-mono text-slate-400">
                        Educational wellness estimator — consult an Internal Medicine or Endocrinology specialist for clinical plans.
                      </p>
                    </div>
                  </div>

                  {/* Column 2: Healthcare Plans */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <HeartPulse className="w-4 h-4 text-emerald-400" /> Family Healthcare Plans (Simulated)
                    </h3>
                    {(data?.healthcare_plans || []).map((plan) => (
                      <div key={plan.id} className="ss-sapphire-card rounded-2xl p-5 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-base text-white">
                            {locale === "bn" ? plan.name_bn : plan.name_en}
                          </span>
                          <span className="font-mono font-bold text-base text-[#f2c879]">
                            {formatBdtFromPoisha(plan.monthly_fee_minor_poisha, locale)}/mo
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">
                          {locale === "bn" ? plan.description_bn : plan.description_en}
                        </p>
                        <div className="text-[10px] font-mono text-slate-400">
                          <Stethoscope className="w-3 h-3 inline mr-1" /> Up to {plan.max_family_members} profiles • SIMULATED DEMO
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reusable ePharma Medicine Store (24 items across 8 categories + Live Demo Cart) */}
                <EpharmaStoreWidget medicines={data?.medicines} />
              </div>
            );
          })()}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
