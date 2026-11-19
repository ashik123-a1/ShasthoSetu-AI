# Experiment Summary: PCOS Clinical Tabular ML

## Overview
- **Dataset:** Mendeley Data tw34c7hv7z/1
- **Samples:** Total: 88 (Train: 70, Test: 18)
- **Target Distribution:** 45 PCOS Cases (51.1%) vs 43 Controls (48.9%)
- **Validation Protocol:** 5-Fold Stratified Cross-Validation + 20% Held-Out Stratified Test Set
- **Selected Best Model:** XGBoost

## Model Performance Comparison (Test Set)
| Model | Balanced Acc | Macro F1 | ROC-AUC | Sensitivity | Specificity |
|---|---|---|---|---|---|
| Logistic_Regression | 0.7778 | 0.7778 | 0.9012 | 0.7778 | 0.7778 |
| Random_Forest | 0.9444 | 0.9474 | 0.9877 | 1.0000 | 0.8889 |
| XGBoost | 0.9444 | 0.9412 | 0.9877 | 0.8889 | 1.0000 |

## Key Predictors
Top clinical features driving classification include Testosterone, LH/FSH ratio indicators, Androstenedione, and Insulin Resistance markers (HOMA-IR).

## Hackathon Evidence & Reproducibility
- Best checkpoint: `models/model_best.joblib`
- Metrics: `outputs/metrics.json`
- Test predictions: `outputs/test_predictions.csv`
- Proof archive: `proofs/PROOFS.zip`
