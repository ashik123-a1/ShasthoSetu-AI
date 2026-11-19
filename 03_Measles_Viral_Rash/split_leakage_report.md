# Data Split & Leakage Risk Assessment
**Module:** `03_Measles_Viral_Rash`  
**Compliance Standard:** Master SRS v1.0 Section 16.2 & Section 21  

---

## 1. Patient Leakage Risk Analysis by Candidate Dataset

| Dataset | Patient Identifiers | Splitting Method Supported | Leakage Risk Level | Scientific Feasibility |
|---|---|---|---|---|
| **Mendeley MCVSLD** | **None** (Anonymous web images) | Random Split only | **CRITICAL (High Probability)** | **Unusable for Patient-Disjoint Benchmark** |
| **DermoPed (Zenodo)** | **Verified** (`patient{n}` folders) | GroupShuffleSplit / GroupKFold | **ZERO (When strictly grouped)** | **Approved for Patient-Grouped CV** |

### 1.1 The MCVSLD Patient Leakage Defect
When a dataset lacks patient identifiers, multiple photographs taken from the same individual (e.g., front of torso, back of torso, close-up of arm) inevitably get distributed randomly between the training and test sets.
- A convolutional neural network easily learns individual patient skin tone, body hair, moles, ambient lighting, and background blankets rather than pathology.
- This creates **artificially inflated test accuracies (98-99%)** that immediately collapse to chance when tested on a new clinical patient.
- Because MCVSLD has no patient metadata, it is mathematically impossible to guarantee patient-disjoint isolation.

### 1.2 DermoPed Patient-Disjoint Stratification
DermoPed organizes every patient into a distinct subfolder (`patient{n}`).
- In `chickenpox` (19 patients), strict `GroupShuffleSplit` proved 0 patient leakage and 0 duplicate images.
- In `morbilliform_exanthema` (archive size 329.67 MB), patients are organized into the same `patient{n}/crops/` structure.
- Patient-grouped cross-validation ($k=5$) can safely be applied to DermoPed, ensuring complete isolation of patient identities across all evaluation folds.

---

## 2. Near-Duplicate & Perceptual Hash Protocol

Prior to training any future model on prospective image cohorts, the following automated deduplication pipeline must be executed (matching `02_PCOS_Ultrasound`):
1. **Cryptographic SHA-256 Deduplication:** Filter out identical files.
2. **Perceptual Hashing (pHash):** Flag image pairs with Hamming distance $\le 5$ to detect identical crops subjected to slight resizing, JPEG compression, or contrast shifts.
3. **Cross-Split Collision Guard:** Verify that no cross-split pair has a pHash distance $\le 5$.
