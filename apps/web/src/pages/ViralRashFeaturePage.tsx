import { Suspense, lazy, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { apiGet } from "../lib/apiClient";
import { useI18n } from "../lib/i18n";
import { usePreferences } from "../lib/preferences";
import { PublicFloatingHeader } from "../components/layout/PublicFloatingHeader";
import { PublicFooter } from "../components/layout/PublicFooter";
import { PageBackdropLayer } from "../components/layout/PageBackdropLayer";
import { HexRadarTaxonomyChart } from "../components/charts/VariedClinicalVisuals";
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

  return (
    <div className="ss-sapphire-always relative min-h-screen flex flex-col pt-20 overflow-x-clip" data-testid="viral-rash-feature-page">
      <PageBackdropLayer imageSrc="/images/backgrounds/bg-viral-rash.jpg" />
      <PublicFloatingHeader transparentHero />

      <main className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 pb-16 space-y-8 flex-1">
        <div className="flex items-center justify-between">
          <Link
            to="/#viral-rash-chapter"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-indigo-300 hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {locale === "bn" ? "হোম অধ্যায়ে ফিরুন" : "Back to Home Chapters"}
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
            02 / 05 • VIRAL RASH AI
          </span>
        </div>

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

        {/* Viral Rash Signature 6-Class Hex Radar + Quarantine Audit */}
        <section className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7">
              <HexRadarTaxonomyChart pauseMotion={motionPaused} />
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
