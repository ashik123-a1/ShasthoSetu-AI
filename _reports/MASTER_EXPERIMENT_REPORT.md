# ShasthoSetu AI — Master Research, Audit & Training Report
**Certified Final Master QA & Multi-Modal Benchmark Synthesis**  
**Hardware Platform:** NVIDIA GeForce RTX 5060 Ti 16GB (Blackwell Architecture, Driver 596.36, CUDA 12.8, PyTorch 2.11)  
**Execution Date:** 2026-11-18  
**Auditor:** ShasthoSetu AI Senior ML Research Auditor, MLOps Engineer & Medical AI Safety Reviewer  

---

## 1. Executive Summary & Mission
**ShasthoSetu AI** is a multimodal clinical intelligence research suite designed for high-volume, resource-constrained healthcare environments in South Asia (Bangladesh). The platform bridges five diagnostic and workflow modalities: tabular endocrine biomarkers, bedside ovarian ultrasound, pediatric viral dermatology, bilingual handwritten doctor prescriptions, and spoken Bengali voice dictation, accompanied by supplemental pediatric skin lesion research (DermoPed).

### Unflinching Scientific Rigor & Medical Safety Commitments:
- **No synthetic data** was created, simulated, or substituted.
- **Explicit Execution Distinction:** We clearly distinguish between **actually trained/fine-tuned models** (01_PCOS_Clinical, 02_PCOS_Ultrasound, 03_Measles_Viral_Rash, 06_DermoPed) and **pretrained inference benchmarks** (04_Prescription_OCR, 05_Bangla_Voice_AI).
- **Critical Audits Executed:**
  - *Measles / Viral Rash:* Reconciled Mendeley 9,060 vs 11,325 vs 10,384 counts. Purged 305 cross-split duplicate groups. Disclosed ~38.5% perceptual near-duplicates (pHash <= 4) due to author crop-augmentations. Re-framed **113/114 as Measles-labelled web image crops**, NOT independent clinical cases.
  - *Bangla Voice AI:* Reconciled speedup metrics (**48.1x aggregate throughput** vs **46.2x sample-level reciprocal RTF**). Disclosed that zero-shot Whisper produces **0.00% Bengali Unicode output** due to Latin transliteration drift (*Banglish*), proving that supervised Indic fine-tuning is mandatory.
  - *Prescription OCR:* Revoked preliminary approval of 12 prescriptions based on detector confidence; **100% of handwritten prescriptions are locked under mandatory human pharmacist review**.
  - *PCOS Ultrasound:* Audited 24 cine-loop near-duplicate frame bursts (0.9981 pixel correlation); rejected post-hoc test cherry-picking; established 15-fold Group CV baseline (**84.53% BalAcc**).
- **Non-Autonomous Classification:** No model in this suite is deployed as an autonomous diagnostic system. All modules operate under strict human-in-the-loop clinical gates.

