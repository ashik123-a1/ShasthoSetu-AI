import { useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  CalendarCheck,
  FileCheck2,
  FolderHeart,
  HeartPulse,
  Info,
  Pill,
  Search,
  Video,
} from "lucide-react";

type PatientMetricKey = "consultations" | "medications" | "prescriptions" | "labsAndPcos" | "family";
type YearFilter = "2026" | "2025" | "ALL";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] as const;

interface MetricConfig {
  key: PatientMetricKey;
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
    badgeText: "Video & Clinic",
    title: "Your Consultation & Follow-Up Activity",
    subtitle: "Monthly video consultations, doctor follow-ups & scheduled bookings",
    accentColor: "#06B6D4",
    activeClass: "kpi-card-active",
    monthly2026: [1, 2, 1, 2, 3, 2, 2, 3, 2, 4, 3, 3],
    monthly2025: [0, 1, 1, 1, 2, 1, 2, 1, 2, 2, 1, 2],
  },
  {
    key: "medications",
    label: "Med Adherence",
    badgeText: "92% Verified",
    title: "Human-Verified Medication Schedule Consistency",
    subtitle: "Daily confirmed doses across your active clinician-verified prescriptions",
    accentColor: "#EC4899",
    activeClass: "kpi-card-active accent-pink",
    monthly2026: [86, 88, 90, 89, 92, 91, 93, 94, 90, 95, 94, 96],
    monthly2025: [72, 75, 78, 80, 82, 81, 84, 85, 84, 87, 86, 89],
  },
  {
    key: "prescriptions",
    label: "Signed e-Rx",
    badgeText: "Verified Rx",
    title: "Doctor-Signed Digital Prescriptions & Records",
    subtitle: "Authenticated clinical summaries and approved medicine instructions",
    accentColor: "#F59E0B",
    activeClass: "kpi-card-active accent-amber",
    monthly2026: [1, 1, 2, 1, 2, 2, 3, 2, 2, 3, 3, 4],
    monthly2025: [1, 0, 1, 1, 1, 1, 2, 1, 1, 2, 1, 2],
  },
  {
    key: "labsAndPcos",
    label: "Labs & Cycle",
    badgeText: "Wellness Log",
    title: "Diagnostic Panels & Cycle Tracking Logs",
    subtitle: "Home sample tests, endocrine panels, vitals & PCOS cycle diary entries",
    accentColor: "#8B5CF6",
    activeClass: "kpi-card-active accent-violet",
    monthly2026: [2, 2, 3, 3, 4, 3, 4, 5, 4, 5, 6, 5],
    monthly2025: [1, 2, 1, 2, 2, 2, 3, 2, 3, 3, 3, 4],
  },
  {
    key: "family",
    label: "Family EHR",
    badgeText: "Isolated Vault",
    title: "Family Profile Vault Completeness Score",
    subtitle: "Health records organized across Self, Child & Dependent profiles",
    accentColor: "#10B981",
    activeClass: "kpi-card-active accent-emerald",
    monthly2026: [70, 74, 78, 80, 84, 86, 88, 90, 92, 94, 95, 97],
    monthly2025: [45, 48, 52, 55, 58, 60, 62, 65, 68, 70, 72, 74],
  },
];

export interface PatientUrgentItem {
  id: string;
  label: string;
  subtitle: string;
  status: string;
  actionLabel: string;
  onAction: () => void;
}

