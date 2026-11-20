# Dataset Audit Report — Measles & Viral Rash Vision Module
**Module:** `03_Measles_Viral_Rash`  
**Datasets Audited:** 
1. Mendeley MCVSLD (`10.17632/dfztdtfsxz.1`)
2. DermoPed (`10.5281/zenodo.20829589`)  
**Auditor:** Senior ML Research Auditor & MLOps Engineer  
**Date:** November 18, 2026  
**Status:** Audit Completed | **Training Status: BLOCKED** (Storage on Drive F & Label Verification)  

---

## 1. Executive Summary

In accordance with Master SRS v1.0 Section 16.2 and clinical AI governance, a comprehensive pre-training audit was conducted for Module 03 (`03_Measles_Viral_Rash`). 

### Key Audit Findings
1. **Label Integrity:** DermoPed contains **`morbilliform_exanthema`**, which is a **rash morphology**, NOT confirmed measles. Conflating morbilliform rash with laboratory-confirmed measles is medically impermissible.
2. **Dataset Segregation:** Mendeley MCVSLD is an aggregated, web-scraped collection lacking patient identifiers and laboratory confirmation. It cannot be merged with DermoPed and cannot support patient-disjoint clinical benchmarking.
3. **Hardware Readiness:** The local **NVIDIA GeForce RTX 5060 Ti 16GB** GPU environment (`_shared/venv`) is **100% verified** with native `sm_120` CUDA 12.8 support (226.42 ms ResNet18 forward/backward pass).
4. **Storage Constraint & Training Block:** Drive `F:` currently has only **0.90 GB** of free space. A safe download, extraction, and training pipeline requires $\ge 1.50\text{ GB}$. Downloading to Drive F: is strictly blocked to protect filesystem integrity. Drive `G:` has 12.57 GB free and is designated as the target storage location once authorized.

---

## 2. Provenance & Permitted Use Audit

### 2.1 Mendeley MCVSLD (Multi-Class Viral Skin Lesion Dataset)
- **DOI:** `10.17632/dfztdtfsxz.1`
- **Authors:** Kazi Rifat Ahmed, Md. Mazbaur Rashid, Suprove Chandra Sarkar, Mujahidul Islam.
- **License:** CC BY 4.0 (Open access for academic research).
- **Source Method:** Google Image Search queries and public web repositories.
- **Critical Flaws for Clinical AI:**
  - No patient identifiers: Multiple photos of the same patient cannot be isolated, guaranteeing severe patient leakage.
  - No clinical charts or laboratory confirmation (no RT-PCR or IgM records).
  - Out-of-distribution web noise (varying lighting, watermarks, background distractors).

### 2.2 DermoPed (Zenodo Record 20829589)
- **DOI:** `10.5281/zenodo.20829589`
- **Authors:** Chiara Bellatreccia, Roberta Calegari, Andrea Borghesi, Daniele Zama, Arianna Dondi, Luca Pierantoni, Laura Andreozzi, Iria Neri, Marcello Lanari.
- **Affiliation:** IRCCS Azienda Ospedaliero-Universitaria di Bologna, Italy.
- **License:** CC BY 4.0.
- **Source Method:** Direct pediatric hospital clinical dermatology camera photography with anonymization and crop extraction.
- **Structure:** Per-patient folders (`patient{n}`) containing curated 256x256 crops, binary lesion masks, and patient metadata.
- **Limitation:** Diagnoses represent syndromic dermatological presentations; `morbilliform_exanthema` reflects morphology, not wild-type measles virological confirmation.

---

## 3. Storage Feasibility & Hardware Verification

