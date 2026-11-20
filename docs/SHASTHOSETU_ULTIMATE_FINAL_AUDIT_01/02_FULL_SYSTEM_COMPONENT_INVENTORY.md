# 02 — FULL SYSTEM COMPONENT INVENTORY

Comprehensive inventory of all 99 reviewed architectural components across ShasthoSetu AI.

---

## 1. Frontend Pages & Routes (14 Core Views)
1. `/`: Public Homepage with floating responsive navbar, 3D Care Lattice, and feature spotlights.
2. `/login`: Central unified authentication portal supporting all 5 demo identities and custom credentials.
3. `/register`: Public patient registration flow with client-side validation and CSRF protection.
4. `/patient/dashboard`: Comprehensive patient health portal (appointments, PHR, OCR prescriptions, lab bookings).
5. `/doctor/dashboard`: Clinician workspace with appointment queue, patient clinical history, and tele-consultation desk.
6. `/doctor/onboarding-status`: Verification tracker for pending clinicians awaiting BMDC review.
7. `/doctor/wallet`: Clinician earnings ledger, fee breakdown (85% net / 15% platform), and BEFTN disbursement requests.
8. `/admin/dashboard`: Platform oversight portal (user management, audit logs, system telemetry).
9. `/admin/transactions`: Real-time simulated financial ledger, 5 bank account models, and dynamic commission split simulator.
10. `/support/dashboard`: Customer service workbench with strict Zero-PHI enforcement.
11. `/features/pcos`: Dedicated clinical & ultrasound dual-module AI research portal.
12. `/features/prescription-ocr`: Bilingual Bengali/English prescription scanner and human-in-the-loop review desk.
13. `/features/pediatric-rash`: DermoPed pediatric skin lesion analysis portal with non-diagnostic warnings.
14. `/care-map`: Geo-spatial healthcare facilities and emergency blood donor locator.

---

## 2. Backend REST API Endpoints (35 Active Routes)
- **Authentication (`/v1/auth`):** `/login`, `/register`, `/doctor-apply`, `/logout`, `/me`, `/csrf`
- **Patient Workspace (`/v1/patient`):** `/dashboard`, `/appointments`, `/prescriptions`, `/records`, `/ocr-jobs`, `/ocr-jobs/{id}/activate-plan`, `/universal-storefront-checkout`, `/checkout/demo`
- **Doctor Workspace (`/v1/doctor`):** `/dashboard`, `/appointments`, `/appointments/{id}/workspace`, `/consultations/{id}/complete`, `/wallet`, `/wallet/payout-request`
- **Admin Workspace (`/v1/admin`):** `/dashboard`, `/users`, `/users/{id}/status`, `/audit-logs`, `/transactions`, `/simulate-transaction`
- **Support Workspace (`/v1/support`):** `/dashboard`, `/tickets`, `/tickets/{id}/reply`, `/clinical-guard/{id}`
- **AI Inference (`/v1/ai`):** `/infer/pcos-clinical`, `/infer/pcos-ultrasound`, `/infer/viral-rash`, `/infer/dermoped`, `/ocr/scan`, `/ocr/{id}/verify`
- **Bangla Voice & RAG (`/v1/ai`):** `/voice/transcribe`, `/rag/query`, `/rag/sources`
- **Automations & Webhooks (`/v1/automation`):** `/webhooks/emergency-blood`, `/webhooks/daily-audit`, `/jobs/status`
- **Telemedicine Signaling (`/v1/consultations`):** `/rooms/{id}/join`, `/rooms/{id}/signal`, `/rooms/{id}/leave`, `/rooms/{id}/messages`

---

## 3. Database Schema (22 SQLite Tables)
1. `users`: Core identity table with Argon2id password hash, role, locale, and `is_synthetic` flag.
2. `role_memberships`: Role-based access control mappings and approval states (APPROVED, PENDING).
3. `doctor_profiles`: BMDC registration numbers, specialties, consultation fees, and verification status.
4. `patient_records`: Encrypted longitudinal health records with PHI masking.
5. `appointments`: Telehealth booking schedules, video room IDs, and payment status.
6. `prescriptions`: Verified clinical e-prescriptions with structured medication orders.
7. `prescription_items`: Medicine brand names, generic formulations, dosage, and duration.
8. `ocr_jobs`: Uploaded prescription images, OCR bounding boxes, and transcription states.
9. `ocr_extracted_fields`: Structured token extraction with verification status flags.
10. `platform_transactions`: Double-entry simulated financial ledger with poisha precision.
11. `bank_settlement_accounts`: 5 mock banking models for escrow and merchant gateway simulation.
12. `doctor_payout_requests`: Clinician disbursement audit records.
13. `blood_donors`: Emergency donor registry with district, blood group, and phone masking.
14. `blood_requests`: Patient emergency blood requests with notification dispatch.
15. `support_tickets`: Customer assistance inquiries with Zero-PHI guarantees.
16. `audit_logs`: Immutable security and clinical audit trails.
17. `notifications`: In-app notification queues with topic filtering.
18. `rate_limit_buckets`: Persistent SQLite sliding-window rate limiting store.
19. `consultation_rooms`: WebRTC room registry with intake questionnaire data.
20. `consultation_peers`: Active WebRTC participants with heartbeat tracking.
21. `consultation_signals`: Ephemeral SDP offers, answers, and ICE candidate queue.
22. `consultation_messages`: In-call chat transcript stored with millisecond timestamps.

---

## 4. AI Research Modules & Agent Suites
- **M01 PCOS Clinical:** XGBoost model trained on clinical survey data.
- **M02 PCOS Ultrasound:** ResNet18 convolutional model for follicle pattern analysis.
- **M03 Viral Rash:** ResNet18 grouped model on MCVSLD (755 families, zero leakage).
- **M04 Prescription OCR:** Bilingual EasyOCR spatial pipeline with Latin brand normalization.
- **M05 Bangla Voice AI:** Whisper Small fine-tuned on Bengali clinical terms with gTTS fallback.
- **M06 DermoPed Pediatric Skin:** ResNet18 EXP_B checkpoint (N=22 patients, 656 crops).
- **Agent Frameworks:** LangGraph (triage), CrewAI (guideline audit), AutoGen (safety critic), OpenAI Agents SDK (navigator), Swarm/Letta (Zero-PHI boundary tester).
- **MCP Servers:** `guideline-mcp`, `directory-mcp`, `care-record-mcp`, `filesystem`, `memory`, `sequential-thinking`.
