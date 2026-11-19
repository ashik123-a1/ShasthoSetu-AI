import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Baby,
  CalendarCheck2,
  FlaskConical,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Thermometer,
} from "lucide-react";
import { apiGet } from "../lib/apiClient";
import { useI18n } from "../lib/i18n";
import { PublicFloatingHeader } from "../components/layout/PublicFloatingHeader";
import { PublicFooter } from "../components/layout/PublicFooter";
import { PageBackdropLayer } from "../components/layout/PageBackdropLayer";
import { CohortWaffleMatrixChart } from "../components/charts/VariedClinicalVisuals";
import { CyberScanWorkbench } from "../components/ai/CyberScanWorkbench";
import { TrustBadge } from "../components/ui";

const LazyAiModuleScene3D = lazy(() =>
  import("../components/three/AiModuleScene3D").then((m) => ({ default: m.AiModuleScene3D }))
);

interface ResearchDataset {
  module: string;
  dataset_or_scope: string;
  reconciled_count: string;
  scientific_classification: string;
  limitations: string;
}

type AnswerOption = "YES" | "NO" | "UNKNOWN";

const EPI_SCHEDULE = [
  { vaccine: "BCG", age: "At Birth", target: "Tuberculosis" },
  { vaccine: "Pentavalent (DTP-HepB-Hib) + OPV/PCV", age: "6, 10, 14 Weeks", target: "Diphtheria, Pertussis, Tetanus, HepB, Hib, Polio, Pneumonia" },
  { vaccine: "MR (Measles-Rubella) Dose 1", age: "9 Months", target: "Measles & Rubella" },
  { vaccine: "MR Booster Dose 2", age: "15 Months", target: "Measles & Rubella Booster" },
];

function deroNote(ds?: ResearchDataset) {
  return (
    ds?.limitations ||
    "Local subset covers 19 Chickenpox and 3 Pediculosis patients (EXP_B / EXP_D weights verified via SHA-256). Strictly research-only, never used for emergency rash diagnosis."
  );
}

