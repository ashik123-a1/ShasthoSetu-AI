# Experiment Summary: PCOS Clinical Tabular ML (Audit V2 Finalized)

## Overview
- **Audit Version:** 2.1 (Fully synchronized numbers and complete reproducibility package)
- **Sample Distribution:** 88 Total (Train: 70, Held-Out Test: 18)
- **Target:** Rotterdam PCOS diagnosis (45 cases, 43 matched controls)
- **Best Model Selected:** XGBoost

## Key Audit Corrections Applied:
1. **Macro-F1 Fixed:** Test Macro-F1 accurately verified at **`0.9443`** (94.43%), representing the exact unweighted mean of Class 0 F1 (0.9474) and Class 1 F1 (0.9412).
2. **Feature Importance Synchronized:** Accurately reported `e2` (Estradiol) as the #1 predictive feature across all files: Gain = `0.3283`, Permutation drop = `0.4408`.
3. **Feature Naming Clarified:** Clarified that `lh` and `fsh` are separate raw features, not an explicit ratio.
4. **Validation Hardened:** Implemented 10-repeat 5-fold Stratified Cross-Validation (50 folds total) on training data only. Preprocessing is strictly fitted inside folds.
   - *Note on Repeated CV:* The 50 folds reuse the same 70 training patients across 10 random partitions; they quantify split-induced variance but do not represent 50 independent patient cohorts.
5. **Leakage & Duplicates Audited:** Verified 0 duplicate rows and detailed target creation provenance.

## Performance Comparison (Held-Out Test Set, N=18)
| Model | Balanced Acc | Macro F1 (Corrected) | Precision | Sensitivity | Specificity | ROC-AUC |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Logistic_Regression | 0.7778 | 0.7778 | 0.7778 | 0.7778 | 0.7778 | 0.9012 |
| Random_Forest | 0.9444 | 0.9443 | 0.9000 | 1.0000 | 0.8889 | 0.9877 |
| XGBoost | 0.9444 | 0.9443 | 1.0000 | 0.8889 | 1.0000 | 0.9877 |

## Top Predictive Features (XGBoost Gain Importance)
- **`e2`**: 0.3283
- **`lh`**: 0.0865
- **`prl`**: 0.0722
- **`hdl_c`**: 0.0655
- **`sbp`**: 0.0616

## Proof & Reproducibility Package Contents (PROOFS.zip)
- Model Checkpoint: `models/model_best.joblib`
- Training Code: `src/train_audit.py`
- Audit Script: `src/leakage_and_data_audit.py`
- Reproduction Script: `reproduce.ps1`
- Dependency Lockfile: `outputs/requirements.lock`
- Metrics: `outputs/metrics.json`
- Leakage Audit: `proofs/leakage_audit_report.md`
- Visualizations: `outputs/cv_model_comparison.png`, `outputs/confusion_matrix.png`, `outputs/feature_importance_gain.png`, `outputs/permutation_importance.png`
