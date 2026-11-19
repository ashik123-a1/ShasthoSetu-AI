import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Code2,
  Cpu,
  Database,
  FileCheck2,
  FlaskConical,
  GitBranch,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { apiGet } from "../lib/apiClient";
import { useI18n } from "../lib/i18n";
import { PublicFloatingHeader } from "../components/layout/PublicFloatingHeader";
import { PublicFooter } from "../components/layout/PublicFooter";
import { PageBackdropLayer } from "../components/layout/PageBackdropLayer";
import { Skeleton, TrustBadge } from "../components/ui";

const MODEL_SLUGS = [
  { slug: "pcos-clinical", label: "01 PCOS Clinical" },
  { slug: "pcos-ultrasound", label: "02 PCOS Ultrasound" },
  { slug: "viral-rash", label: "03 Viral Rash" },
  { slug: "prescription-ocr", label: "04 Safe OCR" },
  { slug: "bangla-voice", label: "05 Bangla Voice" },
  { slug: "dermoped", label: "06 DermoPed" },
];

interface ModelDossierPayload {
  slug: string;
  module_code: string;
  title: string;
  title_bn: string;
  champion_model_id: string;
  health_service_tool_url: string;
  accent: string;
  is_deferred: boolean;
  dataset_summary: string;
  class_distribution: Array<{ label: string; count: number; pct: number; color: string }>;
  preprocessing_steps: string[];
  split_breakdown: Array<{ split: string; units: string; groups: string; overlap: string }>;
  architecture_specs: Record<string, string>;
  evaluation_metrics: Array<{ name: string; value: string; note: string }>;
  leakage_audit: string;
  code_methodology: string;
  limitations: string[];
  safety_boundary: string;
  related_register_models: Array<Record<string, string>>;
  related_dataset_rows: Array<Record<string, string>>;
  dermoped_checkpoint_verification?: Array<Record<string, string>>;
}

