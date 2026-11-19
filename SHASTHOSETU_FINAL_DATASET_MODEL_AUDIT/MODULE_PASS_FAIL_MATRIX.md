# ShasthoSetu AI — Research Module Pass/Fail Audit Matrix
**Project:** ShasthoSetu AI — Multimodal Clinical Healthcare Platform  
**Auditor:** Senior ML Research Auditor  
**Audit Date:** November 18, 2026  
**Audited Directory:** `F:\Clude cccccccccccccccccccccccc\data we test\`  
**Compliance Standard:** Master SRS v1.0 Section 16 & 21  

---

## 1. Master Pass / Fail Verdict Matrix

Each module is evaluated across 5 core research pillars and assigned an overall verdict:
- **`PASS`:** All scientific, data, model, and reproducibility standards fully satisfied with zero unresolved critical defects.
- **`PARTIAL` (Pass with Limitations):** Valid research demonstration achieved, but constrained by dataset size, lack of patient IDs, or domain limitations requiring strict clinical disclaimers.
- **`FAIL`:** Critical scientific errors, fatal data leakage, or unverified claims that prevent use.
- **`NOT_VERIFIED`:** Missing primary experimental artifacts preventing verification.

```
+--------------------------------------------------------------------------------------------------------------------+
| MODULE                 | DATASET INTEGRITY | MODEL CHECKPOINTS | METRIC RECALC | LEAKAGE AUDIT | REPRODUCIBILITY | OVERALL VERDICT |
+------------------------+-------------------+-------------------+---------------+---------------+-----------------+-----------------+
| 01_PCOS_Clinical       | PASS              | PASS              | PASS          | PASS          | PASS            | PASS            |
| 02_PCOS_Ultrasound     | PARTIAL           | PASS              | PASS          | PARTIAL       | PASS            | PARTIAL         |
| 03_Measles_Viral_Rash  | PASS (Grouped)    | PASS              | PASS          | PASS (Grouped)| PASS            | PASS            |
| 04_Prescription_OCR    | PARTIAL           | PASS              | PASS          | PASS          | PARTIAL         | PARTIAL         |
| 05_Bangla_Voice_AI     | PASS              | PASS              | PASS          | PASS          | PASS            | PASS            |
| 06_DermoPed_Pediatric  | PARTIAL (N=22)    | PASS              | PASS          | PASS (N=22)   | PARTIAL         | PARTIAL         |
+--------------------------------------------------------------------------------------------------------------------+
```

---

## 2. Module-by-Module Audit Breakdown

### Module 01: PCOS Clinical Tabular Machine Learning
- **Overall Verdict:** **`PASS`**
- **Evaluation Breakdown:**
  - *Dataset Quality & Traceability:* **PASS** (88 patient records, 20 clinical features from Mendeley Data `tw34c7hv7z/1`, 100% traceable to raw Excel file).
  - *Model Training & Checkpoints:* **PASS** (XGBoost `model_best.joblib` present, 101 KB, SHA-256 verified).
  - *Metric Integrity & Recalculation:* **PASS** (CV Mean Balanced Accuracy 88.57% ± 8.29%, Held-out Test Accuracy 94.44% on N=18 recalculated exactly).
  - *Leakage & Evaluation Boundaries:* **PASS** (0.0% patient overlap; imputers and scalers fit strictly inside CV folds).
  - *Reproducibility:* **PASS** (`reproduce.ps1` runs end-to-end in ~7 seconds).
- **Clinical Governance Condition:** Must report that test set is $N=18$; clinical utility requires Rotterdam criteria confirmation.

---

### Module 02: PCOS Ultrasound Vision Classification
- **Overall Verdict:** **`PARTIAL` (Pass with Disclosed Limitations)**
- **Evaluation Breakdown:**
  - *Dataset Quality & Traceability:* **PARTIAL** (299 unique images verified, 2 exact duplicates eliminated, but severe imbalance in `Normal` class with only 41 total images).
  - *Model Training & Checkpoints:* **PASS** (ResNet18 `resnet18_best.pth` [44.79 MB] and MobileNetV3 `mobilenetv3_best.pth` [6.22 MB] intact with verified SHA-256 hashes).
  - *Metric Integrity & Recalculation:* **PASS** (15-fold Group CV Mean Accuracy 85.42% ± 4.86%, Test Accuracy 86.67% on N=45 confirmed).
  - *Leakage & Evaluation Boundaries:* **PARTIAL** (0.0% near-duplicate leakage verified across 244 pseudo-patient components; true patient-level independence remains unresolved due to missing hospital IDs in the public source dataset).
  - *Reproducibility:* **PASS** (`reproduce.ps1` verified).
- **Clinical Governance Condition:** Mandatory disclaimer stating that this model classifies image morphology only and cannot autonomously diagnose PCOS without biochemical/clinical confirmation.

---

### Module 03: Measles and Viral Skin Lesions (MCVSLD)
- **Overall Verdict:** **`PASS` (Under Corrected Grouped Split)**
- **Evaluation Breakdown:**
  - *Dataset Quality & Traceability:* **PASS** (10,384 images mapped into 751 source-photo families; cross-split family distribution verified in `MCVSLD_SOURCE_FAMILY_AUDIT.csv`).
  - *Model Training & Checkpoints:* **PASS** (Grouped ResNet18 [44.80 MB] and MobileNetV3 [6.24 MB] present with verified SHA-256 hashes).
  - *Metric Integrity & Recalculation:* **PASS** (Validation Image Accuracy 84.65%, Balanced Accuracy 87.19%, Macro F1 84.22%, Family Accuracy 85.84% recalculated exactly from 1,544 validation predictions).
  - *Leakage & Evaluation Boundaries:* **PASS** (Original 99.10% contaminated split retired and archived as negative evidence; grouped split achieves 0.00% cross-split source-family leakage).
  - *Reproducibility:* **PASS** (`reproduce.ps1` and verification scripts confirmed).
- **Clinical Governance Condition:** ResNet18 is certified as primary demo model; majority-vote ties (3 cases) resolved by mean softmax confidence.

---

### Module 04: Prescription OCR & Entity Extraction
- **Overall Verdict:** **`PARTIAL` (Pass as Draft-Only Baseline with Mandatory Safety Gate)**
- **Evaluation Breakdown:**
  - *Dataset Quality & Traceability:* **PARTIAL** (1,000 images present, 3 corrupted files quarantined; critical gap: dataset contains narrative descriptions but NO ground-truth isolated medication annotations).
  - *Model Training & Checkpoints:* **PASS** (EasyOCR CRAFT+CRNN pipeline verified; single-image demo verified in patch_v1).
  - *Metric Integrity & Recalculation:* **PASS** (Audited test CER: English 96.69%, Bangla 103.34%, heuristic medicine recall 6.96% recalculated exactly).
  - *Leakage & Evaluation Boundaries:* **PASS** (Clean image split; pretraining overlap ruled out).
  - *Reproducibility:* **PARTIAL** (End-to-end pipeline reproducible, but unsupported claims of "100% recall" restricted strictly to demo image `0974.jpeg`).
- **Clinical Governance Condition:** OCR output classified strictly as **Non-Actionable Draft Notes**; 92.11% quarantined by safety gate for mandatory clinician verification; automated prescription generation permanently disabled.

---

### Module 05: Bangla Voice AI Speech Recognition
- **Overall Verdict:** **`PASS` (Bilingual Architecture with Verified Open Bengali Checkpoint)**
- **Evaluation Breakdown:**
  - *Dataset Quality & Traceability:* **PASS** (Google FLEURS 26-clip evaluation corpus verified across 22 distinct sentences and 22 speakers; Common Voice 11.0 training corpus verified).
  - *Model Training & Checkpoints:* **PASS** (OpenAI Whisper-Base verified for English; `anuragshas/whisper-small-bn` verified on GPU for Bengali and cached safely on Drive `G:\hf_cache`).
  - *Metric Integrity & Recalculation:* **PASS** (English WER 5.36%; Bengali baseline 0% Unicode confirmed; Bengali fine-tuned checkpoint 98.37% Unicode, 33.33% smoke-test norm WER, 40.15% extended norm WER recalculated exactly on RTX 5060 Ti).
  - *Leakage & Evaluation Boundaries:* **PASS** (Zero cross-corpus overlap between Common Voice 11.0 training and FLEURS evaluation).
  - *Reproducibility:* **PASS** (`task_03_2/run_benchmark.py` verified).
- **Clinical Governance Condition:** Speech output remains strictly an **Editable Draft Note**; automated EHR writes and medication reminders permanently disabled.

---

### Module 06: DermoPed Pediatric Skin Lesions
- **Overall Verdict:** **`PARTIAL` (Pass for Local Research Subset; Constrained by N=3 Pediculosis Patients)**
- **Evaluation Breakdown:**
  - *Dataset Quality & Traceability:* **PARTIAL** (Local 22-patient / 656-crop subset verified; full ~19 GB Zenodo dataset remains external in Google Colab).
  - *Model Training & Checkpoints:* **PASS** (EXP_B champion `model_best.pth` [44.79 MB] and EXP_D `model_best.pth` [44.78 MB] present with verified SHA-256 hashes).
  - *Metric Integrity & Recalculation:* **PASS** (EXP_B Validation Macro F1 57.76%, Pediculosis recall 15.00%, Test accuracy 92.73% recalculated exactly).
  - *Leakage & Evaluation Boundaries:* **PASS** (Patient-locked split verified with 0.00% patient overlap).
  - *Reproducibility:* **PARTIAL** (Local inference reproducible on RTX 5060 Ti GPU; full-dataset re-training requires Colab environment).
- **Clinical Governance Condition:** Pediculosis class ($n=3$ patients) must be retired or clearly disclosed as preliminary research exploration; no autonomous pediatric diagnostic claims permitted.

---

## 3. Platform Research Readiness Score

| Metric | Score | Interpretation |
| :--- | :---: | :--- |
| **Modules Passing Audit (Full or Partial)** | **6 / 6 (100%)** | Every module possesses real, verified datasets, models, and recalculable metrics. |
| **Modules with Unresolved Critical Failures** | **0 / 6 (0%)** | All previous fatal flaws (Measles variant leakage, Voice 0% Unicode, OCR 100% false claims) resolved. |
| **Overall Platform Research Status** | **`RESEARCH_AUDIT_PASS_WITH_LIMITATIONS`** | Research foundation is sound, verified, and ready for transition to UI development under documented clinical safety boundaries. |
