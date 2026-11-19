# 🎨 ShasthoSetu AI — Design System & Reusable Component Blueprint

**Document Reference:** `docs/UI_REFERENCE_RESEARCH/SHASTHOSETU_DESIGN_SYSTEM_BLUEPRINT.md`  
**Task ID:** `UI-00`  
**Target Stack:** React 18/19 + Vite + TypeScript + Tailwind CSS v4 (`@tailwindcss/vite`) + Lucide Icons  
**Primary Visual Language:** Trustworthy Clinical Clarity + Bangla-First Ergonomics (synthesizing AgriSense Fusion structured command surfaces, ShadowAstra contrast discipline, Finova financial tables, and Land-Guard Bengali portal ergonomics).

---

## 1. Visual Identity & Theme Tokens

Healthcare tools fail if they rely strictly on neon-cyberpunk dark screens in brightly lit clinics or pharmacies. ShasthoSetu AI adopts a **Dual-Theme Architecture** where **Clean Daylight Clinical (`[data-theme="light"]`) is the DEFAULT for Patient & Operational Portals**, while a **Calm Clinical Obsidian (`[data-theme="dark"]`)** toggle (derived from ShadowAstra contrast safety + AgriSense emerald accents) is available for low-light/evaluator rooms.

### 1.1 Color Palette (`src/styles/tokens.css` via Tailwind v4 `@theme`)

| Token | Light Mode (Default Clinical) | Dark Mode (Clinical Obsidian) | Semantic Usage & WCAG Notes |
| :--- | :--- | :--- | :--- |
| `--color-canvas` | `#F6F9F8` (Soft Mint Ivory) | `#060D0A` (AgriSense Deep Obsidian) | Page background (never stark `#FFFFFF` or `#000000` glare) |
| `--color-surface` | `#FFFFFF` (Crisp Card Surface) | `#0C1914` (Elevated Forest Glass) | Primary card, table, and modal backgrounds |
| `--color-surface-alt` | `#EDF3F1` (Subtle Mint Slate) | `#12241D` (Secondary Panel) | Zebra table stripes, filter bars, inactive tabs |
| `--color-border` | `#D3E0DC` (Clean Clinical Rule) | `rgba(52, 211, 153, 0.20)` | 1px hairlines replacing heavy drop shadows |
| `--color-text` | `#0F241D` (Deep Forest Ink) | `#F4F7F5` (Bone Platinum) | Primary headings and body copy (`> 12:1` contrast) |
| `--color-text-muted` | `#476359` (Muted Pine Slate) | `#9DB8AE` (Soft Sage Chrome) | Labels, timestamps, metadata (`>= 4.6:1` WCAG AA) |
| `--color-primary` | `#047857` (Verified Clinical Emerald) | `#10B981` (Bright Emerald) | Primary CTAs, active tabs, confirmed booking highlights |
| `--color-primary-hover` | `#065F46` | `#34D399` | Hover/focus ring accent |
| `--color-secondary` | `#0369A1` (Medical Teal-Blue) | `#38BDF8` (Calm Clinical Cyan) | Doctor schedules, links, informational highlights |
| `--color-warning` | `#B45309` (High-Contrast Amber) | `#FBBF24` | `AWAITING_DEMO_PAYMENT`, `NEEDS_VERIFICATION`, `SIMULATED / DEMO` notices |
| `--color-danger` | `#BE123C` (Clinical Crimson) | `#FB7185` | Urgent triage flags, payment failed, overdue alerts, destructive confirmations |
| `--color-research` | `#6D28D9` (Distinct Violet Badge) | `#A78BFA` | Exclusively marks **Research Preview** AI tabs so users never mistake research for clinical diagnosis |

### 1.2 Typography & Bangla-First Rendering Rules

```css
--font-sans: "Noto Sans Bengali", "Plus Jakarta Sans", "Inter", system-ui, -apple-system, sans-serif;
--font-display: "Plus Jakarta Sans", "Noto Sans Bengali", "Inter", sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
```

- **Order Choice:** Placing `"Noto Sans Bengali"` first guarantees mixed English + Bangla strings (`"অ্যাপয়েন্টমেন্ট #APT-102 — ৳500"`) render without glyph height jumping or fallback to jagged OS fonts.
- **Font Loading:** Self-host `.woff2` subsets or use async preload + metric-matched `@font-face` fallback rules (adapted from `ShadowAstra_Atlas/src/styles.css` L7–40) so Cumulative Layout Shift (`CLS`) remains `< 0.05`.
- **Line Height & Size:** Minimum `15px` (`0.9375rem`) base body size with `line-height: 1.65` for Bengali script clarity (matra/kar diacritics require extra vertical room vs Latin glyphs).
- **Zero Unicode Emojis in UI Chrome `[agrisense-fusion standard]`:** Use uniform `lucide-react` icons (`1.5px` or `1.75px` stroke) for all navigation, badges, and buttons.

---

## 2. Mandatory Trust, Demo & Safety Badge System

Adapted directly from `agrisense-fusion`'s `ProvenanceBadge.jsx` (`LIVE`, `SIMULATED`, `BLOCKED`) and SRS v2.0 Sections 29.3, 36.1, and 40.1:

