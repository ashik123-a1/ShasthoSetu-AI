# 🔍 ShasthoSetu AI — Four-Repository Complete Source Code Audit

**Document Reference:** `docs/UI_REFERENCE_RESEARCH/FOUR_REPOSITORY_SOURCE_AUDIT.md`  
**Task ID:** `UI-00`  
**Audit Date:** 2026-11-19  
**Audit Methodology:** Direct shallow clone inspection (`git rev-parse HEAD`, manifest parsing, entrypoint & component code reading, CSS/token extraction, auth/RBAC/DB inspection, security & test configuration audit).  
**Truthfulness Tagging:**
- **`[SOURCE VERIFIED]`** — Directly observed in cloned source files cited by exact relative path.
- **`[README CLAIM]`** — Claimed in repository `README.md` or docs, not re-executed in this audit step unless noted.
- **`[NOT VERIFIED]`** — Not independently run or absent from local source inspection.

---

## 1. Executive Summary & Ownership Comparison

| Repository | GitHub URL | Verified Commit SHA (`HEAD`) | Ownership & License | Primary Stack | Primary Inspiration for ShasthoSetu AI |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. AgriSense Fusion** | `https://github.com/ASHIK311/agrisense-fusion` | `58c9bbc722b28f41fdbf045a79a5a4d787631706` | Project Owner (`MIT License`, `LICENSE`) `[SOURCE VERIFIED]` | React 18.3, Vite 5.4, Three.js 0.187, GSAP 3.15, Express 5.3, `node:sqlite` WAL / `pg` | Primary visual hierarchy, command cockpit, hero/canvas depth, GSAP `slideFill()` pill nav, provenance badges |
| **2. ShadowAstra Atlas** | `https://github.com/ABRUBAB/ShadowAstra_Atlas` | `9f2f04f083689ee39eef4297eae1567cff9beb47` | Owner's Friend (`MIT License`, `LICENSE`; NASA imagery separate) `[SOURCE VERIFIED]` | React 19.3, TS 7, Vite 8.3, Tailwind v4, R3F 9.8, Three 0.186, GSAP 3.15, Lenis 1.3, Motion 14.1 | 3D/animation performance patterns, WebGL fallback, memory-leak cleanup, `prefers-reduced-motion` + manual pause, dark/light tokens |
| **3. Finova-Finpilot** | `https://github.com/ashik123-a1/Finova-Finpilot` | `70c60f0951ef075b4fb4d657e811e2afa8e63c27` | Project Owner (`MIT License`, `LICENSE`) `[SOURCE VERIFIED]` | Python FastAPI, SQLAlchemy 2.0, SQLite (`001`–`008` SQL migrations), Jinja2, Tailwind CDN | Integer minor-unit (`BIGINT` Poisha) finance precision, ledger filters/tables, receipts, i18n formatting, PBKDF2+HMAC tokens |
| **4. Land-Guard** | `https://github.com/ashik123-a1/Land-Guard` | `6d332e6ad918dfdf887ed02480ca64b12134cc10` | Project Owner (`No LICENSE file in root` `[SOURCE VERIFIED]`) | Python FastAPI, SQLite (`landguard_operational.db`) / `psycopg2`, Jinja2, Tailwind CDN, RapidOCR, XGBoost | Multi-role portal isolation (`/user` vs `/admin` 303/403 guards), open-redirect sanitizer, Bangla-first UX, stateful hands-free voice controller |

---

## 2. Repository 1: `ASHIK311/agrisense-fusion` (15-Dimension Audit)

1. **Commit SHA & Timestamp `[SOURCE VERIFIED]`:** `58c9bbc722b28f41fdbf045a79a5a4d787631706` (`2026-11-13 13:43:42 +0600`).
2. **License & Ownership `[SOURCE VERIFIED]`:** `LICENSE` declares `MIT License — Copyright (c) 2026 AgriSense Fusion Team / Nakib Md Ashik`. Safe for architectural reuse by project owner.
3. **Directory Tree `[SOURCE VERIFIED]`:** Monorepo with root Express backend (`server/`), Postgres schema (`database/schema.sql`), extensive docs (`documentation/`), and Vite React SPA (`frontend/src/`). Total 407 code/doc files (`frontend/src/components/` alone has 50+ modules including `agronomy/`, `charts/`, `methods/`, `whatif/`).
4. **Package Manifests & Dependencies `[SOURCE VERIFIED]`:**
   - Root `package.json`: `"main": "server/index.js"`, `express ^5.3.0`, `bcryptjs ^3.0.3`, `jsonwebtoken ^9.0.3`, `cors ^2.8.6`, `pg ^8.23.1`.
   - Frontend `frontend/package.json`: `react ^18.3.1`, `react-dom ^18.3.1`, `three ^0.187.0`, `gsap ^3.15.1`, `leaflet ^1.9.4`, `lucide-react ^1.71.0`, `vite ^5.4.14`. No CSS framework dependency (vanilla custom CSS variables).
