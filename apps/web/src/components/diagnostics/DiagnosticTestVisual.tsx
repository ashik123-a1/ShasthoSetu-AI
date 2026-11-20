export function DiagnosticTestVisual({
  code,
  category,
  className = "w-14 h-14",
}: {
  code?: string;
  category?: string;
  className?: string;
}) {
  const normCode = (code || "").toUpperCase();
  const normCat = (category || "").toLowerCase();

  // 1. Hematology (CBC-01) - Blood Vial & Red Blood Cells
  if (normCode.includes("CBC") || normCat.includes("hematology")) {
    return (
      <div className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-rose-950/80 via-red-950/50 to-slate-900 border border-rose-500/40 p-2 shrink-0 ${className}`}>
        <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_2px_8px_rgba(244,63,94,0.4)]">
          {/* Lavender EDTA Tube Cap */}
          <rect x="18" y="6" width="8" height="6" rx="1.5" fill="#a855f7" stroke="#c084fc" strokeWidth="1" />
          {/* Glass tube */}
          <path d="M19 12 L19 32 C19 35 25 35 25 32 L25 12 Z" fill="#4c0519" stroke="#fb7185" strokeWidth="1.4" />
          {/* Blood column */}
          <path d="M20 20 L20 32 C20 34 24 34 24 32 L24 20 Z" fill="#e11d48" />
          {/* Red blood cell dots */}
          <circle cx="12" cy="22" r="3" fill="#f43f5e" opacity="0.8" />
          <circle cx="32" cy="24" r="2.5" fill="#f43f5e" opacity="0.8" />
        </svg>
      </div>
    );
  }

  // 2. Glucose & HbA1c (FBG-02, Metabolic)
  if (normCode.includes("FBG") || normCat.includes("metabolic")) {
    return (
      <div className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-950/80 via-teal-950/50 to-slate-900 border border-emerald-500/40 p-2 shrink-0 ${className}`}>
        <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_2px_8px_rgba(16,185,129,0.4)]">
          <circle cx="22" cy="22" r="15" fill="#022c22" stroke="#34d399" strokeWidth="1.4" />
          <path d="M15 22 L20 22 L22 16 L25 27 L27 20 L30 22" stroke="#6ee7b7" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="22" cy="30" r="1.8" fill="#10b981" />
        </svg>
      </div>
    );
  }

  // 3. Endocrinology & Thyroid (PCOS-03, THY-05)
  if (normCode.includes("PCOS") || normCode.includes("THY") || normCat.includes("endocrinology")) {
    return (
      <div className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-950/80 via-sky-950/50 to-slate-900 border border-cyan-500/40 p-2 shrink-0 ${className}`}>
        <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_2px_8px_rgba(6,182,212,0.4)]">
          {/* Butterfly thyroid lobes */}
          <path d="M14 16 C12 24 14 30 19 28 C21 27 21 24 22 23 C23 24 23 27 25 28 C30 30 32 24 30 16 C27 20 24 20 22 19 C20 20 17 20 14 16 Z" fill="#0891b2" stroke="#38bdf8" strokeWidth="1.4" />
          <circle cx="22" cy="22" r="2" fill="#e0f2fe" />
        </svg>
      </div>
    );
  }

  // 4. Cardiology & Lipid / ECG (LIP-06, ECG-12)
  if (normCode.includes("LIP") || normCode.includes("ECG") || normCat.includes("cardiology")) {
    return (
      <div className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-amber-950/80 via-orange-950/50 to-slate-900 border border-amber-500/40 p-2 shrink-0 ${className}`}>
        <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_2px_8px_rgba(245,158,11,0.4)]">
          <path d="M22 13 C19 9 13 10 13 16 C13 23 22 31 22 31 C22 31 31 23 31 16 C31 10 25 9 22 13 Z" fill="#78350f" stroke="#fbbf24" strokeWidth="1.5" />
          <path d="M16 20 L19 20 L21 16 L23 24 L25 19 L28 20" stroke="#fef3c7" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  // 5. Infectious (DEN-07 Dengue)
  if (normCode.includes("DEN") || normCat.includes("infectious")) {
    return (
      <div className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-purple-950/80 via-indigo-950/50 to-slate-900 border border-purple-500/40 p-2 shrink-0 ${className}`}>
        <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_2px_8px_rgba(168,85,247,0.4)]">
          <path d="M22 8 L32 12 V22 C32 28 27 33 22 36 C17 33 12 28 12 22 V12 Z" fill="#3b0764" stroke="#c084fc" strokeWidth="1.4" />
          <path d="M18 22 L21 25 L27 18" stroke="#e9d5ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  // 6. Imaging (USG-04)
  if (normCode.includes("USG") || normCat.includes("imaging")) {
    return (
      <div className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-950/80 via-sky-950/50 to-slate-900 border border-blue-500/40 p-2 shrink-0 ${className}`}>
        <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_2px_8px_rgba(59,130,246,0.4)]">
          <rect x="12" y="10" width="20" height="24" rx="4" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="1.4" />
          <path d="M16 22 Q22 16 28 22 Q22 28 16 22" fill="#93c5fd" opacity="0.6" />
          <circle cx="22" cy="22" r="3" fill="#ffffff" />
        </svg>
      </div>
    );
  }

  // 7. Pathology & Urine (URN-11)
  if (normCode.includes("URN") || normCat.includes("pathology")) {
    return (
      <div className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-950/80 via-amber-950/50 to-slate-900 border border-yellow-500/40 p-2 shrink-0 ${className}`}>
        <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_2px_8px_rgba(234,179,8,0.4)]">
          <rect x="14" y="14" width="16" height="20" rx="3" fill="#713f12" stroke="#facc15" strokeWidth="1.4" />
          <rect x="16" y="8" width="12" height="6" rx="1.5" fill="#ca8a04" stroke="#facc15" strokeWidth="1" />
          <path d="M15 22 L29 22 L29 32 C29 33 28 34 27 34 L17 34 C16 34 15 33 15 32 Z" fill="#fde047" opacity="0.8" />
        </svg>
      </div>
    );
  }

  // 8. Organ Function / Renal / Liver (LFT-08, RFT-09)
  return (
    <div className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-teal-950/80 via-cyan-950/50 to-slate-900 border border-teal-500/40 p-2 shrink-0 ${className}`}>
      <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_2px_8px_rgba(20,184,166,0.4)]">
        <rect x="14" y="10" width="16" height="24" rx="4" fill="#134e4a" stroke="#2dd4bf" strokeWidth="1.4" />
        <line x1="18" y1="16" x2="26" y2="16" stroke="#5eead4" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="18" y1="22" x2="26" y2="22" stroke="#5eead4" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="18" y1="28" x2="22" y2="28" stroke="#5eead4" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}
