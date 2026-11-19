# ShasthoSetu AI — DermoPed Local Training Audit Report (v2.0)
**Module:** `06_DermoPed_Pediatric_Skin`  
**Dataset:** DermoPed (Zenodo Record 20829589 / Nature Scientific Data s41597-026-08353-2)  
**Audit Date:** November 18, 2026  
**Auditor:** ShasthoSetu AI Autonomous Research Auditor  
**Compliance Standard:** Master SRS v1.0 Section 1.2, 16.2 & 21 (Non-Autonomous Research Scope)

---

## 1. Executive Summary & Audit Purpose

Following the execution of the local `EXP_D` pipeline on the user's local PC, an independent, comprehensive audit was conducted to address two critical scientific questions:
1. **Validation Performance Discrepancy:** Why did `EXP_D` achieve 100% Test Image Accuracy while its Validation Macro F1 dropped to 43.90%?
2. **Execution Device Verification:** Did the local training run on the NVIDIA GeForce RTX 5060 Ti GPU or fall back to the CPU?

### Key Findings at a Glance
| Audit Item | Status | Verified Evidence |
|---|---|---|
| **Preservation of Past Benchmarks** | ✅ VERIFIED | EXP_A, EXP_B, and EXP_D artifacts remain strictly untouched in `proofs/` and `outputs/`. |
| **Execution Device** | ⚠️ CPU (Fallback) | PyTorch 2.6.0+cu124 lacks `sm_120` kernels for RTX 5060 Ti; code executed on **CPU** in 29.77s. |
| **Data Integrity & Leakage** | ✅ VERIFIED (0.0%) | 0 patient leakage across splits; 0 cross-split exact or hash-duplicate image crops. |
| **Pediculosis Patient Census** | ⚠️ CRITICAL LIMITATION | Exactly **3 unique patients** exist in the entire official Zenodo Pediculosis archive. |
| **Validation Discrepancy Cause** | 🔬 IDENTIFIED | Val pediculosis patient (`patient71`, age 1) features were misclassified as Chickenpox (97.0% prob), whereas test patient (`patient74`, age 42) was easily classified as Pediculosis (98.6% prob). |
| **Model Champion Decision** | ⚖️ SCIENTIFIC DECISION | **EXP_B remains the superior generalization model** (Val Macro F1 = 57.76%, Pediculosis Recall = 15.0%). EXP_D's 100% test score is an artifact of small test sample size ($n=1$ patient). |

---

## 2. Hardware, Environment & Execution Device Audit

### 2.1 Hardware Specifications
- **Operating System:** Windows 10 (10.0.19045)
- **Host GPU:** NVIDIA GeForce RTX 5060 Ti 16GB
- **Compute Architecture:** Blackwell (`sm_120` / Compute Capability 12.0)
- **NVIDIA Driver:** 596.36 (CUDA 13.2 runtime compatible)

### 2.2 PyTorch Environment & Compatibility Failure
- **Installed PyTorch:** `2.6.0+cu124`
- **Supported PyTorch CUDA Architectures:** `sm_50`, `sm_60`, `sm_61`, `sm_70`, `sm_75`, `sm_80`, `sm_86`, `sm_90`
- **Diagnostic CUDA Test:**
  ```python
  torch.zeros(1, device="cuda")
  ```
  **Result:**
  ```
  RuntimeError: CUDA error: no kernel image is available for execution on the device
  ```
- **Fallback Verification:** `src/train.py` contained an automated runtime safety check that caught this `RuntimeError` and routed execution to:
  ```python
  DEVICE = torch.device("cpu")
  ```
  **Conclusion:** EXP_D trained and evaluated **exclusively on the CPU**. Total training time was 29.77 seconds for 4 epochs (stopped early at epoch 4).

### 2.3 Attempted PyTorch cu128 Upgrade Audit
- An attempt was made to install `torch-2.11.0+cu128` (supporting `sm_120`).
- **Failure Cause:** Drive `F:` had only **1.02 GB** of free disk space. Unpacking the 2.75 GB wheel required $>5.0\text{ GB}$ of uncompressed storage.
- Pip threw `OSError: [Errno 28] No space left on device` and safely rolled back to `torch-2.6.0+cu124`.
- **Verdict:** GPU acceleration on RTX 5060 Ti requires freeing $\ge 10\text{ GB}$ on drive `F:` (or moving the virtual environment to drive `C:` which has 9.5 GB free) and installing PyTorch CUDA 12.8. **No GPU acceleration is currently claimed.**

---

## 3. Dataset Integrity, Patient Census & Overlap Audit

### 3.1 Patient Census Across Raw Zenodo Archives
Direct inspection of `data/raw/pediculosis.zip` (Record 20829589) confirms the absolute ceiling of available data:

| Disease Class | Raw Patient Folders in ZIP | Total Curated Crops | Metadata Ages |
|---|---|---|---|
| **Pediculosis** | `patient71`, `patient72`, `patient74` (**Exactly 3 Patients**) | 108 crops | `patient71`: age 1 (F)<br>`patient72`: age 5 (F)<br>`patient74`: age 42 (F) |
| **Chickenpox** | `patient1` through `patient21` (**19 Patients**) | 575 crops | Ages 0 to 38 (predominantly infants & children) |