5. **Frontend Entry Points & Routes `[SOURCE VERIFIED]`:**
   - `frontend/src/main.jsx` -> `frontend/src/App.jsx` (`AgriSenseShell` inside `AgriSenseProvider`).
   - Workspace state-driven routing via `frontend/src/context/AgriSenseContext.jsx` (`WORKSPACES`: `command`, `earth-lab`, `hydrology`, `agronomy`, `simulator`, `methods`, `report`, `assistant`, plus `LEGACY_ROUTE_MAP` and `viewMode` toggling `home` vs `app`).
6. **Layout & Reusable Components `[SOURCE VERIFIED]`:**
   - `Header.jsx`: 3-zone floating glass header (`Brand Left | 7-Tab GSAP Sliding Pill Center | Search + Alerts + Settings Right`) + responsive mobile drawer.
   - `CommandDeck.jsx`: Category sidebar (`SIDE_CATEGORIES`) + top subtabs using `slideFill()` from `utils/motion.js`, KPI gauges (`AnimatedMetricCard.jsx`), geospatial CRUD modals (`FarmFieldCrudModal.jsx`), and explicit `ProvenanceBadge.jsx` (`badge-live`, `badge-nasa`, `badge-demo`, `badge-blocked`).
   - `DynamicIsland.jsx`, `CommandPaletteModal.jsx`, `GlobalDrawers.jsx`, `HomeSectionRail.jsx`, `HomeStoryPage.jsx` (2,856-line scrollable storytelling homepage).
7. **Colors, Typography, Spacing & Design Tokens `[SOURCE VERIFIED]`:**
   - Defined in `frontend/src/index.css` (lines 8–124):
     - Forest-Emerald Obsidian surfaces: `--bg-canvas: #060D0A`, `--bg-forest: #0C1F17`, `--glass-bg: rgba(10, 21, 16, 0.80)`, `--glass-blur: blur(28px) saturate(170%)`, `--glass-border: rgba(52, 211, 153, 0.20)`.
     - Accents: `--primary: #10B981`, `--accent-primary: #34D399`, `--accent-gold: #FBBF24`, `--accent-water: #38BDF8`, `--accent-danger: #F87171`.
     - Light/ivory Barind nature palette aliases: `--bn-ivory: #F5F2E9`, `--bn-charcoal: #1D2922`.
     - Zero serif fonts rule: `--font-display: 'Plus Jakarta Sans', 'Inter', 'Noto Sans Bengali', ...`, `--font-sans: 'Inter', 'Plus Jakarta Sans', 'Noto Sans Bengali', ...`, `--font-mono: 'JetBrains Mono', ...`.
     - Fluid `clamp()` typography scale (`--text-hero: clamp(2.25rem, 1.65rem + 2.4vw, 4.1rem)`).
8. **Animations & Interaction Code `[SOURCE VERIFIED]`:**
   - `frontend/src/utils/motion.js`: `slideFill(fill, to, immediate, options)` animates CSS `clipPath: inset(t r b l round radius)` with dual timing (leading edge `0.32s-0.35s power3.out`, trailing edge `0.52s-0.55s power2.inOut`) for fluid elastic tab indicators.
   - `App.jsx` (lines 118–146): global `.is-scrolling` flag debounced 150ms to prevent hover/tooltip flicker while scrolling.
9. **3D Objects & Rendering Libraries `[SOURCE VERIFIED]`:**
   - `HeroThreeLandscape.jsx` (865 lines): raw `THREE.WebGLRenderer` (ACESFilmicToneMapping, pixelRatio capped `<= 1.75`), procedural `valleyMasterplateDepth(u, v)` mesh, custom GLSL `ShaderMaterial`, `GLTFLoader` + `DRACOLoader` loading `/models/gpm.glb` (`2.25 MB`) with local `/draco/gltf/` decoders, interactive 4-layer exploded data cube (`sliceGroups`), pointer parallax, and WebGL failure image fallback (`/story-assets/barind-orbital-valley.jpg`).
   - Also `ThreeLandscapeStage.jsx`, `ThreeCropCompareStage.jsx`, `StratigraphicTwinCanvas.jsx`.
10. **Backend APIs `[SOURCE VERIFIED]`:**
    - `server/index.js`: Express 5.3.0 REST server on port `5000`, mounts `/api/v1/auth`, `farmRoutes`, `weatherRoutes`, `sensorRoutes`, `satelliteRoutes`, `agronomyRoutes`, `physicsRoutes`, `diseaseRoutes`, `alertRoutes`, `groundwaterRoutes`, `waterRoutes`, `reportRoutes`, `assistantRoutes` (SSE `/stream` + `/chat`), and `/api/v1/health`.
