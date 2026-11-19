# ShasthoSetu AI — Final Evidence Audit Report V3
**Module:** `06_DermoPed_Pediatric_Skin`  
**Dataset:** DermoPed (Zenodo Record 20829589)  
**Lead Auditor:** Senior ML Research Auditor & MLOps Engineer  
**Date of Audit:** November 18, 2026  
**Compliance Standard:** ShasthoSetu AI Master SRS v1.0 Section 1.2, 16.2 & 21  

---

## 1. Executive Summary & Audit Mandate

This Final Evidence Audit (Audit V3) resolves all remaining scientific, infrastructural, and documentation inconsistencies across the three historical DermoPed experiments:
- **EXP_A:** Baseline v1 (Weighted Loss / Random Shuffle on Tesla T4)
- **EXP_B:** Controlled v2 (WeightedRandomSampler / Unweighted Loss on Tesla T4)
- **EXP_D:** Regularized v3 (Frozen Backbone / Dropout 0.5 on Local PC)

### Audit Resolutions at a Glance
| Audit Objective | Resolution & Empirical Finding |
|---|---|
| **1. Patient Split Inconsistency** | **RESOLVED:** Confirmed as a pure typographical transcription error in the Audit V2 narrative report. The underlying `split_manifest.csv`, model checkpoints, and prediction CSVs are 100% consistent with each other. Corrected table generated directly from manifest. |
| **2. Historical Metrics Recalculation** | **RESOLVED:** Independent forward-pass re-evaluation of all three genuine `.pth` checkpoints confirmed that all 3 models evaluated on the **exact same validation set (92 crops)** and **exact same test set (110 crops)**. EXP_A Val Chickenpox recall corrected from 91.67% to **98.61%**. |
| **3. Model Champion Selection** | **CONFIRMED:** **EXP_B is the genuine scientific champion** (Val Macro F1 = 57.76%, Pediculosis Recall = 15.00%). EXP_D underperformed in validation (Val Macro F1 = 43.90%, Pediculosis Recall = 0.00%). EXP_D's 100% test score is an artifact of the single test patient being visually distinct. |
| **4. GPU Environment & Execution** | **RESOLVED & VERIFIED:** EXP_D ran on CPU due to PyTorch 2.6 cu124 missing `sm_120` kernels. The working **PyTorch 2.11.0+cu128** environment was located in `_shared/venv`, tested, and **100% verified on the host RTX 5060 Ti GPU (226.42 ms latency)** with 0 MB additional disk overhead. |
| **5. Clinical Dataset Limitations** | **CONFIRMED:** The official Zenodo archive contains **only 3 pediculosis patients** ($n=3$). No generalizable clinical claim can be made on $n=3$. |
| **6. Future Research Strategy** | **FORMULATED:** Retire Pediculosis; transition to **Chickenpox vs Morbilliform Exanthema (Measles, 329 MB)** under 5-Fold Patient-Stratified Cross-Validation on the RTX 5060 Ti. |

---

## 2. Forensic Audit of Patient Splits & Set Membership

### 2.1 The Typographical Discrepancy
The narrative Markdown table in Audit V2 mistakenly transcribed:
- Val Chickenpox: `patient3`, `patient18`, `patient21` *(Typo: patient21 is actually in train)*
- Test Chickenpox: `patient5`, `patient14`, `patient19` *(Typo: patient14 & patient19 are in train)*

### 2.2 Verified Ground-Truth Split Membership
Extracted dynamically from `outputs/split_manifest.csv` and cross-verified against `models/model_best.pth`:

- **Training Set (14 Patients, 454 Crops):**
  - **Chickenpox (13 Patients, 414 Crops):** `patient1`, `patient4`, `patient6`, `patient7`, `patient9`, `patient10`, `patient13`, `patient14`, `patient15`, `patient16`, `patient17`, `patient19`, `patient21`
  - **Pediculosis (1 Patient, 40 Crops Capped):** `patient72` (5-year-old child)
- **Validation Set (4 Patients, 92 Crops):**
  - **Chickenpox (3 Patients, 72 Crops):** `patient3` (age 2), `patient18` (age 2), `patient20` (age 3)
  - **Pediculosis (1 Patient, 20 Crops):** `patient71` (1-year-old infant)
- **Held-out Test Set (4 Patients, 110 Crops):**
  - **Chickenpox (3 Patients, 89 Crops):** `patient2` (age 15), `patient5` (age 38, adult), `patient8` (age 1)
  - **Pediculosis (1 Patient, 21 Crops):** `patient74` (age 42, adult)

