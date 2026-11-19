import React, { Component, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { usePreferences } from "../../lib/preferences";

export type AiModuleKey =
  | "pcos-clinical"
  | "pcos-ultrasound"
  | "viral-rash"
  | "prescription-ocr"
  | "bangla-voice"
  | "dermoped";

class Module3DErrorBoundary extends Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

const MODULE_ACCENTS: Record<AiModuleKey, string> = {
  "pcos-clinical": "#38bdf8",
  "pcos-ultrasound": "#2dd4bf",
  "viral-rash": "#818cf8",
  "prescription-ocr": "#f2c879",
  "bangla-voice": "#c084fc",
  dermoped: "#34d399",
};

function ModuleStageMesh({
  moduleKey,
  scanning,
  confidence,
  paused,
}: {
  moduleKey: AiModuleKey;
  scanning: boolean;
  confidence: number | null;
  paused: boolean;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const laserPlaneRef = useRef<THREE.Mesh>(null);
  const waveRingRef = useRef<THREE.Mesh>(null);

  const color = MODULE_ACCENTS[moduleKey];
  const intensity = confidence !== null ? 0.5 + confidence * 0.8 : 0.6;

  const clusterPoints = useMemo(() => {
    const pts: Array<[number, number, number]> = [];
    for (let i = 0; i < 16; i += 1) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / 16);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 1.65;
      pts.push([r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi)]);
    }
    return pts;
  }, []);

  useFrame((state, delta) => {
    if (paused) return;
    const speed = scanning ? 1.45 : 0.35;
    if (rootRef.current) {
      rootRef.current.rotation.y += delta * speed;
      rootRef.current.rotation.x = THREE.MathUtils.lerp(rootRef.current.rotation.x, state.pointer.y * 0.25, 0.06);
      rootRef.current.rotation.z = THREE.MathUtils.lerp(rootRef.current.rotation.z, -state.pointer.x * 0.18, 0.06);
    }
    if (laserPlaneRef.current) {
      laserPlaneRef.current.position.y = Math.sin(state.clock.elapsedTime * (scanning ? 4.5 : 1.6)) * 1.1;
    }
    if (waveRingRef.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * (scanning ? 5 : 2)) * 0.18;
      waveRingRef.current.scale.set(s, s, s);
    }
  });

  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[4, 6, 5]} intensity={1.5} color="#f0f9ff" />
      <pointLight position={[-4, -3, 3]} intensity={1.3} color={color} />

      <group ref={rootRef}>
        {moduleKey === "prescription-ocr" && (
          <>
            {/* 3D Floating Prescription Sheet Hologram + Sweeping Laser Sheet */}
            <mesh rotation={[-0.12, 0.18, 0]}>
              <boxGeometry args={[2.1, 2.75, 0.08]} />
              <meshStandardMaterial color="#0b1d3d" emissive={color} emissiveIntensity={0.22} transparent opacity={0.88} />
            </mesh>
            {[-0.85, -0.45, -0.05, 0.35, 0.75].map((yPos, idx) => (
              <mesh key={idx} position={[0, yPos, 0.08]} rotation={[-0.12, 0.18, 0]}>
                <boxGeometry args={[idx % 2 === 0 ? 1.55 : 1.2, 0.14, 0.04]} />
                <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={scanning ? 1.1 : 0.65} />
              </mesh>
            ))}
            <mesh ref={laserPlaneRef} position={[0, 0, 0.18]} rotation={[-0.12, 0.18, 0]}>
              <boxGeometry args={[2.4, 0.06, 0.25]} />
              <meshStandardMaterial color="#2dd4bf" emissive="#2dd4bf" emissiveIntensity={1.6} />
            </mesh>
          </>
        )}

        {(moduleKey === "viral-rash" || moduleKey === "dermoped") && (
          <>
            {/* Multi-Layer Convolutional Feature Tensor Planes + Output Bars */}
            {[-1.1, -0.35, 0.4, 1.15].map((zOff, idx) => (
              <mesh key={idx} position={[0, 0, zOff]} rotation={[0.1, 0.2, 0]}>
                <boxGeometry args={[2.2 - idx * 0.28, 2.2 - idx * 0.28, 0.06]} />
                <meshStandardMaterial
                  color={idx === 3 ? "#f2c879" : color}
                  emissive={idx === 3 ? "#f2c879" : color}
                  emissiveIntensity={intensity}
                  wireframe={idx % 2 === 0}
                  transparent
                  opacity={0.72}
                />
              </mesh>
            ))}
            <mesh ref={waveRingRef} rotation={[Math.PI / 3, 0.3, 0]}>
              <torusGeometry args={[2.2, 0.03, 12, 64]} />
              <meshStandardMaterial color="#f2c879" emissive="#f2c879" emissiveIntensity={0.8} />
            </mesh>
          </>
        )}

        {moduleKey === "pcos-ultrasound" && (
          <>
            {/* Volumetric Acoustic Mesh Sphere + Pulsing Ultrasound Waves */}
            <mesh>
              <sphereGeometry args={[1.32, 24, 18]} />
              <meshStandardMaterial color={color} wireframe emissive={color} emissiveIntensity={intensity} transparent opacity={0.62} />
            </mesh>
            {[0.8, 1.15, 1.5].map((rVal, idx) => (
              <mesh key={idx} ref={idx === 1 ? waveRingRef : undefined} rotation={[Math.PI / 2.2, idx * 0.4, 0]}>
                <torusGeometry args={[rVal + 0.5, 0.025, 12, 64]} />
                <meshStandardMaterial color={idx === 2 ? "#f2c879" : color} emissive={color} emissiveIntensity={0.75} />
              </mesh>
            ))}
          </>
        )}

        {moduleKey === "pcos-clinical" && (
          <>
            {/* XGBoost Biomarker Molecular Cluster */}
            <mesh>
              <octahedronGeometry args={[0.92, 1]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} wireframe />
            </mesh>
            {clusterPoints.map((pt, idx) => (
              <mesh key={idx} position={pt}>
                <sphereGeometry args={[idx % 4 === 0 ? 0.13 : 0.08, 12, 12]} />
                <meshStandardMaterial
                  color={idx % 4 === 0 ? "#f2c879" : "#2dd4bf"}
                  emissive={idx % 4 === 0 ? "#f2c879" : color}
                  emissiveIntensity={0.9}
                />
              </mesh>
            ))}
          </>
        )}

        {moduleKey === "bangla-voice" && (
          <>
            {/* Phase G Acoustic Equalizer Rings */}
            {[0.85, 1.3, 1.75, 2.2].map((rVal, idx) => (
              <mesh key={idx} rotation={[idx * 0.45, idx * 0.35, 0]}>
                <torusGeometry args={[rVal, 0.032, 14, 72]} />
                <meshStandardMaterial color={idx % 2 === 0 ? "#c084fc" : "#f2c879"} emissive="#c084fc" emissiveIntensity={0.75} transparent opacity={0.8} />
              </mesh>
            ))}
          </>
        )}
      </group>
    </>
  );
}