11. **Authentication & Role Management `[SOURCE VERIFIED]`:**
    - `server/services/authService.js` + `server/middleware/auth.js`: `bcryptjs` hashing + `jsonwebtoken` (`7d`). Public `/register` strictly hardcodes `assignedRole = 'farmer'` ignoring client `role` payloads (`P0-01`). Constant-time `crypto.timingSafeEqual` for device key checks; `requireRoles(...allowedRoles)` checks `req.user.role` (allowing `admin` override).
12. **Database Integration `[SOURCE VERIFIED]`:**
    - Dual relational abstraction in `server/storage/db.js`: PostgreSQL `Pool` (if `DATABASE_URL` configured, using `database/schema.sql` with PostGIS) OR zero-dependency native Node `node:sqlite` (`DatabaseSync`) configured with `PRAGMA journal_mode = WAL`, `PRAGMA synchronous = NORMAL`, `PRAGMA foreign_keys = ON`, `PRAGMA busy_timeout = 5000`.
13. **Voice-Related Features `[SOURCE VERIFIED]`:**
    - Text-only RAG assistant (`AssistantPanel.jsx`, `FloatingAssistantDrawer.jsx`, `assistantService.js`); NO Web Speech / ASR / TTS microphone module found in `frontend/src/` `[SOURCE VERIFIED]`.
14. **Error Handling, Validation, Tests, Docs & CI `[SOURCE VERIFIED]`:**
    - `assistantRoutes.js` rejects `user_id` body spoofing with HTTP `403`, enforces `MAX_MESSAGE_CHARS = 4000`, wraps chat calls in `withAssistantTimeout` (`504`).
    - `.github/workflows/ci.yml` runs `npm test` (`[README CLAIM]`: 94/94 tests passing across `server/tests/*.test.js` including security regression & persistence safety) + Python py_compile + Vite build.
15. **Architecture & Security Risks `[SOURCE VERIFIED]`:**
    - **Positive patterns to reuse:** Strict ignoring of client-supplied `role` during public registration; `node:sqlite` WAL/FK pragmas; explicit `ProvenanceBadge` (`SIMULATED`, `BLOCKED`); `is-scrolling` hover flicker prevention.
    - **Risks / Anti-patterns to avoid in ShasthoSetu:** `App.jsx` fetches `/api/dashboard` on mount without requiring login (`optionalAuth`), unsuitable for Patient/Doctor PHI; `authService.js` retains a hardcoded dev JWT fallback string in non-production (`'agrisense-fusion-jwt-dev-secret-key-2026-field-shift'`); monolithic CSS file (`index.css` is `155 KB`) and state-only routing instead of URL routes.

---

## 3. Repository 2: `ABRUBAB/ShadowAstra_Atlas` (15-Dimension Audit)

1. **Commit SHA & Timestamp `[SOURCE VERIFIED]`:** `9f2f04f083689ee39eef4297eae1567cff9beb47` (`2026-11-14 16:21:14 +0600`).
2. **License & Ownership `[SOURCE VERIFIED]`:** `LICENSE` declares `MIT License — Copyright (c) 2026 Team ShadowAstra (Abdullah Rubab)`. NASA imagery separate; ShadowAstra logo reserved. Owner's friend's repository — use strictly as technical/visual reference, do not copy branding/logo.
3. **Directory Tree `[SOURCE VERIFIED]`:** Clean TypeScript Vite app in root (`src/pages/`, `src/components/three/`, `src/components/ui/`, `src/components/map/`, `src/lib/`), Vitest unit tests (`tests/unit/`), Playwright E2E + a11y + no-WebGL tests (`tests/e2e/`), offline Python/Kaggle pipelines (`pipeline/`, `kaggle/`).
4. **Package Manifests & Dependencies `[SOURCE VERIFIED]`:**
   - `package.json`: `react ^19.3.0`, `react-router-dom ^7.18.4`, `three ^0.186.1`, `@react-three/fiber ^9.8.1`, `gsap ^3.15.0`, `@gsap/react ^2.1.2`, `lenis ^1.3.26`, `motion ^14.1.0`, `leaflet ^1.9.4`, `react-leaflet ^5.0.0`, `lucide-react ^1.55.0`, `tailwindcss ^4.3.3` (`@tailwindcss/vite`), `@playwright/test ^1.64.1`, `@axe-core/playwright ^4.14.0`, `vitest ^5.0.5`.
5. **Frontend Entry Points & Routes `[SOURCE VERIFIED]`:**
   - `index.html` -> `src/main.tsx` -> `src/App.tsx`: React Router v7 client routes (`/`, `/discover`, `/report`, `/atlas`, `/lab`, `/methods`, `/about`, `/learn`, `*` `NotFound`). Routes other than `Home` are `lazy()` loaded with `Suspense` + `requestIdleCallback` prefetching.
