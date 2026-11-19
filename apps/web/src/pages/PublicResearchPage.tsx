import { Suspense, lazy, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, FlaskConical } from "lucide-react";
import { apiGet, apiPost } from "../lib/apiClient";
import { useI18n } from "../lib/i18n";
import { PublicFloatingHeader } from "../components/layout/PublicFloatingHeader";
import { PublicFooter } from "../components/layout/PublicFooter";
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

const AI_MODULES: Array<{ key: AiModuleKey; labelBn: string; labelEn: string; sub: string }> = [
  { key: "pcos-clinical", labelBn: "১. PCOS ক্লিনিকাল", labelEn: "1. PCOS Clinical", sub: "Form • XGBoost" },
  { key: "pcos-ultrasound", labelBn: "২. PCOS আল্ট্রাসাউন্ড", labelEn: "2. PCOS Ultrasound", sub: "Image • ResNet18" },
  { key: "viral-rash", labelBn: "৩. ভাইরাল র‍্যাশ", labelEn: "3. Viral Rash", sub: "6-Class • Grouped" },
  { key: "prescription-ocr", labelBn: "৪. প্রেসক্রিপশন OCR", labelEn: "4. Prescription OCR", sub: "EasyOCR • HTTP 422" },
  { key: "bangla-voice", labelBn: "৫. বাংলা ভয়েস", labelEn: "5. Bangla Voice", sub: "Phase G Deferred" },
  { key: "dermoped", labelBn: "৬. ডার্মোপিড", labelEn: "6. DermoPed", sub: "EXP_B • N=22" },
];

const VALID_KEYS = new Set<AiModuleKey>(["pcos-clinical", "pcos-ultrasound", "viral-rash", "prescription-ocr", "bangla-voice", "dermoped"]);

