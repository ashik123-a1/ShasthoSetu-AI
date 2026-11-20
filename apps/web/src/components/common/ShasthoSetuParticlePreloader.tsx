import React, { useState, useEffect, useRef, useCallback } from "react";
import { FastForward } from "lucide-react";
import { REALISTIC_DOCTORS_POINTS } from "./realisticDoctorsParticleData";

// ============================================================================
// CONSTANTS & TIMELINE CONFIGURATION
// ============================================================================
const DESKTOP_PARTICLE_COUNT = 8600;
const MOBILE_PARTICLE_COUNT = 4200;

export interface LoadingStage {
  id: "FULL_SCATTER_1" | "DOCTORS_BACK_TO_BACK" | "CLINICAL_SCATTER_2" | "SHASTHOSETU";
  label: string;
  range: [number, number];
}

const LOADING_STAGES: LoadingStage[] = [
  {
    id: "FULL_SCATTER_1",
    label: "Clinical Starfield",
    range: [0, 8],
  },
  {
    id: "DOCTORS_BACK_TO_BACK",
    label: "2 Doctors Back-to-Back",
    range: [8, 52],
  },
  {
    id: "CLINICAL_SCATTER_2",
    label: "Cardiac Pulse Burst",
    range: [52, 58],
  },
  {
    id: "SHASTHOSETU",
    label: "ShasthoSetu AI",
    range: [58, 100],
  },
];

interface TargetPoint {
  x: number;
  y: number;
  z: number;
  brandColor: string;
  sizeMult: number;
  layerPriority: number;
  isSub?: boolean;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  tx: number;
  ty: number;
  tz: number;
  baseSize: number;
  sizeMult: number;
  phase: number;
  phaseSpeed: number;
  brandColor: string;
  layerPriority: number;
}

// ============================================================================
// SAMPLERS & PROCEDURAL VECTOR BUILDERS
// ============================================================================

/**
 * Generates Full-Window Edge-to-Edge Cosmic Particle Coordinates (100vw x 100vh)
 */
function generateFullWindowScatterTargets(
  count: number,
  width: number,
  height: number,
  seedOffset = 0
): TargetPoint[] {
  const targets: TargetPoint[] = new Array(count);
  const spreadX = width * 1.25;
  const spreadY = height * 1.25;
  const spreadZ = Math.min(width, height) * 0.9;

  for (let i = 0; i < count; i++) {
    const u = ((i * 137.508 + seedOffset * 71.3) % 1000) / 1000;
    const v = ((i * 269.317 + seedOffset * 113.7) % 1000) / 1000;

    const rx = (u - 0.5) * spreadX + (Math.random() - 0.5) * (width * 0.18);
    const ry = (v - 0.5) * spreadY + (Math.random() - 0.5) * (height * 0.18);
    const rz = (Math.random() - 0.5) * spreadZ;

    targets[i] = {
      x: rx,
      y: ry,
      z: rz,
      brandColor:
        i % 11 === 0
          ? "#38bdf8"
          : i % 17 === 0
          ? "#34d399"
          : i % 23 === 0
          ? "#60a5fa"
          : i % 7 === 0
          ? "#22d3ee"
          : "#ffffff",
      sizeMult: 0.7 + (i % 5) * 0.16,
      layerPriority: 0,
    };
  }
  return targets;
}


/**
 * Generates the Iconic Formation of 2 Photorealistic Human Doctors Standing Back-to-Back
 * with Natural Skin Tones, Rich Hair, Clinical White Coats, Stethoscopes, ECG Pulse Line, and Bio-Resonance Ring.
 */