6. **Layout & Reusable Components `[SOURCE VERIFIED]`:**
   - `src/components/ui/kit.tsx`: Polished accessible primitives (`Counter`, `Ring` SVG gauge, `Meter`, `Toaster`, `BackToTop`, `useSpotlight`, `useScrollingFlag`).
   - `src/components/ui/Chrome.tsx`: Sticky `Nav`, `Footer` with live **"Pause motion" WCAG 2.2.2 toggle** and theme toggle.
   - `src/components/ui/Safe.tsx`: `ErrorBoundary`, `Scene` (WebGL context-lost handler with recovery button), `StaticGlobe` (non-WebGL CSS sphere fallback).
   - `src/components/ui/CommandPalette.tsx`: `Ctrl+K` / `/` quick finder.
7. **Colors, Typography, Spacing & Design Tokens `[SOURCE VERIFIED]`:**
   - Documented in `DESIGN.md` & implemented via Tailwind v4 `@theme` in `src/styles.css` (lines 43–143):
     - Warm Observatory Dark (default): `--color-void: #07080A`, `--color-ink: #0B0C0F`, `--color-panel: #101114`, `--color-line: #212226`, `--color-platinum: #EDEAE4`, `--color-chrome: #A8A59E`, `--color-dim: #807E78` (verified 4.65:1+ WCAG AA), single sunlight accent `--color-flare: #F2C879`, muted states `--color-strong: #7CC8A0`, `--color-partial: #E3B35E`, `--color-weak: #E47A63`.
     - Warm Paper Light (`[data-theme="light"]`): `--color-void: #F3EFE6`, `--color-panel: #FBF8F2`, `--color-platinum: #1C1A16`, `--color-flare: #8F5414`.
     - Metric-matched `@font-face` fallbacks (`size-adjust`, `ascent-override`) eliminate webfont layout shift (`CLS`).
8. **Animations & Interaction Code `[SOURCE VERIFIED]`:**
   - `src/pages/Home.tsx`: `gsap.context` via `@gsap/react` (`useGSAP`), `SplitText` word-mask headline reveal (`duration: 1.4, stagger: 0.07, ease: "expo.out"`), `ScrollTrigger.batch("[data-reveal]", { once: true })`, hero scroll parallax (`scrub: true`).
   - `src/lib/useSmoothScroll.ts`: `Lenis({ lerp: 0.1 })` synced to `gsap.ticker`, homepage only, disabled if `motionReduced()`.
   - `src/App.tsx`: `MotionConfig reducedMotion={reduced ? "always" : "never"}`, `RouteBeam` (gold 2px top sweep on navigation), `ScrollProgress` (`useSpring`), `PageFade`.
   - `src/lib/motionPref.ts`: `useSyncExternalStore` combining OS `(prefers-reduced-motion: reduce)` with user-controlled `localStorage("sa-motion")` toggle (`html.reduce-motion`).
9. **3D Objects & Rendering Libraries `[SOURCE VERIFIED]`:**
   - `src/components/three/HeroScene.tsx`: `@react-three/fiber` `<Canvas dpr={[1, 1.6]} frameloop={visible ? "always" : "never"}>` with `IntersectionObserver` pausing off-screen render loops! Phones (`window.innerWidth < 900`) defer mounting 3D until `1.5s` / `requestIdleCallback`.
   - `src/components/three/Controls.tsx`: Fixes `three r186` `OrbitControls` `keydown` document leak (`createOrbit`), releases `sharedLUT` (`dfgLUT`) GPU memory on unmount (`ReleaseGPU`), and dynamically steps down DPR (`AdaptiveDpr`) + adds `html.gpu-lite` disabling expensive backdrop blur when software WebGL (`SwiftShader`/`llvmpipe`) is detected.
10. **Backend APIs `[SOURCE VERIFIED]`:** None — purely static frontend SPA reading local binary/JSON assets (`public/data/*.bin`, `public/data/*.json`).
11. **Auth & Role Management `[SOURCE VERIFIED]`:** None — public educational/scientific explorer with no login, RBAC, or user accounts.
12. **Database Integration `[SOURCE VERIFIED]`:** None — client-side `localStorage` (`sa-motion`, `sa-nudged`) only.
13. **Voice-Related Features `[SOURCE VERIFIED]`:** None (`AskAstra.tsx` is deterministic/data-grounded text Q&A widget).
14. **Error Handling, Tests, Docs & CI `[SOURCE VERIFIED]`:**
    - Exceptional QA automation: `playwright.config.ts` runs 3 browser projects (`desktop`, `phone` Pixel 7, `no-webgl` with GPU disabled); `.github/workflows/ci.yml` executes `tsc`, Vitest unit/Python parity checks, production bundle gzip telemetry, Playwright E2E + `@axe-core/playwright` a11y checks, and `gitleaks`.
