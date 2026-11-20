import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Baby,
  Camera,
  CheckCircle2,
  Download,
  FileCheck2,
  FlaskConical,
  FolderOpen,
  Mic,
  Printer,
  ScanText,
  Send,
  ShieldAlert,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { ApiError, apiPost, apiPostForm } from "../../lib/apiClient";
import { useAuth } from "../../lib/authContext";
import { useI18n } from "../../lib/i18n";
import { useToast, TrustBadge } from "../ui";
import { type AiModuleKey } from "../three/AiModuleScene3D";
import { ResultTelemetryOrb3D } from "../three/ResultTelemetryOrb3D";
import { BanglaVoiceWorkbench } from "./BanglaVoiceWorkbench";

interface ProbEntry {
  label: string;
  probability: number;
}

interface OcrBox {
  text: string;
  confidence: number;
  x_pct: number;
  y_pct: number;
  w_pct: number;
  h_pct: number;
}

interface OcrCandidate {
  group_index: number;
  medicine_name: string;
  strength: string;
  frequency: string;
  duration: string;
  confidence: number;
  is_verified: boolean;
}

interface InferenceResult {
  module_key: string;
  model_id: string;
  model_name: string;
  classification: string;
  prediction?: string;
  confidence: number;
  mean_confidence?: number;
  probabilities?: ProbEntry[];
  provided_features?: string[];
  imputed_features?: string[];
  raw_text?: string;
  token_count?: number;
  is_pdf?: boolean;
  bounding_boxes?: OcrBox[];
  candidates?: OcrCandidate[];
  persisted_ocr_job_id?: string | null;
  image_width?: number;
  image_height?: number;
  file_sha256?: string;
  latency_ms: number;
  device: string;
  warning_bn: string;
  warning_en: string;
}

interface PcosClinicalFormState {
  age: string;
  bmi: string;
  testosterone: string;
  lh: string;
  fsh: string;
  homa_ir: string;
  waist_circumference: string;
  glucose: string;
  sbp: string;
  dbp: string;
  androstenedione: string;
  sdhea: string;
  prl: string;
  e2: string;
  oh_prog_17: string;
  total_cholesterol: string;
  triglycerides: string;
  hdl_c: string;
  ldl_c: string;
  vit_d_25oh: string;
}

const DEFAULT_PCOS_FORM: PcosClinicalFormState = {
  age: "26",
  bmi: "27.8",
  testosterone: "68",
  lh: "11.5",
  fsh: "4.6",
  homa_ir: "3.4",
  waist_circumference: "92",
  glucose: "102",
  sbp: "120",
  dbp: "80",
  androstenedione: "",
  sdhea: "",
  prl: "",
  e2: "",
  oh_prog_17: "",
  total_cholesterol: "",
  triglycerides: "",
  hdl_c: "",
  ldl_c: "",
  vit_d_25oh: "",
};

const CONTROL_PCOS_PRESET: PcosClinicalFormState = {
  age: "24",
  bmi: "21.4",
  testosterone: "26",
  lh: "4.2",
  fsh: "5.8",
  homa_ir: "1.4",
  waist_circumference: "72",
  glucose: "84",
  sbp: "110",
  dbp: "72",
  androstenedione: "",
  sdhea: "",
  prl: "",
  e2: "",
  oh_prog_17: "",
  total_cholesterol: "",
  triglycerides: "",
  hdl_c: "",
  ldl_c: "",
  vit_d_25oh: "",
};

const MODULE_META: Record<
  AiModuleKey,
  {
    titleBn: string;
    titleEn: string;
    endpoint: string;
    accept: string;
    modelBadge: string;
    colorHex: string;
    icon: typeof Activity;
  }
