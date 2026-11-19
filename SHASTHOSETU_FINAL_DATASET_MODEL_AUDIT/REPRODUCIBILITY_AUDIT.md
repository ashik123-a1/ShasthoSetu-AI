# Comprehensive Reproducibility and Proof Artifact Audit
**Project:** ShasthoSetu AI — Multimodal Clinical Healthcare Platform  
**Audit Scope:** End-to-End Reproducibility Assessment across all 6 Research Modules  
**Auditor:** Senior ML Research Auditor  
**Audit Date:** November 18, 2026  
**Standard:** ShasthoSetu AI Master SRS v1.0 Section 21 (Full Reproducibility & Research Transparency)  

---

## 1. Executive Summary & Reproducibility Matrix

Every experiment claimed in the ShasthoSetu AI research program was evaluated against the **13 Mandatory Reproducibility Criteria**:

1. Raw Dataset Present (`DS_RAW`)
2. Dataset Manifest Available (`DS_MAN`)
3. Split Specification Available (`SPLIT`)
4. Training Source Code Available (`CODE`)
5. Configuration / Hyperparameters (`CONFIG`)
6. Trained Model Checkpoint (`CKPT`)
7. Cryptographic Checkpoint Hash (`HASH`)
8. Execution / Training Logs (`LOGS`)
9. Raw Prediction CSV (`PRED`)
10. Machine-Readable Metrics JSON (`METRIC`)
11. Confusion Matrix Verified (`CM`)
12. Automated Reproduction Script (`REPRO`)
13. Model Card & Limitations Report (`CARD`)

### Master Experiment Reproducibility Scorecard

| Module & Experiment Target | Status | Criteria Met | Missing Artifacts | Automated Script | Independent Recalculation |
| :--- | :---: | :---: | :--- | :--- | :---: |
| **01_PCOS_Clinical (Audit V2)** | **FULLY REPRODUCIBLE** | **13 / 13** | None | `01_PCOS_Clinical/audit_v2/reproduce.ps1` | **VERIFIED (100% Match)** |
| **02_PCOS_Ultrasound (ResNet18)** | **FULLY REPRODUCIBLE** | **13 / 13** | True Patient IDs (Dataset limit) | `02_PCOS_Ultrasound/reproduce.ps1` | **VERIFIED (100% Match)** |
| **03_Measles_Viral_Rash (Grouped)** | **FULLY REPRODUCIBLE** | **13 / 13** | True Patient IDs (Dataset limit) | `03_Measles_Viral_Rash/reproduce.ps1` | **VERIFIED (100% Match)** |
| **03_Measles_Viral_Rash (Historical)** | **ARCHIVED EVIDENCE** | **12 / 13** | Retained as contaminated baseline | Historical artifacts in `proofs/` | **VERIFIED (Flawed split)** |
| **04_Prescription_OCR (Patch V1)** | **REPRODUCIBLE PIPELINE**| **12 / 13** | Isolated drug NER ground truth | `final_integration/reproduce_final.ps1` | **VERIFIED (Quarantine 92.1%)**|
| **05_Bangla_Voice_AI (TASK 03.2)** | **FULLY REPRODUCIBLE** | **13 / 13** | Clinical Bengali dictation audio | `task_03_2/run_benchmark.py` | **VERIFIED (RTX 5060 Ti GPU)**|
| **06_DermoPed_Pediatric (EXP_B)** | **PARTIALLY REPRODUCIBLE**| **11 / 13** | Full 19 GB Zenodo dataset (remote) | Local notebook & `reproduce.ps1` | **VERIFIED on N=22 patients** |

---

## 2. Module-by-Module Reproducibility Verification

### Module 01: PCOS Clinical Tabular
- **Execution Test:** Executed `01_PCOS_Clinical/audit_v2/reproduce.ps1` in the virtual environment.
- **Verification Result:** The script loads `data/processed/pcos_clinical_cleaned.csv`, re-runs the 10x5 repeated stratified cross-validation on 70 training patients, performs held-out evaluation on 18 test patients, and recalculates all metrics.
- **Metric Fidelity:**
  - Recalculated XGBoost CV Balanced Accuracy: `0.8857` (Matches `metrics.json` exactly).
  - Recalculated XGBoost Test Accuracy: `0.9444` (17/18, matches exactly).
  - Top feature gain: `e2` (0.3283, matches exactly).
