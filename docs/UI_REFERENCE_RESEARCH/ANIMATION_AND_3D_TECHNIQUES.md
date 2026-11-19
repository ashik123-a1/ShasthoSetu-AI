# ✨ ShasthoSetu AI — Animation & 3D Engineering Techniques Blueprint

**Document Reference:** `docs/UI_REFERENCE_RESEARCH/ANIMATION_AND_3D_TECHNIQUES.md`  
**Task ID:** `UI-00`  
**Primary Technical References:**
- `ABRUBAB/ShadowAstra_Atlas` (`9f2f04f0...`): `@react-three/fiber` 9.8, `three` 0.186, `gsap` 3.15 + `ScrollTrigger` + `SplitText`, `lenis` 1.3, `motion` 14.1
- `ASHIK311/agrisense-fusion` (`58c9bbc7...`): raw `THREE.WebGLRenderer`, custom GLSL shaders, `DRACOLoader`, GSAP `slideFill()` dual-layer clip-path pill transitions

---

## 1. Core Architectural Philosophy for Healthcare

Healthcare users in Bangladesh frequently use mid-range Android smartphones over 3G/4G connections, or clinic desktops without dedicated GPUs. Therefore, **every 3D canvas and animation in ShasthoSetu AI must obey three non-negotiable rules**:
1. **3D Serves Comprehension, Never Clinical Distraction:** Limit WebGL 3D strictly to the Public Homepage Hero (and opt-in educational anatomy/molecule previews in Research Lab). Operational clinical dashboards (`PATIENT`, `DOCTOR`, `ADMIN`, `SUPPORT`) rely on crisp 2D motion (`Motion` + CSS transitions) for zero lag during high-stress tasks.
2. **Instant Graceful Degradation:** Always render high-contrast HTML/Bangla typography *before* mounting WebGL on phones, and degrade seamlessly to a crisp still asset (`StaticScene`) when WebGL fails, context is lost, or software rendering (`SwiftShader`/`llvmpipe`) degrades FPS.
3. **Strict WCAG 2.2.2 Motion Control:** Respect both the operating system `(prefers-reduced-motion: reduce)` media query AND a user-accessible **"গতি থামান / Pause Motion"** toggle persisted in `localStorage`.

---

## 2. Verified Techniques Extracted from Reference Repositories

### 2.1 React Three Fiber Lifecycle, Memory-Leak Fixes & GPU Budgeting (`ShadowAstra_Atlas`)

Inspecting `ShadowAstra_Atlas/src/components/three/Controls.tsx`, `HeroScene.tsx`, and `Safe.tsx` uncovered four production-grade optimizations that we will adopt directly:

1. **Fixing `OrbitControls` Document Keydown Leak (`Controls.tsx` L8–25):**
   - `three r186` attaches `keydown`/`keyup` listeners to `canvas.getRootNode()`, but during React unmount cleanup `el.getRootNode()` no longer resolves to `document`, leaking the entire canvas, scene, and DOM (~0.45 MB/navigation).
   - **Adopted Wrapper:** Capture `const root = el.getRootNode()` at mount time and explicitly strip `h._interceptControlDown` / `h._interceptControlUp` inside `dispose()`.

2. **Releasing Shared `dfgLUT` Texture on Unmount (`ReleaseGPU` in `Controls.tsx` L90–116):**
   - Three.js physically-based materials retain a shared internal lookup texture (`dfgLUT`) storing `"dispose"` listeners on every past renderer (~1 MB heap retention per route visit).
   - **Adopted Pattern:** Traverse scene materials while active to capture `uniforms.dfgLUT.value` and call `.dispose()` cleanly in unmount cleanup.

3. **Visibility-Aware Frameloop (`HeroScene.tsx` L67–102):**
   ```tsx
   const [visible, setVisible] = useState(true);
   // IntersectionObserver toggles visible when hero scrolls off-screen
   <Canvas dpr={[1, 1.6]} frameloop={visible ? "always" : "never"} gl={{ antialias: true, powerPreference: "high-performance" }}>
   ```
   Stopping `requestAnimationFrame` renders immediately when scrolling below the fold eliminates background battery drain.

4. **Dynamic Software-GL & Adaptive DPR Scaling (`AdaptiveDpr` & `enableLiteGraphics()` in `Controls.tsx` L118–148 & `Safe.tsx` L34–44):**
   - Inspect `WEBGL_debug_renderer_info` on frame 2; if `/swiftshader|llvmpipe|softpipe|software|basic render/i` matches OR average frame duration drops below ~22 FPS (`dt > 0.045s`), add `html.gpu-lite` (removing expensive CSS `backdrop-filter: blur(...)` over moving 3D surfaces) and step DPR down by 25% (floor `0.5`).

5. **WebGL Context-Loss & Zero-WebGL Fallback Boundary (`Scene` & `ErrorBoundary` in `Safe.tsx` L15–130):**
   - Wrap `<Canvas>` in `<ErrorBoundary>` + `<Scene>` listening for `webglcontextlost` (`e.preventDefault()`), offering instant fallback to `<StaticHeroFallback />` + manual retry without crashing React.

### 2.2 Mobile-First Idle 3D Mounting (`ShadowAstra_Atlas/src/pages/Home.tsx` L132–149)

