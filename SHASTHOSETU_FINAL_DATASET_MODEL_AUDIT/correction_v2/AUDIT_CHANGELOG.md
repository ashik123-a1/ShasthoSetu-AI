# 📝 ShasthoSetu AI — Audit Changelog & Evidence Reconciliation (V1 to V2)

**Document Reference:** `SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/correction_v2/AUDIT_CHANGELOG.md`  
**Superseded Package:** `SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/` (Initial 12 files)  
**Corrected Package:** `SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/correction_v2/`  
**Execution Date:** 2026-11-18  

---

## 1. Overview of Audit Revisions

Following senior research audit review of the initial 12-file audit package, six specific factual contradictions, inventory discrepancies, and interpretative over-claims were identified. This changelog details every revision applied between Version 1 and Version 2, cross-referencing primary file paths and cryptographic hashes.

---

## 2. Granular Record of Changes

### Change 1: MCVSLD Source-Family Count Discrepancy Resolved
- **Prior Claim in V1:**
  Reported total family count as **751 families** (Train: 524, Validation: 113, Test: 114) in `MASTER_DATASET_AUDIT.md`, `DATA_LEAKAGE_AND_SPLIT_AUDIT.md`, and `CRITICAL_RESEARCH_ISSUES.md`.
- **Primary Source Investigation:**
  Inspected the authoritative grouped split manifest:
  - File: `03_Measles_Viral_Rash/data/processed/clean_grouped_split_manifest.csv`
  - File Size: `2,655,994` bytes
  - SHA-256: `6dff760386b9e8d90f71c8347972d2bbf9a4ccee9a0a11a17ecddb2cec4f3daf`
  - Manifest rows: 10,384 total image crops.
  - Distinct `family_id`s in column `grouped_split`:
    - `train`: **528 families** (7,279 image crops)
    - `val`: **113 families** (1,544 image crops)
    - `test`: **114 families** (1,561 image crops)
    - `total`: **755 unique source-photo families** ($528 + 113 + 114 = 755$).
  - Cross-split family intersection: Train $\cap$ Val $= 0$, Train $\cap$ Test $= 0$, Val $\cap$ Test $= 0$.
  - Corroborated by `_reports/corrected_submission_v2/MCVSLD_SOURCE_FAMILY_AUDIT.csv` (exactly 755 rows: 528 train, 113 val, 114 test).
- **Correction Applied:**
  The figure "751" was an arithmetic typo originating from a miscopied train count (524 instead of 528). The authoritative count of **755 source-photo families** is established across all V2 deliverables.

---

### Change 2: Majority-Vote Tie Audit Factual Correction
- **Prior Claim in V1:**
  `INDEPENDENT_METRIC_VERIFICATION.json` listed `MSL_41_01`, `CPX_11_01`, and `MPX_11_01` as majority-vote tied validation families.
- **Primary Source Investigation:**
  Inspected `03_Measles_Viral_Rash/model_selection_final/correction_v1/MAJORITY_VOTE_TIE_AUDIT.csv` and re-aggregated all 1,544 crops from `val_predictions_resnet18.csv` and `val_predictions_mobilenet_v3_small.csv`:
  - **The 3 Genuine Tied Cases:**
    1. `ResNet18` — `MKP_117_01`: 14 crops ($7\text{ Monkeypox}, 7\text{ Chickenpox}$). True class: Monkeypox.
    2. `ResNet18` — `MKP_41_01`: 12 crops ($5\text{ Cowpox}, 5\text{ Monkeypox}, 2\text{ Chickenpox}$). True class: Monkeypox.
    3. `MobileNetV3` — `HFMD_32_01`: 14 crops ($7\text{ Monkeypox}, 7\text{ Cowpox}$). True class: HFMD.
  - **Resolution on `MSL_41_01`:**
    In `val_predictions_resnet18.csv`, family `MSL_41_01` has 14 crops with predictions: **8 Monkeypox, 6 Measles**.
    Because $8 > 6$, ResNet18 predicted Monkeypox by strict majority. This was an **outright misclassification** (missed Measles family, resulting in 8/9 family recall), **NOT a tie**.
    MobileNetV3 predicted: 8 Measles, 3 Monkeypox, 2 Healthy, 1 Cowpox, correctly predicting Measles (9/9 family recall).
- **Correction Applied:**
  Retracted the erroneous family IDs (`MSL_41_01`, `CPX_11_01`, `MPX_11_01`). Documented the true tied cases and clarified that `MSL_41_01` was an outright ResNet18 error.

---

### Change 3: Checkpoint Hashes and Distribution Archive Accounting
- **Prior Claim in V1:**
  `MODEL_CHECKPOINT_AND_PROOF_INVENTORY.csv` contained corrupted/truncated hash strings for PCOS Clinical (`1af755...c88f`) and Ultrasound (`e60e15...a8ef` / `bb59e7...e3dc`). It also claimed that `resnet18_grouped_best.pth` and `mobilenet_v3_small_grouped_best.pth` were verified inside `_reports/03_Measles_Viral_Rash_PROOFS.zip`.
