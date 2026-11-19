import { Suspense, lazy, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Baby,
  CalendarCheck,
  CalendarHeart,
  Droplets,
  FileLock2,
  FlaskConical,
  HeartPulse,
  LifeBuoy,
  Pill,
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
import { type AiModuleKey } from "../components/three/AiModuleScene3D";
import { Skeleton, TrustBadge } from "../components/ui";

const LazyAiModuleScene3D = lazy(() =>
  import("../components/three/AiModuleScene3D").then((m) => ({ default: m.AiModuleScene3D }))
);

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
}

const SERVICE_AI_TOOLS: Array<{
  key: AiModuleKey;
  titleEn: string;
  titleBn: string;
  ioDesc: string;
  modelSlug: string;
  badge: string;
}> = [
  {
    key: "pcos-clinical",
    titleEn: "1. PCOS Clinical AI",
    titleBn: "১. PCOS ক্লিনিকাল",
    ioDesc: "Structured endocrine form -> XGBoost research index",
    modelSlug: "pcos-clinical",
    badge: "M01 • REAL JOBLIB",
  },
  {
    key: "pcos-ultrasound",
    titleEn: "2. PCOS Ultrasound AI",
    titleBn: "২. PCOS আল্ট্রাসাউন্ড",
    ioDesc: "Ultrasound scan -> PCOM / Normal classification",
    modelSlug: "pcos-ultrasound",
    badge: "M02 • RESNET18",
  },
  {
    key: "viral-rash",
    titleEn: "3. Viral Rash AI",
    titleBn: "৩. ভাইরাল র‍্যাশ",
    ioDesc: "Skin lesion photo -> 6-class research softmax",
    modelSlug: "viral-rash",
    badge: "M03 • 755-FAMILY",
  },
  {
    key: "prescription-ocr",
    titleEn: "4. Prescription OCR",
    titleBn: "৪. প্রেসক্রিপশন OCR",
    ioDesc: "Rx photo/PDF -> EasyOCR editable draft (HTTP 422 gate)",
    modelSlug: "prescription-ocr",
    badge: "M04 • HUMAN GATE",
  },
  {
    key: "dermoped",
    titleEn: "5. DermoPed AI",
    titleBn: "৫. ডার্মোপিড এআই",
    ioDesc: "Pediatric skin scan -> N=22 research classifier",
    modelSlug: "dermoped",
    badge: "M06 • N=22 CAVEAT",
  },
  {
    key: "bangla-voice",
    titleEn: "6. Bangla Voice AI",
    titleBn: "৬. বাংলা ভয়েস",
    ioDesc: "Audio/Mic -> Phase G Deferred (FLEURS Benchmark Only)",
    modelSlug: "bangla-voice",
    badge: "PHASE G DEFERRED",
  },
];

const VALID_TOOLS = new Set<AiModuleKey>(SERVICE_AI_TOOLS.map((t) => t.key));

