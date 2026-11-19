# 🗺️ ShasthoSetu AI — Four-Role Screen Inventory, Navigation Map & RBAC Boundaries

**Document Reference:** `docs/UI_REFERENCE_RESEARCH/FOUR_ROLE_SCREEN_AND_NAVIGATION_MAP.md`  
**Task ID:** `UI-00`  
**Authoritative Source:** Master SRS v2.0 Sections 17, 29–35, 39 & Land-Guard Dual-Portal Isolation Patterns  

---

## 1. Security-First Routing & Authentication Principles

Learned directly from auditing `Land-Guard` (`dependencies.py`) and fixing the silent fallback flaw discovered in `Finova` (`router.py` L193–203):
1. **Four Distinct Top-Level Authenticated Roles:** `PATIENT`, `DOCTOR`, `ADMIN`, `SUPPORT`.
2. **Zero Silent Demo Auto-Login:** Unauthenticated requests to `/patient/*`, `/doctor/*`, `/admin/*`, or `/support/*` NEVER fall back to a default user. Frontend checks `/v1/me` and redirects to `/login?redirect=...` (sanitized relative path only via `Land-Guard` open-redirect rule).
3. **Public Signup Restriction:** `/register` creates **only `PATIENT`** accounts. `DOCTOR` accounts require an application + explicit `ADMIN` approval (`doctor_verification_status = 'APPROVED'`). `ADMIN` and `SUPPORT` accounts can ONLY be provisioned by an existing privileged `ADMIN` (bootstrap CLI/seed for root admin).
4. **Role-Mismatched Access:** Any attempt by `PATIENT` to call `/v1/doctor/*` or `/v1/admin/*`, or by `SUPPORT` to read `/v1/documents/*` or clinical notes, returns strict HTTP **`403 Forbidden`** at the FastAPI API boundary and renders `/access-denied` in the UI.

---

## 2. Public Routes (Unauthenticated Accessible)

| Route Path | Page Title (`bn` / `en`) | Core Purpose & Widgets |
| :--- | :--- | :--- |
| `/` | ShasthoSetu AI Home | Animated 3D/SVG Hero, Bangla-first value proposition, 4-role workflow overview, Doctor search CTA, Research Preview showcase (with honest metric/non-diagnostic disclaimers), How-it-Works stepper, Safety & Demo transparency footer + `"Pause Motion"` toggle. |
| `/doctors` | ডাক্তার খুঁজুন / Find Doctors | Public read-only directory of **Admin-Approved** fictional/demo doctors filtered by specialty, fee (BDT Demo), gender, language, and district. Shows next open slot summary; clicking "Book" checks session or routes to `/login`. |
| `/doctors/:doctorId` | ডাক্তারের প্রোফাইল / Doctor Profile | Bio, degrees, verified demo badge, clinic location/online mode, fee (৳ BDT Demo), and live future available slots queried from `/v1/doctors/{id}/slots`. |
| `/facilities` | হাসপাতাল ও ফার্মেসি / Facility Finder | Cached OpenStreetMap / directory list of hospitals, clinics, pharmacies with last-verified timestamps (`Unknown` shown cleanly when hours missing). |
| `/login` | লগইন / Sign In | Unified email/phone + password login form + clearly marked **Synthetic Demo Quick-Login Matrix** (for dev/demo mode only, disabled by env flag in strict production) routing dynamically by server-verified `primary_role`. |
| `/register` | রোগী নিবন্ধন / Patient Signup | Self-registration strictly locked to `PATIENT` role (`FR-AUTH-101`). |
| `/forgot-password` | পাসওয়ার্ড রিসেট / Password Recovery | Rate-limited reset request form that never leaks whether an account exists (`FR-AUTH-106`). |
| `/access-denied` | প্রবেশাধিকার সংরক্ষিত / 403 Forbidden | Clear role-boundary explanation with "Return to My Dashboard" CTA. |
| `*` | পৃষ্ঠা পাওয়া যায়নি / 404 Not Found | Clean fallback route. |

---

## 3. Portal 1: PATIENT (`PATIENT` Role — `/patient/*`)

