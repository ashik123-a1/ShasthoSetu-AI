import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileCheck2,
  Lock,
  ScanText,
  ShieldAlert,
  Unlock,
} from "lucide-react";
import { apiGet } from "../lib/apiClient";
import { useI18n } from "../lib/i18n";
import { PublicFloatingHeader } from "../components/layout/PublicFloatingHeader";
import { PublicFooter } from "../components/layout/PublicFooter";
import { TrustBadge } from "../components/ui";

interface ResearchDataset {
  module: string;
  dataset_or_scope: string;
  reconciled_count: string;
  scientific_classification: string;
  limitations: string;
}

interface DemoOcrField {
  id: string;
  regionLabel: string;
  fieldType: string;
  text: string;
  confidence: number;
  verified: boolean;
}

const INITIAL_FIELDS: DemoOcrField[] = [
  { id: "f1", regionLabel: "Rx #1 • Line 1", fieldType: "MEDICINE_NAME", text: "Tab. Napa Extra (500+65mg)", confidence: 0.91, verified: false },
  { id: "f2", regionLabel: "Rx #1 • Line 2", fieldType: "DOSE & FREQUENCY", text: "1+0+1 After Meal x 5 days", confidence: 0.64, verified: false },
  { id: "f3", regionLabel: "Rx #2 • Line 1", fieldType: "MEDICINE_NAME", text: "Cap. Seclo 20mg", confidence: 0.88, verified: false },
  { id: "f4", regionLabel: "Rx #2 • Line 2", fieldType: "DOSE & FREQUENCY", text: "1+0+0 Before Breakfast x 14 days", confidence: 0.52, verified: false },
];

