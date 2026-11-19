# AgriSense Fusion — Complete Catalog of Digital Animations, Graphs, 3D Scenes & UI Effects

**Reference Source Root:** `_reference_repos/agrisense-fusion/frontend/src/`  
**Purpose:** Permanent reusable blueprint catalog for **ShasthoSetu AI**. Rather than repeating one donut-card style across every page, select a **distinct, data-appropriate visual primitive** from the sections below whenever building new dashboards, research modules, or interactive storytelling chapters.

---

## 1. Charts & Interactive Data Graphs (`frontend/src/components/charts/`)

| Component | Source File | Visual Pattern & Motion Engine | Best Fit in ShasthoSetu AI |
| :--- | :--- | :--- | :--- |
| **`AnimatedMetricCard`** | `charts/AnimatedMetricCard.jsx` | GSAP-counted numeric figure + SVG sparkline polyline (`strokeDashoffset` reveal) + shaded `<linearGradient>` area under curve + interactive pointer hover crosshair dot + provenance badge | Longitudinal patient tracking, PCOS 5-fold CV trends, vital/BMI trajectory cards |
| **`SeasonalScenarioCharts`** | `charts/SeasonalScenarioCharts.jsx` | Multi-series animated SVG curves (`strokeDashoffset` + staggered `gsap.fromTo` bar/line entry) + pointer hover scrubber (`onPointerMove` nearest X snap) + horizontal/vertical staggered bar charts | Longitudinal comparison charts, lab turnaround trends, model split comparison |
| **`UncertaintyBandChart`** | `charts/UncertaintyBandChart.jsx` | Dual polygon shaded uncertainty corridor (`min..max` confidence envelope) + center regression polyline + gap-aware segmentation (`null` breaks curves visibly) + hover tooltip crosshair | Bangla Voice AI (M05) FLEURS WER/CER confidence range, biomarker reference corridors |
| **`RainfallETComparisonChart`** | `charts/RainfallETComparisonChart.jsx` | Paired multi-bar seasonal bar chart + zero/threshold overlay curve highlighting surplus vs deficit regimes | Appointment demand vs slot supply, lab capacity utilization |
| **`RootZoneWaterProfile`** | `charts/RootZoneWaterProfile.jsx` | Layered anatomical depth profile diagram with live trigger-line marker (`Saturation -> Trigger -> Deficit`), interactive depth readouts | Maternal hormone phase band profile, pediatric fever escalation bands |
| **`TerrainProfileAndSlopeCards`** | `charts/TerrainProfileAndSlopeCards.jsx` | SVG elevation spline path + multi-card slope/gradient KPI strips | Regional hospital elevation / division distance accessibility profiles |
| **`WeatherMicroVisuals`** | `charts/WeatherMicroVisuals.jsx` | Canvas-driven compact micro animations (wind vector particles, rain droplets, thermal gradient spark strips) | Compact clinical vitals / telemetry status strips inside portal headers |
| **`MethodsGraphsGallery`** | `components/methods/MethodsGraphsGallery.jsx` | Combined scientific gallery pairing data tables, trend bands, bar rankings, and threshold reference lines | Consolidated `/research` audit & FINAL_LOCK benchmark gallery |

---

## 2. Digital Telemetry HUDs & Speedometer Gauges (`whatif/` & `ImpactObservatoryDashboard.jsx`)

| Component | Source File | Visual Pattern & Motion Engine | Best Fit in ShasthoSetu AI |
| :--- | :--- | :--- | :--- |
| **`DonutPieGauge` + `SegmentedPieBar`** | `components/ImpactObservatoryDashboard.jsx` | Shared 60fps `requestAnimationFrame` clock (`subscribeTelemetryTick`), outer clockwise loader arc + comet dot, inner counter-rotating dashed tick ring, multi-slice glowing donut, striped horizontal bar with sweeping scanner gleam | **Homepage Summary Observatory ONLY (`#impact`)** — avoids visual fatigue by not repeating identically on feature pages |
| **`HydrologyRiskGaugeCard`** | `components/whatif/HydrologyRiskGaugeCard.jsx` | **3-Zone Semicircular Speedometer Arc Gauge** (`Safe` cyan / `Elevated` amber / `High` coral arcs) + live trigonometric pointer dot + delta-vs-threshold pill + status banner | **PCOS Clinical & Ultrasound AI (`/features/pcos` & Chapter 02)** — visualizing risk-index probability vs clinical review threshold |
| **`AquiferHorizonProjectionCard`** | `components/whatif/AquiferHorizonProjectionCard.jsx` | Multi-horizon threshold projection curve comparing current baseline trajectory vs intervention trajectory toward a red warning limit | Long-term PCOS intervention lifestyle / follow-up simulation |
| **`RulerSlider`** | `components/whatif/RulerSlider.jsx` | Precision calibration tick-ruler interactive pointer scrubber (`setPointerCapture` / `onPointerMove`) | Interactive hormone / BMI / threshold sensitivity sliders |
| **`DualInspector` & `MetricCards`** | `components/DualInspector.jsx`, `components/MetricCards.jsx` | Side-by-side "Physics vs AI/RAG" delta diff inspector + compact glass KPI cards | Doctor Draft AI output vs Human Clinician Sign-Off comparison |

