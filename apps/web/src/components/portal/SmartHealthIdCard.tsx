import { useState } from "react";
import { Fingerprint, RotateCw, ShieldCheck, Stethoscope, Headphones } from "lucide-react";

interface SmartHealthIdCardProps {
  role: "PATIENT" | "DOCTOR" | "SUPPORT" | "ADMIN";
  fullName: string;
  idCode: string;
  subtitle?: string;
  locationLabel?: string;
  bloodGroup?: string;
  validThru?: string;
  avatarUrl?: string;
}

const ROLE_THEME: Record<
  SmartHealthIdCardProps["role"],
  {
    headerTitle: string;
    roleLabel: string;
    accentBorder: string;
    accentText: string;
    ringClass: string;
    defaultAvatar: string;
    mrzPrefix: string;
  }
> = {
  PATIENT: {
    headerTitle: "ShasthoSetu Smart Health ID",
    roleLabel: "Patient Cardholder",
    accentBorder: "border-cyan-500/40",
    accentText: "text-cyan-300",
    ringClass: "border-cyan-400/70 ring-cyan-500/40",
    defaultAvatar: "/images/doctors/doc-f-02.jpg",
    mrzPrefix: "I<BGD88492014",
  },
  DOCTOR: {
    headerTitle: "ShasthoSetu Clinician ID",
    roleLabel: "Verified BMDC Physician",
    accentBorder: "border-indigo-400/45",
    accentText: "text-indigo-300",
    ringClass: "border-indigo-400/70 ring-indigo-500/40",
    defaultAvatar: "/images/doctors/doc-f-01.jpg",
    mrzPrefix: "D<BGD91044228",
  },
  SUPPORT: {
    headerTitle: "ShasthoSetu Zero-PHI Desk ID",
    roleLabel: "Support & Triage Officer",
    accentBorder: "border-amber-400/45",
    accentText: "text-amber-300",
    ringClass: "border-amber-400/70 ring-amber-500/40",
    defaultAvatar: "/images/doctors/doc-m-03.jpg",
    mrzPrefix: "S<BGD20488110",
  },
  ADMIN: {
    headerTitle: "ShasthoSetu Governance ID",
    roleLabel: "Senior System Registrar",
    accentBorder: "border-emerald-400/45",
    accentText: "text-emerald-300",
    ringClass: "border-emerald-400/70 ring-emerald-500/40",
    defaultAvatar: "/images/doctors/doc-m-01.jpg",
    mrzPrefix: "A<BGD10019942",
  },
};

const BARCODE_WIDTHS = [2, 1, 3, 1, 2, 2, 1, 1, 3, 2, 1, 2, 1, 3, 1, 2, 1, 1, 2, 3, 1, 2, 2, 1, 3, 1, 2, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 2];