function generateTwoDoctorsTargets(count: number, width: number, height: number): TargetPoint[] {
  const targets: TargetPoint[] = new Array(count);
  const totalSource = REALISTIC_DOCTORS_POINTS.length;

  // Scale factor to fit viewport naturally without clipping
  // Base dimensions are roughly 750px high by 650px wide
  const scale = Math.min(width / 960, height / 840) * 0.95;

  for (let i = 0; i < count; i++) {
    const src = REALISTIC_DOCTORS_POINTS[i % totalSource];
    const jitter = src.priority === 4 ? 0.7 : src.priority === 3 ? 1.1 : 1.6;
    const jx = (Math.random() - 0.5) * jitter;
    const jy = (Math.random() - 0.5) * jitter;

    targets[i] = {
      x: src.x * scale + jx,
      y: src.y * scale + jy,
      z:
        src.priority === 4
          ? 24 + (Math.random() - 0.5) * 6
          : src.priority === 3
          ? 16 + (Math.random() - 0.5) * 6
          : (Math.random() - 0.5) * 12,
      brandColor: src.color,
      sizeMult:
        src.priority === 4
          ? 1.28
          : src.priority === 3
          ? 1.16
          : src.priority === 2
          ? 1.02
          : 0.92,
      layerPriority: src.priority,
    };
  }

  return targets;
}

/**
 * Generates Volumetric "SHASTHOSETU AI" Particle Text with Bilingual Clinical Subtitles.
 */
