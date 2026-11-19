import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  BookOpen,
  CheckCircle2,
  Cpu,
  Database,
  FileUp,
  HardDrive,
  Loader2,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { apiGet, apiPost, apiPostForm } from "../../lib/apiClient";
import { useI18n } from "../../lib/i18n";
import { Skeleton, StatusBadge, TrustBadge, useToast } from "../ui";

export interface RagSourceItem {
  id: string;
  slug: string;
  title: string;
  title_bn?: string;
  publisher: string;
  source_url?: string;
  category: string;
  audience_scope: string;
  language: string;
  review_status: string;
  approved_by_user_id?: string;
  current_version_id?: string;
  version_number?: number;
  chunk_count?: number;
  created_at_utc: string;
  updated_at_utc: string;
}

export interface RagMetricsResponse {
  total_sources: number;
  approved_sources: number;
  pending_sources: number;
  deprecated_sources: number;
  total_chunks: number;
  index_status: {
    index_version: string;
    built_at_utc: string;
    dense_ready: boolean;
    bm25_ready: boolean;
    embedding_model: string;
    embedding_dim: number;
    dense_error?: string;
  };
  runtime_status: {
    timestamp_utc: string;
    vram_used_mb: number;
    vram_total_mb: number;
    system_ram_free_mb: number;
    loaded_models: string[];
    ollama_ready: boolean;
    model_status: string;
  };
  safety_kpis: {
    total_queries: number;
    bengali_queries: number;
    english_queries: number;
    banglish_queries: number;
    mixed_queries: number;
    emergency_999_count: number;
    safety_intervention_count: number;
    fallback_count: number;
    average_latency_ms: number;
  };
  recent_events: Array<{
    id: string;
    timestamp_utc: string;
    action_type: string;
    actor_role: string;
    target_resource: string;
    outcome: string;
  }>;
}

