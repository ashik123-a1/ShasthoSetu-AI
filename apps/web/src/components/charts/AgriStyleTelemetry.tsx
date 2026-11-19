import { useEffect, useRef, useState } from "react";
import { Activity, ShieldCheck, type LucideIcon } from "lucide-react";

/**
 * Shared 60fps requestAnimationFrame telemetry clock ported from AgriSense-Fusion
 * to ShasthoSetu AI Midnight Sapphire tokens.
 */
const telemetrySubscribers = new Set<(nowMs: number) => void>();
let rafHandle: number | null = null;

function runTelemetryClock(nowMs: number) {
  telemetrySubscribers.forEach((cb) => cb(nowMs));
  if (telemetrySubscribers.size > 0 && typeof window !== "undefined") {
    rafHandle = window.requestAnimationFrame(runTelemetryClock);
  } else {
    rafHandle = null;
  }
}

export function subscribeTelemetryTick(callback: (nowMs: number) => void) {
  telemetrySubscribers.add(callback);
  if (rafHandle === null && typeof window !== "undefined") {
    rafHandle = window.requestAnimationFrame(runTelemetryClock);
  }
  return () => {
    telemetrySubscribers.delete(callback);
    if (telemetrySubscribers.size === 0 && rafHandle !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }
  };
}

function computeCycleFillFactor(sec: number, delaySec: number, cycleSec = 3.6): number {
  const phase = ((((sec + delaySec) % cycleSec) + cycleSec) % cycleSec) / cycleSec;
  if (phase < 0.4) {
    const u = phase / 0.4;
    return 0.06 + 0.94 * (1 - Math.pow(1 - u, 3));
  }
  if (phase < 0.78) {
    return 1;
  }
  const u = (phase - 0.78) / 0.22;
  const smooth = u * u * (3 - 2 * u);
  return 1 - 0.94 * smooth;
}

export interface TelemetrySegment {
  label: string;
  pct: number;
  color: string;
}

export interface TelemetryDeckCard {
  id: string;
  tag: string;
  value: string;
  sub: string;
  accent: string;
  glow?: string;
  icon: LucideIcon;
  pieCenter: string;
  pieSub: string;
  pieSegments: TelemetrySegment[];
  barSegments: TelemetrySegment[];
  barFootnote: string;
}

export interface BreakdownBarItem {
  name: string;
  pct: number;
  valueLabel?: string;
  color: string;
  note?: string;
}

/**
 * Circular multi-segment SVG Donut/Pie chart with dual counter-rotating loader rings
 * and glowing leading tip dot.
 */