On viewports `< 900px` wide, do NOT block initial paint with Three.js bundle downloads (~240 KB+ gzipped):
- Render headline, Bangla value proposition, and primary CTA ("ডাক্তার খুঁজুন / Find a Doctor") immediately with the lightweight static SVG/WebP backdrop.
- Schedule `lazy(() => import("./HeroCanvas3D"))` inside `window.setTimeout(..., 1500)` + `window.requestIdleCallback`, ensuring Sub-second First Contentful Paint on budget phones.

### 2.3 Procedural Geometry & Draco Compression (`agrisense-fusion/frontend/src/components/HeroThreeLandscape.jsx`)

- If any custom `.glb` 3D medical asset (e.g., stylized stethoscope, DNA helix, cellular node) is loaded, compress with **Draco** and self-host decoder WASM/JS under `public/draco/gltf/` (never pull decoders from unpkg/gstatic CDN so offline/PWA works reliably).
- Cap pixel ratio `Math.min(window.devicePixelRatio || 1, 1.75)` and run `ResizeObserver` on container wrappers.

### 2.4 Scroll Choreography, `Lenis` & `GSAP` (`Home.tsx`, `useSmoothScroll.ts`)

1. **Homepage-Only Smooth Scroll (`useSmoothScroll.ts`):**
   - Initialize `new Lenis({ lerp: 0.1 })` synced with `gsap.ticker` (`lagSmoothing(0)`) **only on the Public Homepage**, and skip entirely if `motionReduced()` is `true`. Operational dashboards (`PATIENT`, `DOCTOR`, `ADMIN`, `SUPPORT`) keep native browser scrolling so dense tables, sticky headers, and keyboard `Tab` scrolling feel instant.
2. **GSAP Scope Cleanup & Reduced-Motion Matching (`Home.tsx` L33–67):**
   - Wrap all `SplitText` / `ScrollTrigger` timelines inside `@gsap/react`'s `useGSAP(..., { scope: root, dependencies: [reduced], revertOnUpdate: true })` and `gsap.matchMedia()`.
   - Note for **Bangla Typography (`SplitText` Caveat):** Never run character-level `SplitText({ type: "chars" })` on Bengali strings! Bengali Unicode relies on conjunct ligatures (যুক্তাক্ষর — e.g., ক্ত, ক্ষ, ন্তু) joined by Virama (`\u09CD`); splitting into `<span>` characters breaks glyph shaping. **Only use `type: "words"` or container fade/clip reveals for Bengali headlines**, and keep ligatures intact!
3. **Dual-Layer Elastic Pill Navigation (`agrisense-fusion/frontend/src/utils/motion.js` L36–101):**
   - `slideFill(fillEl, getRelativeEdges(fillEl, btnEl))` drives an active pill overlay via `clipPath: inset(t r b l round radius)`, staggering the leading edge (`0.32s power3.out`) and trailing edge (`0.52s power2.inOut`). Adapt cleanly with `reducedMotion` check (instant `gsap.set()` if reduced).
4. **Navigation Feedback & Scroll Flicker Guard (`App.tsx` & `kit.tsx`):**
   - `RouteBeam`: subtle `2px` top emerald-teal light sweep on route transitions (`disabled` when `reduced`).
   - `useScrollingFlag()`: toggles `html.is-scrolling` for 150ms during active wheel/touch scroll, clearing immediately on real `pointermove` (>2px), preventing glass hover spotlights from strobing across scrolled lists.
   - `MotionConfig reducedMotion={reduced ? "always" : "never"}`: single global root switch governing all `<motion.*>` springs.

---

## 3. ShasthoSetu AI Original 3D Concept: "Living Care Lattice"

Unlike ShadowAstra's planetary globes or AgriSense's crop valley, ShasthoSetu AI's homepage 3D hero will present an original, calm medical motif:
- **Subject:** A clean, translucent **Care Shield & Cellular Lattice Orbit** (subtle glass/emerald nodes connected by soft pulse filaments representing Family, Clinic, Pharmacy, and Verified Records around a protective ring) set against a soothing daylight-slate or deep clinical teal canvas.
- **No Unnecessary Heavy Assets:** Built primarily with procedural `THREE.SphereGeometry`, `THREE.TubeGeometry` / `LineSegments`, and crisp canvas glow sprites (zero multi-megabyte textures), keeping the entire 3D bundle lightweight (`< 180 KB` gzipped lazy chunk).
- **Interactive Controls:** Subtle mouse parallax (`Rig` clamped to small angles) + automatic `static-hero.svg` fallback when `hasWebGL() === false` or `motionReduced() === true`.

---

## 4. Accessibility & Motion Checklist for Future Tasks (`UI-01`, `UI-03`)

| Rule | Implementation Target | Reference Proof Source |
| :--- | :--- | :--- |
| Bengali Script Preservation | Never apply `SplitText` char splitting to `bn` nodes | SRS v2.0 `UX-01`, Section 17.3 |
| WCAG 2.2.2 Motion Toggle | Persistent footer/header `"Pause Motion / গতি থামান"` button (`localStorage`) + OS `prefers-reduced-motion` | `ShadowAstra_Atlas/src/lib/motionPref.ts` |
| WebGL Safe Fallback | ErrorBoundary + `webglcontextlost` listener + static SVG/PNG swap | `ShadowAstra_Atlas/src/components/ui/Safe.tsx` |
| Zero Auto-Play Audio / Flashing | Zero sound effects on page load; no animations flashing `> 3Hz` | SRS v2.0 `UX-06` |
| GPU Leak Prevention | Explicit `CreateOrbit` root cleanup + `ReleaseGPU` + `renderer.dispose()` | `ShadowAstra_Atlas/src/components/three/Controls.tsx` |
