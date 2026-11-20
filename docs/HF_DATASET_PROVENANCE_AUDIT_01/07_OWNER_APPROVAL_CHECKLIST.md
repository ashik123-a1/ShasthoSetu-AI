# 07 — Owner Review & Publishing Approval Checklist
**Task ID:** `HF-DATASET-PROVENANCE-AUDIT-01`  
**Repository Target:** `ashik1236/shasthosetu-clinical-datasets`  
**Date:** November 20, 2026  
**Auditor:** Principal AI Research Auditor & Clinical Governance Lead  

---

## 1. Audit Deliverables Verification Status

| Deliverable File | Description | Status |
|---|---|:---:|
| `01_ORIGINAL_SOURCE_AND_DOI_MATRIX.md` | Item-level provenance reconciliation across all 6 modules | **COMPLETED** |
| `02_LICENSE_AND_CONSENT_AUDIT.md` | Upstream CC BY 4.0 analysis, umbrella license conflict, consent audit | **COMPLETED** |
| `03_REPOSITORY_FILE_INVENTORY.csv` | Exact 35,641-file inventory from Hugging Face API with size and category | **COMPLETED** |
| `04_BENCHMARK_CLAIM_VALIDATION.md` | Frozen benchmark scores, sample sizes, and clinical bottlenecks | **COMPLETED** |
| `05_PRIVACY_AND_PUBLIC_RELEASE_RISKS.md` | Detailed privacy, ethical, pediatric, and copyright risk assessment | **COMPLETED** |
| `06_CORRECTED_DATASET_CARD.md` | Fully reconciled, production-ready `README.md` for Hugging Face | **COMPLETED** |
| `07_OWNER_APPROVAL_CHECKLIST.md` | Decision matrix and owner authorization sign-off | **COMPLETED** |

---

## 2. Key Owner Decisions Required Prior to Publishing

Before updating the live Hugging Face dataset card or modifying repository permissions, the owner must review and approve four critical governance decisions:

### Decision 1: Pediatric Image Public Distribution (`06_dermoped_pediatric_crops`)
- **Background:** The repository currently hosts 24,249 files (1.75 GB) of pediatric skin lesion photographs on an open public repository. While the original IRCCS Bologna paper obtained parental consent, secondary public hosting by ShasthoSetu AI carries bioethical exposure.
- **Option A (Recommended — Gated Access):** Configure the Hugging Face repository setting to **"Gated"**, requiring users to log in, provide their name/affiliation, and accept research-only data usage conditions before accessing files.
- **Option B (Maximum Safety — Withhold Raw Crops):** Remove the 24,203 raw `.png` pediatric crops from Hugging Face, hosting only the audit manifests, split CSVs, and model weights, while providing a script to download the raw images directly from the official Zenodo DOI (`10.5281/zenodo.20829589`).
- **Option C (Status Quo):** Keep the repository fully open with the enhanced ethical disclaimers in `06_CORRECTED_DATASET_CARD.md`.
- **Owner Selection:** `[ ] Option A   [ ] Option B   [ ] Option C`

### Decision 2: Licensing Terminology Alignment
- **Background:** Upstream works were published under CC BY 4.0. The previous draft applied a blanket CC BY-NC-SA 4.0.
- **Recommendation:** Adopt the dual-licensing disclosure in `06_CORRECTED_DATASET_CARD.md`: Upstream datasets retain original CC BY 4.0 attribution; ShasthoSetu AI's derivative manifests, grouped splits, and evaluation harnesses are licensed under CC BY-NC-SA 4.0.
- **Owner Approval:** `[ ] APPROVED   [ ] REJECTED`

### Decision 3: Certification Phrasing Demotion
- **Background:** Previous drafts used terms like "Zero-PHI Verified Certification" and "BMDC Compliant".
- **Recommendation:** Replace with legally precise language: "Heuristic Zero-PHI Rule-Based Masking" and "Designed in Technical Alignment with BMDC Telemedicine Guidelines".
- **Owner Approval:** `[ ] APPROVED   [ ] REJECTED`

### Decision 4: Authorization to Commit Corrected Dataset Card to Hugging Face
- **Action:** Push the contents of `06_CORRECTED_DATASET_CARD.md` as the official `README.md` of `ashik1236/shasthosetu-clinical-datasets` using the owner's Hugging Face API token.
- **Audit Rule:** **NO PUBLISHING WITHOUT EXPLICIT OWNER CONFIRMATION.**
- **Owner Approval:** `[ ] APPROVED TO PUBLISH   [ ] HOLD FOR FURTHER REVIEW`

---

## 3. Final Audit Verdict

```
========================================================================================
FINAL AUDIT VERDICT: DOCUMENTATION COMPLETE — DATA REDISTRIBUTION RIGHTS PROVISIONAL
========================================================================================
1. Provenance Reconciliation: 100% COMPLETE & VERIFIED.
   - Sfax Hospital Tunisia verified for PCOS Clinical.
   - Frontiers / Hanan Saadat verified for PCOS Ultrasound.
   - Mendeley MCVSLD web-scraping verified for Viral Rash.
   - Gazipur Mendeley v2 verified for Prescription OCR.
   - Google FLEURS verified for Bengali Voice.
   - IRCCS Bologna Zenodo verified for DermoPed.
2. File Inventory Reconciliation: 100% COMPLETE.
   - Exactly 35,641 files and 2.03 GiB (2.18 GB) cataloged in 03_REPOSITORY_FILE_INVENTORY.csv.
3. Benchmark Validation: 100% REPRODUCIBLE & HONEST.
   - All sample sizes, limitations, and caveats documented.
4. Redistribution Rights: PROVISIONAL pending Owner Decision on Pediatric Image Gating.
========================================================================================
```