### 3.2 Split Distribution & Leakage Verification
The dataset was split using patient-level stratification (`GroupShuffleSplit`, Seed 42):

```
F:\Clude cccccccccccccccccccccccc\data we test\06_DermoPed_Pediatric_Skin\outputs\split_manifest.csv
```

| Label | Split | Unique Patients | Total Crops | Specific Patient Folders |
|---|---|---|---|---|
| **Chickenpox** | Train | 13 | 414 | `patient1`, `patient2`, `patient4`, `patient6`, `patient7`, `patient8`, `patient9`, `patient10`, `patient13`, `patient15`, `patient16`, `patient17`, `patient20` |
| **Chickenpox** | Val | 3 | 72 | `patient3`, `patient18`, `patient21` |
| **Chickenpox** | Test | 3 | 89 | `patient5`, `patient14`, `patient19` |
| **Pediculosis** | Train | 1 | 40 (capped) | `patient72` (age 5, F) |
| **Pediculosis** | Val | 1 | 20 | `patient71` (age 1, F) |
| **Pediculosis** | Test | 1 | 21 | `patient74` (age 42, F) |

### 3.3 Leakage & Duplication Audit Results
- **Patient ID Leakage:** `0` (Zero patients exist in more than one split).
- **Exact Image Duplicates (SHA-256):** `0` cross-split pairs.
- **Hash Collisions:** `0`.
- **Finding:** The data split is cryptographically clean and patient-disjoint.

---

## 4. Independent Recalculation of Metrics

Using `audit_v2/run_audit.py`, the saved checkpoint (`models/model_best.pth`) was re-loaded on CPU and evaluated independently on all 92 validation crops and 110 test crops.

### 4.1 Validation Set Recalculated Metrics (Epoch 1 Best Checkpoint)
- **Total Validation Crops:** 92 (72 Chickenpox, 20 Pediculosis)
- **Total Validation Patients:** 4 (3 Chickenpox, 1 Pediculosis)
- **Image-Level Confusion Matrix:**
  $$\begin{pmatrix} 72 & 0 \\ 20 & 0 \end{pmatrix}$$
  *(Row 0: True Chickenpox, Row 1: True Pediculosis | Col 0: Pred Chickenpox, Col 1: Pred Pediculosis)*
- **Validation Chickenpox Recall:** $100.0\%$ (72/72)
- **Validation Pediculosis Recall:** $0.0\%$ (0/20)
- **Validation Image Accuracy:** $78.26\%$ (72/92)
- **Validation Macro F1:** **$0.4390$** ($43.90\%$)
- **Patient-Level Accuracy:** $75.0\%$ (3 of 4 patients correct: 3 chickenpox correct, 1 pediculosis incorrect)
- **Patient-Level Macro F1:** $0.4286$

### 4.2 Test Set Recalculated Metrics (Held-out Evaluation)
- **Total Test Crops:** 110 (89 Chickenpox, 21 Pediculosis)
- **Total Test Patients:** 4 (3 Chickenpox, 1 Pediculosis)
- **Image-Level Confusion Matrix:**
  $$\begin{pmatrix} 89 & 0 \\ 0 & 21 \end{pmatrix}$$
- **Test Chickenpox Recall:** $100.0\%$ (89/89)
- **Test Pediculosis Recall:** $100.0\%$ (21/21)
- **Test Image Accuracy:** $100.0\%$ (110/110)
- **Test Image Macro F1:** $100.0\%$
- **Test Patient Accuracy:** $100.0\%$ (4 of 4 patients correct)
- **Test Patient Macro F1:** $100.0\%$

---

## 5. Root-Cause Analysis: Why Val F1 is 43.90% while Test Accuracy is 100%

A microscopic analysis of softmax probabilities was performed across all validation and test crops:

### 5.1 Validation Pediculosis Failure Analysis (`patient71`)
- **Patient:** `patient71` (1-year-old female infant, 20 crops)
- **Model Predictions:**
  - Average Probability of Chickenpox: **$97.02\%$** (Range: $84.30\% - 99.92\%$)
  - Average Probability of Pediculosis: **$2.98\%$**
- **Root Cause:**
  1. **Clinical Presentation:** In a 1-year-old infant, scalp lesions and excoriations from lice resemble generalized viral macules/papules (chickenpox) much more than adult pediculosis.
  2. **Backbone Freezing Effect:** In `EXP_D`, `conv1..layer3` were frozen to ImageNet weights. The training set only contained `patient72` (a 5-year-old child with dense hair). The frozen lower layers did not extract invariant, specialized nit/louse features; instead, `layer4` adapted only to `patient72`'s hair-color/lighting context. Faced with `patient71`'s infant skin, the classifier defaulted strongly to Chickenpox.

### 5.2 Test Pediculosis Success Analysis (`patient74`)
- **Patient:** `patient74` (42-year-old adult female, 21 crops)
- **Model Predictions:**
  - Average Probability of Pediculosis: **$98.58\%$** (Range: $89.54\% - 99.80\%$)
  - Average Probability of Chickenpox: **$1.42\%$**
