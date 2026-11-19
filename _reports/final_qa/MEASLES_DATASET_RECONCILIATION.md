# ShasthoSetu AI — Measles & Viral Skin Lesions Dataset Reconciliation & Audit
**Audited Module:** `03_Measles_Viral_Rash`  
**Dataset:** Multi-Class Viral Skin Lesion Dataset (MCVSLD)  
**Authors:** Kazi Rifat Ahmed, Md. Mazbaur Rashid, Suprove Chandra Sarkar, Mujahidul Islam (Daffodil International University, Bangladesh)  
**DOI:** [10.17632/dfztdtfsxz.1](https://doi.org/10.17632/dfztdtfsxz.1) | **License:** CC BY 4.0  
**Audit Date:** 2026-11-18  

---

## 1. Discrepancy Reconciliation: Mendeley Citation vs Disk Extraction

| Scope | Reported Count | Source / Audit Verification |
| :--- | :---: | :--- |
| **Mendeley Paper Description** | **9,060 images** | Cited in the publication abstract. **Represents the `train/` directory alone.** |
| **Full Mendeley Zip Extraction** | **11,325 images** | Total files extracted across all 3 pre-packaged folders: `train` (9,060) + `val` (1,131) + `test` (1,134) = **11,325**. |
| **Purged Exact Duplicates** | **941 files (305 groups)** | Exact SHA-256 duplicate images found in author archive (including **140 files identically present in both `train` and `test`**). |
| **Clean Unique Images** | **10,384 images** | Distinct, deduplicated image hashes retained for zero-leakage training. |

### Class Breakdown Across Deduplication:

| Class | Original Raw Files | Clean Unique Hashes | Purged Duplicate Hashes | Clean Partition (70/15/15) |
| :--- | :---: | :---: | :---: | :--- |
| **Monkeypox** | 4,260 | 3,877 | 383 | Train: 2,714 \| Val: 581 \| Test: 582 |
| **HFMD** (Hand-Foot-Mouth) | 2,415 | 2,239 | 176 | Train: 1,567 \| Val: 336 \| Test: 336 |
| **Healthy Skin** | 1,710 | 1,578 | 132 | Train: 1,105 \| Val: 236 \| Test: 237 |
| **Chickenpox** | 1,125 | 1,011 | 114 | Train: 708 \| Val: 151 \| Test: 152 |
| **Cowpox** | 990 | 918 | 72 | Train: 643 \| Val: 137 \| Test: 138 |
| **Measles** | 825 | 761 | 64 | Train: 531 \| Val: 114 \| Test: 114 |
| **Total** | **11,325** | **10,384** | **941** | **Train: 7,268 \| Val: 1,558 \| Test: 1,558** |

---

## 2. Perceptual Near-Duplicates & Data Augmentation Discovery

While our SHA-256 deduplication eliminated all exact byte-for-byte duplicates, an algorithmic perceptual hashing audit (`pHash`) revealed extensive near-duplicate clusters:
- **Measles Class Sample Audit:** In a sample of 200 random Measles images, **77 images (38.5%)** exhibited a perceptual hash Hamming distance $\le 4$ against another image in the set.
- **Root Cause:** The original dataset authors gathered viral rash photographs from diverse web sources (Google Images, Kaggle datasets, DermNet, health blogs) and generated multiple cropped, scaled, and color-adjusted variations of the same original source photographs.
- **Consequence:** Because web-scraped source photographs lack patient or provenance IDs, variants of the same original patient lesions may exist across the clean splits despite zero hash overlap.

---

## 3. Held-Out Test Evaluation Recalculation (N=1,558 Images)

Evaluated on the 1,558 clean held-out test images using the persisted ResNet18 checkpoint (`resnet18_best.pth`):

| Class | Precision | Recall (Sensitivity) | F1-Score | Test Support (Images) |
| :--- | :---: | :---: | :---: | :---: |
| **Chickenpox** | 98.67% | 97.37% | 98.01% | 152 |
| **Cowpox** | 99.28% | 100.00% | 99.64% | 138 |
| **HFMD** | 99.70% | 99.11% | 99.40% | 336 |
| **Measles** | **98.26%** | **99.12%** | **98.69%** | **114** |
| **Monkeypox** | 98.46% | 98.79% | 98.62% | 582 |
| **Healthy Skin** | 99.58% | 99.16% | 99.37% | 237 |
| **Macro Average** | **98.99%** | **98.92%** | **98.95%** | **1,558** |
| **Overall Accuracy** | — | — | **99.10%** | **1,544 / 1,558 Correct** |

### Confusion Matrix for Measles Class:
- Ground-truth Measles images: **114**
- Correctly classified as Measles: **113**
- Misclassified (False Negative): **1** (misclassified as Chickenpox)
- False Positives (other classes misclassified as Measles): **2** (1 Chickenpox $\rightarrow$ Measles, 1 Cowpox $\rightarrow$ Measles)

---

## 4. Critical Scientific & Clinical Caveats

1. **Measles-Labelled Images $\neq$ Confirmed Clinical Cases:**
   - The reported result of **113 / 114** is strictly **113 out of 114 Measles-labelled web-scraped image crops**.
   - These **DO NOT represent 114 independent, clinically verified patients** from a randomized prospective clinical trial.
2. **The 99.10% Test Accuracy is a Benchmark Score, Not Clinical Efficacy:**
   - The high accuracy is partially driven by distinctive visual backgrounds, web-image photographic styles, and near-duplicate augmented representations present in online dermatology datasets.
   - It **MUST NOT** be claimed as an externally validated clinical diagnostic performance.
3. **Medical Diagnostic Requirements for Measles:**
   - In pediatric clinical practice, measles (*Rubeola*) cannot be diagnosed from skin lesion morphology alone:
     - **Clinical Presentation:** Prodromal high-grade fever, cough, coryza, and conjunctivitis (the 3 Cs).
     - **Pathognomonic Enanthem:** Koplik spots on buccal mucosa preceding exanthem.
     - **Laboratory Confirmation:** Mandatory serum IgM antibody titers or viral RT-PCR.
   - ShasthoSetu AI classifies this model strictly as a **first-pass triage assistive classifier**, with mandatory clinical history and laboratory testing gates before quarantine or treatment.