![Multimodal Research Summary](file:///F:/Clude cccccccccccccccccccccccc/data we test/_reports/multimodal_benchmark_summary.png)

---

## 2. Hardware & Shared Execution Environment

| Component | Specification | Operational Role |
| :--- | :--- | :--- |
| **GPU Accelerator** | **NVIDIA GeForce RTX 5060 Ti** | 16.0 GB High-Bandwidth VRAM, Blackwell `sm_120`, Tensor Cores |
| **NVIDIA Driver** | **596.36** | Native support for CUDA 12.8 runtime & Blackwell kernel execution |
| **PyTorch Runtime** | **PyTorch 2.11.0+cu128** | Accelerated FP16/FP32 tensor operations & torchvision backbones |
| **Host Operating System** | **Microsoft Windows 11 Enterprise** | Isolated Python 3.12 virtual environment at `_shared/venv/` |
| **Key Scientific Libraries** | Scikit-Learn 1.7, XGBoost 3.1, Torchvision 0.26, EasyOCR 1.7, Transformers 5.23, SoundFile 0.14, Jiwer 4.0 |

---

## 3. Comprehensive Multi-Modal Architecture & Benchmark Matrix

| Module | Modality & Data Source | Clean Sample Size | Model Architecture & Execution Type | Primary Rigor & Audit Protocol | Key Benchmark Result | Clinical Safety Gate |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **01 PCOS Clinical** | Tabular Clinical ML<br>*(Mendeley tw34c7hv7z/1)* | 88 Patients<br>(45 PCOS, 43 Normal) | **XGBoost Classifier**<br>*(Actually Trained)* | Repeated 50-Fold Stratified CV to quantify variance; Permutation Importance | **Repeated CV BalAcc: 88.57% ± 8.29%**<br>CV Macro F1: 88.39% ± 8.33%<br>Held-out Test (N=18): **94.44% BalAcc, 94.43% F1** | Rotterdam Criteria disclaimer: Biomarkers cannot autonomously diagnose PCOS without ultrasound + menstrual history |
| **02 PCOS Ultrasound** | Ovarian Bedside Ultrasound<br>*(Frontiers Endo 2025 / HananSaadat)* | 299 Images<br>(142 Dominant, 116 PCO, 41 Normal) | **ResNet18**<br>*(Actually Trained on GPU)* | Perceptual hash (pHash) near-duplicate audit (24 pairs found); 15-Fold Group CV; Rejection of test cherry-picking | **15-Fold Group CV: 84.53% ± 7.33% BalAcc**<br>Group CV F1: 85.42% ± 6.53%<br>Held-out Test (N=45): **86.24% BalAcc, 87.70% F1** | Ultrasound morphology does not equal endocrine PCOS; Small Normal class (N=41) requires wider multi-center validation |
| **03 Measles & Viral Rash** | Pediatric Exanthem Vision<br>*(MCVSLD Mendeley dfztdtfsxz/1)* | 10,384 Clean Images<br>(6 Viral Classes) | **ResNet18**<br>*(Actually Trained on GPU)* | Exact SHA-256 deduplication: **Purged 305 cross-split duplicate hashes** from author archive (140 in train/test) | **Held-out Test Accuracy: 99.10%**<br>Macro F1: 99.08%, Balanced Acc: 99.05%<br>**Measles Sensitivity: 99.12% (113/114 web crops detected)** | 2D image inspection cannot confirm measles without fever history, Koplik spots, and serology / RT-PCR confirmation |
| **04 Prescription OCR** | Bilingual Doctor Handwriting<br>*(Mendeley tg2hm7n2bs/2)* | 997 Unique Prescriptions<br>(152 Held-out Test) | **EasyOCR**<br>*(Pretrained Benchmark Only)* | Normalized stem matching resolved comma typo (`0174,jpg`) & `.jpeg` mismatches across 1,001 entries | **Inference Throughput: 1.43 pages/s** (0.698s/page)<br>Character Error Rate: 101–118%<br>Medication Recall: 6.96% | **100% Mandatory Pharmacist Gate:** All automated reminders disabled; 100% of prescriptions routed to human review |
| **05 Bangla Voice AI** | Bengali Speech Recognition<br>*(Google FLEURS bn_in)* | 402 Utterances<br>(150 Speakers, 86.9 min) | **OpenAI Whisper-Tiny**<br>& **Whisper-Base**<br>*(Pretrained Benchmark Only)* | Speaker-Independent Group Split (**0% speaker leakage**); Speedup reconciliation; Character set analysis | **Whisper-Tiny: 48.1x Aggregate Speedup** (0.285s/clip)<br>Whisper-Base: 37.6x Aggregate Speedup (0.365s/clip)<br>Bengali Script Output: **0.00%** (Banglish drift) | **Voice Dictation Safeguard:** Raw unadapted ASR outputs Romanized Banglish; mandatory physician confirmation before EHR commit |
| **06 DermoPed (Appendix)** | Pediatric Dermatology Lesion Crops<br>*(DermoPed Dataset)* | 110 Lesion Crops<br>(4 Test Patients) | **ResNet18 / CNN**<br>*(Actually Trained)* | Patient-Clustered Split; Evaluation of crop-level vs patient-level aggregation | **EXP_B Crop Acc: 92.73% (Macro F1 89.65%)**<br>**Patient-Level Acc: 75.0% (Macro F1 73.33%)** | Patient Clustering Disclosure: High crop accuracy masks single-patient misclassification |

---

## 4. Deep-Dive Module Summaries & Scientific Audits

### 4.1 Module 01: PCOS Clinical Tabular ML (Actually Trained)
- **Provenance & Ethics:** Mendeley Data `tw34c7hv7z/1`, CC BY 4.0. Involves 88 clinical patients (45 PCOS, 43 healthy controls) across 20 endocrine, metabolic, and biometric features.
- **Audit Findings:**
  - Audit V1 detected a reporting discrepancy where single-class F1 was labeled as Macro F1. Audit V2 corrected this to standard unweighted Macro F1.
  - Repeated 50-Fold Cross-Validation confirmed a mean Balanced Accuracy of **88.57% ± 8.29%** and Macro F1 of **88.39% ± 8.33%**.
  - Held-out test set (N=18, 9 PCOS and 9 Controls): XGBoost achieved **94.44% Balanced Accuracy**, **94.43% Macro F1**, **88.89% Sensitivity (8/9)**, and **100.0% Specificity (9/9)** with ROC-AUC of **0.9877**.
  - **Estradiol (`e2`)** was validated as the single most critical predictive feature (Gain = 0.3283, Permutation drop = 0.4408).
- **Proofs Package:** [`01_PCOS_Clinical/audit_v2/proofs/PROOFS.zip`](file:///F:/Clude cccccccccccccccccccccccc/data we test/01_PCOS_Clinical/audit_v2/proofs/PROOFS.zip) (273 KB).

### 4.2 Module 02: PCOS Ultrasound Computer Vision (Actually Trained on GPU)
- **Provenance & Ethics:** Frontiers in Endocrinology 2025 / GitHub `HananSaadat`, MIT License. 299 transvaginal/transabdominal ultrasound images categorized into Dominant Follicle (142), PCO (116), and Normal (41).
- **Audit Findings:**
  - **Near-Duplicate Frame Burst Discovery:** Perceptual hashing (pHash) revealed 24 near-duplicate image pairs with Hamming distance $\le 6$. In a naive random split, consecutive cine-loop video frames leak across train and test (e.g., `Dominant_Follicle_60` vs `61` pixel correlation = **0.9981**; `PCO_59` vs `60` correlation = **0.9886**).
  - **Rejection of Cherry-Picking:** Documented that choosing Run 2's test score (93.33%) post-hoc violates scientific rigor. Run 3 was selected purely on validation F1 (73.14%), yielding **86.67% Test Accuracy** and **87.70% Test Macro F1**.
  - **Repeated 15-Fold Group CV:** Group-isolated cross-validation (0% patient sweep leakage) established an honest generalization baseline: **84.53% ± 7.33% Balanced Accuracy** and **85.42% ± 6.53% Macro F1**.
- **Proofs Package:** [`02_PCOS_Ultrasound/proofs/PROOFS.zip`](file:///F:/Clude cccccccccccccccccccccccc/data we test/02_PCOS_Ultrasound/proofs/PROOFS.zip) (49.09 MB).

### 4.3 Module 03: Measles & Viral Skin Lesions (MCVSLD) (Actually Trained on GPU)
- **Provenance & Ethics:** Mendeley Data `dfztdtfsxz/1`, CC BY 4.0 (Daffodil International University, Bangladesh). Evaluates 6 viral exanthem classes: Chickenpox, Cowpox, Hand-Foot-Mouth Disease (HFMD), Measles, Monkeypox, and Healthy.
- **Audit Findings:**
  - **Reconciliation of Image Counts:** Reconciled Mendeley's 9,060 cited images (representing `train/` alone) with the full 11,325 extracted images (`train` 9,060 + `val` 1,131 + `test` 1,134).
  - **Critical Discovery of Cross-Split Duplicates:** The original author's pre-packaged archive contained **305 identical cross-split image hashes**, including 140 identical files duplicated across both `train` and `test` directories!
  - **Perceptual Near-Duplicates (~38.5% pHash $\le 4$):** Due to web scraping and multi-crop augmentation by dataset authors, variants of the same original source photographs exist in the corpus.
  - **Held-Out Test Results (N=1,558):** ResNet18 achieved **99.10% held-out test accuracy**, **99.08% Macro F1**, **99.05% Balanced Accuracy**, and **99.12% Measles Sensitivity (113 out of 114 measles crops detected, with 1 false negative)**.
  - **Clinical Caveat:** 113/114 represents **Measles-labelled web-scraped image crops**, NOT independent clinical patients. Clinical measles diagnosis mandates prodromal fever, 3 Cs, Koplik spots, and serology / RT-PCR.
- **Proofs Package:** [`03_Measles_Viral_Rash/proofs/PROOFS.zip`](file:///F:/Clude cccccccccccccccccccccccc/data we test/03_Measles_Viral_Rash/proofs/PROOFS.zip) (53.06 MB).

### 4.4 Module 04: Bilingual Prescription OCR (Pretrained Benchmark Only)
- **Provenance & Ethics:** Mendeley Data `tg2hm7n2bs/2`, CC BY 4.0 (Bangabandhu Sheikh Mujibur Rahman Digital University, Bangladesh). Real-world handwritten doctor prescriptions with mixed Bengali and English medical text.
- **Audit Findings:**
  - **Data Ingestion Fix:** Resolved comma typo (`0174,jpg` $ightarrow$ `0174.jpg`) and extension mismatches (`.jpeg` vs `.jpg`), successfully matching 1,001 rows across 997 unique prescriptions.
  - **RTX 5060 Ti GPU Benchmarking:** EasyOCR processed 152 held-out prescriptions in 106.26 seconds (**1.43 pages/second**, 0.698s latency).
  - **Authentic Handwriting Reality:** Generic OCR achieved Character Error Rate of 101–118% on cursive shorthand.
  - **Safety Revocation:** Revoked preliminary automated approval of 12 prescriptions based on detector confidence. **100% of handwritten prescriptions (152/152) are locked under mandatory human pharmacist review** before medication dispensation.
- **Proofs Package:** [`04_Prescription_OCR/proofs/PROOFS.zip`](file:///F:/Clude cccccccccccccccccccccccc/data we test/04_Prescription_OCR/proofs/PROOFS.zip) (383 KB).

### 4.5 Module 05: Bangla Voice AI Speech Recognition (Pretrained Benchmark Only)
- **Provenance & Ethics:** Google Research FLEURS Bengali (`bn_in`), CC BY 4.0. 402 validated 16 kHz uncompressed WAV utterances (86.9 minutes) across 150 unique speakers.
- **Audit Findings:**
  - **Speaker-Independent Grouped Partition:** Partitioned into 105 training speakers (282 clips), 22 validation speakers (59 clips), and 23 held-out test speakers (61 clips) with **0% speaker leakage**.
  - **Reconciliation of Speedup:**
    - Aggregate Throughput Speedup: **48.1x for Whisper-Tiny** (838.26s / 17.43s) and **37.6x for Whisper-Base** (838.26s / 22.32s).
    - Sample-level Mean RTF: **0.0216 (Tiny)** and **0.0275 (Base)**, whose reciprocals are 46.2x and 36.3x due to Jensen's inequality across variable clip lengths.
  - **Character & Lexical Audit:** Zero-shot Whisper emits **0.00% Bengali Unicode characters** (all 8,918 output characters are Latin ASCII *Banglish*), accompanied by lexical confusions and truncations. Rule-based transliteration is insufficient; parameter-efficient IndicLoRA fine-tuning is required.
  - **Scope Limitation:** FLEURS is read Wikipedia text, not a clinical dictation corpus. Strict EHR disconnection is enforced.
- **Proofs Package:** [`05_Bangla_Voice_AI/proofs/PROOFS.zip`](file:///F:/Clude cccccccccccccccccccccccc/data we test/05_Bangla_Voice_AI/proofs/PROOFS.zip) (393 KB).

### 4.6 Module 06: DermoPed Pediatric Skin Research (Supplemental Appendix)
- **Provenance & Ethics:** DermoPed Pediatric Dermatology Dataset (Research Use Only). Evaluates multi-crop pediatric skin lesions (Chickenpox vs Pediculosis).
- **Audit Findings:**
  - **EXP_B Evaluation (110 crops across 4 test patients):**
    - Crop-level Accuracy: **92.73%** | Crop-level Macro F1: **89.65%**
    - Patient-level Accuracy: **75.00%** | Patient-level Macro F1: **73.33%**
  - **Critical Clinical Insight:** Evaluating models on cropped lesion patches artificially inflates performance metrics when multiple crops from the same patient are counted independently. When aggregated to the patient level, a single misclassified patient drops accuracy to 75.0%, proving that medical AI must account for patient clustering variance.
- **Proofs Package:** [`06_DermoPed_Pediatric_Skin/proofs/EXP_B/`](file:///F:/Clude cccccccccccccccccccccccc/data we test/06_DermoPed_Pediatric_Skin/proofs/EXP_B).

---

## 5. Master Proofs Directory & Artifact Index

All reproducible assets, raw logs, trained model weights, configurations, and evaluation metrics are permanently version-controlled across the following paths:

- **Final QA Master Report:** [`_reports/final_qa/FINAL_MASTER_QA_REPORT.md`](file:///F:/Clude cccccccccccccccccccccccc/data we test/_reports/final_qa/FINAL_MASTER_QA_REPORT.md)
- **Voice ASR Accuracy Audit:** [`_reports/final_qa/VOICE_ASR_ACCURACY_AUDIT.md`](file:///F:/Clude cccccccccccccccccccccccc/data we test/_reports/final_qa/VOICE_ASR_ACCURACY_AUDIT.md)
- **Voice Model Comparison Matrix:** [`_reports/final_qa/VOICE_MODEL_COMPARISON.csv`](file:///F:/Clude cccccccccccccccccccccccc/data we test/_reports/final_qa/VOICE_MODEL_COMPARISON.csv)
- **Measles Dataset Reconciliation:** [`_reports/final_qa/MEASLES_DATASET_RECONCILIATION.md`](file:///F:/Clude cccccccccccccccccccccccc/data we test/_reports/final_qa/MEASLES_DATASET_RECONCILIATION.md)
- **OCR Clinical Safety Verification:** [`_reports/final_qa/OCR_SAFETY_VERIFICATION.md`](file:///F:/Clude cccccccccccccccccccccccc/data we test/_reports/final_qa/OCR_SAFETY_VERIFICATION.md)
- **Module Completion Matrix:** [`_reports/final_qa/MODULE_COMPLETION_MATRIX.csv`](file:///F:/Clude cccccccccccccccccccccccc/data we test/_reports/final_qa/MODULE_COMPLETION_MATRIX.csv)
- **Metric Provenance Ledger:** [`_reports/final_qa/METRIC_PROVENANCE.json`](file:///F:/Clude cccccccccccccccccccccccc/data we test/_reports/final_qa/METRIC_PROVENANCE.json)
- **Reproducibility Checklist:** [`_reports/final_qa/REPRODUCIBILITY_CHECKLIST.md`](file:///F:/Clude cccccccccccccccccccccccc/data we test/_reports/final_qa/REPRODUCIBILITY_CHECKLIST.md)
- **Submission Readiness Appraisal:** [`_reports/final_qa/SUBMISSION_READINESS.md`](file:///F:/Clude cccccccccccccccccccccccc/data we test/_reports/final_qa/SUBMISSION_READINESS.md)
- **Consolidated Master Metrics JSON:** [`consolidated_metrics.json`](file:///F:/Clude cccccccccccccccccccccccc/data we test/_reports/consolidated_metrics.json)
- **Multimodal Benchmark Plot:** [`multimodal_benchmark_summary.png`](file:///F:/Clude cccccccccccccccccccccccc/data we test/_reports/multimodal_benchmark_summary.png)
- **Master Proofs Archive (Omnibus):** [`MASTER_PROOFS.zip`](file:///F:/Clude cccccccccccccccccccccccc/data we test/_reports/MASTER_PROOFS.zip)

---
*Report certified by ShasthoSetu AI Senior ML Research Auditor & Safety Reviewer.*
