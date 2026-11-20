# 05 — AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC) AUDIT

Audit of the 5 demo identities, permission boundaries, and public demo / production isolation.

---

## 1. The Five Demo Personas
1. **Patient Demo (`patient.demo@shasthosetu.local`):** Standard consumer access; can view own records, schedule appointments, and review OCR scans. Strictly blocked from accessing other patients' data or clinical doctor desks.
2. **Approved Doctor (`dr.farhana@shasthosetu.local`):** Verified clinician with approved BMDC profile; full access to clinical queue, consultation workspace, and e-prescriptions.
3. **Pending Doctor (`dr.pending@shasthosetu.local`):** Applicant clinician awaiting credential review; restricted exclusively to `/doctor/onboarding-status`. Blocked from clinical queues.
4. **System Admin (`admin.demo@shasthosetu.local`):** Platform administrative user; manages system configuration and audits. Blocked from modifying non-synthetic real users.
5. **Customer Support (`support.demo@shasthosetu.local`):** Service desk operator; can reply to technical support tickets. Strictly blocked from clinical PHR records, doctor notes, and OCR transcripts (Zero-PHI barrier).

---

## 2. RBAC Access Matrix

| Role | Own PHR | Doctor Clinical Desk | Admin Dashboard | Support Dashboard | Financial Simulator | Verify OCR Rx |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **PATIENT** | ALLOWED | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | ACKNOWLEDGE ONLY |
| **DOCTOR (Approved)** | WITH CONSENT | ALLOWED | DENIED (403) | DENIED (403) | WALLET ONLY | CLINICIAN VERIFY |
| **DOCTOR (Pending)** | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) | DENIED (403) |
| **ADMIN** | MASKED AUDIT | DENIED (403) | ALLOWED | DENIED (403) | ALLOWED | DENIED (403) |
| **SUPPORT** | ZERO-PHI BLOCKED | DENIED (403) | DENIED (403) | ALLOWED | VIEW NON-PHI | DENIED (403) |

---

## 3. Production Environment Enforcement Gate
- Evaluated dynamically in `services/api/src/shasthosetu_api/routers/auth.py`.
- When `SHASTHOSETU_ENV=production` is set, all synthetic demo accounts (`is_synthetic = 1`) are immediately rejected at login with **`HTTP 403 Forbidden`** (`PRODUCTION_SECURITY_GATE: Demo accounts are strictly disabled in production environments`).
- Verified by 12 automated test cases in `services/api/evals/test_demo_isolation_security.py` (100% pass rate).