| Route Path | Navigation Label | Functional Requirements Covered | Primary Components & Data Scope |
| :--- | :--- | :--- | :--- |
| `/patient/dashboard` | হোম / Dashboard | `Sec 31.1`, `FR-PT-101..108` | Active profile banner (Self / Dependent switcher), Next Confirmed Appointment card, Pending Demo Payment alert, Verified Medication Reminders summary, Latest OCR Status card, Open Support Ticket badge. |
| `/patient/doctors` | ডাক্তার খুঁজুন / Find Doctors | `FR-PT-102..103`, `FR-AP-101` | Reuses public Doctor Directory within Patient shell, enabling seamless booking. |
| `/patient/book/:slotId` | বুকিং নিশ্চিত করুন / Book Slot | `FR-PT-104`, `FR-AP-102..103` | Slot lock timer (`HELD`), patient/dependent selector, reason for visit, fee disclaimer (`DEMO ONLY`), idempotent submit (`POST /v1/appointments/book`). |
| `/patient/checkout/:paymentId` | ডেমো পেমেন্ট / Demo Checkout | `FR-PT-105`, `FR-PAY-101..105` | Prominent `SIMULATED / DEMO — কোনো আসল টাকা কাটা হবে না` banner; mock `DEMO_BKASH`, `DEMO_NAGAD`, `DEMO_CARD` selection; controls to test Success / Failure / Cancel outcomes (`FR-PAY-103`). Zero real PIN/OTP/card inputs! |
| `/patient/appointments` | অ্যাপয়েন্টমেন্ট / Appointments | `FR-PT-106`, `FR-AP-107` | Tabbed list (`Upcoming`, `Pending Payment`, `Past/Cancelled`), Reschedule modal, Cancel policy modal, view signed consultation summary (read-only). |
| `/patient/payments` | পেমেন্ট ও রিসিপ্ট / Demo Receipts | `FR-PAY-106`, `V2-T-025` | Personal demo payment ledger (`DEMO-*` refs) + printable/downloadable HTML/PDF receipt with mandatory `SIMULATED` watermark. |
| `/patient/records` | স্বাস্থ্য রেকর্ড / Health Vault | `FR-PHR-01..06`, `FR-ID-06` | Upload PDF/JPG/PNG documents, chronological health timeline, search, JSON/CSV personal record export, short-lived doctor sharing grants. |
| `/patient/ocr-review` | প্রেসক্রিপশন OCR / OCR Review | `FR-OCR-01..07`, `FR-PT-109` | `SplitDocumentReviewer`: side-by-side image/bbox + editable extracted fields. **"Activate Routine" button disabled** until every uncertain medicine/dose/frequency is explicitly checked/corrected. |
| `/patient/medicines` | ওষুধের রুটিন / Medicines | `FR-MED-01..06` | Verified medication schedules in `Asia/Dhaka` time; Taken / Skipped / Snoozed action buttons; pause/stop without mutating signed original prescription. |
| `/patient/pcos` | পিসিওএস ট্র্যাকার / PCOS Tracker | `FR-PCOS-01..08` | Cycle calendar & symptom log (`logged by user`), visit-prep summary exporter. **Separate "Research Preview (PCOM / Tabular ML)" accordion** clearly flagged non-diagnostic. |
| `/patient/pediatric` | শিশু যত্ন / Child Care | `FR-PED-01..07`, `FR-VIR-01` | Dependent selector, vaccination dates, structured fever/rash intake -> deterministic clinical rule escalation flags, clinic referral status. **Separate "Viral Rash / DermoPed Research Preview" card** locked behind disclaimer. |
| `/patient/support` | সহায়তা / Support Tickets | `FR-PT-107`, `FR-SUP-101` | Create ticket linked optionally to an appointment or `DEMO-` payment, view support replies, upload non-PHI screenshot, close/reopen. |
| `/patient/profile` | প্রোফাইল ও গোপনীয়তা / Profile & Privacy | `FR-ID-03..05`, `FR-PT-113` | Personal details, dependent caregiver grants (time-bounded), notification privacy settings, `bn`/`en` preference. |
| `/patient/assistant` *(Deferred)* | এআই সহায়ক / AI Assistant (Later) | `FR-PT-115` | Clean placeholder card stating: *"Medical RAG & Bangla Voice are deferred until Phase G validation."* (Zero fake AI answers). |

