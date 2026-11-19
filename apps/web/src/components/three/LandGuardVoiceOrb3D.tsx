import React, { Component, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Mic } from "lucide-react";
import { usePreferences } from "../../lib/preferences";

export type VoiceOrbState = "IDLE" | "LISTENING" | "PROCESSING" | "SPEAKING" | "ERROR";

class OrbErrorBoundary extends Component<
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

const STATE_PALETTES: Record<VoiceOrbState, { hex: string; secondary: string; speed: number; radiusAmp: number }> = {
  IDLE: { hex: "#00f2fe", secondary: "#38bdf8", speed: 0.35, radiusAmp: 0.08 },
  LISTENING: { hex: "#22d3ee", secondary: "#2dd4bf", speed: 0.92, radiusAmp: 0.24 },
  PROCESSING: { hex: "#a855f7", secondary: "#818cf8", speed: 1.45, radiusAmp: 0.2 },
  SPEAKING: { hex: "#ff2a85", secondary: "#00f2fe", speed: 0.85, radiusAmp: 0.26 },
  ERROR: { hex: "#fb7185", secondary: "#f43f5e", speed: 0.25, radiusAmp: 0.06 },
};

function KineticVoiceOrbMesh({
  orbState,
  audioLevelRef,
  paused,
}: {
  orbState: VoiceOrbState;
  audioLevelRef: React.MutableRefObject<number>;
  paused: boolean;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const gyroOuterRef = useRef<THREE.Mesh>(null);
  const gyroInnerRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);

  const cfg = STATE_PALETTES[orbState];

  // Pre-compute 180 Fibonacci-sphere base unit directions & static edge neighbor index pairs (0 allocations in useFrame)
  const { baseDirs, initialPos, edgePairs, initialLinePos } = useMemo(() => {
    const N = 180;
    const dirs = new Float32Array(N * 3);
    const pos = new Float32Array(N * 3);
    const r0 = 1.08;
    for (let i = 0; i < N; i += 1) {
      const phi = Math.acos(-1 + (2 * (i + 0.5)) / N);
      const theta = Math.sqrt(N * Math.PI) * phi;
      const x = Math.cos(theta) * Math.sin(phi);
      const y = Math.sin(theta) * Math.sin(phi);
      const z = Math.cos(phi);
      dirs[i * 3] = x;
      dirs[i * 3 + 1] = y;
      dirs[i * 3 + 2] = z;
      pos[i * 3] = x * r0;
      pos[i * 3 + 1] = y * r0;
      pos[i * 3 + 2] = z * r0;
    }

    const pairs: number[] = [];
    for (let i = 0; i < N; i += 1) {
      const ax = dirs[i * 3];
      const ay = dirs[i * 3 + 1];
      const az = dirs[i * 3 + 2];
      let linked = 0;
      for (let j = i + 1; j < N && linked < 2; j += 1) {
        const dx = ax - dirs[j * 3];
        const dy = ay - dirs[j * 3 + 1];
        const dz = az - dirs[j * 3 + 2];
        if (dx * dx + dy * dy + dz * dz < 0.24) {
          pairs.push(i, j);
          linked += 1;
        }
      }
    }
    const linePos = new Float32Array(pairs.length * 3);
    for (let k = 0; k < pairs.length; k += 1) {
      const pIdx = pairs[k];
      linePos[k * 3] = pos[pIdx * 3];
      linePos[k * 3 + 1] = pos[pIdx * 3 + 1];
      linePos[k * 3 + 2] = pos[pIdx * 3 + 2];
    }
    return { baseDirs: dirs, initialPos: pos, edgePairs: pairs, initialLinePos: linePos };
  }, []);

  const pointsGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(initialPos, 3));
    return geo;
  }, [initialPos]);

  const linesGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(initialLinePos, 3));
    return geo;
  }, [initialLinePos]);

  useEffect(() => {
    return () => {
      pointsGeo.dispose();
      linesGeo.dispose();
    };
  }, [pointsGeo, linesGeo]);

  useFrame((state, delta) => {
    const t = paused ? 0 : state.clock.elapsedTime;
    const audioBoost = paused ? 0 : Math.min(0.45, Math.max(0, audioLevelRef.current));

    if (rootRef.current) {
      if (!paused) {
        rootRef.current.rotation.y += delta * cfg.speed;
        rootRef.current.rotation.x = Math.sin(t * 0.45) * 0.16;
      }
    }
    if (gyroOuterRef.current && !paused) {
      gyroOuterRef.current.rotation.z += delta * 0.45;
      gyroOuterRef.current.rotation.x += delta * 0.22;
    }
    if (gyroInnerRef.current && !paused) {
      gyroInnerRef.current.rotation.z -= delta * 0.62;
      gyroInnerRef.current.rotation.y += delta * 0.28;
    }
    if (coreRef.current) {
      const s = paused ? 1 : 0.94 + Math.sin(t * 3.4) * 0.08 + audioBoost * 0.55;
      coreRef.current.scale.set(s, s, s);
    }

    if (!paused && pointsRef.current && linesRef.current) {
      const pAttr = pointsGeo.getAttribute("position") as THREE.BufferAttribute;
      const pArr = pAttr.array as Float32Array;
      const amp = cfg.radiusAmp + audioBoost * 0.38;

      for (let i = 0; i < 180; i += 1) {
        const bx = baseDirs[i * 3];
        const by = baseDirs[i * 3 + 1];
        const bz = baseDirs[i * 3 + 2];
        const wave = Math.sin(t * 2.8 + i * 0.43) * amp + Math.cos(t * 1.9 + by * 4.0) * (amp * 0.35);
        const r = 1.06 + wave;
        pArr[i * 3] = bx * r;
        pArr[i * 3 + 1] = by * r;
        pArr[i * 3 + 2] = bz * r;
      }
      pAttr.needsUpdate = true;

      const lAttr = linesGeo.getAttribute("position") as THREE.BufferAttribute;
      const lArr = lAttr.array as Float32Array;
      for (let k = 0; k < edgePairs.length; k += 1) {
        const idx = edgePairs[k];
        lArr[k * 3] = pArr[idx * 3];
        lArr[k * 3 + 1] = pArr[idx * 3 + 1];
        lArr[k * 3 + 2] = pArr[idx * 3 + 2];
      }
      lAttr.needsUpdate = true;
    }
  });

  return (
    <>
      <ambientLight intensity={0.75} />
      <pointLight position={[3, 3, 4]} intensity={1.45} color={cfg.hex} />
      <pointLight position={[-3, -2, 3]} intensity={1.1} color={cfg.secondary} />

      <group ref={rootRef}>
        {/* Draw Call 1: Inner Translucent Energy Core */}
        <mesh ref={coreRef}>
          <sphereGeometry args={[0.42, 20, 20]} />
          <meshStandardMaterial
            color={cfg.hex}
            emissive={cfg.hex}
            emissiveIntensity={1.25}
            transparent
            opacity={0.72}
          />
        </mesh>

        {/* Draw Call 2: 180 Kinetic Fibonacci Particle Nodes */}
        <points ref={pointsRef} geometry={pointsGeo}>
          <pointsMaterial color={cfg.hex} size={0.075} sizeAttenuation transparent opacity={0.92} />
        </points>

        {/* Draw Call 3: Quantum Energy Thread Lattice */}
        <lineSegments ref={linesRef} geometry={linesGeo}>
          <lineBasicMaterial color={cfg.secondary} transparent opacity={0.34} />
        </lineSegments>
      </group>

      {/* Draw Call 4 & 5: Counter-Rotating Holographic Gyro Rings */}
      <mesh ref={gyroOuterRef} rotation={[Math.PI / 3.1, 0.35, 0]}>
        <torusGeometry args={[1.48, 0.014, 10, 64]} />
        <meshStandardMaterial color={cfg.hex} emissive={cfg.hex} emissiveIntensity={1.1} transparent opacity={0.68} />
      </mesh>
      <mesh ref={gyroInnerRef} rotation={[-Math.PI / 2.6, 0.55, 0]}>
        <torusGeometry args={[1.28, 0.011, 10, 56]} />
        <meshStandardMaterial color={cfg.secondary} emissive={cfg.secondary} emissiveIntensity={0.95} transparent opacity={0.5} />
      </mesh>
    </>
  );
}

