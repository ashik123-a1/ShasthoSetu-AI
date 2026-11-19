import { Suspense, lazy, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Database,
  FileCheck2,
  FlaskConical,
  GitBranch,
  GraduationCap,
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
import { type AiModuleKey } from "../components/three/AiModuleScene3D";
import {
  DigitalObservatoryDeck,
  InteractiveBarGraph,
  type TelemetryDeckCard,
} from "../components/charts/AgriStyleTelemetry";
import {
  CohortWaffleMatrixChart,
  HexRadarTaxonomyChart,
  PCOS_DIAL_PRESETS,
  PCOS_SPARKLINE_ITEMS,
  SemiCircleRiskDial,
  SparklineKpiStrip,
  UncertaintyTrendCurveChart,
} from "../components/charts/VariedClinicalVisuals";
import {
  AllSystemsWorkflowPipelines,
  ClinicalEquationExplorer,
  MethodsChapterHeader,
  StickyClinicalStory,
} from "../components/research/ResearchMethodsWidgets";
import { McpArchitectureExplorer } from "../components/research/McpArchitectureExplorer";

const LazyHolographicBodyScanner3D = lazy(() =>
  import("../components/three/HolographicBodyScanner3D").then((m) => ({
    default: m.HolographicBodyScanner3D,
  }))
);

interface DatasetRecord {
  module: string;
  dataset_name: string;
  canonical_manifest_path: string;
  manifest_sha256_hash: string;
  total_units_raw: string;
  grouping_level: string;
  total_independent_groups: string;
  train_units: string;
  val_units: string;
  test_units: string;
  admissible_units: string;
  quarantined_units: string;
  cross_split_leakage_detected: string;
  reconciliation_notes: string;
}

interface ResearchPayload {
  audit_verdict: string;
  non_diagnostic_disclaimer_bn: string;
  non_diagnostic_disclaimer_en: string;
  datasets: DatasetRecord[];
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
    titleEn: "5. Bangla Voice AI (Live ASR + TTS)",
    titleBn: "৫. বাংলা ভয়েস এআই (লাইভ ASR ও TTS)",
    arch: "Whisper-Small-BN + Qwen2.5 RAG + MMS-TTS",
    dataset: "26 FLEURS Clips / 22 Unique Speakers",
    metric: "98.37% BN Unicode • 39.09% Norm WER",
    limitNote: "Live 3D Orb & mic transcription enabled in Health Services; FLEURS WER (39.09%) and mandatory user edit gate preserved.",
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

const MEDICAL_LITERACY_QUIZ = [
  {
    qEn: "Under the Rotterdam criteria, is an ovarian ultrasound scan alone enough to confirm PCOS?",
    qBn: "রটারডাম চিকিৎসা মানদণ্ড অনুযায়ী শুধু ওভারিয়ান আল্ট্রাসাউন্ড রিপোর্ট দিয়েই কি PCOS নিশ্চিত করা যায়?",
    optsEn: [
      "No — clinicians require at least 2 of 3 criteria (ovulatory dysfunction, androgen excess, or PCOM on ultrasound) plus ruling out mimics",
      "Yes — ultrasound follicle appearance by itself is always definitive without lab tests or symptoms",
      "Only if blood pressure exceeds 120/80 mmHg",
    ],
    optsBn: [
      "না — কমপক্ষে ৩টি মানদণ্ডের মধ্যে ২টি (অনিয়মিত ওভুলেশন, অ্যান্ড্রোজেন আধিক্য ও PCOM) এবং অন্য কারণ বাদ দিয়ে চিকিৎসক নিশ্চিত করেন",
      "হ্যাঁ — কোনো রক্ত পরীক্ষা বা উপসর্গ ছাড়াই শুধু আল্ট্রাসাউন্ডে নিশ্চিত হয়",
      "শুধুমাত্র রক্তচাপ ১২০/৮০ হলে নিশ্চিত হয়",
    ],
    correct: 0,
    whyEn: "Polycystic ovarian morphology can also appear in healthy young individuals; an OB-GYN correlates cycle history and serum hormones before diagnosis.",
    whyBn: "সুস্থ কমবয়সী নারীদের ক্ষেত্রেও PCOM দেখা যেতে পারে; তাই ঋতুস্রাবের ইতিহাস ও হরমোন পরীক্ষার সাথে মিলিয়ে গাইনোকলজিস্ট সিদ্ধান্ত নেন।",
  },
  {
    qEn: "Which warning sign in a child with fever and skin rash demands immediate emergency hospital care?",
    qBn: "জ্বর ও র‍্যাশে আক্রান্ত শিশুর কোন লক্ষণ দেখলে দেরি না করে জরুরি হাসপাতালে নেওয়া উচিত?",
    optsEn: [
      "Difficulty breathing, seizures, extreme lethargy, or non-blanching purple/red rash spots",
      "Slightly reduced appetite for a single afternoon while staying alert and hydrated",
      "Mild itchy rash with normal breathing and active playfulness",
    ],
    optsBn: [
      "শ্বাসকষ্ট, খিঁচুনি, অতিরিক্ত ঝিমুনি/অচেতন ভাব বা চামড়ায় চাপ দিলেও না মেশা বেগুনি-লাল দাগ",
      "একবেলা খাবারে অনীহা কিন্তু শিশু সতেজ ও পর্যাপ্ত পানি পান করছে",
      "হালকা চুলকানিসহ সাধারণ ফুসকুড়ি ও স্বাভাবিক শ্বাস-প্রশ্বাস",
    ],
    correct: 0,
    whyEn: "Respiratory distress, neurological changes, or petechial/non-blanching rashes signal life-threatening pediatric emergencies needing urgent ER assessment.",
    whyBn: "শ্বাসকষ্ট, খিঁচুনি বা non-blanching দাগ মারাত্মক সংক্রমণের জরুরি সতর্কসংকেত, যেখানে তাৎক্ষণিক জরুরি চিকিৎসা প্রয়োজন।",
  },
  {
    qEn: "Why must a patient verify every scanned prescription medicine name and dosage strength before taking medication?",
    qBn: "স্ক্যান বা ডিজিটাইজ করা প্রেসক্রিপশন দেখে ওষুধ খাওয়ার আগে ওষুধের নাম ও মাত্রা (যেমন 500 mg বনাম 50 mg) যাচাই করা জরুরি কেন?",
    optsEn: [
      "Handwriting ambiguity or decimal errors (e.g., 50 mg vs 500 mg) can cause dangerous overdoses or wrong-drug intake unless checked against the original Rx",
      "Prescription OCR automatically adjusts antibiotic duration better than a pharmacist",
      "Higher dosage milligrams always heal faster",
    ],
    optsBn: [
      "হাতের লেখার অস্পষ্টতা বা মাত্রার ভুলে (যেমন 50 mg এর জায়গায় 500 mg) মারাত্মক ওভারডোজ বা ভুল ওষুধ সেবনের ঝুঁকি থাকে",
      "ডিজিটাল স্ক্যানার ফার্মাসিস্টের চেয়েও ভালোভাবে অ্যান্টিবায়োটিক মাত্রা বদলে দিতে পারে",
      "বেশি মিলিগ্রামের ওষুধ সবসময় দ্রুত কাজ করে",
    ],
    correct: 0,
    whyEn: "Illegible physician script and similar sound-alike drug names are top causes of preventable medication harm; human confirmation prevents dosage mistakes.",
    whyBn: "অস্পষ্ট হাতের লেখা ও কাছাকাছি নামের ওষুধ ভুলের অন্যতম প্রধান কারণ; তাই মূল প্রেসক্রিপশন ও ফার্মাসিস্টের সাথে মিলিয়ে যাচাই করা নিরাপদ।",
  },
  {
    qEn: "After matching a willing A+ blood donor nearby, what hospital step is still mandatory before transfusion?",
    qBn: "কাছাকাছি একই গ্রুপের (যেমন A+) রক্তদাতা খুঁজে পাওয়ার পরও রক্ত পরিসঞ্চালনের আগে হাসপাতালে কোন ধাপটি বাধ্যতামূলক?",
    optsEn: [
      "Full laboratory ABO/Rh verification, infectious screening (HBV, HCV, HIV, Malaria, Syphilis), and direct compatibility cross-matching",
      "Immediate transfusion without lab testing if both donor and patient are healthy",
      "Counting 90 calendar days alone guarantees donor safety and compatibility",
    ],
    optsBn: [
      "ল্যাবে পুনরায় ABO/Rh গ্রুপ পরীক্ষা, সংক্রমণ স্ক্রিনিং (HBV, HCV, HIV, ম্যালেরিয়া, সিফিলিস) এবং সরাসরি ক্রস-ম্যাচিং",
      "উভয়েই সুস্থ থাকলে ল্যাব পরীক্ষা ছাড়াই সরাসরি রক্ত দেওয়া",
      "শুধুমাত্র ৯০ দিন পার হলেই রক্ত নিরাপদ ও ম্যাচকৃত প্রমাণিত হয়",
    ],
    correct: 0,
    whyEn: "Digital group labels only coordinate donors; only a licensed hospital blood bank can verify minor antibodies, TTI screening, and donor eligibility safely.",
    whyBn: "ডিজিটাল ম্যাচিং কেবল দাতা খুঁজতে সাহায্য করে; নিরাপদ পরিসঞ্চালনের জন্য হাসপাতালের ব্লাড ব্যাংকে স্ক্রিনিং ও ক্রস-ম্যাচিং অপরিহার্য।",
  },
  {
    qEn: "Which supportive care practice is safest when a child is suspected of having Chickenpox (Varicella)?",
    qBn: "শিশুর চিকেনপক্স (জলবসন্ত) সন্দেহ হলে বাড়িতে প্রাথমিক যত্নে কোনটি সবচেয়ে নিরাপদ করণীয়?",
    optsEn: [
      "Consult a pediatrician, keep fingernails clean to prevent skin infection, maintain hydration, and strictly avoid Aspirin in children",
      "Give pediatric Aspirin tablets every 6 hours to lower fever rapidly",
      "Pop every fluid blister manually and share towels across family members",
    ],
    optsBn: [
      "শিশু চিকিৎসকের পরামর্শ নেওয়া, ফোস্কা না চুলকে পরিষ্কার রাখা, পর্যাপ্ত তরল খাওয়ানো এবং শিশুদের কখনোই অ্যাসপিরিন (Aspirin) না দেওয়া",
      "জ্বর দ্রুত কমাতে প্রতি ৬ ঘণ্টায় শিশুকে অ্যাসপিরিন দেওয়া",
      "হাত দিয়ে সব ফোস্কা ফাটিয়ে দেওয়া ও সবার সাথে একই তোয়ালে ব্যবহার করা",
    ],
    correct: 0,
    whyEn: "Aspirin during pediatric viral illnesses (especially Varicella) carries Reye syndrome risk; scratching blisters promotes secondary bacterial infection.",
    whyBn: "ভাইরাল অসুস্থতায় শিশুকে অ্যাসপিরিন দিলে বিরল ও বিপজ্জনক রেয় সিনড্রোম (Reye syndrome) হতে পারে এবং ফোস্কা ফাটালে ব্যাকটেরিয়াল সংক্রমণ ছড়ায়।",
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
    icon: ShieldAlert,
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
  { id: "res-graphs", label: "04. Graphs & 5 Workflows", icon: Activity },
  { id: "res-equations", label: "05. Equations & Formulas", icon: Sigma },
  { id: "res-register", label: "06. Datasets & Ledger", icon: Database },
  { id: "res-quiz", label: "07. Limits & Medical Quiz", icon: GraduationCap },
  { id: "res-sandbox", label: "08. Quick PCOS Index", icon: FlaskConical },
];

function scrollToChapter(id: string) {
  if (typeof document === "undefined") return;
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function PublicResearchPage() {
  const { locale } = useI18n();
  const { motionPaused } = usePreferences();

  const [data, setData] = useState<ResearchPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLedger, setShowLedger] = useState(false);

  // Quick PCOS Index (preserved cleanly)
  const [age, setAge] = useState(25);
  const [bmi, setBmi] = useState(26.2);
  const [cycleDays, setCycleDays] = useState(42);
  const [lhFsh, setLhFsh] = useState(2.2);
  const [irregular, setIrregular] = useState(true);
  const [androgen, setAndrogen] = useState(true);
  const [calcResult, setCalcResult] = useState<PcosPreviewResult | null>(null);

  // Medical Quiz Answers
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});

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
  const quizScore = MEDICAL_LITERACY_QUIZ.reduce((acc, q, idx) => (quizAnswers[idx] === q.correct ? acc + 1 : acc), 0);

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
                      3D Body Scanner, 5 Workflows &amp; Proofs
                    </span>
                  </>
                )}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {locale === "bn"
                  ? "নিচে স্ক্রল করলেই পাচ্ছেন রিয়েল-টাইম ৩ডি বডি স্ক্যানার ও হৃদপিণ্ড অ্যানিমেশন, সব মডেলের ডোজিয়ার, ৫টি সিস্টেমের পূর্ণাঙ্গ ওয়ার্কফ্লো, গ্রাফ, সমীকরণ ও মেডিকেল-সুরক্ষা কুইজ।"
                  : "All 8 chapters stream cleanly down the page: 3D Volumetric Body & Heart HUD, 6 audited dossiers, sticky architecture story, visual graph gallery + all 5 clinical system workflows, equations, reconciled datasets, 5-question medical quiz & quick PCOS index."}
              </p>
            </div>

            <Link
              to="/services#section-ai-tools"
              className="min-h-11 px-5 rounded-full bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shrink-0"
            >
              Use All 6 AI Tools Live in Health Services <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

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
            <LazyHolographicBodyScanner3D />
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

        {/* CHAPTER 04: FULL DIGITAL DATA, ALL 5 WORKFLOWS & ANIMATED VISUAL GRAPH GALLERY */}
        <section id="res-graphs" className="scroll-mt-28 space-y-8">
          <MethodsChapterHeader
            num="04"
            eyebrow="DIGITAL TELEMETRY, 5 SYSTEM WORKFLOWS & GRAPH GALLERY"
            title="Interactive Benchmarks, Dials, Radars &"
            goldAccent="All 5 End-to-End Workflows"
            subtitle="Explore animated 60fps gauges, radar coverage, Whisper error corridors, 22-patient cohort matrices, and full end-to-end particle pipelines across all 5 clinical systems."
          />

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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <SemiCircleRiskDial presets={PCOS_DIAL_PRESETS} pauseMotion={motionPaused} />
            <HexRadarTaxonomyChart pauseMotion={motionPaused} />
          </div>

          <SparklineKpiStrip items={PCOS_SPARKLINE_ITEMS} pauseMotion={motionPaused} />

          {/* ALL 5 SYSTEM END-TO-END WORKFLOW PIPELINES (No Single-OCR Duplicate) */}
          <AllSystemsWorkflowPipelines pauseMotion={motionPaused} />

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

        {/* CHAPTER 06: RECONCILED DATASETS (FIXED SCHEMA) & COLLAPSIBLE 16-MODEL LEDGER */}
        <section id="res-register" className="scroll-mt-28 space-y-6">
          <MethodsChapterHeader
            num="06"
            eyebrow="FINAL_RESEARCH_MODEL_REGISTER • FROZEN SHA-256 INVENTORY"
            title="Reconciled Datasets &"
            goldAccent="Optional 16-Checkpoint Ledger"
            subtitle="All 6 dataset cards render live schema metrics from `/v1/public/research` (`dataset_name`, `total_units_raw`, splits, admissible vs quarantined & SHA-256), followed by a collapsible judge audit ledger."
          />

          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(data?.datasets || []).map((ds) => {
                  const leakFree = String(ds.cross_split_leakage_detected).toLowerCase() === "false";
                  return (
                    <div key={ds.module} className="ss-sapphire-card rounded-2xl p-5 flex flex-col justify-between gap-3">
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-sm text-white inline-flex items-center gap-1.5">
                            <Database className="w-4 h-4 text-[#38bdf8] shrink-0" />
                            <span>{ds.module}</span>
                          </h3>
                          <span
                            className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full shrink-0 border ${
                              leakFree
                                ? "bg-emerald-500/15 border-emerald-400/35 text-emerald-200"
                                : "bg-amber-500/15 border-amber-400/35 text-amber-200"
                            }`}
                          >
                            {leakFree ? "0% LEAK VERIFIED" : "CHECK AUDIT"}
                          </span>
                        </div>

                        <div className="text-xs font-semibold text-sky-200">{ds.dataset_name}</div>

                        <div className="rounded-xl bg-[#040a18]/80 border border-white/10 p-2.5 space-y-1 font-mono text-[11px]">
                          <div className="text-emerald-300 font-bold">
                            {ds.total_units_raw} • {ds.total_independent_groups} groups
                          </div>
                          <div className="text-slate-300 text-[10px]">
                            Grouping: {ds.grouping_level}
                          </div>
                          <div className="text-[#f2c879] text-[10px]">
                            Admissible: {ds.admissible_units} • Quarantined: {ds.quarantined_units}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono text-center">
                          <div className="rounded-lg bg-white/5 border border-white/10 p-1.5">
                            <div className="text-slate-400">TRAIN</div>
                            <div className="text-sky-200 truncate" title={ds.train_units}>{ds.train_units}</div>
                          </div>
                          <div className="rounded-lg bg-white/5 border border-white/10 p-1.5">
                            <div className="text-slate-400">VAL</div>
                            <div className="text-teal-200 truncate" title={ds.val_units}>{ds.val_units}</div>
                          </div>
                          <div className="rounded-lg bg-white/5 border border-white/10 p-1.5">
                            <div className="text-slate-400">TEST</div>
                            <div className="text-indigo-200 truncate" title={ds.test_units}>{ds.test_units}</div>
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-400 pt-2 border-t border-white/10 leading-relaxed">
                        {ds.reconciliation_notes}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Summary Strip + Collapsible 16-Model SHA-256 Register */}
              <div className="ss-sapphire-card rounded-3xl p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                      <FileCheck2 className="w-5 h-5 text-[#2dd4bf]" /> Checkpoint Provenance Summary (Optional Judge Audit Table)
                    </h3>
                    <p className="text-xs text-slate-300">
                      6 active research models, legacy baseline comparisons, and 2 quarantined leaky checkpoints — expandable on demand so page scrolling stays effortless.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowLedger((v) => !v)}
                    className="min-h-11 px-4 rounded-full bg-white/10 hover:bg-white/15 border border-sky-400/40 text-xs font-bold text-sky-200 inline-flex items-center gap-2 cursor-pointer shrink-0"
                  >
                    {showLedger ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {showLedger
                      ? "Hide 16-Model SHA-256 Register"
                      : `Inspect Full 16-Model SHA-256 Register (${(data?.models || []).length} rows)`}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                  <div className="rounded-xl bg-[#040a18]/80 border border-white/10 p-3">
                    <div className="text-[10px] text-slate-400">AUDITED ENTRIES</div>
                    <div className="text-lg font-bold text-sky-300">{(data?.models || []).length}</div>
                  </div>
                  <div className="rounded-xl bg-[#040a18]/80 border border-white/10 p-3">
                    <div className="text-[10px] text-slate-400">SERVING TRACKS</div>
                    <div className="text-lg font-bold text-emerald-300">5 Live + 1 Phase G</div>
                  </div>
                  <div className="rounded-xl bg-[#040a18]/80 border border-white/10 p-3">
                    <div className="text-[10px] text-slate-400">QUARANTINED LEAKY</div>
                    <div className="text-lg font-bold text-rose-300">2 Excluded</div>
                  </div>
                  <div className="rounded-xl bg-[#040a18]/80 border border-white/10 p-3">
                    <div className="text-[10px] text-slate-400">PROVENANCE AUDIT</div>
                    <div className="text-lg font-bold text-[#f2c879]">SHA-256 Verified</div>
                  </div>
                </div>

                {showLedger && (
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
                              {m.sha256_hash && m.sha256_hash !== "N/A" ? `${m.sha256_hash.slice(0, 12)}...` : "N/A"}
                            </td>
                            <td className="p-3 font-mono text-[11px]">{m.audit_status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        {/* CHAPTER 07: HONEST LIMITS & 5-QUESTION MEDICAL HEALTH LITERACY QUIZ */}
        <section id="res-quiz" className="scroll-mt-28 space-y-6">
          <MethodsChapterHeader
            num="07"
            eyebrow="NON-DIAGNOSTIC GOVERNANCE & PATIENT HEALTH EDUCATION"
            title="Clinical Safety Boundaries &"
            goldAccent="5-Question Medical Literacy Quiz"
            subtitle="Understand essential clinical triage boundaries—from Rotterdam PCOS criteria and pediatric danger signs to safe dosage checks, hospital blood cross-matching, and varicella care."
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

          <div className="ss-sapphire-card rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="font-mono text-xs text-[#2dd4bf] uppercase">BILINGUAL MEDICAL SAFETY &amp; TRIAGE LITERACY CHECK</span>
                <h3 className="text-2xl font-bold text-white">
                  {locale === "bn" ? "৫টি প্রশ্নে মেডিকেল ও স্বাস্থ্য-নিরাপত্তা কুইজ" : "5-Question Medical Safety & Health Literacy Self-Check"}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="min-h-10 px-4 rounded-full bg-emerald-500/15 border border-emerald-400/35 text-emerald-200 font-mono text-xs font-bold inline-flex items-center">
                  Score: {quizScore} / {MEDICAL_LITERACY_QUIZ.length} ({quizAnsweredCount} answered)
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
              {MEDICAL_LITERACY_QUIZ.map((item, qIdx) => {
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
                          className={`p-3 rounded-xl text-left text-xs border cursor-pointer transition leading-relaxed ${
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
                        <span>{locale === "bn" ? item.whyBn : item.whyEn}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CHAPTER 08: QUICK PCOS INDEX CALCULATOR + LINK TO HEALTH SERVICES WORKBENCHES (NO DUPLICATE WORKBENCH) */}
        <section id="res-sandbox" className="scroll-mt-28 space-y-6">
          <MethodsChapterHeader
            num="08"
            eyebrow="NON-DIAGNOSTIC RESEARCH INDEX • LIVE TOOLS IN HEALTH SERVICES"
            title="Quick PCOS Indicator Preview &"
            goldAccent="Live Inference Workspace"
            subtitle="All 6 interactive AI upload & inference workbenches live cleanly inside Health Services (without duplication). Run the quick PCOS research index below or jump straight to the live studio tools."
          />

          <div className="ss-sapphire-card rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-sky-400/35">
            <div className="space-y-1">
              <div className="font-mono text-xs text-sky-300 uppercase">OPERATIONAL WORKSPACE • ZERO DUPLICATION</div>
              <p className="text-sm text-slate-200">
                Upload ultrasound images, skin rash photos, prescription PDFs, or 20-feature clinical profiles directly in Health Services.
              </p>
            </div>
            <Link
              to="/services#section-ai-tools"
              className="min-h-11 px-6 rounded-full bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shrink-0"
            >
              Open All 6 Live AI Tools in Health Services <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

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

        {/* CHAPTER 09: SHASTHOSETU MCP ARCHITECTURE & LIVE SERVER HUB */}
        <section id="res-mcp" className="scroll-mt-28 space-y-6">
          <MethodsChapterHeader
            num="09"
            eyebrow="MODEL CONTEXT PROTOCOL (MCP) • BUILT 3 + USED 3+ + ARCHITECTURE"
            title="Live ShasthoSetu MCP Hub &"
            goldAccent="Zero-PHI Tool Governance"
            subtitle="Explore and invoke ShasthoSetu's 3 custom-built MCP servers (guideline-mcp, directory-mcp, care-record-mcp) alongside official public MCP integrations (filesystem, memory, sequential-thinking, cloudcamp-bd) with Stdio/SSE/HTTP transports and strict RBAC."
          />
          <McpArchitectureExplorer />
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
