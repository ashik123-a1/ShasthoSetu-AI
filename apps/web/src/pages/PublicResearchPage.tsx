import { Suspense, lazy, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Cpu,
  Database,
  FileCheck2,
  FlaskConical,
  GitBranch,
  GraduationCap,
  Lock,
  Printer,
  RotateCcw,
  Scan,
  ShieldAlert,
  ShieldCheck,
  Sigma,
  XCircle,
} from "lucide-react";
import { apiGet, apiPost } from "../lib/apiClient";
import { useI18n } from "../lib/i18n";
import { usePreferences } from "../lib/preferences";
import { PublicFloatingHeader } from "../components/layout/PublicFloatingHeader";
import { PublicFooter } from "../components/layout/PublicFooter";
import { PageBackdropLayer } from "../components/layout/PageBackdropLayer";
import { Skeleton, TrustBadge } from "../components/ui";
import { CyberScanWorkbench } from "../components/ai/CyberScanWorkbench";
import { type AiModuleKey } from "../components/three/AiModuleScene3D";
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
import {
  ClinicalEquationExplorer,
  MethodsChapterHeader,
  StickyClinicalStory,
} from "../components/research/ResearchMethodsWidgets";

const LazyHolographicBodyScanner3D = lazy(() =>
  import("../components/three/HolographicBodyScanner3D").then((m) => ({
    default: m.HolographicBodyScanner3D,
  }))
);

interface ResearchPayload {
  audit_verdict: string;
  non_diagnostic_disclaimer_bn: string;
  non_diagnostic_disclaimer_en: string;
  datasets: Array<{ module: string; dataset_or_scope: string; reconciled_count: string; scientific_classification: string; limitations: string }>;
  models: Array<{
    model_id: string;
    module: string;
    model_name: string;
    architecture: string;
    scientific_classification: string;
    checkpoint_storage_status: string;
    local_checkpoint_path: string;
    sha256_hash: string;
    primary_metric_name: string;
    primary_metric_value: string;
    audit_status: string;
  }>;
  deferred_modules: Array<{ id: string; name: string; status: string; reason: string }>;
}

interface PcosPreviewResult {
  classification: string;
  model_reference: string;
  screening_index: number;
  band: string;
  observed_factors: string[];
  disclaimer: string;
}

const SIX_RESEARCH_CARDS: Array<{
  slug: AiModuleKey;
  titleEn: string;
  titleBn: string;
  arch: string;
  dataset: string;
  metric: string;
  limitNote: string;
  accent: string;
}> = [
  {
    slug: "pcos-clinical",
    titleEn: "1. PCOS Clinical AI",
    titleBn: "১. পিসিওএস ক্লিনিকাল এআই",
    arch: "XGBClassifier + SimpleImputer",
    dataset: "N=88 Patients (70 Dev CV / 18 Holdout)",
    metric: "94.44% Holdout • 88.57% 5-Fold CV",
    limitNote: "Strictly tabular/hormone track; separate from Ultrasound per Rotterdam guidelines.",
    accent: "#38bdf8",
  },
  {
    slug: "pcos-ultrasound",
    titleEn: "2. PCOS Ultrasound AI",
    titleBn: "২. পিসিওএস আল্ট্রাসাউন্ড এআই",
    arch: "ResNet18 CNN vs MobileNetV3",
    dataset: "299 Unique Scans (289 Pseudo-Patients)",
    metric: "86.67% Held-Out Test (39/45) • 87.70% F1",
    limitNote: "Grouped by pHash/dHash pseudo-patients; PCOM morphology alone != PCOS diagnosis.",
    accent: "#2dd4bf",
  },
  {
    slug: "viral-rash",
    titleEn: "3. Viral Rash AI",
    titleBn: "৩. ভাইরাল র‍্যাশ ভিশন এআই",
    arch: "ResNet18 Grouped (vs Quarantined 99.10%)",
    dataset: "755 Families / 10,384 Crops (528/113/114)",
    metric: "84.65% Val Acc • 91.94% Measles Recall",
    limitNote: "Historical random-split 99.10% leaked checkpoint quarantined & excluded.",
    accent: "#818cf8",
  },
  {
    slug: "prescription-ocr",
    titleEn: "4. Prescription OCR",
    titleBn: "৪. প্রেসক্রিপশন OCR ও HTTP 422 গেট",
    arch: "EasyOCR (bn+en) + pypdf + SQLite CHECK",
    dataset: "1,000 Rx Corpus (992 Admissible, 8 Quar.)",
    metric: "99.20% Corpus Audited • 100% 422 Guard",
    limitNote: "Freeform string CER/WER honestly marked NOT_VALIDATED; human confirmation mandatory.",
    accent: "#f2c879",
  },
  {
    slug: "bangla-voice",
    titleEn: "5. Bangla Voice AI (Phase G)",
    titleBn: "৫. বাংলা ভয়েস এআই (Phase G)",
    arch: "anuragshas/whisper-small-bn vs Base/Tiny",
    dataset: "26 FLEURS Clips / 22 Unique Speakers",
    metric: "98.37% BN Unicode • 39.09% Norm WER",
    limitNote: "No local training; live mic & RAG strictly deferred to Phase G per Master SRS v2.0.",
    accent: "#c084fc",
  },
  {
    slug: "dermoped",
    titleEn: "6. DermoPed Pediatric Skin AI",
    titleBn: "৬. ডার্মোপিড শিশু ত্বক এআই",
    arch: "ResNet18 EXP_B (vs Rejected EXP_D)",
    dataset: "N=22 Patients (19 CPX + 3 Pediculosis)",
    metric: "92.73% Image Acc • 75.0% Patient Acc",
    limitNote: "SEVERE LIMIT: Only 3 Pediculosis patients (pt72/71/74); Val Pediculosis recall 15.0%.",
    accent: "#34d399",
  },
];

