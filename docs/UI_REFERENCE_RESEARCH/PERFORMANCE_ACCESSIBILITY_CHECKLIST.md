# ⚡ ShasthoSetu AI — Performance, Responsiveness & Accessibility Checklist

**Document Reference:** `docs/UI_REFERENCE_RESEARCH/PERFORMANCE_ACCESSIBILITY_CHECKLIST.md`  
**Task ID:** `UI-00`  
**Applicable Standards:** WCAG 2.2 Level AA, Master SRS v2.0 Sections 17–20 & 36–39 (`V2-T-026`, `V2-T-028`, `V2-T-040`)  
**Verification Gate Rule:** No feature UI task (`UI-01..UI-08`) closes as `DONE` until its applicable checklist rows pass automated tests (`Vitest`, `Playwright`) and manual inspection.

---

## 1. Responsive Breakpoints & Layout Integrity (`V2-T-028`)

| Target Viewport | Device Class | Layout Rules & Mandatory Checks |
| :--- | :--- | :--- |
| **`360x800`** | Budget Bangladesh Android phone | **Baseline mobile gate.** Single-column layout, zero horizontal scroll (`document.documentElement.scrollWidth <= window.innerWidth`), sticky primary CTA reachable with thumb, dense ledger tables switch to stacked cards OR internal horizontal scroll container with swipe indicator. |
| **`390x844`** | Standard smartphone | Verified match against 4 reference UIs; mobile hamburger/drawer nav or bottom bar; modals occupy full sheet cleanly without clipping footer actions. |
| **`768x1024`** | Tablet / Nurse desk tab | 2-column KPI grid, collapsible sidebar rail (`72px`), `SplitDocumentReviewer` usable without crushed inputs. |
| **`1440x900`** | Clinic / Admin desktop | Persistent `256px` left role sidebar + `1280px` max content width (`max-w-7xl`); Split OCR reviewer side-by-side; full dense DataTable columns visible. |

---

## 2. Touch Targets, Controls & Visual Ergonomics

- **[A11Y-01] Minimum `44x44px` Interactive Targets:** Every primary button, slot chip, nav item, language toggle, notification trigger, and modal close button enforces `min-h-11 min-w-11` (`44px x 44px`), avoiding small dense clickable text links.
- **[A11Y-02] Visible Keyboard Focus (`2px` Ring):** Never use `outline: none` without replacement. Enforce `:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }` across every interactive element.
- **[A11Y-03] Full Keyboard Operability:**
  - `Tab` / `Shift+Tab` reaches every filter, slot card, sidebar link, and modal button in logical DOM order.
  - `ConfirmModal` traps focus inside the dialog, closes on `Escape`, and returns focus to the launching button upon close.
  - Custom `SlidePillTabs` support `ArrowLeft` / `ArrowRight` keyboard switching (`role="tablist"`, `aria-selected`).
- **[A11Y-04] Color Contrast (`>= 4.5:1` / `>= 3:1`):**
  - Default Light theme (`#0F241D` on `#F6F9F8` / `#FFFFFF`) targets `> 12:1` for primary copy and `>= 4.6:1` for `--color-text-muted` (`#476359`).
  - Status badges ALWAYS pair color with text label + Lucide icon (`ShieldAlert`, `CheckCircle2`, `Clock`, `FlaskConical`), never color alone.
- **[A11Y-05] Landmark Structure & Headings:** One `<header>`, one `<nav aria-label="...">`, one `<main id="main-content">` with `"মূল বিষয়বস্তুতে যান / Skip to main content"` skip link, and strictly sequential `<h1>` -> `<h2>` -> `<h3>` heading hierarchy.

---

## 3. Bangla-First Typography & Localization Parity (`V2-T-026`)

