# Experiment Summary: Measles & Viral Skin Lesions Vision Pipeline
## ShasthoSetu AI — Vision Research Module (03_Measles_Viral_Rash)

---

### 1. Executive Summary
- **Research Goal:** Construct a leak-free deep learning screening classifier for 6 viral skin conditions on NVIDIA GeForce RTX 5060 Ti GPU.
- **Dataset:** Multi-Class Viral Skin Lesion Dataset (MCVSLD, Mendeley Data `dfztdtfsxz/1`, CC BY 4.0).
- **Clean Unique Images:** 10,384 images across 6 classes (Chickenpox: 1,011, Cowpox: 918, HFMD: 2,239, Healthy: 1,578, Measles: 761, Monkeypox: 3,877).
- **Critical Audit & Resolution:**
  - Initial SHA-256 deduplication purged 305 cross-split duplicate hashes from the author's archive.
  - Subsequent forensic analysis identified that all 10,384 images originate from 755 source-family photographs. In the historical image split, 100% of test images (1,558/1,558) shared source families with training images, producing an overfitted 99.10% accuracy.
  - Re-split into 528 Train, 113 Val, and 114 Test source families with 0% family overlap.
- **Winner Architecture:** **ResNet18** (Selected via Val Macro F1 = 84.22%).

---

### 2. Key Results (Corrected Source-Family Grouped Split)
- **Held-Out Test Accuracy (Image Crops N=1,561):** **83.34%**
- **Held-Out Test Balanced Accuracy:** **85.09%**
- **Held-Out Test Macro F1:** **82.62%**
- **Per-Family Majority Vote Accuracy (N=114 families):** **85.09%** (97/114 correct)
- **Per-Family Macro F1:** **84.38%**
- **Measles Detection (Unseen Families):** **80.91%** (89/110 crops) and **6/8 source families**.

---

### 3. Historical vs. Corrected Dual Benchmark
- **Historical (Contaminated Image-Level):** 99.10% Accuracy, 99.12% Macro F1 (100% crop-level leakage).
- **Corrected (Group-Isolated Source-Family):** 83.34% Accuracy, 85.09% Bal Acc, 82.62% Macro F1, 85.09% Family Acc.
- **Conclusion:** Eliminating source-family leakage reveals the true un-inflated generalization capability on genuine unseen lesions.
