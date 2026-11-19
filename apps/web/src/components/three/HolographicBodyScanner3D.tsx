import React, { Component, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Activity, Droplets, Pause, Play, Scan, ShieldCheck } from "lucide-react";
import { usePreferences } from "../../lib/preferences";
import { subscribeTelemetryTick } from "../charts/AgriStyleTelemetry";

class ScannerErrorBoundary extends Component<
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

/* ============================================================================
   1. STANDALONE 3D BEATING HEART CANVAS (Video Bottom-Right Panel + Blood Connect)
   ============================================================================ */
function BeatingHeartMesh({ bpm, paused }: { bpm: number; paused: boolean }) {
  const heartGroupRef = useRef<THREE.Group>(null);
  const auraRingRef = useRef<THREE.Mesh>(null);
  const myoMatLeftRef = useRef<THREE.MeshStandardMaterial>(null);
  const myoMatRightRef = useRef<THREE.MeshStandardMaterial>(null);
  const wireMatRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state, delta) => {
    const beatHz = Math.max(0.6, bpm / 60);
    const t = paused ? 0.14 : (state.clock.elapsedTime * beatHz) % 1;
    // Realistic double-peak lub-dub cardiac contraction curve
    const sys1 = Math.exp(-Math.pow((t - 0.14) / 0.055, 2));
    const sys2 = 0.65 * Math.exp(-Math.pow((t - 0.31) / 0.065, 2));
    const pulse = Math.max(sys1, sys2);
    const scale = 1 + pulse * 0.17;

    if (heartGroupRef.current) {
      heartGroupRef.current.scale.set(scale, scale * (1 - pulse * 0.04), scale);
      if (!paused) {
        heartGroupRef.current.rotation.y += delta * 0.58;
        heartGroupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.4) * 0.06;
      }
    }
    if (auraRingRef.current) {
      const ringScale = 1 + pulse * 0.24;
      auraRingRef.current.scale.set(ringScale, ringScale, ringScale);
    }
    if (myoMatLeftRef.current) {
      myoMatLeftRef.current.emissiveIntensity = 0.55 + pulse * 0.95;
    }
    if (myoMatRightRef.current) {
      myoMatRightRef.current.emissiveIntensity = 0.48 + pulse * 0.85;
    }
    if (wireMatRef.current) {
      wireMatRef.current.emissiveIntensity = 0.4 + pulse * 0.75;
    }
  });

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 5]} intensity={1.35} color="#f8fafc" />
      <pointLight position={[-2.5, -2, 3]} intensity={1.5} color="#fb7185" />
      <pointLight position={[2.2, 2.2, 2.5]} intensity={1.1} color="#2dd4bf" />

      <group ref={heartGroupRef} position={[0, -0.05, 0]}>
        {/* Left & Right Ventricle Sculpted Chambers */}
        <mesh position={[-0.26, -0.06, 0.08]} rotation={[0.1, 0.2, 0.34]} scale={[0.92, 1.32, 0.88]}>
          <sphereGeometry args={[0.56, 24, 24]} />
          <meshStandardMaterial
            ref={myoMatLeftRef}
            color="#e11d48"
            emissive="#fb7185"
            emissiveIntensity={0.7}
            roughness={0.28}
            metalness={0.2}
            transparent
            opacity={0.86}
          />
        </mesh>

        <mesh position={[0.25, 0.04, -0.04]} rotation={[-0.08, -0.18, -0.28]} scale={[0.82, 1.15, 0.78]}>
          <sphereGeometry args={[0.48, 22, 22]} />
          <meshStandardMaterial
            ref={myoMatRightRef}
            color="#be123c"
            emissive="#f43f5e"
            emissiveIntensity={0.6}
            roughness={0.32}
            metalness={0.2}
            transparent
            opacity={0.82}
          />
        </mesh>

        {/* Translucent Cyan/Teal Coronary Wireframe Overlay */}
        <mesh position={[-0.02, -0.02, 0.02]} scale={[1.04, 1.28, 0.96]}>
          <icosahedronGeometry args={[0.72, 2]} />
          <meshStandardMaterial
            ref={wireMatRef}
            color="#2dd4bf"
            emissive="#22d3ee"
            emissiveIntensity={0.55}
            wireframe
            transparent
            opacity={0.45}
          />
        </mesh>

        {/* Superior Aortic Arch & Pulmonary Outflow Vessels */}
        <mesh position={[0.04, 0.68, -0.02]} rotation={[0.1, 0.2, -0.15]}>
          <torusGeometry args={[0.28, 0.085, 14, 32, Math.PI * 1.15]} />
          <meshStandardMaterial color="#fb7185" emissive="#e11d48" emissiveIntensity={0.55} roughness={0.35} />
        </mesh>
        <mesh position={[-0.22, 0.58, 0.12]} rotation={[0.2, 0, 0.3]}>
          <cylinderGeometry args={[0.075, 0.095, 0.45, 16]} />
          <meshStandardMaterial color="#38bdf8" emissive="#22d3ee" emissiveIntensity={0.65} transparent opacity={0.82} />
        </mesh>
      </group>

      {/* Outer Equatorial Telemetry Ring */}
      <mesh ref={auraRingRef} rotation={[Math.PI / 2.6, 0.25, 0]}>
        <torusGeometry args={[1.18, 0.018, 12, 64]} />
        <meshStandardMaterial color="#2dd4bf" emissive="#22d3ee" emissiveIntensity={0.9} transparent opacity={0.7} />
      </mesh>
    </>
  );
}