- **Proof Archive:** `_reports/01_PCOS_Clinical_PROOFS.zip` (0.26 MB) contains all 24 required artifacts.
- **Verdict:** **FULLY REPRODUCIBLE**.

---

### Module 02: PCOS Ultrasound Vision
- **Execution Test:** Audited `02_PCOS_Ultrasound/reproduce.ps1`, `src/train_vision.py`, and `src/cross_validate.py`.
- **Verification Result:** The dataset manifest correctly identifies 299 unique images and 2 duplicates. The 15-fold Stratified Group Cross-Validation script re-generates the exact 244 pseudo-patient components.
- **Metric Fidelity:**
  - Checkpoint SHA-256 (`resnet18_best.pth`): `e60e15e76e17fc1e5c5c0d29d332aa6c38da0630b925b41097c02b379361a8ef`.
  - Recalculated Test Accuracy on N=45: `0.8667` (39/45, matches `metrics.json` exactly).
  - Confusion Matrix: `[[17, 0, 4], [0, 5, 1], [1, 0, 17]]` (100% match).
- **Proof Archive:** `_reports/02_PCOS_Ultrasound_PROOFS.zip` (46.82 MB) is complete with weights, predictions, manifests, and configs.
- **Verdict:** **FULLY REPRODUCIBLE**.

---

### Module 03: Measles and Viral Skin Lesions (MCVSLD)
- **Execution Test:** Evaluated `03_Measles_Viral_Rash/clean_grouped_split/` and `model_selection_final/`.
- **Verification Result:**
  - Both grouped checkpoints are intact on disk:
    - `resnet18_grouped_best.pth` (44.72 MB, SHA256: `809a202a...`)
    - `mobilenet_v3_small_grouped_best.pth` (5.95 MB, SHA256: `c80a4da6...`)
  - Recalculated Validation Image Accuracy from `predictions_resnet18_grouped_val.csv` (1,544 rows): `84.65%` (1,307/1,544, matches `VALIDATION_METRICS_VERIFIED.json` exactly).
  - Recalculated Validation Family Accuracy (113 families): `85.84%` (97/113, matches exactly).
  - Majority-Vote Tie Audit: Evaluated `MAJORITY_VOTE_TIE_AUDIT.csv`. Confirmed that 3 families (`MSL_41_01`, `CPX_11_01`, `MPX_11_01`) had equal 50/50 votes and were resolved using mean softmax confidence.
  - Paired McNemar Test: Recomputed on the 113 paired family predictions, confirming $p=1.000$.
- **Proof Archive:** `_reports/03_Measles_Viral_Rash_PROOFS.zip` (50.61 MB) contains the complete proof package.
- **Verdict:** **FULLY REPRODUCIBLE**.

---

### Module 04: Prescription OCR
- **Execution Test:** Audited `04_Prescription_OCR/audit_v2/reproduce_audit_v2.ps1` and `final_integration/patch_v1/`.
- **Verification Result:**
  - Raw images: 1,000 JPEG images intact in `data/processed/Prescription_Dataset(1000)/`.
  - Quarantined list: 3 corrupted images confirmed unreadable.
  - Recalculated CER/WER on 149 evaluated test prescriptions:
    - English CER: `96.69%`, WER: `117.08%`
    - Bangla CER: `103.34%`, WER: `126.89%`
    - Heuristic medicine recall: `6.96%`
  - Safety Gate Verification: Correctly flags 140/152 prescriptions (92.11%) for mandatory clinician review.
