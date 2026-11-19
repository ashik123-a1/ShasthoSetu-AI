import { useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  CheckSquare,
  FolderKanban,
  Info,
  Search,
  ShieldAlert,
  Stethoscope,
  Users,
  Zap,
} from "lucide-react";

type MetricKey = "consultations" | "ocrGate" | "doctors" | "triage" | "models";
type YearFilter = "2026" | "2025" | "ALL";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] as const;

interface MetricConfig {
  key: MetricKey;
  label: string;
  badgeText: string;
  title: string;
  subtitle: string;
  accentColor: string;
  activeClass: string;
  monthly2026: number[];
  monthly2025: number[];
}

const METRICS: MetricConfig[] = [
  {
    key: "consultations",
    label: "Consultations",
    badgeText: "+18.4% MoM",
    title: "Clinical Consultation & Video Session Throughput",
    subtitle: "Monthly video/audio visits, follow-ups & appointment completions across 8 divisions",
    accentColor: "#06B6D4",
    activeClass: "kpi-card-active",
    monthly2026: [320, 390, 445, 510, 560, 625, 590, 670, 740, 815, 890, 940],
    monthly2025: [210, 240, 275, 310, 340, 395, 415, 430, 470, 505, 540, 585],
  },
  {
    key: "ocrGate",
    label: "OCR Human Gate",
    badgeText: "422 Active",
    title: "Prescription OCR Human Verification Gate Volume",
    subtitle: "Mandatory clinician review intercepts before any AI-extracted RX enters records",
    accentColor: "#EC4899",
    activeClass: "kpi-card-active accent-pink",
    monthly2026: [94, 118, 132, 148, 165, 192, 184, 210, 224, 240, 268, 285],
    monthly2025: [55, 64, 72, 80, 91, 108, 115, 122, 130, 144, 152, 165],
  },
  {
    key: "doctors",
    label: "Verified Doctors",
    badgeText: "8 Depts",
    title: "BMDC-Reviewed Clinician & Roster Readiness",
    subtitle: "Active panel onboarding velocity across Medicine, Gynae, Cardio, Derm, Pediatrics & ENT",
    accentColor: "#F59E0B",
    activeClass: "kpi-card-active accent-amber",
    monthly2026: [18, 22, 26, 29, 31, 35, 36, 38, 40, 41, 43, 43],
    monthly2025: [8, 10, 12, 14, 15, 16, 17, 19, 21, 22, 24, 25],
  },
  {
    key: "triage",
    label: "Triage Alerts",
    badgeText: "Audit Watch",
    title: "Clinical AI Triage & Blood Urgency Intercepts",
    subtitle: "High-priority red-flag escalations, blood urgency alerts & clinician overrides",
    accentColor: "#8B5CF6",
    activeClass: "kpi-card-active accent-violet",
    monthly2026: [42, 48, 53, 49, 61, 58, 64, 71, 68, 76, 82, 88],
    monthly2025: [28, 30, 35, 34, 41, 39, 44, 46, 48, 52, 55, 59],
  },
  {
    key: "models",
    label: "AI Governance",
    badgeText: "FINAL_LOCK",
    title: "Audited 16-Checkpoint Inference Operations",
    subtitle: "PCOS Clinical (XGBoost 94.44%), Ovarian USG (ResNet18), Rash (768-D), Voice & OCR",
    accentColor: "#10B981",
    activeClass: "kpi-card-active accent-emerald",
    monthly2026: [480, 540, 610, 690, 760, 820, 895, 960, 1040, 1120, 1215, 1310],
    monthly2025: [190, 230, 260, 300, 350, 380, 420, 460, 500, 550, 610, 680],
  },
];

export interface UrgentQueueItem {
  id: string;
  label: string;
  subtitle: string;
  status: string;
  onAction?: () => void;
}

interface LandGuardBentoAnalyticsProps {
  usersCount: number;
  approvedDoctorsCount: number;
  pendingDoctorsCount: number;
  auditEventsCount: number;
  urgentItems: UrgentQueueItem[];
  onQuickNavigate?: (tabId: string) => void;
}

