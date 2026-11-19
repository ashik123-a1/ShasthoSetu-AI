# 📋 ShasthoSetu AI — Phased UI & Backend Development Task Breakdown

**Document Reference:** `docs/UI_REFERENCE_RESEARCH/UI_DEVELOPMENT_TASK_BREAKDOWN.md`  
**Task ID:** `UI-00` (Planning Roadmap for `UI-01` onward — DO NOT start `UI-01` inside `UI-00`)  
**Alignment:** Maps all Master SRS v2.0 Phases (`C → H`), Task IDs from `docs/PROJECT_PROGRESS_AND_COMPETITION_TRACKER.md`, Functional Requirements (`FR-*`), and Acceptance Tests (`V2-T-001..042`).

---

## Dependency Graph Overview

```text
UI-00 (Completed Blueprint)
  ├──► BE-01 (FastAPI + 30-Table SQLite WAL + 4-Role Session RBAC + Synthetic Seed)
  ├──► UI-01 (Design Tokens, Fonts, i18n bn/en, AppShell & Reusable Component Kit)
  │      ├──► UI-02 (Public Homepage, Doctors Directory, Facility Finder, Login/Register)
  │      │      └──► UI-03 (Homepage 3D "Living Care Lattice", GSAP SlidePill, Motion Prefs)
  │      └──► [After BE-01 + UI-01]
  │             ├──► UI-04 + FEAT-03/04/05/06 (Patient Portal + Atomic Booking + Demo Payments)
  │             ├──► UI-05 + FEAT-01/02 (Doctor Onboarding Gate + Availability/Slots + Queue/Notes)
  │             ├──► UI-07 + FEAT-15 (Support Desk Inbox + Zero-PHI Isolation + Escalations)
  │             └──► UI-06 + FEAT-16 (Admin Approvals + Demo Finance Ledger + Audit Logs + Registry)
  │                    └──► FEAT-07..14 (PHR Vault + Safe OCR Verification + Meds + PCOS + Pediatric + Viral Rash Preview)
  ├──► UX-01 / UX-02 / UX-03 / SEC-01 / QA-01 (Accessibility, 360px/390px/768px/1440px, IDOR, Concurrency, Offline PWA)
  ├──► [PHASE G — EXPLICITLY DEFERRED] AI-01 (Reviewed Medical RAG) → AI-02 (Human-Eval Bangla/Mixed Voice) → INT-01/02 (MCP & Workflows)
  └──► QA-02 + OPS-01 + DOC-01 + DEMO-01 (End-to-End Sign-Off, Packaging, Tunnel/Deploy, Video)
```

---

## Detailed Task Breakdown (Independently Verifiable Slices)

### Task `UI-01`: Core Design System, Fonts, `bn`/`en` i18n & Reusable UI Primitive Kit (Phase C)
- **Depends On:** `UI-00`
- **Deliverables:**
  - Scaffold `apps/web/` (React + Vite + TypeScript + `@tailwindcss/vite`).
  - Self-host `Noto Sans Bengali` + `Plus Jakarta Sans` `.woff2` subsets in `apps/web/public/fonts/` with metric-matched fallback CSS (`ShadowAstra` pattern).
  - Implement `tokens.css` (Default Clinical Daylight `[data-theme="light"]` + `[data-theme="dark"]` toggle), `bn`/`en` locale dictionary + `useT()`, and `motionPref.ts`.
  - Build reusable components: `AppShell`, `StatCard`, `MetricGauge`, `DataTable`, `StatusBadge`, `TrustBadge` (`DEMO_ONLY`, `NEEDS_VERIFICATION`, `HUMAN_VERIFIED`, `RESEARCH_PREVIEW`, `URGENT_REFERRAL`), `SlidePillTabs`, `ConfirmModal`, `Skeleton`/`EmptyState`/`ErrorState`/`OfflineBanner`.
- **Verification Gate & SRS Tests:**
  - `npm run build` succeeds with zero TypeScript errors and zero external CSS/font CDNs.
  - Vitest tests prove 100% `bn`/`en` key parity (`V2-T-026`), keyboard Escape/focus trap on `ConfirmModal`, and `>=44px` tap-target class coverage (`V2-T-028`).

### Task `BE-01`: FastAPI, 30-Table SQLite WAL Database, 4-Role RBAC & Synthetic Seed (`Phase C`)
- **Depends On:** `UI-00`
- **Deliverables:**
  - Scaffold `services/api/` executing `docs/UI_REFERENCE_RESEARCH/INITIAL_SQLITE_SCHEMA.sql` via Alembic (`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000`).
  - Implement password hashing, HttpOnly SameSite session cookies, `require_patient`, `require_approved_doctor`, `require_admin`, `require_support` dependencies (ZERO unauthenticated demo fallback!), strict explicit CORS origins, open-redirect sanitizer, and env-gated synthetic demo login.
  - Seed synthetic Bangladeshi doctors (`PENDING` & `APPROVED`), sample patients/dependents, clinics, and support/admin accounts (`seed_demo.py`, resettable via CLI).
