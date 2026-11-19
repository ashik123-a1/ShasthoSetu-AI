import { Suspense, lazy, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Database,
  FileCheck2,
  FlaskConical,
  GitBranch,
  GraduationCap,
  Layers,
  Lock,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { apiGet, apiPost } from "../lib/apiClient";
import { useI18n } from "../lib/i18n";
import { PublicFloatingHeader } from "../components/layout/PublicFloatingHeader";
import { PublicFooter } from "../components/layout/PublicFooter";
import { PageBackdropLayer } from "../components/layout/PageBackdropLayer";
import { Skeleton, TrustBadge } from "../components/ui";
import { CyberScanWorkbench } from "../components/ai/CyberScanWorkbench";
import { type AiModuleKey } from "../components/three/AiModuleScene3D";

const LazyAiModuleScene3D = lazy(() =>
  import("../components/three/AiModuleScene3D").then((m) => ({ default: m.AiModuleScene3D }))
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
    optsEn: ["Only 3 Pediculosis patients (pt72/71/74) exist locally (15.0% validation recall)", "100% Pediculosis generalization verified across Bangladesh", "Live audio clips failed"],
    optsBn: ["লোকাল ডেটাসেটে মাত্র ৩ জন Pediculosis রোগী (pt72/71/74) আছেন এবং ভ্যালিডেশন রিকল ১৫%", "সারাদেশে ১০০% সাধারণীকরণ নিশ্চিত", "অডিও ক্লিপ ব্যর্থ হয়েছে"],
    correct: 0,
    whyEn: "Transparently disclosing cohort imbalance (19 Chickenpox vs 3 Pediculosis) prevents misleading claims.",
  },
];

type MethodsTab = "models" | "methods" | "comparisons" | "proofs" | "learn" | "sandbox";

