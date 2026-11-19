import { useEffect, useState } from "react";
import { AlertTriangle, FlaskConical } from "lucide-react";
import { apiGet, apiPost } from "../lib/apiClient";
import { useI18n } from "../lib/i18n";
import { PublicFloatingHeader } from "../components/layout/PublicFloatingHeader";
import { PublicFooter } from "../components/layout/PublicFooter";
import { Skeleton, TrustBadge } from "../components/ui";

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

export function PublicResearchPage() {
  const { locale } = useI18n();
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
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-text)] pt-24">
      <PublicFloatingHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 space-y-10">
        <div className="rounded-3xl border border-amber-500/40 bg-amber-500/10 p-5 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold">
                {locale === "bn" ? "নিরীক্ষিত এআই গবেষণা পোর্টফোলিও (৬টি ট্র্যাক)" : "Audited 6-Module AI Research Showcase"}
              </h1>
              <TrustBadge kind="RESEARCH_ONLY" />
            </div>
            <p className="text-sm text-[var(--color-text)]">
              {locale === "bn" ? data?.non_diagnostic_disclaimer_bn : data?.non_diagnostic_disclaimer_en}
            </p>
            <p className="text-xs font-mono text-[var(--color-text-muted)]">
              Lock Verdict: {data?.audit_verdict || "RESEARCH_AUDIT_PASS_WITH_LIMITATIONS"}
            </p>
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            {/* Dataset Reconciliation Cards */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-violet-500" />
                {locale === "bn" ? "সংশোধিত ডেটাসেট ও সীমাবদ্ধতা (FINAL_LOCK)" : "Reconciled Dataset Counts & Known Limitations"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(data?.datasets || []).map((ds) => (
                  <div key={ds.module} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-base">{ds.module}</h3>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-300">
                        {ds.scientific_classification}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">{ds.dataset_or_scope}</p>
                    <div className="text-xs font-mono font-bold text-[var(--color-primary)]">Reconciled: {ds.reconciled_count}</div>
                    <p className="text-xs text-[var(--color-text-muted)] pt-2 border-t border-[var(--color-border)]">{ds.limitations}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Interactive Non-Diagnostic PCOS Research Preview Calculator */}
            <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold">
                    {locale === "bn" ? "PCOS নন-ডায়াগনস্টিক রিস্ক-ফ্যাক্টর প্রিভিউ (গবেষণা)" : "Interactive Non-Diagnostic PCOS Indicator Preview"}
                  </h2>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Evaluated alongside M01-XGB-01 context (N=88 benchmark; 88.57% CV Balanced Acc) — not a clinical diagnosis.
                  </p>
                </div>
                <TrustBadge kind="RESEARCH_ONLY" />
              </div>

              <form onSubmit={(e) => void runPreview(e)} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <label className="space-y-1 text-xs font-medium">
                  <span>Age (yrs)</span>
                  <input type="number" min={14} max={55} value={age} onChange={(e) => setAge(Number(e.target.value))} className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm" />
                </label>
                <label className="space-y-1 text-xs font-medium">
                  <span>BMI (kg/m²)</span>
                  <input type="number" step="0.1" min={12} max={55} value={bmi} onChange={(e) => setBmi(Number(e.target.value))} className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm" />
                </label>
                <label className="space-y-1 text-xs font-medium">
                  <span>Cycle Length (days)</span>
                  <input type="number" min={15} max={120} value={cycleDays} onChange={(e) => setCycleDays(Number(e.target.value))} className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm" />
                </label>
                <label className="space-y-1 text-xs font-medium">
                  <span>LH / FSH Ratio</span>
                  <input type="number" step="0.1" min={0.1} max={10} value={lhFsh} onChange={(e) => setLhFsh(Number(e.target.value))} className="w-full min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-sm" />
                </label>
                <label className="flex items-center gap-2 text-sm min-h-11 cursor-pointer">
                  <input type="checkbox" checked={irregular} onChange={(e) => setIrregular(e.target.checked)} className="w-4 h-4" />
                  <span>Irregular Cycles</span>
                </label>
                <label className="flex items-center gap-2 text-sm min-h-11 cursor-pointer">
                  <input type="checkbox" checked={androgen} onChange={(e) => setAndrogen(e.target.checked)} className="w-4 h-4" />
                  <span>Acne / Hirsutism</span>
                </label>
                <div className="lg:col-span-2">
                  <button
                    type="submit"
                    data-testid="run-pcos-preview-btn"
                    className="w-full sm:w-auto min-h-11 px-6 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm cursor-pointer"
                  >
                    {locale === "bn" ? "রিস্ক ইনডেক্স গণনা করুন (গবেষণা)" : "Compute Non-Diagnostic Research Index"}
                  </button>
                </div>
              </form>

              {calcResult && (
                <div data-testid="pcos-preview-result" className="rounded-2xl border border-violet-500/40 bg-violet-500/10 p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono font-bold text-sm text-violet-700 dark:text-violet-300">
                      {calcResult.band} (Index: {calcResult.screening_index})
                    </span>
                    <span className="text-xs font-mono">{calcResult.model_reference}</span>
                  </div>
                  <p className="text-xs text-[var(--color-text)]">{calcResult.disclaimer}</p>
                </div>
              )}
            </section>

            {/* Full 16-Model Register Table */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold">
                {locale === "bn" ? "চূড়ান্ত ১৬টি মডেলের ইনভেন্টরি (FINAL_RESEARCH_MODEL_REGISTER)" : "All 16 Audited Models (FINAL_RESEARCH_MODEL_REGISTER)"}
              </h2>
              <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] uppercase">
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
                      <tr key={m.model_id} className="border-t border-[var(--color-border)]">
                        <td className="p-3 font-mono font-semibold">{m.model_id}</td>
                        <td className="p-3">{m.module}</td>
                        <td className="p-3">{m.architecture}</td>
                        <td className="p-3">{m.scientific_classification}</td>
                        <td className="p-3">{m.primary_metric_name}</td>
                        <td className="p-3 font-mono font-semibold">{m.primary_metric_value}</td>
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
