# Master Model Performance Comparison & Benchmark Register
**Project:** ShasthoSetu AI — Multimodal Clinical Healthcare Platform  
**Audit Phase:** Full ML Model Verification across all 6 Research Modules  
**Auditor:** Senior ML Research Auditor  
**Audit Date:** November 18, 2026  
**Hardware Environment:** NVIDIA GeForce RTX 5060 Ti 16GB | PyTorch 2.11.0+cu128 | CUDA 12.8  

---

## 1. Classification of Model Archetypes

To eliminate past ambiguities, every model in this platform is categorized into one of five rigorous archetypes:

1. **Locally Trained Model (LTM):** Custom head trained on local weights and validated against local test manifests.
2. **Externally Fine-Tuned Checkpoint (EFC):** Specialized domain model trained by external research teams, downloaded and benchmarked locally.
3. **Pretrained Baseline Pipeline (PBP):** Off-the-shelf vision/OCR/ASR architecture with zero domain weight updates.
4. **Third-Party Literature Benchmark (PLB):** Published research papers cited for comparative context (*Never to be claimed as ShasthoSetu measured results*).
5. **Proposed / Unexecuted Architecture (PUA):** Theoretical designs or future roadmaps (*Zero weights exist*).

---

## 2. Module 01: PCOS Clinical Tabular Machine Learning

### Model Comparison Matrix (N=88 Patients)

| Model Name | Archetype | Protocol | Balanced Accuracy | Macro F1 | Sensitivity | Specificity | ROC-AUC | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **XGBoost (Champion)** | **LTM** | **10x5 Repeated CV (N=70)** | **88.57% ± 8.29%** | **88.39% ± 8.33%** | **90.00% ± 10.24%** | **87.14% ± 14.11%** | **0.9327 ± 0.074** | **Verified Primary Baseline** |
| Random Forest | LTM | 10x5 Repeated CV (N=70) | 87.77% ± 8.37% | 87.56% ± 8.54% | 88.39% ± 12.34% | 87.14% ± 12.19% | 0.9335 ± 0.069 | Verified Secondary |
| Logistic Regression | LTM | 10x5 Repeated CV (N=70) | 82.86% ± 11.53% | 82.59% ± 11.79% | 84.00% ± 16.64% | 81.71% ± 14.14% | 0.9262 ± 0.073 | Verified Linear Baseline |
| **XGBoost (Held-out)** | **LTM** | **Held-out Test (N=18)** | **94.44% (17/18)** | **94.43%** | **88.89% (8/9)** | **100.0% (9/9)** | **0.9877** | **Verified Held-Out** |
| Random Forest (Held-out) | LTM | Held-out Test (N=18) | 94.44% (17/18) | 94.43% | 100.0% (9/9) | 88.89% (8/9) | 0.9877 | Verified Held-Out |
| Logistic Regression (Test) | LTM | Held-out Test (N=18) | 77.78% (14/18) | 77.78% | 77.78% (7/9) | 77.78% (7/9) | 0.9012 | Verified Held-Out |

**Auditor Remarks:**
- XGBoost is the verified research champion.
- **Sample Limitation Warning:** The held-out test cohort contains only 18 patients. While 94.44% accuracy is mathematically verified from saved predictions, small-sample variance is substantial ($\pm 5.56\%$ per sample). The cross-validation mean of **88.57%** is the clinically reliable performance estimate.

---

## 3. Module 02: PCOS Ultrasound Vision Classification

### Model Comparison Matrix (N=299 Unique Images)

| Model Name | Archetype | Protocol | Accuracy | Balanced Accuracy | Macro F1 | Dominant Follicle F1 | PCO F1 | Normal F1 | Peak VRAM |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **ResNet18 (Champion)** | **LTM** | **15-Fold Group CV (N=254)** | **85.42% ± 4.86%** | **84.53% ± 7.33%** | **85.42% ± 6.53%** | — | — | — | **~420 MB** |
| **ResNet18 (Held-out)** | **LTM** | **Held-out Test (N=45)** | **86.67% (39/45)** | **86.24%** | **87.70%** | **87.18% (17/21)** | **85.00% (17/18)** | **90.91% (5/6)** | **~420 MB** |
| MobileNetV3 (Held-out) | LTM | Held-out Test (N=45) | 80.00% (36/45) | 81.75% | 82.46% | 76.47% (13/21) | 80.00% (18/18) | 90.91% (5/6) | ~180 MB |

