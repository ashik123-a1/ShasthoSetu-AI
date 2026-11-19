# Data Integrity & Leakage Audit Report: PCOS Clinical

## 1. Dataset Overview & Patient Independence
- **Dataset Source:** Mendeley Data `tw34c7hv7z/1` (Chaabouni et al., 2022)
- **Study Type:** Cross-sectional case-control clinical study (Université de Sfax, Tunisia).
- **Patient Independence:** Verified. Each row corresponds to a single, distinct patient recruited at the hospital of Sfax-Tunisia. No multiple timepoints, repeat visits, or longitudinal patient records are present.
- **Total Records:** 88 patients
- **Class Breakdown:**
  - PCOS Cases: 45 (51.1%)
  - Matched Controls: 43 (48.9%)

## 2. Duplicate Audit
- **Exact Duplicate Rows:** 0 (None found)
- **Feature-Only Duplicate Rows:** 0 (None found)
- **Finding:** No duplicate patient records or duplicate row leakage exists.

## 3. Target Leakage Assessment
Correlation between each clinical feature and the target variable (`target_pcos`):

| Feature | Pearson Correlation (r) | Leakage Assessment |
| :--- | :---: | :--- |
| `e2` | 0.6455 | Moderate association |
| `prl` | -0.5277 | Moderate association |
| `sdhea` | 0.4018 | Moderate association |
| `testosterone` | 0.3142 | Moderate association |
| `lh` | 0.2776 | Weak / No linear correlation |
| `waist_circumference` | 0.2066 | Weak / No linear correlation |
| `androstenedione` | 0.2007 | Weak / No linear correlation |
| `oh_prog_17` | 0.157 | Weak / No linear correlation |
| `age` | -0.1449 | Weak / No linear correlation |
| `bmi` | 0.1196 | Weak / No linear correlation |
| `ldl_c` | 0.1063 | Weak / No linear correlation |
| `total_cholesterol` | 0.0744 | Weak / No linear correlation |
| `dbp` | 0.0743 | Weak / No linear correlation |
| `glucose` | 0.0673 | Weak / No linear correlation |
| `vit_d_25oh` | -0.0554 | Weak / No linear correlation |
| `sbp` | -0.052 | Weak / No linear correlation |
| `fsh` | 0.0458 | Weak / No linear correlation |
| `homa_ir` | -0.0359 | Weak / No linear correlation |
| `triglycerides` | 0.0352 | Weak / No linear correlation |
| `hdl_c` | -0.0164 | Weak / No linear correlation |

### Summary on Target Leakage:
- **Maximum Absolute Correlation:** e2 with r = 0.6455.
- **Leakage Suspects (|r| > 0.85):** None. No synthetic proxies or direct mathematical transformations of the target variable exist in the feature set.
- All 20 features are physiological, hormonal, or biochemical lab measurements obtained on day 3 of menses.

## 4. Preprocessing Leakage Audit
- In `audit_v2`, all imputation (`SimpleImputer(strategy='median')`) and scaling (`StandardScaler`) are strictly encapsulated inside `sklearn.pipeline.Pipeline` objects.
- Estimators are fitted strictly on `X_train_fold` and transformed on `X_val_fold` during repeated cross-validation.
- No global statistics from the validation or held-out test sets are exposed to model training.
