# 🏥 ShasthoSetu AI — Corrected Master Research Audit Report (V2)

**Document Reference:** `SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/correction_v2/CORRECTED_FINAL_RESEARCH_AUDIT.md`  
**Lead Auditor:** Independent Senior ML Research Auditor  
**Audit Target:** All Existing Datasets, Trained Model Checkpoints, and Proof Archives in `data we test`  
**Execution Date:** 2026-11-18  
**Final Audit Status:** **`RESEARCH_AUDIT_PASS_WITH_LIMITATIONS`**  

---

## 1. Executive Summary & Final Verdict

$$\mathbf{FINAL\ AUDIT\ VERDICT:\ RESEARCH\_AUDIT\_PASS\_WITH\_LIMITATIONS}$$

Following senior research review of the initial 12-file audit package (`SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/`), six factual contradictions, inventory discrepancies, and interpretative over-claims were identified. This corrected master report, supported by seven specialized reconciliation deliverables in `correction_v2/`, provides the definitive, mathematically verified scientific baseline for ShasthoSetu AI.

### Core Reconciled Findings
1. **MCVSLD Source-Family Count:** The true manifest count is definitively **755 source-photo families** (Train: 528, Validation: 113, Test: 114) with **0.00% cross-family leakage**. The previous "751" figure was an arithmetic typo in train documentation.
2. **Majority-Vote Tie Audit:** Re-aggregation from raw crop predictions confirms exactly **3 tied validation families**: `MKP_117_01` (ResNet18), `MKP_41_01` (ResNet18), and `HFMD_32_01` (MobileNetV3). `MSL_41_01` was an outright misclassification by ResNet18 (8 Monkeypox vs 6 Measles votes), not a tie.
3. **Checkpoint Cryptographic Hashes:** Local working checkpoints and archived proof ZIP files for PCOS Clinical and PCOS Ultrasound are **100% IDENTICAL**. Prior discrepancies were caused by table typographical errors, not file corruption. The grouped Viral Rash checkpoints reside on local disk only and were never packaged into the earlier historical proof ZIP.
4. **Prescription OCR Ground Truth:** Mendeley annotations are clinical narrative summaries, not literal OCR transcripts. Character Error Rates ($96.69\%$ En, $103.34\%$ Bn) and drug recall ($6.96\%$) are formally reclassified as **`NOT_VALIDATED`**. The demonstrated $100\%$ brand recall was verified on **`0052.jpg`** (not `0974.jpeg`). The clinical safety gate permanently locks out automated reminder creation (`SIMULATED_REVIEW_ONLY`).
5. **Model Registry Classification:** The 16 project models are strictly partitioned into 7 Locally Trained Checkpoints, 1 Externally Fine-Tuned Downloaded Checkpoint, 3 Generic Pretrained Inference Pipelines, 2 Historical Contaminated Checkpoints, and 3 Evaluated Models without Stored Weights.
6. **Data Independence Boundaries:** Patient-level independence is certified only where genuine patient IDs exist (PCOS Clinical $N=88$, DermoPed local $N=22$). Ultrasound operates at the pseudo-patient level ($N=244$ dev), Viral Rash at the source-photo family level ($N=755$), and Voice AI at the separate public corpus level.

---

## 2. Master Multimodal Dataset & Model Reconciliation

