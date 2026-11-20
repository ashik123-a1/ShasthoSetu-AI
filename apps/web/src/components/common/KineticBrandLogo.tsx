import { Link } from "react-router-dom";

export function KineticBrandLogo({
  to = "/",
  compact = false,
  tagline = "CLINICAL TELEMEDICINE • RESEARCH VAULT",
  showTagline = false,
}: {
  to?: string;
  compact?: boolean;
  tagline?: string;
  showTagline?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-3 group transition cursor-pointer select-none ${
        compact ? "scale-95 origin-left" : ""
      }`}
      title="SHASTHOSETU AI — Official Clinical Telemedicine & AI Platform"
    >
      {/* 1. Circular Stethoscope / Cross Badge */}
      <div className={`relative shrink-0 flex items-center justify-center ${compact ? "w-8 h-8 sm:w-9 sm:h-9" : "w-10 h-10 sm:w-11 sm:h-11"}`}>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full bg-cyan-400/25 blur-sm group-hover:bg-cyan-400/40 transition"
        />
        <img
          src="/shasthosetu-logo.png"
          alt="ShasthoSetu AI Logo"
          className="relative z-10 w-full h-full rounded-full object-cover border-2 border-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.45)] group-hover:scale-105 transition"
        />
      </div>

      {/* 2. Unified Brand Typography: SHASTHOSETU (White) + AI (Cyan) */}
      <div className="flex flex-col leading-none">
        <div className="flex items-baseline gap-1.5 font-sans font-black tracking-wider">
          <span className={`tracking-[0.16em] uppercase text-white font-extrabold ${compact ? "text-sm sm:text-base" : "text-lg sm:text-xl"}`}>
            SHASTHOSETU
          </span>
          <span className={`font-mono font-extrabold text-[#38bdf8] drop-shadow-[0_0_10px_rgba(56,189,248,0.65)] ${compact ? "text-sm sm:text-base" : "text-lg sm:text-xl"}`}>
            AI
          </span>
        </div>
        {!compact && showTagline && (
          <span className="font-mono text-[8.5px] uppercase tracking-[0.22em] text-cyan-300/80 mt-1">
            {tagline}
          </span>
        )}
      </div>
    </Link>
  );
}