15. **Architecture & Security Risks `[SOURCE VERIFIED]`:**
    - **Positive patterns to reuse:** Metric-matched fallback fonts (zero CLS); `IntersectionObserver` pausing hidden 3D frames; idle-mount 3D on mobile; WebGL `Scene` ErrorBoundary + static fallback; `prefers-reduced-motion` + manual pause; `AdaptiveDpr` + `gpu-lite`; `axe-core` automated accessibility testing.
    - **Gaps / Cautions:** Zero backend, auth, DB, or patient privacy infrastructure; dark observatory aesthetic would hurt readability in sunlit clinical/rural settings unless paired with the light warm-paper mode (`[data-theme="light"]`) as default for ShasthoSetu.

---

## 4. Repository 3: `ashik123-a1/Finova-Finpilot` (15-Dimension Audit)

1. **Commit SHA & Timestamp `[SOURCE VERIFIED]`:** `70c60f0951ef075b4fb4d657e811e2afa8e63c27` (`2026-10-20 20:02:48 +0600`).
2. **License & Ownership `[SOURCE VERIFIED]`:** `LICENSE` declares `MIT License — Copyright (c) 2026 Finova Finpilot Team (FinTechathon 2026)`. Owned by project owner (`ashik123-a1`).
3. **Directory Tree `[SOURCE VERIFIED]`:** Clean Python modular monolith: `src/api/` (FastAPI routes), `src/core/` (security, money, exceptions), `src/database/` (SQLAlchemy ORM + numbered SQL migrations `001`–`008`), `src/finance/` (calculator, PDF packets, exporters), `src/i18n/` (`en`, `bn`, `zh`, `ar`, `es`, `hi` JSON locales + formatters), `src/web/` (Jinja2 templates + static CSS/JS), `tests/` (28 pytest files).
4. **Package Manifests & Dependencies `[SOURCE VERIFIED]`:**
   - `requirements.txt`: `fastapi>=0.115.0`, `uvicorn>=0.30.0`, `sqlalchemy>=2.0.0`, `pydantic>=2.8.0`, `python-multipart`, `pandas`, `scikit-learn`, `reportlab`, `pytest`, `httpx`, `jinja2`.
5. **Frontend Entry Points & Routes `[SOURCE VERIFIED]`:**
   - `src/web/router.py` renders SSR HTML pages: `/`, `/landing`, `/how-it-works`, `/login`, `/register`, `/app/dashboard`, `/app/onboarding`, `/app/finance`, `/app/documents`, `/app/customers`, `/app/inventory`, `/app/loans`, `/app/forecast`, `/app/reports`, `/app/notifications`, `/app/audit`, `/app/admin`, `/app/settings`, `/app/copilot`, `/app/voice`.
6. **Layout & Reusable Components `[SOURCE VERIFIED]`:**
   - `src/web/templates/base.html` -> `src/web/templates/app/layout.html` & `admin_layout.html`: collapsible glass sidebar (`--lg-sidebar-expanded: 16rem`, `--lg-sidebar-collapsed: 72px`) with macOS-style window dots and ambient background canvas; `app/finance.html` implements KPI metric cards (`pl-revenue`..`pl-vat`), date-range filter bar, Ledger tab switcher (`sales` vs `expenses`), CSV export button, and paginated data tables.
7. **Colors, Typography, Spacing & Design Tokens `[SOURCE VERIFIED]`:**
   - `src/web/static/css/theme.css`: Deep slate navy `--lg-bg: #020617`, `--lg-surface: #0F172A`, `--lg-primary: #22D3EE`, `--lg-success: #34D399`, `--lg-warning: #FBBF24`, `--lg-error: #FB7185`, `--lg-border: #1E293B`, glass blur `16px`. Fonts: `Inter`, `Noto Sans SC`, `Noto Sans Bengali`, `JetBrains Mono`, `Orbitron`.
8. **Animations & Interaction Code `[SOURCE VERIFIED]`:**
   - `theme.css`: CSS keyframe transitions (`180ms-250ms` cubic-bezier `(0.16, 1, 0.3, 1)`), button hover sheen sweep (`::after` `skewX(-20deg)`), SVG animated preloaders (`assets/preloader.svg`), Chart.js charts, and `prefers-reduced-motion: reduce` override. No Three.js or GSAP.
9. **3D Objects & Rendering `[SOURCE VERIFIED]`:** None.
10. **Backend APIs `[SOURCE VERIFIED]`:**
    - `src/api/app.py`: FastAPI with lifespan auto-running `apply_migrations(engine)`, GZip compression (`minimum_size=500`), custom exception handlers returning sanitized JSON errors (`error`, `detail`, `error_code`) without stack traces (`ShopAccessDeniedError` -> 403, `DuplicateDocumentError` -> 409). Modular routers in `src/api/routes/`.