const SCIENTIFIC_QUIZ = [
  {
    qEn: "Why did ShasthoSetu quarantine the 99.10% M03 Viral Rash checkpoint?",
    qBn: "কেন স্বাস্থ্যসেতু ৯৯.১০% নির্ভুলতার পুরোনো Viral Rash মডেলটি কোয়ারেন্টাইন করেছে?",
    optsEn: ["Random crop splitting leaked 686/755 photo families between train and test", "ResNet18 lacked GPU acceleration", "Dataset had zero Measles samples"],
    optsBn: ["র‍্যান্ডম ক্রপ স্প্লিটে ৬৮৬/৭৫৫টি ফটো-ফ্যামিলি ট্রেন ও টেস্টে লিক হয়েছিল", "জিপিইউ ছিল না", "হাম (Measles) শ্রেণি ছিল না"],
    correct: 0,
    whyEn: "Source-family grouping verified 0% cross-split leakage cleanly at 84.65% Img Acc (84.22% Macro F1).",
  },
  {
    qEn: "What enforces human verification in M04 Prescription OCR before reminders activate?",
    qBn: "ওষুধের রিমাইন্ডার চালুর আগে M04 প্রেসক্রিপশন OCR-এ মানুষের যাচাই কীভাবে বাধ্যতামূলক করা হয়েছে?",
    optsEn: ["DB CHECK constraint + FastAPI HTTP 422 UNVERIFIED_OCR_FIELDS lockout", "Client-side alert popup only", "Automatic 90-day delay"],
    optsBn: ["SQLite CHECK কনস্ট্রেইন্ট ও সার্ভার HTTP 422 UNVERIFIED_OCR_FIELDS ব্লক", "শুধুমাত্র ব্রাউজার পপআপ", "৯০ দিনের স্বয়ংক্রিয় বিরতি"],
    correct: 0,
    whyEn: "Even if the frontend is bypassed, SQLite & FastAPI block VERIFIED/ACTIVE plans lacking verified_by_user_id.",
  },
  {
    qEn: "Why are M01 Clinical PCOS and M02 Ovarian Ultrasound kept strictly separate?",
    qBn: "পিসিওএস ক্লিনিকাল (M01) ও আল্ট্রাসাউন্ড (M02) মডেল দুটি আলাদা রাখা হয়েছে কেন?",
    optsEn: ["Ultrasound PCOM morphology alone is not diagnostic without clinical/hormonal Rotterdam criteria", "They use different CSV delimiters", "Ultrasound requires 20 tabular lab features"],
    optsBn: ["শুধু আল্ট্রাসাউন্ড PCOM মরফোলজি রটারডাম ক্লিনিকাল মানদণ্ড ছাড়া একক রোগ নির্ণয় নয়", "CSV ফরম্যাট আলাদা", "আল্ট্রাসাউন্ডে ২০টি ব্লাড টেস্ট লাগে"],
    correct: 0,
    whyEn: "Separating anthropometric/endocrine screening (N=88) from sonographic PCOM morphology (299 scans) protects clinical clarity.",
  },
  {
    qEn: "Which severe limitation is openly reported on the 06_DermoPed EXP_B benchmark?",
    qBn: "06_DermoPed EXP_B গবেষণায় কোন বড় সীমাবদ্ধতাটি স্পষ্টভাবে উল্লেখ আছে?",
    optsEn: ["Only 3 Pediculosis patients (pt72/pt71/pt74) exist locally (15.0% validation recall)", "100% Pediculosis generalization verified across Bangladesh", "Live audio clips failed"],
    optsBn: ["লোকাল ডেটাসেটে মাত্র ৩ জন Pediculosis রোগী (pt72/pt71/pt74) আছেন এবং ভ্যালিডেশন রিকল ১৫%", "সারাদেশে ১০০% সাধারণীকরণ নিশ্চিত", "অডিও ক্লিপ ব্যর্থ হয়েছে"],
    correct: 0,
    whyEn: "Transparently disclosing cohort imbalance (19 Chickenpox vs 3 Pediculosis) prevents misleading claims.",
  },
];