export function SmartHealthIdCard({
  role,
  fullName,
  idCode,
  subtitle,
  locationLabel = "Dhanmondi, Dhaka-1209",
  bloodGroup = "O+",
  validThru = "12/2029",
  avatarUrl,
}: SmartHealthIdCardProps) {
  const [flipped, setFlipped] = useState(false);
  const cfg = ROLE_THEME[role];
  const imgSrc = avatarUrl || cfg.defaultAvatar;
  const cleanMrzName = fullName
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join("<")
    .padEnd(24, "<")
    .slice(0, 24);

  const toggle = () => setFlipped((prev) => !prev);

  return (
    <div className="flex flex-col items-center w-full">
      <div
        className="id-card-3d-wrapper mx-auto"
        onClick={toggle}
        tabIndex={0}
        role="button"
        aria-pressed={flipped}
        aria-label={`${cfg.headerTitle} for ${fullName}, click or press Enter to flip front and back`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
      >
        <div className={`id-card-3d-inner ${flipped ? "flipped" : ""}`}>
          {/* FRONT FACE */}
          <div className="id-card-face id-card-front">
            <div className={`identity-card ${cfg.accentBorder}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {role === "DOCTOR" ? (
                      <Stethoscope className={`w-4 h-4 sm:w-5 sm:h-5 ${cfg.accentText}`} />
                    ) : role === "SUPPORT" ? (
                      <Headphones className={`w-4 h-4 sm:w-5 sm:h-5 ${cfg.accentText}`} />
                    ) : (
                      <ShieldCheck className={`w-4 h-4 sm:w-5 sm:h-5 ${cfg.accentText}`} />
                    )}
                    <span className={`text-[10.5px] sm:text-xs font-mono font-bold tracking-widest uppercase ${cfg.accentText}`}>
                      {cfg.headerTitle}
                    </span>
                  </div>
                  <div className="text-[8.5px] font-mono text-cyan-400/80 uppercase tracking-widest mt-0.5">
                    People&apos;s Republic of Bangladesh • Digital Health Registry
                  </div>
                </div>
                <div className="chip-icon shrink-0" />
              </div>

              <div className="my-2 flex items-center gap-3">
                <div className="relative shrink-0">
                  <img
                    src={imgSrc}
                    alt={fullName}
                    className={`w-14 h-16 sm:w-16 sm:h-20 rounded-xl object-cover border-2 shadow-lg ring-1 ${cfg.ringClass}`}
                  />
                  <span
                    className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full"
                    title="Verified Identity"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] sm:text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    {cfg.roleLabel}
                  </div>
                  <div className="text-sm sm:text-base font-extrabold tracking-wide text-white font-mono uppercase truncate">
                    {fullName}
                  </div>
                  <div className={`text-[11px] sm:text-xs font-mono tracking-widest font-semibold mt-0.5 ${cfg.accentText}`}>
                    {idCode}
                  </div>
                  {subtitle && <div className="text-[10px] text-slate-300 truncate mt-0.5">{subtitle}</div>}
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-cyan-400/40 bg-cyan-950/40 flex items-center justify-center text-cyan-300 shadow-inner shrink-0">
                  <Fingerprint className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[9.5px] sm:text-[10px] font-mono text-slate-300 border-t border-cyan-500/25 pt-1.5">
                  <div className="truncate pr-2">
                    STATION: <span className="text-white font-semibold">{locationLabel}</span>
                  </div>
                  <div className="shrink-0">
                    VALID THRU: <span className="text-white font-semibold">{validThru}</span>
                  </div>
                </div>
                <div className="text-[8px] text-cyan-400/80 font-mono tracking-tighter text-center mt-1">
                  SYNTHETIC DEMO • CLINICAL HEALTH ID • ZERO REAL PHI
                </div>
              </div>
            </div>
          </div>

          {/* BACK FACE */}
          <div className="id-card-face id-card-back">
            <div className="identity-card-back">
              {/* Vector 2D Barcode Strip */}
              <div className="w-full bg-slate-950/85 border border-cyan-500/40 rounded-lg px-2 py-1 flex items-center justify-center shadow-inner">
                <svg className="w-full h-5 sm:h-6" viewBox="0 0 120 18" preserveAspectRatio="none" aria-hidden="true">
                  {(() => {
                    let x = 2;
                    return BARCODE_WIDTHS.map((w, idx) => {
                      const rect = (
                        <rect
                          key={idx}
                          x={x}
                          y={1}
                          width={w * 1.15}
                          height={16}
                          fill={idx % 2 === 0 ? "#67e8f9" : "transparent"}
                          opacity={idx % 2 === 0 ? 0.9 : 0}
                        />
                      );
                      x += w * 1.45;
                      return rect;
                    });
                  })()}
                </svg>
              </div>

              {/* Address & Security Metadata */}
              <div className="my-1 flex items-start justify-between gap-2.5">
                <div className="flex-1 min-w-0 pr-1">
                  <div className="text-[9px] sm:text-[10px] leading-snug text-slate-200">
                    <span className="text-cyan-400 font-mono text-[8.5px] font-bold block mb-0.5 uppercase tracking-wider">
                      Registered Address / ঠিকানা
                    </span>
                    <span className="text-slate-100">
                      বাসা/হোল্ডিং: ৩৬, রোড নং-২, ধানমন্ডি আ/এ, জিগাতলা-১২০৯, ঢাকা দক্ষিণ সিটি কর্পোরেশন
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 text-[8.5px] sm:text-[9px] font-mono text-slate-300 border-t border-cyan-500/25 pt-1">
                    <div>
                      BLOOD: <span className="text-rose-400 font-bold">{bloodGroup}</span>
                    </div>
                    <div>
                      DIVISION: <span className="text-cyan-300 font-bold">DHAKA</span>
                    </div>
                    <div>
                      ISSUED: <span className="text-slate-200">2026</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-0.5">
                  <div className="relative shrink-0">
                    <img
                      src={imgSrc}
                      alt="Ghost portrait"
                      className="w-8 h-10 rounded-lg object-cover border border-cyan-400/60 shadow-md opacity-90"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border border-slate-900 rounded-full" />
                  </div>
                </div>
              </div>

              {/* 3-Line MRZ Zone */}
              <div>
                <div className="bg-slate-950/85 border border-cyan-500/35 rounded-lg px-2.5 py-1 font-mono text-[8px] sm:text-[9px] text-cyan-300 tracking-wider leading-snug select-none shadow-inner">
                  <div className="tracking-widest text-cyan-200/90 font-bold">{cfg.mrzPrefix}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;43</div>
                  <div className="tracking-widest text-cyan-200/90 font-bold">9401215M2912319BGD&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;8</div>
                  <div className="tracking-widest text-cyan-300 font-extrabold">{cleanMrzName}&lt;&lt;&lt;&lt;&lt;</div>
                </div>
                <div className="text-[7.5px] text-cyan-400/80 font-mono tracking-tighter text-center mt-0.5">
                  SYNTHETIC DEMO • NOT A GOVERNMENT CARD • SHASTHOSETU AI
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 text-center text-[10px] text-slate-400 font-mono flex items-center justify-center gap-1.5">
        <RotateCw className="w-3 h-3 text-cyan-400" />
        <span>Click card anytime to flip 3D Front / Back ({flipped ? "Smart NID Back" : "Digital Card Front"})</span>
      </div>
    </div>
  );
}
