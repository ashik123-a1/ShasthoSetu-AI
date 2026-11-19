# Dataset Integrity, Duplicate & Leakage Audit Report
## ShasthoSetu AI — 03_Measles_Viral_Rash Module

---

### 1. Executive Summary
- **Dataset:** Multi-Class Viral Skin Lesion Dataset (MCVSLD, Mendeley Data `dfztdtfsxz/1`)
- **Total Images in Archive:** 11,325 images across 6 classes and 3 pre-packaged folder partitions (`train`, `val`, `test`).
- **Corrupt / Unreadable Files:** **0** (100% of images verified valid by PIL parser).
- **Exact Hash Duplicates Found:** **1,870 image files** belong to **929 duplicate hash groups**.
- **Unique Clean Images:** **10,384 images**.
- **Critical Audit Discovery — Pre-Packaged Cross-Split Leakage:**
  - In the original Mendeley Data archive folder structure, **305 unique image hashes leak across splits**:
    - **140 images** appear in BOTH `train` and `test`!
    - **144 images** appear in BOTH `train` and `val`!
    - **21 images** appear in BOTH `val` and `test`!
  - Cross-class duplicate groups: **0** (No contradictory labeling).
- **Audit Decision:** The author's pre-packaged folder structure CANNOT be used directly for research evaluation due to significant train-to-test memorization leakage. We construct a clean deduplicated dataset of 10,384 unique images and generate a leak-proof stratified split.

---

### 2. Class Distribution Audit

#### **Pre-Packaged Archive vs. Deduplicated Clean Dataset**
| Class Label | Raw Archive Count | Clean Unique Images | Duplicate Instances Removed | % of Clean Dataset |
| :--- | :---: | :---: | :---: | :---: |
| **Monkeypox** | 4,260 | **3,877** | 383 | 37.34% |
| **HFMD** | 2,415 | **2,239** | 176 | 21.56% |
| **Healthy** | 1,710 | **1,578** | 132 | 15.20% |
| **Chickenpox** | 1,125 | **1,011** | 114 | 9.74% |
| **Cowpox** | 990 | **918** | 72 | 8.84% |
| **Measles** | 825 | **761** | 64 | 7.33% |
| **TOTAL** | **11,325** | **10,384** | **941** | **100.0%** |

#### **Class Imbalance Analysis:**
- Majority Class: `Monkeypox` (3,877 images, 37.34%).
- Minority Class: `Measles` (761 images, 7.33%).
- Imbalance Ratio: $3,877 : 761 \approx 5.09 : 1$.
- **Mitigation Requirement:** Cost-sensitive Cross-Entropy loss weighting or balanced focal loss must be applied during neural network training so that Measles false negatives are heavily penalized.

---

### 3. Image Dimensions & Format Technical Profile
- **File Format:** 100% JPEG (`.jpg`)
- **Color Mode:** 100% RGB (3 channels)
- **Resolution Range:**
  - Width: Min = 144 px, Max = 1024 px, Mean = 248.6 px
  - Height: Min = 144 px, Max = 1024 px, Mean = 248.5 px
  - Standard Resizing: Scaled to $224 \times 224$ pixels with ImageNet standard normalization ($\mu=[0.485, 0.456, 0.406]$, $\sigma=[0.229, 0.224, 0.225]$).

---

### 4. Data Partitioning Strategy (Leak-Free Stratified 70 / 15 / 15)
To ensure zero test-set contamination:
- We deduplicate the dataset to 10,384 unique images.
- A stratified split is computed with fixed seed (42):
  - **Train Set (70%):** 7,268 unique images
  - **Validation Set (15%):** 1,558 unique images
  - **Held-Out Test Set (15%):** 1,558 unique images
---

### 5. Critical Forensic Discovery: Source-Family Multi-Crop Contamination
Even after exact SHA-256 deduplication purged 305 cross-split hash leaks from the author's pre-packaged archive, a deep forensic examination of filename patterns revealed persistent high-order data leakage:

1. **Filename Token Decomposition:**
   - Image filenames follow the pattern: `[CLASS]_[CASE_ID]_[PHOTO_ID]_[CROP_VARIANT].jpg` (e.g., `HFMD_131_01.jpg`, `HFMD_131_01_2.jpg`, `HFMD_131_01_8.jpg`).
   - Extracting `[CLASS]_[CASE_ID]_[PHOTO_ID]` as the **Source-Family Identifier** reveals that the 10,384 clean unique images originate from only **755 unique source photographs** (an average of 13.75 crops/crops-with-minor-edits per family).

2. **Quantification of Historical Split Leakage:**
   - In the initial random stratified image-level split (70/15/15):
     - **748 out of 755 source families (99.07%)** spanned multiple splits!
     - **1,558 / 1,558 test images (100.0%)** shared a source-family photograph with the training split!
     - **114 / 114 Measles test images (100.0%)** had counterpart crops in the training split!
   - Consequently, the historical held-out test accuracy of **99.10%** and validation macro F1 of **99.12%** represented **near-perfect crop-level memorization**, not real-world clinical generalization.

3. **Remediation via Group-Isolated Source-Family Partitioning:**
   - We re-partitioned the 755 source families using a Group-Stratified split into:
     - **Train Split:** 528 source families (7,279 images, 70.1%)
     - **Validation Split:** 113 source families (1,544 images, 14.9%)
     - **Held-Out Test Split:** 114 source families (1,561 images, 15.0%)
   - **Cross-Split Family Overlap:** **0.0%** ($\text{Train} \cap \text{Val} = \emptyset$, $\text{Train} \cap \text{Test} = \emptyset$, $\text{Val} \cap \text{Test} = \emptyset$).
   - The resulting un-inflated, genuine generalization performance is documented in `outputs/grouped_metrics.json` and the updated `model_card.md`.