- **[BN-01] Font Stack Priority:** `"Noto Sans Bengali", "Plus Jakarta Sans", "Inter", system-ui, sans-serif`. Bengali diacritics (*matra*, *kar*, *juktakkhor*) must never touch adjacent lines or truncate in card headers (`line-height: 1.65`, `overflow-wrap: anywhere` / `break-words`).
- **[BN-02] Zero Conjunct Corruption:** Never apply per-character `<span>` splitting (such as `SplitText({ type: "chars" })` or CSS `letter-spacing` on Bengali headings), which breaks `Virama (\u09CD)` conjunct shaping in Chromium/Firefox.
- **[BN-03] Self-Hosted Metric-Matched Font Fallbacks:** Bundle `.woff2` subsets inside `apps/web/public/fonts/` with `font-display: swap` and metric-adjusted `@font-face` fallbacks (`size-adjust`, `ascent-override`, `descent-override` — adopted from `ShadowAstra_Atlas/src/styles.css`) so initial paint renders legible text with `CLS < 0.05`.
- **[BN-04] Strict Translation Key & State Parity:** When switching between `bn` and `en`:
  - Navigation labels, form labels, validation errors, HTTP error banners, timestamps (`Asia/Dhaka`), status badges, and BDT `৳` formatted amounts update immediately without mixed broken keys or raw enum strings (`AWAITING_DEMO_PAYMENT`).
  - `DEMO_ONLY` / `RESEARCH_PREVIEW` / `URGENT_REFERRAL` disclaimers remain permanently visible in both languages (`FR-SEC-209`).

---

## 4. Motion, 3D & GPU Performance Budgets

| Budget Item | Target Threshold | Enforcement Mechanism |
| :--- | :--- | :--- |
| **3D Engine Presence** | Public `/` Hero only (zero WebGL inside Patient/Doctor/Admin/Support portals) | Separate lazy-loaded `components/three/CareLatticeCanvas.tsx` |
| **Mobile 3D Load Deferral** | `< 900px` screens defer Three.js chunk by `1500ms` + `requestIdleCallback` | Renders HTML headline + static SVG shield first (`ShadowAstra` pattern) |
| **Idle CPU/GPU Drain** | `0` `requestAnimationFrame` draws when hero scrolled offscreen | `IntersectionObserver` toggles `frameloop="always" \| "never"` |
| **Software-GL & Low FPS Guard** | Auto-degrade on `SwiftShader`/`llvmpipe` or `< 22 FPS` | `AdaptiveDpr` lowers DPR to `0.5–0.75` and sets `html.gpu-lite` disabling expensive blurs |
| **WCAG 2.2.2 Motion Control** | Instant freeze / zero parallax when enabled | Respects `prefers-reduced-motion` AND footer `"Pause Motion / গতি থামান"` button (`localStorage`) |
| **WebGL Memory Leak Prevention** | `0` retained detached `<canvas>` listeners or `dfgLUT` textures across navigations | `CreateOrbit` root cleanup + `ReleaseGPU` traversal (`ShadowAstra/Controls.tsx`) |
| **Core Web Vitals (Local Build)** | `CLS < 0.05`, `FCP < 1.5s` on desktop / `LCP < 2.5s` throttled | Measured via Playwright PerformanceNavigationTiming / Lighthouse |
| **External CDN Dependency Count** | `0` runtime CSS/font/JS CDNs (`cdn.tailwindcss.com` strictly prohibited) | Vite production bundle contains 100% compiled CSS, icons, fonts, and Draco WASM |

---

## 5. Offline, Network Latency & Clinical Honesty Checks (`V2-T-040`)

- **[NET-01] No Optimistic Lies on Critical Mutations:** Booking a slot, demo checkout payment, confirming an appointment, signing a doctor note, approving a doctor, or escalating a support ticket NEVER displays a success toast or updates final badge status until the authoritative HTTP `200`/`201` arrives from FastAPI.
- **[NET-02] Refresh Persistence Mid-Flow (`V2-T-027`):** Refreshing `/patient/checkout/:id` or `/patient/book/:slotId` re-fetches authoritative backend state (`AWAITING_DEMO_PAYMENT`, `DEMO_PAID`, `HELD`, etc.) cleanly.
- **[NET-03] Explicit Offline Degradation:**
  - Detect offline state -> surface amber sticky bar (`"অফলাইন মোড — সংরক্ষণ ও বুকিং বন্ধ আছে"`).
  - Read-only viewing of the signed-in user's cached medication schedule permits queuing adherence taps locally with a visible amber `PENDING_SYNC` pill — **never** marking `"Server Confirmed"` until synced, and clearing local user cache cleanly upon `Logout` so multi-user clinic tablets never leak PHI.
  - Disable online-required flows cleanly (`"Book Appointment"`, `"Demo Payment"`, `"Upload Prescription"`, `"Clinical AI Preview"`).
- **[NET-04] Skeleton & Error Symmetry:** Every list, KPI grid, calendar, and detail panel handles `Loading` (exact height skeleton avoiding CLS), `Empty` (actionable bilingual guidance), and `Error` (`error_code` + Retry button) gracefully.