export function DonutPieGauge({
  segments,
  size = 68,
  strokeWidth = 5.8,
  centerValue,
  centerSub,
  accent = "#38bdf8",
  animDelay = "0s",
  pauseMotion = false,
}: {
  segments: TelemetrySegment[];
  size?: number;
  strokeWidth?: number;
  centerValue?: string;
  centerSub?: string;
  accent?: string;
  animDelay?: string;
  pauseMotion?: boolean;
}) {
  const radius = (size - strokeWidth * 2 - 8) / 2;
  const outerRadius = radius + strokeWidth * 0.94;
  const outerCirc = 2 * Math.PI * outerRadius;
  const innerRadius = Math.max(radius - strokeWidth * 0.84, 4);
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  const outerGroupRef = useRef<SVGGElement>(null);
  const innerRingRef = useRef<SVGCircleElement>(null);
  const tipDotRef = useRef<SVGCircleElement>(null);
  const sliceRefs = useRef<(SVGCircleElement | null)[]>([]);

  useEffect(() => {
    const totalDataPct = segments.reduce((sum, seg) => sum + seg.pct, 0);

    const applyFrame = (fillFactor: number, outerDeg: string | number, innerDeg: string | number) => {
      if (outerGroupRef.current) {
        outerGroupRef.current.setAttribute("transform", `rotate(${outerDeg} ${cx} ${cy})`);
      }
      if (innerRingRef.current) {
        innerRingRef.current.setAttribute("transform", `rotate(${innerDeg} ${cx} ${cy})`);
      }

      const fillBudget = totalDataPct * fillFactor;
      let cumulativePct = 0;

      segments.forEach((seg, idx) => {
        const el = sliceRefs.current[idx];
        const segStart = cumulativePct;
        const segEnd = cumulativePct + seg.pct;
        cumulativePct = segEnd;

        if (!el) return;
        const visiblePct = Math.max(0, Math.min(fillBudget, segEnd) - segStart);
        const arcLen = (visiblePct / 100) * circumference;
        el.setAttribute("stroke-dasharray", `${arcLen.toFixed(2)} ${circumference.toFixed(2)}`);
      });

      if (tipDotRef.current) {
        const tipAngleRad = ((fillBudget / 100) * 360 - 90) * (Math.PI / 180);
        const tx = cx + radius * Math.cos(tipAngleRad);
        const ty = cy + radius * Math.sin(tipAngleRad);
        tipDotRef.current.setAttribute("cx", tx.toFixed(2));
        tipDotRef.current.setAttribute("cy", ty.toFixed(2));
        tipDotRef.current.setAttribute("opacity", fillFactor > 0.07 ? "0.96" : "0");
      }
    };

    if (pauseMotion) {
      applyFrame(1, 0, 0);
      return undefined;
    }

    const delaySec = parseFloat(animDelay) || 0;
    return subscribeTelemetryTick((nowMs) => {
      const sec = nowMs / 1000;
      const fillFactor = computeCycleFillFactor(sec, delaySec, 3.6);
      const outerDeg = ((sec * 125 + delaySec * 55) % 360).toFixed(2);
      const innerDeg = (360 - ((sec * 52 + delaySec * 35) % 360)).toFixed(2);
      applyFrame(fillFactor, outerDeg, innerDeg);
    });
  }, [segments, circumference, radius, cx, cy, animDelay, pauseMotion]);

  let initialOffset = 0;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <g ref={outerGroupRef}>
          <circle cx={cx} cy={cy} r={outerRadius} fill="none" stroke={`${accent}28`} strokeWidth="1.2" />
          <circle
            cx={cx}
            cy={cy}
            r={outerRadius}
            fill="none"
            stroke={accent}
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeDasharray={`${outerCirc * 0.3} ${outerCirc}`}
            opacity="0.95"
          />
          <circle cx={cx} cy={cy - outerRadius} r="2.4" fill="#FFFFFF" />
        </g>

        <circle
          ref={innerRingRef}
          cx={cx}
          cy={cy}
          r={innerRadius}
          fill="none"
          stroke={`${accent}38`}
          strokeWidth="1.1"
          strokeDasharray="2 4"
        />

        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(255, 255, 255, 0.1)" strokeWidth={strokeWidth} />

        {segments.map((seg, i) => {
          const dashOffset = -((initialOffset / 100) * circumference);
          const fullArcLen = (seg.pct / 100) * circumference;
          initialOffset += seg.pct;
          return (
            <circle
              key={seg.label || i}
              ref={(el) => {
                sliceRefs.current[i] = el;
              }}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${fullArcLen.toFixed(2)} ${circumference.toFixed(2)}`}
              strokeDashoffset={dashOffset.toFixed(2)}
              strokeLinecap={segments.length === 1 ? "round" : "butt"}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
        })}

        {!pauseMotion && (
          <circle ref={tipDotRef} cx={cx} cy={cy - radius} r="2.5" fill="#FFFFFF" opacity="0.95" />
        )}
      </svg>

      {(centerValue || centerSub) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1.05,
            pointerEvents: "none",
          }}
        >
          {centerValue && (
            <span className="font-mono font-extrabold text-white" style={{ fontSize: size >= 72 ? "0.78rem" : "0.64rem" }}>
              {centerValue}
            </span>
          )}
          {centerSub && (
            <span className="font-mono font-bold text-slate-300/80" style={{ fontSize: "0.48rem" }}>
              {centerSub}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Horizontal segmented Pie-Bar progress chart driven by the shared 60fps RAF loop
 * with continuous fill, flowing stripe motion, and scanner beam sweeps.
 */
export function SegmentedPieBar({
  segments,
  height = 8,
  animDelay = "0s",
  pauseMotion = false,
}: {
  segments: TelemetrySegment[];
  height?: number;
  animDelay?: string;
  pauseMotion?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const gleamRef = useRef<HTMLDivElement>(null);
  const stripeRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (pauseMotion) {
      if (trackRef.current) {
        trackRef.current.style.transform = "scaleX(1)";
      }
      return undefined;
    }

    const delaySec = parseFloat(animDelay) || 0;
    return subscribeTelemetryTick((nowMs) => {
      const sec = nowMs / 1000;
      const barScale = computeCycleFillFactor(sec, delaySec, 3.6);

      if (trackRef.current) {
        trackRef.current.style.transform = `scaleX(${barScale.toFixed(4)})`;
      }

      const gleamCycle = 1.8;
      const gleamFrac = ((((sec + delaySec * 0.6) % gleamCycle) + gleamCycle) % gleamCycle) / gleamCycle;
      if (gleamRef.current) {
        const leftPct = -36 + gleamFrac * 172;
        gleamRef.current.style.left = `${leftPct.toFixed(1)}%`;
      }

      const bgX = ((sec * 34) % 28).toFixed(1);
      stripeRefs.current.forEach((segEl) => {
        if (segEl) {
          segEl.style.backgroundPosition = `${bgX}px 0`;
        }
      });
    });
  }, [animDelay, pauseMotion]);

  return (
    <div
      style={{
        width: "100%",
        height,
        borderRadius: "9999px",
        background: "rgba(255, 255, 255, 0.09)",
        padding: "1px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "1px",
          display: "flex",
          gap: "2px",
          opacity: 0.16,
          pointerEvents: "none",
        }}
      >
        {segments.map((seg, idx) => (
          <div
            key={seg.label || idx}
            style={{
              width: `${seg.pct}%`,
              height: "100%",
              backgroundColor: seg.color,
              borderRadius: "9999px",
            }}
          />
        ))}
      </div>

      <div
        ref={trackRef}
        style={{
          transformOrigin: "left center",
          display: "flex",
          width: "100%",
          height: "100%",
          gap: "2px",
          alignItems: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        {segments.map((seg, idx) => {
          const isLast = idx === segments.length - 1;
          return (
            <div
              key={seg.label || idx}
              ref={(el) => {
                stripeRefs.current[idx] = el;
              }}
              title={`${seg.label}: ${seg.pct}%`}
              style={{
                width: `${seg.pct}%`,
                height: "100%",
                backgroundColor: seg.color,
                backgroundImage: !pauseMotion
                  ? "repeating-linear-gradient(-55deg, rgba(255, 255, 255, 0.24) 0px, rgba(255, 255, 255, 0.24) 6px, transparent 6px, transparent 14px)"
                  : undefined,
                backgroundSize: "28px 28px",
                borderRadius: "9999px",
                boxShadow:
                  isLast && !pauseMotion
                    ? `0 0 10px ${seg.color}99, inset -3px 0 6px rgba(255, 255, 255, 0.9)`
                    : `0 0 8px ${seg.color}66`,
              }}
            />
          );
        })}
      </div>

      {!pauseMotion && (
        <div
          ref={gleamRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: "32%",
            left: "-36%",
            background: "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.65) 50%, transparent 100%)",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />
      )}
    </div>
  );
}

/**
 * Full AgriSense-style Mission Control Digital Observatory Dashboard Deck
 * with scanning laser hairline, live dot, 4 Donut+PieBar cards, and multi-bar breakdown.
 */
export function DigitalObservatoryDeck({
  badgeLabel,
  statusLabel = "LIVE DIGITAL TELEMETRY",
  cards,
  breakdownTitle,
  breakdownBars,
  pauseMotion = false,
}: {
  badgeLabel: string;
  statusLabel?: string;
  cards: TelemetryDeckCard[];
  breakdownTitle: string;
  breakdownBars: BreakdownBarItem[];
  pauseMotion?: boolean;
}) {
  const [selectedCardId, setSelectedCardId] = useState(cards[0]?.id ?? "");
  const headerDotRef = useRef<HTMLSpanElement>(null);
  const topScanRef = useRef<HTMLDivElement>(null);

  const activeCard = cards.find((c) => c.id === selectedCardId) ?? cards[0];

  useEffect(() => {
    if (pauseMotion) return undefined;
    return subscribeTelemetryTick((nowMs) => {
      const sec = nowMs / 1000;
      if (headerDotRef.current) {
        const pulse = 0.78 + 0.42 * (0.5 + 0.5 * Math.sin(sec * 3.5));
        headerDotRef.current.style.transform = `scale(${pulse.toFixed(3)})`;
      }
      if (topScanRef.current) {
        const scanPos = ((sec * 42) % 140) - 20;
        topScanRef.current.style.left = `${scanPos.toFixed(1)}%`;
      }
    });
  }, [pauseMotion]);

  return (
    <div
      data-no-tilt="true"
      className="ss-sapphire-card relative rounded-3xl p-4 sm:p-5 space-y-4 overflow-hidden border border-sky-400/30"
    >
      {/* Top Continuous Telemetry Scanner Line */}
      {!pauseMotion && (
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 h-[2px] bg-sky-400/15 overflow-hidden"
        >
          <div
            ref={topScanRef}
            className="absolute inset-y-0 w-[28%]"
            style={{
              left: "-20%",
              background: "linear-gradient(90deg, transparent, #38bdf8, #2dd4bf, transparent)",
            }}
          />
        </div>
      )}

      {/* Top Mission Control Audit Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
        <div className="font-mono inline-flex items-center gap-2 rounded-full bg-sky-400/15 border border-sky-400/35 text-sky-300 px-3 py-1 text-[11px] font-bold tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{badgeLabel}</span>
        </div>

        <div className="font-mono inline-flex items-center gap-2 text-[11px] font-bold text-[#2dd4bf]">
          <span
            ref={headerDotRef}
            className="w-2 h-2 rounded-full bg-[#2dd4bf] shadow-[0_0_10px_#2dd4bf] inline-block"
          />
          <span>{statusLabel}</span>
        </div>
      </div>

      {/* 4 Animated Donut + Pie-Bar Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {cards.map((card, idx) => {
          const IconComp = card.icon;
          const isSelected = activeCard?.id === card.id;
          return (
            <div
              key={card.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedCardId(card.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedCardId(card.id);
                }
              }}
              onMouseEnter={() => setSelectedCardId(card.id)}
              className="ss-glow-card cursor-pointer rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all"
              style={{
                background: isSelected ? "rgba(8, 22, 48, 0.92)" : "rgba(5, 13, 28, 0.85)",
                border: isSelected ? `1.5px solid ${card.accent}` : `1px solid ${card.accent}42`,
                boxShadow: isSelected ? `0 16px 36px rgba(2,8,24,0.65), 0 0 24px ${card.accent}30` : undefined,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div
                    className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-wider uppercase"
                    style={{ color: card.accent }}
                  >
                    <IconComp className="w-3 h-3 shrink-0" />
                    <span className="truncate">{card.tag}</span>
                  </div>
                  <div className="font-mono text-2xl font-extrabold text-white leading-tight mt-1 tabular-nums">
                    {card.value}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-300/85 truncate">{card.sub}</div>
                </div>

                <DonutPieGauge
                  segments={card.pieSegments}
                  size={68}
                  strokeWidth={5.8}
                  centerValue={card.pieCenter}
                  centerSub={card.pieSub}
                  accent={card.accent}
                  animDelay={`${idx * 0.45}s`}
                  pauseMotion={pauseMotion}
                />
              </div>

              <div>
                <SegmentedPieBar
                  segments={card.barSegments}
                  height={8}
                  animDelay={`${idx * 0.45}s`}
                  pauseMotion={pauseMotion}
                />
                <div className="text-[11px] text-slate-300/80 mt-1.5 truncate">{card.barFootnote}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Live Breakdown Strip */}
      <div className="rounded-2xl bg-[#040a18]/85 border border-sky-400/20 p-3.5 sm:p-4 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white">
            <Activity className="w-3.5 h-3.5 text-[#38bdf8]" />
            {breakdownTitle}
          </span>
          {activeCard ? (
            <span className="font-mono text-[11px] font-bold" style={{ color: activeCard.accent }}>
              FOCUS: {activeCard.tag}
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {breakdownBars.map((bar, bIdx) => (
            <div key={bar.name} className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-200 truncate">{bar.name}</span>
                <span className="font-mono tabular-nums" style={{ color: bar.color }}>
                  {bar.valueLabel ?? `${bar.pct.toFixed(1)}%`}
                </span>
              </div>
              <SegmentedPieBar
                segments={[{ label: bar.name, pct: Math.min(100, Math.max(0, bar.pct)), color: bar.color }]}
                height={7}
                animDelay={`${bIdx * 0.35}s`}
                pauseMotion={pauseMotion}
              />
              {bar.note ? <div className="text-[10px] text-slate-400 truncate">{bar.note}</div> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Interactive SVG / Bar Comparison Graph component for per-module scientific benchmarks.
 */
export interface GraphBarSeriesItem {
  label: string;
  value: number;
  maxValue?: number;
  displayValue: string;
  sublabel?: string;
  color: string;
}

export function InteractiveBarGraph({
  title,
  subtitle,
  items,
  unit = "%",
  thresholdValue,
  thresholdLabel,
  pauseMotion = false,
}: {
  title: string;
  subtitle?: string;
  items: GraphBarSeriesItem[];
  unit?: string;
  thresholdValue?: number;
  thresholdLabel?: string;
  pauseMotion?: boolean;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const globalMax = Math.max(
    1,
    ...items.map((i) => i.maxValue ?? Math.max(100, i.value))
  );

  return (
    <div className="ss-sapphire-card rounded-3xl p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white">{title}</h3>
          {subtitle ? <p className="text-xs text-slate-300 mt-0.5">{subtitle}</p> : null}
        </div>
        {hoveredIdx !== null && items[hoveredIdx] ? (
          <div className="rounded-xl bg-[#040a18]/90 border border-sky-400/40 px-3 py-1.5 text-xs font-mono">
            <span className="text-slate-300">{items[hoveredIdx].label}: </span>
            <strong style={{ color: items[hoveredIdx].color }}>{items[hoveredIdx].displayValue}</strong>
          </div>
        ) : thresholdLabel ? (
          <span className="font-mono text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/15 text-slate-300">
            {thresholdLabel}
          </span>
        ) : null}
      </div>

      <div className="space-y-3">
        {items.map((item, idx) => {
          const pct = Math.min(100, Math.max(2, (item.value / globalMax) * 100));
          const active = hoveredIdx === idx;
          return (
            <div
              key={item.label}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`rounded-xl p-2.5 transition-colors border ${
                active ? "bg-white/8 border-sky-400/45" : "bg-black/25 border-white/5"
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                <div className="min-w-0">
                  <span className="font-semibold text-white">{item.label}</span>
                  {item.sublabel ? (
                    <span className="ml-2 font-mono text-[10px] text-slate-400">{item.sublabel}</span>
                  ) : null}
                </div>
                <span className="font-mono font-bold tabular-nums shrink-0" style={{ color: item.color }}>
                  {item.displayValue}
                </span>
              </div>

              <div className="relative h-3 rounded-full bg-white/8 overflow-hidden">
                {thresholdValue !== undefined && thresholdValue <= globalMax ? (
                  <div
                    aria-hidden="true"
                    className="absolute inset-y-0 w-0.5 bg-[#f2c879] z-20"
                    style={{ left: `${(thresholdValue / globalMax) * 100}%` }}
                  />
                ) : null}
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${item.color}99, ${item.color})`,
                    boxShadow: active || !pauseMotion ? `0 0 12px ${item.color}80` : undefined,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-white/10">
        <span>0{unit}</span>
        <span>
          Scale Max: {globalMax}
          {unit}
        </span>
      </div>
    </div>
  );
}