| Module | Primary Research Model | Scientific Classification | Dataset & Split Level | Primary Metric | Independence Verified | Checkpoint Hash Match |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **01_PCOS_Clinical** | XGBoost Classifier (`M01-XGB-01`) | Locally Trained Checkpoint | Mendeley PCOS ($N=88$)<br>True Patient ID | Test Bal Acc: **94.44%** (17/18)<br>10x 5-Fold CV: **88.57%** | **TRUE_PATIENT** | **MATCH** (`1af7...ba6`) |
| **02_PCOS_Ultrasound** | ResNet18 Morphology (`M02-RESNET-01`) | Locally Trained Checkpoint | Kaggle/Mendeley ($N=299$)<br>Pseudo-Patient Cluster | Test Acc: **86.67%** (39/45)<br>15-Fold Group CV: **85.42%** | **PSEUDO_PATIENT** | **MATCH** (`e60e...7d65`) |
| **03_Measles_Viral_Rash** | ResNet18 Grouped (`M03-RESNET-GROUPED-01`) | Locally Trained Checkpoint | MCVSLD Grouped ($N=755$)<br>Source-Photo Family | Val Img Acc: **84.65%**, F1: **84.22%**<br>Measles Recall: **91.94%** | **SOURCE_FAMILY** | **LOCAL_DISK_ONLY** (`809a...0571`) |
| **04_Prescription_OCR** | EasyOCR CRAFT+ResNet (`M04-EASYOCR-PIPELINE-01`) | Generic Pretrained Pipeline | Mendeley Prescriptions ($N=1,000$)<br>Prescription Sheet ID | Demo (`0052.jpg`): 44 tokens<br>Full Set: **92.11% Quarantined** | **DOCUMENT_ID** | **PRETRAINED_CACHE** |
| **05_Bangla_Voice_AI** | Whisper-Small-BN (`M05-WHISPER-SMALL-BN-03`) | External Fine-Tuned Checkpoint | Google FLEURS Bengali ($N=26$)<br>Audio Sentence / Speaker | Norm WER: **39.09%**, CER: **13.44%**<br>Bangla Unicode: **98.37%** | **CROSS_CORPUS** | **EXTERNAL_G:_CACHE** (`8655...9546`) |
| **06_DermoPed_Pediatric** | ResNet18 EXP_B (`M06-EXP-B-01`) | Locally Trained Checkpoint | DermoPed Zenodo ($N=22$ local)<br>True Patient ID | Test Img Acc: **92.73%** (102/110)<br>Patient Acc: **75.0%** (3/4) | **TRUE_PATIENT** | **LOCAL_DISK_ONLY** (`5a98...48da`) |

---

## 3. Granular Evidence Reconciliations

### 3.1 Section A: MCVSLD Source-Family Re-computation
- **The Question:** Did the clean grouped split contain 751 or 755 families?
- **Primary Code Execution:** Read `clean_grouped_split_manifest.csv` ($2.65\text{ MB}$, SHA-256: `6dff760386b9e8d90f71c8347972d2bbf9a4ccee9a0a11a17ecddb2cec4f3daf`).
- **Recalculated Family Distribution:**
  - `train`: **528 families** (7,279 image crops)
  - `val`: **113 families** (1,544 image crops)
  - `test`: **114 families** (1,561 image crops)
  - Total Unique Families: **755** ($528 + 113 + 114 = 755$).
- **Cross-Split Family Intersections:**
  $$\text{Train} \cap \text{Val} = 0, \quad \text{Train} \cap \text{Test} = 0, \quad \text{Val} \cap \text{Test} = 0$$
- **Finding:** The earlier report of 751 families was an arithmetic error where train families were recorded as 524 instead of 528. Zero cross-family leakage is mathematically verified across all 755 families.

### 3.2 Section B: Majority-Vote Tie Audit & Model Selection
- **The Question:** Which families experienced exact vote ties, and why did MobileNetV3 achieve higher Measles recall?
- **Primary Source:** Re-computed directly from `val_predictions_resnet18.csv` and `val_predictions_mobilenet_v3_small.csv` ($1,544$ crops across $113$ validation families).
- **Verified Tied Cases:**
  1. `MKP_117_01` (ResNet18): 14 crops ($7\text{ Monkeypox}, 7\text{ Chickenpox}$). True: Monkeypox.
  2. `MKP_41_01` (ResNet18): 12 crops ($5\text{ Cowpox}, 5\text{ Monkeypox}, 2\text{ Chickenpox}$). True: Monkeypox.
  3. `HFMD_32_01` (MobileNetV3): 14 crops ($7\text{ Monkeypox}, 7\text{ Cowpox}$). True: HFMD.
- **Resolution of `MSL_41_01`:**
  - `MSL_41_01` had 14 crops. ResNet18 predicted: **8 Monkeypox, 6 Measles**.
  - Since $8 > 6$, ResNet18 predicted Monkeypox by strict majority vote. This was an outright misclassification, **NOT a tie**.
  - MobileNetV3 predicted: **8 Measles, 3 Monkeypox, 2 Healthy, 1 Cowpox**, correctly predicting Measles.
  - This explains why MobileNetV3 achieved 9/9 (100%) Measles family recall while ResNet18 achieved 8/9 (88.89%).
