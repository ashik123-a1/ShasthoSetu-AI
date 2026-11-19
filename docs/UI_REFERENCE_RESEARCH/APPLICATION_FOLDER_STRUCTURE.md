# 📁 ShasthoSetu AI — Application & Repository Folder Structure Blueprint

**Document Reference:** `docs/UI_REFERENCE_RESEARCH/APPLICATION_FOLDER_STRUCTURE.md`  
**Task ID:** `UI-00`  
**Design Principle:** Strict isolation between **Frozen ML Research Modules (`01..06` + `final_lock/`)**, **Backend Transactional API (`services/api/`)**, and **Multi-Role Frontend Web App (`apps/web/`)** — zero tangled monoliths, zero hardcoded CDN styling, zero direct DB exposure.

---

## 1. Top-Level Monorepo Layout (Preserving Frozen Research Root)

```text
F:\Clude cccccccccccccccccccccccc\data we test\   (Project Root)
├── 01_PCOS_Clinical/                      [FROZEN RESEARCH] Tabular ML (XGBoost/RF)
├── 02_PCOS_Ultrasound/                    [FROZEN RESEARCH] Ultrasound PCOM ResNet18/MobileNetV3
├── 03_Measles_Viral_Rash/                 [FROZEN RESEARCH] Grouped ResNet18/MobileNetV3
├── 04_Prescription_OCR/                   [FROZEN RESEARCH] EasyOCR bn+en baseline
├── 05_Bangla_Voice_AI/                    [FROZEN RESEARCH / DEFERRED] Whisper ASR benchmark
├── 06_DermoPed_Pediatric_Skin/            [FROZEN RESEARCH] Pediatric dermatology Colab pilot
├── SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/ [FROZEN] Official research audit + final_lock/ CSVs
├── _reports/                              [FROZEN] Historical ZIPs, consolidated_metrics.json
├── _shared/                               [FROZEN] Shared research Python venv + GPU scripts
├── demo/                                  [LEGACY POC] Early Streamlit prototype (do not expand)
├── _reference_repos/                      [LOCAL GITIGNORED] 4 audited reference clones (reference only)
│
├── docs/                                  [LIVING DOCS & BLUEPRINTS]
│   ├── PROJECT_PROGRESS_AND_COMPETITION_TRACKER.md
│   └── UI_REFERENCE_RESEARCH/             (All UI-00 blueprints, DDL, screenshots)
│
├── apps/
│   └── web/                               [NEW FRONTEND — Phase C onward (UI-01+)]
│       ├── public/
│       │   ├── fonts/                     Self-hosted Noto Sans Bengali + Plus Jakarta Sans .woff2
│       │   ├── draco/gltf/                Self-hosted Draco WASM/JS (no unpkg/gstatic CDN)
│       │   └── manifest.webmanifest       PWA metadata (icons, standalone mode, theme color)
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx                    Router + AuthGate + MotionConfig + ThemeProvider + Toaster
│       │   ├── styles/
│       │   │   ├── tokens.css             Tailwind v4 @theme + [data-theme="light"]/[data-theme="dark"]
│       │   │   ├── fonts.css              Metric-matched @font-face fallbacks (ShadowAstra pattern)
│       │   │   └── globals.css            Bangla 1.65 line-height, focus-visible ring, gpu-lite rules
│       │   ├── lib/
│       │   │   ├── apiClient.ts           Typed fetch wrapper (credentials: include, idempotencyKey, 401/403 handler)
│       │   │   ├── authContext.tsx        Server-verified /v1/me session (NO silent demo auto-login)
│       │   │   ├── i18n/                  Lightweight modular JSON locales (bn.json, en.json, useT())
│       │   │   ├── motionPref.ts          WCAG 2.2.2 reduced-motion + Pause Motion persistence
│       │   │   ├── perf.ts                useScrollingFlag() + GPU/FPS adaptive degradation
│       │   │   ├── sanitizeRedirect.ts    Open-redirect prevention (?redirect= relative path guard)
│       │   │   └── formatters.ts          BDT Poisha -> ৳ formatter, Asia/Dhaka date/time in bn/en
│       │   ├── components/
│       │   │   ├── ui/                    Core reusable kit (AppShell, StatCard, DataTable, StatusBadge,
│       │   │   │                          TrustBadge, ConfirmModal, SlidePillTabs, SplitDocumentReviewer,
│       │   │   │                          EmptyState, ErrorState, Skeleton, OfflineBanner)
│       │   │   ├── three/                 Homepage-only lazy 3D Living Care Lattice + Controls + Safe ErrorBoundary
│       │   │   └── layout/                RoleSidebar, MobileNavDrawer, TopHeaderBar, LanguageSwitch, ThemeSwitch
│       │   ├── features/                  Domain modules shared cleanly across portals
│       │   │   ├── auth/                  LoginForm, PatientRegisterForm, DemoQuickLoginMatrix (env-gated)
│       │   │   ├── booking/               DoctorDirectoryCard, SlotPickerGrid, BookingReviewForm
│       │   │   ├── payments/              DemoCheckoutWidget (bKash/Nagad/Card DEMO ONLY), PrintableDemoReceipt
│       │   │   ├── support/               TicketListView, TicketThreadView, EscalationModal
│       │   │   └── care/                  MedicationScheduleCard, OcrVerificationWorkbench, ResearchPreviewPanel
│       │   ├── pages/
│       │   │   ├── public/                HomePage, DoctorsDirectoryPage, DoctorDetailPage, FacilitiesPage,
│       │   │   │                          LoginPage, RegisterPage, AccessDeniedPage, NotFoundPage
│       │   │   ├── patient/               PatientDashboard, PatientBookSlot, PatientCheckout, PatientAppointments,
│       │   │   │                          PatientPayments, PatientRecords, PatientOcrReview, PatientMedicines,
│       │   │   │                          PatientPcosTracker, PatientPediatricCare, PatientSupport, PatientProfile,
│       │   │   │                          PatientAssistantDeferred
│       │   │   ├── doctor/                DoctorOnboardingGate, DoctorDashboard, DoctorAvailability, DoctorCalendar,
│       │   │   │                          DoctorAppointments, DoctorEncounterWorkspace, DoctorReferrals, DoctorProfile
│       │   │   ├── admin/                 AdminDashboard, AdminDoctorApprovals, AdminUsers, AdminAppointments,
│       │   │   │                          AdminPaymentsLedger, AdminConfigFlags, AdminSupportEscalations,
│       │   │   │                          AdminAuditLogs, AdminResearchRegistry
│       │   │   └── support/               SupportDashboard, SupportTicketsInbox, SupportTicketDetail,
│       │   │                              SupportFaqMacros, SupportProfile
│       │   └── test/                      Vitest unit/component specs
│       ├── e2e/                           Playwright responsive + RBAC + concurrent booking E2E suites
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts                 Vite + @tailwindcss/vite + API proxy `/v1 -> 127.0.0.1:8000`
│       └── playwright.config.ts
│
├── services/
│   └── api/                               [NEW BACKEND — Phase C onward (UI-01+)]
│       ├── pyproject.toml / requirements.txt
│       ├── alembic.ini
│       ├── data/                          [GITIGNORED] shasthosetu.db, WAL/SHM, uploaded local sandbox files
│       ├── migrations/
│       │   └── versions/                  001_initial_schema.py / SQL applied cleanly via Alembic
│       ├── src/
│       │   └── shasthosetu_api/
│       │       ├── main.py                FastAPI factory, explicit CORS allowlist, Lifespan, error handlers
│       │       ├── config.py              Pydantic Settings (ENV, SQLITE_PATH, SESSION_SECRET, ENABLE_DEMO_LOGIN)
│       │       ├── db/
│       │       │   ├── engine.py          SQLAlchemy engine + SQLite PRAGMA hook (WAL, FK=ON, busy_timeout=5000)
│       │       │   └── models.py          ORM models mapping 1:1 to the 27 SQLite tables
│       │       ├── core/
│       │       │   ├── security.py        Argon2id/PBKDF2-HMAC verification, HttpOnly cookie + CSRF check
│       │       │   ├── dependencies.py    Strict role guards (`require_patient`, `require_approved_doctor`,
│       │       │   │                      `require_admin`, `require_support` — zero demo fallback!)
│       │       │   ├── audit.py           Append-only `audit_logs` writer + PII redaction filter
│       │       │   └── rate_limit.py      In-memory/SQLite sliding-window limiter for auth/booking endpoints
│       │       ├── routers/
│       │       │   ├── auth.py            /v1/auth/register, /v1/auth/login, /v1/auth/logout, /v1/me
│       │       │   ├── public.py          /v1/doctors (APPROVED only), /v1/doctors/{id}/slots, /v1/facilities
│       │       │   ├── patient.py         /v1/patient/* (scoped to authorized patient_profile_ids)
│       │       │   ├── doctor.py          /v1/doctor/* (approved doctor gate + doctor_id == me isolation)
│       │       │   ├── appointments.py    /v1/appointments/book (BEGIN IMMEDIATE atomic lock), cancel, reschedule
│       │       │   ├── payments.py        /v1/payments/* (idempotent DEMO- checkout, state transitions, receipts)
│       │       │   ├── support.py         /v1/support/* (STRICT column projection — zero clinical notes/PHR)
│       │       │   ├── admin.py           /v1/admin/* (doctor verify, staff provision, config, audit, refunds)
│       │       │   └── research_bridge.py Read-only serializer reading `final_lock/` CSV/JSON + deterministic triage
│       │       ├── services/              Pure business logic separated from FastAPI routers
│       │       └── seeds/
│       │           └── seed_demo.py       Fictional deterministic Bangladeshi demo data (idempotent CLI reset)
│       └── tests/                         Pytest RBAC, concurrency (SQLite lock race), idempotency, OCR-gate tests
│
├── .github/
│   └── workflows/
│       └── ci.yml                         Typecheck, Vitest, Pytest RBAC, build, Playwright smoke, secret scan
└── .gitignore                             Excludes _reference_repos/, node_modules/, .venv/, *.db*, uploads/
```

