import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Pill,
  RotateCw,
  ScanText,
  UploadCloud,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { apiGet, apiPost, apiPostForm } from "../../lib/apiClient";
import { useAuth } from "../../lib/authContext";
import { useI18n } from "../../lib/i18n";
import { StatusBadge, TrustBadge, useToast } from "../ui";
import { CitationDrawer, type CitationRef } from "./CitationDrawer";
import { SafeMarkdown } from "./SafeMarkdown";

export interface OcrCandidate {
  group_index: number;
  medicine_name: string;
  strength?: string;
  dose?: string;
  frequency?: string;
  duration?: string;
  route?: string;
  confidence: number;
  is_verified?: boolean;
}

export interface OcrBoundingBox {
  text: string;
  confidence: number;
  x_pct: number;
  y_pct: number;
  w_pct: number;
  h_pct: number;
  page?: number;
}

export interface OcrJobPayload {
  id: string;
  document_id: string;
  original_filename: string;
  patient_profile_id?: string;
  status: string;
  authorization_state?: string;
  clinician_verified?: boolean;
  mean_confidence: number;
  page_count: number;
  raw_text?: string;
  corrected_text?: string;
  fields: Array<{
    id: string;
    field_type: string;
    raw_ocr_text: string;
    verified_value?: string | null;
    confidence: number;
    is_critical: number;
    is_verified: number;
  }>;
  candidates: OcrCandidate[];
  bounding_boxes: OcrBoundingBox[];
  created_at_utc?: string;
}

interface PrescriptionOcrStudioProps {
  initialJobId?: string | null;
  onPlanActivated?: () => void;
  compact?: boolean;
}

