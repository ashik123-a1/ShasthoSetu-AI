import { Suspense, lazy, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Cpu,
  Lock,
  Mic,
  Radio,
  ShieldCheck,
  Volume2,
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

const WAVE_BARS = [24, 52, 78, 42, 92, 66, 35, 86, 61, 95, 48, 72, 30, 84, 58, 90, 44, 68, 36, 76, 54, 88, 39, 62];

export function BanglaVoiceFeaturePage() {
  const { locale } = useI18n();
  const { motionPaused } = usePreferences();
  const [voiceDataset, setVoiceDataset] = useState<ResearchDataset | null>(null);
  const [phaseTick, setPhaseTick] = useState(0);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await apiGet<{ datasets: ResearchDataset[] }>("/v1/public/research");
        const found = res.datasets?.find((d) => d.module.toLowerCase().includes("voice")) || null;
        if (active) setVoiceDataset(found);
      } catch {
        // Offline safe
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (motionPaused) return;
    const id = window.setInterval(() => setPhaseTick((t) => (t + 1) % 24), 180);
    return () => window.clearInterval(id);
  }, [motionPaused]);

  const telemetryCards: TelemetryDeckCard[] = [
    {
      id: "bn-unicode",
      tag: "BN UNICODE INTEGRITY",
      value: "98.37%",
      sub: "anuragshas/whisper-small-bn",
      accent: "#c084fc",
      icon: Volume2,
      pieCenter: "98.4%",
      pieSub: "BN",
      pieSegments: [
        { label: "Bengali Unicode Output", pct: 98.37, color: "#c084fc" },
        { label: "Punctuation / Other", pct: 1.63, color: "#0e1d38" },
      ],
      barSegments: [
        { label: "Smoke (97.68%)", pct: 97.68, color: "#38bdf8" },
        { label: "Extended Lift", pct: 0.69, color: "#c084fc" },
      ],
      barFootnote: "vs 0.00% BN Unicode in openai/whisper-base & whisper-tiny",
    },
    {
      id: "norm-wer",
      tag: "CORPUS NORM WER",
      value: "39.09%",
      sub: "26 FLEURS Clips • 22 Speakers",
      accent: "#38bdf8",
      icon: Activity,
      pieCenter: "39.1%",
      pieSub: "WER",
      pieSegments: [
        { label: "Word Error Rate (Lower Better)", pct: 39.09, color: "#f2c879" },
        { label: "Recognized Word Match", pct: 60.91, color: "#38bdf8" },
      ],
      barSegments: [
        { label: "Mean Sample Norm WER", pct: 38.23, color: "#38bdf8" },
        { label: "Raw WER (45.62%)", pct: 45.62, color: "#818cf8" },
      ],
      barFootnote: "Measured on NVIDIA RTX 5060 Ti cuda:0 • No clinical NER in FLEURS",
    },
    {
      id: "norm-cer",
      tag: "CORPUS NORM CER",
      value: "13.44%",
      sub: "Char Error vs 175.6% Base",
      accent: "#2dd4bf",
      icon: Radio,
      pieCenter: "13.4%",
      pieSub: "CER",
      pieSegments: [
        { label: "Character Accuracy Approx", pct: 86.56, color: "#2dd4bf" },
        { label: "Normalized CER", pct: 13.44, color: "#fb7185" },
      ],
      barSegments: [
        { label: "Smoke CER (8.97%)", pct: 8.97, color: "#2dd4bf" },
        { label: "Extended CER (14.16%)", pct: 14.16, color: "#38bdf8" },
      ],
      barFootnote: "Mean Sample Norm CER: 12.24% (Raw CER: 14.58%)",
    },
    {
      id: "phase-g-lock",
      tag: "GOVERNANCE STATUS",
      value: "PHASE G",
      sub: "AI-02 Deferred Draft Scope",
      accent: "#f2c879",
      icon: Lock,
      pieCenter: "LOCK",
      pieSub: "GATE",
      pieSegments: [{ label: "Clinical Review Required", pct: 100, color: "#f2c879" }],
      barSegments: [{ label: "Transparently Deferred to Phase G", pct: 100, color: "#f2c879" }],
      barFootnote: "Draft clinical transcription only — live mic/RAG gated to Phase G",
    },
  ];

  // Real audited values directly from 05_Bangla_Voice_AI/pretrained_bengali_comparison/task_03_2/comparison_metrics.json
  const modelComparisonItems = [
    {
      label: "anuragshas/whisper-small-bn — Bengali Script Purity (%)",
      value: 98.37,
      maxValue: 100,
      displayValue: "98.37% BN Unicode",
      sublabel: "Selected Candidate",
      color: "#c084fc",
    },
    {
      label: "anuragshas/whisper-small-bn — Corpus Norm WER (Lower = Better)",
      value: 39.09,
      maxValue: 250,
      displayValue: "39.09% WER",
      sublabel: "Raw WER 45.62%",
      color: "#38bdf8",
    },
    {
      label: "anuragshas/whisper-small-bn — Corpus Norm CER (Lower = Better)",
      value: 13.44,
      maxValue: 250,
      displayValue: "13.44% CER",
      sublabel: "Raw CER 14.58%",
      color: "#2dd4bf",
    },
    {
      label: "openai/whisper-base — Corpus Norm WER (Non-Bengali Script Fail)",
      value: 242.83,
      maxValue: 250,
      displayValue: "242.83% WER (0.0% BN)",
      sublabel: "Baseline Comparison",
      color: "#fb7185",
    },
    {
      label: "openai/whisper-base — Corpus Norm CER",
      value: 175.62,
      maxValue: 250,
      displayValue: "175.62% CER",
      sublabel: "Latin translit errors",
      color: "#f2c879",
    },
  ];

  return (
    <div className="ss-sapphire-always relative min-h-screen flex flex-col pt-20 overflow-x-clip" data-testid="bangla-voice-feature-page">
      <PageBackdropLayer imageSrc="/images/backgrounds/bg-bangla-voice.jpg" />
      <PublicFloatingHeader transparentHero />

      <main className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 pb-16 space-y-8 flex-1">
        <HomeSubTabBar />

        {/* Hero Banner + 3D Neural Scene */}
        <section className="ss-sapphire-card rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-purple-300">
              <Radio className="w-4 h-4" /> HOME MODULE 04 • M05 BANGLA VOICE AI (PHASE G DEFERRED)
            </span>
            <span className="font-mono text-[11px] font-bold px-3 py-1 rounded-full bg-amber-500/15 text-amber-200 border border-amber-400/40 inline-flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> AI-02 PHASE G DEFERRED • AUDITED FLEURS STUDIO
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                {locale === "bn" ? (
                  <>
                    বাংলা ভয়েস এআই ও{" "}
                    <span className="bg-gradient-to-r from-[#c084fc] via-[#38bdf8] to-[#2dd4bf] bg-clip-text text-transparent">
                      ক্লিনিকাল অ্যাকোস্টিক বেঞ্চমার্ক (Phase G)
                    </span>
                  </>
                ) : (
                  <>
                    Bangla Voice AI &amp;{" "}
                    <span className="bg-gradient-to-r from-[#c084fc] via-[#38bdf8] to-[#2dd4bf] bg-clip-text text-transparent">
                      Audited FLEURS ASR Studio
                    </span>
                  </>
                )}
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                {locale === "bn"
                  ? "মালিকের সিদ্ধান্ত ও SRS v2.0 ফেজ-জি অনুযায়ী লাইভ মাইক্রোফোন ও RAG ইন্টিগ্রেশন পরবর্তী ধাপে সক্রিয় হবে। এখানে ২৬টি মানব-কণ্ঠের FLEURS ক্লিপে অডিটেড বেঞ্চমার্ক (৯৮.৩৭% বাংলা ইউনিকোড, ৩৯.০৯% WER) এবং মডেল তুলনামূলক গ্রাফ প্রদর্শিত হয়েছে।"
                  : "Per Master SRS v2.0 Phase G and project governance, live real-time microphone ASR + medical RAG remain transparently deferred. Inspect verified 26-clip FLEURS benchmarks (98.37% Bengali Unicode, 39.09% Norm WER) and acoustic draft architecture below."}
              </p>

              {/* Animated Acoustic Waveform Visualizer Bar */}
              <div className="rounded-2xl bg-[#040a18]/85 border border-purple-400/30 p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 shrink-0">
                  <Mic className="w-5 h-5" />
                </div>
                <div className="flex-1 flex items-center gap-1 h-9 overflow-hidden" aria-hidden="true">
                  {WAVE_BARS.map((h, i) => {
                    const boosted = motionPaused ? h : Math.max(18, Math.min(98, ((h + ((i + phaseTick) % 6) * 8) % 95) + 14));
                    return (
                      <div
                        key={i}
                        className="flex-1 rounded-full transition-all duration-150"
                        style={{
                          height: `${boosted}%`,
                          background: i % 3 === 0 ? "#c084fc" : i % 3 === 1 ? "#38bdf8" : "#2dd4bf",
                          opacity: 0.85,
                        }}
                      />
                    );
                  })}
                </div>
                <span className="font-mono text-[10px] text-purple-200 px-2 py-1 rounded bg-purple-500/15 border border-purple-400/30 shrink-0">
                  PHASE G LOCK
                </span>
              </div>

              <div className="flex flex-wrap gap-2.5 pt-1">
                <Link
                  to="/research?module=bangla-voice"
                  className="min-h-11 px-5 rounded-full bg-gradient-to-r from-[#c084fc] to-[#38bdf8] text-slate-950 font-bold text-xs inline-flex items-center gap-2"
                >
                  Open in Research Lab <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/consultations"
                  className="min-h-11 px-5 rounded-full border border-white/25 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs inline-flex items-center gap-2"
                >
                  Open Audio/Video Test Room
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 h-[220px] sm:h-[245px]">
              <Suspense fallback={<div className="w-full h-full rounded-2xl bg-[#040a18] border border-purple-400/20" />}>
                <LazyAiModuleScene3D moduleKey="bangla-voice" scanning={!motionPaused} confidence={0.9837} />
              </Suspense>
            </div>
          </div>
        </section>

        {/* Honest Phase G Roadmap Workbench (Reusing CyberScanWorkbench honest card) */}
        <CyberScanWorkbench activeModule="bangla-voice" />

        {/* AgriSense Digital Observatory + Audited Model Comparison Graphs */}
        <section className="space-y-5">
          <DigitalObservatoryDeck
            badgeLabel="M05 FLEURS BENCHMARK • TASK_03_2 REPRODUCIBLE EVALUATION"
            statusLabel="PHASE G DEFERRED • HONEST AUDIT"
            cards={telemetryCards}
            breakdownTitle="Pretrained Model Evaluation Summary (RTX 5060 Ti • 26 FLEURS Clips)"
            breakdownBars={[
              { name: "Whisper-Small-BN Unicode", pct: 98.37, valueLabel: "98.37%", color: "#c084fc", note: "Selected baseline" },
              { name: "Whisper-Small-BN WER", pct: 39.09, valueLabel: "39.09%", color: "#38bdf8", note: "vs 242.8% Base" },
              { name: "Whisper-Small-BN CER", pct: 13.44, valueLabel: "13.44%", color: "#2dd4bf", note: "vs 175.6% Base" },
              { name: "Vivasoft HF Model", pct: 100, valueLabel: "401 Blocked", color: "#fb7185", note: "Gated HF repo" },
            ]}
            pauseMotion={motionPaused}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <InteractiveBarGraph
                title="Bengali ASR Pretrained Benchmark Graph (FLEURS 26 Clips / 22 Speakers)"
                subtitle="Values verbatim from 05_Bangla_Voice_AI/pretrained_bengali_comparison/task_03_2/comparison_metrics.json."
                items={modelComparisonItems}
                unit="%"
                thresholdValue={40}
                thresholdLabel="39.09% Target WER"
                pauseMotion={motionPaused}
              />
            </div>

            <div className="lg:col-span-5 ss-sapphire-card rounded-3xl p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="font-mono text-xs font-bold text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  EXTERNAL CACHE &amp; GATED REPO DISCLOSURES
                </div>
                <h3 className="text-lg font-bold text-white">Verified Governance Notes (Test 4)</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {voiceDataset?.limitations ||
                    "anuragshas/whisper-small-bn resides in external local cache (G:\\) and serves strictly as a draft-note benchmark (39.09% Norm WER on general FLEURS sentences, no clinical named entities tested). vivasoft/whisper-small-bn returned HTTP 401 Unauthorized on Hugging Face."}
                </p>

                <div className="rounded-xl bg-[#040a18]/80 border border-white/10 p-3.5 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="inline-flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-sky-400" /> Hardware Benchmark
                    </span>
                    <span className="text-sky-300">RTX 5060 Ti (cuda:0)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Unique Reference Sentences</span>
                    <span className="text-[#2dd4bf]">22 Sentences / 26 Clips</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>RAG + Voice Clinical Activation</span>
                    <span className="text-amber-300">Scheduled Phase G</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-teal-500/10 border border-teal-400/35 p-3 text-[11px] text-teal-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Every ASR transcript in Phase G will mandate clinician verification before writing to any patient record.</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