---

## 2. Boundary & Reuse Rules

| Boundary Rule | Why Enforced | How Verified in CI & Code Review |
| :--- | :--- | :--- |
| **No `_reference_repos/` Imports** | Clones in `_reference_repos/` are study material only (`Land-Guard` lacks LICENSE; repos have distinct stacks). Zero runtime dependencies may point inside `_reference_repos/`. | ESLint `no-restricted-imports` + grep check in CI. |
| **Frozen ML Folders Read-Only** | `01..06`, `_reports/`, `SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/` are under frozen audit lock (`RESEARCH_AUDIT_PASS_WITH_LIMITATIONS`). Web UI reads metrics/adapters via `services/api/src/shasthosetu_api/routers/research_bridge.py` without editing checkpoints or CSVs. | Git diff / file integrity check on `final_lock/` prior to release. |
| **Separate Venvs** | `_shared/venv` serves ML/PyTorch research dependencies; `services/api/.venv` stays lean (`fastapi`, `sqlalchemy`, `pydantic`, `pytest`) for fast startup and tiny container size. | Separate `requirements.txt` / `pyproject.toml` inside `services/api/`. |
| **Zero Monolithic Templates or Giant Python i18n Dicts** | Avoids Land-Guard's `173 KB` landing HTML and `199 KB` `translations.py` bloat. All localization lives in scoped modular TypeScript/JSON bundles (`apps/web/src/lib/i18n/bn/*.json` + `en/*.json`), statically checked for key parity. | Vitest i18n parity test fails if any `en` key is missing in `bn` or vice versa. |
| **UI Component Reuse (`src/components/ui/`)** | Patient, Doctor, Admin, and Support portals share one `AppShell`, `DataTable`, `StatusBadge`, `StatCard`, and `ConfirmModal` parameterized by config rather than copy-pasting tables across roles. | PR rule: zero duplicate table/modal implementations inside `pages/`. |
