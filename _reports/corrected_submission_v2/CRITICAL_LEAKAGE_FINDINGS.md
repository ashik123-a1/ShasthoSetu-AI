# ShasthoSetu AI — Critical Source-Family Leakage Audit & Remediation
**Audited Modality:** `03_Measles_Viral_Rash` (Multi-Class Viral Skin Lesion Dataset, MCVSLD)  
**Authors:** Daffodil International University, Bangladesh (Mendeley Data `dfztdtfsxz/1`, CC BY 4.0)  
**Lead Auditor:** Senior ML Research Auditor & MLOps Engineer  
**Date:** 2026-11-18  

---

## 1. Executive Forensic Discovery

An independent forensic inspection of `clean_split_manifest.csv` and the original image files revealed that the headline **99.10% held-out test accuracy** was compromised by **source-family data contamination**.

### The Mechanism of Contamination:
The original dataset authors collected photographs from web sources (DermNet, Google, health blogs) and generated multiple cropped, rotated, and scaled variations of each photograph. The filenames follow a strict tokenized naming convention:
$$\text{[CLASS\_PREFIX]\_[CASE\_ID]\_[PHOTO\_ID]\_[CROP\_ID].jpg}$$

For example:
- `HFMD_131_01.jpg` (Root photograph)
- `HFMD_131_01_2.jpg`, `HFMD_131_01_5.jpg`, `HFMD_131_01_7.jpg`, `HFMD_131_01_8.jpg` (Derived augmented crops)

When our earlier data pipeline performed exact SHA-256 deduplication and then executed a standard stratified `train_test_split` at the **individual image file level**, different crops of the **exact same photograph** were randomly assigned across Train, Validation, and Test:

| Split | Example Assigned Image | Source Family ID | Status |
| :--- | :--- | :---: | :---: |
| **Train** | `HFMD_131_01.jpg`, `HFMD_131_01_5.jpg` | `HFMD_131_01` | Seen in Training |
| **Validation** | `HFMD_131_01_7.jpg` | `HFMD_131_01` | **Leaked from Train** |
| **Test** | `HFMD_131_01_8.jpg` | `HFMD_131_01` | **Leaked from Train** |

---

## 2. Quantifying the Extent of Contamination

An automated audit across all 10,384 clean unique images identified:
- **Total Unique Images:** 10,384
- **Total Unique Source-Family Identifiers:** **755**
- **Average Crops per Source Family:** **13.75** (Range: 12 to 14 crops per root photograph)
- **Source Families Spanning Multiple Splits in Historical Split:** **748 out of 755 (99.07%)**
- **Test Images Sharing a Source Family with Train:** **1,558 out of 1,558 (100.0%)!**
- **Measles Test Images Sharing a Source Family with Train:** **114 out of 114 (100.0%)!**

### Scientific Verdict:
The historical **99.10% test accuracy** and **99.12% Measles sensitivity** evaluated whether the convolutional neural network could recognize a novel crop of an image it had already memorized during training (including background lighting, patient skin color, camera artifacts, and lesion geometry). It did **not** test true generalizability to unseen patients.

The historical result is formally reclassified as:
`HISTORICAL_CONTAMINATED_IMAGE_LEVEL_BENCHMARK (99.10%)`

---

## 3. The Corrected Group-Isolated Protocol

To eliminate all crop-level leakage, we implemented a **Stratified Group Partition** on `family_id` (`03_Measles_Viral_Rash/src/split_grouped_data.py`):
- All 12–14 crops of each source photograph are strictly isolated into exactly one partition.
- **Train Split:** 528 source families (**7,279 images**)
- **Validation Split:** 113 source families (**1,544 images**)
- **Test Split:** 114 source families (**1,561 images**)
- **Source-Family Cross-Split Overlap:** **0.0% (Zero Leakage Verified)**

---

## 4. Benchmark Comparison: Contaminated vs Group-Isolated

We retrained ResNet18 and MobileNetV3-Small from scratch on the RTX 5060 Ti GPU using the corrected grouped partition:

| Metric | Historical Contaminated Split (Image-Level) | Corrected Group-Isolated Split (Unseen Families) | Difference (Leakage Impact) |
| :--- | :---: | :---: | :---: |
| **Split Leakage Rate** | **100.0% (1,558/1,558)** | **0.0% (0 / 1,561)** | **-100.0% (Leakage Eliminated)** |
| **Test Accuracy** | **99.10%** | **83.34%** | **-15.76%** |
| **Test Balanced Accuracy** | **99.05%** | **85.09%** | **-13.96%** |
| **Test Macro F1** | **99.08%** | **82.62%** | **-16.46%** |
| **Measles Sensitivity (Image-Level)** | **99.12%** (113/114) | **80.91%** (89/110) | **-18.21%** |
| **Measles Detection (Family-Level)** | Not Evaluated | **75.0%** (6/8 unseen families) | Realistic Clinical Baseline |
| **Family-Level Majority Vote Acc** | Not Evaluated | **85.09%** (97/114 families) | Genuine Generalization |

### Key Insight:
Eliminating augmentation leakage reveals the **authentic generalization baseline (83.34% – 85.09%)**. This demonstrates real-world clinical behavior and provides hackathon judges with verified, uninflated evidence.