> = {
  "pcos-clinical": {
    titleBn: "১. PCOS ক্লিনিকাল XGBoost এআই",
    titleEn: "1. PCOS Clinical AI (XGBoost)",
    endpoint: "/v1/ai/infer/pcos-clinical",
    accept: "",
    modelBadge: "M01-XGB-01 • joblib",
    colorHex: "#38bdf8",
    icon: Activity,
  },
  "pcos-ultrasound": {
    titleBn: "২. PCOS আল্ট্রাসাউন্ড ভিশন এআই",
    titleEn: "2. PCOS Ultrasound AI (ResNet18)",
    endpoint: "/v1/ai/infer/pcos-ultrasound",
    accept: ".png,.jpg,.jpeg",
    modelBadge: "M02-RESNET-01 • 3-class",
    colorHex: "#2dd4bf",
    icon: FlaskConical,
  },
  "viral-rash": {
    titleBn: "৩. ভাইরাল র‍্যাশ ৬-ক্লাস এআই",
    titleEn: "3. Viral Rash AI (Grouped ResNet18)",
    endpoint: "/v1/ai/infer/viral-rash",
    accept: ".png,.jpg,.jpeg",
    modelBadge: "M03-RESNET-GROUPED-01 • 6-class",
    colorHex: "#818cf8",
    icon: Sparkles,
  },
  "prescription-ocr": {
    titleBn: "৪. প্রেসক্রিপশন OCR ও সেফটি ভল্ট",
    titleEn: "4. Prescription OCR (EasyOCR bn+en)",
    endpoint: "/v1/ai/infer/prescription-ocr",
    accept: ".png,.jpg,.jpeg,.pdf",
    modelBadge: "M04-EASYOCR-PIPELINE-01",
    colorHex: "#f2c879",
    icon: ScanText,
  },
  "bangla-voice": {
    titleBn: "৫. বাংলা ভয়েস এআই (Phase G)",
    titleEn: "5. Bangla Voice AI (Phase G Deferred)",
    endpoint: "",
    accept: "audio/*",
    modelBadge: "M05-WHISPER-SMALL-BN-03 • DEFERRED",
    colorHex: "#c084fc",
    icon: Mic,
  },
  dermoped: {
    titleBn: "৬. ডার্মোপিড শিশু চর্ম এআই",
    titleEn: "6. DermoPed AI (EXP_B ResNet18)",
    endpoint: "/v1/ai/infer/dermoped",
    accept: ".png,.jpg,.jpeg",
    modelBadge: "M06-EXP-B-01 • N=22 patients",
    colorHex: "#34d399",
    icon: Baby,
  },
};