**Auditor Remarks:**
- ResNet18 outperforms MobileNetV3 by **+6.67 pp accuracy** and **+5.24 pp Macro F1** on the held-out test set.
- **Pseudo-Patient Grouping Caveat:** Grouping was conducted by connected components of near-duplicates (244 components), not patient hospital numbers.
- **Normal Class Fragility:** Only 6 Normal ultrasound images in held-out test (5 detected, 1 misclassified as PCO).

---

## 4. Module 03: Measles and Viral Skin Lesions (MCVSLD)

### Model Comparison Matrix (Historical Flawed vs. Corrected Grouped Split)

| Model & Evaluation Protocol | Archetype | Image Accuracy | Balanced Accuracy | Image Macro F1 | Family Accuracy | Family Macro F1 | Measles Family Recall | Research Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **ResNet18 Grouped (Primary)** | **LTM** | **84.65%** | **87.19%** | **84.22%** | **85.84%** | **85.73%** | **88.89% (8/9)** | **Certified Primary Demo** |
| MobileNetV3 Grouped | LTM | 81.15% | 84.04% | 81.56% | 86.73% | 87.34% | 100.0% (9/9) | Certified Secondary Demo |
| *ResNet18 Grouped Test (Held-out)* | *LTM* | *83.34%* | *85.09%* | *82.62%* | *85.09%* | *84.38%* | *75.00% (6/8)* | *Held-out Evaluation* |
| *MobileNetV3 Grouped Test* | *LTM* | *80.97%* | *81.64%* | *79.23%* | *85.96%* | *83.93%* | *75.00% (6/8)* | *Held-out Evaluation* |
| Historical ResNet18 (Random) | LTM | 99.10% | 99.05% | 99.08% | N/A | N/A | N/A | **DEFECTIVE (Contaminated)** |
| Historical MobileNetV3 (Random) | LTM | 98.40% | 98.32% | 98.35% | N/A | N/A | N/A | **DEFECTIVE (Contaminated)** |
| *Published ConvNeXt-Base (Paper)* | *PLB* | *99.82%* | — | *99.85%* | Unknown | Unknown | Unknown | Third-Party Paper Benchmark |
| *Published XceptMPX (Paper)* | *PLB* | *96.36–97.01%* | — | Unknown | Unknown | Unknown | Unknown | Third-Party Paper Benchmark |

**Auditor Remarks:**
- **Decisive Model Selection:** ResNet18 Grouped is the official primary model. It exceeds MobileNetV3 by **+3.50 pp image accuracy** (84.65% vs 81.15%) and **+2.66 pp image Macro F1** (84.22% vs 81.56%).
- **Statistical Equivalence on Families:** A paired McNemar test on validation family predictions yielded $p=1.000$ (no statistically significant difference). ResNet18 is retained for superior single-crop feature discrimination.
- **Tie-Breaking Verification:** In 3 validation family ties (`MSL_41_01`, `CPX_11_01`, `MPX_11_01`), tie-breaking by mean softmax confidence was validated.
- **Literature Boundary:** Third-party paper metrics (ConvNeXt-Base 99.82%) evaluated on random crops and likely suffer from the same variant leakage.

---

## 5. Module 04: Prescription OCR & Entity Extraction

### Pipeline Comparison Matrix

| Evaluation Pipeline | Archetype | Target Script | Corpus CER | Corpus WER | Exact Match | Heuristic Drug Recall | Safety Quarantine % |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **EasyOCR Audited Baseline (N=149)** | **PBP** | **English Narrative** | **96.69%** | **117.08%** | **0.00%** | **6.96%** | **92.11% (140/152)** |
| **EasyOCR Audited Baseline (N=149)** | **PBP** | **Bangla Narrative** | **103.34%** | **126.89%** | **0.00%** | **6.96%** | **92.11% (140/152)** |
| Patch V1 Demonstration (`0974.jpeg`) | PBP | Bilingual Mix | N/A (1 doc) | N/A (1 doc) | N/A | 100.0% (6/6 brands) | Passed Gate (Demo only) |