const RESEARCH_DECK_CARDS: TelemetryDeckCard[] = [
  {
    id: "m01-pcos",
    tag: "M01 • PCOS CLINICAL",
    value: "94.44%",
    sub: "Holdout Bal Acc (N=88)",
    accent: "#38bdf8",
    icon: Activity,
    pieCenter: "94.4",
    pieSub: "HOLD",
    pieSegments: [
      { label: "Holdout Correct", pct: 94.4, color: "#38bdf8" },
      { label: "Residual", pct: 5.6, color: "#1e293b" },
    ],
    barSegments: [
      { label: "Dev 70", pct: 79.5, color: "#38bdf8" },
      { label: "Holdout 18", pct: 20.5, color: "#2dd4bf" },
    ],
    barFootnote: "5-Fold CV 88.57% • Real joblib pipeline",
  },
  {
    id: "m02-usg",
    tag: "M02 • PCOS USG",
    value: "86.67%",
    sub: "299 pHash Unique Scans",
    accent: "#2dd4bf",
    icon: Scan,
    pieCenter: "86.7",
    pieSub: "TEST",
    pieSegments: [
      { label: "Held-Out Test", pct: 86.7, color: "#2dd4bf" },
      { label: "Residual", pct: 13.3, color: "#1e293b" },
    ],
    barSegments: [
      { label: "Dominant", pct: 47.5, color: "#2dd4bf" },
      { label: "PCO", pct: 38.8, color: "#38bdf8" },
      { label: "Normal", pct: 13.7, color: "#f2c879" },
    ],
    barFootnote: "289 pseudo-patients • 87.70% Weighted F1",
  },
  {
    id: "m03-rash",
    tag: "M03 • VIRAL RASH",
    value: "84.65%",
    sub: "755 Families • 0% Leak",
    accent: "#818cf8",
    icon: ShieldCheck,
    pieCenter: "0%",
    pieSub: "LEAK",
    pieSegments: [
      { label: "Leak-Free Split", pct: 84.65, color: "#818cf8" },
      { label: "Residual", pct: 15.35, color: "#1e293b" },
    ],
    barSegments: [
      { label: "Train 528", pct: 70, color: "#818cf8" },
      { label: "Val 113", pct: 15, color: "#38bdf8" },
      { label: "Test 114", pct: 15, color: "#2dd4bf" },
    ],
    barFootnote: "Legacy 99.10% quarantined (686 leaked)",
  },
  {
    id: "m04-ocr-gov",
    tag: "M04/M05/M06 • GOV",
    value: "100%",
    sub: "HTTP 422 Human Gate",
    accent: "#f2c879",
    icon: Lock,
    pieCenter: "422",
    pieSub: "GATE",
    pieSegments: [
      { label: "Admissible", pct: 99.2, color: "#f2c879" },
      { label: "Quarantined", pct: 0.8, color: "#fb7185" },
    ],
    barSegments: [
      { label: "Admitted 992", pct: 99.2, color: "#f2c879" },
      { label: "Quar 8", pct: 0.8, color: "#fb7185" },
    ],
    barFootnote: "DermoPed N=22 & Whisper Phase G disclosed",
  },
];

const CHAPTER_NAV: Array<{ id: string; label: string; icon: typeof Scan }> = [
  { id: "res-3d-scanner", label: "01. 3D Body Scanner HUD", icon: Scan },
  { id: "res-models", label: "02. All 6 Model Dossiers", icon: BookOpen },
  { id: "res-story", label: "03. Sticky Clinical Story", icon: GitBranch },
  { id: "res-graphs", label: "04. Data & Animated Graphs", icon: Activity },
  { id: "res-equations", label: "05. Equations & Formulas", icon: Sigma },
  { id: "res-register", label: "06. Datasets & SHA-256 Register", icon: Database },
  { id: "res-quiz", label: "07. Honest Limits & Quiz", icon: GraduationCap },
  { id: "res-sandbox", label: "08. Live Research Lab", icon: FlaskConical },
];