Exported without hardcoding to: [corrected_patient_splits.csv](file:///F:/Clude%20cccccccccccccccccccccc/data%20we%20test/06_DermoPed_Pediatric_Skin/audit_v3/corrected_patient_splits.csv).

---

## 3. Independent Recalculation & Comparability of EXP_A, EXP_B, and EXP_D

### 3.1 Checkpoint Cryptographic Provenance
All three checkpoints were verified on disk via SHA-256:
- **EXP_A:** `23caecfe90dfa1fe9844c57700e4c5b3648439df67d1bb3eefecfa9b244d2843`
- **EXP_B:** `d17df6ffcfbe41bb4ae9cfb7e6515b22b2aa0579e0a0dca0f0745582f3c78cb9`
- **EXP_D:** `6425a77f0a8277983637e6da48ba95d46ecf720072b22ec674b88f6b864a66e4`

### 3.2 Independently Verified Performance Matrix
Every number below was recalculated by executing forward passes using the saved PyTorch checkpoints on the exact same 92 validation crops and 110 test crops:

| Dimension / Metric | EXP_A (Baseline v1) | EXP_B (Controlled v2) | EXP_D (Regularized v3) | Certified Best Model |
|---|---|---|---|---|
| **Backbone Configuration** | Fully Trainable | Fully Trainable | Frozen (`conv1..l3`) + Dropout 0.5 | — |
| **Loss & Sampling** | Double-weighting / Shuffle | WeightedRandomSampler + Unweighted CrossEntropy | WeightedRandomSampler + Unweighted CrossEntropy | — |
| **Validation Crops** | 92 crops (4 patients) | 92 crops (4 patients) | 92 crops (4 patients) | Identical Split |
| **Validation Confusion Matrix** | $\begin{pmatrix} 71 & 1 \\ 19 & 1 \end{pmatrix}$ | $\begin{pmatrix} 72 & 0 \\ 17 & 3 \end{pmatrix}$ | $\begin{pmatrix} 72 & 0 \\ 20 & 0 \end{pmatrix}$ | — |
| **Val Macro F1** | 48.37% | **57.76%** | 43.90% | **EXP_B (+9.39% over baseline)** |
| **Val Pediculosis Recall** | 5.00% (1/20) | **15.00% (3/20)** | 0.00% (0/20) | **EXP_B (Highest minority recall)** |
| **Val Chickenpox Recall** | 98.61% (71/72) | 100.00% (72/72) | 100.00% (72/72) | EXP_B & EXP_D |
| **Val Accuracy** | 78.26% | **81.52%** | 78.26% | **EXP_B** |
| **Test Image Accuracy** | 95.45% (105/110) | 92.73% (102/110) | 100.00% (110/110) | EXP_D (Artifact of $n=1$ test pt) |
| **Test Patient Accuracy** | 75.00% (3/4) | 75.00% (3/4) | 100.00% (4/4) | EXP_D (Artifact of $n=1$ test pt) |
| **Execution Hardware** | Colab T4 GPU | Colab T4 GPU | Local PC CPU (RTX 5060 Ti fallback) | — |
| **Generalization Decision** | Overfitted | **Champion (Best Generalization)** | Underfitted on Unseen Val Infant | **EXP_B** |

### 3.3 Are the Experiments Genuinely Comparable?
> **YES.** Because all three experiments used the exact same random seed (42), the exact same patient-disjoint stratification, and evaluated on the exact same 92 validation crops and 110 test crops, **they are 100% directly comparable**.  
> Evaluating them by **Validation Performance** unequivocally crowns **EXP_B** as the most capable model.

---

## 4. GPU Environment & Host Storage Audit

### 4.1 Resolution of the GPU Fallback
- Local `EXP_D` ran on CPU because `06_DermoPed_Pediatric_Skin/venv` had PyTorch `2.6.0+cu124`, which does not contain compiled kernels for the RTX 5060 Ti's Blackwell architecture (`sm_120`).
- An attempted upgrade to `cu128` failed because Drive `F:` had only **0.90 GB** free space.

### 4.2 Reusable Compatible Environment Located
As noted in the audit mandate, the existing PCOS Ultrasound pipeline was already configured with a fully compatible CUDA environment at:
```
F:\Clude cccccccccccccccccccccccc\data we test\_shared\venv\Scripts\python.exe
```
**Empirical Verification:**
- PyTorch Version: **`2.11.0+cu128`**
- CUDA Version: **12.8**
- Compiled Architectures: `['sm_75', 'sm_80', 'sm_86', 'sm_90', 'sm_100', 'sm_120']`
- **Genuine Convolution Test:** Executed full forward + backward pass with `ResNet18` on `cuda:0` in **226.42 ms**.
- **Storage Impact:** **0 MB additional storage required.**

### 4.3 Drive Storage Audit
| Drive | Total Storage | Free Storage | Recommended Action |
|---|---|---|---|
| **C:** | 190.83 GB | 9.53 GB | Keep as OS buffer |
| **D:** | 465.76 GB | 5.26 GB | Untouched |
| **E:** | 153.34 GB | 1.58 GB | Untouched |
| **F:** | 309.22 GB | **0.90 GB** | **Do not install duplicate venvs; reuse `_shared/venv`** |
| **G:** | 757.00 GB | 12.57 GB | Available for future archive storage |

Full report saved at: [gpu_environment_report.json](file:///F:/Clude%20cccccccccccccccccccccc/data%20we%20test/06_DermoPed_Pediatric_Skin/audit_v3/gpu_environment_report.json).

---

## 5. Next Research Strategy & Hackathon Presentation Readiness

### 5.1 Scientific Readiness for Hackathon
The evidence package in `06_DermoPed_Pediatric_Skin` is **100% ready for an honest, transparent, high-impact hackathon presentation**:
1. **Zero Fake Claims:** You do not claim 100% clinical diagnostic accuracy; instead, you demonstrate deep scientific maturity by pointing out the $n=3$ Pediculosis sample-size bottleneck.
2. **Transparent Generalization Analysis:** You show why EXP_B is your chosen model based on validation generalization (Val F1 57.76%, Pediculosis recall 15%), demonstrating that you understand medical machine learning better than teams that blindly chase test accuracy.
3. **Reproducible Proofs:** Every graph, confusion matrix, and prediction is backed by verified CSV files and reproducible scripts.

### 5.2 Next Experiment Plan: Tier 2 Exanthem Differential
- Download `morbilliform_exanthema.zip` (only 329.67 MB, fits easily on disk).
- Train a **Chickenpox vs Morbilliform (Measles)** differential classifier using `_shared/venv` natively on the RTX 5060 Ti GPU.
- Use **5-Fold Patient-Stratified Cross-Validation** to eliminate single-patient artifacts.

---

## 6. Audit V3 Deliverables Index

All files are permanently archived under `06_DermoPed_Pediatric_Skin/audit_v3/`:
- [FINAL_AUDIT_REPORT.md](file:///F:/Clude%20cccccccccccccccccccccc/data%20we%20test/06_DermoPed_Pediatric_Skin/audit_v3/FINAL_AUDIT_REPORT.md) — This master audit synthesis
- [corrected_patient_splits.csv](file:///F:/Clude%20cccccccccccccccccccccc/data%20we%20test/06_DermoPed_Pediatric_Skin/audit_v3/corrected_patient_splits.csv) — Dynamically verified split manifest
- [model_comparison_verified.csv](file:///F:/Clude%20cccccccccccccccccccccc/data%20we%20test/06_DermoPed_Pediatric_Skin/audit_v3/model_comparison_verified.csv) — Empirical comparison matrix of EXP_A, EXP_B, EXP_D
- [metric_recalculation.json](file:///F:/Clude%20cccccccccccccccccccccc/data%20we%20test/06_DermoPed_Pediatric_Skin/audit_v3/metric_recalculation.json) — Cryptographic hashes & recalculated metrics
- [gpu_environment_report.json](file:///F:/Clude%20cccccccccccccccccccccc/data%20we%20test/06_DermoPed_Pediatric_Skin/audit_v3/gpu_environment_report.json) — RTX 5060 Ti sm_120 verification & storage audit
- [patient_diversity_report.csv](file:///F:/Clude%20cccccccccccccccccccccc/data%20we%20test/06_DermoPed_Pediatric_Skin/audit_v3/patient_diversity_report.csv) — Demographics, ages, and pediatric breakdown
- [dataset_class_selection.md](file:///F:/Clude%20cccccccccccccccccccccc/data%20we%20test/06_DermoPed_Pediatric_Skin/audit_v3/dataset_class_selection.md) — 9-class Zenodo catalog & viability analysis
- [evidence_integrity_report.md](file:///F:/Clude%20cccccccccccccccccccccc/data%20we%20test/06_DermoPed_Pediatric_Skin/audit_v3/evidence_integrity_report.md) — Root-cause analysis of the transcription discrepancy
- [NEXT_EXPERIMENT_PLAN.md](file:///F:/Clude%20cccccccccccccccccccccc/data%20we%20test/06_DermoPed_Pediatric_Skin/audit_v3/NEXT_EXPERIMENT_PLAN.md) — Roadmap for Tier 2 Measles differential benchmarking