---

## 4. Portal 2: DOCTOR (`DOCTOR` Role — `/doctor/*`)

**Gate Behavior:** If signed-in user has `doctor_verification_status != 'APPROVED'`, ALL `/doctor/calendar`, `/doctor/queue`, `/doctor/patients/*` routes redirect to `/doctor/onboarding-status` displaying `Pending Review` / `Rejected` / `Suspended` status (`FR-AUTH-102`).

| Route Path | Navigation Label | Functional Requirements Covered | Primary Components & Data Scope |
| :--- | :--- | :--- | :--- |
| `/doctor/onboarding-status` | আবেদন অবস্থা / Onboarding Gate | `FR-AUTH-102`, `Sec 32.1` | Profile submission form (degrees, specialty, practice location, demo BDT fee) & current approval state timeline. |
| `/doctor/dashboard` | ড্যাশবোর্ড / Overview | `FR-DR-101..102`, `FR-DR-111` | Today's appointments counter, Next Patient card, Pending booking confirmations, Quick Availability toggle, Simulated consultation fee summary (marked `DEMO`). |
| `/doctor/availability` | সময়সূচী সেটিংস / Weekly Availability | `FR-DR-103..104`, `Sec 35.1` | Weekly working hours builder (`Sun–Sat`, `Asia/Dhaka`), slot duration (`15/20/30 min`), lunch/prayer breaks, plus Holidays / Leave exception blocker (warns before blocking already-booked slots). |
| `/doctor/calendar` | ক্যালেন্ডার / My Calendar | `FR-DR-110` | Day/Week visual slot grid showing Open, Held, Awaiting Payment, Confirmed, Completed, and Blocked slots. |
| `/doctor/appointments` | রোগীর তালিকা / Patient Queue | `FR-DR-105..106`, `FR-DR-112` | Scoped strictly to `doctor_id == me`. Status workflow buttons: `Confirm`, `Decline`, `Mark Arrived`, `Start Consultation`, `Complete`, `Mark No-Show`, `Request Reschedule`. |
| `/doctor/encounters/:appointmentId` | রোগী পরীক্ষা / Encounter Workspace | `FR-DR-107..109` | Minimal intake summary + consented patient documents/labs (only if patient granted access), draft consultation note editor, explicit **"Sign & Lock Note"** modal, post-sign addendum form (immutable original preserved), and OCR medicine verification checklist. |
| `/doctor/referrals` | রেফারেল রিভিউ / Referrals | `FR-DR-114`, `FR-CLIN-01..03` | Clinic/pediatric triage referral inbox (`Reviewed`, `More Info Needed`, `Accepted`, `Closed`). |
| `/doctor/profile` | প্রোফাইল / Practice Profile | `Sec 32.1` | Edit bio, languages, mode (`Online Demo` / `In-Clinic Demo`), fee (triggers audit event). |

---

## 5. Portal 3: ADMIN (`ADMIN` Role — `/admin/*`)

**Privacy Invariant (`FR-AUTH-109`):** Operational `ADMIN` sees user metadata, doctor credentials, appointment counts, simulated payment ledgers, support queues, and audit logs, but **`consultation_notes` and patient prescription/PCOS clinical narratives are REDACTED / DENIED by default** unless an explicit audited break-glass exception is documented.