- **Primary Model Decision:** ResNet18 Grouped is retained as the primary research-demo model because of superior crop-level image accuracy ($84.65\%$ vs $81.15\%$), balanced accuracy ($87.19\%$ vs $84.04\%$), and macro F1 ($84.22\%$ vs $81.56\%$). McNemar test confirms no statistically significant difference in family accuracy ($p = 1.000$).

### 3.3 Section C: Checkpoint Hash & Distribution Archive Reconciliation
- **The Question:** Why did checkpoint hashes in the previous inventory differ from the proof archives?
- **Primary Cryptographic Audit:**
  - `01_PCOS_Clinical/models/model_best.joblib`: Local SHA-256 is `1af755f7a45d0604ad51ded10539290676ecb993bc541d924daeb3a190d28ba6`. File inside `_reports/01_PCOS_Clinical_PROOFS.zip` has SHA-256 `1af755f7a45d0604ad51ded10539290676ecb993bc541d924daeb3a190d28ba6`. **100% IDENTICAL MATCH.**
  - `02_PCOS_Ultrasound/models/resnet18_best.pth`: Local SHA-256 is `e60e15e76e17fc1e50714ff958a37fc8caaeb43ce6aca6edeb658a0017e47d65`. File inside `_reports/02_PCOS_Ultrasound_PROOFS.zip` has SHA-256 `e60e15e76e17fc1e50714ff958a37fc8caaeb43ce6aca6edeb658a0017e47d65`. **100% IDENTICAL MATCH.**
  - `02_PCOS_Ultrasound/models/mobilenetv3_best.pth`: Local SHA-256 is `bb59e7cd9e5ade3ccfedeae4e2ed4e029135757de7e873b2738a4e167a6a75f1`. File inside `_reports/02_PCOS_Ultrasound_PROOFS.zip` has SHA-256 `bb59e7cd9e5ade3ccfedeae4e2ed4e029135757de7e873b2738a4e167a6a75f1`. **100% IDENTICAL MATCH.**
  - **Root Cause:** The files on disk were never altered or corrupted; the previous audit author pasted malformed/hallucinated hash strings into the inventory CSV.
  - **Grouped Checkpoint Accounting:** `resnet18_grouped_best.pth` (`809a...0571`) and `mobilenet_v3_small_grouped_best.pth` (`c80a...4c05`) exist on local disk only. `_reports/03_Measles_Viral_Rash_PROOFS.zip` contains only the historical contaminated weights (`c649...da34`). The prior audit claim of archive presence was false and is formally retracted.

### 3.4 Section D: Prescription OCR Evidence & Safety Triage
- **The Question:** Why was `0974.jpeg` cited instead of `0052.jpg`, and why are reported CERs over 96%?
- **Demonstration Image Identity:** Primary records in `bilingual_ocr_results.json`, `BILINGUAL_PRESCRIPTION_OCR_AUDIT.md`, and `REAL_E2E_TEST_RESULTS.md` verify that the tested image was **`0052.jpg`** (44 detected tokens, EasyOCR CRAFT+ResNet CTC on RTX 5060 Ti). `0974.jpeg` was an erroneous citation in the previous audit text.
- **Ground Truth Analysis:** Mendeley dataset annotations (`description_english`, `description_bangla`) are physician narrative summaries (e.g. *"Bilastin 20 mg tablet should be taken once at night..."*), NOT verbatim transcriptions of paper ink. Calculating Levenshtein edit distance between raw OCR output and narrative summaries produces artificial CERs ($96.69\%$ En, $103.34\%$ Bn) measuring genre mismatch.
- **Status Correction:** All CER, WER, and aggregate drug recall figures are formally designated **`NOT_VALIDATED`**.
- **Sample Count Reconciliation:** Total test split: 152 images; 3 corrupted quarantined (`0186.jpg`, `0756.jpg`, `0757.jpg`); 149 admissible evaluated. Historical 140/152 triage ($92.11\%$) safely intercepted unverified prescriptions. Under Patch V1, **100% of automated reminders are permanently blocked** (`ClinicalSafetyViolationError`), enforcing `SIMULATED_REVIEW_ONLY`.