export function PublicServicesPage() {
  const { locale } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTool = searchParams.get("tool") as AiModuleKey | null;
  const [activeTool, setActiveTool] = useState<AiModuleKey>(
    initialTool && VALID_TOOLS.has(initialTool) ? initialTool : "pcos-clinical"
  );
  const [scanning, setScanning] = useState(false);
  const [lastConf, setLastConf] = useState<number | null>(null);

  const [data, setData] = useState<ServicesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tParam = searchParams.get("tool") as AiModuleKey | null;
    if (tParam && VALID_TOOLS.has(tParam)) {
      setActiveTool(tParam);
    }
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

  const currentToolMeta = SERVICE_AI_TOOLS.find((t) => t.key === activeTool) ?? SERVICE_AI_TOOLS[0];

  return (
    <div className="ss-sapphire-always relative min-h-screen flex flex-col pt-24 overflow-x-clip text-white" data-testid="health-services-workspace">
      <PageBackdropLayer imageSrc="/images/backgrounds/bg-services-lab.jpg" />
      <PublicFloatingHeader transparentHero />

      <main className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 pb-16 space-y-12 flex-1">
        {/* Workspace Hero Header */}
        <section className="ss-sapphire-card rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="space-y-2 max-w-3xl">
            <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[#2dd4bf]">
              <Sparkles className="w-4 h-4" /> UNIFIED HEALTH SERVICES WORKSPACE
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold">
              {locale === "bn"
                ? "স্বাস্থ্যসেবা: পরামর্শ, ৬টি এআই টুল ও পারিবারিক সেবা"
                : "Health Services: Consultations, 6 Live AI Tools & Clinical Care"}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              {locale === "bn"
                ? "একই ওয়ার্কস্পেসে ডাক্তার পরামর্শ ও ডিভাইস পরীক্ষা, ৬টি বাস্তব এআই মডিউল ইনফারেন্স এবং ডায়াগনস্টিক ও ফ্যামিলি কেয়ার সেবা ব্যবহার করুন। গবেষণার প্রমাণ দেখতে AI & Research পাতায় যান।"
                : "Your operational workspace combining doctor consultations & local device testing, interactive 6-module AI inference tools, and diagnostic/family services. Visit AI & Research for full dataset methodology."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 shrink-0">
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
        </section>

        {/* SECTION A: DOCTOR & CONSULTATION SERVICES (WITH EMBEDDED LOCAL DEVICE PREVIEW) */}
        <section id="section-consultations" className="space-y-5">
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

        {/* SECTION B: INTERACTIVE 6 AI HEALTH TOOLS */}
        <section id="section-ai-tools" className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#818cf8]">
                B • INTERACTIVE AI HEALTH TOOLS (REAL SAVED CHECKPOINTS)
              </span>
              <h2 className="text-2xl font-bold text-white mt-0.5">
                {locale === "bn"
                  ? "৬টি বাস্তব এআই মডিউল ব্যবহার করুন (ইনপুট → প্রসেসিং → ফলাফল)"
                  : "Use All 6 AI Health Tools Live (Upload / Input → Model Output)"}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <TrustBadge kind="RESEARCH_ONLY" />
              <Link
                to={`/research/${currentToolMeta.modelSlug}`}
                className="min-h-10 px-4 rounded-full border border-indigo-400/40 bg-indigo-500/15 text-indigo-200 text-xs font-bold inline-flex items-center gap-1.5"
              >
                Inspect Methodology &amp; Proof <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {SERVICE_AI_TOOLS.map((tool) => {
              const active = activeTool === tool.key;
              return (
                <button
                  key={tool.key}
                  type="button"
                  onClick={() => {
                    setActiveTool(tool.key);
                    setSearchParams({ tool: tool.key });
                    setLastConf(null);
                  }}
                  className={`min-h-16 p-3 rounded-2xl text-left border transition cursor-pointer ${
                    active
                      ? "bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 border-transparent shadow-lg"
                      : "ss-sapphire-card text-slate-200 hover:border-sky-400/50"
                  }`}
                >
                  <div className="text-xs font-bold truncate">{locale === "bn" ? tool.titleBn : tool.titleEn}</div>
                  <div className={`font-mono text-[9.5px] mt-1 truncate ${active ? "text-slate-900 font-bold" : "text-sky-300"}`}>
                    {tool.badge}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8">
              <CyberScanWorkbench
                activeModule={activeTool}
                onScanStateChange={(sc, conf) => {
                  setScanning(sc);
                  if (conf !== null) setLastConf(conf);
                }}
              />
            </div>

            <div className="lg:col-span-4 space-y-4">
              <div className="ss-sapphire-card rounded-3xl p-4 h-[230px]">
                <Suspense fallback={<div className="w-full h-full rounded-2xl bg-[#040a18]" />}>
                  <LazyAiModuleScene3D moduleKey={activeTool} scanning={scanning} confidence={lastConf} />
                </Suspense>
              </div>
              <div className="ss-sapphire-card rounded-3xl p-5 space-y-2.5 text-xs">
                <div className="font-mono text-[10px] text-sky-300 uppercase">Selected Tool Information</div>
                <h3 className="text-base font-bold text-white">{currentToolMeta.titleEn}</h3>
                <p className="text-slate-300">{currentToolMeta.ioDesc}</p>
                <div className="pt-2 border-t border-white/10 flex flex-wrap gap-2">
                  <Link
                    to={`/research/${currentToolMeta.modelSlug}`}
                    className="min-h-9 px-3.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 font-semibold inline-flex items-center gap-1"
                  >
                    Model Evidence <ArrowRight className="w-3 h-3" />
                  </Link>
                  <Link
                    to={`/features/${currentToolMeta.key === "pcos-clinical" || currentToolMeta.key === "pcos-ultrasound" ? "pcos" : currentToolMeta.key === "dermoped" ? "pediatric-rash" : currentToolMeta.key}`}
                    className="min-h-9 px-3.5 rounded-full border border-white/20 text-slate-200 font-semibold inline-flex items-center"
                  >
                    Full Studio View
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION C: OTHER HEALTHCARE SERVICES (DIAGNOSTICS, PLANS, PORTAL SHORTCUTS) */}
        <section id="section-other-services" className="space-y-6">
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
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#2dd4bf]" /> Diagnostic Lab Tests (Demo Catalog)
                  </h3>
                  <Link to="/patient/diagnostics" className="text-xs font-semibold text-sky-300 hover:underline">
                    Order Demo Lab →
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(data?.diagnostic_tests || []).map((test) => (
                    <div key={test.id} className="ss-sapphire-card rounded-2xl p-4 space-y-1.5">
                      <span className="text-[11px] font-mono text-[#2dd4bf]">{test.code} • {test.turnaround_hours}h</span>
                      <div className="font-bold text-sm text-white">{locale === "bn" ? test.name_bn : test.name_en}</div>
                      <div className="text-xs text-slate-400">{test.category} • {test.sample_type}</div>
                      <div className="font-mono font-bold text-sm text-[#f2c879] pt-1">
                        {formatBdtFromPoisha(test.fee_minor_poisha, locale)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5 space-y-3">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-emerald-400" /> Family Healthcare Plans (Simulated)
                </h3>
                <div className="space-y-3">
                  {(data?.healthcare_plans || []).map((plan) => (
                    <div key={plan.id} className="ss-sapphire-card rounded-2xl p-5 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-base text-white">{locale === "bn" ? plan.name_bn : plan.name_en}</span>
                        <span className="font-mono font-bold text-base text-[#f2c879]">
                          {formatBdtFromPoisha(plan.monthly_fee_minor_poisha, locale)}/mo
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{locale === "bn" ? plan.description_bn : plan.description_en}</p>
                      <div className="text-[10px] font-mono text-slate-400">
                        <Stethoscope className="w-3 h-3 inline mr-1" /> Up to {plan.max_family_members} profiles • SIMULATED DEMO
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