11. **Authentication & Role Management `[SOURCE VERIFIED]`:**
    - `src/core/security.py`: Zero-external-dependency PBKDF2-HMAC-SHA256 (`200,000` iterations) password hashing (`hmac.compare_digest`), signed session tokens (`user_id:expire_at:hmac`), `CANONICAL_ROLE_PERMISSIONS` for 8+ roles (`super_admin`, `owner`, `manager`, `accountant`, `sales`, `inventory`, `auditor`), `enforce_shop_isolation()` tenant boundary check.
    - `src/api/routes/auth.py`: `/auth/register`, `/auth/login`, `/auth/demo-login` (`DEMO_PERSONA_MAP`).
12. **Database Integration `[SOURCE VERIFIED]`:**
    - SQLAlchemy 2.0 + SQLite (`sme_finance.db`) with raw SQL migration runner (`001_initial_schema.sql` through `008_report_executions.sql`). Crucially enforces integer minor units (`BIGINT` Poisha/Cents) for all money amounts so floats never corrupt accounting (`001_initial_schema.sql` L3, L100, L119).
13. **Voice-Related Features `[SOURCE VERIFIED]`:**
    - `src/web/static/js/voice_controller.js` (`35 KB`) + `src/ai/voice_service.py` (`35 KB`) + `src/api/routes/voice.py` (`18 KB`) with authorization barrier before consequential ledger writes (`[README CLAIM]` / partial source observed in `templates/app/voice.html`).
14. **Error Handling, Validation, Tests & CI `[SOURCE VERIFIED]`:**
    - Comprehensive `tests/` directory (28 files covering RBAC permissions, shop isolation, finance calculator precision, PDF report generation, multilingual i18n). `[README CLAIM]`: `224/224` pytest passing.
15. **Architecture & Security Risks `[SOURCE VERIFIED]`:**
    - **Positive patterns to reuse:** `BIGINT` minor-unit money (`amount_minor` BDT Poisha); clean JSON exception handlers (403/404/409); `LocaleFormatter` (`en`/`bn`); KPI + filter + paginated ledger + export table layout; PBKDF2 password hashing.
    - **Critical Security Risks to AVOID in ShasthoSetu:**
      1. **`get_web_context()` unauthenticated fallback (`src/web/router.py` L193–203):** When no valid token exists, web SSR routes silently assign a mock `user_id: 1` (`demo_owner` / `sme_role` cookie!) for "out-of-the-box exploration". **Strictly forbidden** under ShasthoSetu SRS `FR-AUTH-104` & `FR-SEC-201`.
      2. **Permissive CORS (`src/api/app.py` L77–83):** `CORSMiddleware` sets `allow_origins=["*"]` with `allow_credentials=True` (browsers/specs forbid wildcard origin + credentials).
      3. **Default `SECRET_KEY` fallback (`src/config.py` L41–46):** Logs only a warning in `production` instead of failing closed.
      4. **CDN Tailwind/Chart.js (`base.html` L14):** Relies on `cdn.tailwindcss.com` JIT script in browser — incompatible with ShasthoSetu's offline/PWA target and strict CSP.

---

## 5. Repository 4: `ashik123-a1/Land-Guard` (15-Dimension Audit)

1. **Commit SHA & Timestamp `[SOURCE VERIFIED]`:** `6d332e6ad918dfdf887ed02480ca64b12134cc10` (`2026-10-18 16:31:00 +0600`).
2. **License & Ownership `[SOURCE VERIFIED]`:** Project Owner (`ashik123-a1`); note that no `LICENSE` file exists in repository root `[SOURCE VERIFIED]` (safe to reuse because `ashik123-a1` is the ShasthoSetu project owner; still add an explicit `MIT` `LICENSE` before public submission).
3. **Directory Tree `[SOURCE VERIFIED]`:** Clean Python layered package under `src/`: `landguard_web/` (routers, dependencies, localization, templates, static), `landguard_services/` (13 domain services), `landguard_data/` (repositories pattern + `database.py`), `landguard_ai/` (complaint analyzer & voice assistant), `landguard_vision/` (RapidOCR + tamper detection), `landguard_models/` (XGBoost + deterministic rule governance), `migrations/001_initial_schema.sql`, and `tests/` (40 test files).
4. **Package Manifests & Dependencies `[SOURCE VERIFIED]`:**
   - `requirements.txt`: `fastapi>=0.110.0`, `uvicorn[standard]>=0.28.0`, `jinja2>=3.1.2`, `pydantic>=2.0.0`, `xgboost>=2.0.0`, `rapidocr-onnxruntime>=1.3.0`, `pymupdf>=1.23.0`, `qrcode[pil]`, `reportlab`, `edge-tts>=6.1.0`, `psycopg2-binary`.