export function PublicResearchPage() {
  const { locale } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialParam = searchParams.get("module") as AiModuleKey | null;
  const [activeModule, setActiveModule] = useState<AiModuleKey>(
    initialParam && VALID_KEYS.has(initialParam) ? initialParam : "viral-rash"
  );
  const [scanning, setScanning] = useState(false);
  const [lastConfidence, setLastConfidence] = useState<number | null>(null);

  const [data, setData] = useState<ResearchPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const [age, setAge] = useState(25);
  const [bmi, setBmi] = useState(26.2);
  const [cycleDays, setCycleDays] = useState(42);
  const [lhFsh, setLhFsh] = useState(2.2);
  const [irregular, setIrregular] = useState(true);
  const [androgen, setAndrogen] = useState(true);
  const [calcResult, setCalcResult] = useState<PcosPreviewResult | null>(null);

  useEffect(() => {
    const paramMod = searchParams.get("module") as AiModuleKey | null;
    if (paramMod && VALID_KEYS.has(paramMod)) {
      setActiveModule(paramMod);
    }
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

  const selectModule = (key: AiModuleKey) => {
    setActiveModule(key);
    setSearchParams({ module: key });
    setLastConfidence(null);
  };

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
    <div className="ss-sapphire-always min-h-screen flex flex-col pt-24">
      <PublicFloatingHeader transparentHero />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 pb-16 space-y-10 flex-1">
        {/* Top Lab Banner + Interactive 3D Neural Diagnostic Stage */}
        <section className="ss-sapphire-card rounded-3xl p-6 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-widest text-sky-300">SHASTHOSETU AI RESEARCH LAB</span>
              <TrustBadge kind="RESEARCH_ONLY" />
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold text-white">
              {locale === "bn" ? (
                <>
                  লাইভ ৬-মডিউল এআই{" "}
                  <span className="bg-gradient-to-r from-[#38bdf8] via-[#2dd4bf] to-[#f2c879] bg-clip-text text-transparent">
                    ইনফারেন্স ও গবেষণা স্টুডিও
                  </span>
                </>
              ) : (
                <>
                  Interactive 6-Module{" "}
                  <span className="bg-gradient-to-r from-[#38bdf8] via-[#2dd4bf] to-[#f2c879] bg-clip-text text-transparent">
                    Real Checkpoint Inference Lab
                  </span>
                </>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {locale === "bn" ? data?.non_diagnostic_disclaimer_bn : data?.non_diagnostic_disclaimer_en}
            </p>
            <div className="flex items-start gap-2 rounded-xl border border-amber-400/35 bg-amber-500/10 p-3 text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-300" />
              <span>
                Real backend saved weights (`model_best.joblib`, `resnet18_best.pth`, `resnet18_grouped_best.pth`, EasyOCR `bn+en`, `EXP_B`) execute live on upload. Outputs are research benchmarks, NOT clinical diagnoses.
              </span>
            </div>
          </div>

          <div className="lg:col-span-5 h-[220px] sm:h-[250px]">
            <Suspense fallback={<div className="w-full h-full rounded-2xl bg-[#040a18] border border-sky-400/20" />}>
              <LazyAiModuleScene3D moduleKey={activeModule} scanning={scanning} confidence={lastConfidence} />
            </Suspense>
          </div>
        </section>

        {/* 6-Module Switcher */}
        <section className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5" role="tablist" aria-label="Choose AI Module">
            {AI_MODULES.map((m) => {
              const active = activeModule === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => selectModule(m.key)}
                  data-testid={`select-ai-module-${m.key}`}
                  className={`min-h-14 px-3 py-2.5 rounded-2xl text-left border transition cursor-pointer ${
                    active
                      ? "bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 border-transparent shadow-lg"
                      : "ss-sapphire-card text-slate-200 hover:border-sky-400/50"
                  }`}
                >
                  <div className="text-xs font-bold truncate">{locale === "bn" ? m.labelBn : m.labelEn}</div>
                  <div className={`font-mono text-[10px] mt-0.5 truncate ${active ? "text-slate-900 font-semibold" : "text-slate-400"}`}>
                    {m.sub}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Reusable Land-Guard CyberScan Upload / Scan / Verify / Real Inference Workbench */}
          <CyberScanWorkbench
            activeModule={activeModule}
            onScanStateChange={(sc, conf) => {
              setScanning(sc);
              if (conf !== null) setLastConfidence(conf);
            }}
          />
        </section>

        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            {/* Dataset Reconciliation Cards */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-[#818cf8]" />
                {locale === "bn" ? "সংশোধিত ডেটাসেট ও সীমাবদ্ধতা (FINAL_LOCK)" : "Reconciled Dataset Counts & Known Limitations"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(data?.datasets || []).map((ds) => (
                  <div key={ds.module} className="ss-sapphire-card rounded-2xl p-5 space-y-2 text-white">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-base">{ds.module}</h3>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#818cf8]/20 text-[#c7d2fe]">
                        {ds.scientific_classification}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{ds.dataset_or_scope}</p>
                    <div className="text-xs font-mono font-bold text-sky-300">Reconciled: {ds.reconciled_count}</div>
                    <p className="text-xs text-slate-400 pt-2 border-t border-white/10">{ds.limitations}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Quick Structured Screening Preview (Preserved for E2E & Baseline) */}
            <section className="ss-sapphire-card rounded-3xl p-6 space-y-5 text-white">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold">
                    {locale === "bn" ? "দ্রুত PCOS স্ক্রিনিং প্রিভিউ (গবেষণা)" : "Quick Non-Diagnostic PCOS Indicator Preview"}
                  </h2>
                  <p className="text-xs text-slate-300">
                    Lightweight screening reference alongside full XGBoost inference above.
                  </p>
                </div>
                <TrustBadge kind="RESEARCH_ONLY" />
              </div>

              <form onSubmit={(e) => void runPreview(e)} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <label className="space-y-1 text-xs font-medium text-slate-300">
                  <span>Age (yrs)</span>
                  <input type="number" min={14} max={55} value={age} onChange={(e) => setAge(Number(e.target.value))} className="w-full min-h-11 rounded-xl border border-sky-400/25 bg-black/40 px-3 text-sm text-white" />
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-300">
                  <span>BMI (kg/m²)</span>
                  <input type="number" step="0.1" min={12} max={55} value={bmi} onChange={(e) => setBmi(Number(e.target.value))} className="w-full min-h-11 rounded-xl border border-sky-400/25 bg-black/40 px-3 text-sm text-white" />
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-300">
                  <span>Cycle Length (days)</span>
                  <input type="number" min={15} max={120} value={cycleDays} onChange={(e) => setCycleDays(Number(e.target.value))} className="w-full min-h-11 rounded-xl border border-sky-400/25 bg-black/40 px-3 text-sm text-white" />
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-300">
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
                  <button
                    type="submit"
                    data-testid="run-pcos-preview-btn"
                    className="w-full sm:w-auto min-h-11 px-6 rounded-xl bg-gradient-to-r from-[#818cf8] to-[#38bdf8] text-slate-950 font-bold text-sm cursor-pointer"
                  >
                    {locale === "bn" ? "রিস্ক ইনডেক্স গণনা করুন (গবেষণা)" : "Compute Non-Diagnostic Research Index"}
                  </button>
                </div>
              </form>

              {calcResult && (
                <div data-testid="pcos-preview-result" className="rounded-2xl border border-[#818cf8]/40 bg-[#0b1330]/80 p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono font-bold text-sm text-[#c7d2fe]">
                      {calcResult.band} (Index: {calcResult.screening_index})
                    </span>
                    <span className="text-xs font-mono text-sky-300">{calcResult.model_reference}</span>
                  </div>
                  <p className="text-xs text-slate-200">{calcResult.disclaimer}</p>
                </div>
              )}
            </section>

            {/* Full 16-Model Register Table */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">
                {locale === "bn" ? "চূড়ান্ত ১৬টি মডেলের ইনভেন্টরি (FINAL_RESEARCH_MODEL_REGISTER)" : "All 16 Audited Models (FINAL_RESEARCH_MODEL_REGISTER)"}
              </h2>
              <div className="overflow-x-auto ss-sapphire-card rounded-2xl">
                <table className="w-full text-left text-xs border-collapse text-slate-200">
                  <thead className="bg-white/5 text-slate-400 uppercase font-mono">
                    <tr>
                      <th className="p-3">ID</th>
                      <th className="p-3">Module</th>
                      <th className="p-3">Architecture</th>
                      <th className="p-3">Classification</th>
                      <th className="p-3">Metric</th>
                      <th className="p-3">Value</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.models || []).map((m) => (
                      <tr key={m.model_id} className="border-t border-white/10">
                        <td className="p-3 font-mono font-semibold text-sky-300">{m.model_id}</td>
                        <td className="p-3">{m.module}</td>
                        <td className="p-3">{m.architecture}</td>
                        <td className="p-3">{m.scientific_classification}</td>
                        <td className="p-3">{m.primary_metric_name}</td>
                        <td className="p-3 font-mono font-semibold text-[#f2c879]">{m.primary_metric_value}</td>
                        <td className="p-3">{m.audit_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
