import { useId } from "react";
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
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const bgId = `ssShieldBg-${uid}`;
  const cyanId = `ssNeonCyan-${uid}`;
  const greenId = `ssGreenGrad-${uid}`;
  const glowId = `ssCenterGlow-${uid}`;

  return (
    <Link
      to={to}
      className={`lg-center-brand ${compact ? "scale-[0.82] origin-left -ml-2" : ""}`}
      title="SHASTHO SETU — Clinical Telemedicine & AI Portal"
    >
      {/* 1. Main Row: SHASTHO [ SHIELD ] SETU */}
      <div className="lg-brand-row">
        <div
          className={`lg-kinetic-word lg-word-land ${compact ? "!text-[15px] !tracking-[2.5px] !mr-2" : ""}`}
          data-text="SHASTHO"
        >
          SHASTHO
          <span className="lg-word-fill-land">SHASTHO</span>
        </div>

        <div className={`lg-middle-shield ${compact ? "!w-8 !h-9" : ""}`}>
          <svg className="lg-shield-svg" viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={bgId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0F172A" />
                <stop offset="50%" stopColor="#0A221C" />
                <stop offset="100%" stopColor="#02150F" />
              </linearGradient>

              <linearGradient id={cyanId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22D3EE" />
                <stop offset="100%" stopColor="#06B6D4" />
              </linearGradient>

              <linearGradient id={greenId} x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#065F46" />
                <stop offset="60%" stopColor="#34D399" />
                <stop offset="100%" stopColor="#6EE7B7" />
              </linearGradient>

              <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Outer Spinning Orbit */}
            <g className="lg-spin-orbit">
              <ellipse
                cx="50"
                cy="55"
                rx="46"
                ry="17"
                transform="rotate(-15 50 55)"
                stroke="#22D3EE"
                strokeWidth="1.4"
                strokeDasharray="14 90"
                fill="none"
              />
              <circle cx="89" cy="38" r="2.2" fill="#22D3EE" filter={`url(#${glowId})`} />
            </g>

            {/* Main Shield Frame */}
            <path
              className="lg-shield-body"
              d="M50 7 C73 16 87 19 89 28 C89 67 55 93 50 101 C45 93 11 67 11 28 C13 19 27 16 50 7 Z"
              fill={`url(#${bgId})`}
              stroke={`url(#${cyanId})`}
              strokeWidth="2.6"
              strokeLinejoin="round"
            />

            {/* Interior Cyber Grid */}
            <g stroke="#1E293B" strokeWidth="1" opacity="0.8">
              <line x1="22" y1="28" x2="78" y2="28" />
              <line x1="18" y1="42" x2="82" y2="42" />
              <line x1="18" y1="56" x2="82" y2="56" />
              <line x1="50" y1="10" x2="50" y2="60" stroke="#22D3EE" strokeWidth="1.2" opacity="0.6" />
            </g>

            {/* Vertical Scanning Laser */}
            <line
              className="lg-laser-sweep"
              x1="16"
              y1="20"
              x2="84"
              y2="20"
              stroke="#34D399"
              strokeWidth="2"
              filter={`url(#${glowId})`}
            />

            {/* Circuit Traces & Nodes */}
            <g stroke="#22D3EE" strokeWidth="1.8" strokeLinecap="round">
              <path d="M20 38 H32 L38 46" fill="none" opacity="0.85" />
              <circle cx="20" cy="38" r="2" fill="#22D3EE" className="lg-blink-node" />
              <circle cx="38" cy="46" r="2" fill="#34D399" />
            </g>

            {/* Clinical Chart & Verified Badge */}
            <g transform="translate(43, 22)">
              <rect x="0" y="0" width="26" height="32" rx="3" fill="#061A14" stroke="#34D399" strokeWidth="1.8" />
              <line x1="5" y1="8" x2="21" y2="8" stroke="#34D399" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="5" y1="14" x2="17" y2="14" stroke="#6EE7B7" strokeWidth="1.8" strokeLinecap="round" />
              <circle className="lg-verified-badge" cx="22" cy="24" r="5.5" fill="#34D399" filter={`url(#${glowId})`} />
              <path
                d="M19.5 24 L21.5 26 L24.5 22.5"
                stroke="#022C22"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>

            {/* Perspective Clinical Cross / ECG Pulse Base */}
            <g>
              <path d="M18 64 L48 58 L47 79 L16 77 Z" fill="#064E3B" opacity="0.95" />
              <path d="M52 58 L82 64 L84 77 L53 79 Z" fill="#047857" opacity="0.95" />
              <path d="M16 77 L47 79 L45 93 L22 86 Z" fill={`url(#${greenId})`} />
              <path d="M53 79 L84 77 L78 86 L55 93 Z" fill="#10B981" />
              <path d="M22 72 H37 L42 63 L48 82 L54 67 L59 72 H78" stroke="#A7F3D0" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </svg>
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
              <svg width="20" height="15" viewBox="0 0 24 20" fill="none">
                <path
                  d="M12 2 L20 6 V12 C20 16 12 19 12 19 C12 19 4 16 4 12 V6 L12 2 Z"
                  stroke="#22D3EE"
                  strokeWidth="1.8"
                  fill="#0A111E"
                />
                <circle cx="12" cy="9" r="2" fill="#22D3EE" />
                <path d="M11 10.5 H13 L13.5 14 H10.5 L11 10.5 Z" fill="#22D3EE" />
              </svg>
            </div>
            <div className="lg-plate-wing lg-wing-right" />
          </div>
          <div className="lg-subtext">{tagline}</div>
        </>
      )}
    </Link>
  );
}
