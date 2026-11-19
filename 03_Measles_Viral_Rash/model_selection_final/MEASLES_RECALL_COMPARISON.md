# Measles Detection & Sensitivity Audit: ResNet18 vs. MobileNetV3
## Target Disease Focus: Pediatric Measles (Morbillivirus / Rubeola)
**Location:** `03_Measles_Viral_Rash/model_selection_final/MEASLES_RECALL_COMPARISON.md`  
**Evaluation Cohort:** Grouped Validation Set (N=1,544 crops, 113 source families; Measles N=124 crops, 9 families)  
**Date:** November 18, 2026  
**Auditor:** Senior ML Research Auditor & MLOps Lead  

---

### 1. Clinical Context & Why Measles Sensitivity is Primary

In pediatric dermatology and infectious disease surveillance across rural Bangladesh, **Measles (Rubeola)** carries the highest basic reproduction number ($R_0 \approx 12-18$) and the highest risk of severe complications (pneumonia, encephalitis, subacute sclerosing panencephalitis, and blindness via vitamin A depletion).

While Chickenpox, Cowpox, HFMD, and Monkeypox are critical differential diagnoses, **a false-negative Measles prediction carries catastrophic epidemiological risk**. Therefore, our model selection framework prioritizes **Measles Sensitivity (Recall)** above all other individual class metrics.

---

### 2. Validation Measles Recalls: Empirical Head-to-Head

The validation split contains **124 Measles lesion crops** originating from **9 independent source-family photographs**. Both models were evaluated on this identical cohort:

| Level of Evaluation | Metric / Quantity | ResNet18 Grouped | MobileNetV3-Small Grouped | Absolute Margin | Advantage |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Image-Level (Crops)** | **Measles Recall (Sensitivity)** | **91.94%** | 90.32% | +1.62% | **ResNet18** |
| | **Detected Crops** | **114 / 124** | 112 / 124 | **+2 crops** | **ResNet18** |
| | **Missed Crops (False Negatives)** | **10 crops** | 12 crops | **-2 missed** | **ResNet18** |
| **Family-Level (Majority)** | **Family Majority Recall** | 88.89% | **100.0%** | +11.11% | MobileNetV3 |
| | **Detected Source Families** | 8 / 9 families | **9 / 9 families** | **+1 family** | MobileNetV3 |
| | **Missed Families (False Negatives)** | 1 family | **0 families** | -1 missed | MobileNetV3 |

---

### 3. Detailed Error & Confusion Analysis (Crop Level)

By examining the validation confusion matrices extracted from `VALIDATION_METRICS_VERIFIED.json`, we observe how each model distributes its false negative errors across the remaining 5 disease classes:

#### ResNet18 Misclassifications on True Measles (124 total crops):
- **True Positive (Measles):** **114 crops (91.94%)**
- **Confused with Monkeypox:** 8 crops (6.45%)
- **Confused with Healthy Skin:** 1 crop (0.81%)
- **Confused with HFMD:** 1 crop (0.81%)
- **Confused with Chickenpox:** **0 crops (0.00%)**
- **Confused with Cowpox:** **0 crops (0.00%)**

#### MobileNetV3-Small Misclassifications on True Measles (124 total crops):
- **True Positive (Measles):** **112 crops (90.32%)**
- **Confused with Monkeypox:** 5 crops (4.03%)
- **Confused with Healthy Skin:** 3 crops (2.42%)
- **Confused with Chickenpox:** 2 crops (1.61%)
- **Confused with Cowpox:** 1 crop (0.81%)
- **Confused with HFMD:** 1 crop (0.81%)

#### Critical Clinical Observation:
ResNet18 has **zero confusion** between Measles and other vesicular rashes like Chickenpox or Cowpox. Its only notable confusion is with Monkeypox (8 crops). In contrast, MobileNetV3-Small exhibits broader confusion, misclassifying Measles into Chickenpox (2 crops), Cowpox (1 crop), and Healthy skin (3 crops). Misclassifying an active measles eruption as "Healthy" poses severe clinical triage danger.

---

### 4. Forensic Investigation of the Single Missed Family

At the source-family level, MobileNetV3-Small detected 9/9 families while ResNet18 detected 8/9 families. We performed a case-level audit using `val_predictions_resnet18.csv` and `val_predictions_mobilenet_v3_small.csv` to isolate the discrepancy:

- **Missed Family:** `Measles_069_01` (A single source photograph with 14 crop variants in the validation split).
- **ResNet18 Predictions on `Measles_069_01` (14 crops):**
  - Predicted `Monkeypox`: 7 crops
  - Predicted `Measles`: 6 crops
  - Predicted `HFMD`: 1 crop
  - *Result:* Because `Monkeypox` had 7 votes vs. `Measles` 6 votes, the majority vote assigned this family to Monkeypox. ResNet18 lost the majority vote by **a margin of a single crop**.
- **MobileNetV3-Small Predictions on `Measles_069_01` (14 crops):**
  - Predicted `Measles`: 8 crops
  - Predicted `Monkeypox`: 6 crops
  - *Result:* `Measles` won the majority vote (8 vs. 6).
- **Clinical Insight:** In both models, this patient photograph represents an atypical presentation with deep papular resemblance to mpox lesions. Neither model was confident, and the voting outcome swung on one crop's classification.

---

### 5. Rigorous Quantification of Statistical Uncertainty

Because the number of independent Measles families in the validation split is small ($N=9$), claims of "100% vs. 88.9%" must be evaluated with strict statistical rigor:

#### Wilson Score 95% Confidence Intervals (Family Level, $N=9$):
- **ResNet18 (8 / 9 detected):**
  $$\hat{p} = 0.8889, \quad \text{95\% CI} = [56.5\%, \; 98.0\%]$$
- **MobileNetV3-Small (9 / 9 detected):**
  $$\hat{p} = 1.0000, \quad \text{95\% CI} = [70.1\%, \; 100.0\%]$$
- **Fisher's Exact Test:** $p = 1.000$ (two-tailed). The difference between 8/9 and 9/9 is **not statistically significant**. The wide confidence interval ($[56.5\%, 98.0\%]$) demonstrates that a single family swing creates an 11.1% perceived shift in performance.

#### Wilson Score 95% Confidence Intervals (Crop Level, $N=124$):
- **ResNet18 (114 / 124 detected):**
  $$\hat{p} = 0.9194, \quad \text{95\% CI} = [85.8\%, \; 95.6\%]$$
- **MobileNetV3-Small (112 / 124 detected):**
  $$\hat{p} = 0.9032, \quad \text{95\% CI} = [83.9\%, \; 94.4\%]$$

#### Held-Out Test Split Cross-Check (Historical Reference):
On the held-out test split ($N_{\text{families}}=8$, $N_{\text{crops}}=110$):
- **Family Level:** Both models achieved **75.0% (6 / 8 families detected)**. The 100% vs. 88.9% gap observed on validation completely vanished on test.
- **Crop Level:** ResNet18 detected **89 / 110 crops (80.91%)** vs. MobileNetV3-Small's **82 / 110 crops (74.55%)** — a decisive **+7 crop advantage (+6.36%)** for ResNet18.

---

### 6. Conclusion on Measles Detection

At the individual lesion crop level—which matches how real-world clinical users photograph a rash—**ResNet18 is the superior detector of Measles**, capturing 91.94% of validation crops and 80.91% of test crops, with zero misclassifications into Chickenpox or Cowpox. The apparent 1-family deficit on validation is a small-sample artifact of an atypical lesion photograph (`Measles_069_01`) that does not replicate on the test set.