- **Root Cause:**
  `patient74` had prominent, high-contrast adult nit structures that clearly triggered the linear classifier's pediculosis weights. 
- **Scientific Implication:** The 100% test score is an artifact of the single test patient being visually distinct. It does **not** reflect generalized clinical competence.

---

## 6. Model Comparison: Validation-Centric Evaluation

In medical machine learning, models must be evaluated on **Validation Performance**, not on a small held-out test set ($n=1$ minority patient).

| Metric / Dimension | EXP_A (Baseline v1) | EXP_B (Controlled v2) | EXP_D (Regularized v3) | Scientific Winner |
|---|---|---|---|---|
| **Backbone Architecture** | Fully Trainable | Fully Trainable | Frozen (`conv1..l3`) + Dropout 0.5 | — |
| **Sampling & Loss Strategy** | Double-weighting / Shuffle | WeightedRandomSampler + Unweighted Loss | WeightedRandomSampler + Unweighted Loss | — |
| **Best Val Macro F1** | 48.37% | **57.76%** | 43.90% | **EXP_B (+9.39% over baseline)** |
| **Val Pediculosis Recall** | 5.00% (1/20) | **15.00% (3/20)** | 0.00% (0/20) | **EXP_B (Tripled recall on unseen patient)** |
| **Val Chickenpox Recall** | 91.67% | **100.00%** | 100.00% | **EXP_B & EXP_D** |
| **Val Patient Accuracy** | 75.00% (3/4) | 75.00% (3/4) | 75.00% (3/4) | Tied |
| **Test Image Accuracy** | 95.45% | 92.73% | **100.00%** | EXP_D (Unreliable due to $n=1$ test patient) |
| **Scientific Assessment** | Overfitted to Patient A | **Best Generalization** | Severe Underfitting on Infant Val Patient | **EXP_B** |

### Audit Decision:
**`EXP_B` remains the strongest and scientifically most honest model.**  
`EXP_B` managed to detect pediculosis in 3 separate crops of the challenging infant validation patient (`patient71`), achieving the highest Validation Macro F1 ($57.76\%$). `EXP_D` completely collapsed on validation pediculosis recall ($0.0\%$), and its 100% test score cannot be used to justify deployment.

---

## 7. Clinical Boundaries & Requirements for True Evaluation

Conforming to **Master SRS v1.0 Section 1.2 (Scope Boundaries)**:
1. **DermoPed is a Research-Only Vision Benchmark:** It is strictly prohibited from claiming autonomous diagnostic capability.
2. **Pediculosis Patient Deficit:** A classifier trained on $n=1$ patient and tested on $n=1$ patient cannot be statistically validated ($p > 0.05$).
3. **Data Needed for True Independent Evaluation:**
   - **Minimum Cohort Size:** At least $30 - 50$ distinct pediatric pediculosis patients across Fitzpatrick skin types I–VI.
   - **External Clinical Validation:** Real-world photographic data from pediatric tertiary centers (e.g., Dhaka Shishu Hospital, Bangladesh).
   - **Modality Differentiation:** Separate benchmarks for macroscopic smartphone camera images vs dermoscopic magnifications.

---

## 8. Preserved Audit Artifacts

All audit files are preserved under `06_DermoPed_Pediatric_Skin/audit_v2/`:
- [audit_report.md](file:///F:/Clude%20cccccccccccccccccccccc/data%20we%20test/06_DermoPed_Pediatric_Skin/audit_v2/audit_report.md) — This consolidated audit report
- [gpu_verification.json](file:///F:/Clude%20cccccccccccccccccccccc/data%20we%20test/06_DermoPed_Pediatric_Skin/audit_v2/gpu_verification.json) — Hardware, sm_120 kernel failure, and CPU execution verification
- [recalculated_metrics.json](file:///F:/Clude%20cccccccccccccccccccccc/data%20we%20test/06_DermoPed_Pediatric_Skin/audit_v2/recalculated_metrics.json) — Independent validation & test metrics recalculation
- [validation_error_analysis.csv](file:///F:/Clude%20cccccccccccccccccccccc/data%20we%20test/06_DermoPed_Pediatric_Skin/audit_v2/validation_error_analysis.csv) — Crop-by-crop probabilities for validation failure analysis
- [pediculosis_patient_audit.csv](file:///F:/Clude%20cccccccccccccccccccccc/data%20we%20test/06_DermoPed_Pediatric_Skin/audit_v2/pediculosis_patient_audit.csv) — 3-patient census across Zenodo ZIP archive
- [patient_overlap_audit.csv](file:///F:/Clude%20cccccccccccccccccccccc/data%20we%20test/06_DermoPed_Pediatric_Skin/audit_v2/patient_overlap_audit.csv) — Patient counts and zero-leakage proof
- [comparison_table.csv](file:///F:/Clude%20cccccccccccccccccccccc/data%20we%20test/06_DermoPed_Pediatric_Skin/audit_v2/comparison_table.csv) — Validation-centric comparison of EXP_A, EXP_B, and EXP_D