export function AiModuleScene3D({
  moduleKey,
  scanning = false,
  confidence = null,
  customBadge,
  className = "w-full h-full min-h-[210px]",
}: {
  moduleKey: AiModuleKey;
  scanning?: boolean;
  confidence?: number | null;
  customBadge?: string;
  className?: string;
}) {
  const { motionPaused } = usePreferences();
  const hostRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const fallback = (
    <div className="w-full h-full flex items-center justify-center bg-[#061228]/80 rounded-2xl border border-sky-400/20">
      <div className="text-center space-y-1">
        <div
          className="w-16 h-16 mx-auto rounded-full border-2 border-dashed flex items-center justify-center font-mono text-xs font-bold"
          style={{ borderColor: MODULE_ACCENTS[moduleKey], color: MODULE_ACCENTS[moduleKey] }}
        >
          3D AI
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400">{moduleKey}</span>
      </div>
    </div>
  );

  return (
    <div ref={hostRef} className={`${className} rounded-2xl overflow-hidden bg-[#040a18]/90 border border-sky-400/25 relative`}>
      {mounted && !motionPaused ? (
        <Module3DErrorBoundary fallback={fallback}>
          <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 5.2], fov: 42 }}>
            <ModuleStageMesh moduleKey={moduleKey} scanning={scanning} confidence={confidence} paused={motionPaused || !inView} />
          </Canvas>
        </Module3DErrorBoundary>
      ) : (
        fallback
      )}
      <div className="pointer-events-none absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] font-mono text-slate-300">
        <span className="px-2 py-0.5 rounded bg-black/60 border border-white/10 truncate">
          {customBadge || `WEBGL NEURAL STAGE • ${moduleKey.toUpperCase()}`}
        </span>
        {confidence !== null && (
          <span className="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 text-sky-200">
            CONF {(confidence * 100).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}
