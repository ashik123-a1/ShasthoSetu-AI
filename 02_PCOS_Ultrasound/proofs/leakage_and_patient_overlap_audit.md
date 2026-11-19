# Leakage, Near-Duplicate & Patient Overlap Audit
## ShasthoSetu AI — 02_PCOS_Ultrasound Deep Data Integrity Report

---

### 1. Executive Summary
- **Module:** `02_PCOS_Ultrasound`
- **Total Raw Images:** 301
- **Exact Hash Duplicates Purged:** 2 images (`Dominant_Follicle_128` duplicate of `Dominant_Follicle_1`, `Dominant_Follicle_86` duplicate of `Dominant_Follicle_85`)
- **Total Unique Images Audited:** 299
- **Audit Algorithms:** Perceptual Hash (`pHash`), Difference Hash (`dHash`), Average Hash (`aHash`), Wavelet Hash (`wHash`), and Resized Pixel Intensity Correlation.
- **Key Finding:** 24 pairs of near-duplicate ultrasound frames were discovered (Hamming distance $\le 6$), with 8 pairs crossing the original naive random train/val/test splits.

---

### 2. Evidence of Frame-Level Burst Capture & Near-Duplicates
Public medical imaging datasets often contain sequential video frames or rapid burst captures from ultrasound sweeps where patient identifiers are not preserved in the file metadata.

#### **Top Near-Duplicate Pairs Identified:**
1. **`Dominant_Follicle_60.jpg` (val) vs `Dominant_Follicle_61.jpg` (train)**
   - `pHash` Distance: **0** | `dHash` Distance: **0**
   - Image Dimensions: $728 \times 513$ vs $728 \times 512$ (1-pixel width difference)
   - Resized Pixel Intensity Correlation: **`0.9981`**
   - Mean Absolute Pixel Difference: **`1.21`** (out of 255)
   - *Conclusion:* Same ovarian follicle captured in consecutive frames of the same ultrasound sweep. Because of naive random split, one frame was assigned to `train` and the other to `val`.

2. **`PCO_59.jpg` (test) vs `PCO_60.jpg` (train)**
   - `pHash` Distance: **2** | `dHash` Distance: **0**
   - Image Dimensions: $728 \times 512$ vs $728 \times 515$
   - Resized Pixel Intensity Correlation: **`0.9886`**
   - Mean Absolute Pixel Difference: **`2.01`** (out of 255)
   - *Conclusion:* Consecutive ultrasound sweep frames from the same ovary. `PCO_59` was in `test` while `PCO_60` was in `train`, representing subtle frame-level leakage.

3. **`PCO_1.jpg` (train) vs `PCO_55.jpg` (train)**
   - `pHash` Distance: **2** | `dHash` Distance: **0**
   - Both in `train`, no split leakage.

4. **`PCO_2.jpg` (train) vs `PCO_111.jpg` (train)**
   - `pHash` Distance: **0** | `dHash` Distance: **1**
   - Both in `train`, no split leakage.

---

### 3. Impact on Evaluation Metrics
- The presence of 8 cross-split near-duplicate pairs means that any single held-out test split created by naive random partitioning has a small degree of optimistic bias.
- When an exact or near-identical frame is present in both `train` and `test`, the model can recognize image acquisition artifacts (e.g., gain, transducer position, monitor boundary) rather than purely invariant anatomical features.
- This finding reinforces why:
  1. A single 93.33% test score must not be accepted uncritically.
  2. Group-isolated cross-validation (where all connected near-duplicate frames are strictly quarantined into the same fold) is required.

---

### 4. Group-Isolated Cross-Validation Remedy
To eliminate cross-split frame leakage:
- A graph of near-duplicate relationships was constructed using NetworkX.
- 10 multi-frame clusters were identified and merged into **pseudo-patient groups**.
- On development data (N=254), **Stratified Group 5-Fold Cross-Validation** (repeated 3 times = 15 folds) was executed.
- In each fold, `train_groups \cap val_groups = \emptyset` was strictly asserted.
- **Leakage-Free Repeated CV Result:**
  - Mean Balanced Accuracy: **`84.53% ± 7.33%`**
  - Mean Macro F1: **`85.42% ± 6.53%`**

---

### 5. Final Diagnostic Boundary & Research Scope
- **Ultrasound Appearance $\neq$ Clinical Diagnosis:** Machine learning detection of polycystic ovarian morphology (PCOM) is an imaging assessment of cyst count and stromal echogenicity.
- It does NOT diagnose clinical PCOS, which requires biochemical hyperandrogenism (elevated testosterone/FAI) and chronic oligo/amenorrhea under the Rotterdam criteria.
- Modules `01_PCOS_Clinical` (tabular) and `02_PCOS_Ultrasound` (vision) remain completely isolated.