export function PrescriptionOcrStudio({
  initialJobId,
  onPlanActivated,
}: PrescriptionOcrStudioProps) {
  const { locale } = useI18n();
  const { authenticated } = useAuth();
  const { pushToast } = useToast();

  const [activeJob, setActiveJob] = useState<OcrJobPayload | null>(null);
  const [loadingJob, setLoadingJob] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Viewer controls
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [showBoxes, setShowBoxes] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Field edits state
  const [fieldEdits, setFieldEdits] = useState<Record<string, string>>({});
  const [savingVerification, setSavingVerification] = useState(false);

  // Explain prescription state
  const [explaining, setExplaining] = useState(false);
  const [explanationData, setExplanationData] = useState<{
    explanation_markdown: string;
    citations: CitationRef[];
    language: string;
    disclaimers: string[];
  } | null>(null);
  const [activeCitation, setActiveCitation] = useState<CitationRef | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadJob = useCallback(async (jobId: string) => {
    setLoadingJob(true);
    try {
      const res = await apiGet<any>(`/v1/ai/ocr/${jobId}`);
      const rawJob = res.job ?? res;
      const job: OcrJobPayload = {
        ...rawJob,
        id: rawJob.id || rawJob.ocr_job_id || jobId,
        document_id: rawJob.document_id || "",
        original_filename: rawJob.original_filename || "prescription.png",
        status: rawJob.status || "NEEDS_REVIEW",
        mean_confidence: Number(rawJob.mean_confidence ?? 0),
        page_count: Number(res.page_count ?? rawJob.page_count ?? 1),
        fields: res.fields ?? rawJob.fields ?? [],
        candidates: res.candidates ?? rawJob.candidates ?? [],
        bounding_boxes: res.bounding_boxes ?? rawJob.bounding_boxes ?? [],
      };
      setActiveJob(job);
      const edits: Record<string, string> = {};
      for (const f of job.fields || []) {
        edits[f.id] = f.verified_value ?? f.raw_ocr_text;
      }
      setFieldEdits(edits);
      setExplanationData(null);
      setCurrentPage(1);
      setZoom(100);
      setRotation(0);
    } catch (err) {
      pushToast({
        title: locale === "bn" ? "OCR লোড ব্যর্থ" : "Failed to load OCR job",
        description: err instanceof Error ? err.message : "Error",
        tone: "danger",
      });
    } finally {
      setLoadingJob(false);
    }
  }, [locale, pushToast]);

  const loadRecentMine = useCallback(async () => {
    if (!authenticated) return;
    try {
      const res = await apiGet<{ jobs: any[] }>("/v1/ai/ocr/mine");
      const firstId = res.jobs?.[0]?.id || res.jobs?.[0]?.ocr_job_id;
      if (!activeJob && firstId && !initialJobId) {
        void loadJob(firstId);
      }
    } catch {
      // safe fallback
    }
  }, [authenticated, activeJob, initialJobId, loadJob]);

  useEffect(() => {
    if (initialJobId) {
      void loadJob(initialJobId);
    } else {
      void loadRecentMine();
    }
  }, [initialJobId, loadJob, loadRecentMine]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiPostForm<any>("/v1/ai/ocr/upload", formData);
      const rawJob = res.job ?? res;
      const job: OcrJobPayload = {
        ...rawJob,
        id: rawJob.id || rawJob.ocr_job_id,
        document_id: rawJob.document_id || "",
        original_filename: rawJob.original_filename || file.name,
        status: rawJob.status || "NEEDS_REVIEW",
        mean_confidence: Number(rawJob.mean_confidence ?? 0),
        page_count: Number(rawJob.page_count ?? 1),
        fields: rawJob.fields || [],
        candidates: rawJob.candidates || [],
        bounding_boxes: rawJob.bounding_boxes || [],
      };
      pushToast({
        title: locale === "bn" ? "প্রেসক্রিপশন সফলভাবে প্রক্রিয়াকৃত" : "Prescription processed successfully",
        description: `${job.original_filename} (${Math.round(job.mean_confidence * 100)}% conf)`,
        tone: "success",
      });
      setActiveJob(job);
      const edits: Record<string, string> = {};
      for (const f of job.fields || []) {
        edits[f.id] = f.verified_value ?? f.raw_ocr_text;
      }
      setFieldEdits(edits);
      setExplanationData(null);
      void loadRecentMine();
    } catch (err) {
      pushToast({
        title: locale === "bn" ? "আপলোড বা OCR ব্যর্থ হয়েছে" : "OCR upload failed",
        description: err instanceof Error ? err.message : "Please upload a clear JPG, PNG or PDF.",
        tone: "danger",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleVerifyAll = async () => {
    if (!activeJob) return;
    setSavingVerification(true);
    try {
      const res = await apiPost<{ job: OcrJobPayload }>(`/v1/ai/ocr/${activeJob.id}/verify`, {
        verified_fields: fieldEdits,
      });
      setActiveJob(res.job);
      pushToast({
        title: locale === "bn" ? "প্রেসক্রিপশন মানব-যাচাইকৃত হিসেবে সংরক্ষিত" : "Prescription human-verified",
        description: locale === "bn" ? "সবগুলো ক্ষেত্র সংরক্ষিত হয়েছে।" : "All fields saved with human verification audit trail.",
        tone: "success",
      });
      void loadRecentMine();
      if (onPlanActivated) onPlanActivated();
    } catch (err) {
      pushToast({
        title: locale === "bn" ? "যাচাই সংরক্ষণ ব্যর্থ" : "Verification save failed",
        description: err instanceof Error ? err.message : "Error",
        tone: "danger",
      });
    } finally {
      setSavingVerification(false);
    }
  };

  const handleExplainPrescription = async () => {
    if (!activeJob) return;
    setExplaining(true);
    try {
      const res = await apiPost<{
        explanation_markdown: string;
        citations: CitationRef[];
        language: string;
        disclaimers: string[];
      }>(`/v1/ai/ocr/${activeJob.id}/explain`, {
        user_language: locale === "bn" ? "bn" : "en",
      });
      setExplanationData(res);
      pushToast({
        title: locale === "bn" ? "এআই ব্যাখ্যা প্রস্তুত" : "AI Explanation generated",
        tone: "success",
      });
    } catch (err) {
      pushToast({
        title: locale === "bn" ? "ব্যাখ্যা তৈরি ব্যর্থ" : "Failed to generate explanation",
        description: err instanceof Error ? err.message : "Error",
        tone: "danger",
      });
    } finally {
      setExplaining(false);
    }
  };

  const previewUrl = activeJob ? `/v1/ai/ocr/${activeJob.id}/preview?page=${currentPage}` : null;
  const pageBoxes = (activeJob?.bounding_boxes || []).filter(
    (b) => !b.page || b.page === currentPage
  );

  return (
    <div className="space-y-6 text-slate-100" data-testid="prescription-ocr-studio">
      {/* Studio Top Action Bar */}
      <div className="rounded-3xl border border-sky-500/30 bg-[#040914]/90 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-[#2dd4bf] font-bold">
              BILINGUAL PRESCRIPTION OCR &amp; EXPLANATION STUDIO
            </span>
            <TrustBadge kind="HUMAN_VERIFIED" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mt-1">
            {locale === "bn"
              ? "প্রেসক্রিপশন ওসিআর ও এআই ব্যাখ্যা ওয়ার্কবেঞ্চ"
              : "Prescription OCR & Grounded AI Explanation"}
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            {locale === "bn"
              ? "বাংলা ও ইংরেজি প্রেসক্রিপশন স্ক্যান করুন, ভুল তথ্য মানব-হাতে ঠিক করুন এবং অনুমোদিত মেডিকেল সোর্স থেকে সহজ ব্যাখ্যা নিন।"
              : "Scan Bengali & English prescriptions, correct OCR errors with mandatory human verification, and generate grounded plain-language explanations."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.pdf,.webp"
            className="hidden"
            onChange={handleFileUpload}
            data-testid="ocr-file-input"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="min-h-11 px-4 rounded-xl bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            data-testid="upload-rx-button"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            {uploading
              ? locale === "bn" ? "প্রক্রিয়াকরণ হচ্ছে..." : "Running OCR..."
              : locale === "bn" ? "নতুন প্রেসক্রিপশন আপলোড (JPG/PNG/PDF)" : "Upload Prescription (JPG/PNG/PDF)"}
          </button>
        </div>
      </div>

      {/* Safety Banner */}
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-200 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong>{locale === "bn" ? "চিকিৎসাগত নিরাপত্তা সতর্কতা:" : "Clinical Safety Boundary (Section 7):"}</strong>{" "}
          {locale === "bn"
            ? "ওসিআর প্রযুক্তি প্রেসক্রিপশনের হাতের লেখা পুরোপুরি নিখুঁত পড়তে পারে না। সেবনসূচী বা ডোজ নিশ্চিত করার আগে ডানপাশের বাক্সে তথ্যগুলো যাচাই ও সংশোধন করুন।"
            : "Prescription OCR is an assistance tool and can misread handwriting. Always verify medicine name, strength, and dosage before relying on reminders or explanations."}
        </div>
      </div>

      {/* Main Split-Pane Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANE: Document Preview with Zoom/Rotate & Bounding Boxes */}
        <div className="lg:col-span-6 space-y-3">
          <div className="rounded-2xl border border-white/10 bg-[#061024] p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 font-mono text-slate-300">
              <ScanText className="w-4 h-4 text-[#38bdf8]" />
              <span>{activeJob ? activeJob.original_filename : "No document loaded"}</span>
              {activeJob && (
                <span className="text-[11px] text-slate-400">
                  ({Math.round((activeJob.mean_confidence || 0) * 100)}% conf)
                </span>
              )}
            </div>

            {/* Viewer Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(50, z - 20))}
                title="Zoom Out"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px] px-1.5">{zoom}%</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(250, z + 20))}
                title="Zoom In"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                title="Rotate 90deg"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer ml-1"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowBoxes((v) => !v)}
                className={`min-h-8 px-2 rounded-lg font-mono text-[11px] cursor-pointer ml-1 ${
                  showBoxes ? "bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40" : "bg-white/10 text-slate-400"
                }`}
              >
                {showBoxes ? "BBoxes ON" : "BBoxes OFF"}
              </button>
            </div>
          </div>

          {/* Canvas Preview Area */}
          <div className="relative rounded-2xl border border-white/10 bg-[#02050e] overflow-auto h-[540px] flex items-center justify-center p-4">
            {loadingJob ? (
              <div className="text-center space-y-2">
                <Loader2 className="w-8 h-8 text-[#38bdf8] animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-mono">Loading preview &amp; OCR regions...</p>
              </div>
            ) : previewUrl ? (
              <div
                className="relative inline-block transition-transform duration-150 origin-center"
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                }}
              >
                <img
                  src={previewUrl}
                  alt="Prescription preview"
                  className="max-w-none rounded shadow-2xl block"
                  style={{ maxHeight: "490px" }}
                />

                {/* Bounding box overlays */}
                {showBoxes &&
                  pageBoxes.map((box, idx) => (
                    <div
                      key={idx}
                      title={`${box.text} (${Math.round(box.confidence * 100)}%)`}
                      className="absolute border border-emerald-400/70 bg-emerald-400/15 pointer-events-auto hover:bg-emerald-400/35 transition"
                      style={{
                        left: `${box.x_pct}%`,
                        top: `${box.y_pct}%`,
                        width: `${box.w_pct}%`,
                        height: `${box.h_pct}%`,
                      }}
                    />
                  ))}
              </div>
            ) : (
              <div className="text-center p-8 space-y-3">
                <FileText className="w-12 h-12 text-slate-500 mx-auto" />
                <p className="text-sm text-slate-400">
                  {locale === "bn"
                    ? "কোনো প্রেসক্রিপশন নির্বাচন করা হয়নি। উপরে আপলোড করুন।"
                    : "No prescription selected. Upload an image or PDF to inspect OCR."}
                </p>
              </div>
            )}
          </div>

          {/* Page Selector if multi-page */}
          {activeJob && activeJob.page_count > 1 && (
            <div className="flex items-center justify-between text-xs text-slate-400 px-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="min-h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous Page
              </button>
              <span className="font-mono">
                Page {currentPage} of {activeJob.page_count}
              </span>
              <button
                type="button"
                disabled={currentPage >= activeJob.page_count}
                onClick={() => setCurrentPage((p) => Math.min(activeJob.page_count, p + 1))}
                className="min-h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
              >
                Next Page <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* RIGHT PANE: Extracted Medicine Candidates, Human Edits & Explanation */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-[#061024] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Pill className="w-4 h-4 text-[#f2c879]" />
                  {locale === "bn" ? "সনাক্তকৃত ওষুধের তালিকা (৬টি ফিল্ড)" : "Extracted Medications (6 Critical Fields)"}
                </h3>
                <span className="text-[11px] text-slate-400">
                  Medicine Name • Strength • Dose • Frequency • Duration • Route
                </span>
              </div>
              <StatusBadge status={activeJob?.status || "NEEDS_REVIEW"} />
            </div>

            {/* Structured Medicine Candidates List */}
            {activeJob && activeJob.candidates && activeJob.candidates.length > 0 ? (
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {activeJob.candidates.map((c, i) => {
                  const isLow = c.confidence < 0.6;
                  return (
                    <div
                      key={i}
                      className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                        isLow
                          ? "border-amber-500/40 bg-amber-500/10"
                          : "border-white/10 bg-[#02050e]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-[#f2c879]">{c.medicine_name}</span>
                        <span
                          className={`font-mono text-[10.5px] px-2 py-0.5 rounded ${
                            isLow ? "bg-amber-400 text-slate-950 font-bold" : "bg-emerald-500/20 text-emerald-300"
                          }`}
                        >
                          {Math.round(c.confidence * 100)}% conf
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-300">
                        <div>
                          <span className="text-slate-400 block">Strength:</span>
                          <strong>{c.strength || "—"}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Dose:</span>
                          <strong>{c.dose || "—"}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Frequency:</span>
                          <strong>{c.frequency || "—"}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Duration:</span>
                          <strong>{c.duration || "—"}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Route:</span>
                          <strong>{c.route || "ORAL"}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Status:</span>
                          <span className="text-emerald-400">Extracted</span>
                        </div>
                      </div>
                      {isLow && (
                        <p className="text-[10px] text-amber-300 font-mono">
                          ⚠️ Low OCR confidence: please double-check medicine name &amp; dose against the preview.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                {activeJob
                  ? locale === "bn" ? "কোনো সুনির্দিষ্ট ওষুধ সনাক্ত হয়নি। নিচের টেক্সট বক্সে দেখুন।" : "No distinct medicine rows detected. Review raw text below."
                  : locale === "bn" ? "প্রেসক্রিপশন আপলোড করলে এখানে তথ্য প্রদর্শিত হবে।" : "Upload a prescription above to extract medicine fields."}
              </p>
            )}

            {/* Editable Fields for Human Correction */}
            {activeJob && activeJob.fields && activeJob.fields.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/10">
                <span className="text-xs font-semibold text-slate-300 block">
                  {locale === "bn" ? "সংশোধন ও মানব-যাচাই (Editable Text Fields)" : "Field Corrections (Editable)"}
                </span>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {activeJob.fields.map((f) => (
                    <div key={f.id} className="p-2.5 rounded-xl bg-[#02050e] border border-white/10 space-y-1">
                      <div className="flex justify-between items-center text-[10.5px] font-mono text-slate-400">
                        <span>{f.field_type}</span>
                        <span>{Math.round(f.confidence * 100)}% conf</span>
                      </div>
                      <input
                        type="text"
                        value={fieldEdits[f.id] ?? f.raw_ocr_text}
                        onChange={(e) =>
                          setFieldEdits((prev) => ({ ...prev, [f.id]: e.target.value }))
                        }
                        className="w-full min-h-9 rounded-lg border border-white/15 bg-white/5 px-2.5 text-xs text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw OCR Text (Read-Only for Audit Integrity) */}
            {activeJob?.raw_text && (
              <details className="text-xs text-slate-400">
                <summary className="cursor-pointer font-mono hover:text-slate-200">
                  {locale === "bn" ? "অপরিবর্তিত মূল OCR টেক্সট (Read-only Audit)" : "View Raw OCR Text (Read-Only Audit)"}
                </summary>
                <pre className="mt-2 p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-[11px] whitespace-pre-wrap max-h-36 overflow-y-auto text-slate-300">
                  {activeJob.raw_text}
                </pre>
              </details>
            )}

            {/* Action Buttons: Verify All, Explain Prescription */}
            {activeJob && (
              <div className="flex flex-wrap gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  disabled={savingVerification}
                  onClick={handleVerifyAll}
                  className="flex-1 min-h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  data-testid="ocr-verify-all-btn"
                >
                  {savingVerification ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {locale === "bn" ? "যাচাই নিশ্চিত করুন (Save Verification)" : "Verify & Save Corrections"}
                </button>

                <button
                  type="button"
                  disabled={explaining}
                  onClick={handleExplainPrescription}
                  className="min-h-11 px-4 rounded-xl border border-indigo-400/40 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  data-testid="ocr-explain-btn"
                >
                  {explaining ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
                  {locale === "bn" ? "প্রেসক্রিপশন এআই ব্যাখ্যা নিন" : "Explain This Prescription"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 7.3: OCR-to-RAG Explanation View with 4 Separated Blocks */}
      {explanationData && (
        <div
          className="rounded-3xl border border-indigo-500/40 bg-[#061028] p-6 space-y-6"
          data-testid="ocr-explanation-container"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
            <div>
              <span className="font-mono text-xs uppercase tracking-wider text-indigo-300 font-bold">
                GROUNDED CLINICAL EXPLANATION (4-BLOCK AUDIT STRUCTURE)
              </span>
              <h3 className="text-xl font-bold mt-0.5">
                {locale === "bn"
                  ? "প্রেসক্রিপশনের সহজবোধ্য মেডিকেল ব্যাখ্যা ও তথ্যসূত্র"
                  : "Prescription Literacy & Evidence-Based Explanation"}
              </h3>
            </div>
            <TrustBadge kind="RESEARCH_ONLY" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Block 1: Raw OCR Text */}
            <div className="p-3.5 rounded-2xl bg-[#02050e] border border-white/10 space-y-1">
              <span className="font-mono text-[10px] text-slate-400 uppercase font-bold block">
                1 • Raw OCR Text
              </span>
              <p className="text-slate-300 font-mono text-[11px] line-clamp-4">
                {activeJob?.raw_text || "No raw text available."}
              </p>
            </div>

            {/* Block 2: User-Corrected Text */}
            <div className="p-3.5 rounded-2xl bg-[#02050e] border border-white/10 space-y-1">
              <span className="font-mono text-[10px] text-slate-400 uppercase font-bold block">
                2 • User-Corrected / Verified Text
              </span>
              <p className="text-slate-200 text-xs">
                {Object.values(fieldEdits).join(" • ") || "No manual corrections applied."}
              </p>
            </div>

            {/* Block 3: Verification Status */}
            <div className="p-3.5 rounded-2xl bg-[#02050e] border border-white/10 space-y-1">
              <span className="font-mono text-[10px] text-slate-400 uppercase font-bold block">
                3 • Verification Status
              </span>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={activeJob?.status || "NEEDS_REVIEW"} />
                <span className="text-[11px] text-slate-300 font-semibold">
                  {activeJob?.clinician_verified
                    ? "Doctor Clinically Verified"
                    : activeJob?.status === "VERIFIED"
                    ? "Patient Acknowledged (Not Clinician Authorized)"
                    : "Pending Human Verification"}
                </span>
              </div>
            </div>
          </div>

          {/* Block 4: Grounded Plain-Language Explanation with Citations */}
          <div className="p-5 rounded-2xl bg-black/40 border border-indigo-400/30 space-y-3">
            <span className="font-mono text-[10.5px] uppercase tracking-wider text-indigo-300 font-bold block">
              4 • Plain-Language Educational Explanation &amp; Citations
            </span>
            <div className="text-sm leading-relaxed text-slate-100">
              <SafeMarkdown
                content={explanationData.explanation_markdown}
                onCitationClick={(num) => {
                  const match = explanationData.citations.find((c) => c.citation_num === num);
                  if (match) setActiveCitation(match);
                }}
              />
            </div>

            {/* Disclaimers */}
            {explanationData.disclaimers && explanationData.disclaimers.length > 0 && (
              <div className="pt-3 border-t border-white/10 space-y-1 text-[11px] text-amber-200 font-mono">
                {explanationData.disclaimers.map((d, i) => (
                  <p key={i}>⚠️ {d}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Citation Drawer Modal */}
      <CitationDrawer
        citation={activeCitation}
        onClose={() => setActiveCitation(null)}
      />
    </div>
  );
}
