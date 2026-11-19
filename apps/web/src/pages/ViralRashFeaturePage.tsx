import { Suspense, lazy, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Layers,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { apiGet } from "../lib/apiClient";
import { useI18n } from "../lib/i18n";
import { usePreferences } from "../lib/preferences";
import { PublicFloatingHeader } from "../components/layout/PublicFloatingHeader";
import { PublicFooter } from "../components/layout/PublicFooter";
import { HomeSubTabBar } from "../components/layout/HomeSubTabBar";
import { PageBackdropLayer } from "../components/layout/PageBackdropLayer";
import {
  DigitalObservatoryDeck,
  InteractiveBarGraph,
  type TelemetryDeckCard,
} from "../components/charts/AgriStyleTelemetry";
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

const SIX_VIRAL_CLASSES = [
  { name: "Chickenpox (Varicella)", pct: 100, note: "Vesicular stages evaluated under family grouping", color: "#38bdf8" },
  { name: "Measles (Rubeola)", pct: 100, note: "Maculopapular rash patterns", color: "#2dd4bf" },
  { name: "HFMD (Hand-Foot-Mouth)", pct: 100, note: "Acral & oral vesicle group", color: "#818cf8" },
  { name: "Cowpox", pct: 100, note: "Orthopox morphology benchmark class", color: "#f2c879" },
  { name: "Monkeypox (Mpox)", pct: 100, note: "Research visual reference class", color: "#fb7185" },
  { name: "Healthy Control Skin", pct: 100, note: "Negative benchmark reference", color: "#34d399" },
];

export function ViralRashFeaturePage() {
  const { locale } = useI18n();
  const { motionPaused } = usePreferences();
  const [scanning, setScanning] = useState(false);
  const [lastConf, setLastConf] = useState<number | null>(null);
  const [viralDataset, setViralDataset] = useState<ResearchDataset | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await apiGet<{ datasets: ResearchDataset[] }>("/v1/public/research");
        const found = res.datasets?.find((d) => d.module.toLowerCase().includes("viral rash")) || null;
        if (active) setViralDataset(found);
      } catch {
        // Offline safe
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const telemetryCards: TelemetryDeckCard[] = [
    {
      id: "val-acc",
      tag: "GROUPED VAL IMAGE ACC",
      value: "84.65%",
      sub: "Zero Family Leakage Split",
      accent: "#818cf8",
      icon: Sparkles,
      pieCenter: "84.7%",
      pieSub: "VAL",
      pieSegments: [
        { label: "Val Accuracy", pct: 84.65, color: "#818cf8" },
        { label: "Error", pct: 15.35, color: "#0e1d38" },
      ],
      barSegments: [
        { label: "Macro F1 (84.22%)", pct: 84.22, color: "#818cf8" },
        { label: "Top-1 Margin", pct: 0.43, color: "#38bdf8" },
      ],
      barFootnote: "M03 Grouped ResNet18 • MCVSLD 755 visual families",
    },
    {
      id: "macro-f1",
      tag: "MACRO F1 SCORE",
      value: "84.22%",
      sub: "Balanced 6-Class Harmonic",
      accent: "#38bdf8",
      icon: Layers,
      pieCenter: "84.2%",
      pieSub: "F1",
      pieSegments: [
        { label: "Macro F1", pct: 84.22, color: "#38bdf8" },
        { label: "Remainder", pct: 15.78, color: "#0e1d38" },
      ],
      barSegments: [
        { label: "Train (528)", pct: 69.93, color: "#818cf8" },
        { label: "Val (113)", pct: 14.97, color: "#38bdf8" },
        { label: "Test (114)", pct: 15.1, color: "#2dd4bf" },
      ],
      barFootnote: "Strict 70% / 15% / 15% source-photo family grouping",
    },
    {
      id: "zero-leak",
      tag: "CROSS-SPLIT LEAKAGE",
      value: "0.00%",
      sub: "Verified By verify_final_lock",
      accent: "#2dd4bf",
      icon: ShieldCheck,
      pieCenter: "0%",
      pieSub: "LEAK",
      pieSegments: [{ label: "Isolated Family Splits", pct: 100, color: "#2dd4bf" }],
      barSegments: [{ label: "Zero Intersection Confirmed", pct: 100, color: "#2dd4bf" }],
      barFootnote: "Historical 99.10% leaky checkpoint permanently quarantined",
    },
    {
      id: "classes-6",
      tag: "MORPHOLOGY CLASSES",
      value: "6 Classes",
      sub: "Dermatological Research Prototype",
      accent: "#f2c879",
      icon: ShieldAlert,
      pieCenter: "6",
      pieSub: "CLASS",
      pieSegments: [
        { label: "Chickenpox / Measles / HFMD", pct: 50, color: "#38bdf8" },
        { label: "Cowpox / Mpox / Healthy", pct: 50, color: "#f2c879" },
      ],
      barSegments: [{ label: "Non-Diagnostic Softmax", pct: 100, color: "#f2c879" }],
      barFootnote: "Non-Bangladesh cohort caveats require dermatologist review",
    },
  ];

  const splitGraphItems = [
    {
      label: "Grouped Val Image Accuracy (resnet18_grouped_best.pth)",
      value: 84.65,
      displayValue: "84.65%",
      sublabel: "Clean Grouped Evaluation",
      color: "#818cf8",
    },
    {
      label: "Grouped Validation Macro F1 Score",
      value: 84.22,
      displayValue: "84.22%",
      sublabel: "6-Class Balanced",
      color: "#38bdf8",
    },
    {
      label: "Train Families Share (528 / 755 Families)",
      value: 69.93,
      displayValue: "69.93% (528 Families)",
      sublabel: "Grouped Training",
      color: "#2dd4bf",
    },
    {
      label: "Validation Families Share (113 / 755 Families)",
      value: 14.97,
      displayValue: "14.97% (113 Families)",
      sublabel: "Grouped Val",
      color: "#f2c879",
    },
    {
      label: "Test Families Share (114 / 755 Families)",
      value: 15.1,
      displayValue: "15.10% (114 Families)",
      sublabel: "Grouped Holdout",
      color: "#34d399",
    },
  ];

  return (
    <div className="ss-sapphire-always relative min-h-screen flex flex-col pt-20 overflow-x-clip" data-testid="viral-rash-feature-page">
      <PageBackdropLayer imageSrc="/images/backgrounds/bg-viral-rash.jpg" />
      <PublicFloatingHeader transparentHero />

      <main className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 pb-16 space-y-8 flex-1">
        <HomeSubTabBar />

        {/* Hero */}
        <section className="ss-sapphire-card rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-[#818cf8]">
              <Sparkles className="w-4 h-4" /> HOME MODULE 02 • M03 VIRAL RASH GROUPED MCVSLD (FR-VIR-01..03)
            </span>
            <TrustBadge kind="RESEARCH_ONLY" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                {locale === "bn" ? (
                  <>
                    ভাইরাল র‍্যাশ এআই ও{" "}
                    <span className="bg-gradient-to-r from-[#818cf8] via-[#38bdf8] to-[#2dd4bf] bg-clip-text text-transparent">
                      লিকেজ-মুক্ত ৬-শ্রেণি ভিশন স্টুডিও
                    </span>
                  </>
                ) : (
                  <>
                    Viral Rash AI &amp;{" "}
                    <span className="bg-gradient-to-r from-[#818cf8] via-[#38bdf8] to-[#2dd4bf] bg-clip-text text-transparent">
                      755-Family Leak-Free Lab
                    </span>
                  </>
                )}
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                {locale === "bn"
                  ? "তথ্য লিকেজযুক্ত ঐতিহাসিক ৯৯.১০% মডেলটি কোয়ারেন্টাইন করে ৭৫৫টি স্বতন্ত্র ফ্যামিলিতে গ্রুপকৃত ResNet18 মডেল দ্বারা ৬টি ভাইরাল ত্বকের ধরন গবেষণা-প্রোটোটাইপ হিসেবে বিশ্লেষণ করা হয়েছে।"
                  : "Upload skin lesion images to inspect grouped ResNet18 softmax research outputs across 6 viral rash classes, enforcing strict non-diagnostic safety disclosures and transparent demographic generalization caveats."}
              </p>

              <div className="flex flex-wrap gap-2.5 pt-1">
                <Link
                  to="/doctors?q=dermatology"
                  className="min-h-11 px-5 rounded-full bg-gradient-to-r from-[#818cf8] to-[#38bdf8] text-slate-950 font-bold text-xs inline-flex items-center gap-2"
                >
                  <Stethoscope className="w-4 h-4" />
                  {locale === "bn" ? "চর্মরোগ বিশেষজ্ঞ খুঁজুন" : "Consult Dermatology Specialist"}
                </Link>
                <Link
                  to="/care-map"
                  className="min-h-11 px-5 rounded-full border border-white/25 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs inline-flex items-center gap-2"
                >
                  {locale === "bn" ? "নিকটস্থ হাসপাতাল ম্যাপ" : "Open Bangladesh Care Map"}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 h-[220px] sm:h-[245px]">
              <Suspense fallback={<div className="w-full h-full rounded-2xl bg-[#040a18] border border-indigo-400/20" />}>
                <LazyAiModuleScene3D moduleKey="viral-rash" scanning={scanning} confidence={lastConf} />
              </Suspense>
            </div>
          </div>
        </section>

        {/* Live CyberScan Real Inference Workbench (M03) */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#818cf8]">
                LIVE PYTORCH INFERENCE • RESNET18_GROUPED_BEST.PTH
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                {locale === "bn"
                  ? "ভাইরাল র‍্যাশ ছবি আপলোড ও সাইবার-স্ক্যান বিশ্লেষণ"
                  : "Upload Skin Rash Scan for CyberScan Research Classification"}
              </h2>
            </div>
          </div>

          <CyberScanWorkbench
            activeModule="viral-rash"
            onScanStateChange={(sc, conf) => {
              setScanning(sc);
              if (conf !== null) setLastConf(conf);
            }}
          />
        </section>

        {/* AgriSense Telemetry Deck + Split Graph */}
        <section className="space-y-5">
          <DigitalObservatoryDeck
            badgeLabel="MCVSLD 755-FAMILY GROUPED AUDIT • TEST 6 PASSED"
            cards={telemetryCards}
            breakdownTitle="6-Class Viral Rash Taxonomy Scope & Source Partition"
            breakdownBars={SIX_VIRAL_CLASSES.slice(0, 4).map((c) => ({
              name: c.name,
              pct: 100,
              valueLabel: "Included",
              color: c.color,
              note: c.note,
            }))}
            pauseMotion={motionPaused}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <InteractiveBarGraph
                title="Grouped Source-Family Validation Metrics & Partition Percentages"
                subtitle="Reconciled from verify_final_lock.py (Test 6: 0% cross-split family overlap)."
                items={splitGraphItems}
                thresholdValue={84.65}
                thresholdLabel="Val Acc 84.65%"
                pauseMotion={motionPaused}
              />
            </div>

            <div className="lg:col-span-5 ss-sapphire-card rounded-3xl p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="font-mono text-xs font-bold text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  QUARANTINE &amp; GENERALIZATION AUDIT (FR-VIR-02..03)
                </div>
                <h3 className="text-lg font-bold text-white">Why Historical 99.10% Accuracy Was Quarantined</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {viralDataset?.limitations ||
                    "Earlier image-level random splits leaked near-duplicate photos from the same patient/source across train and test sets, artificially inflating accuracy to 99.10%. Under strict 755-family grouped splitting (528 train / 113 val / 114 test), verified validation accuracy is 84.65% (Macro F1: 84.22%)."}
                </p>
                <div className="space-y-1.5 pt-2">
                  <div className="text-[11px] font-mono text-sky-300 uppercase">All 6 Evaluated Classes:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {SIX_VIRAL_CLASSES.map((c) => (
                      <span
                        key={c.name}
                        className="px-2.5 py-1 rounded-full text-[11px] font-mono border border-white/15 bg-black/35 text-slate-200"
                      >
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-amber-500/10 border border-amber-400/35 p-3 text-[11px] text-amber-200 leading-relaxed">
                Public web dataset dermatology phenotypes do not represent all Bangladesh Fitzpatrick skin phototypes equally. Always seek direct physician inspection for active fever + vesicular rash.
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
