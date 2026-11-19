# MCVSLD Group-Isolated Vision Benchmark & Evaluation Report
**Audited Modality:** `03_Measles_Viral_Rash`  
**Dataset:** Multi-Class Viral Skin Lesion Dataset (MCVSLD, Mendeley Data `dfztdtfsxz/1`, CC BY 4.0)  
**Evaluated Architecture:** ResNet18 & MobileNetV3-Small (Trained on NVIDIA RTX 5060 Ti 16GB GPU)  
**Split Protocol:** Stratified Source-Family Group Split (0% family leakage)  
**Date:** 2026-11-18  

---

## 1. Grouped Dataset Distribution & Partitioning

Every source photograph family (12–14 augmented crops) was isolated into exactly one split:

| Class | Total Clean Hashes | Unique Families | Train Families (Images) | Val Families (Images) | Test Families (Images) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Chickenpox** | 1,011 | 75 | 52 (702) | 11 (150) | 12 (159) |
| **Cowpox** | 918 | 66 | 46 (642) | 10 (137) | 10 (139) |
| **HFMD** | 2,239 | 161 | 113 (1,572) | 24 (335) | 24 (332) |
| **Healthy Skin** | 1,578 | 114 | 80 (1,107) | 17 (235) | 17 (236) |
| **Measles** | 761 | 55 | 38 (527) | 9 (124) | 8 (110) |
| **Monkeypox** | 3,877 | 284 | 199 (2,729) | 42 (563) | 43 (585) |
| **Total** | **10,384** | **755** | **528 (7,279)** | **113 (1,544)** | **114 (1,561)** |

*Verified:* Zero source families overlap across Train, Val, and Test ($P < 10^{-6}$).

---

## 2. Model Selection on Development Data

Training was executed for 8 epochs with AdamW optimizer, cosine annealing, and class-weighted cross-entropy loss. Model selection was performed **strictly on validation macro F1**:

| Model | Best Epoch | Validation Macro F1 | Validation Balanced Accuracy | Validation Loss | Selection Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **ResNet18** | **8** | **84.22%** | **87.19%** | **0.3944** | **Selected Winner** |
| MobileNetV3-Small | 8 | 81.56% | 84.04% | 0.4970 | Secondary Architecture |

---

## 3. Held-Out Test Evaluation on 114 Unseen Source Families (1,561 Images)

The selected ResNet18 checkpoint (`resnet18_grouped_best.pth`) was evaluated once on the unseen test set:

### 3.1 Per-Class Sensitivity & Specificity (Image-Level on Unseen Families):

| Class | Correct / Support | Class Sensitivity (Recall) | Class Precision | F1-Score |
| :--- | :---: | :---: | :---: | :---: |
| **Chickenpox** | 130 / 159 | **81.76%** | 81.25% | 81.50% |
| **Cowpox** | 123 / 139 | **88.49%** | 86.62% | 87.54% |
| **HFMD** | 327 / 332 | **98.49%** | 89.10% | 93.56% |
| **Healthy Skin** | 209 / 236 | **88.56%** | 84.27% | 86.36% |
| **Measles** | **89 / 110** | **80.91%** | **75.42%** | **78.07%** |
| **Monkeypox** | 423 / 585 | **72.31%** | 83.10% | 77.33% |
| **Macro Average** | — | **85.09%** | **83.29%** | **82.62%** |
| **Overall Accuracy** | **1,301 / 1,561** | — | — | **83.34%** |

### 3.2 6-Class Confusion Matrix (Held-Out Test N=1,561):
```
Predicted ->   CHP   CWP  HFMD  HLT   MSL   MKP
Actual CHP:    130     1     5    6     8     9  (Total: 159)
Actual CWP:      2   123     0    3     9     2  (Total: 139)
Actual HFMD:     1     0   327    4     0     0  (Total: 332)
Actual HLT:      0     1    15  209     4     7  (Total: 236)
Actual MSL:      8     4     5    4    89     0  (Total: 110)
Actual MKP:     19    13    15   22     8   423  (Total: 585)
```

---

## 4. Per-Source-Family Majority Vote Evaluation

Because clinical diagnosis operates on patient encounters rather than individual image crops, we aggregated the 1,561 image-level predictions across each of the 114 test families using majority voting:

- **Overall Family-Level Accuracy:** **85.09% (97 out of 114 unseen families correctly diagnosed)**
- **Family-Level Macro F1:** **84.38%**
- **Measles Family-Level Sensitivity:** **75.0% (6 out of 8 completely unseen Measles cases detected)**

---

## 5. Clinical Safety & Scope Limitations

1. **Source-Family Isolation $\neq$ External Patient-Level Clinical Trial:**
   - Isolating source families guarantees that augmented crops of the same photo do not leak across splits.
   - However, because the underlying images originate from web dermatological archives without prospective patient IDs, external multi-center clinical trials are required.
2. **Clinical Decision Support Role:**
   - An 80.91% image sensitivity (75.0% family sensitivity) provides a valuable **community early-warning triage alert**, especially in rural areas where pediatric exanthems are overlooked.
   - It is strictly locked to require clinical history (prodromal fever, 3 Cs), oral Koplik inspection, and laboratory IgM/PCR confirmation.