export function ResearchModelDetailPage() {
  const { modelSlug = "pcos-clinical" } = useParams();
  const { locale } = useI18n();
  const [dossier, setDossier] = useState<ModelDossierPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCodeNote, setShowCodeNote] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const res = await apiGet<ModelDossierPayload>(`/v1/public/research/models/${encodeURIComponent(modelSlug)}`);
        if (active) setDossier(res);
      } catch {
        if (active) setDossier(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [modelSlug]);

  return (
    <div className="ss-sapphire-always relative min-h-screen flex flex-col pt-24 overflow-x-clip text-white" data-testid="research-model-detail-page">
      <PageBackdropLayer imageSrc="/images/backgrounds/bg-ai-research.jpg" />
      <PublicFloatingHeader transparentHero />

      <main className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 pb-16 space-y-8 flex-1">
        {/* Top Switcher & Back Link */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/research" className="inline-flex items-center gap-1.5 text-xs font-mono text-sky-300 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> Back to AI &amp; Research Hub
          </Link>
          <div className="flex flex-wrap gap-1.5">
            {MODEL_SLUGS.map((item) => (
              <Link
                key={item.slug}
                to={`/research/${item.slug}`}
                className={`px-3 py-1.5 rounded-full text-[11px] font-mono font-bold border transition ${
                  item.slug === modelSlug
                    ? "bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 border-transparent"
                    : "bg-[#040a18]/80 border-white/15 text-slate-300 hover:border-sky-400/50"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-96 w-full" />
        ) : !dossier ? (
          <div className="ss-sapphire-card rounded-3xl p-8 text-center space-y-4">
            <h1 className="text-2xl font-bold">Research Model Dossier Not Found</h1>
            <Link to="/research" className="min-h-11 px-5 rounded-full bg-sky-400 text-slate-950 font-bold text-xs inline-flex items-center">
              Return to AI &amp; Research
            </Link>
          </div>
        ) : (
          <>
            {/* Hero Dossier Summary */}
            <section className="ss-sapphire-card rounded-3xl p-6 sm:p-8 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-mono text-xs uppercase tracking-[0.2em]" style={{ color: dossier.accent }}>
                  {dossier.module_code} • CHAMPION {dossier.champion_model_id}
                </span>
                <div className="flex items-center gap-2">
                  {dossier.is_deferred ? (
                    <span className="font-mono text-[10px] px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 inline-flex items-center gap-1 font-bold">
                      <Lock className="w-3.5 h-3.5" /> PHASE G DEFERRED
                    </span>
                  ) : (
                    <TrustBadge kind="RESEARCH_ONLY" />
                  )}
                </div>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
                <div className="space-y-2 max-w-3xl">
                  <h1 className="text-2xl sm:text-4xl font-bold">
                    {locale === "bn" ? dossier.title_bn : dossier.title}
                  </h1>
                  <p className="text-sm text-slate-300 leading-relaxed">{dossier.dataset_summary}</p>
                </div>

                <Link
                  to={dossier.health_service_tool_url}
                  className="min-h-12 px-6 rounded-full bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 font-bold text-xs inline-flex items-center gap-2 shrink-0 shadow-lg"
                >
                  Try Live AI Tool in Health Services <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="rounded-2xl border border-amber-400/35 bg-amber-500/10 p-4 text-xs text-amber-100 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <span>{dossier.safety_boundary}</span>
              </div>
            </section>

            {/* Dataset Distribution + Split Protocol */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 ss-sapphire-card rounded-3xl p-6 space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Database className="w-5 h-5 text-[#38bdf8]" /> Class Distribution &amp; Sample Scope
                </h2>
                <div className="space-y-3">
                  {dossier.class_distribution.map((cls) => (
                    <div key={cls.label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-white">{cls.label}</span>
                        <span className="font-mono text-slate-300">
                          {cls.count} ({cls.pct}%)
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, cls.pct)}%`, background: cls.color }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-white/10 space-y-2">
                  <div className="text-xs font-mono text-sky-300 uppercase">Preprocessing &amp; Hygiene</div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {dossier.preprocessing_steps.map((step) => (
                      <li key={step} className="flex items-start gap-2">
                        <span className="text-[#2dd4bf]">•</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="lg:col-span-7 ss-sapphire-card rounded-3xl p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <GitBranch className="w-5 h-5 text-[#2dd4bf]" /> Train / Validation / Test Split &amp; Leakage Audit
                  </h2>
                  <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/35 text-emerald-200 inline-flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Zero Cross-Split Leakage
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#040a18]/75">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-white/5 text-slate-400 font-mono uppercase">
                      <tr>
                        <th className="p-3">Partition</th>
                        <th className="p-3">Units</th>
                        <th className="p-3">Independent Groups</th>
                        <th className="p-3">Overlap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dossier.split_breakdown.map((row) => (
                        <tr key={row.split} className="border-t border-white/10">
                          <td className="p-3 font-semibold text-white">{row.split}</td>
                          <td className="p-3 font-mono text-sky-300">{row.units}</td>
                          <td className="p-3 text-slate-300">{row.groups}</td>
                          <td className="p-3 font-mono text-emerald-300 font-bold">{row.overlap}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-xl bg-black/35 border border-white/10 p-3.5 text-xs text-slate-300">
                  <strong className="text-sky-300">Leakage Verification:</strong> {dossier.leakage_audit}
                </div>

                {/* Architecture Key/Value Specs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(dossier.architecture_specs).map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-[#040a18]/80 border border-white/10 p-3">
                      <div className="font-mono text-[10px] uppercase text-slate-400">{k.replace(/_/g, " ")}</div>
                      <div className="text-xs font-semibold text-white mt-0.5 break-all">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Evaluation Metrics + Limitations */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 ss-sapphire-card rounded-3xl p-6 space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-[#818cf8]" /> Audited Evaluation Metrics &amp; Benchmarks
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {dossier.evaluation_metrics.map((m) => (
                    <div key={m.name} className="rounded-2xl bg-[#040a18]/80 border border-sky-400/20 p-4 space-y-1">
                      <div className="text-xs text-slate-300">{m.name}</div>
                      <div className="text-xl font-bold font-mono text-[#f2c879]">{m.value}</div>
                      <div className="text-[11px] text-slate-400">{m.note}</div>
                    </div>
                  ))}
                </div>

                {/* Expandable Code Methodology Note */}
                <div className="rounded-2xl border border-white/15 bg-black/30 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowCodeNote((v) => !v)}
                    className="w-full px-4 py-3 text-left text-xs font-mono font-bold flex items-center justify-between cursor-pointer text-sky-300"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Code2 className="w-4 h-4" /> Code Methodology &amp; Reproducibility Note
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showCodeNote ? "rotate-180" : ""}`} />
                  </button>
                  {showCodeNote && (
                    <div className="px-4 pb-4 text-xs text-slate-300 leading-relaxed border-t border-white/10 pt-3">
                      {dossier.code_methodology}
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-5 ss-sapphire-card rounded-3xl p-6 space-y-4 border-amber-400/30">
                <h2 className="text-lg font-bold flex items-center gap-2 text-amber-200">
                  <Cpu className="w-5 h-5" /> Honest Limitations &amp; Caveats
                </h2>
                <ul className="space-y-3 text-xs text-slate-200 leading-relaxed">
                  {dossier.limitations.map((lim) => (
                    <li key={lim} className="rounded-xl bg-amber-500/10 border border-amber-400/25 p-3">
                      {lim}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Checkpoint Provenance & Model Comparisons from FINAL_RESEARCH_MODEL_REGISTER.csv */}
            <section className="ss-sapphire-card rounded-3xl p-6 space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-[#2dd4bf]" /> Checkpoint Provenance &amp; Baseline Comparisons (FINAL_LOCK)
              </h2>
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#040a18]/75">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-white/5 text-slate-400 font-mono uppercase">
                    <tr>
                      <th className="p-3">Model ID</th>
                      <th className="p-3">Architecture</th>
                      <th className="p-3">Metric</th>
                      <th className="p-3">Audit Status</th>
                      <th className="p-3">SHA-256 / Artifact Proof</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dossier.related_register_models.map((row) => (
                      <tr key={row.model_id} className="border-t border-white/10">
                        <td className="p-3 font-mono font-bold text-sky-300">{row.model_id}</td>
                        <td className="p-3 font-semibold text-white">{row.model_name}</td>
                        <td className="p-3 font-mono text-[#f2c879]">{row.primary_metric_value}</td>
                        <td className="p-3 font-mono text-[11px]">{row.audit_status}</td>
                        <td className="p-3 font-mono text-[10px] text-slate-400 max-w-xs break-all">
                          {row.local_checkpoint_path}
                          {row.sha256_hash && row.sha256_hash !== "N/A" ? ` • sha256:${row.sha256_hash.slice(0, 14)}...` : ""}
                        </td>
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
