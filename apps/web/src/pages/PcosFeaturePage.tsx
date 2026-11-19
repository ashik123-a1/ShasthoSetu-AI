import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarHeart,
  CheckSquare,
  ClipboardCopy,
  FlaskConical,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { apiGet, apiPost } from "../lib/apiClient";
import { useI18n } from "../lib/i18n";
import { PublicFloatingHeader } from "../components/layout/PublicFloatingHeader";
import { PublicFooter } from "../components/layout/PublicFooter";
import { TrustBadge } from "../components/ui";

interface ResearchDataset {
  module: string;
  dataset_or_scope: string;
  reconciled_count: string;
  scientific_classification: string;
  limitations: string;
}

interface PcosPreviewResult {
  classification: string;
  model_reference: string;
  screening_index: number;
  band: string;
  observed_factors: string[];
  disclaimer: string;
}

const SYMPTOM_CHECKLIST = [
  { id: "irreg", bn: "৩৫ দিনের বেশি দীর্ঘ বা অনিয়মিত মাসিক চক্র", en: "Prolonged or irregular cycle intervals (>35 days)" },
  { id: "fatigue", bn: "অস্বাভাবিক ক্লান্তি ও ইনসুলিন-সংবেদনশীলতার লক্ষণ", en: "Persistent fatigue & metabolic fluctuations" },
  { id: "acne", bn: "অতিরিক্ত ব্রণ বা অবাঞ্ছিত রোমের পরিবর্তন", en: "Androgen-associated skin changes (acne / hirsutism)" },
  { id: "usg", bn: "সাম্প্রতিক পেলভিক আল্ট্রাসাউন্ড রিপোর্ট সাথে আছে", en: "Previous pelvic ultrasound report ready for clinician review" },
];