export function PediatricRashFeaturePage() {
  const { locale } = useI18n();
  const [scanning, setScanning] = useState(false);
  const [lastConf, setLastConf] = useState<number | null>(null);
  const [datasets, setDatasets] = useState<ResearchDataset[]>([]);
  const [ageBand, setAgeBand] = useState("1_TO_5_YEARS");
  const [feverDays, setFeverDays] = useState("2_DAYS");
  const [breathingDistress, setBreathingDistress] = useState<AnswerOption>("NO");
  const [lethargyOrConvulsions, setLethargyOrConvulsions] = useState<AnswerOption>("NO");
  const [spreadingRash, setSpreadingRash] = useState<AnswerOption>("YES");
  const [vaccinesUpToDate, setVaccinesUpToDate] = useState<AnswerOption>("UNKNOWN");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await apiGet<{ datasets: ResearchDataset[] }>("/v1/public/research");
        if (active && res.datasets) setDatasets(res.datasets);
      } catch {
        // Resilient fallback
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const viralTrack = datasets.find((d) => d.module.toLowerCase().includes("viral rash"));
  const dermoTrack = datasets.find((d) => d.module.toLowerCase().includes("dermoped"));

  const evaluation = useMemo(() => {
    const reportedFacts = [
      `Age Group: ${ageBand.replaceAll("_", " ")}`,
      `Fever Duration: ${feverDays.replaceAll("_", " ")}`,
      `Rash Observed: ${spreadingRash}`,
    ];
    const missingFacts: string[] = [];
    const ruleTriggers: string[] = [];

    if (breathingDistress === "UNKNOWN") missingFacts.push("Breathing distress / chest indrawing status unknown");
    if (lethargyOrConvulsions === "UNKNOWN") missingFacts.push("Alertness / convulsion status unknown");
    if (spreadingRash === "UNKNOWN") missingFacts.push("Rash spread & vesicular pattern unknown");
    if (vaccinesUpToDate === "UNKNOWN") missingFacts.push("EPI measles/pentavalent vaccination status unconfirmed");

    if (breathingDistress === "YES" || lethargyOrConvulsions === "YES") {
      ruleTriggers.push("RED_FLAG_ESCALATION: Breathing difficulty or neurological lethargy/convulsions reported");
    }
    if (ageBand === "INFANT_UNDER_3M" && feverDays !== "NO_FEVER") {
      ruleTriggers.push("INFANT_FEVER_ESCALATION: Fever in infant under 3 months requires immediate medical exam");
    }
    if (spreadingRash === "YES" && feverDays === "3_PLUS_DAYS") {
      ruleTriggers.push("FEVER_RASH_COMBINATION: 3+ days fever with progressive rash requires clinician evaluation");
    }

    const level =
      ruleTriggers.length > 0
        ? "URGENT_CLINICAL_REVIEW"
        : missingFacts.length > 0
        ? "INCOMPLETE_DATA_NEEDS_REVIEW"
        : "PROMPT_PEDIATRIC_CONSULTATION";

    return { reportedFacts, missingFacts, ruleTriggers, level };
  }, [ageBand, feverDays, breathingDistress, lethargyOrConvulsions, spreadingRash, vaccinesUpToDate]);

  return (
    <div className="ss-sapphire-always relative min-h-screen flex flex-col pt-20 overflow-x-clip" data-testid="pediatric-feature-page">
      <PageBackdropLayer imageSrc="/images/backgrounds/bg-pediatric-care.jpg" />
      <PublicFloatingHeader transparentHero />

      <main className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 pb-16 space-y-8 flex-1">
        <div className="flex items-center justify-between">
          <Link
            to="/#dermoped-chapter"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[#34d399] hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {locale === "bn" ? "হোম অধ্যায়ে ফিরুন" : "Back to Home Chapters"}
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
            05 / 05 • DERMOPED &amp; TRIAGE
          </span>
        </div>

        {/* Hero + 3D Scene */}
        <section className="ss-sapphire-card rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-[#2dd4bf]">
              <Baby className="w-4 h-4" /> HOME MODULE 05 • M06 DERMOPED AI &amp; FR-PED-01..07 TRIAGE
            </span>
            <TrustBadge kind="RESEARCH_ONLY" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                {locale === "bn" ? (
                  <>
                    শিশুর জ্বর-র‍্যাশ জরুরি ট্রায়াজ ও{" "}
                    <span className="bg-gradient-to-r from-[#34d399] via-[#38bdf8] to-[#f2c879] bg-clip-text text-transparent">
                      ডার্মোপিড এআই গবেষণা স্টুডিও
                    </span>
                  </>
                ) : (
                  <>
                    DermoPed AI &amp;{" "}
                    <span className="bg-gradient-to-r from-[#34d399] via-[#38bdf8] to-[#f2c879] bg-clip-text text-transparent">
                      Pediatric Red-Flag Triage Lab
                    </span>
                  </>
                )}
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                {locale === "bn"
                  ? "বাস্তব EXP_B ResNet18 ভিশন মডেলের মাধ্যমে শিশুদের চর্মরোগ গবেষণা প্রোটোটাইপ বিশ্লেষণ (২২ রোগীর সীমাবদ্ধতাসহ), পাশাপাশি শ্বাসকষ্ট ও বিপদচিহ্নের নির্ভরযোগ্য ট্রায়াজ এবং ইপিআই টিকা গাইড।"
                  : "Execute real patient-separated DermoPed EXP_B research inference alongside deterministic pediatric red-flag fever/rash rules, Bangladesh EPI immunization reference schedules, and explicit 22-patient cohort caveats."}
              </p>

              <div className="flex flex-wrap gap-2.5 pt-1">
                <Link
                  to="/patient/pediatric"
                  className="min-h-11 px-5 rounded-full bg-gradient-to-r from-[#34d399] to-[#38bdf8] text-slate-950 font-bold text-xs inline-flex items-center gap-2"
                >
                  {locale === "bn" ? "শিশুর প্রোফাইল ও টিকা ট্র্যাকার" : "Open Pediatric Portal"}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/doctors?q=pediatric"
                  className="min-h-11 px-5 rounded-full border border-white/25 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs inline-flex items-center gap-2"
                >
                  <Stethoscope className="w-4 h-4 text-[#f2c879]" />
                  {locale === "bn" ? "শিশু বিশেষজ্ঞ খুঁজুন" : "Find Pediatric / Derm Doctors"}
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 h-[220px] sm:h-[245px]">
              <Suspense fallback={<div className="w-full h-full rounded-2xl bg-[#040a18] border border-emerald-400/20" />}>
                <LazyAiModuleScene3D moduleKey="dermoped" scanning={scanning} confidence={lastConf} />
              </Suspense>
            </div>
          </div>
        </section>

        {/* Live CyberScan Real DermoPed EXP_B Inference Workbench */}
        <section className="space-y-3">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#34d399]">
              REAL PYTORCH INFERENCE • PROOFS/EXP_B/MODEL_BEST.PTH (N=22 COHORT)
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              {locale === "bn"
                ? "শিশুর ত্বকের ছবি আপলোড ও সাইবার-স্ক্যান বিশ্লেষণ (গবেষণা প্রোটোটাইপ)"
                : "Upload Skin Image for Live DermoPed Research Classification"}
            </h2>
          </div>

          <CyberScanWorkbench
            activeModule="dermoped"
            onScanStateChange={(sc, conf) => {
              setScanning(sc);
              if (conf !== null) setLastConf(conf);
            }}
          />
        </section>

        {/* DermoPed Signature Interactive 22-Patient Cohort Waffle Matrix */}
        <section className="space-y-5">
          <CohortWaffleMatrixChart />
        </section>

        {/* Deterministic Triage Rules Simulator + Output Breakdown (Preserved) */}
        <section
          data-testid="pediatric-triage-simulator"
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
        >
          <div className="lg:col-span-6 ss-sapphire-card rounded-3xl p-6 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-sky-400" />
              {locale === "bn" ? "স্ট্রাকচার্ড জ্বর ও র‍্যাশ ইনটেক (FR-PED-01..03)" : "Deterministic Pediatric Intake Simulator"}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="space-y-1 text-slate-300">
                <span>Child Age Band</span>
                <select
                  value={ageBand}
                  onChange={(e) => setAgeBand(e.target.value)}
                  className="w-full min-h-11 rounded-xl border border-sky-400/25 bg-[#061226] px-3 text-white"
                >
                  <option value="INFANT_UNDER_3M">&lt; 3 Months (Infant)</option>
                  <option value="3M_TO_1_YEAR">3 – 12 Months</option>
                  <option value="1_TO_5_YEARS">1 – 5 Years</option>
                  <option value="OVER_5_YEARS">&gt; 5 Years</option>
                </select>
              </label>

              <label className="space-y-1 text-slate-300">
                <span>Fever Duration</span>
                <select
                  value={feverDays}
                  onChange={(e) => setFeverDays(e.target.value)}
                  className="w-full min-h-11 rounded-xl border border-sky-400/25 bg-[#061226] px-3 text-white"
                >
                  <option value="NO_FEVER">No fever</option>
                  <option value="1_DAY">1 Day</option>
                  <option value="2_DAYS">2 Days</option>
                  <option value="3_PLUS_DAYS">3+ Days</option>
                </select>
              </label>
            </div>

            {(
              [
                ["Fast breathing or chest indrawing?", breathingDistress, setBreathingDistress],
                ["Unusual drowsiness, lethargy, or convulsion?", lethargyOrConvulsions, setLethargyOrConvulsions],
                ["Visible spreading rash or fluid-filled blisters?", spreadingRash, setSpreadingRash],
                ["Measles / Pentavalent EPI vaccines confirmed?", vaccinesUpToDate, setVaccinesUpToDate],
              ] as const
            ).map(([question, val, setter]) => (
              <div key={question} className="rounded-2xl border border-white/10 bg-black/30 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-200">{question}</span>
                <div className="flex gap-1.5 shrink-0">
                  {(["YES", "NO", "UNKNOWN"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setter(opt)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold cursor-pointer ${
                        val === opt
                          ? opt === "YES"
                            ? "bg-amber-400 text-slate-950"
                            : opt === "UNKNOWN"
                            ? "bg-[#818cf8] text-white"
                            : "bg-teal-400 text-slate-950"
                          : "bg-white/10 text-slate-300"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-6 space-y-5">
            <div className="ss-sapphire-card rounded-3xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs text-slate-400">DETERMINISTIC OUTPUT (FR-PED-03)</span>
                <span
                  className={`font-mono text-xs font-bold px-3 py-1 rounded-full ${
                    evaluation.level === "URGENT_CLINICAL_REVIEW"
                      ? "bg-rose-500/20 text-rose-200 border border-rose-400/50"
                      : evaluation.level === "INCOMPLETE_DATA_NEEDS_REVIEW"
                      ? "bg-amber-500/20 text-amber-200 border border-amber-400/50"
                      : "bg-sky-500/20 text-sky-200 border border-sky-400/50"
                  }`}
                >
                  {evaluation.level}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="rounded-xl bg-black/30 border border-white/10 p-3">
                  <div className="font-mono font-bold text-sky-300 mb-1">1. USER-REPORTED FACTS</div>
                  <p className="text-slate-200">{evaluation.reportedFacts.join(" • ")}</p>
                </div>

                <div className="rounded-xl bg-black/30 border border-[#818cf8]/30 p-3">
                  <div className="font-mono font-bold text-[#818cf8] mb-1">
                    2. MISSING / UNCERTAIN FACTS (NEVER TREATED AS LOW RISK)
                  </div>
                  <p className="text-slate-200">
                    {evaluation.missingFacts.length > 0
                      ? evaluation.missingFacts.join(" • ")
                      : "All mandatory intake warning flags answered."}
                  </p>
                </div>

                <div className="rounded-xl bg-black/30 border border-rose-400/35 p-3">
                  <div className="font-mono font-bold text-rose-300 mb-1 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    3. DETERMINISTIC RULE TRIGGERS
                  </div>
                  <p className="text-slate-200">
                    {evaluation.ruleTriggers.length > 0
                      ? evaluation.ruleTriggers.join(" • ")
                      : "No immediate emergency trigger checked; maintain hydration monitoring and schedule pediatrician review."}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  to="/care-map"
                  className="min-h-11 px-4 rounded-xl bg-gradient-to-r from-sky-400 to-teal-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5"
                >
                  {locale === "bn" ? "নিকটস্থ শিশু হাসপাতাল ম্যাপ দেখুন" : "Locate Nearest Pediatric Hospital"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="ss-sapphire-card rounded-3xl p-5 space-y-3">
              <div className="font-mono text-xs font-bold text-[#2dd4bf] flex items-center gap-2">
                <CalendarCheck2 className="w-4 h-4" /> BANGLADESH EPI REFERENCE SCHEDULE (FR-PED-05)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-slate-400 border-b border-white/10 font-mono">
                    <tr>
                      <th className="py-2 pr-3">Vaccine</th>
                      <th className="py-2 pr-3">Age</th>
                      <th className="py-2">Target Protection</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {EPI_SCHEDULE.map((row) => (
                      <tr key={row.vaccine}>
                        <td className="py-2 pr-3 font-semibold text-white">{row.vaccine}</td>
                        <td className="py-2 pr-3 font-mono text-sky-300 whitespace-nowrap">{row.age}</td>
                        <td className="py-2 text-slate-300">{row.target}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* Research Caveats Disclosure Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="ss-sapphire-card rounded-3xl p-6 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold text-[#818cf8] flex items-center gap-1.5">
                <FlaskConical className="w-4 h-4" /> M03 VIRAL RASH LINKED TRACK
              </span>
              <Link to="/features/viral-rash" className="text-xs font-semibold text-sky-300 hover:underline">
                Open Viral Rash Page →
              </Link>
            </div>
            <h3 className="text-lg font-bold">Grouped Source-Family Split (Zero Patient Leakage)</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {viralTrack?.limitations ||
                "Historical 99.10% score documented as duplicate-contaminated. Clean grouped evaluation isolates 755 visual families; non-Bangladesh generalization caveats disclosed (FR-VIR-03)."}
            </p>
          </div>

          <div className="ss-sapphire-card rounded-3xl p-6 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold text-[#f2c879] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> M06 DERMOPED PEDIATRIC SKIN
              </span>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-400/15 text-amber-200 border border-amber-400/35">
                22 PATIENTS • 656 CROPS
              </span>
            </div>
            <h3 className="text-lg font-bold">Patient-Separated Baseline &amp; Automatic Mask Caveats</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{deroNote(dermoTrack)}</p>
            <p className="text-[11px] text-amber-200 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Automatic SAM/segmentation masks are research artifacts — never labeled clinician ground truth (FR-SKIN-04).</span>
            </p>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