| Route Path | Navigation Label | Functional Requirements Covered | Primary Components & Data Scope |
| :--- | :--- | :--- | :--- |
| `/admin/dashboard` | অ্যাডমিন ওভারভিউ / Overview | `FR-AD-101`, `FR-AD-108` | Global KPI bento grid: Total Users, Approved/Pending Doctors, Appointments by Status, Simulated BDT Ledger Total (labeled `SIMULATED`), Open/Escalated Tickets, System Health status. |
| `/admin/doctors` | ডাক্তার অনুমোদন / Doctor Approvals | `FR-AD-103` | Pending onboarding queue, credential review panel, Approve / Reject / Suspend actions requiring written audit rationale (`doctor_verification_events`). |
| `/admin/users` | ব্যবহারকারী ও স্টাফ / Users & Staff | `FR-AD-102`, `FR-AD-104`, `FR-AD-109` | Search/filter accounts, lock/unlock accounts, **Provision New `SUPPORT` or `DOCTOR` Membership** modal (never self-escalates). |
| `/admin/appointments` | অ্যাপয়েন্টমেন্ট অপারেশন / Appointments | `FR-AD-105`, `V2-T-023` | Global searchable schedule & booking table, audited emergency slot override/reschedule tool. |
| `/admin/payments` | ডেমো পেমেন্ট লেজার / Demo Ledger | `FR-AD-105`, `FR-PAY-107` | Full `DEMO-*` transaction ledger (filters by method `DEMO_BKASH`/`DEMO_NAGAD`/`DEMO_CARD`, status, date), audited **Simulate Refund** action, CSV export. |
| `/admin/config` | সিস্টেম কনফিগ / Specialties & Flags | `FR-AD-106`, `FR-AD-110`, `FR-AD-113` | Specialty taxonomy & BDT fee bounds editor, cancellation cutoff policy, **Feature Flags panel** (can disable any Research Preview model instantaneously; RAG/Voice flags locked OFF until Phase G). |
| `/admin/support` | সাপোর্ট সুপারভিশন / Escalations | `FR-AD-107`, `FR-SUP-110` | Unassigned & escalated support ticket monitor, reassign ticket staff, SLA aging overview. |
| `/admin/audit-logs` | অডিট লগ / Security & Audit | `FR-AUTH-108`, `FR-AD-111` | Immutable, append-only `audit_logs` table (no delete/edit controls exist in API or UI!) filtered by actor role, event type, and date. |
| `/admin/research-registry` | গবেষণা মডেল রেজিস্ট্রি / Research Registry | `Sec 33.3`, `V2-T-035..036` | Read-only live surfacing of the frozen metrics from `SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/final_lock/FINAL_RESEARCH_MODEL_REGISTER.csv` with explicit limitations. |

---

## 6. Portal 4: SUPPORT (`SUPPORT` Role — `/support/*`)

**Zero-PHI Boundary (`Sec 34.1`, `FR-SEC-203`):** Support sees ticket thread, contact handle, booking reference, and limited payment status (`DEMO_PAID`/`DEMO_FAILED`), but API NEVER returns medical notes, prescriptions, PCOS logs, or child records.

| Route Path | Navigation Label | Functional Requirements Covered | Primary Components & Data Scope |
| :--- | :--- | :--- | :--- |
| `/support/dashboard` | সাপোর্ট ড্যাশবোর্ড / Desk Overview | `FR-SUP-102` | My Assigned Tickets, Unassigned Queue count, Escalated Safety Alerts count, Resolved Today KPI (real DB counts). |
| `/support/tickets` | টিকেট ইনবক্স / Ticket Queue | `FR-SUP-104..105` | Searchable inbox filterable by Category (`ACCOUNT`, `DOCTOR_APPOINTMENT`, `DEMO_PAYMENT`, `DOCUMENT_TECHNICAL`, `GENERAL`, `SAFETY_ESCALATION`), Priority, and Status (`OPEN`, `IN_PROGRESS`, `WAITING_FOR_USER`, `ESCALATED`, `RESOLVED`, `CLOSED`). |
| `/support/tickets/:ticketId` | টিকেট বিস্তারিত / Ticket Thread | `FR-SUP-103`, `FR-SUP-106..107`, `V2-T-020..021` | Left: Public message conversation + bilingual reply composer (with approved non-medical FAQ macro picker); Tabbed **Private Internal Staff Note** (`visibility='INTERNAL'`, invisible to patient); Right: Linked Appointment & Limited `DEMO-*` payment status badge + **Escalate to Admin / Urgent Safety Triage** button. |
| `/support/faq` | সাহায্য গাইড / Help Macros | `FR-SUP-111` | Approved non-clinical operational reply templates (Bangla & English). |
| `/support/profile` | প্রোফাইল / Support Profile | `FR-SUP-102` | Staff name, language preference (`bn`/`en`), notification settings. |