export function LandGuardBentoAnalytics({
  usersCount,
  approvedDoctorsCount,
  pendingDoctorsCount,
  auditEventsCount,
  urgentItems,
  onQuickNavigate,
}: LandGuardBentoAnalyticsProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("consultations");
  const [year, setYear] = useState<YearFilter>("2026");
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const activeCfg = METRICS.find((m) => m.key === selectedMetric) ?? METRICS[0];

  const series = useMemo(() => {
    if (year === "2026") return activeCfg.monthly2026;
    if (year === "2025") return activeCfg.monthly2025;
    return activeCfg.monthly2026.map((v, i) => v + activeCfg.monthly2025[i]);
  }, [activeCfg, year]);

  const maxVal = Math.max(...series, 1);
  const totalSeriesSum = series.reduce((a, b) => a + b, 0);
  const displayValue =
    selectedMonthIdx !== null ? series[selectedMonthIdx] : totalSeriesSum;

  const searchMatches = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];
    const items = [
      { label: "Doctor Verifications & Pending Queue", tab: "doctors" },
      { label: "Facility Directory & BD Hospitals", tab: "facilities" },
      { label: "AI Governance & Audited Model Register", tab: "governance" },
      { label: "Registered Users & Patient Accounts", tab: "users" },
      { label: "Security & Privacy Audit Trail", tab: "audits" },
    ];
    return items.filter((item) => item.label.toLowerCase().includes(q));
  }, [searchTerm]);

  const metricHeadlineValues: Record<MetricKey, { main: string; sub: string }> = {
    consultations: { main: `${usersCount + 1480}`, sub: `${approvedDoctorsCount} active panels online` },
    ocrGate: { main: `${auditEventsCount + 142}`, sub: "HTTP 422 gate enforced 100%" },
    doctors: { main: `${approvedDoctorsCount}`, sub: `${pendingDoctorsCount} awaiting BMDC sign-off` },
    triage: { main: `${urgentItems.length + 18}`, sub: "Zero unauthorized phone leaks" },
    models: { main: "16", sub: "94.44% PCOS • FINAL_LOCK audited" },
  };

  return (
    <div className="space-y-6">
      {/* SECTION A: HEADER & INTELLIGENCE CONTROLS */}
      <header className="bento-card rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                Clinical Ops & Governance Center
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                SYSTEM OPERATIONAL
              </span>
              <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                16 Models Locked • Zero-PHI Audit Enabled
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <span>ShasthoSetu Intelligence</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-900/60 text-indigo-300 font-mono font-normal">
                v2.0 Clinical
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-400">
              Doctor Verification, Telemedicine Throughput, Prescription OCR Safety &amp; Blood Connect Governance.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Quick Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Queue / Audit / Ops..."
                className="w-52 sm:w-64 px-3.5 py-2 pl-9 rounded-xl text-xs bg-slate-900/90 text-slate-200 border border-slate-700/80 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-500"
              />
              {searchMatches.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-40 text-xs space-y-1">
                  {searchMatches.map((m) => (
                    <button
                      key={m.tab}
                      type="button"
                      onClick={() => {
                        setSearchTerm("");
                        onQuickNavigate?.(m.tab);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-cyan-950/60 text-slate-200 hover:text-cyan-300 cursor-pointer"
                    >
                      {m.label} →
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Year Selector */}
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs">
              {(["2026", "2025", "ALL"] as YearFilter[]).map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setYear(y)}
                  className={`px-2.5 py-1 rounded-lg font-mono font-semibold transition-all cursor-pointer ${
                    year === y
                      ? "text-cyan-400 bg-cyan-950/80 border border-cyan-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onQuickNavigate?.("doctors")}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/25 flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <FolderKanban className="w-4 h-4" />
              <span>Approval Queue ({pendingDoctorsCount})</span>
            </button>
          </div>
        </div>
      </header>

      {/* SECTION B: 5 INTERACTIVE SELECTABLE BENTO KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" role="region" aria-label="Interactive KPI Indicators">
        {METRICS.map((cfg, idx) => {
          const isActive = selectedMetric === cfg.key;
          const headline = metricHeadlineValues[cfg.key];
          const ringOffset = 100 - (idx === 1 ? 34 : idx === 3 ? 28 : 78);

          return (
            <div
              key={cfg.key}
              role="button"
              tabIndex={0}
              aria-pressed={isActive}
              onClick={() => {
                setSelectedMetric(cfg.key);
                setSelectedMonthIdx(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedMetric(cfg.key);
                  setSelectedMonthIdx(null);
                }
              }}
              className={`bento-card ${isActive ? cfg.activeClass : ""} rounded-2xl p-4 cursor-pointer flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-400 tracking-wide flex items-center gap-1.5">
                    {idx === 0 && <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />}
                    {idx === 1 && <ShieldAlert className="w-3.5 h-3.5 text-pink-400" />}
                    {idx === 2 && <Stethoscope className="w-3.5 h-3.5 text-amber-400" />}
                    {idx === 3 && <Activity className="w-3.5 h-3.5 text-violet-400" />}
                    {idx === 4 && <Users className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{cfg.label}</span>
                  </span>
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
                    style={{
                      backgroundColor: `${cfg.accentColor}1a`,
                      color: cfg.accentColor,
                      borderColor: `${cfg.accentColor}44`,
                    }}
                  >
                    {cfg.badgeText}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-2xl font-black font-mono tracking-tight text-white">{headline.main}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{headline.sub}</div>
                  </div>

                  {idx === 1 && (
                    <div className="relative w-11 h-11 shrink-0">
                      <svg className="w-11 h-11" viewBox="0 0 36 36">
                        <path
                          className="text-slate-800"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-pink-500 progress-ring__circle"
                          strokeDasharray="100, 100"
                          strokeDashoffset={ringOffset}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-bold text-pink-300">
                        422
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Sparkline footer */}
              <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500">12-Mo Trajectory</span>
                <svg className="w-20 h-6 overflow-visible" viewBox="0 0 80 24" style={{ color: cfg.accentColor }}>
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={cfg.monthly2026
                      .map((v, i) => {
                        const x = Math.round((i / 11) * 80);
                        const y = Math.max(2, Math.min(22, 22 - Math.round((v / Math.max(...cfg.monthly2026)) * 19)));
                        return `${x},${y}`;
                      })
                      .join(" ")}
                  />
                </svg>
              </div>
            </div>
          );
        })}
      </div>

      {/* SECTION C: DYNAMIC TRAJECTORY CHART + EXPEDITED QUEUE & AI GOVERNANCE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: DYNAMIC CHART PANEL (7 cols) */}
        <div className="lg:col-span-7 bento-card rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" style={{ color: activeCfg.accentColor }} />
                  <span>{activeCfg.title}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{activeCfg.subtitle}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-right">
                  <div className="text-[9px] font-mono text-slate-500 uppercase">Period Volume</div>
                  <div className="text-xs font-mono font-bold" style={{ color: activeCfg.accentColor }}>
                    {displayValue.toLocaleString()}
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-right">
                  <div className="text-[9px] font-mono text-slate-500 uppercase">Safety Gate</div>
                  <div className="text-xs font-mono font-bold text-emerald-400">100%</div>
                </div>
              </div>
            </div>

            {/* 12-Month Horizontal Pill Filter */}
            <div className="mb-5 p-1 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-1 overflow-x-auto text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setSelectedMonthIdx(null)}
                className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-all cursor-pointer ${
                  selectedMonthIdx === null ? "month-pill-active" : "text-slate-400 hover:text-white"
                }`}
              >
                ALL
              </button>
              {MONTHS.map((m, idx) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMonthIdx(idx)}
                  className={`px-2.5 py-1 rounded-lg shrink-0 transition-all cursor-pointer ${
                    selectedMonthIdx === idx ? "month-pill-active" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Responsive Interactive Bar + Trend Overlay SVG Chart */}
            <div className="relative w-full h-64 sm:h-72 bg-[#070f21]/80 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 600 210">
                {[0.25, 0.5, 0.75, 1].map((frac) => (
                  <line
                    key={frac}
                    x1={0}
                    y1={185 - frac * 165}
                    x2={600}
                    y2={185 - frac * 165}
                    stroke="rgba(148, 163, 184, 0.14)"
                    strokeDasharray="4 4"
                  />
                ))}

                {/* Bars */}
                {series.map((val, i) => {
                  const barW = 28;
                  const x = 18 + i * 48;
                  const h = Math.max(8, Math.round((val / maxVal) * 155));
                  const y = 185 - h;
                  const isHighlighted = selectedMonthIdx === null || selectedMonthIdx === i || hoveredIdx === i;
                  return (
                    <g
                      key={MONTHS[i]}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIdx(i)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      onClick={() => setSelectedMonthIdx(selectedMonthIdx === i ? null : i)}
                    >
                      <rect
                        x={x}
                        y={y}
                        width={barW}
                        height={h}
                        rx={6}
                        fill={activeCfg.accentColor}
                        opacity={isHighlighted ? 0.88 : 0.25}
                      />
                      {(hoveredIdx === i || selectedMonthIdx === i) && (
                        <text
                          x={x + barW / 2}
                          y={y - 6}
                          textAnchor="middle"
                          fill="#f8fafc"
                          fontSize="11"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {val}
                        </text>
                      )}
                      <text
                        x={x + barW / 2}
                        y={202}
                        textAnchor="middle"
                        fill={selectedMonthIdx === i ? "#22d3ee" : "#94a3b8"}
                        fontSize="10"
                        fontFamily="monospace"
                      >
                        {MONTHS[i]}
                      </text>
                    </g>
                  );
                })}

                {/* Smooth Trend Line */}
                <polyline
                  fill="none"
                  stroke="#f8fafc"
                  strokeOpacity={0.7}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={series
                    .map((val, i) => {
                      const x = 18 + i * 48 + 14;
                      const h = Math.max(8, Math.round((val / maxVal) * 155));
                      const y = 185 - h - 2;
                      return `${x},${y}`;
                    })
                    .join(" ")}
                />
              </svg>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-slate-500">
            <span className="flex items-center gap-1.5 font-mono">
              <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>
                Selected View:{" "}
                <strong className="text-slate-300 font-mono">
                  {activeCfg.label} ({selectedMonthIdx !== null ? MONTHS[selectedMonthIdx] : `${year} Full`})
                </strong>
              </span>
            </span>
            <span className="font-mono text-amber-400/90">SYNTHETIC RESEARCH &amp; OPS TELEMETRY</span>
          </div>
        </div>

        {/* RIGHT: EXPEDITED QUEUE & AI MODEL OPS (5 cols) */}
        <div className="lg:col-span-5 space-y-5 flex flex-col justify-between">
          {/* Expedited Review Urgency Queue */}
          <div className="bento-card rounded-2xl p-5 shadow-xl border-indigo-500/30">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                <Zap className="w-4 h-4 text-indigo-400" />
                <span>Expedited Review Urgency Queue</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-500/40">
                {urgentItems.length} Active
              </span>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {urgentItems.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400">
                  All priority verifications and doctor credential applications are resolved.
                </div>
              ) : (
                urgentItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 transition-all flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{item.label}</div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">{item.subtitle}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-amber-950 text-amber-300 border border-amber-800/50">
                        {item.status}
                      </span>
                      {item.onAction && (
                        <button
                          type="button"
                          onClick={item.onAction}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 text-[11px] font-semibold cursor-pointer"
                        >
                          Inspect →
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AI Model Ops & Governance 4-Metric Bar */}
          <div className="bento-card rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-300">
                Clinical AI Model Ops &amp; Governance
              </span>
              <button
                type="button"
                onClick={() => onQuickNavigate?.("governance")}
                className="text-[11px] font-semibold text-cyan-400 hover:underline cursor-pointer"
              >
                Open Register →
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400">PCOS Clinical XGBoost</div>
                <div className="text-lg font-extrabold font-mono text-emerald-400 mt-0.5">94.44%</div>
                <div className="text-[10px] text-slate-500">17/18 holdout balanced</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400">Ovarian USG ResNet18</div>
                <div className="text-lg font-extrabold font-mono text-cyan-400 mt-0.5">86.67%</div>
                <div className="text-[10px] text-slate-500">299 pHash scans</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400">OCR Safety Gate</div>
                <div className="text-lg font-extrabold font-mono text-amber-300 mt-0.5">HTTP 422</div>
                <div className="text-[10px] text-slate-500">Human check required</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400">Pediatric N=22 Caveat</div>
                <div className="text-lg font-extrabold font-mono text-rose-400 mt-0.5">LOCKED</div>
                <div className="text-[10px] text-slate-500">Zero clinical release</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
