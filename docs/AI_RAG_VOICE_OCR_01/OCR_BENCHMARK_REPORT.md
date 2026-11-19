# ShasthoSetu AI — Bilingual Prescription OCR Benchmark & Safety Report
**Document ID:** `REP-BENCH-OCR-01`  
**Subsystem:** Bilingual Prescription OCR, Line Clustering & 5-Stage Clinical Authorization  
**Date:** 2026-11-19 (Reconciled under `AI-QA-FIX-01`)  
**Status:** SYNTHETIC PRINTED BENCHMARKED / REAL HANDWRITTEN NOT VALIDATED  

> **QA Reconciliation Notice (`AI-QA-FIX-01`):** A prior version of this report contained fabricated condition labels (`clean_printed`, `skewed_15deg`) and an invalid `128.6%` / `150%` recall calculation caused by dividing total predicted candidate strings (including unaligned dose continuation lines) by expected medicine count. Metrics below are recomputed using strict 1-to-1 entity matching (`Recall <= 100%`) in [`services/api/evals/eval_ocr.py`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/services/api/evals/eval_ocr.py) and reconciled in [`docs/AI_QA_FIX_01/CORRECTED_OCR_METRICS.md`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/AI_QA_FIX_01/CORRECTED_OCR_METRICS.md).

---

## 1. Evaluation Scope & Strict Boundary

EasyOCR (`bn` + `en` recognizers with CRAFT detector) and spatial line clustering in [`ocr_service.py`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/services/api/src/shasthosetu_api/services/ocr_service.py) were evaluated under two clearly separated protocols:

1. **Synthetic Printed Stress Samples (`N = 4` images, `7` expected medicines):** Rendered cleanly using `Nirmala.ttf` (Bengali) and `arial.ttf` (English) across Bengali, English, mixed code-switched, and 40%-blend low-contrast images.
2. **Real Historical Clinical Image (`0052.jpg`, Read-Only Smoke Test):** Processed strictly read-only from `04_Prescription_OCR/data/raw/extracted/images/Prescription_ images.jpg/0052.jpg`. **No verbatim transcription ground truth exists**, so real handwritten accuracy remains **`NOT VALIDATED`**.

---

## 2. Reconciled Entity Matching Results (`N = 4` Synthetic Printed Images)

Using strict 1-to-1 greedy entity matching (`match_medicine_entities`, bounded `TP / (TP + FN) <= 100%`) after repairing `_MED_LINE_RE` Bengali prefix coverage (`টযাব`, `কযাপ`) and `consumed_lines` tracking in `ocr_service.py`:

### 2.1 Pre-Fix Baseline vs. Post-Fix Engine (Micro Entity Metrics)

| Pipeline Version | Mean CER | Mean WER | Total Expected | TP | FP | FN | Precision | Recall | F1 Score |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Pre-Fix Baseline** *(recomputed from `pre_fix_ocr_benchmark_results.json`)* | 12.94% | 49.31% | 7 | 5 | 4 | 2 | 55.56% | 71.43% | 62.50% |
| **Post-Fix Engine** *(verified run after `ocr_service.py` repair)* | 12.94% | 49.31% | 7 | **7** | **2** | **0** | **77.78%** | **100.00%** | **87.50%** |

### 2.2 Per-Sample Entity Breakdown (Post-Fix Primary JSON)

| Sample ID | Script | Condition | CER | WER | Expected Medicines | TP / FP / FN | Precision | Recall | F1 | Latency (ms) | Notes / False Positives |
| :--- | :--- | :--- | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `RX-BN-01` | Bengali | Clean Printed (`Nirmala.ttf`) | 21.43% | 59.09% | `মেটফরমিন`, `ওমেপ্রাজল` | **2 / 0 / 0** *(pre-fix 0/2/2)* | 100.0% | 100.0% | 100.0% | 5,752.78 *(cold load)* | Both Bengali medicine lines captured after prefix regex fix |
| `RX-EN-01` | English | Clean Printed (`arial.ttf`) | 5.52% | 28.00% | `Paracetamol`, `Azithromycin` | **2 / 2 / 0** | 50.0% | 100.0% | 66.7% | 244.06 | 2 FP continuation lines (`"tablet TDS after meals (5 days)"`, `"tablet daily before dinner 3 days)"`) |
| `RX-MIX-01` | Mixed | Code-Switched Printed | 9.09% | 40.91% | `Metformin`, `Rosuvastatin` | **2 / 0 / 0** | 100.0% | 100.0% | 100.0% | 225.04 | Both lines aligned cleanly |
| `RX-DEG-01` | Mixed | Low Contrast (40% blend) | 15.73% | 69.23% | `Pantoprazole` | **1 / 0 / 0** | 100.0% | 100.0% | 100.0% | 128.02 | Captured medicine; duration/dose distorted by contrast loss |

*Overall post-fix mean latency:* `1,587.48 ms` (dominated by first-call EasyOCR weight load on `RX-BN-01`; warm mean across the remaining 3 images was `199.04 ms`).

---

## 3. Real Clinical Image Smoke Test (`0052.jpg`)

- **Target Path:** `04_Prescription_OCR/data/raw/extracted/images/Prescription_ images.jpg/0052.jpg` (`ground_truth_available = false`)
- **Detected Bounding-Box Tokens:** **44** (`28` flagged as uncertain `< 0.75` confidence)
- **Clustered Candidate Rows:** **7** provisional lines
- **Mean Text Confidence:** **59.29%**
- **Processing Latency:** **884.17 ms**
- **Clinical Conclusion:** Handwritten real prescription accuracy (CER/WER/Recall/F1) is **`NOT VALIDATED`**. Because 28 of 44 tokens fell below `0.75` confidence, automated medicine scheduling from raw OCR is strictly unsafe and blocked.

---

## 4. 5-Stage Clinical Authorization Workflow (`AI-QA-FIX-01`)

To prevent patient self-edits from being treated as clinician prescription sign-off ([`OCR_CLINICAL_AUTHORIZATION_AUDIT.md`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/AI_QA_FIX_01/OCR_CLINICAL_AUTHORIZATION_AUDIT.md)), the platform enforces 5 sequential states:

1. **`RAW_OCR`**: Initial OCR output (`is_verified = 0`, `ocr_jobs.status = 'NEEDS_REVIEW'`). Any activation call returns **`HTTP 422 UNVERIFIED_OCR_FIELDS`**.
2. **`PATIENT_CORRECTED`**: Partial edits saved via `SAVE_DRAFT`.
3. **`PATIENT_ACKNOWLEDGED`**: Patient completed critical field review (`patient_acknowledged_by_user_id` set, `clinician_verified_by_user_id = NULL`, `clinician_verified = False`). Patient may only create a self-reminder draft (`PATIENT_ACKNOWLEDGED_REMINDER`, `status = 'VERIFIED'`); attempting `CLINICIAN_AUTHORIZED_PLAN` returns **`HTTP 403 CLINICIAN_VERIFICATION_REQUIRED`**.
4. **`DOCTOR_VERIFIED`**: Set exclusively by an `APPROVED`, patient-consented `DOCTOR` via `POST /v1/ai/ocr/{job_id}/clinician-verify` (patients, pending doctors, and unconsented doctors receive **`HTTP 403`**).
5. **`AUTHORIZED_MEDICATION_PLAN`**: Only allowed after Stage 4 (`authorization_type = 'CLINICIAN_AUTHORIZED_PLAN'`, `status = 'ACTIVE'`, backed by SQLite `CHECK` requiring `clinician_verified_by_user_id IS NOT NULL`).
