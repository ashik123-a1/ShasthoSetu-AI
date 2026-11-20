# ShasthoSetu AI — Security Architecture, Zero-PHI Protocol & Safety Interlocks

> **Honest Governance Posture:** ShasthoSetu AI implements strict software-level access controls, cryptographic password hashing, heuristic PHI masking, and fail-closed AI safety gates. These controls are engineering safeguards rather than formal HIPAA, GDPR, or BMDC regulatory certification.

---

## 1. Authentication & Session Security (`routers/auth.py` & `core/security.py`)

- **Password Hashing:** All user passwords are hashed with **Argon2id** (`argon2-cffi`).
- **Session Cookies:** Successful `/v1/auth/login` issues an opaque session token (`ss_session`, `httponly=True`, `samesite="lax"`, `24h` TTL) stored hashed (`sha256_hex`) inside the SQLite `sessions` table alongside a per-session CSRF identifier.
- **Anti-Brute-Force Rate Limiting:** Explicit per-route request throttling protects `/register` (`25/min`), `/doctor-apply` (`15/min`), and `/login` (`40/min`).
- **Anti-Escalation Registration:** Attempting to supply privileged roles (e.g. `ADMIN` or `DOCTOR`) on `/v1/auth/register` is logged in immutable `audit_logs` and rejected or locked down to `PATIENT`.

---

## 2. Role-Based Access Control (RBAC) & Zero-PHI Boundaries

| Boundary Mechanism | Enforced Rule | HTTP Response on Violation |
| :--- | :--- | :---: |
| **Support Desk Zero-PHI Wall** | `SUPPORT` users handle technical/operational tickets only; clinical notes, patient vitals, and OCR/imaging payloads are physically blocked at backend router & `care_record_mcp`. | `403 Forbidden` |
| **Approved Doctor Gate** | Newly registered doctors enter `PENDING` state (`/doctor/onboarding-status`) and cannot open patient workspaces or write e-Prescriptions until `ADMIN` approval sets `verification_status = 'APPROVED'`. | `403 Forbidden` |
| **Cross-Patient / Cross-Doctor IDOR Guard** | Patients read only their own appointments, receipts, and records; doctors access only appointments assigned to their `doctor_profile.id`. | `403 Forbidden` |
| **Immutable Admin Audit Logs** | Sensitive security events (`LOGIN_FAILED`, `ROLE_ESCALATION_ATTEMPT`, `DOCTOR_APPROVED`, `OCR_GATE_BLOCKED`) write append-only records accessible solely to `ADMIN`. | `403 Forbidden` (non-Admin) |

---

## 3. Clinical AI Guardrails (`services/safety_guard.py`)

ShasthoSetu AI intercepts unsafe inputs and outputs deterministically across **Bengali**, **English**, and **Banglish**:

1. **Prompt Injection Defense (`_INJECTION_PATTERNS`):** Blocks system-prompt extraction (`reveal system prompt`, `সিস্টেম প্রম্পট দেখাও`), rule overrides (`ignore previous rules`, `আগের সব নিয়ম ভুলে যাও`), and XML tag injection (`<system>`, `<approved_sources>`) in **`0.1 ms`** (`SAFETY_REFUSAL`).
2. **Untrusted Document Sanitization (`sanitize_untrusted_text`):** Strips embedded HTML/control characters and neutralizes indirect injection payloads inside uploaded OCR prescriptions or retrieved passages (`DOCUMENT_INJECTION_LINE_STRIPPED`).
3. **Emergency Code 999 Escalation (`_EMERGENCY_PATTERNS` & `_INFANT_FEVER_RE`):** Immediately flags cardiac chest pain, respiratory distress, stroke signs, convulsions, severe bleeding, infant fever, or anaphylaxis and surfaces urgent **999 emergency care escalation** instead of conversational advice.
4. **Non-Prescribing Fail-Closed Output Filter (`_OUTPUT_UNSAFE_RE`):** Intercepts direct dosage requests (`how many mg should I take`, `কত মিলিগ্রাম খাব`) and refuses definitive diagnoses or autonomous prescribing instructions.

---

## 4. Safe-OCR Human Verification Gate (`HTTP 422`)

Because real handwritten clinic prescriptions exhibit high visual ambiguity (`04_Prescription_OCR`: real handwritten accuracy is explicitly marked `NOT_VALIDATED`), automated medication schedules enforce a **5-stage state machine** in `ocr_job_artifacts`:
- Newly parsed prescriptions enter `RAW_OCR`.
- Trying to activate automated reminders before human confirmation raises **`HTTP 422 Unprocessable Entity`**.
- Only explicit patient acknowledgement (`PATIENT_ACKNOWLEDGED_REMINDER`) or clinician verification (`CLINICIAN_VERIFIED`) unlocks reminders (`SIMULATED_REVIEW_ONLY`).

---

## 5. Domain Guardrails on Clinical Computer Vision

- **Ultrasound Analyzer (`02_PCOS_Ultrasound`):** Verifies grayscale B-mode intensity distributions and rejects color photos or non-ultrasound images with a clear validation error.
- **DermoPed Skin Studio (`06_DermoPed_Pediatric_Skin`):** Applies a chrominance skin-tone check rejecting unrelated objects (phones, cars, landscapes, full-face selfies) included in [`testingmainapps/04_dermoped_skin/negative_controls_unrelated/`](../testingmainapps/04_dermoped_skin/negative_controls_unrelated).
