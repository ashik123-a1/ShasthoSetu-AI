# ShasthoSetu AI — User Roles, Permissions Matrix & Evaluation Personas

ShasthoSetu AI enforces strict separation across **six persona states** spanning public access, pending clinical onboarding, and four authenticated portal roles.

---

## 1. Synthetic Evaluation & Demo Credentials

All personas below are seeded deterministically by `services/api/src/shasthosetu_api/seeds/seed_demo.py` and unlocked identically across localhost, LAN IPs, and public tunnels (`Cloudflare`, `ngrok`, `Localtunnel`) on [`/login`](../apps/web/src/pages/LoginPage.tsx):

| Persona Role | Email Identifier | Password | Default Portal Route | Governance State |
| :--- | :--- | :--- | :--- | :--- |
| **Patient** | `patient.demo@shasthosetu.local` | `PatientDemo#2026` | `/patient/dashboard` | `ACTIVE` — Self-owned health workspace |
| **Approved Doctor** | `dr.farhana@shasthosetu.local` | `DoctorDemo#2026` | `/doctor/dashboard` | `APPROVED` BMDC `#91044` |
| **Pending Doctor** | `dr.pending@shasthosetu.local` | `DoctorDemo#2026` | `/doctor/onboarding-status` | `PENDING` (Blocked from patient clinical views) |
| **Support Desk** | `support.demo@shasthosetu.local` | `SupportDemo#2026` | `/support/dashboard` | Zero-PHI (`HTTP 403` on clinical records) |
| **System Admin** | `admin.demo@shasthosetu.local` | `AdminDemo#2026` | `/admin/dashboard` | Full governance, approvals & RAG indexing |

---

## 2. Capability & Permission Matrix

| Capability / Resource | Guest | Patient | Pending Doctor | Approved Doctor | Support Desk | System Admin |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Public Home, Blood Connect, Care Map & Journal | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Bilingual Guest Voice AI & Research Observatory | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Book Appointments, Pay Fees & Own Receipts | ❌ | ✅ | ❌ | ❌ | ❌ | 🔎 View |
| Upload Safe-OCR Prescription & Acknowledge Drafts | Trial | ✅ (Persistent) | ❌ | ✅ Verify | ❌ `403` | ❌ `403` |
| Access Patient Clinical Notes & Signed e-Rx | ❌ | Own Only | ❌ `403` | Assigned Only | ❌ **`403`** | ❌ **`403` (Privacy)** |
| Join Paid 2-Device Consultation Room (`apt-demo-9001`) | ❌ | Own Paid | ❌ `403` | Assigned Paid | ❌ `403` | ❌ `403` |
| Manage Support Tickets & Non-PHI User FAQ | ❌ | Own Tickets | ❌ | ❌ | ✅ | ✅ |
| Approve/Reject Pending Doctors (`BMDC` Verification) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Approve RAG Sources & Inspect Security Audit Logs | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 3. Portal-by-Portal Evaluation Walkthrough

### A. Patient Portal (`/patient/dashboard`)
- Explore bento analytics cards, 6-month cycle tracking (`/patient/pcos`), diagnostic lab panels (`/patient/diagnostics`), and ePharma store + cart (`/patient/epharma`).
- Upload a prescription on `/patient/ocr-review`, inspect flagged tokens, test the `HTTP 422` guardrail, and book/pay for a teleconsultation before joining the call room (`/patient/consultations`).

### B. Approved vs. Pending Doctor Portal (`/doctor/dashboard`)
- Sign in as `dr.farhana@shasthosetu.local` to manage availability, review pending AI drafts (`/v1/ai/drafts/doctor-queue`), inspect patient intake context inside `/doctor/consultations/:appointmentId`, and issue verified e-Prescriptions.
- Sign in as `dr.pending@shasthosetu.local` to verify strict isolation at `/doctor/onboarding-status`.

### C. Support Desk Zero-PHI Verification (`/support/dashboard`)
- Sign in as `support.demo@shasthosetu.local` to respond to operational tickets cleanly while verifying that clinical records remain inaccessible (`HTTP 403`).

### D. System Admin Governance (`/admin/dashboard`)
- Sign in as `admin.demo@shasthosetu.local` to verify doctor onboarding approvals (`/admin/doctors`), approved RAG source indexes (`/admin/rag`), locked research model registry (`/admin/research-registry`), and immutable security audit logs (`/admin/audit-logs`).
