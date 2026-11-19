# ShasthoSetu AI — Prescription OCR Evidence Status & Safety Verification
**Audited Modality:** `04_Prescription_OCR`  
**Dataset:** Image-to-Text Bilingual Dataset from Medical Prescriptions (Mendeley Data `tg2hm7n2bs/2`, CC BY 4.0, BSMRAAU, Bangladesh)  
**Evaluated Engine:** EasyOCR Deep Pipeline (`['bn', 'en']`) on NVIDIA RTX 5060 Ti GPU  
**Lead Auditor:** Senior ML Research Auditor & Medical AI Safety Reviewer  
**Date:** 2026-11-18  

---

## 1. Remediation of Outdated Proof Package & Automated Approvals

1. **Missing Source Code Resolved:**
   - The historical `04_Prescription_OCR_PROOFS.zip` contained output metrics and logs but omitted the executable Python scripts required for standalone reproduction.
   - The updated archive now embeds the complete executable codebase:
     - `src/inspect_and_preprocess.py` (normalized stem matching for comma typo and `.jpeg` fixes)
     - `src/benchmark_ocr.py` (GPU inference and text comparison pipeline)
     - `src/package_proofs.py` (proof generation script)
     - `reproduce.ps1` (PowerShell execution harness with `$LASTEXITCODE` checks)
     - `configs/config.json`
2. **Permanent Revocation of 12 "Approved" Prescriptions:**
   - In preliminary logs, 12 prescriptions were flagged as *"automated reminder permitted"* based on detector confidence $> 0.50$.
   - **Correction:** Bounding box confidence does not guarantee transcription accuracy. All 12 automated approvals were permanently revoked.
   - **Current Rule:** **100% of handwritten prescriptions (152/152) are quarantined under Mandatory Human Pharmacist Review**. Automated SMS reminders are **100% permanently disabled**.

---

## 2. Clarification on Error Metrics: OCR-to-Narrative Mismatch

| Metric | Measured Value | Scientific Interpretation |
| :--- | :---: | :--- |
| **Character Error Rate (CER)** | **101.07%** (Median: 87.55%) | **OCR-to-Narrative Mismatch** (High insertion/substitution rate) |
| **Word Error Rate (WER)** | **117.32%** (Median: 99.85%) | Cursive word break & abbreviation failure |
| **Medication Token Recall** | **3.12% – 6.96%** | **Unvalidated Estimate** (Subject to narrative annotation noise) |
| **GPU Latency** | **0.698 s / page** | Fast GPU throughput: **1.43 pages/second** on RTX 5060 Ti |

### Scientific Context:
- The Mendeley dataset's reference text contained conversational, free-form clinical narrative summaries rather than strict verbatim transcription of physician handwriting.
- Therefore, CER and WER reflect a combination of cursive handwriting misrecognition and **OCR-to-Narrative annotation mismatch**.
- The 6.96% medicine recall figure is an **unvalidated estimate**; it proves that off-the-shelf general OCR cannot autonomously extract prescription drug entities.

---

## 3. Human-in-the-Loop Operational Safeguard vs Clinical Prevention Rate

- **Clarification for Hackathon Presentation:**
  - The 100% human-review routing is an **operational risk-control policy**, NOT an experimentally validated *"medication error prevention rate"*.
  - Demo-only clinician sign-off in the UI demonstrates interface workflow; it does not replace legal pharmacy licensing or institutional identity verification.
  - The system must be presented strictly as an **assistive transcription drafting tool** for community clinic pharmacists.