| Badge Type | Color & Icon | Display Label (`bn` / `en`) | Where Enforced |
| :--- | :--- | :--- | :--- |
| **`DEMO_ONLY`** | Amber (`--color-warning`) + `FlaskConical` | `সিমুলেটেড / DEMO — আসল টাকা কাটা হবে না` | All appointment fees, bKash/Nagad/Card checkout modals, receipts, and admin finance ledger |
| **`NEEDS_VERIFICATION`** | Amber outline + `AlertTriangle` | `যাচাই প্রয়োজন / Needs Review` | Unverified OCR medicine fields (blocks schedule activation until edited/confirmed) |
| **`HUMAN_VERIFIED`** | Emerald (`--color-primary`) + `ShieldCheck` | `ব্যবহারকারী/চিকিৎসক যাচাইকৃত / Verified` | Confirmed OCR routines & signed doctor consultation notes |
| **`RESEARCH_PREVIEW`** | Violet (`--color-research`) + `Microscope` | `গবেষণা প্রিভিউ — রোগ নির্ণয় নয় / Research Only` | PCOS ML, Ultrasound PCOM, Viral Rash ResNet18, DermoPed tabs |
| **`URGENT_REFERRAL`** | Crimson (`--color-danger`) + `ShieldAlert` | `জরুরি চিকিৎসক পরামর্শ নিন / Urgent Review` | Deterministic pediatric red-flag triage outputs |

---

## 3. Reusable Component Architecture (`src/components/ui/`)

To guarantee strict code reuse across all 4 role portals (`PATIENT`, `DOCTOR`, `ADMIN`, `SUPPORT`), zero duplicated card/table/modal markup is permitted. All screens assemble from this core component kit:

1. **`AppShell.tsx`** *(inspired by `Finova` `layout.html` + `AgriSense` `Header.jsx`)*
   - Props: `role: 'PATIENT' | 'DOCTOR' | 'ADMIN' | 'SUPPORT'`, `navItems`, `user`, `locale`, `onToggleLocale`.
   - Renders collapsible desktop sidebar (`256px` / `72px`), mobile bottom/drawer navigation (`>= 44x44px` tap targets), persistent top header with role pill, language switcher (`বাংলা` / `EN`), notification bell, and sticky `DEMO MODE` indicator strip.
2. **`StatCard.tsx` & `MetricGauge.tsx`** *(inspired by `Finova` `finance.html` + `ShadowAstra` `kit.tsx`)*
   - Supports animated count-up (`Motion`), trend delta badge, click-through route, and **explicit skeleton + empty-state zero handling** (never displays fake placeholders when API returns 0).
3. **`DataTable.tsx`** *(inspired by `Finova` `finance.html` ledger)*
   - Built-in search input, filter chips (date range, status), sortable columns, CSV export callback, server-driven pagination controls, horizontal scroll wrapper on `360px/390px` mobile (or responsive stacked card fallback), loading skeleton rows, and empty state CTA.
4. **`StatusBadge.tsx`**
   - Single centralized status-to-color mapping covering Appointments (`BOOKING_PENDING`, `AWAITING_DEMO_PAYMENT`, `CONFIRMED`, `CHECKED_IN`, `IN_CONSULTATION`, `COMPLETED`, `CANCELLED`, `NO_SHOW`), Payments (`DEMO_PENDING`, `DEMO_PAID`, `DEMO_FAILED`, `DEMO_REFUNDED`), Tickets (`OPEN`, `IN_PROGRESS`, `WAITING_FOR_USER`, `ESCALATED`, `RESOLVED`, `CLOSED`), and Doctors (`PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`).
5. **`SlidePillTabs.tsx`** *(adapted from `agrisense-fusion/frontend/src/utils/motion.js`)*
   - Accessible `role="tablist"` with GSAP `clipPath` elastic indicator + instant update when `reducedMotion` is enabled.
6. **`ConfirmModal.tsx`**
   - Accessible focus-trapped dialog (`Esc` closes, focus returns to trigger) required for high-stakes actions: appointment cancellation, mock refund, doctor suspension, or OCR confirmation.
7. **`SplitDocumentReviewer.tsx`** *(for `FEAT-09` Prescription OCR)*
   - Desktop 2-column split (zoom/rotate scanned prescription canvas left + bounding-box overlays | field-by-field editable medicine form right) collapsing to stacked accordion on mobile `< 768px`.
8. **`ToastProvider.tsx` (`DynamicIsland` / `Toaster`)**
   - Strictly reflects server API responses (never shows optimistic "Booking Confirmed" toast before HTTP 200/201 settles).

---

## 4. State Handling Rules Across Every Component

Every async view must implement four explicit visual states:
1. **`Loading`:** Dimension-matched skeleton placeholders (`aria-busy="true"`).
2. **`Empty`:** Helpful Bangla/English explanation + single clear action button (e.g., *"কোনো অ্যাপয়েন্টমেন্ট নেই — নতুন ডাক্তার খুঁজুন"*).
3. **`Error`:** Human-readable server message + `error_code` + `"আবার চেষ্টা করুন / Retry"` button (never blank white screen).
4. **`Offline / Stale`:** Top amber banner when offline (`PENDING_SYNC` badge on queued logs; AI/booking actions disabled cleanly).