- **Primary Source Investigation:**
  Computed direct SHA-256 hashes on disk and inside all ZIP archives:
  - **PCOS Clinical (`model_best.joblib`):** Local hash `1af755f7a45d0604ad51ded10539290676ecb993bc541d924daeb3a190d28ba6` is **100% IDENTICAL** to the archived file inside `_reports/01_PCOS_Clinical_PROOFS.zip`. The prior audit table recorded wrong hash data.
  - **PCOS Ultrasound (`resnet18_best.pth` & `mobilenetv3_best.pth`):** Local hashes (`e60e15...7d65` and `bb59e7...75f1`) are **100% IDENTICAL** to the files inside `_reports/02_PCOS_Ultrasound_PROOFS.zip`.
  - **Viral Rash Grouped Weights:** `resnet18_grouped_best.pth` (SHA-256: `809a...0571`) and `mobilenet_v3_small_grouped_best.pth` (SHA-256: `c80a...4c05`) exist on local disk only. `03_Measles_Viral_Rash_PROOFS.zip` was compiled during initial baseline experiments and holds the historical contaminated weights only (`resnet18_best.pth`, SHA-256: `c649...da34`).
- **Correction Applied:**
  Corrected all hashes and sizes in `MODEL_CHECKPOINT_VERSION_HASH_AUDIT.csv`. Categorized grouped weights honestly as `LOCAL_WORKING_COPY_ONLY` (absent from earlier historical ZIP), retracting false claims of ZIP presence.

---

### Change 4: Prescription OCR Demonstration Image and Ground Truth Nature
- **Prior Claim in V1:**
  Audit repeatedly cited `0974.jpeg` as giving 100% medication recall. It cited Levenshtein CER ($96.69\%$ En, $103.34\%$ Bn) and $6.96\%$ regex matches as certified OCR accuracy metrics.
- **Primary Source Investigation:**
  - Audited `04_Prescription_OCR/final_integration/patch_v1/proofs/bilingual_ocr_results.json`, `BILINGUAL_PRESCRIPTION_OCR_AUDIT.md`, and `REAL_E2E_TEST_RESULTS.md`.
  - The actual evaluated image was **`0052.jpg`** (44 detected tokens, EasyOCR CRAFT+ResNet CTC on RTX 5060 Ti). `0974.jpeg` was never executed in that benchmark.
  - Inspected `Prescriptions_Dataset.csv`: Annotations `description_english` and `description_bangla` are **clinical narrative summaries**, not literal line-by-line OCR transcription.
- **Correction Applied:**
  - Corrected demonstration image identity to `0052.jpg` (single-sample smoke test only).
  - Formally marked classical OCR CER, WER, and medication recall as **`NOT_VALIDATED`** due to lack of literal transcription ground truth.
  - Reconciled sample counts: 152 total test, 3 corrupted quarantined, 149 admissible evaluated, and historical 140/152 triage. Documented Patch V1 permanent lockout of automated dosage reminders (`SIMULATED_REVIEW_ONLY`).

---

### Change 5: Model Registry Taxonomic Partitioning
- **Prior Claim in V1:**
  `ALL_TRAINED_MODELS_REGISTER.csv` listed 16 entries and ambiguously described them in text as "16 locally trained models".
- **Primary Source Investigation:**
  Classified all 16 entries based on training provenance and storage:
  - 7 Locally Trained Checkpoints (`M01-XGB-01`, `M02-RESNET-01`, `M02-MOBILENET-02`, `M03-RESNET-GROUPED-01`, `M03-MOBILENET-GROUPED-02`, `M06-EXP-B-01`, `M06-EXP-D-02`).
  - 1 Externally Fine-Tuned Downloaded Checkpoint (`M05-WHISPER-SMALL-BN-03`, cached on `G:\hf_cache`).
  - 3 Generic Pretrained Inference Pipelines (`M04-EASYOCR-PIPELINE-01`, `M05-WHISPER-BASE-01`, `M05-WHISPER-TINY-02`).
  - 2 Historical Contaminated Checkpoints (`M03-RESNET-CONTAMINATED-03`, `M03-MOBILENET-CONTAMINATED-04`).
  - 3 Evaluated Models without Stored Weights (`M01-RF-02`, `M01-LR-03`, `M06-EXP-A-03`).
- **Correction Applied:**
  Re-authored the registry as `CORRECTED_MODEL_INVENTORY.csv` with strict scientific classification columns, distinguishing genuine local checkpoints from pipelines and caches.

---

### Change 6: Scientific Claims and Reproducibility Guardrails
- **Prior Claim in V1:**
  Over-claimed patient-level independence in vision modules; claimed full reproducibility based on reading saved metrics; claimed verified DermoPed status without local access to full 19 GB Zenodo dataset.
- **Correction Applied:**
  - Clearly distinguished True Patient Level (PCOS Clinical $N=88$, DermoPed local $N=22$), Pseudo-Patient Clustering (PCOS Ultrasound $N=244$ dev), and Source-Photo Family Level (Viral Rash $N=755$).
  - Disclosed that full 19 GB Zenodo DermoPed is not present locally (only 22-patient 2-class subset).
  - Explicitly differentiated live GPU re-executions from log audits.
  - Final verdict designated: **`RESEARCH_AUDIT_PASS_WITH_LIMITATIONS`**.
