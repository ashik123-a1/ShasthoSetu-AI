export type MedicineVisualTag =
  | "tablets"
  | "capsules"
  | "sachets"
  | "diabetic"
  | "glucometer"
  | "drops"
  | "supplement"
  | "skincare"
  | "womens"
  | "baby"
  | "device"
  | "wellness";

export function MedicineProductVisual({
  tag,
  category,
  className = "w-16 h-16",
}: {
  tag?: string;
  category?: string;
  className?: string;
}) {
  const normTag = (tag || "").toLowerCase();
  const normCat = (category || "").toLowerCase();

  // 1. Tablets / Blister strip
  if (normTag.includes("tablet") || normCat.includes("medicine") && !normTag.includes("capsule")) {
    return (
      <div className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-sky-950/70 to-slate-900 border border-sky-400/30 p-2 shrink-0 ${className}`}>
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_2px_8px_rgba(56,189,248,0.35)]">
          <rect x="6" y="8" width="36" height="32" rx="4" fill="#032541" stroke="#38bdf8" strokeWidth="1.6" />
          {/* Foil blister grid */}
          <line x1="24" y1="8" x2="24" y2="40" stroke="#0ea5e9" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="6" y1="24" x2="42" y2="24" stroke="#0ea5e9" strokeWidth="1" strokeDasharray="2 2" />
          <circle cx="15" cy="16" r="4.5" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1" />
          <circle cx="33" cy="16" r="4.5" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1" />
          <circle cx="15" cy="32" r="4.5" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1" />
          <circle cx="33" cy="32" r="4.5" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1" />
        </svg>
      </div>
    );
  }

  // 2. Capsules
  if (normTag.includes("capsule")) {
    return (
      <div className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-teal-950/70 to-slate-900 border border-teal-400/30 p-2 shrink-0 ${className}`}>
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_2px_8px_rgba(45,212,191,0.35)]">
          {/* Dual tone capsule */}
          <g transform="rotate(-35 24 24)">
            <rect x="14" y="10" width="20" height="14" rx="8" fill="#14b8a6" stroke="#2dd4bf" strokeWidth="1.5" />
            <rect x="14" y="24" width="20" height="14" rx="8" fill="#ffffff" stroke="#2dd4bf" strokeWidth="1.5" />
            <line x1="14" y1="24" x2="34" y2="24" stroke="#0f766e" strokeWidth="1.5" />
            <circle cx="20" cy="17" r="1.5" fill="#ccfbf1" />
          </g>
        </svg>
      </div>
    );
  }

  // 3. Baby Drops / Dropper
  if (normTag.includes("drop") || normCat.includes("baby")) {
    return (
      <div className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-pink-950/70 to-slate-900 border border-pink-400/30 p-2 shrink-0 ${className}`}>
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_2px_8px_rgba(244,114,182,0.35)]">
          {/* Dropper vial */}
          <rect x="16" y="18" width="16" height="22" rx="3" fill="#831843" stroke="#f472b6" strokeWidth="1.5" />
          <rect x="20" y="12" width="8" height="6" fill="#be185d" stroke="#f472b6" strokeWidth="1.2" />
          <path d="M22 12 C22 8, 26 8, 26 12 Z" fill="#fbcfe8" />
          {/* Liquid drop */}
          <path d="M24 24 C21 28, 21 31, 24 33 C27 31, 27 28, 24 24 Z" fill="#f472b6" />
        </svg>
      </div>
    );
  }

  // 4. Diabetic Care / Strips / Glucometer
  if (normTag.includes("diabetic") || normTag.includes("gluco") || normCat.includes("diabet")) {
    return (
      <div className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-950/70 to-slate-900 border border-emerald-400/30 p-2 shrink-0 ${className}`}>
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_2px_8px_rgba(52,211,153,0.35)]">
          <rect x="12" y="8" width="24" height="32" rx="6" fill="#064e3b" stroke="#34d399" strokeWidth="1.5" />
          <rect x="16" y="13" width="16" height="12" rx="2" fill="#022c22" stroke="#10b981" strokeWidth="1" />
          <text x="24" y="22" fill="#6ee7b7" fontSize="7" fontFamily="monospace" fontWeight="bold" textAnchor="middle">5.8</text>
          <circle cx="24" cy="32" r="3" fill="#10b981" stroke="#34d399" strokeWidth="1" />
        </svg>
      </div>
    );
  }

  // 5. Medical Device (BP Monitor / Pulse Oximeter)
  if (normTag.includes("device") || normCat.includes("device")) {
    return (
      <div className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-950/70 to-slate-900 border border-indigo-400/30 p-2 shrink-0 ${className}`}>
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_2px_8px_rgba(129,140,248,0.35)]">
          <rect x="10" y="10" width="28" height="28" rx="5" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1.5" />
          <path d="M14 24 L20 24 L23 18 L26 29 L29 22 L34 22" stroke="#38bdf8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="33" cy="15" r="2" fill="#ef4444" />
        </svg>
      </div>
    );
  }

  // 6. Skincare & Topical
  if (normTag.includes("skin") || normCat.includes("personal")) {
    return (
      <div className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-amber-950/70 to-slate-900 border border-amber-400/30 p-2 shrink-0 ${className}`}>
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_2px_8px_rgba(251,191,36,0.35)]">
          <path d="M16 14 L32 14 L28 40 L20 40 Z" fill="#78350f" stroke="#fbbf24" strokeWidth="1.5" />
          <rect x="18" y="8" width="12" height="6" rx="2" fill="#fef3c7" stroke="#fbbf24" strokeWidth="1.2" />
          <path d="M22 24 Q24 20 26 24 Q28 28 24 28 Q20 28 22 24" fill="#fbbf24" />
        </svg>
      </div>
    );
  }

  // 7. Women's Care & Folate
  if (normTag.includes("women") || normCat.includes("women")) {
    return (
      <div className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-rose-950/70 to-slate-900 border border-rose-400/30 p-2 shrink-0 ${className}`}>
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_2px_8px_rgba(251,113,133,0.35)]">
          <circle cx="24" cy="20" r="10" stroke="#fb7185" strokeWidth="1.8" fill="#4c0519" />
          <line x1="24" y1="30" x2="24" y2="40" stroke="#fb7185" strokeWidth="1.8" />
          <line x1="19" y1="35" x2="29" y2="35" stroke="#fb7185" strokeWidth="1.8" />
          <circle cx="24" cy="20" r="4" fill="#f43f5e" />
        </svg>
      </div>
    );
  }

  // 8. Vitamins & Supplements
  if (normTag.includes("supplement") || normCat.includes("vitamin")) {
    return (
      <div className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-orange-950/70 to-slate-900 border border-orange-400/30 p-2 shrink-0 ${className}`}>
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_2px_8px_rgba(251,146,60,0.35)]">
          <rect x="14" y="16" width="20" height="24" rx="4" fill="#7c2d12" stroke="#fb923c" strokeWidth="1.5" />
          <rect x="17" y="10" width="14" height="6" rx="2" fill="#ffedd5" stroke="#fb923c" strokeWidth="1.2" />
          <path d="M24 22 L24 34 M18 28 L30 28" stroke="#fdba74" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // 9. Wellness / Antiseptic / Masks (Default fallback)
  return (
    <div className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-950/70 to-slate-900 border border-cyan-400/30 p-2 shrink-0 ${className}`}>
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_2px_8px_rgba(34,211,238,0.35)]">
        <rect x="15" y="14" width="18" height="26" rx="3" fill="#083344" stroke="#22d3ee" strokeWidth="1.5" />
        <rect x="18" y="8" width="12" height="6" rx="2" fill="#cffafe" stroke="#22d3ee" strokeWidth="1.2" />
        <path d="M24 20 L24 30 M19 25 L29 25" stroke="#67e8f9" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}
