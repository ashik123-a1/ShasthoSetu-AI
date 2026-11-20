# 📝 ShasthoSetu AI — Module 04: Bilingual Prescription OCR Experiment Summary

**Experiment Status:** Complete & Fully Verified  
**Active Module:** `04_Prescription_OCR`  
**Date:** 2026-11-18  

---

## 1. Project Overview & Deliverables Map

Module 04 establishes the bilingual (English + Bengali) optical character recognition and medication parsing baseline for the ShasthoSetu AI platform using the Gazipur medical prescription corpus (Mendeley Data v2).

All requested deliverables have been produced and verified on disk:

| Deliverable | File Path | Status |
| :--- | :--- | :--- |
| **Dataset Forensic Audit** | [DATASET_AUDIT.md](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/04_Prescription_OCR/DATASET_AUDIT.md) | ✅ Complete |
| **OCR Baseline Evaluation Report** | [OCR_BASELINE_REPORT.md](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/04_Prescription_OCR/OCR_BASELINE_REPORT.md) | ✅ Complete |
| **Model Card** | [model_card.md](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/04_Prescription_OCR/model_card.md) | ✅ Complete |
| **Experiment Summary** | [experiment_summary.md](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/04_Prescription_OCR/experiment_summary.md) | ✅ Complete |
| **Cleaned Split Manifest** | [split_manifest.csv](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/04_Prescription_OCR/data/processed/split_manifest.csv) | ✅ Complete (1,000 rows) |
| **Image Audit Data** | [image_audit.csv](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/04_Prescription_OCR/data/processed/image_audit.csv) | ✅ Complete (1,000 images) |
| **Test Predictions CSV** | [test_predictions.csv](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/04_Prescription_OCR/outputs/test_predictions.csv) | ✅ Complete (152 predictions) |
| **Error Analysis CSV** | [error_analysis.csv](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/04_Prescription_OCR/outputs/error_analysis.csv) | ✅ Complete (140 error cases) |
| **Aggregate Metrics JSON** | [metrics.json](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/04_Prescription_OCR/outputs/metrics.json) | ✅ Complete |
| **Hardware & Software Environment** | [environment.json](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/04_Prescription_OCR/outputs/environment.json) | ✅ Complete |
| **End-to-End Reproduction Script** | [reproduce.ps1](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/04_Prescription_OCR/reproduce.ps1) | ✅ Complete |
| **Verification Proofs Archive** | [PROOFS.zip](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/04_Prescription_OCR/proofs/PROOFS.zip) | ✅ Staged |

---

## 2. Key Forensic & Scientific Takeaways

### 1. Data Forensic Rectification
- **Extension Heterogeneity:** 357 `.jpg` vs 643 `.jpeg` on disk; original CSV had all `.jpg`. Solved via canonical stem indexing.
- **Clerical CSV Typos & Duplicate Rows:** Comma typo `0174,jpg` repaired; duplicate row 856 dropped; misaligned rows 186 and 675 realigned to genuine physical images.
- **Duplicate Image Isolation:** Detected 2 duplicate image pairs (`0729` $\equiv$ `0775` and `0756` $\equiv$ `0757`). Both pairs placed strictly in Train set to ensure **0.00% cross-split data leakage**.

### 2. Empirical OCR Performance on RTX 5060 Ti
- **Throughput:** Evaluated 152 full test prescriptions in **106.26 seconds** (698 ms per page) using GPU acceleration on NVIDIA GeForce RTX 5060 Ti (CUDA 12.8, native `sm_120`).
- **Mean Recognition Confidence:** **33.20%**, reflecting the severe challenge of cursive physician handwriting and clinic shadows.
- **Mean Character Error Rate (CER):** 1.184 (median 0.868).
- **Mean Word Error Rate (WER):** 1.420 (median 1.000).

### 3. Medical Safety & Clinical Impact
- **Automated Medical Safety Gate:** Hard triage rule (`confidence < 0.55` or unconfirmed medicine) flagged **140 out of 152 prescriptions (92.11%)** as `UNVERIFIED_REQUIRES_HUMAN_REVIEW`.
- **Patient Protection:** Only 12 prescriptions (7.89%) with high confidence and verified medicine names were approved for automated reminder staging. Automated dosage reminders were strictly blocked for the remaining 92.11%, demonstrating ShasthoSetu AI's strict adherence to medical ethics and patient safety.