export function PrescriptionOcrFeaturePage() {
  const { locale } = useI18n();
  const [ocrDataset, setOcrDataset] = useState<ResearchDataset | null>(null);
  const [fields, setFields] = useState<DemoOcrField[]>(INITIAL_FIELDS);
  const [gateStatus, setGateStatus] = useState<"IDLE" | "BLOCKED_422" | "ACTIVATED">("IDLE");
  const [medActionLog, setMedActionLog] = useState<Record<string, "TAKEN" | "SKIPPED" | "SNOOZED">>({});

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await apiGet<{ datasets: ResearchDataset[] }>("/v1/public/research");
        const found = res.datasets?.find((d) => d.module.toLowerCase().includes("ocr")) || null;
        if (active) setOcrDataset(found);
      } catch {
        // Offline safe
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const allVerified = fields.every((f) => f.verified);

  const toggleVerify = (id: string) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, verified: !f.verified } : f)));
    setGateStatus("IDLE");
  };

  const updateText = (id: string, nextText: string) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, text: nextText, verified: false } : f)));
    setGateStatus("IDLE");
  };

  const handleActivateAttempt = () => {
    if (!allVerified) {
      setGateStatus("BLOCKED_422");
      return;
    }
    setGateStatus("ACTIVATED");
  };

  return (
    <div className="ss-sapphire-always min-h-screen flex flex-col pt-24" data-testid="ocr-feature-page">
      <PublicFloatingHeader transparentHero />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 pb-16 space-y-10 flex-1">
        {/* Header Hero */}
        <section className="ss-sapphire-card rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-[#f2c879]">
              <ScanText className="w-4 h-4" /> CORE MODULE 02 • FR-OCR-01..07 & FR-MED-01..06
            </span>
            <TrustBadge kind="HUMAN_VERIFIED" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8 space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                {locale === "bn" ? (
                  <>
                    প্রেসক্রিপশন OCR ও{" "}
                    <span className="bg-gradient-to-r from-[#38bdf8] via-[#2dd4bf] to-[#f2c879] bg-clip-text text-transparent">
                      মানব-যাচাইকৃত নিরাপদ ওষুধ রুটিন
                    </span>
                  </>
                ) : (
                  <>
                    Human-Gated Prescription OCR &amp;{" "}
                    <span className="bg-gradient-to-r from-[#38bdf8] via-[#2dd4bf] to-[#f2c879] bg-clip-text text-transparent">
                      Verified Medication Vault
                    </span>
                  </>
                )}
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
                {locale === "bn"
                  ? "হাতের লেখার অস্পষ্টতায় ভুল ডোজ রোধ করতে প্রতিটি অসম্পূর্ণ বা কম-আত্মবিশ্বাসের OCR ক্ষেত্র রোগী নিজে যাচাই না করা পর্যন্ত সার্ভার রিমাইন্ডার লক করে রাখে (HTTP 422 Gate)।"
                  : "Auto-guessed medication dosages can harm patients. ShasthoSetu physically blocks medication reminder scheduling with HTTP 422 UNVERIFIED_OCR_FIELDS until a human verifies every ambiguous field side-by-side."}
              </p>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-2.5">
              <Link
                to="/patient/ocr-review"
                className="min-h-12 px-5 rounded-full bg-gradient-to-r from-sky-400 to-teal-400 text-slate-950 font-bold text-sm inline-flex items-center justify-center gap-2"
              >
                {locale === "bn" ? "SQLite লাইভ OCR কিউ খুলুন" : "Open Live SQLite OCR Queue"}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/patient/medicines"
                className="min-h-12 px-5 rounded-full border border-white/25 bg-white/5 hover:bg-white/10 text-white font-semibold text-sm inline-flex items-center justify-center gap-2"
              >
                <Clock className="w-4 h-4 text-[#2dd4bf]" />
                {locale === "bn" ? "সক্রিয় ওষুধ রুটিন দেখুন" : "View Patient Medicine Routines"}
              </Link>
            </div>
          </div>
        </section>

        {/* Interactive Safe-OCR Workbench Simulation */}
        <section
          data-testid="ocr-demo-workbench"
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
        >
          {/* Left: Simulated Bilingual Prescription Crop Preview */}
          <div className="lg:col-span-5 ss-sapphire-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between text-xs font-mono text-sky-300">
              <span>PROVENANCE CROP • 0052.JPG</span>
              <span>mean conf: 0.68</span>
            </div>

            <div className="rounded-2xl border border-dashed border-sky-400/40 bg-[#040a18] p-5 space-y-4 font-mono text-xs">
              <div className="flex justify-between border-b border-white/10 pb-2 text-slate-400">
                <span>Dhaka Demo Clinic • Rx Date: 2026-11-18</span>
                <span>BMDC-DEMO</span>
              </div>
              <div className="space-y-3">
                <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3">
                  <div className="text-[10px] text-amber-300 uppercase">Bounding Box #1 • Handwritten Dose Highlighted</div>
                  <div className="text-sm font-bold text-white mt-1">1. Tab. Napa Extra (500+65mg)</div>
                  <div className="text-amber-200">1+0+1 (খাওয়ার পর) — 5 days [conf 0.64]</div>
                </div>
                <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-3">
                  <div className="text-[10px] text-rose-300 uppercase">Bounding Box #2 • Low Confidence Dose</div>
                  <div className="text-sm font-bold text-white mt-1">2. Cap. Seclo 20mg</div>
                  <div className="text-rose-200">1+0+0 (Before breakfast) — 14 days [conf 0.52]</div>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {ocrDataset
                ? `${ocrDataset.module} (${ocrDataset.reconciled_count}): ${ocrDataset.limitations}`
                : "M04 Bilingual Prescription Audit: 1,000 rows accounted (992 admissible, 8 quarantined); 997 narrative summaries require field-level human verification."}
            </p>
          </div>

          {/* Right: Interactive Editable Field Verification + HTTP 422 Gate */}
          <div className="lg:col-span-7 ss-sapphire-card rounded-3xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-sky-400" />
                {locale === "bn" ? "ধাপ ১: প্রতিটি ক্ষেত্র সম্পাদনা ও যাচাই করুন" : "Step 1: Verify or Correct Each Extracted Field"}
              </h2>
              <span className="font-mono text-xs text-teal-300">
                {fields.filter((f) => f.verified).length}/{fields.length} Verified
              </span>
            </div>

            <div className="space-y-3">
              {fields.map((f) => (
                <div
                  key={f.id}
                  className={`rounded-2xl border p-4 space-y-2 transition ${
                    f.verified ? "border-teal-400/50 bg-teal-500/10" : "border-amber-400/40 bg-black/30"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                    <span className="text-slate-300">
                      {f.regionLabel} • <strong className="text-sky-300">{f.fieldType}</strong>
                    </span>
                    <span className={f.confidence < 0.7 ? "text-amber-300 font-bold" : "text-teal-300"}>
                      Confidence: {(f.confidence * 100).toFixed(0)}% {f.confidence < 0.7 ? "(NEEDS REVIEW)" : ""}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={f.text}
                      onChange={(e) => updateText(f.id, e.target.value)}
                      className="flex-1 min-h-11 rounded-xl border border-white/15 bg-black/45 px-3 text-sm text-white"
                    />
                    <button
                      type="button"
                      onClick={() => toggleVerify(f.id)}
                      className={`min-h-11 px-4 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition ${
                        f.verified
                          ? "bg-teal-400 text-slate-950"
                          : "border border-amber-400/50 bg-amber-400/15 text-amber-200 hover:bg-amber-400/25"
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {f.verified ? (locale === "bn" ? "যাচাই সম্পন্ন" : "Verified") : locale === "bn" ? "নিশ্চিত করুন" : "Mark Verified"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleActivateAttempt}
                className="min-h-12 px-6 rounded-full bg-gradient-to-r from-sky-400 to-teal-400 text-slate-950 font-bold text-sm inline-flex items-center gap-2 cursor-pointer shadow-lg"
              >
                {allVerified ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                {locale === "bn" ? "ধাপ ২: ওষুধ রিমাইন্ডার সক্রিয় করুন" : "Step 2: Activate Medication Schedule"}
              </button>
              <span className="text-xs text-slate-400">Timezone: Asia/Dhaka (+06:00)</span>
            </div>

            {gateStatus === "BLOCKED_422" && (
              <div
                role="alert"
                className="rounded-2xl border border-rose-400/50 bg-rose-500/15 p-4 flex items-start gap-3 text-xs text-rose-100"
              >
                <ShieldAlert className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
                <div>
                  <div className="font-mono font-bold text-rose-200">
                    HTTP 422 UNVERIFIED_OCR_FIELDS — ACTIVATION BLOCKED
                  </div>
                  <p className="mt-1">
                    {locale === "bn"
                      ? "উপরের সবগুলো ওষুধ ও ডোজ ক্ষেত্র নিশ্চিত না করা পর্যন্ত রিমাইন্ডার চালু হবে না।"
                      : "Server safety barrier rejected activation: verify all remaining fields above before scheduling reminders."}
                  </p>
                </div>
              </div>
            )}

            {gateStatus === "ACTIVATED" && (
              <div className="rounded-2xl border border-teal-400/50 bg-teal-500/10 p-4 space-y-3">
                <div className="font-mono text-xs font-bold text-teal-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  VERIFIED MEDICATION ROUTINE ACTIVE (FR-MED-01..02)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {fields
                    .filter((f) => f.fieldType === "MEDICINE_NAME")
                    .map((med) => (
                      <div key={med.id} className="rounded-xl bg-black/40 border border-white/10 p-3 space-y-2">
                        <div className="font-bold text-xs text-white">{med.text}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {(["TAKEN", "SKIPPED", "SNOOZED"] as const).map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => setMedActionLog((p) => ({ ...p, [med.id]: st }))}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold cursor-pointer ${
                                medActionLog[med.id] === st
                                  ? "bg-[#38bdf8] text-slate-950"
                                  : "bg-white/10 text-slate-300"
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
                <p className="text-[11px] text-amber-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Remember to check real printed bottle labels; digital demo schedule never overrides physician advice.</span>
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