- **Verification Gate & SRS Tests:**
  - Pytest suite verifies `V2-T-001` (patient signup/login), `V2-T-002` (blocks `role=ADMIN` escalation on public signup), `V2-T-003` (blocks `PENDING` doctor routes), and `V2-T-030` (idempotent demo reseed).

### Task `UI-02`: Public Web Experience, Auth Screens & Public Doctor/Facility Directory (`Phase C`)
- **Depends On:** `UI-01`, `BE-01`
- **Deliverables:**
  - Build `/` Homepage (Bangla-first value prop, honest non-diagnostic research showcase linking frozen metrics, static SVG hero ready before 3D), `/doctors`, `/doctors/:doctorId`, `/facilities`, `/login`, `/register`, `/forgot-password`, `/access-denied`, `/404`.
  - Add clean dev-only Demo Role Matrix on `/login` for instant 4-role testing (disabled cleanly when `ENABLE_DEMO_LOGIN=false`).
- **Verification Gate & SRS Tests:**
  - Playwright checks `360px`/`390px`/`768px`/`1440px` (`overflowX === false`), role-based redirect after login, and verification that `/patient/*` redirects to `/login` when unauthenticated.

### Task `UI-03`: 3D Hero ("Living Care Lattice"), GSAP Pill Choreography & GPU-Lite Guard (`Phase C/H`)
- **Depends On:** `UI-02`
- **Deliverables:**
  - Lazy-loaded `@react-three/fiber` Living Care Lattice canvas on `/` with mobile `<900px` `1500ms`/`requestIdleCallback` deferral.
  - Adopt `CreateOrbit` leak fix, `ReleaseGPU` `dfgLUT` disposal, `IntersectionObserver` frameloop pause, `AdaptiveDpr` (`html.gpu-lite`), WebGL `ErrorBoundary`, `Lenis` smooth scroll (homepage-only), and persistent `"Pause Motion / গতি থামান"` control.
- **Verification Gate & SRS Tests:**
  - Playwright confirms static fallback renders immediately when WebGL is disabled, `Canvas` renders desktop WebGL cleanly, `Pause Motion` persists across reloads, and zero Bengali strings suffer character-level `SplitText` distortion.

### Task `UI-04` + `FEAT-03..06`: Patient Portal, Concurrent Atomic Booking & Demo Payment Flow (`Phase D`)
- **Depends On:** `UI-02`, `BE-01`
- **Deliverables:**
  - Implement `/patient/dashboard`, `/patient/book/:slotId`, `/patient/checkout/:paymentId`, `/patient/appointments`, `/patient/payments`, `/patient/profile`.
  - Backend atomic `BEGIN IMMEDIATE` single-capacity slot booking (`HTTP 409 SLOT_UNAVAILABLE` on race) + idempotent `DEMO_BKASH`/`DEMO_NAGAD`/`DEMO_CARD`/`DEMO_FREE` checkout (`DEMO-*` refs) + failure/cancel/refund simulation + printable HTML/PDF receipt with mandatory `SIMULATED / DEMO` badge.
- **Verification Gate & SRS Tests:**
  - Automated concurrency test passes `V2-T-007` (two simultaneous bookings -> 1 success, 1 HTTP 409).
  - Pytest & Playwright verify `V2-T-006`, `V2-T-008..013`, `V2-T-016` (IDOR across patients blocked), `V2-T-017` (cancel releases slot), `V2-T-025`, and `V2-T-027` (refresh mid-checkout preserves authoritative DB state).

### Task `UI-05` + `FEAT-01..02`: Doctor Portal, Approval Gate, Weekly Availability & Clinical Notes (`Phase D/E`)
- **Depends On:** `BE-01`, `UI-01`, `UI-04`
- **Deliverables:**
  - Implement `/doctor/onboarding-status`, `/doctor/dashboard`, `/doctor/availability` (`Asia/Dhaka` weekly rules + breaks + holidays/leave exceptions), `/doctor/calendar`, `/doctor/appointments` (`Confirm`/`Decline`/`Checked-In`/`In-Consultation`/`Complete`/`No-Show`/`Reschedule`), `/doctor/encounters/:id` (draft -> immutable signed note + append-only addendum), `/doctor/referrals`, `/doctor/profile`.
