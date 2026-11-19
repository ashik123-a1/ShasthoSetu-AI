# Model Card: PCOS Clinical Tabular Classifier (Baseline)

## Model Details
- **Developer:** ShasthoSetu AI Research Team
- **Model Architecture:** XGBoost (Scikit-Learn Pipeline)
- **Preprocessing:** Median Imputation + StandardScaler (inside leakage-free CV folds)
- **Dataset Source:** Mendeley Data (`tw34c7hv7z/1`) — Khansa Chaabouni, Universite de Sfax Faculte de Medecine de Sfax
- **License:** Creative Commons Attribution 4.0 International (CC BY 4.0)
- **Intended Use:** Exploratory biomedical feature analysis & machine learning research for PCOS risk factors.
- **Clinical Notice:** RESEARCH ONLY. This model is NOT certified as a medical diagnostic device and must never be used for autonomous clinical diagnosis.

## Evaluation Results (Held-Out Test Set, N=18)
- **Balanced Accuracy:** 94.44%
- **Overall Accuracy:** 94.44%
- **Sensitivity / Recall:** 88.89%
- **Specificity:** 100.00%
- **Macro F1-Score:** 94.12%
- **ROC-AUC:** 98.77%

### Confusion Matrix
| | Pred Control (0) | Pred PCOS (1) |
|---|---|---|
| **True Control (0)** | 9 (TN) | 0 (FP) |
| **True PCOS (1)** | 1 (FN) | 8 (TP) |

## Features Used (20)
age, testosterone, androstenedione, sdhea, waist_circumference, bmi, fsh, lh, prl, homa_ir, e2, oh_prog_17, sbp, dbp, glucose, total_cholesterol, triglycerides, hdl_c, ldl_c, vit_d_25oh

## Limitations & Ethical Considerations
1. Small sample size (N=88) from a single medical center (Sfax, Tunisia).
2. Requires external validation on multi-ethnic cohorts before broader epidemiological generalization.
3. Hormonal levels vary by menstrual cycle phase, age, and metabolic state.