### 3.1 Host Disk Space Audit
| Drive | Total Storage | Free Space | Assessment |
|---|---|---|---|
| **C:** | 190.83 GB | 9.53 GB | Host OS system drive |
| **D:** | 465.76 GB | 5.26 GB | General storage |
| **E:** | 153.34 GB | 1.58 GB | Insufficient |
| **F:** | 309.22 GB | **0.90 GB** | **CRITICAL: Insufficient space for new archives on current workspace drive** |
| **G:** | 757.00 GB | **12.57 GB** | **VIABLE: Ample space for prospective downloads and runs** |

### 3.2 Pipeline Footprint Estimates
- `morbilliform_exanthema.zip`:
  - Compressed Archive: 329.67 MB
  - Extracted Raw Patient Folders: ~350 MB
  - Curated Crop Tensors: ~320 MB
  - PyTorch Checkpoints & Outputs: ~200 MB
  - Safe Buffer: ~300 MB
  - **Total Minimum Required:** **$1.50\text{ GB}$**
- **Safety Decision:** Downloading to Drive `F:` would trigger `OSError: [Errno 28] No space left on device` and risk data loss. Training is **BLOCKED on Drive F:** in accordance with user safety rules.

### 3.3 GPU Execution Verification
- Shared Environment: `F:\Clude cccccccccccccccccccccccc\data we test\_shared\venv`
- PyTorch: `2.11.0+cu128` (CUDA 12.8, Native `sm_120` support)
- Host GPU: NVIDIA GeForce RTX 5060 Ti 16GB
- Forward/Backward Convolution Benchmark: **226.42 ms** (Zero GPU memory leakage)
- Verified Output: [GPU_VERIFICATION.json](file:///F:/Clude%20cccccccccccccccccccccc/data%20we%20test/03_Measles_Viral_Rash/GPU_VERIFICATION.json)

---

## 4. Conditional Training Status: BLOCKED

In accordance with Phase 4 guidelines:
```
Status: BLOCKED
Reason 1 (Storage): Drive F: has only 0.90 GB free; minimum requirement is 1.50 GB.
Reason 2 (Label Integrity): MCVSLD lacks patient tracking and lab confirmation. DermoPed Morbilliform requires explicit morphological framing rather than measles diagnostic labeling.
```
No training was attempted to prevent out-of-disk errors and maintain 100% scientific integrity.

---

## 5. Summary of Audit Deliverables
- [DATASET_AUDIT.md](file:///F:/Clude%20cccccccccccccccccccccc/data%20we%20test/03_Measles_Viral_Rash/DATASET_AUDIT.md) — This master audit document
- [dataset_profile.json](file:///F:/Clude%20cccccccccccccccccccccc/data%20we%20test/03_Measles_Viral_Rash/dataset_profile.json) — Structured metadata profiles for MCVSLD & DermoPed
- [patient_diversity.csv](file:///F:/Clude%20cccccccccccccccccccccc/data%20we%20test/03_Measles_Viral_Rash/patient_diversity.csv) — Cohort and demographic comparison
- [storage_feasibility.json](file:///F:/Clude%20cccccccccccccccccccccc/data%20we%20test/03_Measles_Viral_Rash/storage_feasibility.json) — Drive storage analysis and size footprint breakdown
- [label_integrity_report.md](file:///F:/Clude%20cccccccccccccccccccccc/data%20we%20test/03_Measles_Viral_Rash/label_integrity_report.md) — Medical morphology vs confirmed disease analysis
- [split_leakage_report.md](file:///F:/Clude%20cccccccccccccccccccccc/data%20we%20test/03_Measles_Viral_Rash/split_leakage_report.md) — Patient leakage risk analysis
- [GPU_VERIFICATION.json](file:///F:/Clude%20cccccccccccccccccccccc/data%20we%20test/03_Measles_Viral_Rash/GPU_VERIFICATION.json) — RTX 5060 Ti forward/backward benchmark proof
- [NEXT_STEPS.md](file:///F:/Clude%20cccccccccccccccccccccc/data%20we%20test/03_Measles_Viral_Rash/NEXT_STEPS.md) — Operational execution plan for Drive G / prospective cohorts
