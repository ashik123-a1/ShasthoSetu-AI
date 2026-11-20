# 08 — OCR CLINICAL AUTHORIZATION & ZERO-TRUST WORKFLOW AUDIT

Audit of the 6-stage clinical prescription OCR pipeline, spatial parsing, and safety gates.

---

## 1. The Six-Stage Clinical Pipeline
```
[Prescription Upload (PDF/Image)]
             │
             ▼
[Stage 1: Bilingual OCR Scanning (Bengali + English EasyOCR)]
             │
             ▼
[Stage 2: Spatial Row Clustering & Multi-Column Tokenization]
             │
             ▼
[Stage 3: Latin Brand Normalization & Generic Subline Binding]
             │
             ▼
[Stage 4: Patient Acknowledgement (status=PATIENT_ACKNOWLEDGED, clinician_verified=False)]
             │
             ▼
[Stage 5: Clinician Review & Formal Authorization (status=DOCTOR_VERIFIED, clinician_verified=True)]
             │
             ▼
[Stage 6: Clinical Medication Plan Activation]
```

---

## 2. Zero-Trust Human Verification Gate
- Patient acknowledgement records transcription correctness but **DOES NOT authorize clinical dispensing or automated reminders**.
- If a patient or unauthorized party attempts to activate a medication plan with unverified critical fields (medicine name, dosage, frequency, duration), the backend immediately rejects the request with **`HTTP 422 Unprocessable Content`** (`UNVERIFIED_OCR_FIELDS`).
- Verified by 10 dedicated test cases in `services/api/evals/test_ocr_authorization_gate.py` (100% pass rate).