---

## 3. Animated Pipelines, Spectral Wipes & Method Explorers (`methods/` & root)

| Component | Source File | Visual Pattern & Motion Engine | Best Fit in ShasthoSetu AI |
| :--- | :--- | :--- | :--- |
| **`AnimatedDataPipeline`** | `components/methods/AnimatedDataPipeline.jsx` | **4-Swimlane Interactive SVG Architecture Diagram** with curved Bezier paths (`strokeDasharray`) + **60fps glowing light packets** moving along `path.getPointAtLength()` + clickable node inspector | **Safe Prescription OCR (`/features/prescription-ocr` & Chapter 04)** — illustrating `Rx Image/PDF -> EasyOCR -> Confidence Check -> HTTP 422 Lock -> Verified Routine` |
| **`PipelineTelemetryStage`** | `components/methods/PipelineTelemetryStage.jsx` | Live packet latency / throughput diagnostic wrapper around pipeline stages | API / ML inference queue inspector in Admin Portal |
| **`CanopySpectralLab`** | `components/CanopySpectralLab.jsx` | **Draggable Split Curtain Wipe** (`0..100%`) comparing raw input vs spectral index overlay with live crosshair inspector | Side-by-side Ultrasound raw scan vs morphology heatmap / Original Rx vs BBox overlay |
| **`SatelliteScanStage`** | `components/SatelliteScanStage.jsx` | Annotated scene stage with SVG leader elbows, pulsing focus pins, scan-line sweep gradient, and floating HUD callouts | CyberScan diagnostic image annotation overlay |
| **`SpatialTwinPreviewStage`** | `components/SpatialTwinPreviewStage.jsx` | SVG polygon boundary overlays mapped over real aerial raster base + orbiting Donut gauge chips per zone | Land-Guard / Regional healthcare coverage callouts |
| **`EquationStepExplorer`** | `components/methods/EquationStepExplorer.jsx` | Interactive step-by-step clinical/mathematical formula derivation explorer with live variable substitution | Explaining SMOTE/SimpleImputer feature pipeline & red-flag triage rules |
| **`StickyFieldStory`** | `components/methods/StickyFieldStory.jsx` | Scroll-pinned sticky visual canvas on right paired with scrolling narrative cards on left | Long-form `/about` / clinical safety narrative walkthrough |

---

## 4. 3D WebGL Scenes & Particle Visuals

| Component | Source File | Visual Pattern & Motion Engine | ShasthoSetu Counterpart |
| :--- | :--- | :--- | :--- |
| **`HeroThreeLandscape`** | `components/HeroThreeLandscape.jsx` | Full-bleed WebGL procedural elevation displacement terrain mesh + additive glow-sprite star/voxel particles + mouse parallax + far-right `Layers / Index / Auto` floating rail | **`HeroCareLattice.tsx` (`#hero`)** — floating transparently over rotating full-bleed Hero Doctor backdrop photography |
| **`ThreeLandscapeStage`** | `components/ThreeLandscapeStage.jsx` | Exploded 4-strata interactive 3D stack (`Atmosphere`, `Canopy`, `Surface`, `Subsurface`) with layer isolation | **`AiModuleScene3D.tsx`** (`pcos-clinical`, `pcos-ultrasound`, `viral-rash`, `prescription-ocr`, `bangla-voice`, `dermoped`) |
| **`ThreeCropCompareStage`** | `components/agronomy/ThreeCropCompareStage.jsx` | Pointer-orbit 3D multi-specimen comparison turntable stage | Side-by-side 3D molecular / diagnostic model comparison |
| **`AgriSenseParticlePreloader`** | `components/AgriSenseParticlePreloader.jsx` | Interactive mouse-repel Canvas2D particle vortex formation morphing into silhouette | Brand splash / cyber scan vortex effect in `CyberScanWorkbench.tsx` |
| **`AgriSenseOrbitalHUD` & `AiChatbotOrb`** | `components/AgriSenseOrbitalHUD.jsx`, `components/AiChatbotOrb.jsx` | Pointer-drag 3D orbital gyroscope & reactive glow orb for AI assistant | **`ResultTelemetryOrb3D.tsx`** |

