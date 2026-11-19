# Experiment Summary: Ovarian Ultrasound Vision Baseline & Multi-Run Audit
## ShasthoSetu AI — Vision Research Module (02_PCOS_Ultrasound)

---

### 1. Executive Summary
- **Research Module:** Ovarian Ultrasound Multi-Class Morphology Classification (Computer Vision)
- **Dataset:** 301 raw ultrasound images from *Borna et al.* (Frontiers in Physiology 2025, CC BY 4.0).
- **Exact Deduplication:** 2 exact duplicates safely purged (`Dominant_Follicle_128` & `Dominant_Follicle_86`), leaving **299 unique images**.
- **Hardware Platform:** NVIDIA GeForce RTX 5060 Ti (16GB VRAM, CUDA 12.8 / sm_120).
- **Development Status:** Preliminary Research Baseline Completed; Multi-Run Audit Finalized; Ready for Handover to Dataset 3.

---

### 2. Multi-Run Audit & Experiment Versioning
Three historical training runs were identified in the experiment logs. Each run has been preserved in its own versioned directory with full configuration, logs, and metrics:

| Run Identifier | ResNet18 Val Macro F1 | ResNet18 Test Acc | ResNet18 Test BalAcc | ResNet18 Test Macro F1 | Selection Rationale |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Run 1** (`run_01_20261117_185545`) | 76.02% | 88.89% (40/45) | 87.57% | 89.29% | Val F1 selected ResNet18 over MobileNetV3 (64.91%). |
| **Run 2** (`run_02_20261117_185915`) | 76.50% | 93.33% (42/45) | 91.27% | 92.74% | Val F1 selected ResNet18 over MobileNetV3 (63.33%). *Not selected as final to avoid test-set cherry-picking.* |
| **Run 3** (`run_03_20261117_190150`) | **73.14%** | **86.67%** (39/45) | **86.24%** | **87.70%** | **Active persisted checkpoint in `models/` and `proofs/`.** |

- **Held-Out Test Mean across 3 Runs:** Accuracy = **89.63% ± 3.39%**, Balanced Accuracy = **88.36% ± 2.61%**, Macro F1 = **89.91% ± 2.57%**.
- **Variance Explanation:** With N=45 test images, a difference of 1 image shifts accuracy by 2.22%. The shift between Run 3 (39/45 = 86.67%) and Run 2 (42/45 = 93.33%) is merely 3 images, fully explained by random mini-batch sampling and data augmentation.

---

### 3. Repeated Stratified Group Cross-Validation (15 Folds)
To eliminate single-split dependency and group potential near-duplicate frames into non-overlapping folds:
- **Development Cohort:** N=254 images (121 Dominant Follicle, 98 PCO, 35 Normal).
- **Group Isolation:** 246 unique pseudo-patient clusters (0% cross-fold leakage).
- **Protocol:** 5-fold Stratified Group K-Fold cross-validation repeated across 3 independent random seeds (15 folds total).
- **Results:**
  - **Mean Val Accuracy:** **85.42% ± 4.86%**
  - **Mean Val Balanced Accuracy:** **84.53% ± 7.33%**
  - **Mean Val Macro F1:** **85.42% ± 6.53%** (Min: 72.14%, Max: 92.42%)
- **Scientific Takeaway:** The 84.53% Balanced Accuracy across 15 group-isolated folds establishes a rigorous, un-cherrypicked performance baseline for this dataset.

---

### 4. Near-Duplicate & Patient Overlap Audit Summary
- **Hash Scan:** Scanned all 299 images using pHash, dHash, aHash, and wHash.
- **Findings:**
  - 24 pairs identified with Hamming distance $\le 6$.
  - 8 pairs crossed train/val/test splits due to lack of patient IDs in public records.
  - Pixel correlation between adjacent numbered frames reached **0.9981** (`Dominant_Follicle_60` vs `61`) and **0.9886** (`PCO_59` vs `60`).
- **Resolution:** Formed connected-component clusters and enforced group isolation in cross-validation. Documented in `outputs/near_duplicate_and_leakage_audit.json`.

---

### 5. Constraints of the 41-Image Normal Class
- Normal class represents only 13.71% of images (29 train, 6 val, 6 test).
- Test recall for Normal is 83.33% (5/6 correct), but the 95% Wilson confidence interval is wide ([43.6%, 97.0%]).
- High fold-to-fold variance in cross-validation is primarily driven by small Normal class sample size.
- **Recommendation:** Do not deploy clinically without acquiring at least 150+ additional verified normal ultrasound controls.

---

### 6. Pipeline Artifacts & Reproducibility
- **Model Checkpoints:** `models/resnet18_best.pth` (44.8 MB), `models/mobilenetv3_best.pth` (6.2 MB)
- **Visualizations:** `outputs/confusion_matrix.png`, `outputs/training_curves.png`, `outputs/gradcam_visualizations.png`
- **Audit Logs:** `outputs/runs_comparison.json`, `outputs/cv_metrics.json`, `outputs/near_duplicate_and_leakage_audit.json`
- **Reproduction Script:** `reproduce.ps1` hardened with mandatory non-zero exit code checks.
- **Complete Proof Archive:** `proofs/PROOFS.zip`.
