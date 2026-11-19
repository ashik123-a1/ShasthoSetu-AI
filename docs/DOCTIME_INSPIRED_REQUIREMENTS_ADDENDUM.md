# DocTime-Inspired Healthcare Workflow Requirements Addendum (ShasthoSetu AI)

> **Task ID:** `FULLSTACK-01` | **Scope Notice:** Operational & consumer healthcare workflows inspired by modern Bangladesh telemedicine patterns (clear simulated/demo labels retained; clinical claims, RAG, and Voice remain excluded/deferred per governance).

## 1. Purpose & Alignment with Master SRS v2.0

This addendum captures DocTime-style patient-and-clinician workflows integrated cleanly into ShasthoSetu AI alongside the authoritative SRS v2.0 schema (`INITIAL_SQLITE_SCHEMA.sql`):

| Workflow Domain | DocTime-Inspired Capability Implemented | Safety / Simulation Guardrail | Database & API Backing |
| :--- | :--- | :--- | :--- |
| **Specialist Search & Quick Symptom Discovery** | Instant filtering across Cardiology, Gynecology & PCOS, Pediatrics, Dermatology, Internal Medicine; symptom-tag search (`pcos`, `child fever`, `skin rash`); online-now status & fee transparency | Only `APPROVED` active doctors appear publicly (`PENDING`/`REJECTED`/`SUSPENDED` blocked) | `specialties`, `doctor_profiles`, `GET /v1/public/doctors` |
| **Consultation Modes & Digital Prescriptions** | Instant vs scheduled slot picker, doctor-issued structured e-Prescription (`Rx` reference, diagnosis summary, dosage frequency table, follow-up date) | Every e-Prescription bears `is_simulated=1`, `SIGNED` attribution, and non-clinical demo disclaimer; Admin prose redaction enforced | `eprescriptions`, `consultation_notes`, `POST /v1/doctor/appointments/{id}/eprescription`, `GET /v1/patient/consultations` |
| **Diagnostic & Home Sample Lab Catalog** | Standard tests (`CBC`, `HbA1c`, `Pelvic Ultrasound (PCOM Context)`, `Thyroid TSH`) with BDT fee transparency & `HOME_SAMPLE_DEMO` / `LAB_VISIT_DEMO` booking | Clearly flagged `is_simulated=1` demo orders (`DEMO-LAB-*`) without external pathology LIS side effects | `diagnostic_tests`, `diagnostic_demo_orders`, `POST /v1/patient/diagnostics/order` |
| **Family Care & Membership Plans** | Monthly Family Care Shield (`up to 4 dependents`) & Women's Wellness Preview tiers displayed transparently | Educational/demo catalog items; no recurring credit-card tokenization | `healthcare_plans`, `GET /v1/public/services` |
| **Simulated BDT Checkout & Watermarked Receipts** | One-click `DEMO_BKASH`, `DEMO_NAGAD`, `DEMO_CARD` checkout with idempotency protection and printable receipt | Zero PIN, OTP, CVV, or PAN fields; receipt carries permanent `SIMULATED / DEMO RECEIPT — NO ACTUAL MONEY CHARGED` watermark | `demo_payments`, `demo_receipts`, `POST /v1/payments/checkout`, `GET /v1/patient/receipts/{id}` |

## 2. Explicit Scope Exclusions
1. **No Live Monetary Settlement:** Payment methods create immutable `demo_payments` ledger rows only.
2. **No Autonomous AI Diagnosis:** AI cards under `/research` strictly expose frozen benchmark metrics (`M01`–`M06`) and non-diagnostic calculators; `AI-01` RAG and `AI-02` Voice remain `⏸ DEFERRED`.
