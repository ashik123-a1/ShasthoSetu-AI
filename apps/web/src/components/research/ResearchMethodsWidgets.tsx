import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Layers, ShieldCheck, Sigma } from "lucide-react";

/**
 * Numbered chapter header ported from AgriSense Fusion MethodsKit.jsx
 * using ShasthoSetu Midnight Sapphire & Gold accent typography.
 */
export function MethodsChapterHeader({
  num,
  eyebrow,
  title,
  goldAccent,
  subtitle,
}: {
  num: string;
  eyebrow: string;
  title: string;
  goldAccent: string;
  subtitle?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#38bdf8] to-[#2dd4bf] text-slate-950 font-mono text-xs font-extrabold inline-flex items-center justify-center shadow">
          {num}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#38bdf8] font-bold">
          {eyebrow}
        </span>
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
        {title}{" "}
        <span className="italic font-serif bg-gradient-to-r from-[#f2c879] via-[#fde68a] to-[#2dd4bf] bg-clip-text text-transparent">
          {goldAccent}
        </span>
      </h2>
      {subtitle ? <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">{subtitle}</p> : null}
    </div>
  );
}

/* ============================================================================
   1. STICKY CLINICAL ARCHITECTURE STORY (AgriSense StickyFieldStory.jsx port)
   ============================================================================ */
interface StoryStep {
  step: string;
  layerIndex: number; // 0..3 matching 4 SVG layers
  titleEn: string;
  titleBn: string;
  bodyEn: string;
  bodyBn: string;
  metricBadge: string;
  accent: string;
}

const STORY_STEPS: StoryStep[] = [
  {
    step: "01",
    layerIndex: 0,
    titleEn: "Clinical Separation by Rotterdam Diagnostic Principle",
    titleBn: "রটারডাম মানদণ্ড অনুযায়ী ক্লিনিকাল ও আল্ট্রাসাউন্ড পৃথকীকরণ",
    bodyEn:
      "M01 (20 anthropometric/endocrine lab features, N=88) and M02 (299 pHash-deduplicated ovarian scans, 289 pseudo-patients) are never fused naively. Ovarian PCOM morphology alone never claims clinical PCOS diagnosis.",
    bodyBn:
      "M01 ক্লিনিকাল ল্যাব (N=88) এবং M02 ওভারিয়ান আল্ট্রাসাউন্ড (২৯৯টি অনন্য স্ক্যান) আলাদা রাখা হয়েছে—শুধু আল্ট্রাসাউন্ড ছবি দিয়ে এককভাবে রোগ নির্ণয় দাবি করা হয় না।",
    metricBadge: "M01 94.44% • M02 86.67%",
    accent: "#38bdf8",
  },
  {
    step: "02",
    layerIndex: 1,
    titleEn: "Perceptual Hashing & Source-Family Split Isolation",
    titleBn: "pHash ও সোর্স-ফ্যামিলি ভিত্তিক লিক-মুক্ত স্প্লিট",
    bodyEn:
      "Every augmentation derivative and multi-angle crop is grouped by source photo family before Train (528) / Val (113) / Test (114) assignment — proving 0.00% family overlap across all MCVSLD skin partitions.",
    bodyBn:
      "একই উৎস ছবির সব ক্রপ ও অগমেন্টেশন একই সেটে (Train ৫২৮ / Val ১১৩ / Test ১১৪) রেখে ০% ডেটা লিকেজ প্রমাণিত হয়েছে।",
    metricBadge: "755 FAMILIES • 0% LEAK",
    accent: "#2dd4bf",
  },
  {
    step: "03",
    layerIndex: 1,
    titleEn: "Quarantine of 99.10% Leaky Legacy Rash Checkpoint",
    titleBn: "৯৯.১০% ত্রুটিপূর্ণ পুরোনো মডেল কোয়ারেন্টাইন",
    bodyEn:
      "Audit scripts caught 686/755 source-photo families leaking between train and test splits in historical checkpoints. Rather than publishing an inflated 99.10% number, we quarantined that artifact and serve the honest 84.65% model.",
    bodyBn:
      "অডিটে ৬৮৬/৭৫৫টি ফ্যামিলি লিক ধরা পড়ায় পুরোনো ৯৯.১০% মডেল বাতিল ও কোয়ারেন্টাইন করে নিরাপদ ৮৪.৬৫% মডেল চালু করা হয়েছে।",
    metricBadge: "QUARANTINED 99.10% → 84.65%",
    accent: "#818cf8",
  },
  {
    step: "04",
    layerIndex: 2,
    titleEn: "Mandatory HTTP 422 Human Verification Gate on OCR",
    titleBn: "প্রেসক্রিপশন OCR-এ বাধ্যতামূলক HTTP 422 মানব যাচাই গেট",
    bodyEn:
      "Even if browser JavaScript is bypassed, SQLite CHECK constraints and FastAPI return HTTP 422 UNVERIFIED_OCR_FIELDS if any medication reminder attempts activation without confirmed human review (verified_by_user_id != NULL).",
    bodyBn:
      "প্রেসক্রিপশন OCR থেকে স্বয়ংক্রিয়ভাবে কোনো ওষুধের রিমাইন্ডার চালু করা যায় না—SQLite CHECK ও সার্ভার HTTP 422 মানব যাচাই ছাড়া ব্লক করে।",
    metricBadge: "1,000 AUDITED • 100% 422 LOCK",
    accent: "#f2c879",
  },
  {
    step: "05",
    layerIndex: 2,
    titleEn: "Radical Honesty on Small Cohorts & Deferred Phase G Voice",
    titleBn: "ছোট ডেটাসেট (N=22) ও Phase G বাংলা ভয়েস নিয়ে স্বচ্ছ প্রকাশ",
    bodyEn:
      "DermoPed openly discloses its local cohort has 19 Chickenpox and only 3 Pediculosis patients (pt72/pt71/pt74, 15.0% Val recall). Bangla Whisper-Small-BN benchmarks 26 FLEURS clips (39.09% WER) while live mic/RAG awaits Phase G.",
    bodyBn:
      "DermoPed-এ মাত্র ৩ জন Pediculosis রোগী থাকার সীমাবদ্ধতা এবং বাংলা ভয়েস Whisper-Small-BN (৩৯.০৯% WER) Phase G-তে সংরক্ষিত থাকার তথ্য খোলাখুলি দেখানো হয়েছে।",
    metricBadge: "N=22 DISCLOSED • PHASE G GATED",
    accent: "#c084fc",
  },
  {
    step: "06",
    layerIndex: 3,
    titleEn: "Privacy-First Blood Connect & Clinician Co-Pilot Delivery",
    titleBn: "গোপনীয়তা-সুরক্ষিত ব্লাড কানেক্ট ও ডাক্তার রিভিউ সিস্টেম",
    bodyEn:
      "All AI drafts route to clinician review and verified records; Blood Connect computes Haversine 5/10/20/50 km matching while keeping donor phone numbers HIDDEN_UNTIL_CONSENT and auto-revoking when closed.",
    bodyBn:
      "সকল AI ড্রাফট ডাক্তারের যাচাইয়ের জন্য যায় এবং ব্লাড কানেক্টে দাতার ফোন নম্বর কনসেন্ট ছাড়া লুকানো থাকে ও ডোনেশন শেষে স্বয়ংক্রিয়ভাবে বন্ধ হয়।",
    metricBadge: "5/10/20 KM • PHONE CONSENT LOCK",
    accent: "#fb7185",
  },
];

const CLINICAL_STRATA = [
  {
    id: 0,
    title: "Layer 01 • Multimodal Clinical Ingestion",
    sub: "20 Labs, Ovarian USG, Lesion Crops, PDF/Rx, 16kHz Audio",
    color: "#38bdf8",
    y: 26,
  },
  {
    id: 1,
    title: "Layer 02 • Leak-Free Grouping & Checkpoints",
    sub: "755-Family Split, pHash Dedup, SHA-256 Registry Verification",
    color: "#2dd4bf",
    y: 102,
  },
  {
    id: 2,
    title: "Layer 03 • Hard Safety & Regulatory Guard",
    sub: "Quarantined 99.10%, HTTP 422 OCR Lock, N=22 & Phase G Gate",
    color: "#f2c879",
    y: 178,
  },
  {
    id: 3,
    title: "Layer 04 • Doctor Co-Pilot & Blood Connect OS",
    sub: "Signed e-Rx, 5-Role RBAC Isolation, Consent-Gated Donor Geo",
    color: "#fb7185",
    y: 254,
  },
];

export function StickyClinicalStory({
  locale,
  pauseMotion = false,
}: {
  locale: "en" | "bn";
  pauseMotion?: boolean;
}) {
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.stepIdx ?? 0);
            if (!Number.isNaN(idx)) setActiveStep(idx);
          }
        });
      },
      { rootMargin: "-30% 0px -45% 0px", threshold: 0.1 }
    );

    stepRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const currentStory = STORY_STEPS[activeStep] ?? STORY_STEPS[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left 6 Forensic Steps */}
      <div className="lg:col-span-6 space-y-3.5">
        {STORY_STEPS.map((st, idx) => {
          const active = idx === activeStep;
          return (
            <button
              key={st.step}
              ref={(el) => {
                stepRefs.current[idx] = el;
              }}
              data-step-idx={idx}
              type="button"
              onClick={() => setActiveStep(idx)}
              className={`w-full text-left ss-sapphire-card rounded-2xl p-5 border transition cursor-pointer ${
                active ? "bg-[#081b3b]/95 border-sky-400 shadow-lg" : "hover:border-sky-400/45 opacity-85"
              }`}
              style={active ? { borderColor: st.accent, boxShadow: `0 10px 30px ${st.accent}22` } : undefined}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-white/10" style={{ color: st.accent }}>
                  STEP {st.step}
                </span>
                <span className="font-mono text-[10px] text-slate-300">{st.metricBadge}</span>
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">{locale === "bn" ? st.titleBn : st.titleEn}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{locale === "bn" ? st.bodyBn : st.bodyEn}</p>
            </button>
          );
        })}
      </div>

      {/* Right Sticky 4-Layer Clinical OS Strata SVG */}
      <div className="lg:col-span-6 lg:sticky lg:top-28 ss-sapphire-card rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 font-mono text-xs font-bold text-[#2dd4bf] uppercase">
            <Layers className="w-4 h-4" />
            <span>SHASTHOSETU 4-LAYER ARCHITECTURE</span>
          </div>
          <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-white/10 text-white">
            Active: {currentStory.step}
          </span>
        </div>

        <svg viewBox="0 0 540 340" className="w-full h-auto" role="img" aria-label="4-Layer Clinical System Strata Diagram">
          {/* Vertical connector spine */}
          <line x1="270" y1="36" x2="270" y2="306" stroke="rgba(56,189,248,0.28)" strokeWidth="2.5" strokeDasharray="4 4" />
          {!pauseMotion && (
            <circle cx="270" cy={CLINICAL_STRATA[currentStory.layerIndex]?.y + 32} r="8" fill={currentStory.accent} opacity="0.45">
              <animate attributeName="r" values="6;13;6" dur="2.2s" repeatCount="indefinite" />
            </circle>
          )}

          {CLINICAL_STRATA.map((layer) => {
            const isHighlighted = layer.id === currentStory.layerIndex;
            return (
              <g key={layer.id}>
                <rect
                  x="22"
                  y={layer.y}
                  width="496"
                  height="62"
                  rx="16"
                  fill={isHighlighted ? "#0c2146" : "#040b1b"}
                  stroke={isHighlighted ? layer.color : "rgba(255,255,255,0.16)"}
                  strokeWidth={isHighlighted ? "2.4" : "1.1"}
                />
                <circle cx="48" cy={layer.y + 31} r="10" fill={`${layer.color}28`} stroke={layer.color} strokeWidth="2" />
                <text x="48" y={layer.y + 35} textAnchor="middle" fill={layer.color} fontSize="11" fontWeight="800" className="font-mono">
                  {layer.id + 1}
                </text>
                <text x="72" y={layer.y + 26} fill="#FFFFFF" fontSize="14" fontWeight="800">
                  {layer.title}
                </text>
                <text x="72" y={layer.y + 46} fill="#9eb3d1" fontSize="11" className="font-mono">
                  {layer.sub}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="rounded-2xl bg-[#040a18]/85 border border-white/10 p-4 text-xs text-slate-300 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: currentStory.accent }} />
          <div>
            <div className="font-bold text-white mb-0.5">{currentStory.titleEn}</div>
            <span>{currentStory.metricBadge} — Scroll chapters on the left or click any step to inspect layer dependencies.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   2. INTERACTIVE EQUATION & FORMULA EXPLORER (AgriSense EquationStepExplorer port)
   ============================================================================ */
interface EquationItem {
  id: string;
  tag: string;
  titleEn: string;
  titleBn: string;
  formula: string;
  variables: Array<{ sym: string; desc: string }>;
  workedExample: string;
  accent: string;
}

const CLINICAL_EQUATIONS: EquationItem[] = [
  {
    id: "m01-bal-acc",
    tag: "M01 • PCOS CLINICAL",
    titleEn: "Stratified Balanced Accuracy",
    titleBn: "স্ট্যাটিফাইড ব্যালেন্সড একিউরেসি",
    formula: "BalAcc = 0.5 × (TP / (TP + FN) + TN / (TN + FP))",
    variables: [
      { sym: "TP / FN", desc: "True Positive & False Negative endocrine phenotype profiles (N=88 cohort)" },
      { sym: "SimpleImputer", desc: "Median-fills optional omitted serum hormones during live inference" },
    ],
    workedExample: "17 / 18 Held-out Split -> 94.44% Holdout BalAcc • 88.57% Stratified 5-Fold CV",
    accent: "#38bdf8",
  },
  {
    id: "m02-phash",
    tag: "M02 • PCOS ULTRASOUND",
    titleEn: "Perceptual Hash Deduplication Distance",
    titleBn: "পারসেপচুয়াল হ্যাশ ডুপ্লিকেশন দূরত্ব",
    formula: "d_H(pHash(I_a), pHash(I_b)) = Σ (h_a[i] ⊕ h_b[i]) ≤ τ",
    variables: [
      { sym: "⊕", desc: "Bitwise Hamming difference across 64-bit DCT ovarian scan hashes" },
      { sym: "Cluster Group", desc: "384 raw scans deduplicated into 299 unique images / 289 pseudo-patients" },
    ],
    workedExample: "ResNet18 Best -> 39 / 45 Held-out Test Scans = 86.67% Acc (87.70% Weighted F1)",
    accent: "#2dd4bf",
  },
  {
    id: "m03-leak",
    tag: "M03 • VIRAL RASH LEAKAGE",
    titleEn: "Source-Family Split Overlap Rate",
    titleBn: "সোর্স-ফ্যামিলি স্প্লিট ওভারল্যাপ হার",
    formula: "LeakRate = |Fam(Train) ∩ Fam(Test)| / |Fam_total|",
    variables: [
      { sym: "Fam(X)", desc: "Distinct clinical source photography family IDs in split X" },
      { sym: "Quarantine Rule", desc: "Any checkpoint with LeakRate > 0% is quarantined from serving" },
    ],
    workedExample: "Legacy 99.10%: 686/755 leaked (90.86% QUARANTINED) -> Clean 755-Family ResNet18: 0.00% Leak (84.65% Acc)",
    accent: "#818cf8",
  },
  {
    id: "m04-gate",
    tag: "M04 • SAFE OCR GATE",
    titleEn: "Deterministic Human Verification Predicate",
    titleBn: "মানব যাচাই বাধ্যতামূলক গেট প্রেডিকেট",
    formula: "ActivateSchedule ⇔ (verified_by_user_id ≠ NULL) ∧ (∀ c ∈ Medicines: c.is_verified = 1)",
    variables: [
      { sym: "CHECK Constraint", desc: "SQLite DDL blocks ACTIVE/VERIFIED status lacking verifier user UUID" },
      { sym: "HTTP 422 Gate", desc: "FastAPI returns UNVERIFIED_OCR_FIELDS whenever any field lacks sign-off" },
    ],
    workedExample: "1,000-Rx Corpus (992 Admissible, 8 Quarantined) -> 100.00% Unauthorized Bypass Blocked",
    accent: "#f2c879",
  },
  {
    id: "m05-wer",
    tag: "M05 • BANGLA VOICE (PHASE G)",
    titleEn: "Normalized Bengali ASR Word Error Rate",
    titleBn: "বাংলা স্পিচ-টু-টেক্সট Word Error Rate",
    formula: "WER = (Substitutions + Deletions + Insertions) / N_ref_words",
    variables: [
      { sym: "BN Unicode %", desc: "Fraction of output tokens normalized to valid Bengali Unicode script" },
      { sym: "Phase G Status", desc: "Audited offline on 26 FLEURS clips (22 speakers); live mic deferred" },
    ],
    workedExample: "Whisper-Small-BN: 39.09% WER (98.37% BN Unicode) vs Whisper-Base: 242.83% WER (0.0% BN)",
    accent: "#c084fc",
  },
  {
    id: "bc-haversine",
    tag: "BLOOD CONNECT • GEO RADIAL",
    titleEn: "Haversine Donor Proximity & Privacy Gate",
    titleBn: "হ্যাভারসাইন রক্তদাতা দূরত্ব ও প্রাইভেসি গেট",
    formula: "d = 2R · arcsin(√(sin²(Δφ/2) + cos φ₁ cos φ₂ sin²(Δλ/2))) ≤ r_km",
    variables: [
      { sym: "r_km ∈ {5,10,20,50}", desc: "Configurable search radius centered on hospital/division coordinates" },
      { sym: "Privacy Invariant", desc: "Donor phone returns HIDDEN_UNTIL_CONSENT unless consent_phone_shared = 1" },
    ],
    workedExample: "13 Seeded Donors across 8 Divisions -> 0 Unauthorized Phone Leaks • Auto-Revoke on Close",
    accent: "#fb7185",
  },
];

export function ClinicalEquationExplorer({ locale }: { locale: "en" | "bn" }) {
  const [selectedId, setSelectedId] = useState(CLINICAL_EQUATIONS[0].id);
  const active = CLINICAL_EQUATIONS.find((e) => e.id === selectedId) ?? CLINICAL_EQUATIONS[0];

  return (
    <div className="ss-sapphire-card rounded-3xl p-6 sm:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 font-mono text-xs font-bold text-[#38bdf8] uppercase">
          <Sigma className="w-4 h-4" />
          <span>CLINICAL METRICS &amp; SAFETY MATHEMATICAL SPECIFICATIONS</span>
        </div>
        <span className="font-mono text-[10px] px-2.5 py-1 rounded-full bg-emerald-400/15 border border-emerald-400/35 text-emerald-200 inline-flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> FINAL_LOCK VERIFIED
        </span>
      </div>

      {/* Horizontal Pill Selector */}
      <div className="flex flex-wrap gap-2">
        {CLINICAL_EQUATIONS.map((eq) => {
          const isSel = eq.id === active.id;
          return (
            <button
              key={eq.id}
              type="button"
              onClick={() => setSelectedId(eq.id)}
              className={`min-h-10 px-3.5 rounded-full text-xs font-bold transition cursor-pointer border ${
                isSel
                  ? "bg-white text-slate-950 border-transparent shadow"
                  : "bg-[#040a18]/80 border-white/15 text-slate-200 hover:border-sky-400/50"
              }`}
            >
              {eq.tag}
            </button>
          );
        })}
      </div>

      {/* Selected Equation Card */}
      <div className="rounded-2xl bg-[#040a18]/90 border p-5 space-y-4" style={{ borderColor: `${active.accent}55` }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-white">{locale === "bn" ? active.titleBn : active.titleEn}</h3>
          <span className="font-mono text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/10" style={{ color: active.accent }}>
            {active.tag}
          </span>
        </div>

        <div className="rounded-xl bg-[#020612] border border-white/15 px-4 py-3.5 font-mono text-sm sm:text-base font-bold text-[#f2c879] overflow-x-auto">
          {active.formula}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {active.variables.map((v) => (
            <div key={v.sym} className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-1">
              <div className="font-mono font-bold" style={{ color: active.accent }}>
                {v.sym}
              </div>
              <div className="text-slate-300 leading-relaxed">{v.desc}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/30 px-4 py-2.5 text-xs font-mono text-emerald-200">
          <strong>AUDITED WORKED PROOF:</strong> {active.workedExample}
        </div>
      </div>
    </div>
  );
}