export function PcosFeaturePage() {
  const { locale } = useI18n();
  const [datasets, setDatasets] = useState<ResearchDataset[]>([]);
  const [age, setAge] = useState(25);
  const [bmi, setBmi] = useState(26.4);
  const [cycleDays, setCycleDays] = useState(40);
  const [lhFsh, setLhFsh] = useState(2.2);
  const [irregular, setIrregular] = useState(true);
  const [androgen, setAndrogen] = useState(true);
  const [calcResult, setCalcResult] = useState<PcosPreviewResult | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(["irreg", "acne"]);
  const [clinicianQuestion, setClinicianQuestion] = useState(
    "Should I obtain fasting glucose and LH/FSH day-3 blood panels before follow-up?"
  );
  const [copiedPrep, setCopiedPrep] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await apiGet<{ datasets: ResearchDataset[] }>("/v1/public/research");
        if (active && res.datasets) setDatasets(res.datasets);
      } catch {
        // Resilient fallback if offline
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const pcosTrack = datasets.find((d) => d.module.toLowerCase().includes("pcos clinical"));
  const usgTrack = datasets.find((d) => d.module.toLowerCase().includes("ultrasound"));

  const runPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    setCalcError(null);
    try {
      const res = await apiPost<PcosPreviewResult>("/v1/public/research/pcos-preview", {
        age: Number(age),
        bmi: Number(bmi),
        cycle_length_days: Number(cycleDays),
        lh_fsh_ratio: Number(lhFsh),
        irregular_cycles: irregular,
        acne_or_hirsutism: androgen,
      });
      setCalcResult(res);
    } catch (err) {
      setCalcError(err instanceof Error ? err.message : "Failed to compute research preview.");
    }
  };

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const prepSummaryText = [
    `PCOS Visit Prep Summary (Non-Diagnostic User Log)`,
    `- Reported Age: ${age} yrs | BMI: ${bmi} kg/m² | Recent Cycle Length: ${cycleDays} days`,
    `- Logged Factors: ${
      selectedSymptoms
        .map((id) => SYMPTOM_CHECKLIST.find((c) => c.id === id)?.en)
        .filter(Boolean)
        .join("; ") || "None selected"
    }`,
    `- Missing Information Note: Clinician confirmation required for hormonal & ultrasound criteria.`,
    `- Question for Gynecologist: ${clinicianQuestion}`,
  ].join("\n");

  const copySummary = async () => {
    try {
      await navigator.clipboard?.writeText(prepSummaryText);
      setCopiedPrep(true);
      setTimeout(() => setCopiedPrep(false), 2500);
    } catch {
      setCopiedPrep(true);
    }
  };

  return (
    <div className="ss-sapphire-always min-h-screen flex flex-col pt-24" data-testid="pcos-feature-page">
      <PublicFloatingHeader transparentHero />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 pb-16 space-y-10 flex-1">
        {/* Hero Banner */}
        <section className="ss-sapphire-card rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-[#818cf8]">
              <CalendarHeart className="w-4 h-4" /> CORE MODULE 01 • FR-PCOS-01..08 & UJ-03
            </span>
            <TrustBadge kind="RESEARCH_ONLY" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8 space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                {locale === "bn" ? (
                  <>
                    পিসিওএস যত্ন, সাইকেল ট্র্যাকিং ও{" "}
                    <span className="bg-gradient-to-r from-[#38bdf8] via-[#2dd4bf] to-[#f2c879] bg-clip-text text-transparent">
                      নন-ডায়াগনস্টিক গবেষণা স্টুডিও
                    </span>
                  </>
                ) : (
                  <>
                    Women&apos;s PCOS Care Journal &amp;{" "}
                    <span className="bg-gradient-to-r from-[#38bdf8] via-[#2dd4bf] to-[#f2c879] bg-clip-text text-transparent">
                      Non-Diagnostic ML Studio
                    </span>
                  </>
                )}
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
                {locale === "bn"
                  ? "মাসিক চক্র লগ, চিকিৎসকের পরামর্শ প্রস্তুতি সারাংশ এবং নিরীক্ষিত M01 ক্লিনিকাল XGBoost ও M02 PCOM আল্ট্রাসাউন্ড গবেষণা মডেল সম্পূর্ণ পৃথক ও স্বচ্ছ সীমাবদ্ধতাসহ প্রদর্শিত।"
                  : "Separates personal menstrual tracking and appointment prep checklists from frozen research benchmarks (M01 Clinical XGBoost & M02 Ovarian PCOM Morphology) with strict non-diagnostic safety boundaries."}
              </p>
            </div>
            <div className="lg:col-span-4 flex flex-col gap-2.5">
              <Link
                to="/patient/pcos"
                className="min-h-12 px-5 rounded-full bg-gradient-to-r from-sky-400 to-teal-400 text-slate-950 font-bold text-sm inline-flex items-center justify-center gap-2"
              >
                {locale === "bn" ? "আমার ব্যক্তিগত PCOS লগ খুলুন" : "Open My Private PCOS Log"}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/doctors?q=pcos"
                className="min-h-12 px-5 rounded-full border border-white/25 bg-white/5 hover:bg-white/10 text-white font-semibold text-sm inline-flex items-center justify-center gap-2"
              >
                <Stethoscope className="w-4 h-4 text-[#f2c879]" />
                {locale === "bn" ? "স্ত্রীরোগ বিশেষজ্ঞ খুঁজুন" : "Find Gynecology / PCOS Doctors"}
              </Link>
            </div>
          </div>
        </section>

        {/* Interactive Non-Diagnostic Calculator + Clinical Prep Builder */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Calculator */}
          <div className="lg:col-span-7 ss-sapphire-card rounded-3xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-wider text-sky-300">
                  M01-XGB-01 RESEARCH PREVIEW (NON-DIAGNOSTIC)
                </div>
                <h2 className="text-xl font-bold mt-0.5">
                  {locale === "bn"
                    ? "ইন্টারঅ্যাক্টিভ PCOS ঝুঁকি-সূচক প্রিভিউ ক্যালকুলেটর"
                    : "Interactive Non-Diagnostic Indicator Preview"}
                </h2>
              </div>
              <Activity className="w-5 h-5 text-[#2dd4bf]" />
            </div>

            <form onSubmit={(e) => void runPreview(e)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="space-y-1 text-xs font-medium text-slate-300">
                <span>Age (yrs)</span>
                <input
                  type="number"
                  min={14}
                  max={55}
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full min-h-11 rounded-xl border border-sky-400/25 bg-black/35 px-3 text-sm text-white"
                />
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-300">
                <span>BMI (kg/m²)</span>
                <input
                  type="number"
                  step="0.1"
                  min={12}
                  max={55}
                  value={bmi}
                  onChange={(e) => setBmi(Number(e.target.value))}
                  className="w-full min-h-11 rounded-xl border border-sky-400/25 bg-black/35 px-3 text-sm text-white"
                />
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-300">
                <span>Cycle Length (days)</span>
                <input
                  type="number"
                  min={15}
                  max={120}
                  value={cycleDays}
                  onChange={(e) => setCycleDays(Number(e.target.value))}
                  className="w-full min-h-11 rounded-xl border border-sky-400/25 bg-black/35 px-3 text-sm text-white"
                />
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-300">
                <span>LH / FSH Ratio</span>
                <input
                  type="number"
                  step="0.1"
                  min={0.1}
                  max={10}
                  value={lhFsh}
                  onChange={(e) => setLhFsh(Number(e.target.value))}
                  className="w-full min-h-11 rounded-xl border border-sky-400/25 bg-black/35 px-3 text-sm text-white"
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-200 min-h-11 cursor-pointer">
                <input type="checkbox" checked={irregular} onChange={(e) => setIrregular(e.target.checked)} className="w-4 h-4" />
                <span>{locale === "bn" ? "অনিয়মিত মাসিক চক্র" : "Irregular cycles"}</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-200 min-h-11 cursor-pointer">
                <input type="checkbox" checked={androgen} onChange={(e) => setAndrogen(e.target.checked)} className="w-4 h-4" />
                <span>{locale === "bn" ? "ব্রণ বা হরমোনাল লক্ষণ" : "Acne / hirsutism indicators"}</span>
              </label>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  data-testid="pcos-feature-calc-btn"
                  className="min-h-11 px-6 rounded-full bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 font-bold text-sm cursor-pointer shadow"
                >
                  {locale === "bn" ? "নন-ডায়াগনস্টিক প্রিভিউ হিসাব করুন" : "Compute Research Preview"}
                </button>
              </div>
            </form>

            {calcError && (
              <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-xs text-rose-200">{calcError}</div>
            )}

            {calcResult && (
              <div
                data-testid="pcos-feature-result"
                className="rounded-2xl border border-[#818cf8]/40 bg-[#0b1330]/90 p-4 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-[#818cf8]">{calcResult.classification}</span>
                  <span className="font-mono text-sm font-bold text-[#f2c879]">
                    Index: {calcResult.screening_index} ({calcResult.band})
                  </span>
                </div>
                <p className="text-xs text-slate-300">Factors: {calcResult.observed_factors.join(" • ") || "None elevated"}</p>
                <p className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{calcResult.disclaimer}</span>
                </p>
              </div>
            )}
          </div>

          {/* Right: Appointment Prep Checklist */}
          <div className="lg:col-span-5 ss-sapphire-card rounded-3xl p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-sky-400" />
                  {locale === "bn" ? "ডাক্তার দেখানোর প্রস্তুতি সারাংশ (FR-PCOS-08)" : "Clinician Visit Prep Builder"}
                </h2>
              </div>
              <div className="space-y-2">
                {SYMPTOM_CHECKLIST.map((item) => {
                  const active = selectedSymptoms.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className={`min-h-11 px-3.5 py-2 rounded-xl border flex items-center gap-2.5 text-xs cursor-pointer transition ${
                        active ? "bg-sky-400/15 border-sky-400/45 text-white" : "bg-black/25 border-white/10 text-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleSymptom(item.id)}
                        className="w-4 h-4"
                      />
                      <span>{locale === "bn" ? item.bn : item.en}</span>
                    </label>
                  );
                })}
              </div>

              <label className="block space-y-1 text-xs text-slate-300">
                <span>{locale === "bn" ? "চিকিৎসককে জিজ্ঞাসার প্রশ্ন:" : "Question for Clinician Consultation:"}</span>
                <textarea
                  rows={2}
                  value={clinicianQuestion}
                  onChange={(e) => setClinicianQuestion(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/35 p-2.5 text-xs text-white"
                />
              </label>

              <pre className="rounded-xl bg-black/45 border border-white/10 p-3 text-[11px] font-mono text-sky-200 whitespace-pre-wrap">
                {prepSummaryText}
              </pre>
            </div>

            <button
              type="button"
              onClick={() => void copySummary()}
              className="min-h-11 px-4 rounded-xl border border-sky-400/35 bg-sky-400/15 hover:bg-sky-400/25 text-sky-200 text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <ClipboardCopy className="w-4 h-4" />
              {copiedPrep
                ? locale === "bn"
                  ? "সারাংশ কপি হয়েছে!"
                  : "Prep Summary Copied!"
                : locale === "bn"
                ? "ডাক্তার ভিজিট সারাংশ কপি করুন"
                : "Copy Factual Visit Summary"}
            </button>
          </div>
        </section>

        {/* Separated Clinical ML vs Ultrasound Morphology Tracks (FR-PCOS-05..07) */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="ss-sapphire-card rounded-3xl p-6 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold text-sky-300 flex items-center gap-1.5">
                <FlaskConical className="w-4 h-4" /> TRACK A • M01 CLINICAL TABULAR XGBOOST
              </span>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-sky-400/15 text-sky-200 border border-sky-400/30">
                N=88 • 88.57% CV BAL ACC
              </span>
            </div>
            <h3 className="text-lg font-bold">Mendeley PCOS Clinical Exploratory Cohort</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {pcosTrack?.limitations ||
                "Evaluated on N=88 cleaned cohort; held-out test 17/18 (94.44%). Small sample exploratory benchmark, never merged directly into ultrasound features without matched patients."}
            </p>
            <div className="text-xs font-mono text-[#f2c879]">
              Reconciled Scope: {pcosTrack?.reconciled_count || "88 clinical profiles"}
            </div>
          </div>

          <div className="ss-sapphire-card rounded-3xl p-6 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold text-teal-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> TRACK B • M02 OVARIAN ULTRASOUND PCOM
              </span>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-teal-400/15 text-teal-200 border border-teal-400/30">
                299 UNIQUE • 39/45 (86.67%)
              </span>
            </div>
            <h3 className="text-lg font-bold">3-Class Morphology Classifier (Normal / Dominant / PCO)</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {usgTrack?.limitations ||
                "Detects PCOM sonographic morphology strictly separately (FR-PCOS-06): PCOM ultrasound morphology alone does NOT equal clinical PCOS diagnosis."}
            </p>
            <div className="text-xs font-mono text-[#2dd4bf]">
              Reconciled Scope: {usgTrack?.reconciled_count || "299 deduplicated images (41 Normal, 142 Dominant, 116 PCO)"}
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