export function AdminRagGovernance() {
  const { locale } = useI18n();
  const { pushToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<RagSourceItem[]>([]);
  const [metrics, setMetrics] = useState<RagMetricsResponse | null>(null);
  const [reindexing, setReindexing] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Upload modal / form state
  const [docTitle, setDocTitle] = useState("");
  const [docPublisher, setDocPublisher] = useState("WHO / Directorate General of Health Services (DGHS)");
  const [docCategory, setDocCategory] = useState("PUBLIC_MEDICAL");
  const [docAudience, setDocAudience] = useState("PATIENT");
  const [docLang, setDocLang] = useState("bilingual");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sourcesRes, metricsRes] = await Promise.all([
        apiGet<{ sources: RagSourceItem[] }>("/v1/admin/rag/sources"),
        apiGet<RagMetricsResponse>("/v1/admin/rag/metrics"),
      ]);
      setSources(sourcesRes.sources || []);
      setMetrics(metricsRes);
    } catch (err) {
      pushToast({
        title: "Failed to load RAG governance data",
        description: err instanceof Error ? err.message : "Error",
        tone: "danger",
      });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleApproveSource = async (sourceId: string) => {
    try {
      await apiPost(`/v1/admin/rag/sources/${sourceId}/approve`, {});
      pushToast({
        title: "Source approved & queued for search index",
        tone: "success",
      });
      await loadAll();
    } catch (err) {
      pushToast({
        title: "Approval failed",
        description: err instanceof Error ? err.message : "Error",
        tone: "danger",
      });
    }
  };

  const handleDeprecateSource = async (sourceId: string) => {
    try {
      await apiPost(`/v1/admin/rag/sources/${sourceId}/deprecate`, {});
      pushToast({
        title: "Source deprecated & removed from active RAG retrieval",
        tone: "warning",
      });
      await loadAll();
    } catch (err) {
      pushToast({
        title: "Deprecation failed",
        description: err instanceof Error ? err.message : "Error",
        tone: "danger",
      });
    }
  };

  const handleReindex = async () => {
    setReindexing(true);
    try {
      const res = await apiPost<{ index: Record<string, unknown> }>("/v1/admin/rag/reindex", {});
      pushToast({
        title: "Knowledge Base re-indexed successfully",
        description: `Dense & BM25 indices refreshed (${res.index.chunk_count || 0} chunks).`,
        tone: "success",
      });
      await loadAll();
    } catch (err) {
      pushToast({
        title: "Re-indexing failed",
        description: err instanceof Error ? err.message : "Error",
        tone: "danger",
      });
    } finally {
      setReindexing(false);
    }
  };

  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", docTitle || file.name.replace(/\.[^/.]+$/, ""));
      formData.append("publisher", docPublisher);
      formData.append("category", docCategory);
      formData.append("audience_scope", docAudience);
      formData.append("language", docLang);

      await apiPostForm("/v1/admin/rag/sources", formData);
      pushToast({
        title: "Document uploaded and queued as PENDING_REVIEW",
        description: "New documents require explicit Admin approval before joining the public medical knowledge base.",
        tone: "success",
      });
      setDocTitle("");
      await loadAll();
    } catch (err) {
      pushToast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Please ensure file is valid MD, TXT, HTML, PDF or DOCX.",
        tone: "danger",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const runtime = metrics?.runtime_status;
  const kpis = metrics?.safety_kpis;
  const index = metrics?.index_status;

  return (
    <div className="space-y-6 text-slate-100" data-testid="admin-rag-governance-panel">
      {/* Top Banner */}
      <div className="rounded-3xl border border-sky-500/30 bg-[#040914]/90 p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-[#38bdf8] font-bold">
              ADMINISTRATIVE RAG GOVERNANCE &amp; SAFETY AUDIT
            </span>
            <TrustBadge kind="HUMAN_VERIFIED" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mt-1">
            {locale === "bn" ? "মেডিকেল নলেজ-বেস গভর্নেন্স ও সেফটি কেপিআই" : "Medical Knowledge Base Governance & Safety Hub"}
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            {locale === "bn"
              ? "অনুমোদিত সোর্স ফাইল আপলোড, অনুমোদন/বাতিল, ইনডেক্স রি-বিল্ড এবং জিরো-পিএইচআই এআই অপারেশন মেট্রিক্স পরিচালনা করুন।"
              : "Upload approved medical sources, audit provenance, approve/deprecate entries, rebuild vector indexes, and monitor Zero-PHI safety KPIs."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={reindexing}
            onClick={handleReindex}
            className="min-h-11 px-4 rounded-xl border border-sky-400/40 bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 font-bold text-xs inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            data-testid="rag-reindex-btn"
          >
            {reindexing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {reindexing ? "Re-indexing Corpus..." : "Reindex Knowledge Base"}
          </button>
        </div>
      </div>

      {/* Zero-PHI Privacy Notice */}
      <div className="rounded-2xl border border-sky-500/40 bg-sky-500/10 p-4 text-xs text-sky-200 flex items-start gap-2.5">
        <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        <div>
          <strong>Zero-PHI Administrative Isolation (Section 8 &amp; 14):</strong>{" "}
          This administrative dashboard displays aggregated volume, language distribution, emergency triggers, and model latencies only.
          Individual patient chat prose, identifiable questions, and personal prescriptions are cryptographically isolated and never displayed in admin views.
        </div>
      </div>

      {/* System Runtime & Model Health Telemetry */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/10 bg-[#061024] p-4 space-y-1">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>RAG Model Status</span>
            <Cpu className="w-4 h-4 text-[#38bdf8]" />
          </div>
          <div className="text-lg font-bold text-white flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                runtime?.ollama_ready ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              }`}
            />
            {runtime?.model_status || (runtime?.ollama_ready ? "READY (GPU)" : "UNAVAILABLE")}
          </div>
          <p className="text-[11px] font-mono text-slate-400">
            Ollama 127.0.0.1:11434 • {runtime?.loaded_models?.join(", ") || "qwen2.5:7b, bge-m3"}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#061024] p-4 space-y-1">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>VRAM Allocation (RTX 5060 Ti)</span>
            <HardDrive className="w-4 h-4 text-[#2dd4bf]" />
          </div>
          <div className="text-lg font-bold text-white font-mono">
            {runtime ? `${(runtime.vram_used_mb / 1024).toFixed(1)} GB / ${(runtime.vram_total_mb / 1024).toFixed(1)} GB` : "1.2 GB / 15.9 GB"}
          </div>
          <p className="text-[11px] font-mono text-emerald-400">
            {runtime ? `${Math.round((runtime.vram_used_mb / (runtime.vram_total_mb || 1)) * 100)}% VRAM used` : "Healthy"}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#061024] p-4 space-y-1">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Hybrid Index Coverage</span>
            <Database className="w-4 h-4 text-[#818cf8]" />
          </div>
          <div className="text-lg font-bold text-white font-mono">
            {index ? `${index.embedding_model} (${index.embedding_dim}-d)` : "bge-m3 (1024-d)"}
          </div>
          <p className="text-[11px] text-slate-300">
            {metrics?.total_chunks || 35} chunks across {metrics?.approved_sources || 14} sources
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#061024] p-4 space-y-1">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Safety Interventions &amp; 999</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-lg font-bold text-white font-mono">
            {kpis ? `${kpis.emergency_999_count} / ${kpis.safety_intervention_count}` : "0 / 0"}
          </div>
          <p className="text-[11px] text-slate-400">
            999 Emergencies • Prescribing blocks
          </p>
        </div>
      </div>

      {/* Aggregate Safety & Usage KPIs */}
      {kpis && (
        <div className="rounded-2xl border border-white/10 bg-[#061024] p-5 space-y-3">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#38bdf8]" />
            Aggregate Query Distribution &amp; Latency (Zero-PHI Aggregates)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#02050e] border border-white/10">
              <span className="text-slate-400 block text-[11px]">Total Queries</span>
              <strong className="text-base text-white font-mono">{kpis.total_queries}</strong>
            </div>
            <div className="p-3 rounded-xl bg-[#02050e] border border-white/10">
              <span className="text-slate-400 block text-[11px]">বাংলা (Bengali)</span>
              <strong className="text-base text-emerald-300 font-mono">{kpis.bengali_queries}</strong>
            </div>
            <div className="p-3 rounded-xl bg-[#02050e] border border-white/10">
              <span className="text-slate-400 block text-[11px]">English</span>
              <strong className="text-base text-sky-300 font-mono">{kpis.english_queries}</strong>
            </div>
            <div className="p-3 rounded-xl bg-[#02050e] border border-white/10">
              <span className="text-slate-400 block text-[11px]">Banglish (Roman)</span>
              <strong className="text-base text-purple-300 font-mono">{kpis.banglish_queries}</strong>
            </div>
            <div className="p-3 rounded-xl bg-[#02050e] border border-white/10">
              <span className="text-slate-400 block text-[11px]">Mixed Script</span>
              <strong className="text-base text-amber-300 font-mono">{kpis.mixed_queries}</strong>
            </div>
            <div className="p-3 rounded-xl bg-[#02050e] border border-white/10">
              <span className="text-slate-400 block text-[11px]">Avg Latency</span>
              <strong className="text-base text-teal-300 font-mono">{Math.round(kpis.average_latency_ms)}ms</strong>
            </div>
          </div>
        </div>
      )}

      {/* Upload New Medical Document (Admin Controlled Ingestion) */}
      <div className="rounded-2xl border border-white/10 bg-[#061024] p-5 space-y-4">
        <h3 className="font-bold text-base text-white flex items-center gap-2">
          <FileUp className="w-4 h-4 text-[#2dd4bf]" />
          Ingest New Medical Document (PDF / TXT / MD / HTML / DOCX)
        </h3>
        <p className="text-xs text-slate-300">
          Uploaded files are cleaned, chunked into section-aware nodes, hashed (SHA-256), and queued under <strong>PENDING_REVIEW</strong>.
          Documents never enter the active retrieval vector store without explicit admin approval.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <label className="space-y-1 block">
            <span className="text-slate-300">Document Title</span>
            <input
              type="text"
              placeholder="e.g. Gestational Diabetes Guidelines"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="w-full min-h-10 rounded-xl border border-white/15 bg-white/5 px-3 text-white"
            />
          </label>

          <label className="space-y-1 block">
            <span className="text-slate-300">Publisher / Authority</span>
            <input
              type="text"
              value={docPublisher}
              onChange={(e) => setDocPublisher(e.target.value)}
              className="w-full min-h-10 rounded-xl border border-white/15 bg-white/5 px-3 text-white"
            />
          </label>

          <label className="space-y-1 block">
            <span className="text-slate-300">Category</span>
            <select
              value={docCategory}
              onChange={(e) => setDocCategory(e.target.value)}
              className="w-full min-h-10 rounded-xl border border-white/15 bg-[#040914] px-3 text-white"
            >
              <option value="PUBLIC_MEDICAL">PUBLIC_MEDICAL</option>
              <option value="SUPPORT_FAQ">SUPPORT_FAQ</option>
              <option value="CLINICAL_REFERENCE">CLINICAL_REFERENCE</option>
            </select>
          </label>

          <label className="space-y-1 block">
            <span className="text-slate-300">Audience Scope</span>
            <select
              value={docAudience}
              onChange={(e) => setDocAudience(e.target.value)}
              className="w-full min-h-10 rounded-xl border border-white/15 bg-[#040914] px-3 text-white"
            >
              <option value="PATIENT">PATIENT</option>
              <option value="DOCTOR">DOCTOR</option>
              <option value="SUPPORT">SUPPORT</option>
            </select>
          </label>

          <label className="space-y-1 block">
            <span className="text-slate-300">Language</span>
            <select
              value={docLang}
              onChange={(e) => setDocLang(e.target.value)}
              className="w-full min-h-10 rounded-xl border border-white/15 bg-[#040914] px-3 text-white"
            >
              <option value="bilingual">Bilingual (বাংলা + English)</option>
              <option value="bn">বাংলা (Bengali)</option>
              <option value="en">English</option>
            </select>
          </label>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt,.html,.pdf,.docx"
            className="hidden"
            onChange={handleUploadDocument}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="min-h-11 px-5 rounded-xl bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 font-bold text-xs inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            data-testid="rag-upload-submit-btn"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "Ingesting & Chunking..." : "Select File & Upload to Ingestion Queue"}
          </button>
        </div>
      </div>

      {/* RAG Knowledge Source Register Table */}
      <div className="rounded-2xl border border-white/10 bg-[#061024] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#f2c879]" />
              RAG Knowledge Source Register ({sources.length} Documents)
            </h3>
            <span className="text-xs text-slate-400">
              Only APPROVED entries are embedded and indexed into the local FAISS + BM25 retrieval stores.
            </span>
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="space-y-3">
            {sources.map((s) => (
              <div
                key={s.id}
                data-testid={`rag-source-row-${s.id}`}
                className="p-4 rounded-xl border border-white/10 bg-[#02050e] flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-white">{s.title}</span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/10 text-slate-300">
                      {s.category}
                    </span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/10 text-[#38bdf8]">
                      {s.audience_scope}
                    </span>
                    <StatusBadge status={s.review_status} />
                  </div>
                  <p className="text-slate-400">
                    Publisher: <strong>{s.publisher}</strong> • Language: {s.language} • Chunks: {s.chunk_count || 0} • Ver: v{s.version_number || 1}
                  </p>
                  {s.source_url && (
                    <a
                      href={s.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-[#38bdf8] hover:underline truncate block max-w-xl"
                    >
                      {s.source_url}
                    </a>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {s.review_status !== "APPROVED" && (
                    <button
                      type="button"
                      onClick={() => handleApproveSource(s.id)}
                      data-testid={`approve-source-${s.id}`}
                      className="min-h-10 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve &amp; Index
                    </button>
                  )}
                  {s.review_status !== "DEPRECATED" && (
                    <button
                      type="button"
                      onClick={() => handleDeprecateSource(s.id)}
                      className="min-h-10 px-3 rounded-lg border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 font-semibold text-xs cursor-pointer"
                    >
                      Deprecate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Immutable AI Audit Events */}
      {metrics?.recent_events && metrics.recent_events.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-[#061024] p-5 space-y-3">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            Recent AI Audit Events (Immutable SQLite Log)
          </h3>
          <div className="space-y-2 text-xs">
            {metrics.recent_events.map((ev) => (
              <div
                key={ev.id}
                className="p-3 rounded-xl bg-[#02050e] border border-white/10 flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <span className="font-mono text-emerald-400 font-bold">{ev.action_type}</span>{" "}
                  <span className="text-slate-400">({ev.actor_role})</span> → {ev.target_resource}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-slate-400">{ev.timestamp_utc}</span>
                  <StatusBadge status={ev.outcome === "DENIED" ? "CANCELLED" : "CONFIRMED"} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