function scrollToChapter(id: string) {
  if (typeof document === "undefined") return;
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function PublicResearchPage() {
  const { locale } = useI18n();
  const { motionPaused } = usePreferences();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialParam = searchParams.get("module") as AiModuleKey | null;
  const validKeys = new Set<AiModuleKey>(["pcos-clinical", "pcos-ultrasound", "viral-rash", "prescription-ocr", "bangla-voice", "dermoped"]);

  const [activeModule, setActiveModule] = useState<AiModuleKey>(
    initialParam && validKeys.has(initialParam) ? initialParam : "viral-rash"
  );

  const [data, setData] = useState<ResearchPayload | null>(null);
  const [loading, setLoading] = useState(true);

  // Quick PCOS Index (preserved cleanly)
  const [age, setAge] = useState(25);
  const [bmi, setBmi] = useState(26.2);
  const [cycleDays, setCycleDays] = useState(42);
  const [lhFsh, setLhFsh] = useState(2.2);
  const [irregular, setIrregular] = useState(true);
  const [androgen, setAndrogen] = useState(true);
  const [calcResult, setCalcResult] = useState<PcosPreviewResult | null>(null);

  // Learn Quiz Answers
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});

  useEffect(() => {
    const modParam = searchParams.get("module") as AiModuleKey | null;
    if (modParam && validKeys.has(modParam)) {
      setActiveModule(modParam);
      const timer = window.setTimeout(() => scrollToChapter("res-sandbox"), 220);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await apiGet<ResearchPayload>("/v1/public/research");
        if (active) setData(res);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const runPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiPost<PcosPreviewResult>("/v1/public/research/pcos-preview", {
      age: Number(age),
      bmi: Number(bmi),
      cycle_length_days: Number(cycleDays),
      lh_fsh_ratio: Number(lhFsh),
      irregular_cycles: irregular,
      acne_or_hirsutism: androgen,
    });
    setCalcResult(res);
  };

  const quizAnsweredCount = Object.keys(quizAnswers).length;
  const quizScore = SCIENTIFIC_QUIZ.reduce((acc, q, idx) => (quizAnswers[idx] === q.correct ? acc + 1 : acc), 0);

  return (
    <div className="ss-sapphire-always relative min-h-screen flex flex-col pt-24 overflow-x-clip text-white" data-testid="ai-research-methods-page">
      <PageBackdropLayer imageSrc="/images/backgrounds/bg-ai-research.jpg" />
      <PublicFloatingHeader transparentHero />

      <main className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 pb-20 space-y-16 flex-1">
        {/* Top Hero Banner + Continuous Scroll Chapter Rail */}
        <section className="ss-sapphire-card rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
            <div className="space-y-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#38bdf8]">
                  AI &amp; RESEARCH • AGRISENSE METHODS &amp; LEARN EDITION (CONTINUOUS SCROLL)
                </span>
                <TrustBadge kind="RESEARCH_ONLY" />
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                {locale === "bn" ? (
                  <>
                    ৩ডি ভলিউমেট্রিক স্ক্যানার,{" "}
                    <span className="bg-gradient-to-r from-[#38bdf8] via-[#2dd4bf] to-[#f2c879] bg-clip-text text-transparent">
                      গ্রাফ ও গবেষণার পূর্ণাঙ্গ প্রমাণ
                    </span>
                  </>
                ) : (
                  <>
                    Methods &amp; Learn:{" "}
                    <span className="bg-gradient-to-r from-[#38bdf8] via-[#2dd4bf] to-[#f2c879] bg-clip-text text-transparent">
                      3D Body Scanner, Visual Graphs &amp; Proofs
                    </span>
                  </>
                )}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {locale === "bn"
                  ? "কোনো লুকানো ট্যাব নয়—নিচে স্ক্রল করলেই পাচ্ছেন রিয়েল-টাইম ৩ডি হলোগ্রাফিক বডি স্ক্যানার ও হৃদপিণ্ড অ্যানিমেশন, সব মডেলের ডোজিয়ার, অ্যানিমেটেড গ্রাফ, গাণিতিক সমীকরণ ও কুইজ।"
                  : "All 8 research chapters stream cleanly down the page: 3D Volumetric Body & Heart HUD, 6 audited model dossiers, sticky architecture story, full visual graph gallery, equations, 16-model SHA-256 registry, bilingual quiz & live sandbox."}
              </p>
            </div>

            <Link
              to="/services#section-ai-tools"
              className="min-h-11 px-5 rounded-full bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shrink-0"
            >
              Use All 6 AI Tools Live in Health Services <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Smooth-Scroll Chapter Pills */}
          <div className="flex flex-wrap gap-2 pt-3 border-t border-white/10">
            {CHAPTER_NAV.map((ch) => {
              const Icon = ch.icon;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => scrollToChapter(ch.id)}
                  className="min-h-9 px-3.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition bg-white/10 hover:bg-[#38bdf8] hover:text-slate-950 text-slate-100 border border-white/15"
                >
                  <Icon className="w-3.5 h-3.5" /> {ch.label} ↓
                </button>
              );
            })}
          </div>
        </section>

        {/* CHAPTER 01: 3D VOLUMETRIC HOLOGRAPHIC HUMAN BODY SCANNER & BEATING HEART HUD */}
        <section id="res-3d-scanner" className="scroll-mt-28 space-y-6">
          <MethodsChapterHeader
            num="01"
            eyebrow="REAL-TIME THREE.JS CLINICAL TWIN"
            title="Holographic 3D Body Scanner &"
            goldAccent="Volumetric Anatomy HUD"
            subtitle="Interactive 3D holographic body mesh with sweeping cyan volumetric laser ring, dynamic cranial/cardiac/pelvic/dermal X-ray internal activation, dual counter-rotating tactical gauges, sweeping ECG oscilloscope & 3D beating heart."
          />

          <Suspense fallback={<div className="h-[520px] rounded-3xl bg-[#030916] border border-cyan-400/25 flex items-center justify-center font-mono text-xs text-cyan-300">Loading 3D Volumetric Scanner HUD...</div>}>
            <LazyHolographicBodyScanner3D
              onSelectModule={(slug) => {
                if (validKeys.has(slug as AiModuleKey)) {
                  setActiveModule(slug as AiModuleKey);
                  setSearchParams({ module: slug });
                }
              }}
            />
          </Suspense>
        </section>

        {/* CHAPTER 02: ALL 6 AUDITED MODEL DOSSIERS */}
        <section id="res-models" className="scroll-mt-28 space-y-6">
          <MethodsChapterHeader
            num="02"
            eyebrow="SIX CLINICAL AI TRACKS • AUDITED FINAL_LOCK"
            title="Inspect Every Model Dossier &"
            goldAccent="Provenance Proof"
            subtitle="Each card links directly to a dedicated per-model methodological dossier (/research/:slug) and operational workbench in Health Services."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SIX_RESEARCH_CARDS.map((card) => (
              <article key={card.slug} className="ss-sapphire-card rounded-3xl p-6 flex flex-col justify-between gap-4 hover:border-sky-400/60 transition">
                <div className="space-y-2.5">
                  <div className="font-mono text-[10px] uppercase tracking-wider font-bold" style={{ color: card.accent }}>
                    {card.arch}
                  </div>
                  <h3 className="text-lg font-bold text-white">{locale === "bn" ? card.titleBn : card.titleEn}</h3>
                  <div className="text-xs font-mono text-sky-200">{card.dataset}</div>
                  <div className="rounded-xl bg-[#040a18]/80 border border-white/10 px-3 py-2 font-mono text-xs font-bold text-[#f2c879]">
                    {card.metric}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{card.limitNote}</p>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
                  <Link
                    to={`/research/${card.slug}`}
                    className="flex-1 min-h-10 px-3.5 rounded-full bg-gradient-to-r from-[#818cf8] to-[#38bdf8] text-slate-950 font-bold text-xs inline-flex items-center justify-center gap-1"
                  >
                    Inspect Evidence <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    to={`/services?tool=${card.slug}`}
                    className="min-h-10 px-3 rounded-full border border-white/20 hover:bg-white/10 text-xs font-semibold inline-flex items-center"
                  >
                    Try Tool
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* CHAPTER 03: STICKY CLINICAL ARCHITECTURE STORY */}
        <section id="res-story" className="scroll-mt-28 space-y-6">
          <MethodsChapterHeader
            num="03"
            eyebrow="AGRISENSE STICKYFIELD STORY • SCROLL-LINKED NARRATIVE"
            title="How Raw Medical Data Becomes"
            goldAccent="Safe Clinical Intelligence"
            subtitle="Scroll through all six engineering safeguards from Rotterdam diagnostic separation and perceptual deduplication to SQLite HTTP 422 medication gates."
          />

          <StickyClinicalStory locale={locale} pauseMotion={motionPaused} />
        </section>

        {/* CHAPTER 04: FULL DIGITAL DATA & ANIMATED VISUAL GRAPH GALLERY */}
        <section id="res-graphs" className="scroll-mt-28 space-y-8">
          <MethodsChapterHeader
            num="04"
            eyebrow="DIGITAL TELEMETRY & DATA VISUALIZATION GALLERY"
            title="Interactive Benchmarks, Dials, Radars,"
            goldAccent="Pipelines & Cohort Matrices"
            subtitle="Every verified research dataset rendered through real-time 60fps gauges, interactive crosshairs, multi-axis radars, particle pipelines, error corridors, and 22-patient cohort matrices."
          />

          {/* 4.1 Digital Observatory Deck */}
          <DigitalObservatoryDeck
            badgeLabel="SHASTHOSETU AI AUDIT OBSERVATORY • 6 TRACKS"
            statusLabel={motionPaused ? "MOTION PAUSED (ACCESSIBLE)" : "60 FPS LIVE TELEMETRY"}
            cards={RESEARCH_DECK_CARDS}
            breakdownTitle="Audited Split Integrity & Clinical Governance Ratios"
            breakdownBars={[
              { name: "M01 PCOS Holdout", pct: 94.44, valueLabel: "94.44% Bal Acc", color: "#38bdf8", note: "17/18 holdout • 70 dev CV" },
              { name: "M02 Ultrasound Test", pct: 86.67, valueLabel: "86.67% (39/45)", color: "#2dd4bf", note: "299 pHash unique scans" },
              { name: "M03 Rash Leak-Free", pct: 84.65, valueLabel: "84.65% (0% Leak)", color: "#818cf8", note: "755 source photo families" },
              { name: "M04 Safe-OCR Guard", pct: 100.0, valueLabel: "100% 422 Enforced", color: "#f2c879", note: "992/1,000 admitted corpus" },
            ]}
            pauseMotion={motionPaused}
          />

          {/* 4.2 Interactive Horizontal Bar Comparison */}
          <InteractiveBarGraph
            title="Cross-Module Audited Benchmark Summary vs 85% Research Threshold"
            subtitle="Hover any bar to inspect exact FINAL_LOCK verified accuracy / script fidelity scores across all six modules."
            thresholdValue={85}
            thresholdLabel="Gold Line: 85% Reference"
            pauseMotion={motionPaused}
            items={[
              { label: "M01 • PCOS Clinical (XGBoost Holdout)", sublabel: "N=88 Cohort", value: 94.44, displayValue: "94.44% Bal Acc", color: "#38bdf8" },
              { label: "M01 • PCOS Clinical (5-Fold CV)", sublabel: "70 Dev Samples", value: 88.57, displayValue: "88.57% CV Acc", color: "#2dd4bf" },
              { label: "M02 • PCOS Ultrasound (ResNet18)", sublabel: "299 Unique Scans", value: 86.67, displayValue: "86.67% (39/45)", color: "#22d3ee" },
              { label: "M03 • Viral Rash Grouped (ResNet18)", sublabel: "755 Families • 0% Leak", value: 84.65, displayValue: "84.65% Val Acc", color: "#818cf8" },
              { label: "M05 • Bangla Voice (Whisper-Small-BN)", sublabel: "26 FLEURS Clips", value: 98.37, displayValue: "98.37% BN Script (39.09% WER)", color: "#c084fc" },
              { label: "M06 • DermoPed (EXP_B 4-Pt Test)", sublabel: "Severe N=22 Caveat", value: 92.73, displayValue: "92.73% Img (75% Pt)", color: "#34d399" },
            ]}
          />

          {/* 4.3 Semi-Circle Risk Dial + 6-Axis Hexagonal Morphology Radar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <SemiCircleRiskDial presets={PCOS_DIAL_PRESETS} pauseMotion={motionPaused} />
            <HexRadarTaxonomyChart pauseMotion={motionPaused} />
          </div>

          {/* 4.4 PCOS Sparkline KPI Strip */}
          <SparklineKpiStrip items={PCOS_SPARKLINE_ITEMS} pauseMotion={motionPaused} />

          {/* 4.5 Animated EasyOCR -> HTTP 422 Clinical Particle Pipeline */}
          <AnimatedClinicalPipeline pauseMotion={motionPaused} />

          {/* 4.6 Bangla Voice Error Corridor + 22-Patient DermoPed Cohort Waffle Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <UncertaintyTrendCurveChart pauseMotion={motionPaused} />
            <CohortWaffleMatrixChart />
          </div>
        </section>

        {/* CHAPTER 05: INTERACTIVE EQUATION & FORMULA EXPLORER */}
        <section id="res-equations" className="scroll-mt-28 space-y-6">
          <MethodsChapterHeader
            num="05"
            eyebrow="FORMAL METRICS & SAFETY PREDICATES"
            title="Clinical AI Equations &"
            goldAccent="Worked Proof Calculations"
            subtitle="Inspect the exact mathematical definitions governing PCOS balanced accuracy, perceptual scan deduplication, source-family leakage detection, SQLite HTTP 422 gates, ASR WER, and Blood Connect Haversine matching."
          />

          <ClinicalEquationExplorer locale={locale} />
        </section>

        {/* CHAPTER 06: RECONCILED DATASETS & FULL 16-MODEL SHA-256 REGISTER */}
        <section id="res-register" className="scroll-mt-28 space-y-6">
          <MethodsChapterHeader
            num="06"
            eyebrow="FINAL_RESEARCH_MODEL_REGISTER • FROZEN SHA-256 INVENTORY"
            title="Reconciled Datasets &"
            goldAccent="16-Checkpoint Audit Ledger"
            subtitle="Live backend query to `/v1/public/research` displaying every reconciled dataset count and cryptographically hashed local model checkpoint."
          />

          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(data?.datasets || []).map((ds) => (
                  <div key={ds.module} className="ss-sapphire-card rounded-2xl p-5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-sm text-white inline-flex items-center gap-1.5">
                        <Database className="w-4 h-4 text-[#38bdf8]" /> {ds.module}
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200">
                        {ds.scientific_classification}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{ds.dataset_or_scope}</p>
                    <div className="text-xs font-mono font-bold text-emerald-300">Reconciled: {ds.reconciled_count}</div>
                    <p className="text-xs text-slate-400 pt-2 border-t border-white/10">{ds.limitations}</p>
                  </div>
                ))}
              </div>

              <div className="ss-sapphire-card rounded-3xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <FileCheck2 className="w-5 h-5 text-[#2dd4bf]" /> All 16 Audited Models (FINAL_RESEARCH_MODEL_REGISTER)
                  </h3>
                  <span className="font-mono text-xs text-slate-400">{(data?.models || []).length} models verified</span>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#040a18]/75">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-white/5 text-slate-400 uppercase font-mono">
                      <tr>
                        <th className="p-3">ID</th>
                        <th className="p-3">Module</th>
                        <th className="p-3">Architecture</th>
                        <th className="p-3">Metric Value</th>
                        <th className="p-3">Classification</th>
                        <th className="p-3">SHA-256</th>
                        <th className="p-3">Audit Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.models || []).map((m) => (
                        <tr key={m.model_id} className="border-t border-white/10 hover:bg-white/5">
                          <td className="p-3 font-mono font-semibold text-sky-300">{m.model_id}</td>
                          <td className="p-3">{m.module}</td>
                          <td className="p-3 text-white">{m.architecture}</td>
                          <td className="p-3 font-mono font-semibold text-[#f2c879]">{m.primary_metric_value}</td>
                          <td className="p-3 text-slate-300">{m.scientific_classification}</td>
                          <td className="p-3 font-mono text-[10px] text-slate-400">
                            {m.sha256_hash ? `${m.sha256_hash.slice(0, 12)}...` : "N/A"}
                          </td>
                          <td className="p-3 font-mono text-[11px]">{m.audit_status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>

        {/* CHAPTER 07: HONEST LIMITS & INTERACTIVE BILINGUAL SCIENTIFIC QUIZ */}
        <section id="res-quiz" className="scroll-mt-28 space-y-6">
          <MethodsChapterHeader
            num="07"
            eyebrow="NON-DIAGNOSTIC GOVERNANCE & AGRISENSE LEARN WORKSHEET"
            title="Honest Limitations &"
            goldAccent="Bilingual Scientific Quiz"
            subtitle="Openly disclosed boundaries protect patients from over-claimed AI outputs. Test your grasp of the audit findings with live scoring and printable worksheet export."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { code: "QUARANTINED • M03 99.10%", title: "Viral Rash Leaky Random Split Excluded", desc: "686/755 source-photo families leaked across train/test splits in legacy checkpoints. Replaced cleanly with 755-family grouped split (84.65% Val Img Acc, 0% overlap).", tone: "text-rose-300" },
              { code: "HTTP 422 CHECK GATE • M04", title: "Safe Prescription OCR Human Lockout", desc: "Normalized SQLite constraint & FastAPI guard forbid automatic medication reminder activation without human verification of medicine, dose, and frequency (CER/WER marked NOT_VALIDATED).", tone: "text-[#f2c879]" },
              { code: "SEVERE IMBALANCE • M06", title: "DermoPed 22-Patient Cohort Caveat", desc: "Locally verified subset spans 19 Chickenpox and only 3 Pediculosis patients (pt72 train, pt71 val, pt74 test). EXP_B SHA-256 verified, never used clinically alone.", tone: "text-amber-300" },
              { code: "PHASE G DEFERRED • AI-01 / AI-02", title: "Bangla Voice & RAG Chatbot Gated", desc: "Whisper-Small-BN achieved 98.37% Bengali script vs 39.09% WER on 26 FLEURS clips; live conversational voice/RAG remains deferred pending abstention safety suite.", tone: "text-purple-300" },
            ].map((b) => (
              <div key={b.code} className="ss-sapphire-card rounded-3xl p-6 space-y-2.5">
                <span className={`font-mono text-xs font-bold inline-flex items-center gap-1.5 ${b.tone}`}>
                  <ShieldAlert className="w-3.5 h-3.5" /> {b.code}
                </span>
                <h3 className="text-lg font-bold text-white">{b.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>

          {/* Interactive Bilingual 4-Question Quiz with Score & Print Controls */}
          <div className="ss-sapphire-card rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="font-mono text-xs text-[#2dd4bf] uppercase">AGRISENSE-INSPIRED INTERACTIVE LEARN CHECK</span>
                <h3 className="text-2xl font-bold text-white">
                  {locale === "bn" ? "৪টি প্রশ্নে বৈজ্ঞানিক সীমাবদ্ধতা কুইজ" : "4-Question Clinical AI Rigor Self-Check"}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="min-h-10 px-4 rounded-full bg-emerald-500/15 border border-emerald-400/35 text-emerald-200 font-mono text-xs font-bold inline-flex items-center">
                  Score: {quizScore} / {SCIENTIFIC_QUIZ.length} ({quizAnsweredCount} answered)
                </span>
                <button
                  type="button"
                  onClick={() => setQuizAnswers({})}
                  className="min-h-10 px-3.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset Quiz
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="min-h-10 px-3.5 rounded-full bg-sky-400/15 hover:bg-sky-400/25 border border-sky-400/35 text-xs font-semibold text-sky-200 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Worksheet
                </button>
              </div>
            </div>

            <div className="space-y-5">
              {SCIENTIFIC_QUIZ.map((item, qIdx) => {
                const chosen = quizAnswers[qIdx];
                const isAnswered = chosen !== undefined;
                const isCorrect = chosen === item.correct;
                const opts = locale === "bn" ? item.optsBn : item.optsEn;
                return (
                  <div key={qIdx} className="rounded-2xl bg-[#040a18]/80 border border-white/15 p-5 space-y-3">
                    <div className="font-bold text-sm text-white">
                      {qIdx + 1}. {locale === "bn" ? item.qBn : item.qEn}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {opts.map((opt, oIdx) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setQuizAnswers((prev) => ({ ...prev, [qIdx]: oIdx }))}
                          className={`p-3 rounded-xl text-left text-xs border cursor-pointer transition ${
                            chosen === oIdx
                              ? oIdx === item.correct
                                ? "bg-emerald-500/20 border-emerald-400 text-emerald-100 font-bold"
                                : "bg-rose-500/20 border-rose-400 text-rose-100 font-bold"
                              : "bg-white/5 border-white/15 text-slate-300 hover:border-sky-400/50"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {isAnswered && (
                      <div className={`text-xs flex items-start gap-2 pt-1 ${isCorrect ? "text-emerald-300" : "text-amber-300"}`}>
                        {isCorrect ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                        <span>{item.whyEn}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CHAPTER 08: INTERACTIVE RESEARCH SANDBOX & PRESERVED PCOS PREVIEW CALCULATOR */}
        <section id="res-sandbox" className="scroll-mt-28 space-y-6">
          <MethodsChapterHeader
            num="08"
            eyebrow="INTERACTIVE MODEL SANDBOX • LIVE INFERENCE VERIFICATION"
            title="Run Saved Checkpoints &"
            goldAccent="Quick PCOS Research Index"
            subtitle="Test any of the 6 research checkpoints directly below, or jump to Health Services to stack all 6 workbenches operationally."
          />

          <div className="ss-sapphire-card rounded-3xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs text-sky-300 uppercase inline-flex items-center gap-1.5">
                <Cpu className="w-4 h-4" /> SELECT CHECKPOINT TO TEST IN SANDBOX
              </span>
              <Link to={`/services?tool=${activeModule}`} className="text-xs font-bold text-[#2dd4bf] hover:underline">
                Open {activeModule} in Health Services →
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {SIX_RESEARCH_CARDS.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => {
                    setActiveModule(c.slug);
                    setSearchParams({ module: c.slug });
                  }}
                  className={`px-3.5 py-2 rounded-full text-xs font-bold cursor-pointer transition ${
                    activeModule === c.slug
                      ? "bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950"
                      : "bg-white/10 text-slate-200 border border-white/15 hover:border-sky-400/50"
                  }`}
                >
                  {c.titleEn}
                </button>
              ))}
            </div>
          </div>

          <CyberScanWorkbench activeModule={activeModule} />

          <div className="ss-sapphire-card rounded-3xl p-6 space-y-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xl font-bold">Quick Non-Diagnostic PCOS Indicator Preview</h3>
              <TrustBadge kind="RESEARCH_ONLY" />
            </div>
            <form onSubmit={(e) => void runPreview(e)} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <label className="space-y-1 text-xs text-slate-300">
                <span>Age (yrs)</span>
                <input type="number" min={14} max={55} value={age} onChange={(e) => setAge(Number(e.target.value))} className="w-full min-h-11 rounded-xl border border-sky-400/25 bg-black/40 px-3 text-sm text-white" />
              </label>
              <label className="space-y-1 text-xs text-slate-300">
                <span>BMI (kg/m²)</span>
                <input type="number" step="0.1" min={12} max={55} value={bmi} onChange={(e) => setBmi(Number(e.target.value))} className="w-full min-h-11 rounded-xl border border-sky-400/25 bg-black/40 px-3 text-sm text-white" />
              </label>
              <label className="space-y-1 text-xs text-slate-300">
                <span>Cycle Length (days)</span>
                <input type="number" min={15} max={120} value={cycleDays} onChange={(e) => setCycleDays(Number(e.target.value))} className="w-full min-h-11 rounded-xl border border-sky-400/25 bg-black/40 px-3 text-sm text-white" />
              </label>
              <label className="space-y-1 text-xs text-slate-300">
                <span>LH / FSH Ratio</span>
                <input type="number" step="0.1" min={0.1} max={10} value={lhFsh} onChange={(e) => setLhFsh(Number(e.target.value))} className="w-full min-h-11 rounded-xl border border-sky-400/25 bg-black/40 px-3 text-sm text-white" />
              </label>
              <label className="flex items-center gap-2 text-sm min-h-11 cursor-pointer text-slate-200">
                <input type="checkbox" checked={irregular} onChange={(e) => setIrregular(e.target.checked)} className="w-4 h-4" />
                <span>Irregular Cycles</span>
              </label>
              <label className="flex items-center gap-2 text-sm min-h-11 cursor-pointer text-slate-200">
                <input type="checkbox" checked={androgen} onChange={(e) => setAndrogen(e.target.checked)} className="w-4 h-4" />
                <span>Acne / Hirsutism</span>
              </label>
              <div className="lg:col-span-2">
                <button type="submit" data-testid="run-pcos-preview-btn" className="min-h-11 px-6 rounded-xl bg-gradient-to-r from-[#818cf8] to-[#38bdf8] text-slate-950 font-bold text-sm cursor-pointer">
                  Compute Non-Diagnostic Research Index
                </button>
              </div>
            </form>
            {calcResult && (
              <div data-testid="pcos-preview-result" className="rounded-2xl border border-[#818cf8]/40 bg-[#0b1330]/80 p-4 space-y-1.5 text-xs">
                <div className="font-mono font-bold text-[#c7d2fe]">{calcResult.band} (Index: {calcResult.screening_index})</div>
                <p className="text-slate-200">{calcResult.disclaimer}</p>
              </div>
            )}
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
