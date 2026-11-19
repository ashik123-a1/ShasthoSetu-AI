import React, { Component, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { usePreferences } from "../../lib/preferences";

class OrbErrorBoundary extends Component<{ fallback: React.ReactNode; children: React.ReactNode }, { hasError: boolean }> {
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

function ConfidenceOrbMesh({ confidence, colorHex, paused }: { confidence: number; colorHex: string; paused: boolean }) {
  const grp = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (paused || !grp.current) return;
    grp.current.rotation.y += delta * (0.4 + confidence * 0.6);
    grp.current.rotation.x += delta * 0.18;
  });
  return (
    <>
      <ambientLight intensity={0.85} />
      <pointLight position={[3, 3, 4]} intensity={1.4} color={colorHex} />
      <group ref={grp}>
        <mesh>
          <icosahedronGeometry args={[1.15, 1]} />
          <meshStandardMaterial color={colorHex} wireframe emissive={colorHex} emissiveIntensity={0.6 + confidence * 0.5} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.55 + confidence * 0.35, 18, 18]} />
          <meshStandardMaterial color={colorHex} emissive={colorHex} emissiveIntensity={0.7} roughness={0.2} metalness={0.4} />
        </mesh>
        <mesh rotation={[Math.PI / 3, 0.2, 0]}>
          <torusGeometry args={[1.65, 0.04, 12, 56]} />
          <meshStandardMaterial color="#f2c879" emissive="#f2c879" emissiveIntensity={0.6} />
        </mesh>
      </group>
    </>
  );
}

export function ResultTelemetryOrb3D({ confidence, colorHex = "#38bdf8" }: { confidence: number; colorHex?: string }) {
  const { motionPaused } = usePreferences();
  const pct = Math.round(Math.max(0, Math.min(1, confidence)) * 100);
  const svgFallback = (
    <div className="w-24 h-24 rounded-full border-2 border-sky-400/50 bg-[#061228] flex flex-col items-center justify-center font-mono">
      <span className="text-lg font-bold text-white">{pct}%</span>
      <span className="text-[9px] text-sky-300">CONF</span>
    </div>
  );

  return (
    <div className="w-24 h-24 rounded-2xl overflow-hidden bg-[#040a18] border border-sky-400/30 shrink-0 relative">
      {!motionPaused ? (
        <OrbErrorBoundary fallback={svgFallback}>
          <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 4.1], fov: 42 }}>
            <ConfidenceOrbMesh confidence={confidence} colorHex={colorHex} paused={motionPaused} />
          </Canvas>
        </OrbErrorBoundary>
      ) : (
        svgFallback
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-1 text-center font-mono text-[10px] font-bold text-white drop-shadow">
        {pct}%
      </div>
    </div>
  );
}