export function LandGuardVoiceOrb3D({
  state,
  audioLevelRef,
  onClick,
  label,
  className = "",
}: {
  state: VoiceOrbState;
  audioLevelRef: React.MutableRefObject<number>;
  onClick?: () => void;
  label?: string;
  className?: string;
}) {
  const { motionPaused } = usePreferences();
  const palette = STATE_PALETTES[state];

  const fallbackOrb = (
    <div className="w-full h-full flex flex-col items-center justify-center relative">
      <div
        className="w-28 h-28 rounded-full border-2 flex items-center justify-center shadow-2xl"
        style={{
          borderColor: palette.hex,
          background: `radial-gradient(circle, ${palette.hex}44 0%, #040b1b 75%)`,
          boxShadow: `0 0 36px ${palette.hex}55`,
        }}
      >
        <Mic className="w-10 h-10" style={{ color: palette.hex }} />
      </div>
    </div>
  );

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`relative rounded-3xl border border-cyan-400/30 bg-[#040a18]/90 h-[270px] sm:h-[300px] flex items-center justify-center overflow-hidden ${
        onClick ? "cursor-pointer group" : ""
      } ${className}`}
    >
      {/* Land-Guard HUD Corner Notches */}
      <span aria-hidden="true" className="pointer-events-none absolute top-2.5 left-2.5 w-3.5 h-3.5 border-t-2 border-l-2 border-cyan-400/75" />
      <span aria-hidden="true" className="pointer-events-none absolute top-2.5 right-2.5 w-3.5 h-3.5 border-t-2 border-r-2 border-cyan-400/75" />
      <span aria-hidden="true" className="pointer-events-none absolute bottom-2.5 left-2.5 w-3.5 h-3.5 border-b-2 border-l-2 border-cyan-400/75" />
      <span aria-hidden="true" className="pointer-events-none absolute bottom-2.5 right-2.5 w-3.5 h-3.5 border-b-2 border-r-2 border-cyan-400/75" />

      {/* Subtle Concentric Cyber Compass Ring */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute w-56 h-56 rounded-full border border-dashed opacity-25"
        style={{ borderColor: palette.hex }}
      />

      <div className="w-full h-full">
        <OrbErrorBoundary fallback={fallbackOrb}>
          <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 4.15], fov: 40 }} gl={{ alpha: true, antialias: true }}>
            <KineticVoiceOrbMesh orbState={state} audioLevelRef={audioLevelRef} paused={motionPaused} />
          </Canvas>
        </OrbErrorBoundary>
      </div>

      {/* Bottom Floating HUD Prompt Pill */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-[#020816]/90 border border-cyan-400/40 font-mono text-[11px] font-bold flex items-center gap-2 whitespace-nowrap shadow-lg">
        <span
          className={`w-2 h-2 rounded-full ${motionPaused ? "" : "animate-ping"}`}
          style={{ backgroundColor: palette.hex }}
        />
        <span style={{ color: palette.hex }}>
          {label ||
            (state === "LISTENING"
              ? "LISTENING (16kHz MIC)..."
              : state === "PROCESSING"
                ? "WHISPER-BN / RAG RUNNING..."
                : state === "SPEAKING"
                  ? "SPEAKING NEURAL AUDIO..."
                  : state === "ERROR"
                    ? "CHECK MIC PERMISSION"
                    : "CLICK 3D ORB OR MIC TO SPEAK")}
        </span>
      </div>
    </div>
  );
}