export function PatientBentoAnalytics({
  appointmentsCount,
  activeMedsCount,
  prescriptionsCount,
  labsAndPcosCount,
  familyCount,
  bloodGroup,
  quickActions,
  onNavigate,
  onQuickSearch,
}: {
  appointmentsCount: number;
  activeMedsCount: number;
  prescriptionsCount: number;
  labsAndPcosCount: number;
  familyCount: number;
  bloodGroup: string;
  quickActions: PatientUrgentItem[];
  onNavigate: (path: string) => void;
  onQuickSearch: (q: string) => void;
}) {
  const [selectedMetric, setSelectedMetric] = useState<PatientMetricKey>("consultations");
  const [year, setYear] = useState<YearFilter>("2026");
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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

  const metricHeadline: Record<PatientMetricKey, { main: string; sub: string }> = {
    consultations: { main: String(appointmentsCount), sub: "Upcoming & completed" },
    medications: { main: String(activeMedsCount), sub: "Verified med plans" },
    prescriptions: { main: String(prescriptionsCount), sub: "Signed digital e-Rx" },
    labsAndPcos: { main: String(labsAndPcosCount), sub: "Labs + cycle logs" },
    family: { main: String(familyCount), sub: "Isolated health profiles" },
  };

  return (
    <div className="space-y-6">
      {/* SECTION A: PATIENT HEALTH INTELLIGENCE HEADER */}
      <header className="bento-card rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                Personal Health &amp; Care Intelligence
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                EHR VAULT ACTIVE
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              ShasthoSetu Personal Care Hub
            </h2>
            <p className="text-xs text-slate-400">
              Track your consultations, human-verified medicines, signed e-prescriptions, lab diagnostics &amp; family health.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (searchTerm.trim()) onQuickSearch(searchTerm.trim());
              }}
              className="relative"
            >
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search doctors or meds..."
                className="w-48 sm:w-56 px-3.5 py-2 pl-9 rounded-xl text-xs bg-slate-900/90 text-slate-200 border border-slate-700/80 focus:border-cyan-500 focus:outline-none placeholder:text-slate-500"
              />
            </form>

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
              onClick={() => onNavigate("/patient/consultations")}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] hover:opacity-95 transition-all shadow-lg flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Video className="w-4 h-4" /> Video Call Room
            </button>
          </div>
        </div>
      </header>

      {/* SECTION B: 5 INTERACTIVE BENTO KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" role="region" aria-label="Patient Health Metrics">
        {METRICS.map((cfg, idx) => {
          const isActive = selectedMetric === cfg.key;
          const headline = metricHeadline[cfg.key];
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
                  <span className="font-semibold text-slate-400 flex items-center gap-1.5">
                    {idx === 0 && <CalendarCheck className="w-3.5 h-3.5 text-cyan-400" />}
                    {idx === 1 && <Pill className="w-3.5 h-3.5 text-pink-400" />}
                    {idx === 2 && <FileCheck2 className="w-3.5 h-3.5 text-amber-400" />}
                    {idx === 3 && <Activity className="w-3.5 h-3.5 text-violet-400" />}
                    {idx === 4 && <FolderHeart className="w-3.5 h-3.5 text-emerald-400" />}
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
                          strokeDashoffset={8}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-bold text-pink-300">
                        92%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500">12-Mo Trend</span>
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

      {/* SECTION C: INTERACTIVE HEALTH TRAJECTORY CHART + ACTION QUEUE & VITALS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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
                  <div className="text-[9px] font-mono text-slate-500 uppercase">Period Stat</div>
                  <div className="text-xs font-mono font-bold" style={{ color: activeCfg.accentColor }}>
                    {displayValue}
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-right">
                  <div className="text-[9px] font-mono text-slate-500 uppercase">Safety Gate</div>
                  <div className="text-xs font-mono font-bold text-emerald-400">ACTIVE</div>
                </div>
              </div>
            </div>

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

            <div className="relative w-full h-60 sm:h-64 bg-[#070f21]/80 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 600 200">
                {[0.25, 0.5, 0.75, 1].map((frac) => (
                  <line
                    key={frac}
                    x1={0}
                    y1={175 - frac * 148}
                    x2={600}
                    y2={175 - frac * 148}
                    stroke="rgba(148, 163, 184, 0.14)"
                    strokeDasharray="4 4"
                  />
                ))}
                {series.map((val, i) => {
                  const barW = 28;
                  const x = 18 + i * 48;
                  const h = Math.max(8, Math.round((val / maxVal) * 145));
                  const y = 175 - h;
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
                        y={192}
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
                      const h = Math.max(8, Math.round((val / maxVal) * 145));
                      const y = 175 - h - 2;
                      return `${x},${y}`;
                    })
                    .join(" ")}
                />
              </svg>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
            <span className="flex items-center gap-1.5 font-mono">
              <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>
                Selected View:{" "}
                <strong className="text-slate-300 font-mono">
                  {activeCfg.label} ({selectedMonthIdx !== null ? MONTHS[selectedMonthIdx] : `${year} Full`})
                </strong>
              </span>
            </span>
            <span className="font-mono text-cyan-400">SCOPED TO OWNED PROFILES ONLY</span>
          </div>
        </div>

        {/* RIGHT: CARE ACTION QUEUE & VITALS SNAPSHOT */}
        <div className="lg:col-span-5 space-y-5 flex flex-col justify-between">
          <div className="bento-card rounded-2xl p-5 shadow-xl border-cyan-500/25">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                <HeartPulse className="w-4 h-4 text-rose-400" />
                <span>Next Care Actions &amp; Reminders</span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("/patient/epharma")}
                className="text-[11px] font-bold text-amber-300 hover:underline cursor-pointer"
              >
                Open ePharma Store →
              </button>
            </div>
            <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
              {quickActions.map((act) => (
                <div
                  key={act.id}
                  className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{act.label}</div>
                    <div className="text-[11px] text-slate-400 truncate">{act.subtitle}</div>
                  </div>
                  <button
                    type="button"
                    onClick={act.onAction}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-200 text-[11px] font-bold shrink-0 cursor-pointer"
                  >
                    {act.actionLabel}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bento-card rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-300">
                Vitals &amp; AI Self-Check Summary
              </span>
              <button
                type="button"
                onClick={() => onNavigate("/patient/pcos")}
                className="text-[11px] font-semibold text-cyan-400 hover:underline cursor-pointer"
              >
                Open Trackers →
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400">BLOOD GROUP</div>
                <div className="text-lg font-extrabold font-mono text-rose-400 mt-0.5">{bloodGroup || "O+"}</div>
                <div className="text-[10px] text-slate-500">Donor Match Ready</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400">LAST BP LOG</div>
                <div className="text-lg font-extrabold font-mono text-cyan-300 mt-0.5">118/78</div>
                <div className="text-[10px] text-slate-500">mmHg (Demo baseline)</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400">OCR SAFETY GATE</div>
                <div className="text-lg font-extrabold font-mono text-amber-300 mt-0.5">422 ENFORCED</div>
                <div className="text-[10px] text-slate-500">Human verification first</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400">AI HEALTH CHAT</div>
                <div className="text-lg font-extrabold font-mono text-emerald-400 mt-0.5">BN + EN LIVE</div>
                <div className="text-[10px] text-slate-500">Direct Voice Enabled</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