export function PublicResearchPage() {
  const { locale } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialParam = searchParams.get("module") as AiModuleKey | null;
  const validKeys = new Set<AiModuleKey>(["pcos-clinical", "pcos-ultrasound", "viral-rash", "prescription-ocr", "bangla-voice", "dermoped"]);

  const [tab, setTab] = useState<MethodsTab>(initialParam ? "sandbox" : "models");
  const [activeModule, setActiveModule] = useState<AiModuleKey>(
    initialParam && validKeys.has(initialParam) ? initialParam : "viral-rash"
  );
  const [scanning, setScanning] = useState(false);
  const [lastConfidence, setLastConfidence] = useState<number | null>(null);

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

  return (
    <div className="ss-sapphire-always relative min-h-screen flex flex-col pt-24 overflow-x-clip text-white" data-testid="ai-research-methods-page">
      <PageBackdropLayer imageSrc="/images/backgrounds/bg-ai-research.jpg" />
      <PublicFloatingHeader transparentHero />

      <main className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 pb-16 space-y-8 flex-1">
        {/* Top Banner: Separated Clearly from Health Services Tool Usage */}
        <section className="ss-sapphire-card rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
            <div className="space-y-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#38bdf8]">
                  AI &amp; RESEARCH • METHODS, EVIDENCE &amp; REPRODUCIBILITY
                </span>
                <TrustBadge kind="RESEARCH_ONLY" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold">
                {locale === "bn" ? (
                  <>
                    মডেল মেথডোলজি,{" "}
                    <span className="bg-gradient-to-r from-[#38bdf8] via-[#2dd4bf] to-[#f2c879] bg-clip-text text-transparent">
                      নিরীক্ষিত ডেটাসেট ও এক্সপেরিমেন্ট প্রমাণ
                    </span>
                  </>
                ) : (
                  <>
                    Methods &amp; Learn:{" "}
                    <span className="bg-gradient-to-r from-[#38bdf8] via-[#2dd4bf] to-[#f2c879] bg-clip-text text-transparent">
                      Audited Datasets, Splits &amp; Proofs
                    </span>
                  </>
                )}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {locale === "bn"
                  ? "এখানে দেখুন প্রতিটি মডেল কীভাবে তৈরি হয়েছে, স্প্লিট লিকেজ কীভাবে ঠেকানো হয়েছে এবং সীমাবদ্ধতা কী কী। মডেল সরাসরি ব্যবহার করতে চাইলে Health Services ট্যাবে যান।"
                  : "Audited evidence room modeled after AgriSense Methods & Learn: inspect reconciled datasets, split-leakage quarantine proofs, SHA-256 checkpoints, and clinical limitations."}
              </p>
            </div>

            <Link
              to="/services#section-ai-tools"
              className="min-h-11 px-5 rounded-full bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shrink-0"
            >
              Use AI Tools Live in Health Services <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 6 AgriSense Methods & Learn Navigation Pills */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
            {(
              [
                ["models", "1. All 6 Model Dossiers", BookOpen],
                ["methods", "2. Datasets & Split Methods", GitBranch],
                ["comparisons", "3. Model Register & SHA-256", Layers],
                ["proofs", "4. Honest Limits & Barriers", ShieldAlert],
                ["learn", "5. Bilingual Scientific Quiz", GraduationCap],
                ["sandbox", "6. Interactive Research Lab", FlaskConical],
              ] as const
            ).map(([k, label, Icon]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`min-h-10 px-4 rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition ${
                  tab === k
                    ? "bg-white text-slate-950 shadow"
                    : "bg-white/10 hover:bg-white/15 text-slate-200 border border-white/15"
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <Skeleton className="h-72 w-full" />
        ) : tab === "models" ? (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SIX_RESEARCH_CARDS.map((card) => (
              <article key={card.slug} className="ss-sapphire-card rounded-3xl p-6 flex flex-col justify-between gap-4 hover:border-sky-400/60 transition">
                <div className="space-y-2.5">
                  <div className="font-mono text-[10px] uppercase tracking-wider" style={{ color: card.accent }}>
                    {card.arch}
                  </div>
                  <h2 className="text-lg font-bold text-white">{locale === "bn" ? card.titleBn : card.titleEn}</h2>
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
          </section>
        ) : tab === "methods" ? (
          <section className="space-y-5">
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
          </section>
        ) : tab === "comparisons" ? (
          <section className="ss-sapphire-card rounded-3xl p-6 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-[#2dd4bf]" /> All 16 Audited Models (FINAL_RESEARCH_MODEL_REGISTER)
            </h2>
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#040a18]/75">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-white/5 text-slate-400 uppercase font-mono">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Module</th>
                    <th className="p-3">Architecture</th>
                    <th className="p-3">Metric Value</th>
                    <th className="p-3">Classification</th>
                    <th className="p-3">Audit Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.models || []).map((m) => (
                    <tr key={m.model_id} className="border-t border-white/10">
                      <td className="p-3 font-mono font-semibold text-sky-300">{m.model_id}</td>
                      <td className="p-3">{m.module}</td>
                      <td className="p-3 text-white">{m.architecture}</td>
                      <td className="p-3 font-mono font-semibold text-[#f2c879]">{m.primary_metric_value}</td>
                      <td className="p-3 text-slate-300">{m.scientific_classification}</td>
                      <td className="p-3 font-mono text-[11px]">{m.audit_status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : tab === "proofs" ? (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { code: "QUARANTINED • M03 99.10%", title: "Viral Rash Leaky Random Split Excluded", desc: "686/755 source-photo families leaked across train/test splits in legacy checkpoints. Replaced cleanly with 755-family grouped split (84.65% Val Img Acc, 0% overlap).", tone: "text-rose-300" },
              { code: "HTTP 422 CHECK GATE • M04", title: "Safe Prescription OCR Human Lockout", desc: "Normalized SQLite constraint & FastAPI guard forbid automatic medication reminder activation without human verification of medicine, dose, and frequency (CER/WER marked NOT_VALIDATED).", tone: "text-[#f2c879]" },
              { code: "SEVERE IMBALANCE • M06", title: "DermoPed 22-Patient Cohort Caveat", desc: "Locally verified subset spans 19 Chickenpox and only 3 Pediculosis patients (pt72 train, pt71 val, pt74 test). EXP_B SHA-256 verified, never used clinically alone.", tone: "text-amber-300" },
              { code: "PHASE G DEFERRED • AI-01 / AI-02", title: "Bangla Voice & RAG Chatbot Gated", desc: "Whisper-Small-BN achieved 98.37% Bengali script vs 39.09% WER on 26 FLEURS clips; live conversational voice/RAG remains deferred pending abstention safety suite.", tone: "text-purple-300" },
            ].map((b) => (
              <div key={b.code} className="ss-sapphire-card rounded-3xl p-6 space-y-2.5">
                <span className={`font-mono text-xs font-bold inline-flex items-center gap-1.5 ${b.tone}`}>
                  <Lock className="w-3.5 h-3.5" /> {b.code}
                </span>
                <h3 className="text-lg font-bold text-white">{b.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </section>
        ) : tab === "learn" ? (
          <section className="ss-sapphire-card rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <span className="font-mono text-xs text-[#2dd4bf] uppercase">AGRISENSE-INSPIRED INTERACTIVE LEARN CHECK</span>
              <h2 className="text-2xl font-bold">
                {locale === "bn" ? "৪টি প্রশ্নে বৈজ্ঞানিক সীমাবদ্ধতা কুইজ" : "4-Question Clinical AI Rigor Self-Check"}
              </h2>
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
          </section>
        ) : (
          /* TAB 6: INTERACTIVE RESEARCH SANDBOX & PRESERVED PCOS INDEX CALCULATOR */
          <section className="space-y-6">
            <div className="ss-sapphire-card rounded-3xl p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-7 space-y-3">
                <span className="font-mono text-xs text-sky-300 uppercase">RESEARCH SANDBOX • CHOOSE CHECKPOINT</span>
                <div className="flex flex-wrap gap-2">
                  {SIX_RESEARCH_CARDS.map((c) => (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => {
                        setActiveModule(c.slug);
                        setSearchParams({ module: c.slug });
                        setLastConfidence(null);
                      }}
                      className={`px-3.5 py-2 rounded-full text-xs font-bold cursor-pointer transition ${
                        activeModule === c.slug
                          ? "bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950"
                          : "bg-white/10 text-slate-200 border border-white/15"
                      }`}
                    >
                      {c.titleEn}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-300">
                  Tip: Operational user tools also run cleanly inside <Link to="/services#section-ai-tools" className="text-sky-300 underline font-semibold">Health Services → AI Tools</Link>.
                </p>
              </div>
              <div className="lg:col-span-5 h-[220px]">
                <Suspense fallback={<div className="w-full h-full rounded-2xl bg-[#040a18]" />}>
                  <LazyAiModuleScene3D moduleKey={activeModule} scanning={scanning} confidence={lastConfidence} />
                </Suspense>
              </div>
            </div>

            <CyberScanWorkbench
              activeModule={activeModule}
              onScanStateChange={(sc, conf) => {
                setScanning(sc);
                if (conf !== null) setLastConfidence(conf);
              }}
            />

            <div className="ss-sapphire-card rounded-3xl p-6 space-y-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-bold">Quick Non-Diagnostic PCOS Indicator Preview</h2>
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
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