export function CyberScanWorkbench({
  activeModule,
  persistOcrToQueue = false,
  compact = false,
  onDraftSaved,
  onScanStateChange,
}: {
  activeModule: AiModuleKey;
  persistOcrToQueue?: boolean;
  compact?: boolean;
  onDraftSaved?: () => void;
  onScanStateChange?: (scanning: boolean, confidence: number | null) => void;
}) {
  const { locale } = useI18n();
  const { user, authenticated, login } = useAuth();
  const { pushToast } = useToast();

  const meta = MODULE_META[activeModule];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [scanPhase, setScanPhase] = useState<"VORTEX" | "LASER">("VORTEX");
  const [uploadPct, setUploadPct] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sampleLoading, setSampleLoading] = useState(false);

  const [pcosForm, setPcosForm] = useState<PcosClinicalFormState>(DEFAULT_PCOS_FORM);
  const [showAdvancedPcos, setShowAdvancedPcos] = useState(false);

  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [result, setResult] = useState<InferenceResult | null>(null);
  const [inferError, setInferError] = useState<string | null>(null);

  // Step 3 Mandatory Human OCR Verification
  const [editableOcrRows, setEditableOcrRows] = useState<OcrCandidate[]>([]);
  const [ocrGateError, setOcrGateError] = useState<string | null>(null);
  const [ocrGateUnlocked, setOcrGateUnlocked] = useState(false);
  const [activeBoxIdx, setActiveBoxIdx] = useState<number | null>(null);

  const [savingDraft, setSavingDraft] = useState(false);
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null);

  // Reset local workbench state cleanly whenever module changes
  useEffect(() => {
    setStep(1);
    setScanPhase("VORTEX");
    setUploadPct(0);
    setResult(null);
    setInferError(null);
    setSelectedFile(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setTerminalLogs([]);
    setEditableOcrRows([]);
    setOcrGateError(null);
    setOcrGateUnlocked(false);
    setSavedDraftId(null);
    onScanStateChange?.(false, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModule]);

  const attachFile = (file: File) => {
    setInferError(null);
    setResult(null);
    setSavedDraftId(null);

    // File Format Guardrail: Only Prescription OCR accepts PDFs
    const ext = file.name.split(".").pop()?.toLowerCase();
    const isPdf = file.type === "application/pdf" || ext === "pdf";

    if (activeModule !== "prescription-ocr" && isPdf) {
      const msg =
        locale === "bn"
          ? "⚠️ ফাইল ফরম্যাট ত্রুটি: এই ক্লিনিক্যাল ভিশন মডিউলে শুধুমাত্র ছবি (JPG, JPEG, PNG, WEBP) গ্রহণযোগ্য; PDF বা ডকুমেন্ট ফাইল অনুমোদিত নয়। প্রেসক্রিপশন বা ডকুমেন্টের জন্য 'প্রেসক্রিপশন OCR' মডিউল ব্যবহার করুন।"
          : "⚠️ Unsupported File Format: Only image files (JPG, JPEG, PNG, WEBP) are accepted in this clinical vision module. Please use Prescription OCR for PDF documents.";
      setInferError(msg);
      pushToast({
        title: locale === "bn" ? "শুধুমাত্র ছবি গ্রহণযোগ্য" : "Images Only",
        description: "PDF files are only permitted in Prescription OCR.",
        tone: "danger",
      });
      return;
    }

    if (ext && !["jpg", "jpeg", "png", "webp", "bmp", "pdf"].includes(ext)) {
      const msg =
        locale === "bn"
          ? "⚠️ ফাইল ফরম্যাট ত্রুটি: শুধুমাত্র অনুমোদিত ইমেজ বা ডকুমেন্ট ফাইল নির্বাচন করুন।"
          : "⚠️ Unsupported File Format: Please select a valid image or document file.";
      setInferError(msg);
      return;
    }

    setSelectedFile(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) attachFile(f);
  };

  const handleLoadCuratedSample = async () => {
    if (activeModule === "pcos-clinical" || activeModule === "bangla-voice") return;
    setSampleLoading(true);
    setInferError(null);
    try {
      const resp = await fetch(`/v1/ai/samples/${activeModule}`, { credentials: "include" });
      if (!resp.ok) throw new Error("Unable to fetch sample image from backend dataset.");
      const blob = await resp.blob();
      const fname = resp.headers.get("X-Sample-Filename") || `sample_${activeModule}.jpg`;
      const file = new File([blob], fname, { type: blob.type || "image/jpeg" });
      attachFile(file);
      pushToast({
        title: locale === "bn" ? "রিয়েল স্যাম্পল লোড হয়েছে" : "Curated Dataset Sample Loaded",
        description: `${fname} — click Analyze with AI to execute the real checkpoint.`,
        tone: "success",
      });
    } catch (err) {
      setInferError(err instanceof Error ? err.message : "Failed to load sample");
    } finally {
      setSampleLoading(false);
    }
  };

  const runRealInference = async () => {
    if (activeModule === "bangla-voice") return;
    setInferError(null);
    setSavedDraftId(null);
    setOcrGateError(null);
    setOcrGateUnlocked(false);

    if (activeModule !== "pcos-clinical" && !selectedFile) {
      setInferError(locale === "bn" ? "প্রথমে একটি ছবি আপলোড করুন অথবা Sample বেছে নিন।" : "Please upload a file or load a real sample first.");
      return;
    }

    setStep(2);
    setScanPhase("VORTEX");
    setUploadPct(15);
    setTerminalLogs([
      `> Initializing ${meta.modelBadge}...`,
      `> Payload buffered: ${selectedFile ? `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)` : "20-feature Clinical Tabular Vector"}`,
    ]);
    onScanStateChange?.(true, null);

    // Phase 1 Quantum Ingestion Vortex (short crisp animation while dispatching real request)
    await new Promise((r) => setTimeout(r, 220));
    setUploadPct(58);
    setTerminalLogs((prev) => [...prev, "> Validating integrity & dispatching multipart tensor stream..."]);
    await new Promise((r) => setTimeout(r, 220));
    setUploadPct(100);
    setScanPhase("LASER");
    setTerminalLogs((prev) => [...prev, "> Laser neural inspection active — awaiting PyTorch/XGBoost/EasyOCR checkpoint output..."]);

    try {
      if (!authenticated) {
        try {
          await login("patient.demo@shasthosetu.local", "PatientDemo#2026");
        } catch {
          // Proceed to endpoint so 401 is surfaced if demo login is disabled in production
        }
      }
      let data: InferenceResult;
      if (activeModule === "pcos-clinical") {
        const numericPayload: Record<string, number> = {};
        for (const [k, v] of Object.entries(pcosForm)) {
          const trimmed = String(v).trim();
          if (trimmed !== "" && !Number.isNaN(Number(trimmed))) {
            numericPayload[k] = Number(trimmed);
          }
        }
        data = await apiPost<InferenceResult>(meta.endpoint, numericPayload);
      } else {
        const fd = new FormData();
        fd.append("file", selectedFile as File);
        if (activeModule === "prescription-ocr") {
          fd.append("persist_to_queue", persistOcrToQueue ? "true" : "false");
        }
        data = await apiPostForm<InferenceResult>(meta.endpoint, fd);
      }

      setTerminalLogs((prev) => [
        ...prev,
        `> Model executed: ${data.model_name}`,
        `> Device: ${data.device} | Latency: ${data.latency_ms} ms`,
        activeModule === "prescription-ocr"
          ? `> EasyOCR extracted ${data.token_count ?? 0} token(s), ${data.candidates?.length ?? 0} candidate field(s).`
          : `> Top Prediction: ${data.prediction} (${(data.confidence * 100).toFixed(1)}%)`,
      ]);

      // Hold Laser frame briefly so bounding boxes / laser sweep are visible before advancing
      setResult(data);
      onScanStateChange?.(false, data.confidence);

      if (activeModule === "prescription-ocr") {
        setEditableOcrRows(data.candidates || []);
        await new Promise((r) => setTimeout(r, 700));
        setStep(3);
        if (data.persisted_ocr_job_id) {
          onDraftSaved?.();
          pushToast({
            title: "Real OCR Saved to Verification Queue",
            description: `Job ${data.persisted_ocr_job_id} queued (HTTP 422 reminder lock active until verified below).`,
            tone: "warning",
          });
        }
      } else {
        await new Promise((r) => setTimeout(r, 550));
        setStep(4);
      }
    } catch (err) {
      onScanStateChange?.(false, null);
      setStep(1);
      setInferError(
        err instanceof ApiError
          ? err.detail
          : err instanceof Error
          ? err.message
          : "Model inference failed."
      );
    }
  };

  const toggleVerifyRow = (idx: number) => {
    setEditableOcrRows((prev) => prev.map((r, i) => (i === idx ? { ...r, is_verified: !r.is_verified } : r)));
    setOcrGateError(null);
  };

  const handleConfirmOcrStep = () => {
    if (editableOcrRows.length === 0 || editableOcrRows.some((r) => !r.is_verified)) {
      setOcrGateError("HTTP 422 UNVERIFIED_OCR_FIELDS: Verify every medicine/dose/frequency field above before advancing.");
      return;
    }
    setOcrGateUnlocked(true);
    setStep(4);
  };

  const handleSaveAndShareDraft = async () => {
    if (!result || activeModule === "bangla-voice") return;
    setSavingDraft(true);
    try {
      const summary =
        activeModule === "prescription-ocr"
          ? `OCR (${result.token_count ?? 0} tokens, ${editableOcrRows.length} items verified=${ocrGateUnlocked})`
          : `${result.prediction} (${(result.confidence * 100).toFixed(1)}%)`;
      const saved = await apiPost<{ id: string }>("/v1/ai/drafts", {
        module_key: activeModule,
        model_id: result.model_id,
        input_summary: summary,
        result_json: result,
        confidence_score: result.confidence,
        shared_with_doctor: true,
      });
      setSavedDraftId(saved.id);
      onDraftSaved?.();
      pushToast({
        title: locale === "bn" ? "ড্রাফট ডাক্তার রিভিউয়ের জন্য সেভ হয়েছে" : "Draft Saved & Shared with Doctor",
        description: `Draft ${saved.id} added to SQLite Doctor Review Queue.`,
        tone: "success",
      });
    } catch (err) {
      pushToast({
        title: "Failed to save draft",
        description: err instanceof Error ? err.message : "Please sign in as Patient.",
        tone: "danger",
      });
    } finally {
      setSavingDraft(false);
    }
  };

  const handleDownloadJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify({ ...result, reviewed_ocr_rows: editableOcrRows }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shasthosetu-${result.module_key}-report.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Live Full-Stack Bangla & English Voice AI + Land-Guard 3D Particle Orb
  if (activeModule === "bangla-voice") {
    return <BanglaVoiceWorkbench onScanStateChange={onScanStateChange} />;
  }

  return (
    <div className="space-y-5 text-white" data-testid={`cyberscan-workbench-${activeModule}`}>
      {/* Land-Guard 4-Step Stepper */}
      <div className="ss-sapphire-card rounded-2xl p-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-semibold">
          {[
            { num: 1, label: locale === "bn" ? "১. ইনপুট / আপলোড" : "1. Ingestion" },
            { num: 2, label: locale === "bn" ? "২. নিউরাল স্ক্যান" : "2. CyberScan" },
            { num: 3, label: locale === "bn" ? "৩. মানব যাচাই (OCR)" : "3. Verification" },
            { num: 4, label: locale === "bn" ? "৪. এআই ফলাফল ও ডাক্তার" : "4. AI Result" },
          ].map((s) => {
            const active = step === s.num;
            const passed = step > s.num;
            return (
              <div
                key={s.num}
                className={`py-2 px-2 rounded-xl border transition ${
                  active
                    ? "bg-sky-400/20 text-sky-200 border-sky-400/50"
                    : passed
                    ? "bg-teal-500/15 text-teal-300 border-teal-400/30"
                    : "text-slate-400 border-transparent"
                }`}
              >
                {s.label}
              </div>
            );
          })}
        </div>
      </div>

      {inferError && (
        <div role="alert" className="rounded-2xl border border-rose-400/50 bg-rose-950/60 p-4 text-xs text-rose-100 flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 text-rose-300 shrink-0" />
          <span>{inferError}</span>
        </div>
      )}

      {/* STEP 1: INPUT STAGE */}
      {step === 1 && (
        <div className="ss-sapphire-card rounded-3xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-mono text-[11px] text-sky-300 uppercase">{meta.modelBadge}</div>
              <h3 className="text-lg sm:text-xl font-bold">{locale === "bn" ? meta.titleBn : meta.titleEn}</h3>
            </div>
            <TrustBadge kind={activeModule === "prescription-ocr" ? "HUMAN_VERIFIED" : "RESEARCH_ONLY"} />
          </div>

          {activeModule === "pcos-clinical" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPcosForm(DEFAULT_PCOS_FORM)}
                  className="min-h-10 px-3.5 rounded-full border border-sky-400/35 bg-sky-400/15 text-sky-200 text-xs font-semibold cursor-pointer"
                >
                  {locale === "bn" ? "স্যাম্পল: উচ্চ-লক্ষণ PCOS প্রোফাইল" : "Sample: Elevated Profile"}
                </button>
                <button
                  type="button"
                  onClick={() => setPcosForm(CONTROL_PCOS_PRESET)}
                  className="min-h-10 px-3.5 rounded-full border border-teal-400/35 bg-teal-400/15 text-teal-200 text-xs font-semibold cursor-pointer"
                >
                  {locale === "bn" ? "স্যাম্পল: স্বাভাবিক প্রোফাইল" : "Sample: Control Profile"}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                {(
                  [
                    ["age", "Age (yrs)"],
                    ["bmi", "BMI (kg/m²)"],
                    ["testosterone", "Testosterone"],
                    ["lh", "LH (mIU/mL)"],
                    ["fsh", "FSH (mIU/mL)"],
                    ["homa_ir", "HOMA-IR"],
                    ["waist_circumference", "Waist (cm)"],
                    ["glucose", "Glucose (mg/dL)"],
                    ["sbp", "SBP (mmHg)"],
                    ["dbp", "DBP (mmHg)"],
                  ] as const
                ).map(([field, label]) => (
                  <label key={field} className="space-y-1 text-slate-300">
                    <span>{label}</span>
                    <input
                      type="number"
                      step="any"
                      value={pcosForm[field]}
                      onChange={(e) => setPcosForm((p) => ({ ...p, [field]: e.target.value }))}
                      placeholder="Auto-impute"
                      className="w-full min-h-10 rounded-xl border border-sky-400/25 bg-black/40 px-2.5 text-white font-mono text-xs"
                    />
                  </label>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowAdvancedPcos((v) => !v)}
                className="text-xs font-mono text-sky-300 underline cursor-pointer"
              >
                {showAdvancedPcos ? "Hide 10 Optional Hormone / Lipid Features ▲" : "Show 10 Optional Hormone / Lipid Features (Imputed if empty) ▼"}
              </button>

              {showAdvancedPcos && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs pt-1">
                  {(
                    [
                      ["androstenedione", "Androstenedione"],
                      ["sdhea", "DHEA-S"],
                      ["prl", "Prolactin"],
                      ["e2", "Estradiol (E2)"],
                      ["oh_prog_17", "17-OHP"],
                      ["total_cholesterol", "Total Chol"],
                      ["triglycerides", "Triglycerides"],
                      ["hdl_c", "HDL-C"],
                      ["ldl_c", "LDL-C"],
                      ["vit_d_25oh", "Vit D (25-OH)"],
                    ] as const
                  ).map(([field, label]) => (
                    <label key={field} className="space-y-1 text-slate-300">
                      <span>{label}</span>
                      <input
                        type="number"
                        step="any"
                        value={pcosForm[field]}
                        onChange={(e) => setPcosForm((p) => ({ ...p, [field]: e.target.value }))}
                        placeholder="Auto-impute"
                        className="w-full min-h-10 rounded-xl border border-white/15 bg-black/35 px-2.5 text-white font-mono text-xs"
                      />
                    </label>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <span className="text-xs text-slate-400">Uses saved XGBoost Pipeline SimpleImputer for omitted lab values.</span>
                <button
                  type="button"
                  onClick={() => void runRealInference()}
                  data-testid="analyze-ai-btn"
                  className="min-h-12 px-6 rounded-full bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 font-bold text-sm inline-flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  <Sparkles className="w-4 h-4" />
                  {locale === "bn" ? "XGBoost মডেল চালান" : "Analyze with Real XGBoost Model"}
                </button>
              </div>
            </div>
          ) : (
            /* Land-Guard HUD Drag-Drop + Camera + Curated Sample Stage */
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative group border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all bg-[#050d1e]/75 ${
                  dragActive ? "border-sky-400 bg-sky-500/15" : "border-slate-700 hover:border-sky-400/80 hover:bg-sky-950/20"
                }`}
              >
                <div className="hud-corner hud-tl" />
                <div className="hud-corner hud-tr" />
                <div className="hud-corner hud-bl" />
                <div className="hud-corner hud-br" />

                <UploadCloud className="w-10 h-10 text-sky-400 mx-auto mb-2.5 transition-transform group-hover:-translate-y-1" />
                <div className="text-sm font-semibold text-white">
                  {locale === "bn" ? "মেডিকেল ছবি এখানে টেনে আনুন অথবা" : "Drag & drop medical image here, or"}{" "}
                  <span className="text-sky-400 underline underline-offset-2">{locale === "bn" ? "ফাইল বেছে নিন" : "browse files"}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supported: {activeModule === "prescription-ocr" ? "PNG, JPG, JPEG, PDF" : "PNG, JPG, JPEG"} (MAX 10 MB)
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="min-h-11 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-100 text-xs font-semibold border border-white/15 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <FolderOpen className="w-4 h-4 text-sky-400" />
                    {locale === "bn" ? "ফাইল ব্রাউজ করুন" : "Browse File"}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      cameraInputRef.current?.click();
                    }}
                    className="min-h-11 px-4 rounded-xl bg-sky-950/80 hover:bg-sky-900 text-sky-200 text-xs font-semibold border border-sky-400/40 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-sky-300" />
                    {locale === "bn" ? "ক্যামেরা দিয়ে তুলুন" : "Capture via Camera"}
                  </button>
                  <button
                    type="button"
                    disabled={sampleLoading}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleLoadCuratedSample();
                    }}
                    data-testid={`load-sample-${activeModule}`}
                    className="min-h-11 px-4 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-200 text-xs font-semibold border border-teal-400/40 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <FlaskConical className="w-4 h-4 text-teal-300" />
                    {sampleLoading ? "Loading..." : locale === "bn" ? "রিয়েল স্যাম্পল লোড করুন" : "Load Real Dataset Sample"}
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={meta.accept}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) attachFile(f);
                  }}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) attachFile(f);
                  }}
                />
              </div>

              {selectedFile && (
                <div className="rounded-2xl border border-teal-400/40 bg-black/40 p-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {previewUrl && (
                      <img src={previewUrl} alt="Uploaded preview" className="w-12 h-12 rounded-xl object-cover border border-white/15 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-mono font-bold text-white truncate max-w-xs">{selectedFile.name}</div>
                      <div className="text-[11px] font-mono text-teal-300">{(selectedFile.size / 1024).toFixed(1)} KB • Ready for AI Checkpoint</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void runRealInference()}
                    data-testid="analyze-ai-btn"
                    className="min-h-11 px-6 rounded-full bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 font-bold text-sm inline-flex items-center gap-2 cursor-pointer shadow-lg"
                  >
                    <Sparkles className="w-4 h-4" />
                    {locale === "bn" ? "AI মডেল দিয়ে বিশ্লেষণ করুন" : "Analyze with Real AI"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* STEP 2: LAND-GUARD CYBERSCAN VORTEX + LASER VISION SCANNER */}
      {step === 2 && (
        <div className="ss-sapphire-card rounded-3xl p-6 sm:p-8 relative overflow-hidden space-y-6">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-sky-400 to-transparent" />

          {scanPhase === "VORTEX" ? (
            <div className="flex flex-col items-center justify-center py-6 space-y-5">
              <div className="text-center">
                <span className="text-[11px] font-mono uppercase tracking-widest text-sky-300 px-3 py-1 rounded-full bg-sky-950/80 border border-sky-400/35">
                  Phase 1 // Quantum Ingestion Vortex
                </span>
                <h3 className="text-xl font-bold mt-2">
                  {selectedFile ? `Streaming ${selectedFile.name}` : "Allocating Feature Vector Tensor"}
                </h3>
              </div>

              <div className="relative w-52 h-52 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-sky-400/25 ss-spin-slow" />
                <div className="absolute inset-3 rounded-full border-2 border-dashed border-sky-400/55 ss-spin-reverse" />
                <svg className="w-48 h-48 -rotate-90" viewBox="0 0 208 208" aria-hidden="true">
                  <circle cx="104" cy="104" r="90" stroke="rgba(255,255,255,0.08)" strokeWidth="6" fill="transparent" />
                  <circle
                    cx="104"
                    cy="104"
                    r="90"
                    stroke="#38bdf8"
                    strokeWidth="7"
                    strokeDasharray="565"
                    strokeDashoffset={565 - (565 * uploadPct) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-200"
                  />
                </svg>
                <div className="absolute w-32 h-32 rounded-full bg-sky-950/60 border border-sky-400/40 flex items-center justify-center backdrop-blur-md overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-sky-400/25 to-transparent ss-radar-sweep" />
                  <div className="relative z-10 text-center">
                    <span className="font-mono font-bold text-3xl text-white">{uploadPct}</span>
                    <span className="font-mono text-sky-400">%</span>
                    <div className="text-[10px] font-mono text-slate-300 tracking-widest">STREAMING</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-6 flex flex-col items-center">
                <div className={`relative w-full ${compact ? "h-[260px]" : "h-[330px]"} rounded-xl bg-slate-950 border border-sky-400/45 p-2 overflow-hidden`}>
                  <div className="hud-corner hud-tl" />
                  <div className="hud-corner hud-tr" />
                  <div className="hud-corner hud-bl" />
                  <div className="hud-corner hud-br" />
                  <div className="relative w-full h-full rounded-lg overflow-hidden flex items-center justify-center bg-[#040a16]">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Scanning preview" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-center font-mono text-xs text-sky-300 p-4">
                        NEURAL PAYLOAD STREAMING
                        <br />
                        {meta.modelBadge}
                      </div>
                    )}
                    <div className="absolute left-0 right-0 pointer-events-none z-20 ss-laser-curtain bg-gradient-to-b from-sky-400/30 via-sky-400/10 to-transparent border-t-2 border-sky-300 shadow-[0_0_20px_#38bdf8]" />
                    <div className="absolute left-0 right-0 h-[2px] bg-white pointer-events-none z-30 ss-laser-line shadow-[0_0_12px_#ffffff,0_0_24px_#38bdf8]" />

                    {result?.bounding_boxes?.slice(0, 24).map((box, bIdx) => (
                      <div
                        key={bIdx}
                        style={{ left: `${box.x_pct}%`, top: `${box.y_pct}%`, width: `${box.w_pct}%`, height: `${box.h_pct}%` }}
                        className="absolute border border-teal-400 bg-teal-400/15 ss-bbox-active z-20 pointer-events-none"
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 rounded-2xl bg-slate-950/90 border border-white/10 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2.5 border-b border-white/10 text-xs font-mono text-sky-300">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                      NEURAL TERMINAL STREAM
                    </span>
                    <span className="text-slate-400">{meta.modelBadge}</span>
                  </div>
                  <div className="mt-3 space-y-2 font-mono text-[11px] max-h-[220px] overflow-y-auto">
                    {terminalLogs.map((ln, idx) => (
                      <div key={idx} className={idx === terminalLogs.length - 1 ? "text-teal-300" : "text-slate-300"}>
                        {ln}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-3 border-t border-white/10 flex justify-between text-[11px] font-mono text-slate-400">
                  <span>LOCAL GPU / CPU CHECKPOINT</span>
                  <span className="text-sky-300">REAL INFERENCE ACTIVE</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: MANDATORY HUMAN-IN-THE-LOOP OCR VERIFICATION */}
      {step === 3 && result && activeModule === "prescription-ocr" && (
        <div className="ss-sapphire-card rounded-3xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-mono text-xs text-[#f2c879]">STEP 3 • MANDATORY HUMAN OCR VERIFICATION (FR-OCR-03..04)</div>
              <h3 className="text-xl font-bold">Inspect Bounding Boxes &amp; Verify Extracted Medicine Fields</h3>
            </div>
            <span className="font-mono text-xs text-teal-300">
              {result.token_count ?? 0} EasyOCR tokens • {(result.confidence * 100).toFixed(0)}% mean conf
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Image + Clickable OCR Bounding Boxes */}
            <div className="lg:col-span-5 space-y-3">
              <div className="relative rounded-2xl border border-sky-400/35 bg-[#040a16] overflow-hidden min-h-[260px] flex items-center justify-center">
                {previewUrl ? (
                  <img src={previewUrl} alt="OCR analyzed prescription" className="w-full h-auto block" />
                ) : (
                  <div className="p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap">{result.raw_text}</div>
                )}
                {previewUrl &&
                  result.bounding_boxes?.map((box, bIdx) => (
                    <button
                      key={bIdx}
                      type="button"
                      title={`${box.text} (${(box.confidence * 100).toFixed(0)}%)`}
                      onClick={() => setActiveBoxIdx(bIdx)}
                      style={{ left: `${box.x_pct}%`, top: `${box.y_pct}%`, width: `${box.w_pct}%`, height: `${box.h_pct}%` }}
                      className={`absolute border transition cursor-pointer ${
                        activeBoxIdx === bIdx
                          ? "border-[#f2c879] bg-[#f2c879]/25 z-20"
                          : "border-sky-400/70 bg-sky-400/10 hover:bg-sky-400/25"
                      }`}
                    />
                  ))}
              </div>
              {activeBoxIdx !== null && result.bounding_boxes?.[activeBoxIdx] && (
                <div className="rounded-xl bg-black/50 border border-[#f2c879]/40 p-2.5 text-xs font-mono text-[#f2c879]">
                  Selected Token: &quot;{result.bounding_boxes[activeBoxIdx].text}&quot; —{" "}
                  {(result.bounding_boxes[activeBoxIdx].confidence * 100).toFixed(1)}% conf
                </div>
              )}
              <details className="rounded-xl bg-black/35 border border-white/10 p-3 text-xs">
                <summary className="cursor-pointer font-mono text-sky-300">View Full Extracted Bilingual OCR Text</summary>
                <pre className="mt-2 whitespace-pre-wrap text-[11px] font-mono text-slate-200">{result.raw_text || "No text detected"}</pre>
              </details>
            </div>

            {/* Right Editable Candidate Fields */}
            <div className="lg:col-span-7 space-y-3">
              {editableOcrRows.map((row, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl border p-3.5 space-y-2 ${
                    row.is_verified ? "border-teal-400/50 bg-teal-500/10" : "border-amber-400/40 bg-black/35"
                  }`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={row.medicine_name}
                      onChange={(e) =>
                        setEditableOcrRows((prev) => prev.map((r, i) => (i === idx ? { ...r, medicine_name: e.target.value, is_verified: false } : r)))
                      }
                      aria-label="Medicine Name"
                      className="min-h-10 rounded-xl border border-white/15 bg-black/45 px-2.5 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={row.strength}
                      onChange={(e) =>
                        setEditableOcrRows((prev) => prev.map((r, i) => (i === idx ? { ...r, strength: e.target.value, is_verified: false } : r)))
                      }
                      aria-label="Strength or Dose"
                      className="min-h-10 rounded-xl border border-white/15 bg-black/45 px-2.5 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={row.frequency}
                      onChange={(e) =>
                        setEditableOcrRows((prev) => prev.map((r, i) => (i === idx ? { ...r, frequency: e.target.value, is_verified: false } : r)))
                      }
                      aria-label="Frequency"
                      className="min-h-10 rounded-xl border border-white/15 bg-black/45 px-2.5 text-xs text-white"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-300">Conf: {(row.confidence * 100).toFixed(0)}%</span>
                    <button
                      type="button"
                      onClick={() => toggleVerifyRow(idx)}
                      className={`min-h-9 px-3.5 rounded-lg font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                        row.is_verified ? "bg-teal-400 text-slate-950" : "bg-amber-400/20 border border-amber-400/50 text-amber-200"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {row.is_verified ? "Verified by Human" : "Verify Field"}
                    </button>
                  </div>
                </div>
              ))}

              {ocrGateError && (
                <div role="alert" className="rounded-xl border border-rose-400/50 bg-rose-500/15 p-3 text-xs text-rose-100 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-300 shrink-0" />
                  <span>{ocrGateError}</span>
                </div>
              )}

              <div className="flex flex-wrap justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="min-h-11 px-4 rounded-xl border border-white/20 text-xs text-slate-300 cursor-pointer"
                >
                  Re-Upload Another Scan
                </button>
                <button
                  type="button"
                  onClick={handleConfirmOcrStep}
                  className="min-h-11 px-6 rounded-full bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <FileCheck2 className="w-4 h-4" />
                  Confirm Human Review &amp; Proceed to Result
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: REAL AI RESULT PANEL + 3D CONFIDENCE ORB + DOCTOR SHARE */}
      {step === 4 && result && (
        <div className="ss-sapphire-card rounded-3xl p-6 space-y-5" data-testid="ai-result-panel">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <ResultTelemetryOrb3D confidence={result.confidence} colorHex={meta.colorHex} />
              <div className="space-y-1">
                <span className="font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-400/15 text-sky-300 border border-sky-400/35">
                  {result.classification}
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  {activeModule === "prescription-ocr"
                    ? `${editableOcrRows.filter((r) => r.is_verified).length}/${editableOcrRows.length} Human-Verified Medicine Items`
                    : result.prediction}
                </h3>
                <div className="text-xs font-mono text-slate-300">
                  {result.model_id} • {result.device} • {result.latency_ms} ms
                  {result.file_sha256 ? ` • sha256:${result.file_sha256}` : ""}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDownloadJson}
                className="min-h-11 px-3.5 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4 text-sky-300" /> JSON Report
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="min-h-11 px-3.5 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-teal-300" /> Print
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="min-h-11 px-3.5 rounded-xl border border-sky-400/40 bg-sky-400/10 text-sky-200 text-xs font-semibold cursor-pointer"
              >
                New Input
              </button>
            </div>
          </div>

          {/* Probability Bars (Classification Models) */}
          {result.probabilities && result.probabilities.length > 0 && (
            <div className="space-y-2 rounded-2xl bg-black/35 border border-white/10 p-4">
              <div className="font-mono text-[11px] text-slate-400 uppercase">REAL CHECKPOINT CLASS PROBABILITIES (SOFTMAX)</div>
              {result.probabilities.map((p) => (
                <div key={p.label} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-100">{p.label}</span>
                    <span className="text-sky-300 font-bold">{(p.probability * 100).toFixed(2)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(2, p.probability * 100)}%`, backgroundColor: meta.colorHex }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Mandatory Non-Diagnostic Limitation Alert */}
          <div className="rounded-2xl border border-amber-400/45 bg-amber-500/10 p-4 text-xs text-amber-100 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold">{locale === "bn" ? result.warning_bn : result.warning_en}</div>
              <div className="text-amber-200/80 font-mono text-[11px]">{result.model_name}</div>
            </div>
          </div>

          {/* Save & Share with Doctor CTA */}
          <div className="rounded-2xl border border-sky-400/30 bg-[#061226]/90 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-300">
              {savedDraftId ? (
                <span className="text-teal-300 font-semibold">
                  Saved Draft ID `{savedDraftId}` — now visible inside the Doctor Review Queue!
                </span>
              ) : (
                <span>Want an approved Doctor to review this AI research output in consultation?</span>
              )}
            </div>
            {authenticated && user?.primary_role === "PATIENT" ? (
              <button
                type="button"
                disabled={savingDraft || Boolean(savedDraftId)}
                onClick={() => void handleSaveAndShareDraft()}
                className="min-h-11 px-5 rounded-full bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Send className="w-3.5 h-3.5" />
                {savedDraftId ? "Shared with Doctor ✓" : savingDraft ? "Saving..." : "Save Draft & Share with Doctor"}
              </button>
            ) : (
              <Link
                to="/login"
                className="min-h-11 px-4 rounded-full border border-sky-400/40 bg-sky-400/15 text-sky-200 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                Sign in as Patient to Share with Doctor <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
