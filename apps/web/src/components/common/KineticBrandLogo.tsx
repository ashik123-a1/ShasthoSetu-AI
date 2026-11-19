import { Link } from "react-router-dom";

export function KineticBrandLogo({
  to = "/",
  compact = false,
  tagline = "CLINICAL TELEMEDICINE • RESEARCH VAULT",
}: {
  to?: string;
  compact?: boolean;
  tagline?: string;
}) {
  return (
    <Link
      to={to}
      className={`lg-center-brand ${compact ? "scale-[0.82] origin-left -ml-2" : ""}`}
      title="SHASTHO SETU — Official Clinical Telemedicine & AI Platform"
    >
      {/* 1. Main Row: SHASTHO [ OFFICIAL WEBSITE LOGO ] SETU */}
      <div className="lg-brand-row">
        <div
          className={`lg-kinetic-word lg-word-land ${compact ? "!text-[15px] !tracking-[2.5px] !mr-2" : ""}`}
          data-text="SHASTHO"
        >
          SHASTHO
          <span className="lg-word-fill-land">SHASTHO</span>
        </div>

        <div className={`lg-middle-shield ${compact ? "!w-9 !h-9" : "!w-12 !h-12"}`}>
          <div className="relative w-full h-full flex items-center justify-center">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -inset-1 rounded-full border border-dashed border-cyan-400/70 lg-spin-orbit"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-full bg-cyan-400/20 blur-sm"
            />
            <img
              src="/shasthosetu-logo.png"
              alt="ShasthoSetu AI"
              className="relative z-10 w-full h-full rounded-full object-cover border-2 border-cyan-300/80 shadow-[0_0_16px_rgba(34,211,238,0.45)]"
            />
          </div>
        </div>

        <div
          className={`lg-kinetic-word lg-word-guard ${compact ? "!text-[15px] !tracking-[2.5px] !ml-2" : ""}`}
          data-text="SETU"
        >
          SETU
          <span className="lg-word-fill-guard">SETU</span>
        </div>
      </div>

      {/* 2. Cyber Base Plate */}
      {!compact && (
        <>
          <div className="lg-cyber-platform">
            <div className="lg-plate-wing lg-wing-left" />
            <div className="lg-plate-keyhole">
              <img
                src="/shasthosetu-logo.png"
                alt=""
                aria-hidden="true"
                className="w-4 h-4 rounded-full object-cover border border-cyan-400/70"
              />
            </div>
            <div className="lg-plate-wing lg-wing-right" />
          </div>
          <div className="lg-subtext">{tagline}</div>
        </>
      )}
    </Link>
  );
}