export function BeatingHeart3D({
  compact = false,
  bpm = 76,
  className = "",
}: {
  compact?: boolean;
  bpm?: number;
  className?: string;
}) {
  const { motionPaused } = usePreferences();

  const fallbackSvg = (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#030916] text-rose-300">
      <Activity className="w-8 h-8 animate-pulse" />
      <span className="font-mono text-[10px] mt-1">{bpm} BPM TELEMETRY</span>
    </div>
  );

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-rose-400/35 bg-[#030916]/90 ${
        compact ? "h-40" : "h-52"
      } ${className}`}
    >
      <ScannerErrorBoundary fallback={fallbackSvg}>
        <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0.05, 3.25], fov: 39 }} gl={{ alpha: true, antialias: true }}>
          <BeatingHeartMesh bpm={bpm} paused={motionPaused} />
        </Canvas>
      </ScannerErrorBoundary>

      <div className="pointer-events-none absolute top-2 left-2.5 flex items-center gap-1.5 font-mono text-[9.5px] font-bold tracking-wider text-rose-300 uppercase">
        <span className={`w-1.5 h-1.5 rounded-full bg-rose-400 ${motionPaused ? "" : "animate-ping"}`} />
        <span>CARDIAC FLOW • {bpm} BPM</span>
      </div>
      {!compact && (
        <div className="pointer-events-none absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between font-mono text-[9px] text-teal-300/85">
          <span>COORDINATED TWIN</span>
          <span>SYNC ACTIVE</span>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   2. FULL 3D HOLOGRAPHIC HUMAN BODY VOLUMETRIC SCANNER (3-COLUMN HUD REPLICA)
   ============================================================================ */
type ScanZoneKey = "auto" | "cranial" | "thorax" | "pelvic" | "dermal";

interface ScanZoneMeta {
  key: ScanZoneKey;
  label: string;
  tag: string;
  targetY: number;
  moduleSlug: string;
  accent: string;
}

const SCAN_ZONES: ScanZoneMeta[] = [
  { key: "auto", label: "Full Sweep", tag: "AUTO SCANNER", targetY: 0, moduleSlug: "viral-rash", accent: "#22d3ee" },
  { key: "cranial", label: "M05 Cranial", tag: "M05 VOICE / NEURO", targetY: 1.46, moduleSlug: "bangla-voice", accent: "#c084fc" },
  { key: "thorax", label: "Cardiac / Blood", tag: "THORAX • BLOOD CONNECT", targetY: 0.56, moduleSlug: "pcos-clinical", accent: "#fb7185" },
  { key: "pelvic", label: "M01/M02 Pelvic", tag: "M01/M02 PCOS ENDOCRINE", targetY: -0.18, moduleSlug: "pcos-ultrasound", accent: "#2dd4bf" },
  { key: "dermal", label: "M03/M06 Dermal", tag: "M03/M06 DERM TRIAGE", targetY: -0.68, moduleSlug: "viral-rash", accent: "#818cf8" },
];

function HolographicBodyScene({
  activeZone,
  paused,
  scanReadoutRef,
}: {
  activeZone: ScanZoneKey;
  paused: boolean;
  scanReadoutRef: React.RefObject<HTMLSpanElement | null>;
}) {
  const figureGroupRef = useRef<THREE.Group>(null);
  const scanBandGroupRef = useRef<THREE.Group>(null);
  const heartInnerRef = useRef<THREE.Mesh>(null);
  const cranialMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const lungMatLeftRef = useRef<THREE.MeshStandardMaterial>(null);
  const lungMatRightRef = useRef<THREE.MeshStandardMaterial>(null);
  const heartMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const ribMatRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const pelvicMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const dermalMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const currentScanYRef = useRef<number>(0.4);

  // Smooth anatomically proportioned LatheGeometry torso -> hips profile
  const torsoGeo = useMemo(() => {
    const profile = [
      new THREE.Vector2(0.01, -0.58), // pelvis base
      new THREE.Vector2(0.39, -0.52), // hips
      new THREE.Vector2(0.41, -0.25), // iliac crest
      new THREE.Vector2(0.33, 0.06),  // waist
      new THREE.Vector2(0.42, 0.44),  // ribcage
      new THREE.Vector2(0.49, 0.76),  // chest / pectorals
      new THREE.Vector2(0.44, 0.94),  // upper trap / clavicle
      new THREE.Vector2(0.16, 1.06),  // neck base
      new THREE.Vector2(0.01, 1.12),
    ];
    return new THREE.LatheGeometry(profile, 32);
  }, []);

  useEffect(() => {
    return () => {
      torsoGeo.dispose();
    };
  }, [torsoGeo]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    // 1. Rotate & mouse-parallax the 3D holographic body figure
    if (figureGroupRef.current) {
      if (!paused) {
        figureGroupRef.current.rotation.y += delta * 0.34;
      }
      figureGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        figureGroupRef.current.rotation.x,
        state.pointer.y * 0.14,
        0.05
      );
      figureGroupRef.current.rotation.z = THREE.MathUtils.lerp(
        figureGroupRef.current.rotation.z,
        -state.pointer.x * 0.1,
        0.05
      );
    }

    // 2. Sweep or lock volumetric cylindrical scan ring along anatomical Y axis
    let targetY = currentScanYRef.current;
    if (activeZone === "auto") {
      if (!paused) {
        targetY = Math.sin(t * 0.72) * 1.56;
      }
    } else {
      const zoneDef = SCAN_ZONES.find((z) => z.key === activeZone);
      const base = zoneDef ? zoneDef.targetY : 0;
      targetY = base + (paused ? 0 : Math.sin(t * 2.2) * 0.08);
    }
    currentScanYRef.current = THREE.MathUtils.lerp(currentScanYRef.current, targetY, 0.08);
    const sy = currentScanYRef.current;

    if (scanBandGroupRef.current) {
      scanBandGroupRef.current.position.y = sy;
      if (!paused) {
        scanBandGroupRef.current.rotation.y -= delta * 0.65;
      }
    }

    // Update HUD Y readout via DOM ref (0 React re-renders per frame)
    if (scanReadoutRef.current) {
      const zoneText =
        sy > 1.05
          ? "CRANIAL"
          : sy > 0.18
            ? "THORAX / CARDIAC"
            : sy > -0.55
              ? "PELVIC / ENDOCRINE"
              : "DERMAL / LOWER";
      scanReadoutRef.current.textContent = `PLANE Y: ${sy >= 0 ? "+" : ""}${sy.toFixed(2)}m • ${zoneText}`;
    }

    // 3. Dynamic X-ray internal organ illumination as scan cylinder crosses Y band
    const proxCranial = THREE.MathUtils.clamp(1 - Math.abs(sy - 1.46) / 0.55, 0, 1);
    const proxThorax = THREE.MathUtils.clamp(1 - Math.abs(sy - 0.56) / 0.62, 0, 1);
    const proxPelvic = THREE.MathUtils.clamp(1 - Math.abs(sy - -0.18) / 0.52, 0, 1);
    const proxDermal = THREE.MathUtils.clamp(1 - Math.abs(sy - -0.68) / 0.6, 0, 1);

    if (cranialMatRef.current) {
      cranialMatRef.current.emissiveIntensity = 0.28 + proxCranial * 1.65;
      cranialMatRef.current.opacity = 0.34 + proxCranial * 0.52;
    }
    if (lungMatLeftRef.current && lungMatRightRef.current) {
      const lungEmissive = 0.28 + proxThorax * 1.5;
      const lungOp = 0.25 + proxThorax * 0.45;
      lungMatLeftRef.current.emissiveIntensity = lungEmissive;
      lungMatLeftRef.current.opacity = lungOp;
      lungMatRightRef.current.emissiveIntensity = lungEmissive;
      lungMatRightRef.current.opacity = lungOp;
    }
    ribMatRefs.current.forEach((rm) => {
      if (rm) {
        rm.emissiveIntensity = 0.22 + proxThorax * 1.25;
        rm.opacity = 0.28 + proxThorax * 0.65;
      }
    });

    // Internal heart also maintains 76 BPM pulse
    const hBeatPhase = paused ? 0.14 : (t * (76 / 60)) % 1;
    const hBeat = Math.exp(-Math.pow((hBeatPhase - 0.14) / 0.06, 2));
    if (heartInnerRef.current) {
      const hs = 1 + hBeat * 0.22;
      heartInnerRef.current.scale.set(hs, hs, hs);
    }
    if (heartMatRef.current) {
      heartMatRef.current.emissiveIntensity = 0.65 + proxThorax * 1.3 + hBeat * 0.8;
    }
    if (pelvicMatRef.current) {
      pelvicMatRef.current.emissiveIntensity = 0.35 + proxPelvic * 1.55;
      pelvicMatRef.current.opacity = 0.35 + proxPelvic * 0.55;
    }
    if (dermalMatRef.current) {
      dermalMatRef.current.emissiveIntensity = 0.35 + proxDermal * 1.5;
      dermalMatRef.current.opacity = 0.35 + proxDermal * 0.55;
    }
  });

  const ribYPositions = [0.78, 0.64, 0.5, 0.36, 0.23];

  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[4, 6, 5]} intensity={1.35} color="#e0f2fe" />
      <pointLight position={[-4, 2, 4]} intensity={1.4} color="#22d3ee" />
      <pointLight position={[3, -2, -3]} intensity={1.1} color="#818cf8" />

      {/* Rotating Full Holographic Body */}
      <group ref={figureGroupRef} position={[0, -0.04, 0]}>
        {/* Sculpted Torso Outer Shell + Subtle Wireframe */}
        <mesh geometry={torsoGeo} scale={[1, 1, 0.62]}>
          <meshStandardMaterial
            color="#0ea5e9"
            emissive="#22d3ee"
            emissiveIntensity={0.42}
            transparent
            opacity={0.2}
            depthWrite={false}
          />
        </mesh>
        <mesh geometry={torsoGeo} scale={[1.015, 1.005, 0.635]}>
          <meshBasicMaterial color="#38bdf8" wireframe transparent opacity={0.13} />
        </mesh>

        {/* Head & Cranium Outer Hologram */}
        <mesh position={[0, 1.46, 0]} scale={[0.92, 1.15, 0.96]}>
          <sphereGeometry args={[0.25, 24, 24]} />
          <meshStandardMaterial
            color="#0ea5e9"
            emissive="#22d3ee"
            emissiveIntensity={0.45}
            transparent
            opacity={0.22}
            depthWrite={false}
          />
        </mesh>
        {/* Neck */}
        <mesh position={[0, 1.14, 0]}>
          <cylinderGeometry args={[0.11, 0.13, 0.24, 16]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.4} transparent opacity={0.22} />
        </mesh>

        {/* Left & Right Shoulders + Arms + Forearms */}
        {([-1, 1] as const).map((side) => (
          <group key={side}>
            <mesh position={[side * 0.5, 0.85, 0]}>
              <sphereGeometry args={[0.125, 16, 16]} />
              <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.4} transparent opacity={0.22} />
            </mesh>
            <mesh position={[side * 0.58, 0.5, 0]} rotation={[0, 0, side * 0.15]}>
              <cylinderGeometry args={[0.095, 0.08, 0.62, 16]} />
              <meshStandardMaterial color="#0ea5e9" emissive="#22d3ee" emissiveIntensity={0.4} transparent opacity={0.2} />
            </mesh>
            <mesh position={[side * 0.67, 0.0, 0.05]} rotation={[-0.14, 0, side * 0.09]}>
              <cylinderGeometry args={[0.075, 0.055, 0.56, 16]} />
              <meshStandardMaterial color="#0ea5e9" emissive="#22d3ee" emissiveIntensity={0.4} transparent opacity={0.2} />
            </mesh>

            {/* Left & Right Thighs + Calves */}
            <mesh position={[side * 0.22, -0.82, 0]} rotation={[0, 0, side * -0.04]}>
              <cylinderGeometry args={[0.155, 0.115, 0.72, 18]} />
              <meshStandardMaterial color="#0ea5e9" emissive="#22d3ee" emissiveIntensity={0.4} transparent opacity={0.2} />
            </mesh>
            <mesh position={[side * 0.24, -1.45, -0.02]}>
              <cylinderGeometry args={[0.108, 0.072, 0.68, 18]} />
              <meshStandardMaterial color="#0ea5e9" emissive="#22d3ee" emissiveIntensity={0.4} transparent opacity={0.2} />
            </mesh>
          </group>
        ))}

        {/* === INTERNAL X-RAY ANATOMICAL LAYERS === */}
        {/* 1. Cranial Neural Sphere (M05 Voice) */}
        <mesh position={[0, 1.47, 0]}>
          <icosahedronGeometry args={[0.16, 1]} />
          <meshStandardMaterial
            ref={cranialMatRef}
            color="#c084fc"
            emissive="#c084fc"
            emissiveIntensity={0.45}
            wireframe
            transparent
            opacity={0.45}
          />
        </mesh>

        {/* 2. Spinal Column Beads + Ribcage Arcs */}
        {Array.from({ length: 10 }, (_, idx) => (
          <mesh key={`sp-${idx}`} position={[0, 0.94 - idx * 0.125, -0.08]}>
            <boxGeometry args={[0.05, 0.07, 0.06]} />
            <meshStandardMaterial color="#bae6fd" emissive="#38bdf8" emissiveIntensity={0.75} />
          </mesh>
        ))}

        {ribYPositions.map((ry, idx) => (
          <mesh
            key={`rib-${idx}`}
            position={[0, ry, 0.02]}
            rotation={[Math.PI / 2.05, 0, Math.PI * 0.14]}
            scale={[1, 0.62, 1]}
          >
            <torusGeometry args={[0.31 - Math.abs(idx - 1.5) * 0.022, 0.012, 8, 36, Math.PI * 1.72]} />
            <meshStandardMaterial
              ref={(el) => {
                ribMatRefs.current[idx] = el;
              }}
              color="#7dd3fc"
              emissive="#38bdf8"
              emissiveIntensity={0.5}
              transparent
              opacity={0.45}
            />
          </mesh>
        ))}

        {/* 3. Translucent Glowing Cyan Lungs */}
        <mesh position={[-0.17, 0.59, 0.02]} rotation={[0, 0, 0.12]} scale={[0.72, 1.32, 0.56]}>
          <sphereGeometry args={[0.19, 18, 18]} />
          <meshStandardMaterial
            ref={lungMatLeftRef}
            color="#22d3ee"
            emissive="#22d3ee"
            emissiveIntensity={0.5}
            transparent
            opacity={0.38}
          />
        </mesh>
        <mesh position={[0.17, 0.59, 0.02]} rotation={[0, 0, -0.12]} scale={[0.72, 1.32, 0.56]}>
          <sphereGeometry args={[0.19, 18, 18]} />
          <meshStandardMaterial
            ref={lungMatRightRef}
            color="#22d3ee"
            emissive="#22d3ee"
            emissiveIntensity={0.5}
            transparent
            opacity={0.38}
          />
        </mesh>

        {/* 4. Internal Pulsing Crimson Heart (Blood Connect Cardiac Core) */}
        <mesh ref={heartInnerRef} position={[0.06, 0.51, 0.08]} scale={[0.92, 1.15, 0.85]}>
          <sphereGeometry args={[0.115, 18, 18]} />
          <meshStandardMaterial
            ref={heartMatRef}
            color="#fb7185"
            emissive="#e11d48"
            emissiveIntensity={1.1}
          />
        </mesh>

        {/* 5. Pelvic / Ovarian Endocrine Cluster (M01/M02 PCOS) */}
        <group position={[0, -0.18, 0.04]}>
          <mesh position={[-0.14, 0, 0]}>
            <sphereGeometry args={[0.072, 14, 14]} />
            <meshStandardMaterial ref={pelvicMatRef} color="#2dd4bf" emissive="#2dd4bf" emissiveIntensity={0.65} transparent opacity={0.55} />
          </mesh>
          <mesh position={[0.14, 0, 0]}>
            <sphereGeometry args={[0.072, 14, 14]} />
            <meshStandardMaterial color="#f2c879" emissive="#f2c879" emissiveIntensity={0.8} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.28, 0.01, 10, 48]} />
            <meshStandardMaterial color="#2dd4bf" emissive="#2dd4bf" emissiveIntensity={0.75} transparent opacity={0.65} />
          </mesh>
        </group>

        {/* 6. Dermal Surface Lesion Scanner Target Rings (M03/M06 Skin) */}
        <group position={[0, -0.68, 0.05]}>
          <mesh position={[-0.58, 0.72, 0]} rotation={[0, Math.PI / 2.2, 0]}>
            <torusGeometry args={[0.14, 0.012, 10, 32]} />
            <meshStandardMaterial ref={dermalMatRef} color="#818cf8" emissive="#818cf8" emissiveIntensity={0.65} transparent opacity={0.55} />
          </mesh>
          <mesh position={[0.24, -0.1, 0.14]} rotation={[Math.PI / 2.1, 0, 0]}>
            <torusGeometry args={[0.19, 0.012, 10, 36]} />
            <meshStandardMaterial color="#34d399" emissive="#34d399" emissiveIntensity={0.7} transparent opacity={0.65} />
          </mesh>
        </group>
      </group>

      {/* === SWEEPING NEON CYAN VOLUMETRIC SCAN CYLINDER === */}
      <group ref={scanBandGroupRef} position={[0, 0.4, 0]}>
        <mesh>
          <cylinderGeometry args={[1.12, 1.12, 0.48, 48, 1, true]} />
          <meshStandardMaterial
            color="#22d3ee"
            emissive="#22d3ee"
            emissiveIntensity={0.75}
            transparent
            opacity={0.18}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        {/* Glowing Top & Bottom Laser Torus Rings */}
        <mesh position={[0, 0.24, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.13, 0.016, 12, 72]} />
          <meshStandardMaterial color="#a5f3fc" emissive="#22d3ee" emissiveIntensity={1.65} />
        </mesh>
        <mesh position={[0, -0.24, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.13, 0.016, 12, 72]} />
          <meshStandardMaterial color="#a5f3fc" emissive="#22d3ee" emissiveIntensity={1.65} />
        </mesh>
        {/* Inner Cross-Section Volumetric Scan Disc */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.1, 48]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.09} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>

      {/* Base Floor Diagnostic Reticle Platform */}
      <mesh position={[0, -1.84, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.82, 1.26, 56]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.28} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -1.84, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.28, 0.015, 10, 64]} />
        <meshStandardMaterial color="#38bdf8" emissive="#22d3ee" emissiveIntensity={1.0} />
      </mesh>
    </>
  );
}

const HEATMAP_SEEDS = [
  0.88, 0.94, 0.62, 0.78, 0.91, 0.85,
  0.72, 0.96, 0.84, 0.58, 0.89, 0.93,
  0.91, 0.67, 0.76, 0.95, 0.64, 0.82,
  0.79, 0.87, 0.92, 0.71, 0.88, 0.95,
];

export function HolographicBodyScanner3D({
  className = "",
  onSelectModule,
}: {
  className?: string;
  onSelectModule?: (slug: string) => void;
}) {
  const { motionPaused } = usePreferences();
  const [localPaused, setLocalPaused] = useState(false);
  const [activeZone, setActiveZone] = useState<ScanZoneKey>("auto");

  const paused = motionPaused || localPaused;

  // Refs updated cleanly via subscribeTelemetryTick at 60fps with ZERO React re-renders
  const scanReadoutRef = useRef<HTMLSpanElement>(null);
  const dialRedRef = useRef<SVGGElement>(null);
  const dialCyanRef = useRef<SVGGElement>(null);
  const ecgRedPathRef = useRef<SVGPathElement>(null);
  const ecgCyanPathRef = useRef<SVGPathElement>(null);
  const lungScanBarRef = useRef<HTMLDivElement>(null);
  const heatmapRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const buildEcgPath = (phaseShift: number, amp: number, sharp: boolean) => {
      const pts: string[] = [];
      for (let x = 0; x <= 280; x += 4) {
        const u = ((x / 72 + phaseShift) % 1 + 1) % 1;
        let yOff = 0;
        if (sharp) {
          if (u > 0.14 && u < 0.24) yOff = -4 * Math.sin(((u - 0.14) / 0.1) * Math.PI);
          else if (u >= 0.3 && u < 0.35) yOff = 7;
          else if (u >= 0.35 && u < 0.42) yOff = -amp * Math.sin(((u - 0.35) / 0.07) * Math.PI);
          else if (u >= 0.42 && u < 0.48) yOff = 11 * Math.sin(((u - 0.42) / 0.06) * Math.PI);
          else if (u >= 0.56 && u < 0.72) yOff = -6.5 * Math.sin(((u - 0.56) / 0.16) * Math.PI);
        } else {
          yOff = Math.sin(u * Math.PI * 2) * (amp * 0.45) + Math.cos(u * Math.PI * 4) * 3;
        }
        const y = 48 + yOff;
        pts.push(`${x === 0 ? "M" : "L"} ${x} ${y.toFixed(1)}`);
      }
      return pts.join(" ");
    };

    if (ecgRedPathRef.current) ecgRedPathRef.current.setAttribute("d", buildEcgPath(0, 29, true));
    if (ecgCyanPathRef.current) ecgCyanPathRef.current.setAttribute("d", buildEcgPath(0.3, 18, false));

    if (paused) return undefined;

    return subscribeTelemetryTick((nowMs) => {
      const sec = nowMs / 1000;
      if (dialRedRef.current) {
        dialRedRef.current.setAttribute("transform", `rotate(${(sec * 38) % 360} 44 44)`);
      }
      if (dialCyanRef.current) {
        dialCyanRef.current.setAttribute("transform", `rotate(${(-(sec * 32)) % 360} 44 44)`);
      }
      if (ecgRedPathRef.current) {
        ecgRedPathRef.current.setAttribute("d", buildEcgPath(-sec * 0.52, 29, true));
      }
      if (ecgCyanPathRef.current) {
        ecgCyanPathRef.current.setAttribute("d", buildEcgPath(-sec * 0.38, 17, false));
      }
      if (lungScanBarRef.current) {
        const yPct = 10 + ((sec * 34) % 80);
        lungScanBarRef.current.style.top = `${yPct.toFixed(1)}%`;
      }
      heatmapRefs.current.forEach((cell, idx) => {
        if (!cell) return;
        const base = HEATMAP_SEEDS[idx % HEATMAP_SEEDS.length];
        const wave = 0.72 + 0.28 * Math.sin(sec * 2.4 + idx * 0.65);
        cell.style.opacity = (base * wave).toFixed(2);
      });
    });
  }, [paused]);

  const handleZoneSelect = (z: ScanZoneMeta) => {
    setActiveZone(z.key);
    if (onSelectModule && z.key !== "auto") {
      onSelectModule(z.moduleSlug);
    }
  };

  const fallbackCenterSvg = (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#040c1d] text-sky-300 space-y-2 p-6 text-center">
      <Scan className="w-12 h-12 text-[#22d3ee]" />
      <div className="font-mono text-xs font-bold">3D HOLOGRAPHIC CLINICAL SCANNER</div>
      <p className="text-[11px] text-slate-400 max-w-xs">
        WebGL fallback active — cranial (M05), cardiac (Blood Connect), pelvic (M01/M02), and dermal (M03/M06) layers mapped.
      </p>
    </div>
  );

  return (
    <div
      data-no-tilt="true"
      className={`ss-sapphire-card rounded-3xl border border-cyan-400/35 bg-[#030916]/95 p-4 sm:p-5 space-y-4 overflow-hidden relative ${className}`}
    >
      {/* Ambient subtle grid glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 45%, rgba(34,211,238,0.16), transparent 62%), linear-gradient(rgba(56,189,248,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.06) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 28px 28px, 28px 28px",
        }}
      />

      {/* Top HUD Status Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-cyan-400/20">
        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full bg-[#22d3ee] shadow-[0_0_12px_#22d3ee] ${paused ? "" : "animate-pulse"}`} />
          <span className="font-mono text-[11px] font-bold tracking-[0.18em] text-[#22d3ee] uppercase">
            BIOMEDICAL VOLUMETRIC 3D SCANNER • SHASTHOSETU CLINICAL TWIN
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {SCAN_ZONES.map((z) => {
            const active = activeZone === z.key;
            return (
              <button
                key={z.key}
                type="button"
                onClick={() => handleZoneSelect(z)}
                className={`min-h-8 px-3 rounded-full font-mono text-[10px] font-bold transition cursor-pointer border ${
                  active
                    ? "bg-[#22d3ee] text-slate-950 border-transparent shadow-[0_0_14px_rgba(34,211,238,0.65)]"
                    : "bg-[#061226]/90 border-cyan-400/25 text-slate-300 hover:border-cyan-400/60"
                }`}
              >
                {z.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setLocalPaused((v) => !v)}
            className="min-h-8 px-3 rounded-full font-mono text-[10px] font-bold bg-white/10 hover:bg-white/15 border border-white/20 text-white inline-flex items-center gap-1 cursor-pointer"
          >
            {paused ? <Play className="w-3 h-3 text-[#22d3ee]" /> : <Pause className="w-3 h-3 text-[#f2c879]" />}
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
      </div>

      {/* Main 3-Column Sci-Fi Telemetry HUD */}
      <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        {/* === LEFT TELEMETRY COLUMN (Side-Profile Lungs + Twin Counter Dials + Dual ECG) === */}
        <div className="xl:col-span-3 flex flex-col justify-between gap-3">
          {/* L1: Side-Profile Thorax / Pulmonary Wireframe Monitor */}
          <div className="rounded-2xl bg-[#040d1e]/90 border border-cyan-400/25 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between font-mono text-[10px] text-cyan-300 font-bold">
              <span>THORAX PROFILE • O₂</span>
              <span className="text-[#2dd4bf]">SpO₂ 98.4%</span>
            </div>
            <div className="grid grid-cols-12 gap-2.5 items-center">
              <div className="col-span-5 relative h-24 rounded-xl bg-[#020713] border border-cyan-400/20 overflow-hidden flex items-center justify-center">
                <svg viewBox="0 0 90 100" className="w-full h-full p-1.5" aria-hidden="true">
                  <path
                    d="M36 10 C52 10 58 24 55 38 C53 46 66 56 68 78 L68 92 L22 92 L22 58 C24 44 26 32 28 20 Z"
                    fill="rgba(34,211,238,0.08)"
                    stroke="#22d3ee"
                    strokeWidth="1.4"
                  />
                  <ellipse cx="42" cy="64" rx="11" ry="16" fill="rgba(56,189,248,0.18)" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2 2" />
                  <circle cx="48" cy="66" r="4.5" fill="#fb7185" />
                </svg>
                <div
                  ref={lungScanBarRef}
                  aria-hidden="true"
                  className="absolute inset-x-0 h-[2px] bg-[#22d3ee] shadow-[0_0_8px_#22d3ee]"
                  style={{ top: "30%" }}
                />
              </div>
              <div className="col-span-7 space-y-2 font-mono text-[10px]">
                <div>
                  <div className="flex justify-between text-slate-300">
                    <span>VENTILATION</span>
                    <span className="text-cyan-300">16 /m</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 mt-1 overflow-hidden">
                    <div className="h-full w-[78%] bg-gradient-to-r from-[#22d3ee] to-[#2dd4bf]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-slate-300">
                    <span>SPLIT LEAK</span>
                    <span className="text-[#2dd4bf]">0.00%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 mt-1 overflow-hidden">
                    <div className="h-full w-[100%] bg-[#2dd4bf]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-slate-300">
                    <span>422 GUARD</span>
                    <span className="text-[#f2c879]">ACTIVE</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 mt-1 overflow-hidden">
                    <div className="h-full w-[94%] bg-[#f2c879]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* L2: Twin Counter-Rotating Red & Cyan Tactical Dials */}
          <div className="rounded-2xl bg-[#040d1e]/90 border border-cyan-400/25 p-3.5 space-y-2.5">
            <div className="font-mono text-[10px] text-sky-300 font-bold uppercase flex items-center justify-between">
              <span>DUAL ROTARY GAUGES</span>
              <span className="text-slate-400">60 FPS</span>
            </div>
            <div className="grid grid-cols-2 gap-3 place-items-center">
              <div className="flex flex-col items-center">
                <svg viewBox="0 0 88 88" className="w-20 h-20">
                  <circle cx="44" cy="44" r="34" fill="none" stroke="rgba(251,113,133,0.18)" strokeWidth="5" />
                  <g ref={dialRedRef}>
                    <circle
                      cx="44"
                      cy="44"
                      r="34"
                      fill="none"
                      stroke="#fb7185"
                      strokeWidth="5"
                      strokeDasharray="68 28 32 85"
                      strokeLinecap="round"
                    />
                    <circle cx="44" cy="10" r="3" fill="#fff" />
                  </g>
                  <text x="44" y="45" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="800" className="font-mono">
                    94.4%
                  </text>
                  <text x="44" y="57" textAnchor="middle" fill="#fb7185" fontSize="7.5" className="font-mono">
                    M01 HOLD
                  </text>
                </svg>
              </div>
              <div className="flex flex-col items-center">
                <svg viewBox="0 0 88 88" className="w-20 h-20">
                  <circle cx="44" cy="44" r="34" fill="none" stroke="rgba(56,189,248,0.18)" strokeWidth="5" />
                  <g ref={dialCyanRef}>
                    <circle
                      cx="44"
                      cy="44"
                      r="34"
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="5"
                      strokeDasharray="82 22 46 64"
                      strokeLinecap="round"
                    />
                    <circle cx="44" cy="78" r="3" fill="#fff" />
                  </g>
                  <text x="44" y="45" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="800" className="font-mono">
                    84.7%
                  </text>
                  <text x="44" y="57" textAnchor="middle" fill="#22d3ee" fontSize="7.5" className="font-mono">
                    M03 LEAK-0
                  </text>
                </svg>
              </div>
            </div>
          </div>

          {/* L3: Dual-Trace Animated Red/Cyan ECG Oscilloscope */}
          <div className="rounded-2xl bg-[#040d1e]/90 border border-cyan-400/25 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between font-mono text-[10px]">
              <span className="text-rose-300 font-bold">ECG + SIGNAL SWEEP</span>
              <span className="text-cyan-300">76 BPM SYNC</span>
            </div>
            <div className="rounded-xl bg-[#020713] border border-white/10 p-1.5">
              <svg viewBox="0 0 280 96" className="w-full h-24">
                {[24, 48, 72].map((y) => (
                  <line key={y} x1="0" y1={y} x2="280" y2={y} stroke="rgba(34,211,238,0.12)" strokeDasharray="3 3" />
                ))}
                <path ref={ecgCyanPathRef} d="M 0 48 L 280 48" fill="none" stroke="#22d3ee" strokeWidth="1.6" opacity="0.8" />
                <path ref={ecgRedPathRef} d="M 0 48 L 280 48" fill="none" stroke="#fb7185" strokeWidth="2.1" />
              </svg>
            </div>
          </div>
        </div>

        {/* === CENTER 3D VOLUMETRIC HUMAN BODY SCANNER STAGE === */}
        <div className="xl:col-span-6 relative rounded-2xl border border-cyan-400/35 bg-[#020816] h-[470px] sm:h-[520px] overflow-hidden">
          <ScannerErrorBoundary fallback={fallbackCenterSvg}>
            <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0.12, 5.15], fov: 38 }} gl={{ alpha: true, antialias: true }}>
              <HolographicBodyScene
                activeZone={activeZone}
                paused={paused}
                scanReadoutRef={scanReadoutRef}
              />
            </Canvas>
          </ScannerErrorBoundary>

          {/* Top-Left Live Plane Readout Badge */}
          <div className="pointer-events-none absolute top-3 left-3 rounded-xl bg-[#040c1e]/85 border border-cyan-400/35 px-3 py-1.5 backdrop-blur-md">
            <div className="font-mono text-[9px] text-cyan-300 uppercase tracking-wider">VOLUMETRIC DEPTH SWEEP</div>
            <span ref={scanReadoutRef} className="font-mono text-xs font-bold text-white block">
              PLANE Y: +0.40m • THORAX
            </span>
          </div>

          {/* Clickable Anatomical Leader Badges Mapped to ShasthoSetu Tracks */}
          <button
            type="button"
            onClick={() => handleZoneSelect(SCAN_ZONES[1])}
            className={`absolute top-12 right-3 px-2.5 py-1 rounded-lg font-mono text-[9.5px] font-bold border transition cursor-pointer ${
              activeZone === "cranial"
                ? "bg-purple-500 text-white border-white shadow-[0_0_12px_rgba(192,132,252,0.7)]"
                : "bg-[#040c1e]/85 border-purple-400/40 text-purple-200 hover:bg-purple-500/20"
            }`}
          >
            CRANIAL • M05 VOICE
          </button>

          <button
            type="button"
            onClick={() => handleZoneSelect(SCAN_ZONES[2])}
            className={`absolute top-[33%] left-3 px-2.5 py-1 rounded-lg font-mono text-[9.5px] font-bold border transition cursor-pointer ${
              activeZone === "thorax"
                ? "bg-rose-500 text-white border-white shadow-[0_0_12px_rgba(251,113,133,0.7)]"
                : "bg-[#040c1e]/85 border-rose-400/40 text-rose-200 hover:bg-rose-500/20"
            }`}
          >
            THORAX • CARDIAC / BLOOD
          </button>

          <button
            type="button"
            onClick={() => handleZoneSelect(SCAN_ZONES[3])}
            className={`absolute top-[54%] right-3 px-2.5 py-1 rounded-lg font-mono text-[9.5px] font-bold border transition cursor-pointer ${
              activeZone === "pelvic"
                ? "bg-teal-400 text-slate-950 border-white shadow-[0_0_12px_rgba(45,212,191,0.7)]"
                : "bg-[#040c1e]/85 border-teal-400/40 text-teal-200 hover:bg-teal-400/20"
            }`}
          >
            PELVIC • M01/M02 PCOS
          </button>

          <button
            type="button"
            onClick={() => handleZoneSelect(SCAN_ZONES[4])}
            className={`absolute bottom-12 left-3 px-2.5 py-1 rounded-lg font-mono text-[9.5px] font-bold border transition cursor-pointer ${
              activeZone === "dermal"
                ? "bg-indigo-500 text-white border-white shadow-[0_0_12px_rgba(129,140,248,0.7)]"
                : "bg-[#040c1e]/85 border-indigo-400/40 text-indigo-200 hover:bg-indigo-500/20"
            }`}
          >
            DERMAL • M03/M06 SKIN
          </button>

          {/* Bottom Caption */}
          <div className="pointer-events-none absolute bottom-3 right-3 font-mono text-[10px] text-cyan-200/80 bg-[#040c1e]/80 border border-cyan-400/25 rounded-lg px-2.5 py-1">
            REAL-TIME X-RAY MESH • CLICK ZONE TO LOCK
          </div>
        </div>

        {/* === RIGHT TELEMETRY COLUMN (Triple Gauge Arcs + Biomarker Heatmap + 3D Beating Heart) === */}
        <div className="xl:col-span-3 flex flex-col justify-between gap-3">
          {/* R1: Triple Circular Metric Arcs */}
          <div className="rounded-2xl bg-[#040d1e]/90 border border-cyan-400/25 p-3.5 space-y-2">
            <div className="flex items-center justify-between font-mono text-[10px] text-cyan-300 font-bold">
              <span>SYSTEMBENCH ARCS</span>
              <span className="inline-flex items-center gap-1 text-[#2dd4bf]">
                <ShieldCheck className="w-3 h-3" /> AUDIT PASS
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: "M01", val: "94.4%", pct: 94.4, color: "#38bdf8" },
                { label: "M02", val: "86.7%", pct: 86.7, color: "#2dd4bf" },
                { label: "M03", val: "84.7%", pct: 84.7, color: "#818cf8" },
              ].map((g) => {
                const c = 2 * Math.PI * 22;
                const dash = (c * g.pct) / 100;
                return (
                  <div key={g.label} className="rounded-xl bg-[#020713] border border-white/10 p-2 flex flex-col items-center">
                    <svg viewBox="0 0 56 56" className="w-14 h-14">
                      <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4.5" />
                      <circle
                        cx="28"
                        cy="28"
                        r="22"
                        fill="none"
                        stroke={g.color}
                        strokeWidth="4.5"
                        strokeDasharray={`${dash.toFixed(1)} ${c.toFixed(1)}`}
                        strokeLinecap="round"
                        transform="rotate(-90 28 28)"
                      />
                      <text x="28" y="31" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="800" className="font-mono">
                        {g.val}
                      </text>
                    </svg>
                    <span className="font-mono text-[9px] font-bold mt-0.5" style={{ color: g.color }}>
                      {g.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* R2: Biomarker Heatmap Matrix + Mini Clinical Lineage Tree */}
          <div className="rounded-2xl bg-[#040d1e]/90 border border-cyan-400/25 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between font-mono text-[10px] text-[#f2c879] font-bold">
              <span>BIOMARKER MATRIX</span>
              <span>SHA-256 LOCKED</span>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {HEATMAP_SEEDS.map((val, idx) => (
                <div
                  key={idx}
                  ref={(el) => {
                    heatmapRefs.current[idx] = el;
                  }}
                  className="h-3.5 rounded-sm transition-opacity"
                  style={{
                    background: val > 0.9 ? "#22d3ee" : val > 0.78 ? "#2dd4bf" : val > 0.65 ? "#818cf8" : "#f2c879",
                    opacity: val,
                  }}
                />
              ))}
            </div>
            <div className="rounded-xl bg-[#020713] border border-white/10 px-2.5 py-2 flex items-center justify-between font-mono text-[9.5px] text-slate-300">
              <span className="text-sky-300">RAW</span>
              <span>→</span>
              <span className="text-teal-300">GROUP</span>
              <span>→</span>
              <span className="text-indigo-300">HASH</span>
              <span>→</span>
              <span className="text-[#f2c879] font-bold">HTTP 422</span>
            </div>
          </div>

          {/* R3: Compact 3D Beating Heart + Blood Connect Link */}
          <div className="space-y-1.5">
            <BeatingHeart3D compact bpm={76} />
            <div className="flex items-center justify-between px-1 font-mono text-[10px]">
              <span className="text-slate-400">NETWORK FLOW METRICS</span>
              <Link to="/blood-connect" className="text-rose-300 hover:underline inline-flex items-center gap-1 font-bold">
                <Droplets className="w-3 h-3" /> Blood Connect →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
