export function StaticCareLatticeFallback({
  activeLayer = 0,
  reducedMotion = false,
}: {
  activeLayer?: number;
  reducedMotion?: boolean;
}) {
  const layerColors = [
    { stroke: "#38bdf8", glow: "rgba(56,189,248,0.28)", ring: "#2dd4bf" },
    { stroke: "#2dd4bf", glow: "rgba(45,212,191,0.28)", ring: "#38bdf8" },
    { stroke: "#818cf8", glow: "rgba(129,140,248,0.26)", ring: "#6366f1" },
    { stroke: "#f2c879", glow: "rgba(242,200,121,0.26)", ring: "#f59e0b" },
  ][activeLayer % 4];

  return (
    <div
      data-testid="care-lattice-fallback"
      className="relative w-full h-full flex items-center justify-center select-none pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full blur-3xl transition-colors duration-700"
        style={{ background: `radial-gradient(circle, ${layerColors.glow} 0%, transparent 72%)` }}
      />
      <svg
        viewBox="0 0 360 360"
        className={`w-72 h-72 sm:w-[400px] sm:h-[400px] drop-shadow-2xl ${reducedMotion ? "" : "animate-[pulse_6s_ease-in-out_infinite]"}`}
      >
        <defs>
          <linearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={layerColors.stroke} stopOpacity="0.34" />
            <stop offset="100%" stopColor="#050a14" stopOpacity="0.72" />
          </linearGradient>
        </defs>
        <circle cx="180" cy="180" r="142" fill="none" stroke={layerColors.ring} strokeWidth="1.2" strokeDasharray="6 6" opacity="0.55" />
        <ellipse cx="180" cy="180" rx="154" ry="62" fill="none" stroke={layerColors.stroke} strokeWidth="1.4" opacity="0.48" transform="rotate(-24 180 180)" />
        <ellipse cx="180" cy="180" rx="154" ry="62" fill="none" stroke="#94a8c7" strokeWidth="1" opacity="0.32" transform="rotate(28 180 180)" />
        <path
          d="M180 54 L268 92 V170 C268 230 226 278 180 302 C134 278 92 230 92 170 V92 Z"
          fill="url(#shieldGrad)"
          stroke={layerColors.stroke}
          strokeWidth="2.2"
        />
        <rect x="164" y="114" width="32" height="96" rx="8" fill={layerColors.stroke} opacity="0.88" />
        <rect x="132" y="146" width="96" height="32" rx="8" fill={layerColors.stroke} opacity="0.88" />
        <path d="M104 228 Q180 182 256 228" fill="none" stroke="#f8fafc" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
        {[
          [60, 128],
          [304, 134],
          [82, 250],
          [282, 246],
          [180, 38],
        ].map(([cx, cy], idx) => (
          <g key={idx}>
            <circle cx={cx} cy={cy} r="6.5" fill={layerColors.stroke} opacity="0.95" />
            <circle cx={cx} cy={cy} r="13" fill="none" stroke={layerColors.ring} strokeWidth="1" opacity="0.38" />
          </g>
        ))}
      </svg>
    </div>
  );
}