---

## 5. Navigation, Global HUD & Micro-Interactions

| Feature | Source File | Technical Implementation | ShasthoSetu Counterpart |
| :--- | :--- | :--- | :--- |
| **3-Zone Floating Header + GSAP `slideFill`** | `components/Header.jsx` + `utils/motion.js` | Fixed glass capsule navbar, `1fr auto 1fr` CSS Grid, `gsap.to` animating `clipPath: inset(...)` between measured nav pill bounds (`getEdges`), compact `36px` logo + `32px` theme/utility capsules | `PublicFloatingHeader.tsx` + `lib/pillMotion.ts` |
| **Top Scroll Progress & Chapter Dots** | `components/HomeSectionRail.jsx` | Fixed `3px` gradient progress bar pinned to top viewport edge + evenly spaced interactive jump buttons with hover tooltip tags | `HomeSectionRail.tsx` (navigating Hero + 5 Home scroll-down AI chapters + Map/Doctors/Observatory) |
| **Mouse-Follow Spotlight & 3D Tilt Cards** | `context/AgriSenseContext.jsx` (L394–440) + `index.css` (L284–372) | Single delegated `pointermove` updating `--mx`, `--my`, `--rx`, `--ry`; `::before` masked specular border glow + `::after` inner radial fill + scroll anti-flicker guard (`is-scrolling`) | `GlobalCursorGlow.tsx` + `tokens.css` (`.ss-sapphire-card`, `.ss-card`, `.ss-glow-card`) |
| **Dynamic Island Notifications** | `components/DynamicIsland.jsx` | Timed bottom-floating frosted pill toast with progress bar & pause-on-hover | `ToastProvider.tsx` / `NotificationsPopover.tsx` |
| **Command Palette (`Ctrl+K`) & Radial Menu** | `components/CommandPaletteModal.jsx`, `components/AgriSenseRadialMenu.jsx` | Instant keyboard shortcut modal search & quick jump trigger | `CommandSearchModal.tsx` |

---

## 6. ShasthoSetu AI — Unique-Per-Page Assignment Matrix (No Repeated Graphs!)

| Page / Home Scroll Chapter | Signature Visual Primitive (`VariedClinicalVisuals.tsx` / `AgriStyleTelemetry.tsx`) | Never Repeat With |
| :--- | :--- | :--- |
| **Hero 1st Screen (`#hero`)** | Full-bleed crossfading Back-to-Back Doctors background + transparent 3D **`HeroCareLattice`** + slim `88px` `Layers/Guard/Auto` rail | Boxed static photo cards |
| **01 · PCOS Clinical & Ultrasound (`/features/pcos` & Chapter 02)** | **`SemiCircleRiskDial`** (`HydrologyRiskGaugeCard` port) + **`SparklineKpiStrip`** (`AnimatedMetricCard` SVG sparklines) | Donut decks or radar charts |
| **02 · Viral Rash AI (`/features/viral-rash` & Chapter 03)** | **`HexRadarTaxonomyChart`** (6-axis MCVSLD hexagonal spider radar + `755`-family leak-free partition strip) | Line sparklines or bar decks |
| **03 · Safe Prescription OCR (`/features/prescription-ocr` & Chapter 04)** | **`AnimatedClinicalPipeline`** (`AnimatedDataPipeline` port — 60fps glowing Bezier data packets across 4 swimlanes + `992/1,000` admission meter) | Donut gauges |
| **04 · Bangla Voice AI Phase G (`/features/bangla-voice` & Chapter 05)** | **`UncertaintyTrendCurveChart`** (`UncertaintyBandChart` + `SeasonalScenarioCharts` port — GSAP-drawn WER/CER error curves + shaded confidence corridor) + animated audio wave bars | Pie rings |
| **05 · DermoPed Pediatric AI (`/features/pediatric-rash` & Chapter 06)** | **`CohortWaffleMatrixChart`** (22-patient interactive dot-matrix grid `19` Chickenpox + `3` Pediculosis `pt72/pt71/pt74` + SHA-256 weight integrity strip) | Standard horizontal bar lists |
| **Homepage Observatory Summary (`#impact`)** | **`DigitalObservatoryDeck`** (60fps orbiting `DonutPieGauge` + `SegmentedPieBar` platform summary) | Individual `/features/*` pages |