5. **Frontend Entry Points & Routes `[SOURCE VERIFIED]`:**
   - `src/landguard_web/app.py` mounts 10 domain FastAPI routers:
     - Public/Auth (`auth.py`): `/`, `/login`, `/access-denied`, `/not-found`, `/logout`, `/api/auth/login`, `/api/auth/demo-login`.
     - Citizen Portal (`citizen.py`, `complaints.py`, `parcels.py`, `verifications.py`): `/user/dashboard`, `/user/parcels`, `/user/verify`, `/user/complaints`, `/user/history`, `/user/notifications`, `/user/voice`, `/user/profile`, `/user/settings`.
     - Admin/Investigator Portal (`cases.py`, `analytics.py`, `reports.py`, `documents.py`): `/admin/dashboard`, `/admin/cases`, `/admin/verifications`, `/admin/parcels`, `/admin/users`, `/admin/reports`, `/admin/analytics`, `/admin/audit`, `/admin/models`, `/admin/system`.
6. **Layout & Reusable Components `[SOURCE VERIFIED]`:**
   - Clean physical separation between Citizen portal (`templates/user/layout.html`) and Admin portal (`templates/admin/layout.html`), landing components (`components/landing_*.html`), and shared UI macro kit (`components/ui_components.html`).
   - Verified dual-role portal isolation (`require_citizen_access` vs `require_admin_access` in `dependencies.py`).
7. **Colors, Typography, Spacing & Design Tokens `[SOURCE VERIFIED]`:**
   - `static/css/theme.css` + `templates/base.html`: Navy-Cyan Dark (`--lg-bg: #020617`, `--lg-surface: #0F172A`, `--lg-primary: #22D3EE`) identical token base to Finova; explicitly adds **`Noto Sans Bengali`** and **`Hind Siliguri`** Google Fonts + **`bn` as default primary language** (`get_preferred_language` fallback `lang or "bn"` in `dependencies.py` L24, L52).
8. **Animations & Interaction Code `[SOURCE VERIFIED]`:**
   - `landguard_preloader_animated.svg` + `landing_preloader.html` SVG orbital animations, glass hover transitions (`180ms–250ms`), CSS keyframe orbit rotation (`landing.html` L74–80), and `prefers-reduced-motion: reduce`.
