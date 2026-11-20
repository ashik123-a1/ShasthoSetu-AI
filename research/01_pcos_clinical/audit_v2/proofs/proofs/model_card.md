# Model Card: PCOS Clinical Tabular Classifier (Audit V2 Finalized)

## Model Details
- **Developer:** ShasthoSetu AI Research Team
- **Model Architecture:** XGBoost (Scikit-Learn Pipeline with SimpleImputer + StandardScaler)
- **Dataset Source:** Mendeley Data (`tw34c7hv7z/1`) — Chaabouni et al., Université de Sfax Faculté de Médecine, Tunisia
- **License:** Creative Commons Attribution 4.0 International (CC BY 4.0)
- **Intended Use:** Exploratory statistical analysis of hormonal/metabolic features in polycystic ovary syndrome research.
- **Clinical Notice:** RESEARCH ONLY. This model is NOT certified as a medical diagnostic device and must NEVER be used for autonomous clinical diagnosis or treatment planning.

## Repeated Cross-Validation Protocol (50 Folds, Training Data Only)
> **Cohort Notice:** The 50 validation folds represent 10 random 5-way partitions of the exact same 70 training patients. They quantify split-induced variance but DO NOT represent 50 independent patient cohorts.
- **Mean Balanced Accuracy:** 88.57% (±8.29%)
- **Mean Macro F1:** 88.39% (±8.33%)
- **Mean Sensitivity:** 90.00% (±10.24%)
- **Mean Specificity:** 87.14% (±14.11%)
- **Mean ROC-AUC:** 93.27% (±7.43%)

## Held-Out Test Evaluation (N=18: 9 PCOS, 9 Controls)
- **Overall Accuracy:** 94.44% (17 / 18 correct)
- **Balanced Accuracy:** 94.44%
- **PCOS Precision:** 100.00% (0 False Positives)
- **PCOS Recall / Sensitivity:** 88.89% (8 / 9 detected)
- **Specificity:** 100.00% (9 / 9 healthy controls identified)
- **F1 (Class 0 - Control):** 94.74%
- **F1 (Class 1 - PCOS):** 94.12%
- **Corrected Macro F1:** **94.43%** (Unweighted average: (94.74% + 94.12%) / 2 = 94.43%)
- **ROC-AUC:** 98.77%

### Confusion Matrix
| | Pred Control (0) | Pred PCOS (1) |
| :--- | :---: | :---: |
| **True Control (0)** | 9 (TN) | 0 (FP) |
| **True PCOS (1)** | 1 (FN) | 8 (TP) |

## Feature Importance Audit & Scientific Clarifications
1. **Top Feature by Gain:** `e2` (Gain: 0.3283).
2. **Top Feature by Permutation:** `e2` (Score drop: 0.4408).
3. **Scientific Clarification:**
   - `e2` (Estradiol) is the #1 feature in both Gain and Permutation Importance, followed by `prl`, `sdhea`, `testosterone`, `lh`, and `fsh`.
   - `lh` and `fsh` are individual lab features in the raw dataset; no computed `LH/FSH ratio` column exists in the original data.
   - **Feature importance does NOT prove clinical causality.** A high split gain indicates predictive utility in this decision-tree configuration, not medical causation or biological etiology.

## Limitations & Risks
1. **Small Sample Size:** Total cohort N=88 (Test set N=18). A single misclassification shifts test accuracy by 5.56%.
2. **Single-Center Cohort:** Collected at Sfax University Hospital, Tunisia. Needs validation on diverse multi-ethnic populations.
3. **Cross-Sectional Limitation:** Reflects day-3 menstrual cycle blood draw only; does not capture longitudinal cycle dynamics.
