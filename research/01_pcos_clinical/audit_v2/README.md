# 01_PCOS_Clinical (Audit V2) — ShasthoSetu AI

Audited and hardened clinical tabular machine learning experiment on hormonal and biochemical markers for Polycystic Ovary Syndrome (PCOS).

## Audit V2 Enhancements
1. **Corrected Macro-F1 Calculation:** Fixed unweighted Macro-F1 across both classes (94.43% for XGBoost and Random Forest on held-out test set).
2. **Corrected Feature Importance Reporting:** Accurately identifies `e2` (Estradiol) as the #1 predictive feature by both split Gain (0.3283) and Permutation drop (0.4408).
3. **Repeated Stratified Cross-Validation:** Implemented 10-repeat 5-fold CV (50 total validation folds) on training data only to eliminate single-split variance. Preprocessing is strictly encapsulated within sklearn pipelines.
4. **Data Integrity & Leakage Audit:** Verified 0 duplicate patient rows, confirmed cross-sectional patient independence, and documented Pearson correlations (max |r| = 0.6455).
5. **Clear Scientific Disclaimers:** Explicitly disclaims medical diagnostic validity and clarifies that statistical feature importance does not establish biological causality.

## Execution
```powershell
.\reproduce.ps1
```