- **Verification Gate & SRS Tests:**
  - Automated tests pass `V2-T-003` (unapproved doctor gate), `V2-T-005` (breaks/leave excluded from public slots), `V2-T-014..015` (Doctor A blocked `403`/`404` from Doctor B appointments), and `V2-T-018` (atomic reschedule).

### Task `UI-07` + `FEAT-15`: Support Helpdesk Portal & Strict Zero-PHI Boundary (`Phase E`)
- **Depends On:** `BE-01`, `UI-01`
- **Deliverables:**
  - Implement `/patient/support` ticket submission + `/support/dashboard`, `/support/tickets`, `/support/tickets/:id` (public messages vs `INTERNAL` notes, limited booking/payment status badge only, emergency escalation button, FAQ macros).
- **Verification Gate & SRS Tests:**
  - API + UI security tests prove `V2-T-019..022`: Support replies work without exposing `medical_documents`, `consultation_notes`, PCOS, or pediatric records (`HTTP 403` / API response omits all clinical fields).

### Task `UI-06` + `FEAT-16`: Admin Operations Portal, Approvals, Ledger, Feature Flags & Audit Viewer (`Phase E`)
- **Depends On:** `BE-01`, `UI-01`, `UI-05`, `UI-07`
- **Deliverables:**
  - Implement `/admin/dashboard`, `/admin/doctors` (Approve/Reject/Suspend with written rationale), `/admin/users` (Provision `SUPPORT`/`DOCTOR`, Lock/Unlock), `/admin/appointments` (audited emergency override), `/admin/payments` (ledger + audited mock refund), `/admin/config` (specialties + fail-closed feature flags), `/admin/support` (escalations), `/admin/audit-logs` (append-only viewer), `/admin/research-registry` (frozen `final_lock/` read-only viewer).
- **Verification Gate & SRS Tests:**
  - Tests prove `V2-T-004` (doctor approval updates public directory), `V2-T-023` (audited override), `V2-T-024` (suspended doctor blocks new bookings), and `V2-T-029` (Admin denied default raw read of clinical notes without break-glass grant).

### Task `FEAT-07..14`: Scoped Care Modules & Isolated Research Previews (`Phase F`)
- **Depends On:** `UI-04`, `UI-05`, `UI-06`
- **Deliverables:**
  - Patient Vault & Document Upload (`FEAT-07/08`, strict MIME/size validation + consent grants).
  - Side-by-side Prescription OCR Draft Review (`FEAT-09` `SplitDocumentReviewer` + hard verification barrier blocking unverified medicines from `medication_plans` + adherence tracking `FEAT-10`).
  - PCOS Cycle Tracker + Non-Diagnostic PCOM/ML Research Preview (`FEAT-11`).
  - Pediatric Structured Intake + Deterministic Escalation Rules + Viral Rash / DermoPed Research Preview tabs (`FEAT-12/13`), plus Facility Map/Directory (`FEAT-14`).
- **Verification Gate & SRS Tests:**
  - Tests pass `V2-T-031` (OCR lockout until human verification), `V2-T-032` (mixed `bn`/`en` editable draft), `V2-T-033` (PCOS missing logs stay factual), `V2-T-034` (deterministic pediatric red flag cannot be suppressed), `V2-T-035..036` (honest research caveats & non-diagnostic badges).

### Task `UX-01..03` + `SEC-01` + `QA-01`: Offline PWA, A11y, Security & Automation Regression (`Phase F/H`)
- **Depends On:** Core Portals (`UI-04..07`, `FEAT-07..14`)
- **Deliverables:** Service Worker offline read cache + outbox (`PENDING_SYNC`), automated WCAG contrast/keyboard checks, OpenAPI export check, full Pytest + Playwright cross-role matrix (`360px`..`1440px`).
- **Verification Gate:** `V2-T-026`, `V2-T-028`, `V2-T-040`, `V2-T-041` (live registry matches frozen `final_lock/` metrics with zero drift).

### Phase G (`AI-01`, `AI-02`, `INT-01`, `INT-02`) — EXPLICITLY DEFERRED
- Do **not** execute until Core App (`UI-01..FEAT-16`, `QA-01`) passes verification. Includes Reviewed Medical RAG (`V2-T-037`), Human Mixed-Speech Bangla Voice (`V2-T-038..039`), MCP servers (`INT-01`), n8n/scheduled automations (`INT-02`), and competition local LLM runtime (`Ollama`).

### Task `QA-02` + `OPS-01` + `DOC-01` + `DEMO-01`: Release Packaging & Hackathon Sign-off (`Phase H`)
- **Verification Gate:** All `V2-T-001..042` executed, tunnel/deploy verified, README/Model Cards/Data Cards synced with `final_lock/` (`V2-T-042`), pitch video & 13 submission text fields completed cleanly.