### 3.5 Section E: Model Inventory Taxonomic Breakdown
The 16 entries in `CORRECTED_MODEL_INVENTORY.csv` are strictly categorized:
- **Locally Trained Checkpoints (7):** `M01-XGB-01`, `M02-RESNET-01`, `M02-MOBILENET-02`, `M03-RESNET-GROUPED-01`, `M03-MOBILENET-GROUPED-02`, `M06-EXP-B-01`, and ablation `M06-EXP-D-02`.
- **Externally Fine-Tuned Downloaded Checkpoint (1):** `M05-WHISPER-SMALL-BN-03` (cached on `G:\hf_cache\hub`).
- **Generic Pretrained Inference Pipelines (3):** `M04-EASYOCR-PIPELINE-01` (EasyOCR), `M05-WHISPER-BASE-01` (OpenAI Base), `M05-WHISPER-TINY-02` (OpenAI Tiny).
- **Historical Contaminated Checkpoints (2):** `M03-RESNET-CONTAMINATED-03` (ResNet18 99.10%), `M03-MOBILENET-CONTAMINATED-04` (MobileNetV3 98.20%).
- **Evaluated Models without Stored Weights (3):** `M01-RF-02`, `M01-LR-03`, `M06-EXP-A-03`.

---

## 4. Deliverables Index in `correction_v2/`

All corrected audit files reside in `SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/correction_v2/`:

1. [CORRECTED_FINAL_RESEARCH_AUDIT.md](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/correction_v2/CORRECTED_FINAL_RESEARCH_AUDIT.md) — This master document.
2. [DATASET_SPLIT_RECONCILIATION.csv](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/correction_v2/DATASET_SPLIT_RECONCILIATION.csv) — Primary split counts, grouping levels, and leakage audit across all modules.
3. [MODEL_CHECKPOINT_VERSION_HASH_AUDIT.csv](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/correction_v2/MODEL_CHECKPOINT_VERSION_HASH_AUDIT.csv) — Exact byte sizes, local SHA-256 hashes, archive ZIP hashes, and version reconciliation.
4. [CORRECTED_MODEL_INVENTORY.csv](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/correction_v2/CORRECTED_MODEL_INVENTORY.csv) — Taxonomic classification of all 16 models into local, external, pretrained, and historical categories.
5. [OCR_GROUND_TRUTH_AND_METRICS_CORRECTION.md](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/correction_v2/OCR_GROUND_TRUTH_AND_METRICS_CORRECTION.md) — Deep dive into Mendeley ground truth, image 0052 vs 0974, and safety gate triage.
6. [REPRODUCIBILITY_EVIDENCE_MATRIX.md](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/correction_v2/REPRODUCIBILITY_EVIDENCE_MATRIX.md) — Local disk vs archive ZIP audit, levels of independence, and execution boundaries.
7. [FINAL_PASS_FAIL_MATRIX.md](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/correction_v2/FINAL_PASS_FAIL_MATRIX.md) — Comprehensive evaluative verdict and research limitations before development.
8. [AUDIT_CHANGELOG.md](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/correction_v2/AUDIT_CHANGELOG.md) — Complete line-by-line audit changelog detailing all V1 to V2 corrections.
9. [verify_audit_corrections.py](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/correction_v2/verify_audit_corrections.py) — Standalone, reproducible read-only verification script.

---

## 5. Transition to Application & UI Development (SRS v2.0)

With research audit sign-off established under `RESEARCH_AUDIT_PASS_WITH_LIMITATIONS`:
- **Research Phase:** Formally signed off and frozen. No further model retraining, synthetic benchmarking, or dataset re-partitioning is required.
- **Application Phase:** Ready to proceed directly to Streamlit frontend, interactive dashboards (Patient, Doctor, Admin, Support), backend API routing, and full feature development according to **SRS v2.0**.
- **Voice & Chatbot/RAG Work:** Remains deferred, exactly as instructed by the user, until core portal features and dashboards are fully operational.
