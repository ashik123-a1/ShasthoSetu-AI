# ShasthoSetu AI — OCR Clinical Authorization State-Machine Audit (`AI-QA-FIX-01`)

**Audit Date:** 2026-11-19  
**Audited Code Paths:**  
- Schema & Idempotent Upgrade: [`schema.sql`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/services/api/src/shasthosetu_api/db/schema.sql), [`sqlite.py`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/services/api/src/shasthosetu_api/db/sqlite.py) (`ensure_ocr_authorization_columns`)  
- OCR Studio & Clinician Verification API: [`ai_ocr.py`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/services/api/src/shasthosetu_api/routers/ai_ocr.py)  
- Patient Medication Activation API: [`patient.py`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/services/api/src/shasthosetu_api/routers/patient.py)  
- UI Label Boundary: [`PrescriptionOcrStudio.tsx`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/apps/web/src/components/ai/PrescriptionOcrStudio.tsx)  

---

## 1. Gap Identified Before Fix

Prior to `AI-QA-FIX-01`:
1. `verify_or_save_ocr_job` and `verify_ocr_field` both set `ocr_jobs.status = 'VERIFIED'` regardless of whether a **Patient** edited their own OCR draft or an **Approved Doctor** reviewed it.
2. `activate_medication_plan_from_ocr` immediately inserted `medication_plans.status = 'ACTIVE'` once critical fields were marked `is_verified = 1`, meaning a patient editing an unverified OCR draft could create an `'ACTIVE'` medication plan without clinician prescribing authorization.
3. The UI Block 3 rendered `"Human Signed"` for any `'VERIFIED'` job, visually conflating patient self-edits with doctor sign-off.
4. `PRESCRIPTION_OCR_UPLOADED` in `ai_ocr.py` logged `"filename": fname[:60]` into `audit_logs`.

---

## 2. Enforced 5-Stage Clinical Authorization Architecture

| Stage | Canonical State (`ocr_job_artifacts.authorization_state`) | Actor Allowed | Database & API Invariants | Permitted Next Action |
| :---: | :--- | :--- | :--- | :--- |
| **1** | `RAW_OCR` | System (`EasyOCR`) | `ocr_jobs.status = 'NEEDS_REVIEW'`, `is_verified = 0`. Plan activation blocked (`HTTP 422 UNVERIFIED_OCR_FIELDS`). | Patient or Consented Approved Doctor saves edits |
| **2** | `PATIENT_CORRECTED` | `PATIENT` / Consented `DOCTOR` | Partial field edits or `SAVE_DRAFT` (`is_verified = 0` remains on critical fields). | Complete all critical fields |
| **3** | `PATIENT_ACKNOWLEDGED` | `PATIENT` (`VERIFY` / `PATIENT_ACKNOWLEDGE`) | `patient_acknowledged_by_user_id` set; `clinician_verified_by_user_id = NULL`. `clinician_verified = False`. Can ONLY create `PATIENT_ACKNOWLEDGED_REMINDER` (`status = 'VERIFIED'`, NOT `'ACTIVE'`). `CLINICIAN_AUTHORIZED_PLAN` rejected with **`HTTP 403 CLINICIAN_VERIFICATION_REQUIRED`**. | Consented Approved Doctor verifies, OR Patient creates reminder draft |
| **4** | `DOCTOR_VERIFIED` | `APPROVED DOCTOR` *(with patient upload ownership or `consent_shared_with_doctor = 1`)* | Exclusively via `POST /v1/ai/ocr/{id}/clinician-verify` or `action="CLINICIAN_VERIFY"`. Sets `clinician_verified_by_user_id` & `clinician_verified_at_utc`. Non-doctors rejected (`403`); pending/unconsented doctors rejected (`403`). | Patient or Doctor activates clinician plan |
| **5** | `AUTHORIZED_MEDICATION_PLAN` | Authorized `PATIENT` after Stage 4 *(or signed e-Prescription via `doctor.py`)* | `medication_plans.authorization_type = 'CLINICIAN_AUTHORIZED_PLAN'`, `status = 'ACTIVE'`, SQL `CHECK` enforces `clinician_verified_by_user_id IS NOT NULL`. | Active medication adherence tracking |

Additionally, `audit_logs` on OCR upload now hashes filenames (`"filename_sha256": res["sha256"][:16]`), preventing sensitive filenames from leaking into governance logs.

---

## 3. Verified Unauthorized Transition Matrix (Executed in `test_ai_rag_voice_ocr.py`)

Test function: **`test_qa_fix_6_ocr_5_stage_clinical_authorization_enforcement`** (`PASSED`)

| Attempted Transition | Actor | Endpoint | Expected / Actual Result |
| :--- | :--- | :--- | :---: |
| Activate plan from `RAW_OCR` | Patient | `POST /v1/patient/ocr-jobs/{id}/activate-plan` | **`422 UNVERIFIED_OCR_FIELDS`** (PASS) |
| Call `clinician-verify` | Patient (`patient.demo`) | `POST /v1/ai/ocr/{id}/clinician-verify` | **`403 CLINICIAN_AUTHORIZATION_REQUIRED`** (PASS) |
| Patient self-ack -> `CLINICIAN_AUTHORIZED_PLAN` | Patient after Stage 3 | `POST /v1/patient/ocr-jobs/{id}/activate-plan` | **`403 CLINICIAN_VERIFICATION_REQUIRED`** + `DENIED` audit (PASS) |
| Patient self-ack -> `PATIENT_REMINDER_DRAFT` | Patient after Stage 3 | `POST /v1/patient/ocr-jobs/{id}/activate-plan` | **`200`** (`clinician_authorized=False`, `plan_status='VERIFIED'`) (PASS) |
| Call `clinician-verify` | Pending Doctor (`dr.pending`) | `POST /v1/ai/ocr/{id}/clinician-verify` | **`403 DOCTOR_NOT_APPROVED`** (PASS) |
| Call `clinician-verify` | Unconsented Approved Doctor (`dr.tanvir`) | `POST /v1/ai/ocr/{id}/clinician-verify` | **`403 Access denied`** (PASS) |
| Call `clinician-verify` -> Stage 5 | Consented Approved Doctor (`dr.farhana`) -> Patient | `clinician-verify` then `activate-plan` | **`200`** (`DOCTOR_VERIFIED` -> `ACTIVE`, `clinician_authorized=True`) (PASS) |
| Cross-patient OCR plan activation (`ISS-008`) | Different Patient / Wrong Role | `POST /v1/patient/ocr-jobs/{other_id}/activate-plan` | **`403`** (PASS) |