function generateShasthoSetuTargets(count: number, width: number, height: number): TargetPoint[] {
  const offCanvas = document.createElement("canvas");
  const cw = Math.max(760, Math.min(1440, Math.floor(width)));
  const ch = Math.max(420, Math.min(800, Math.floor(height)));
  offCanvas.width = cw;
  offCanvas.height = ch;
  const ctx = offCanvas.getContext("2d");
  if (!ctx) return [];

  ctx.clearRect(0, 0, cw, ch);
  const cx = cw / 2;
  const cy = ch / 2;

  const maxTextWidth = cw * 0.88;
  let fontSize = Math.floor(cw * 0.135);
  ctx.font = `900 ${fontSize}px "Plus Jakarta Sans", "Inter", "Arial Black", sans-serif`;
  const measured = ctx.measureText("SHASTHOSETU AI").width;
  if (measured > maxTextWidth) {
    fontSize = Math.floor(fontSize * (maxTextWidth / measured));
  }

  ctx.font = `900 ${fontSize}px "Plus Jakarta Sans", "Inter", "Arial Black", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Three-color wordmark: SHASTHO (White) + SETU (Cyan) + AI (Emerald)
  const fullText = "SHASTHOSETU AI";
  const charSpacing = fontSize * 0.035;
  const chars = fullText.split("");
  const charWidths = chars.map((c) => ctx.measureText(c).width);
  const totalWidth =
    charWidths.reduce((acc, w) => acc + w, 0) + charSpacing * (chars.length - 1);

  let currentX = cx - totalWidth / 2;
  chars.forEach((char, index) => {
    const w = charWidths[index];
    if (index < 7) {
      // SHASTHO -> Crisp Pure White
      ctx.fillStyle = "rgb(255, 255, 255)";
    } else if (index < 11) {
      // SETU -> Cyan / Sky
      ctx.fillStyle = "rgb(56, 189, 248)";
    } else {
      // AI -> Radiant Emerald
      ctx.fillStyle = "rgb(52, 211, 153)";
    }
    ctx.fillText(char, currentX + w / 2, cy);
    currentX += w + charSpacing;
  });

  const imgData = ctx.getImageData(0, 0, cw, ch).data;
  const textPoints: Array<{ x: number; y: number; brandColor: string; isSub: boolean }> = [];
  const step = 2;

  for (let y = 0; y < ch; y += step) {
    for (let x = 0; x < cw; x += step) {
      const idx = (y * cw + x) * 4;
      const r = imgData[idx];
      const g = imgData[idx + 1];
      const b = imgData[idx + 2];
      const a = imgData[idx + 3];

      if (a > 85) {
        let brandColor = "#ffffff";
        let isSub = false;

        if (r < 140 && g > 180 && b > 230) {
          brandColor = "#38bdf8";
        } else if (r < 100 && g > 200 && b < 180) {
          brandColor = "#34d399";
        } else if (r > 230 && g > 230 && b > 230) {
          brandColor = Math.random() > 0.25 ? "#ffffff" : "#e0f2fe";
        }

        textPoints.push({
          x: x - cw / 2,
          y: y - ch / 2,
          brandColor,
          isSub,
        });
      }
    }
  }

  const targets: TargetPoint[] = new Array(count);
  const scaleFactor = Math.min(width / cw, height / ch) * 0.96;
  const textParticleQuota = Math.floor(count * 0.92);

  for (let i = 0; i < count; i++) {
    if (i < textParticleQuota && textPoints.length > 0) {
      const pt = textPoints[(i * 97) % textPoints.length];
      const cloudSpread = pt.isSub ? 1.6 : 3.8;
      const jitterX = (Math.random() - 0.5) * cloudSpread;
      const jitterY = (Math.random() - 0.5) * cloudSpread;
      const jitterZ = (Math.random() - 0.5) * 24;

      targets[i] = {
        x: (pt.x + jitterX) * scaleFactor,
        y: (pt.y + jitterY) * scaleFactor,
        z: jitterZ,
        brandColor: pt.brandColor,
        sizeMult: pt.isSub ? 0.82 : 0.88 + Math.random() * 0.42,
        layerPriority: 2,
      };
    } else {
      targets[i] = {
        x: (Math.random() - 0.5) * width * 1.08,
        y: (Math.random() - 0.5) * height * 1.08,
        z: (Math.random() - 0.5) * 180,
        brandColor: "#334155",
        sizeMult: 0.65,
        layerPriority: 0,
      };
    }
  }

  return targets;
}

function createParticlesFromScatter(scatterTargets: TargetPoint[]): Particle[] {
  const count = scatterTargets.length;
  const particles: Particle[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const s = scatterTargets[i];
    particles[i] = {
      x: s.x,
      y: s.y,
      z: s.z,
      vx: (Math.random() - 0.5) * 2.5,
      vy: (Math.random() - 0.5) * 2.5,
      vz: (Math.random() - 0.5) * 2.5,
      tx: s.x,
      ty: s.y,
      tz: s.z,
      baseSize: 0.85 + Math.random() * 1.1,
      sizeMult: s.sizeMult || 1,
      phase: Math.random() * Math.PI * 2,
      phaseSpeed: 0.03 + Math.random() * 0.05,
      brandColor: s.brandColor,
      layerPriority: s.layerPriority || 0,
    };
  }
  return particles;
}

// ============================================================================
// MAIN COMPONENT EXPORT
// ============================================================================
export interface ShasthoSetuParticlePreloaderProps {
  isOpen: boolean;
  onComplete?: () => void;
  replayNonce?: number;
}

export function ShasthoSetuParticlePreloader({
  isOpen,
  onComplete,
  replayNonce = 0,
}: ShasthoSetuParticlePreloaderProps) {
  const [isTransitioningOut, setIsTransitioningOut] = useState(false);
  const [progress, setProgress] = useState(0);
  const [skipHovered, setSkipHovered] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const formationsRef = useRef<Record<string, TargetPoint[]>>({});
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -9999,
    y: -9999,
    active: false,
  });
  const stageRef = useRef<string>("FULL_SCATTER_1");
  const warpExitRef = useRef(false);
  const timersRef = useRef<{ hold: ReturnType<typeof setTimeout> | null; exit: ReturnType<typeof setTimeout> | null }>({
    hold: null,
    exit: null,
  });
  const isClosingRef = useRef(false);

  const clearPendingTimers = useCallback(() => {
    if (timersRef.current.hold) {
      clearTimeout(timersRef.current.hold);
      timersRef.current.hold = null;
    }
    if (timersRef.current.exit) {
      clearTimeout(timersRef.current.exit);
      timersRef.current.exit = null;
    }
  }, []);

  const buildFormations = useCallback((width: number, height: number) => {
    const count = width < 768 ? MOBILE_PARTICLE_COUNT : DESKTOP_PARTICLE_COUNT;
    const fullScatter1 = generateFullWindowScatterTargets(count, width, height, 1);
    const twoDoctors = generateTwoDoctorsTargets(count, width, height);
    const fullScatter2 = generateFullWindowScatterTargets(count, width, height, 2);
    const shasthoSetu = generateShasthoSetuTargets(count, width, height);

    formationsRef.current = {
      FULL_SCATTER_1: fullScatter1,
      DOCTORS_BACK_TO_BACK: twoDoctors,
      CLINICAL_SCATTER_2: fullScatter2,
      SHASTHOSETU: shasthoSetu,
    };

    if (particlesRef.current.length !== count) {
      particlesRef.current = createParticlesFromScatter(fullScatter1);
    }
  }, []);

  const triggerExit = useCallback(
    (durationMs = 450) => {
      if (isClosingRef.current) return;
      isClosingRef.current = true;
      clearPendingTimers();
      warpExitRef.current = true;
      setIsTransitioningOut(true);

      timersRef.current.exit = setTimeout(() => {
        timersRef.current.exit = null;
        if (onComplete) onComplete();
      }, durationMs);
    },
    [clearPendingTimers, onComplete]
  );

  // Reset timeline whenever preloader opens or replays
  useEffect(() => {
    if (!isOpen) {
      clearPendingTimers();
      return;
    }

    clearPendingTimers();
    isClosingRef.current = false;
    stageRef.current = "FULL_SCATTER_1";
    warpExitRef.current = false;
    setIsTransitioningOut(false);
    setProgress(0);

    const scatterTargets = formationsRef.current.FULL_SCATTER_1;
    if (scatterTargets && particlesRef.current.length > 0) {
      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i];
        const s = scatterTargets[i];
        if (s) {
          p.x = s.x;
          p.y = s.y;
          p.z = s.z;
          p.vx = (Math.random() - 0.5) * 2.5;
          p.vy = (Math.random() - 0.5) * 2.5;
          p.vz = (Math.random() - 0.5) * 2.5;
          p.tx = s.x;
          p.ty = s.y;
          p.tz = s.z;
          p.brandColor = s.brandColor;
          p.sizeMult = s.sizeMult || 1;
          p.layerPriority = s.layerPriority || 0;
        }
      }
    }
  }, [isOpen, replayNonce, clearPendingTimers]);

  // Automated timeline progression (0% -> 100%)
  useEffect(() => {
    if (!isOpen) return undefined;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const next = Math.min(100, +(prev + 0.88).toFixed(2));
        const matchingStage = LOADING_STAGES.find(
          (st) => next >= st.range[0] && next <= st.range[1]
        );
        if (matchingStage && matchingStage.id !== stageRef.current) {
          stageRef.current = matchingStage.id;
        }
        return next;
      });
    }, 38);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Handle stage completion at 100%
  useEffect(() => {
    if (!isOpen || progress < 100) return;
    timersRef.current.hold = setTimeout(() => {
      triggerExit(520);
    }, 550);

    return () => {
      if (timersRef.current.hold) {
        clearTimeout(timersRef.current.hold);
        timersRef.current.hold = null;
      }
    };
  }, [isOpen, progress, triggerExit]);

  // Keyboard 'Esc' skip listener
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        triggerExit(400);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, triggerExit]);

  // Canvas render & animation physics loop
  useEffect(() => {
    if (!isOpen) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    buildFormations(width, height);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      buildFormations(width, height);
    };

    window.addEventListener("resize", handleResize);

    let animationFrameId: number;
    const fov = 580;

    const renderLoop = () => {
      ctx.clearRect(0, 0, width, height);

      const particles = particlesRef.current;
      const targets = formationsRef.current[stageRef.current] || [];
      const mouse = mouseRef.current;
      const centerX = width / 2;
      const centerY = height / 2;

      const spring = warpExitRef.current ? 0.08 : 0.092;
      const friction = warpExitRef.current ? 0.88 : 0.84;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const t = targets[i];

        if (t) {
          p.tx = t.x;
          p.ty = t.y;
          p.tz = t.z;
          p.brandColor = t.brandColor;
          p.sizeMult = t.sizeMult || 1;
          p.layerPriority = t.layerPriority || 0;
        }

        if (warpExitRef.current) {
          p.tz += 14 + (i % 7) * 2;
        }

        p.vx = (p.vx + (p.tx - p.x) * spring) * friction;
        p.vy = (p.vy + (p.ty - p.y) * spring) * friction;
        p.vz = (p.vz + (p.tz - p.z) * spring) * friction;

        // Interactive mouse repulsion
        if (mouse.active) {
          const depth = fov + p.z;
          if (depth > 60) {
            const scale = fov / depth;
            const screenX = centerX + p.x * scale;
            const screenY = centerY + p.y * scale;

            const dx = screenX - mouse.x;
            const dy = screenY - mouse.y;
            const dist = Math.hypot(dx, dy);

            if (dist < 130 && dist > 0.001) {
              const repel = (1 - dist / 130) * 8.5;
              p.vx += (dx / dist) * repel;
              p.vy += (dy / dist) * repel;
            }
          }
        }

        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;
        p.phase += p.phaseSpeed;

        const depth = fov + p.z;
        if (depth <= 60) continue;

        const scale = fov / depth;
        const screenX = centerX + p.x * scale;
        const screenY = centerY + p.y * scale;

        if (
          screenX < -15 ||
          screenX > width + 15 ||
          screenY < -15 ||
          screenY > height + 15
        ) {
          continue;
        }

        const radius = Math.max(0.6, p.baseSize * p.sizeMult * scale);
        const shimmer =
          p.layerPriority >= 3
            ? 0.88 + 0.12 * Math.sin(p.phase)
            : 0.68 + 0.32 * Math.sin(p.phase);
        const depthAlpha = Math.min(1, Math.max(0.25, (scale - 0.28) * 1.15));

        ctx.globalAlpha = shimmer * depthAlpha;
        ctx.fillStyle = p.brandColor;

        if (radius < 1.35) {
          const d = radius * 1.95;
          ctx.fillRect(screenX - radius, screenY - radius, d, d);
        } else {
          ctx.beginPath();
          ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen, buildFormations]);

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    const point = "touches" in e ? e.touches[0] : e;
    if (!point) return;
    mouseRef.current.x = point.clientX;
    mouseRef.current.y = point.clientY;
    mouseRef.current.active = true;
  };

  const handlePointerLeave = () => {
    mouseRef.current.active = false;
    mouseRef.current.x = -9999;
    mouseRef.current.y = -9999;
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ShasthoSetu AI Clinical Particle Intro"
      onMouseMove={handlePointerMove}
      onTouchMove={handlePointerMove}
      onMouseLeave={handlePointerLeave}
      onTouchEnd={handlePointerLeave}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        overflow: "hidden",
        background: "#020612",
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        userSelect: "none",
        opacity: isTransitioningOut ? 0 : 1,
        transform: isTransitioningOut ? "scale(1.04)" : "scale(1)",
        transition:
          "opacity 520ms cubic-bezier(0.22, 1, 0.36, 1), transform 520ms cubic-bezier(0.22, 1, 0.36, 1)",
        pointerEvents: isTransitioningOut ? "none" : "auto",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
          cursor: "crosshair",
        }}
      />

      {/* ShasthoSetu Dark Sapphire & Cyan Glassmorphic Skip Intro Button */}
      <button
        type="button"
        data-testid="skip-preloader-btn"
        onClick={() => triggerExit(400)}
        onMouseEnter={() => setSkipHovered(true)}
        onMouseLeave={() => setSkipHovered(false)}
        title="Skip intro (Esc)"
        style={{
          position: "absolute",
          bottom: "1.25rem",
          right: "1.25rem",
          zIndex: 30,
          minHeight: "44px",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.45rem",
          padding: "0.5rem 0.95rem",
          borderRadius: "999px",
          background: skipHovered
            ? "rgba(14, 165, 233, 0.22)"
            : "rgba(5, 14, 29, 0.85)",
          border: skipHovered
            ? "1px solid rgba(56, 189, 248, 0.65)"
            : "1px solid rgba(56, 189, 248, 0.32)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          color: "#38bdf8",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.75rem",
          fontWeight: 600,
          letterSpacing: "0.03em",
          cursor: "pointer",
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.5)",
          transition: "background 180ms ease, border-color 180ms ease, transform 180ms ease",
          transform: skipHovered ? "translateY(-1px)" : "translateY(0)",
        }}
      >
        <span>Skip Intro (Esc)</span>
        <FastForward size={13} />
      </button>

      {/* Hairline 2px Bottom Progress Bar (ShasthoSetu Blue -> Cyan -> Emerald) */}
      <div
        aria-hidden="true"
        style={{
          pointerEvents: "none",
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "2px",
          background: "rgba(255, 255, 255, 0.08)",
          zIndex: 20,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background:
              "linear-gradient(90deg, #0284c7 0%, #06b6d4 35%, #10b981 70%, #38bdf8 100%)",
            transition: "width 120ms linear",
          }}
        />
      </div>
    </div>
  );
}

export default ShasthoSetuParticlePreloader;