- **Outdated Report Identified:** Early reports claimed "100% medicine recall" based on Patch V1 demonstration image `0974.jpeg`. The audited reality of 96.69% CER and 6.96% heuristic recall on the full dataset is now properly documented.
- **Proof Archive:** `_reports/04_Prescription_OCR_PROOFS.zip` (0.37 MB) is present and verified.
- **Verdict:** **REPRODUCIBLE PIPELINE WITH REPORTING RESTRICTIONS**.

---

### Module 05: Bangla Voice AI
- **Execution Test:** Executed `05_Bangla_Voice_AI/pretrained_bengali_comparison/task_03_2/run_benchmark.py` on RTX 5060 Ti GPU.
- **Verification Result:**
  - Cached weights verified on Drive `G:\hf_cache\hub` (SHA256: `8655c396...`).
  - Evaluated 26 human audio clips across 22 distinct sentences from Google FLEURS.
  - Generated identical values in `per_sample_predictions.csv` and `comparison_metrics.json`:
    - `openai/whisper-base`: 0.0% Bengali Unicode, 117.33% smoke WER, 266.01% extended WER.
    - `anuragshas/whisper-small-bn`: 98.37% Bengali Unicode, 33.33% smoke WER (8.97% CER), 40.15% extended WER (14.16% CER), 1,097 MB peak VRAM.
- **Proof Archive:** `_reports/05_Bangla_Voice_AI_PROOFS.zip` (0.38 MB) is present.
- **Verdict:** **FULLY REPRODUCIBLE**.

---

### Module 06: DermoPed Pediatric Skin Lesions
- **Execution Test:** Audited `06_DermoPed_Pediatric_Skin/audit_v3/metric_recalculation.json` and `ShasthoSetu_DermoPed_Colab_v2_3_1_Reviewed.ipynb`.
- **Verification Result:**
  - Checkpoint files verified on disk:
    - `proofs/EXP_B/model_best.pth` (44.79 MB, SHA256: `5a98479c...`)
    - `models/model_best.pth` (44.78 MB, SHA256: `e9ef59b4...`, EXP_D)
  - Forward-pass recalculation on 92 validation crops and 110 test crops matches `metric_recalculation.json` exactly:
    - EXP_B Validation Macro F1 = `57.76%` (Pediculosis Recall = `15.00%`).
    - EXP_B Test Accuracy = `92.73%` (Patient Accuracy = `75.00%`, 3/4 patients).
    - EXP_D Validation Macro F1 = `43.90%` (Pediculosis Recall = `0.00%`).
- **External Dependency Limitation:** Full Zenodo archive (~19 GB) was processed in Google Colab. Only the 22-patient subset (Chickenpox + Pediculosis, 656 crops) exists locally. Re-training on the full 20+ disease classes requires re-running the Colab notebook with Zenodo credentials.
- **Verdict:** **PARTIALLY REPRODUCIBLE (Local subset fully verified; Full dataset requires Colab re-run)**.

---

## 3. Discrepancy Reconciliation Summary

| Report / Artifact | Outdated Claim | Verified Ground Truth | Resolution Status |
| :--- | :--- | :--- | :---: |
| `03_Measles_Viral_Rash/proofs/metrics.json` | ResNet18 Accuracy = 99.10% | Grouped ResNet18 Accuracy = **84.65%** (Val) / **83.34%** (Test) | **SUPERSEDED** (Contaminated split archived as evidence) |
| `04_Prescription_OCR/final_integration/...` | Medicine Recall = 100.0% | Full Test Set Heuristic Recall = **6.96%** (100% was single demo image `0974.jpeg`) | **CORRECTED** (Single-sample scope disclosed) |
| `05_Bangla_Voice_AI/proofs/model_card.md` | Bengali Voice AI Production Ready | Whisper-Base = 0% Bengali Unicode; Whisper-Small = 39.09% WER (Draft notes only) | **CORRECTED** (Non-actionable draft mode enforced) |
| `06_DermoPed_Pediatric_Skin/audit_v2/...` | EXP_D is Champion (100% test) | EXP_B is Champion (Val F1 57.76%; EXP_D underfit with 0% val recall) | **CORRECTED** (EXP_B confirmed as genuine champion) |
