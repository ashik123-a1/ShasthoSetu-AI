# ShasthoSetu AI — PCOS Ultrasound Evaluation & Leakage Audit Report
**Audited Modality:** `02_PCOS_Ultrasound`  
**Dataset:** Ovarian Ultrasound Dataset (Frontiers in Endocrinology 2025 / GitHub `HananSaadat`, MIT License)  
**Lead Auditor:** Senior ML Research Auditor & MLOps Engineer  
**Date:** 2026-11-18  

---

## 1. Summary of Verified Evaluation Benchmarks

| Evaluation Protocol | Status | Balanced Accuracy | Macro F1 | Clinical Validity |
| :--- | :---: | :---: | :---: | :--- |
| **15-Fold Repeated Stratified Group CV** | **Certified Primary Benchmark** | **84.53% ± 7.33%** | **85.42% ± 6.53%** | **Supported** (Zero sweep leakage) |
| **Historical Held-Out Test (N=45)** | **Potentially Contaminated Baseline** | **86.24%** (Acc: 86.67%) | **87.70%** | **Caveat:** 8 near-duplicate pairs crossed splits |

*Independent Re-computation Confirmation:* An independent recalculation from the 15 CSV fold logs confirmed the exact mean Balanced Accuracy of **84.53%** and Macro F1 of **85.42%**.

---

## 2. Near-Duplicate Frame Burst Discovery & Cross-Split Contamination

A perceptual hashing audit (`pHash` with Hamming distance $\le 6$) identified **24 near-duplicate image pairs** across the 299 ultrasound images:
- **Cine-Loop Video Bursts:** Transvaginal/transabdominal ultrasound probes capture continuous video sweeps. Adjacent frames within a sweep exhibit near-identical pixel content (e.g. `Dominant_Follicle_60` vs `Dominant_Follicle_61` pixel correlation = **0.9981**; `PCO_59` vs `PCO_60` correlation = **0.9886**).
- **Split Leakage in Historical Test Set:** In the original random split, **8 near-duplicate pairs crossed between splits**:
  - `PCO_60.jpg` in Train $\leftrightarrow$ `PCO_59.jpg` in Test (correlation = 0.9886)
  - `Dominant_Follicle_60.jpg` in Train $\leftrightarrow$ `Dominant_Follicle_61.jpg` in Test (correlation = 0.9981)
  - At least 5 test images had near-identical sister frames in Train.
- **Formal Classification:** The old 86.67% test accuracy is officially reclassified as:
  `POTENTIALLY_CONTAMINATED_HELD_OUT_TEST (86.67%)`

---

## 3. Critical Clarifications on Grouping & Checkpoints

1. **Pseudo-Patient Grouping $\neq$ Verified Real Patient IDs:**
   - Because the public ultrasound dataset provided only class-labeled images without patient ID metadata, groups were constructed algorithmically using perceptual hash distance ($\text{pHash} \le 6$) and sequential filename clustering.
   - While this prevents identical cine-loop sweeps from leaking across folds, **it does not represent verified independent hospital patient cohorts**. External patient-level clinical validation remains mandatory.
2. **Normal Class Imbalance:**
   - The Normal class consists of only **41 total images** (compared to 142 Dominant Follicle and 116 PCO).
   - In the held-out test set, there are only 6 Normal images (Wilson 95% Confidence Interval: [43.6%, 97.0%]).
3. **Run 1 and Run 2 Checkpoint Status:**
   - In `02_PCOS_Ultrasound/runs/`, three separate training runs were documented with full `run_info.json` and logs:
     - Run 1 (Test Acc 88.89%, F1 89.29%)
     - Run 2 (Test Acc 93.33%, F1 92.74%)
     - Run 3 (Test Acc 86.67%, F1 87.70%)
   - **Active Persisted Weights:** Run 3 is the active model checkpoint persisted on disk at `models/resnet18_best.pth` (selected based strictly on validation macro F1 of 73.14%).
   - Separate binary `.pth` weights for Runs 1 and 2 were overwritten during active development and are not included in the archive. Post-hoc selection of Run 2's 93.33% score was explicitly rejected to maintain scientific rigor.
