# Model Card: Measles & Multi-Class Viral Skin Lesion Classifier
## ShasthoSetu AI — Vision Research Module (03_Measles_Viral_Rash)
### Dual Benchmark: Corrected Group-Isolated Split (Primary) vs. Historical Image-Level Split (Contaminated Baseline)

---

### 1. Model Details & Hardware Environment
- **Active Model Checkpoint (Primary):** `models/resnet18_grouped_best.pth` (PyTorch ResNet18 trained with source-family group isolation)
- **Secondary Baseline Checkpoint:** `models/mobilenet_v3_small_grouped_best.pth`
- **Historical Benchmark Checkpoint (Contaminated):** `models/resnet18_best.pth`
- **Architecture:** Deep CNN initialized with ImageNet pretrained weights, fine-tuned with cost-sensitive Cross-Entropy loss.
- **Task:** 6-Class Differential Viral Skin Lesion Screening:
  1. `Chickenpox` (Varicella-Zoster Virus)
  2. `Cowpox` (Orthopoxvirus)
  3. `HFMD` (Hand, Foot, and Mouth Disease — Enterovirus/Coxsackie)
  4. `Healthy` (Dermatological controls)
  5. `Measles` (Morbillivirus — Primary pediatric surveillance target)
  6. `Monkeypox` (Mpox — Clade I/II Orthopoxvirus)
- **Dataset Provenance:** Multi-Class Viral Skin Lesion Dataset (MCVSLD, Mendeley Data `dfztdtfsxz/1`, DOI: `10.17632/dfztdtfsxz.1`)
- **Dataset Authors:** Kazi Rifat Ahmed, Md. Mazbaur Rashid, Suprove Chandra Sarkar, Mujahidul Islam (Daffodil International University, Bangladesh, Dec 2024)
- **License:** Creative Commons Attribution 4.0 International (`CC BY 4.0`)
- **Hardware Platform:** NVIDIA GeForce RTX 5060 Ti 16GB VRAM (CUDA 12.8 / sm_120)

---

### 2. Forensic Discovery: Historical Crop-Level Data Leakage
A critical forensic investigation of `clean_split_manifest.csv` revealed that filenames contain tokens: `[CLASS]_[CASE]_[PHOTO]_[CROP].jpg` (e.g., `HFMD_131_01.jpg` vs `HFMD_131_01_8.jpg`).
- **755 Source-Family Photographs:** All 10,384 clean unique images derive from only 755 original source-family photographs (average 13.75 crops/family).
- **100% Test Contamination in Historical Image Split:** 
  - In the historical random stratified split, **748 / 755 families (99.07%) spanned multiple splits**.
  - **1,558 / 1,558 test images (100.0%)** and **114 / 114 Measles test images (100.0%)** had counterpart crops in the training split!
  - Therefore, the historical 99.10% accuracy represented **overfitted crop memorization**, not independent clinical generalization.
- **Remediation:** Partitioned by source-family ID (`clean_grouped_split_manifest.csv`) with **0.0% source-family overlap** across Train (528 families / 7,279 images), Val (113 families / 1,544 images), and Test (114 families / 1,561 images).

---

### 3. Evaluated Performance: Dual Benchmark Comparison

| Metric | Corrected Group-Isolated (ResNet18 Winner) | Corrected Group-Isolated (MobileNetV3) | Historical Image-Level (ResNet18 - Contaminated) |
| :--- | :---: | :---: | :---: |
| **Split Methodology** | **Source-Family Grouped (0% Overlap)** | **Source-Family Grouped (0% Overlap)** | Random Stratified (100% Crop Leakage) |
| **Test Image Accuracy** | **83.34%** | 80.97% | 99.10% (Memorized) |
| **Test Balanced Accuracy** | **85.09%** | 81.64% | 98.92% (Memorized) |
| **Test Macro F1** | **82.62%** | 79.23% | 99.12% (Memorized) |
| **Measles Crop Recall** | **80.91% (89/110)** | 74.55% (82/110) | 96.49% (110/114) |
| **Family-Level Majority Accuracy** | **85.09% (97/114 families)** | 85.96% (98/114 families) | N/A (Families fragmented) |
| **Family-Level Macro F1** | **84.38%** | 83.93% | N/A |
| **Measles Family Recall** | **6/8 (75.0%)** | 6/8 (75.0%) | N/A |

#### Class Recalls on Unseen Patient/Source Families (ResNet18 N=1,561 crops):
- `Chickenpox`: 81.76%
- `Cowpox`: 88.49%
- `HFMD`: 98.49%
- `Healthy`: 88.56%
- `Measles`: 80.91% (89/110 detected)
- `Monkeypox`: 72.31%

---

### 4. Clinical Safety, Regulatory Scope & Boundaries
- **Assistive Triage Screening Only:** This pipeline serves strictly as an automated image-screening decision-support aid.
- **Definitive Diagnosis Requirement:** A medical diagnosis of measles requires physical examination (buccal Koplik spots, prodromal fever, conjunctivitis) and laboratory serology (Measles IgM or RT-PCR).
- **Module Independence:** Completely independent from `01_PCOS_Clinical` (tabular) and `02_PCOS_Ultrasound` (ovarian ultrasound).
