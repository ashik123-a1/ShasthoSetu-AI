import { useEffect, useId, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { AlertTriangle, CheckCircle2, Info, ShieldCheck, Sliders, Sparkles } from "lucide-react";
import { subscribeTelemetryTick } from "./AgriStyleTelemetry";

/**
 * Collection of 5 visually distinct AgriSense-inspired clinical data & animation components
 * so each of the 5 AI module pages displays its own signature telemetry language (never repeated).
 */

/* ============================================================================
   1. PCOS CLINICAL & ULTRASOUND — SemiCircleRiskDial (HydrologyRiskGaugeCard port)
   ============================================================================ */
export interface RiskDialPreset {
  id: string;
  label: string;
  pct: number;
  displayValue: string;
  targetPct: number;
  zoneLabel: string;
  tone: "cyan" | "teal" | "gold";
  note: string;
}

export function SemiCircleRiskDial({
  presets,
  pauseMotion = false,
}: {
  presets: RiskDialPreset[];
  pauseMotion?: boolean;
}) {
  const [selectedId, setSelectedId] = useState(presets[0]?.id ?? "");
  const active = presets.find((p) => p.id === selectedId) ?? presets[0];

  const pct = Math.min(100, Math.max(0, active?.pct ?? 88.57));
  const angle = Math.PI * (1 - pct / 100);
  const kx = 155 + 130 * Math.cos(angle);
  const ky = 155 - 130 * Math.sin(angle);
  const delta = (pct - (active?.targetPct ?? 85)).toFixed(2);
  const deltaPositive = Number(delta) >= 0;

  return (
    <div className="ss-sapphire-card rounded-3xl p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 text-sm font-bold text-white">
          <Sliders className="w-4 h-4 text-[#38bdf8]" />
          <span>PCOS Benchmark &amp; Morphology Risk Arc</span>
        </div>
        <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-400/15 border border-sky-400/35 text-sky-300">
          AUDITED FINAL_LOCK
        </span>
      </div>

      {/* Preset Mode Switcher */}
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => {
          const isSel = p.id === active?.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedId(p.id)}
              className={`min-h-9 px-3 rounded-full text-xs font-semibold border cursor-pointer transition ${
                isSel
                  ? "bg-gradient-to-r from-[#38bdf8] to-[#2dd4bf] text-slate-950 border-transparent font-bold"
                  : "bg-black/30 border-white/15 text-slate-300 hover:border-sky-400/45"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Semi-Circular Multi-Zone Arc Gauge SVG */}
      <div className="relative flex flex-col items-center pt-2">
        <div
          className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-[#040a18] border border-white/15 mb-1"
          style={{ color: deltaPositive ? "#2dd4bf" : "#f2c879" }}
        >
          {deltaPositive ? `+${delta}% above ref` : `${delta}% vs ref`}
        </div>

        <svg className="w-full max-w-[300px] h-auto" viewBox="0 0 310 172" role="img" aria-label={active?.label}>
          <path
            d="M 42 155 A 113 113 0 0 1 268 155"
            fill="none"
            stroke="rgba(255,255,255,0.16)"
            strokeWidth="2"
            strokeDasharray="3 5"
          />
          <path d="M 25 155 A 130 130 0 0 1 135 28" fill="none" stroke="#818cf8" strokeWidth="11" strokeLinecap="round" />
          <path d="M 146 26 A 130 130 0 0 1 226 49" fill="none" stroke="#38bdf8" strokeWidth="11" strokeLinecap="round" />
          <path d="M 235 55 A 130 130 0 0 1 285 155" fill="none" stroke="#2dd4bf" strokeWidth="11" strokeLinecap="round" />

          {/* Glowing Indicator Needle Line & Knob */}
          <line x1="155" y1="155" x2={kx.toFixed(1)} y2={ky.toFixed(1)} stroke="rgba(255,255,255,0.28)" strokeWidth="2" />
          {!pauseMotion && (
            <circle cx={kx.toFixed(1)} cy={ky.toFixed(1)} r="13" fill="rgba(56,189,248,0.25)" />
          )}
          <circle cx={kx.toFixed(1)} cy={ky.toFixed(1)} r="7" fill="#FFFFFF" stroke="#38bdf8" strokeWidth="3" />

          <text x="155" y="122" textAnchor="middle" fill="#FFFFFF" fontSize="28" fontWeight="800" className="font-mono">
            {active?.displayValue}
          </text>
          <text x="155" y="144" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="700" className="font-mono">
            {active?.zoneLabel}
          </text>
        </svg>
      </div>

      <div className="rounded-xl bg-[#040a18]/80 border border-white/10 p-3 flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
        <Info className="w-4 h-4 text-[#2dd4bf] shrink-0 mt-0.5" />
        <span>{active?.note}</span>
      </div>
    </div>
  );
}

/* ============================================================================
   1B. PCOS SPARKLINE KPI STRIP (AnimatedMetricCard SVG Sparkline + Crosshair)
   ============================================================================ */
export interface SparklineMetricItem {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  accent: string;
  points: Array<{ label: string; val: number }>;
}

export function SparklineKpiStrip({
  items,
  pauseMotion = false,
}: {
  items: SparklineMetricItem[];
  pauseMotion?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {items.map((item) => (
        <SingleSparklineCard key={item.id} item={item} pauseMotion={pauseMotion} />
      ))}
    </div>
  );
}

function SingleSparklineCard({ item, pauseMotion }: { item: SparklineMetricItem; pauseMotion: boolean }) {
  const pathRef = useRef<SVGPathElement>(null);
  const gradId = useId().replace(/:/g, "");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const W = 230;
  const H = 56;
  const padX = 6;
  const padY = 6;

  const { coords, lineD, areaD } = useMemo(() => {
    const vals = item.points.map((p) => p.val);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    const pts = item.points.map((p, i) => {
      const x = padX + (i / Math.max(1, item.points.length - 1)) * (W - padX * 2);
      const y = padY + (H - padY * 2) - ((p.val - min) / span) * (H - padY * 2);
      return { ...p, x, y };
    });
    const ld = pts.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
    const base = (H - padY).toFixed(1);
    const ad = pts.length ? `${ld} L ${pts[pts.length - 1].x.toFixed(1)} ${base} L ${pts[0].x.toFixed(1)} ${base} Z` : "";
    return { coords: pts, lineD: ld, areaD: ad };
  }, [item.points]);

  useEffect(() => {
    const el = pathRef.current;
    if (!el || pauseMotion) return;
    const len = el.getTotalLength?.() || 240;
    const ctx = gsap.context(() => {
      gsap.set(el, { strokeDasharray: len, strokeDashoffset: len });
      gsap.to(el, { strokeDashoffset: 0, duration: 0.95, ease: "power2.out" });
    });
    return () => ctx.revert();
  }, [lineD, pauseMotion]);

  const hovered = hoverIdx !== null ? coords[hoverIdx] : null;

  return (
    <div className="ss-sapphire-card rounded-2xl p-4 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: item.accent }}>
            {item.title}
          </div>
          <div className="font-mono text-2xl font-extrabold text-white mt-0.5 tabular-nums">
            {hovered ? `${hovered.val.toFixed(1)}%` : item.value}
          </div>
          <div className="text-[11px] text-slate-300/80">
            {hovered ? `${hovered.label} • Interactive Trace` : item.subtitle}
          </div>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-14 overflow-visible cursor-crosshair"
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const mx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * W;
          let best = 0;
          let bestD = Infinity;
          coords.forEach((c, idx) => {
            const d = Math.abs(c.x - mx);
            if (d < bestD) {
              bestD = d;
              best = idx;
            }
          });
          setHoverIdx(best);
        }}
        onPointerLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id={`sg-${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={item.accent} stopOpacity="0.34" />
            <stop offset="100%" stopColor={item.accent} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {areaD && <path d={areaD} fill={`url(#sg-${gradId})`} />}
        {lineD && (
          <path
            ref={pathRef}
            d={lineD}
            fill="none"
            stroke={item.accent}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {hovered && (
          <>
            <line x1={hovered.x} y1={4} x2={hovered.x} y2={H - 4} stroke="rgba(255,255,255,0.25)" strokeDasharray="2 2" />
            <circle cx={hovered.x} cy={hovered.y} r="4.2" fill="#FFFFFF" stroke={item.accent} strokeWidth="2.2" />
          </>
        )}
      </svg>
    </div>
  );
}

/* ============================================================================
   2. VIRAL RASH AI — HexRadarTaxonomyChart (6-Axis MCVSLD Spider Radar)
   ============================================================================ */
export function HexRadarTaxonomyChart({
  pauseMotion = false,
}: {
  pauseMotion?: boolean;
}) {
  const [activeAxis, setActiveAxis] = useState(0);
  const axes = [
    { label: "Chickenpox", code: "Varicella", score: 0.89, families: "152 families", color: "#38bdf8" },
    { label: "Measles", code: "Rubeola", score: 0.85, families: "118 families", color: "#2dd4bf" },
    { label: "HFMD", code: "Coxsackie", score: 0.86, families: "134 families", color: "#818cf8" },
    { label: "Cowpox", code: "Orthopox", score: 0.82, families: "96 families", color: "#f2c879" },
    { label: "Monkeypox", code: "Mpox Ref", score: 0.84, families: "129 families", color: "#fb7185" },
    { label: "Healthy", code: "Control", score: 0.91, families: "126 families", color: "#34d399" },
  ];

  const cx = 150;
  const cy = 140;
  const maxR = 96;

  const pointAt = (idx: number, ratio: number): [number, number] => {
    const rad = (idx * Math.PI * 2) / 6 - Math.PI / 2;
    return [cx + maxR * ratio * Math.cos(rad), cy + maxR * ratio * Math.sin(rad)];
  };

  const dataPolygon = axes
    .map((a, i) => pointAt(i, a.score))
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  const focused = axes[activeAxis] ?? axes[0];

  return (
    <div className="ss-sapphire-card rounded-3xl p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#818cf8]">
            6-CLASS MCVSLD MORPHOLOGY RADAR • 755 SOURCE FAMILIES
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white">Grouped Leak-Free Validation Coverage</h3>
        </div>
        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-400/15 border border-indigo-400/35 text-indigo-200">
          84.65% Val • 0% Leak
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        <div className="md:col-span-6 flex justify-center">
          <svg viewBox="0 0 300 280" className="w-full max-w-[280px] h-auto" role="img" aria-label="6-Class Viral Rash Hexagonal Radar">
            {[0.25, 0.5, 0.75, 1].map((ring) => {
              const pts = axes
                .map((_, i) => pointAt(i, ring))
                .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
                .join(" ");
              return (
                <polygon
                  key={ring}
                  points={pts}
                  fill="none"
                  stroke="rgba(56, 189, 248, 0.22)"
                  strokeDasharray={ring === 1 ? undefined : "3 3"}
                  strokeWidth="1"
                />
              );
            })}

            {axes.map((_, i) => {
              const [x, y] = pointAt(i, 1);
              return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.14)" strokeWidth="1" />;
            })}

            <polygon
              points={dataPolygon}
              fill="rgba(129, 140, 248, 0.24)"
              stroke="#818cf8"
              strokeWidth="2.4"
            />

            {axes.map((a, i) => {
              const [px, py] = pointAt(i, a.score);
              const [lx, ly] = pointAt(i, 1.18);
              const isSel = i === activeAxis;
              return (
                <g
                  key={a.label}
                  className="cursor-pointer"
                  onMouseEnter={() => setActiveAxis(i)}
                  onClick={() => setActiveAxis(i)}
                >
                  {isSel && !pauseMotion && <circle cx={px} cy={py} r="10" fill={`${a.color}44`} />}
                  <circle cx={px} cy={py} r={isSel ? 5.5 : 4} fill={a.color} stroke="#FFFFFF" strokeWidth="1.5" />
                  <text
                    x={lx}
                    y={ly + 3}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight={isSel ? "800" : "600"}
                    fill={isSel ? "#FFFFFF" : "#9eb3d1"}
                    className="font-mono"
                  >
                    {a.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="md:col-span-6 space-y-2.5">
          <div className="rounded-2xl bg-[#040a18]/85 border border-indigo-400/35 p-3.5 space-y-1">
            <div className="font-mono text-[10px] font-bold uppercase" style={{ color: focused.color }}>
              {focused.label} ({focused.code})
            </div>
            <div className="font-mono text-xl font-extrabold text-white">
              Balanced Signal • 84.22% Overall Macro F1
            </div>
            <p className="text-xs text-slate-300">
              Source-photo family grouping isolates all augmentation &amp; multi-angle crops into the same Train (528), Val (113), or Test (114) partition.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
            <div className="rounded-xl bg-black/35 border border-white/10 p-2.5">
              <div className="text-base font-bold text-[#818cf8]">528</div>
              <div className="text-[10px] text-slate-400">Train Fam</div>
            </div>
            <div className="rounded-xl bg-black/35 border border-white/10 p-2.5">
              <div className="text-base font-bold text-[#38bdf8]">113</div>
              <div className="text-[10px] text-slate-400">Val Fam</div>
            </div>
            <div className="rounded-xl bg-black/35 border border-white/10 p-2.5">
              <div className="text-base font-bold text-[#2dd4bf]">114</div>
              <div className="text-[10px] text-slate-400">Test Fam</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   3. PRESCRIPTION OCR — AnimatedClinicalPipeline (AgriSense AnimatedDataPipeline port)
   ============================================================================ */
const OCR_NODES = [
  { id: "rx_ingest", x: 20, y: 40, w: 170, h: 66, title: "1. Rx Upload", sub: "1,000 Audited (8 Quar.)", color: "#f2c879", badge: "992 ADMIT" },
  { id: "bbox_laser", x: 20, y: 145, w: 170, h: 66, title: "0052.jpg Proof", sub: "Bilingual Smoke (44 tok)", color: "#38bdf8", badge: "SMOKE" },
  { id: "easyocr", x: 248, y: 92, w: 184, h: 72, title: "2. EasyOCR bn+en", sub: "PyPDF / Craft / Recog", color: "#2dd4bf", badge: "LOCAL GPU" },
  { id: "conf_audit", x: 488, y: 40, w: 178, h: 66, title: "3. Dose Parser", sub: "CER/WER NOT_VALIDATED", color: "#fb7185", badge: "FLAGGED" },
  { id: "http422", x: 488, y: 145, w: 178, h: 70, title: "4. HTTP 422 Lock", sub: "verified_by_user_id != NULL", color: "#f2c879", badge: "SAFETY" },
  { id: "schedule", x: 718, y: 92, w: 162, h: 72, title: "5. Med Routine", sub: "Verified Only • Asia/Dhaka", color: "#34d399", badge: "SQLITE" },
];

const OCR_EDGES = [
  { id: "o1", d: "M 190 73 C 220 73, 220 116, 248 116", color: "#f2c879", speed: 0.45 },
  { id: "o2", d: "M 190 178 C 220 178, 220 140, 248 140", color: "#38bdf8", speed: 0.52 },
  { id: "o3", d: "M 432 114 C 460 114, 460 73, 488 73", color: "#fb7185", speed: 0.46 },
  { id: "o4", d: "M 432 142 C 460 142, 460 180, 488 180", color: "#f2c879", speed: 0.55 },
  { id: "o5", d: "M 666 73 C 692 73, 692 114, 718 114", color: "#2dd4bf", speed: 0.42 },
  { id: "o6", d: "M 666 180 C 692 180, 692 142, 718 142", color: "#34d399", speed: 0.58 },
];

export function AnimatedClinicalPipeline({ pauseMotion = false }: { pauseMotion?: boolean }) {
  const [selectedNodeId, setSelectedNodeId] = useState("http422");
  const pathRefs = useRef<Record<string, SVGPathElement | null>>({});
  const dotRefs = useRef<Record<string, SVGCircleElement | null>>({});

  useEffect(() => {
    const placeStatic = (sec: number) => {
      OCR_EDGES.forEach((edge, idx) => {
        const pathEl = pathRefs.current[edge.id];
        const dotEl = dotRefs.current[edge.id];
        if (!pathEl || !dotEl || typeof pathEl.getTotalLength !== "function") return;
        const len = pathEl.getTotalLength();
        if (!len) return;
        const t = (sec * edge.speed + idx * 0.19) % 1;
        const pt = pathEl.getPointAtLength(t * len);
        dotEl.setAttribute("cx", pt.x.toFixed(1));
        dotEl.setAttribute("cy", pt.y.toFixed(1));
      });
    };

    placeStatic(0.45);
    if (pauseMotion) return undefined;

    const start = performance.now();
    return subscribeTelemetryTick((nowMs) => {
      placeStatic((nowMs - start) / 1000);
    });
  }, [pauseMotion]);

  const activeNode = OCR_NODES.find((n) => n.id === selectedNodeId) ?? OCR_NODES[4];

  return (
    <div className="ss-sapphire-card rounded-3xl p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#f2c879]">
            ANIMATED SAFE-OCR ARCHITECTURE PIPELINE • LIVE DATA FLOW
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white">
            EasyOCR Extraction &amp; Mandatory HTTP 422 Human Verification Gate
          </h3>
        </div>
        <span className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-full bg-teal-400/15 border border-teal-400/35 text-teal-200">
          697 Train • 150 Val • 152 Test
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-[#040a18]/90 border border-white/10 p-3">
        <svg viewBox="0 0 900 250" className="w-full min-w-[660px] h-auto" role="img" aria-label="Safe Prescription OCR Data Pipeline">
          {OCR_EDGES.map((edge) => (
            <g key={edge.id}>
              <path
                ref={(el) => {
                  pathRefs.current[edge.id] = el;
                }}
                d={edge.d}
                fill="none"
                stroke={`${edge.color}55`}
                strokeWidth="2.5"
                strokeDasharray="6 5"
              />
              <circle
                ref={(el) => {
                  dotRefs.current[edge.id] = el;
                }}
                cx="0"
                cy="0"
                r="4.5"
                fill={edge.color}
              />
            </g>
          ))}

          {OCR_NODES.map((node) => {
            const isSel = node.id === activeNode.id;
            return (
              <g
                key={node.id}
                className="cursor-pointer"
                onClick={() => setSelectedNodeId(node.id)}
                onMouseEnter={() => setSelectedNodeId(node.id)}
              >
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.w}
                  height={node.h}
                  rx="14"
                  fill={isSel ? "#0c1e3e" : "#071226"}
                  stroke={isSel ? node.color : `${node.color}66`}
                  strokeWidth={isSel ? "2.2" : "1.2"}
                />
                <text x={node.x + 12} y={node.y + 24} fill="#FFFFFF" fontSize="13" fontWeight="800">
                  {node.title}
                </text>
                <text x={node.x + 12} y={node.y + 44} fill="#9eb3d1" fontSize="10.5" className="font-mono">
                  {node.sub}
                </text>
                <rect
                  x={node.x + node.w - 64}
                  y={node.y + 8}
                  width="54"
                  height="16"
                  rx="8"
                  fill={`${node.color}28`}
                />
                <text
                  x={node.x + node.w - 37}
                  y={node.y + 19}
                  textAnchor="middle"
                  fill={node.color}
                  fontSize="8.5"
                  fontWeight="800"
                  className="font-mono"
                >
                  {node.badge}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="rounded-xl bg-[#040a18]/80 border border-amber-400/25 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-white">
          Selected Stage: <span style={{ color: activeNode.color }}>{activeNode.title}</span> — {activeNode.sub}
        </span>
        <span className="font-mono text-[11px] text-amber-300">992 Admissible • 8 Quarantined • 1 Unannotated (0747)</span>
      </div>
    </div>
  );
}

/* ============================================================================
   4. BANGLA VOICE AI PHASE G — UncertaintyTrendCurveChart (UncertaintyBandChart port)
   ============================================================================ */
export function UncertaintyTrendCurveChart({
  pauseMotion = false,
}: {
  pauseMotion?: boolean;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(1);
  const whisperLineRef = useRef<SVGPathElement>(null);
  const baseLineRef = useRef<SVGPathElement>(null);

  // Real metrics directly from 05_Bangla_Voice_AI/pretrained_bengali_comparison/task_03_2/comparison_metrics.json
  const stages = [
    { label: "6-Clip Smoke", smallWer: 33.33, smallLow: 25.0, smallHigh: 45.55, baseWer: 117.33, bnPct: 97.68 },
    { label: "26-Clip Overall", smallWer: 39.09, smallLow: 30.0, smallHigh: 45.8, baseWer: 242.83, bnPct: 98.37 },
    { label: "20-Clip Extended", smallWer: 40.15, smallLow: 32.0, smallHigh: 45.88, baseWer: 266.01, bnPct: 98.58 },
  ];

  const W = 640;
  const H = 220;
  const pad = { top: 20, right: 24, bottom: 36, left: 52 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const maxY = 280;

  const getX = (i: number) => pad.left + (i / (stages.length - 1)) * plotW;
  const getY = (val: number) => pad.top + plotH - (Math.min(maxY, Math.max(0, val)) / maxY) * plotH;

  const smallPath = stages.map((s, i) => `${i === 0 ? "M" : "L"} ${getX(i).toFixed(1)} ${getY(s.smallWer).toFixed(1)}`).join(" ");
  const basePath = stages.map((s, i) => `${i === 0 ? "M" : "L"} ${getX(i).toFixed(1)} ${getY(s.baseWer).toFixed(1)}`).join(" ");
  const bandPoly = [
    ...stages.map((s, i) => `${getX(i).toFixed(1)},${getY(s.smallHigh).toFixed(1)}`),
    ...[...stages].reverse().map((s, ri) => {
      const i = stages.length - 1 - ri;
      return `${getX(i).toFixed(1)},${getY(s.smallLow).toFixed(1)}`;
    }),
  ].join(" ");

  useEffect(() => {
    if (pauseMotion) return;
    const refs = [whisperLineRef.current, baseLineRef.current].filter(Boolean) as SVGPathElement[];
    const ctx = gsap.context(() => {
      refs.forEach((l, i) => {
        const len = l.getTotalLength?.() || 500;
        gsap.set(l, { strokeDasharray: len, strokeDashoffset: len });
        gsap.to(l, { strokeDashoffset: 0, duration: 0.9, delay: i * 0.12, ease: "power2.out" });
      });
    });
    return () => ctx.revert();
  }, [pauseMotion]);

  const focused = hoverIdx !== null ? stages[hoverIdx] : stages[1];

  return (
    <div className="ss-sapphire-card rounded-3xl p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-purple-300">
            FLEURS ASR ERROR CORRIDOR • LOWER WER = BETTER
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white">
            Whisper-Small-BN Error Band vs Whisper-Base Baseline (Phase G Audit)
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="inline-flex items-center gap-1.5 text-[#c084fc]">
            <span className="w-3 h-1 rounded bg-[#c084fc]" /> Whisper-Small-BN (39.09%)
          </span>
          <span className="inline-flex items-center gap-1.5 text-[#fb7185]">
            <span className="w-3 h-1 rounded bg-[#fb7185]" /> Whisper-Base (242.83%)
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto cursor-crosshair"
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const mx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * W;
          let best = 0;
          let bestD = Infinity;
          stages.forEach((_, idx) => {
            const d = Math.abs(getX(idx) - mx);
            if (d < bestD) {
              bestD = d;
              best = idx;
            }
          });
          setHoverIdx(best);
        }}
      >
        {[0, 50, 100, 150, 200, 250].map((tick) => {
          const y = getY(tick);
          return (
            <g key={tick}>
              <line x1={pad.left} y1={y} x2={W - pad.right} y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
              <text x={pad.left - 8} y={y + 3} textAnchor="end" fill="#9eb3d1" fontSize="10" className="font-mono">
                {tick}%
              </text>
            </g>
          );
        })}

        <polygon points={bandPoly} fill="rgba(192, 132, 252, 0.22)" />
        <path ref={baseLineRef} d={basePath} fill="none" stroke="#fb7185" strokeWidth="2.5" strokeDasharray="5 4" />
        <path ref={whisperLineRef} d={smallPath} fill="none" stroke="#c084fc" strokeWidth="3" strokeLinecap="round" />

        {stages.map((s, i) => {
          const x = getX(i);
          const ySmall = getY(s.smallWer);
          const yBase = getY(s.baseWer);
          const isSel = hoverIdx === i;
          return (
            <g key={s.label}>
              {isSel && <line x1={x} y1={pad.top} x2={x} y2={H - pad.bottom} stroke="rgba(56,189,248,0.45)" />}
              <circle cx={x} cy={yBase} r={isSel ? 5.5 : 4} fill="#fb7185" stroke="#fff" strokeWidth="1.5" />
              <circle cx={x} cy={ySmall} r={isSel ? 6 : 4.5} fill="#c084fc" stroke="#fff" strokeWidth="1.5" />
              <text x={x} y={H - 12} textAnchor="middle" fill={isSel ? "#FFFFFF" : "#9eb3d1"} fontSize="11" className="font-mono">
                {s.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
        <div className="rounded-xl bg-[#040a18]/85 border border-purple-400/30 p-3">
          <div className="text-[10px] text-purple-300">SELECTED BENCHMARK WINDOW</div>
          <div className="text-sm font-bold text-white mt-0.5">{focused.label}</div>
        </div>
        <div className="rounded-xl bg-[#040a18]/85 border border-sky-400/30 p-3">
          <div className="text-[10px] text-sky-300">WHISPER-SMALL-BN WER • SCRIPT</div>
          <div className="text-sm font-bold text-[#c084fc] mt-0.5">
            {focused.smallWer}% WER • {focused.bnPct}% BN Unicode
          </div>
        </div>
        <div className="rounded-xl bg-[#040a18]/85 border border-rose-400/30 p-3">
          <div className="text-[10px] text-rose-300">WHISPER-BASE COMPARISON</div>
          <div className="text-sm font-bold text-rose-300 mt-0.5">{focused.baseWer}% WER (0.0% BN)</div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   5. DERMOPED AI — CohortWaffleMatrixChart (22-Patient Interactive Tile Matrix)
   ============================================================================ */
interface CohortPatientNode {
  id: string;
  diagnosis: "Chickenpox" | "Pediculosis";
  split: "Train" | "Val" | "Test";
  crops: number;
}

const DERMOPED_COHORT: CohortPatientNode[] = [
  ...Array.from({ length: 13 }, (_, i) => ({
    id: `pt${String(i + 1).padStart(2, "0")}`,
    diagnosis: "Chickenpox" as const,
    split: "Train" as const,
    crops: 30,
  })),
  ...Array.from({ length: 3 }, (_, i) => ({
    id: `pt${14 + i}`,
    diagnosis: "Chickenpox" as const,
    split: "Val" as const,
    crops: 29,
  })),
  ...Array.from({ length: 3 }, (_, i) => ({
    id: `pt${17 + i}`,
    diagnosis: "Chickenpox" as const,
    split: "Test" as const,
    crops: 30,
  })),
  { id: "pt72", diagnosis: "Pediculosis", split: "Train", crops: 28 },
  { id: "pt71", diagnosis: "Pediculosis", split: "Val", crops: 28 },
  { id: "pt74", diagnosis: "Pediculosis", split: "Test", crops: 33 },
];

export function CohortWaffleMatrixChart() {
  const [selectedPt, setSelectedPt] = useState<CohortPatientNode>(DERMOPED_COHORT[21]);

  return (
    <div className="ss-sapphire-card rounded-3xl p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#34d399]">
            22-PATIENT VERIFIED WAFFLE MATRIX • 656 TOTAL CROPS
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white">
            Patient-Level Cohort Balance &amp; Strict Pediculosis Sample Disclosure
          </h3>
        </div>
        <span className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-400/15 border border-emerald-400/35 text-emerald-200">
          EXP_B: 92.73% Test Img Acc
        </span>
      </div>

      {/* 22 Interactive Patient Tiles */}
      <div className="grid grid-cols-6 sm:grid-cols-11 gap-2">
        {DERMOPED_COHORT.map((pt) => {
          const isPediculosis = pt.diagnosis === "Pediculosis";
          const active = selectedPt.id === pt.id;
          return (
            <button
              key={pt.id}
              type="button"
              onClick={() => setSelectedPt(pt)}
              onMouseEnter={() => setSelectedPt(pt)}
              className={`min-h-12 rounded-xl border p-1.5 flex flex-col items-center justify-center font-mono text-[10px] transition cursor-pointer ${
                isPediculosis
                  ? active
                    ? "bg-amber-400 text-slate-950 border-white font-bold shadow-[0_0_16px_rgba(242,200,121,0.7)]"
                    : "bg-amber-500/20 border-amber-400/60 text-amber-200 hover:bg-amber-500/35"
                  : active
                  ? "bg-[#38bdf8] text-slate-950 border-white font-bold shadow-[0_0_14px_rgba(56,189,248,0.65)]"
                  : "bg-sky-500/15 border-sky-400/35 text-sky-200 hover:bg-sky-500/30"
              }`}
            >
              <span>{pt.id}</span>
              <span className="text-[8px] opacity-80">{pt.split}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="rounded-xl bg-[#040a18]/85 border border-white/10 p-3 space-y-1">
          <div className="font-mono text-[10px] text-slate-400 uppercase">Hovered Patient Tile</div>
          <div className="font-mono font-bold text-white flex items-center gap-1.5">
            {selectedPt.diagnosis === "Pediculosis" ? (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#38bdf8]" />
            )}
            <span>
              {selectedPt.id} • {selectedPt.diagnosis} ({selectedPt.split})
            </span>
          </div>
        </div>

        <div className="rounded-xl bg-[#040a18]/85 border border-sky-400/25 p-3 space-y-1">
          <div className="font-mono text-[10px] text-sky-300 uppercase">Verified SHA-256 Checkpoints</div>
          <div className="font-mono text-[11px] text-slate-200">
            EXP_B: <span className="text-[#34d399]">5a98...8da</span> • EXP_D: <span className="text-[#38bdf8]">e9ef...e67</span>
          </div>
        </div>

        <div className="rounded-xl bg-[#040a18]/85 border border-amber-400/30 p-3 space-y-1">
          <div className="font-mono text-[10px] text-amber-300 uppercase inline-flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Small-Cohort Caveat
          </div>
          <div className="text-[11px] text-amber-100">
            19 Chickenpox (86.4%) vs 3 Pediculosis (`pt72`, `pt71`, `pt74` = 13.6%). Research benchmark only.
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-300 pt-1 border-t border-white/10">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" /> Cyan Tiles: Chickenpox (n=19 patients)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-300" /> Amber Tiles: Pediculosis (n=3: pt72, pt71, pt74)
        </span>
      </div>
    </div>
  );
}

/** Shared audited PCOS dial presets & sparklines reused cleanly across Homepage & /features/pcos. */
export const PCOS_DIAL_PRESETS: RiskDialPreset[] = [
  {
    id: "m01-holdout",
    label: "M01 Holdout",
    pct: 94.44,
    displayValue: "94.44%",
    targetPct: 85,
    zoneLabel: "17 / 18 BAL ACC",
    tone: "cyan",
    note: "XGBoost + SimpleImputer on N=88 Mendeley clinical cohort (held-out split balanced accuracy).",
  },
  {
    id: "m01-cv",
    label: "M01 5-Fold CV",
    pct: 88.57,
    displayValue: "88.57%",
    targetPct: 85,
    zoneLabel: "STRATIFIED 5-FOLD",
    tone: "teal",
    note: "Cross-validation balanced accuracy across 20 anthropometric, cycle & endocrine features.",
  },
  {
    id: "m02-usg",
    label: "M02 Ultrasound",
    pct: 86.67,
    displayValue: "86.67%",
    targetPct: 85,
    zoneLabel: "39 / 45 SCANS",
    tone: "gold",
    note: "ResNet18 on 299 pHash-deduplicated scans (PCOM / Dominant Follicle / Normal morphology).",
  },
];

export const PCOS_SPARKLINE_ITEMS: SparklineMetricItem[] = [
  {
    id: "m01-cv-folds",
    title: "M01 5-Fold CV Curve",
    value: "88.57%",
    subtitle: "Stratified N=88 Cohort",
    accent: "#38bdf8",
    points: [
      { label: "Fold 1", val: 84.2 },
      { label: "Fold 2", val: 87.5 },
      { label: "Fold 3", val: 89.4 },
      { label: "Fold 4", val: 88.1 },
      { label: "Fold 5", val: 93.6 },
    ],
  },
  {
    id: "m02-scan-share",
    title: "M02 Unique Scan Pool",
    value: "299 Scans",
    subtitle: "86.67% Held-Out Test",
    accent: "#2dd4bf",
    points: [
      { label: "Normal (41)", val: 41 },
      { label: "PCO (116)", val: 116 },
      { label: "Dominant (142)", val: 142 },
      { label: "Test Split (45)", val: 45 },
      { label: "Correct (39)", val: 39 },
    ],
  },
  {
    id: "rotterdam-sep",
    title: "Rotterdam Track Sep.",
    value: "2 Tracks",
    subtitle: "M01 Lab vs M02 USG",
    accent: "#f2c879",
    points: [
      { label: "M01 Train", val: 70 },
      { label: "M01 Test", val: 18 },
      { label: "M02 Train", val: 210 },
      { label: "M02 Val", val: 44 },
      { label: "M02 Test", val: 45 },
    ],
  },
];