9. **3D Objects & Rendering `[SOURCE VERIFIED]`:** None (2D interactive SVG/GeoJSON Bangladesh division map in `landing_bangladesh_map.html` + `bd_divisions.json`).
10. **Backend APIs `[SOURCE VERIFIED]`:** FastAPI with security headers middleware (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy: microphone=(self)` in `app.py` L104–110) and `language_middleware` setting `landguard_lang` cookie (`samesite="lax"`).
11. **Authentication & Role Management `[SOURCE VERIFIED]`:**
    - `routers/auth.py` + `dependencies.py`:
      - Strict HTTP `401` (`require_api_authenticated_user`) and `403` (`require_api_admin_access`) for APIs; `303 See Other` to `/login` or `/access-denied` for SSR HTML routes.
      - Open-redirect protection (`sanitize_redirect_path` blocking `//evil.com` and `/\evil.com` in `routers/auth.py` L35–53).
      - Rate limiting (`enforce_rate_limit` 10 req/60s on `/api/auth/login`).
      - Production guard disabling `/api/auth/demo-login` unless `ALLOW_DEMO_LOGIN_IN_PROD=true` (`routers/auth.py` L133–137).
      - `HttpOnly`, `SameSite=Lax` cookie (`landguard_session`) with `Secure` in production.
12. **Database Integration `[SOURCE VERIFIED]`:**
    - `migrations/001_initial_schema.sql` (`9` clean normalized table groups: `roles`, `users`, `sessions`, `parcels`, `ownership_events`, `deeds`, `mutations`, `tax_records`, `documents`, `verification_runs`, `verification_findings`, `complaints`, `cases`, `case_notes`, `notifications`, `audit_events`) + SQLite binary `data/landguard_operational.db` (`3.07 MB`). Uses repository pattern under `src/landguard_data/repositories/`.
13. **Voice-Related Features `[SOURCE VERIFIED]`:**
    - `src/landguard_web/static/js/voice_controller.js` (1,079 lines) + `src/landguard_ai/voice_assistant.py` (`63 KB`): Persistent hands-free voice state machine (`HANDS_FREE_OFF` / `WAKE_WORD_STANDBY` / `COMMAND_LISTENING` / `PROCESSING` / `SPEAKING`), `sessionStorage` continuity across page reloads, bilingual English + Bangla phonetic wake/stop regex (`WAKE_WORD_REGEX`, `STOP_DAFFODIL_REGEX`), `voice.html` HUD orb canvas, and `edge-tts` synthesis. (Note: For ShasthoSetu AI, voice UI remains deferred to Phase G per SRS v2.0, while these safety confirmation patterns are incorporated into our future design blueprint).
14. **Error Handling, Tests, Docs & CI `[SOURCE VERIFIED]`:**
    - 40 pytest suites under `tests/` (`test_auth_and_portals.py`, `test_security_authorization.py`, `test_sqlite_persistence.py`, `test_hello_daffodil_voice_control.py`, etc.). `[README CLAIM]`: `277/277` tests passing.
15. **Architecture & Security Risks `[SOURCE VERIFIED]`:**
    - **Positive patterns to reuse:** Physical separation of portal routers & templates; fail-closed API `401`/`403` vs SSR redirect; open-redirect sanitization; rate-limiting on auth endpoints; production demo-login kill-switch; append-only `audit_events`; Bengali-first font & cookie middleware.
    - **Risks / Anti-patterns to avoid in ShasthoSetu:**
      1. **CORS fallback (`src/landguard_web/app.py` L75–81):** Sets `allow_origins=["*"]` when `ALLOWED_ORIGINS` env is unset — ShasthoSetu must use AgriSense's fail-closed `NODE_ENV`/`ENVIRONMENT=production` allowlist check.
      2. **Monolithic template & translation files:** `templates/user/verify.html` (`173 KB`), `voice.html` (`96 KB`), and `localization.py` (`199 KB` inline Python dict) reduce maintainability — ShasthoSetu will use modular React + TypeScript components and external `bn.json` / `en.json` locale bundles (as Finova does cleanly in `src/i18n/locales/`).
      3. **Runtime CDN dependencies (`base.html` L13, L46):** Tailwind CDN & unpkg Lucide prevent reliable offline/PWA operation and strict CSP headers — ShasthoSetu will bundle Tailwind + Lucide via Vite.

---

## 6. Cross-Repository Synthesis Matrix for ShasthoSetu AI

| Capability Layer | Best Reference Pattern Adopted | Target Adaptation for ShasthoSetu AI (`UI-01..QA-02`) |
| :--- | :--- | :--- |
| **Frontend Build & Styles** | `ShadowAstra_Atlas` (Vite + React + TS + Tailwind v4 CSS `@theme`, metric-matched fonts, light/dark modes) | Bundled Vite + React + TS + Tailwind v4 with `Noto Sans Bengali` + `Plus Jakarta Sans`, defaulting to warm high-contrast daylight theme (better for clinic/patient readability) with optional dark mode. |
| **Homepage & Dashboard Chrome** | `agrisense-fusion` (`Header.jsx` GSAP `slideFill()` nav, `CommandDeck.jsx` category rail + badges, `HomeStoryPage.jsx`) | Healthcare story landing page + dedicated 4-role workspace shells, explicit `DEMO` / `RESEARCH PREVIEW` / `SIMULATED` badges. |
| **3D Hero & Smooth Motion** | `ShadowAstra_Atlas` (`HeroScene.tsx` R3F + `IntersectionObserver`, `Controls.tsx` leak fixes + `AdaptiveDpr`, `Safe.tsx` static fallback, `motionPref.ts` WCAG pause toggle) + `agrisense-fusion` (`HeroThreeLandscape.jsx` layers) | Interactive clinical/molecular/cellular 3D emblem hero on homepage only; idle-mounted on mobile; hard auto-fallback to crisp SVG/PNG when WebGL absent or `prefers-reduced-motion` / user Pause is active. |
| **Role-Based Security & Auth** | `Land-Guard` (`dependencies.py` strict 401/403 guards, `sanitize_redirect_path`, prod demo kill-switch) + `agrisense-fusion` (reject client role on signup) + `Finova` (`security.py` PBKDF2-HMAC, HMAC tokens) | 4 separate top-level roles (`PATIENT`, `DOCTOR`, `ADMIN`, `SUPPORT`), fail-closed `403` on IDOR/role mismatch, **zero** unauthenticated demo fallback (`router.py` bug fixed), admin-only Doctor approval & Staff provisioning. |
| **SQLite Persistence & Demo Finance** | `Finova-Finpilot` (`001_initial_schema.sql` `BIGINT` minor units, finance ledger filters/receipts, i18n JSON) + `agrisense-fusion` (`WAL` + `foreign_keys=ON` + `busy_timeout=5000`) | Python FastAPI + SQLAlchemy 2.0 + Alembic + SQLite (`WAL` + `FK=ON`), `amount_minor_poisha INTEGER` (`৳500` -> `50000`), atomic slot locking (`UNIQUE(doctor_id, start_utc)` + row version), watermarked `DEMO-` receipts. |
| **Bilingual & Voice (Phase G)** | `Finova-Finpilot` (`src/i18n/locales/*.json`) + `Land-Guard` (`bn`-first middleware, `voice_controller.js` state machine & confirmation barrier) | Modular JSON `bn`/`en` locales from `UI-01`; Voice controller blueprint preserved for Phase G after RAG safety gates pass. |