**Auditor Remarks:**
- Full-dataset OCR on handwritten prescriptions exhibits severe error rates (CER ~97%–103%).
- **Unsupported Claims Eliminated:** The "100% recall" observed in Patch V1 applies exclusively to a single high-contrast demonstration image (`0974.jpeg`). Across the 149 evaluated test prescriptions, medication recall remains an uncertified heuristic estimate (6.96%).
- **Safety Gate Verification:** The safety gate correctly quarantined **92.11%** of prescriptions for mandatory human clinician review.

---

## 6. Module 05: Bangla Voice AI Speech Recognition

### Benchmark Matrix (RTX 5060 Ti Live GPU Evaluation)

| Model Name | Archetype | Audio Subset | Normalized Corpus WER | Normalized Corpus CER | Bengali Unicode % | Exact Match Rate | Peak VRAM | Latency (Median) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **OpenAI Whisper-Base** | **PBP** | **Synthetic English** | **5.36%** | — | N/A | — | 341 MB | **184 ms** |
| OpenAI Whisper-Base | PBP | Bengali Smoke (N=6) | 117.33% | 99.31% | 0.00% | 0.00% | 341 MB | 389 ms |
| OpenAI Whisper-Base | PBP | Bengali Extended (N=20) | 266.01% | 187.96% | 0.00% | 0.00% | 341 MB | 389 ms |
| OpenAI Whisper-Tiny | PBP | Bengali Smoke (N=6) | 212.00% | 180.69% | 0.00% | 0.00% | 183 MB | 280 ms |
| **Whisper-Small Bengali (anuragshas)** | **EFC** | **Bengali Smoke (N=6)** | **33.33%** | **8.97%** | **97.68%** | **0.00%** | **1,097 MB** | **2,135 ms** |
| **Whisper-Small Bengali (anuragshas)** | **EFC** | **Bengali Extended (N=20)** | **40.15%** | **14.16%** | **98.58%** | **0.00%** | **1,097 MB** | **2,135 ms** |
| **Whisper-Small Bengali (Combined)** | **EFC** | **All Bengali (N=26)** | **39.09%** | **13.44%** | **98.37%** | **0.00%** | **1,097 MB** | **2,135 ms** |

**Auditor Remarks:**
- `anuragshas/whisper-small-bn` decisively resolves the zero-Unicode failure of OpenAI baselines (+98.37 pp Bengali Unicode, -203.74 pp normalized corpus WER).
- **Domain Scope:** Both sets of test clips originate from Google FLEURS (zero clinical terminology). Clinical entity recall is **`N/A`**.

---

## 7. Module 06: DermoPed Pediatric Dermatology

### Model Comparison Matrix (Patient-Locked Split, Seed=42)

| Experiment / Checkpoint | Archetype | Hardware | Validation Macro F1 | Val Chickenpox Recall | Val Pediculosis Recall | Test Image Accuracy | Test Patient Accuracy | Research Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **EXP_B Controlled v2** | **LTM** | **Tesla T4 (Colab)** | **57.76%** | **98.61%** | **15.00%** | **92.73% (102/110)** | **75.00% (3/4)** | **Verified Scientific Champion** |
| EXP_D Regularized v3 | LTM | Local PC (CPU) | 43.90% | 100.0% | 0.00% | 100.0% (110/110) | 100.0% (4/4) | **REJECTED (Severe Underfit)** |
| EXP_A Baseline v1 | LTM | Tesla T4 (Colab) | 54.31% | 98.61% | 10.00% | 90.91% (100/110) | 75.00% (3/4) | Superseded Baseline |

**Auditor Remarks:**
- **Champion Selection Integrity:** EXP_B is the genuine champion because it demonstrated non-zero feature learning on the rare class during validation (15.00% Pediculosis recall, Val Macro F1 = 57.76%). EXP_D collapsed into predicting only Chickenpox during validation (0% Pediculosis recall). Its 100% test score was an artifact of testing on a single visually trivial pediculosis patient.
- **Sample Limitation:** Only 3 pediculosis patients exist in the entire dataset ($n=3$). No claim of broad clinical readiness is permissible.
