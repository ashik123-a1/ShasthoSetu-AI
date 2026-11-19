import React, { Component, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { usePreferences } from "../../lib/preferences";
import { StaticCareLatticeFallback } from "./StaticCareLatticeFallback";

class WebGlErrorBoundary extends Component<
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

const LAYER_COLORS = ["#38bdf8", "#2dd4bf", "#818cf8", "#f2c879"];

function CareLatticeScene({
  activeLayer,
  motionPaused,
  autoRotate,
}: {
  activeLayer: number;
  motionPaused: boolean;
  autoRotate: boolean;
}) {
  const coreRef = useRef<THREE.Group>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  const colorHex = LAYER_COLORS[activeLayer % LAYER_COLORS.length];

  const nodePositions = useMemo(() => {
    const pts: Array<[number, number, number]> = [];
    for (let i = 0; i < 18; i += 1) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / 18);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 2.08;
      pts.push([
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      ]);
    }
    return pts;
  }, []);

  useFrame((state, delta) => {
    if (motionPaused || !autoRotate) return;
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.28;
      coreRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.1) * 0.1;
    }
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z += delta * 0.22;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x -= delta * 0.18;
    }
  });

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[4, 5, 5]} intensity={1.45} color="#e0f2fe" />
      <pointLight position={[-4, -3, 3]} intensity={1.15} color={colorHex} />

      <group ref={coreRef}>
        <mesh>
          <icosahedronGeometry args={[1.56, 1]} />
          <meshStandardMaterial
            color={colorHex}
            wireframe
            transparent
            opacity={0.5}
            emissive={colorHex}
            emissiveIntensity={0.48}
          />
        </mesh>

        <mesh>
          <boxGeometry args={[0.36, 1.24, 0.36]} />
          <meshStandardMaterial color={colorHex} emissive={colorHex} emissiveIntensity={0.62} roughness={0.2} metalness={0.35} />
        </mesh>
        <mesh>
          <boxGeometry args={[1.24, 0.36, 0.36]} />
          <meshStandardMaterial color={colorHex} emissive={colorHex} emissiveIntensity={0.62} roughness={0.2} metalness={0.35} />
        </mesh>

        {nodePositions.map((pos, idx) => (
          <mesh key={idx} position={pos}>
            <sphereGeometry args={[0.075, 12, 12]} />
            <meshStandardMaterial
              color={idx % 3 === 0 ? "#f2c879" : colorHex}
              emissive={idx % 3 === 0 ? "#f2c879" : colorHex}
              emissiveIntensity={0.85}
            />
          </mesh>
        ))}
      </group>

      <mesh ref={ring1Ref} rotation={[Math.PI / 3.2, 0.2, 0]}>
        <torusGeometry args={[2.35, 0.025, 16, 80]} />
        <meshStandardMaterial color={colorHex} emissive={colorHex} emissiveIntensity={0.6} transparent opacity={0.78} />
      </mesh>
      <mesh ref={ring2Ref} rotation={[-Math.PI / 2.8, -0.35, 0.4]}>
        <torusGeometry args={[2.68, 0.018, 16, 80]} />
        <meshStandardMaterial color="#f2c879" transparent opacity={0.42} />
      </mesh>
    </>
  );
}

function hasWebGlSupport(): boolean {
  try {
    if (typeof window === "undefined") return false;
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    return Boolean(gl);
  } catch {
    return false;
  }
}

export function HeroCareLattice({
  activeLayer = 0,
  autoRotate = true,
}: {
  activeLayer?: number;
  autoRotate?: boolean;
}) {
  const { motionPaused } = usePreferences();
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const [canWebGl, setCanWebGl] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    setCanWebGl(hasWebGlSupport());
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.05 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (!canWebGl || contextLost) {
    return (
      <div ref={containerRef} className="w-full h-full">
        <StaticCareLatticeFallback activeLayer={activeLayer} reducedMotion={motionPaused} />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative" data-testid="hero-3d-lattice">
      <WebGlErrorBoundary fallback={<StaticCareLatticeFallback activeLayer={activeLayer} reducedMotion={motionPaused} />}>
        <Canvas
          dpr={[1, 1.6]}
          camera={{ position: [0, 0, 6.4], fov: 42 }}
          frameloop={inView && !motionPaused ? "always" : "never"}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener(
              "webglcontextlost",
              (e) => {
                e.preventDefault();
                setContextLost(true);
              },
              false
            );
          }}
        >
          <CareLatticeScene activeLayer={activeLayer} motionPaused={motionPaused} autoRotate={autoRotate} />
        </Canvas>
      </WebGlErrorBoundary>
    </div>
  );
}
