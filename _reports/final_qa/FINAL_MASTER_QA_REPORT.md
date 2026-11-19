# ShasthoSetu AI — Final Master Research QA & Audit Report
**Auditor:** Senior ML Research Auditor, MLOps Engineer & Medical AI Safety Reviewer  
**Platform:** ShasthoSetu AI Multimodal Clinical Intelligence Suite  
**Hardware Platform:** NVIDIA GeForce RTX 5060 Ti 16GB (Blackwell sm_120, Driver 596.36, CUDA 12.8, PyTorch 2.11)  
**Host Environment:** Microsoft Windows 11 Enterprise | Isolated Virtual Environment `_shared/venv/`  
**Audit Completion Date:** 2026-11-18  

---

## 1. Executive QA Synthesis

An exhaustive, multi-phase technical audit of all research and engineering artifacts across `data we test/` was conducted to resolve four critical inconsistencies, verify hardware execution, and establish an unassailable scientific and clinical evidence base for **ShasthoSetu AI**.

### Core Audit Outcomes:
1. **Speed & Latency Discrepancy Resolved:** The discrepancy between reported speedup (46.2x/36.3x) and aggregate throughput (48.1x/37.6x) was traced to sample-level mean reciprocal RTF versus aggregate throughput ($\sum \text{Audio}/\sum \text{Latency}$). Both metrics are mathematically proven and documented.
2. **Bengali Voice AI Character & Lexical Audit:** Audited 61 held-out utterances; confirmed **0.00% Bengali Unicode output** in zero-shot Whisper predictions due to Latin transliteration drift (*Banglish*). Confirmed that lexical confusions and word truncations occur, proving that a post-hoc transliteration converter cannot solve the problem without supervised Indic fine-tuning.
3. **Measles Count Reconciliation & Augmentation Disclosure:** Reconciled Mendeley's 9,060 cited images (which represents `train/` alone) with the full 11,325 extracted images and 10,384 clean unique hashes. Purged 305 cross-split duplicate groups. Disclosed that ~38.5% of sample images share near-duplicate perceptual hashes due to web scraping and multi-crop augmentation by dataset authors. Re-framed **113/114 as Measles-labelled web images**, NOT independent clinical cases.
4. **Prescription OCR Safety Revocation:** Revoked the preliminary automated approval of 12 prescriptions based on detector confidence. Locked **100% of test prescriptions (152/152) under mandatory human pharmacist review** and disabled all automatic reminders.
5. **Execution Classification:** Explicitly distinguished between **actually trained/fine-tuned models** (01_PCOS_Clinical, 02_PCOS_Ultrasound, 03_Measles_Viral_Rash, 06_DermoPed) and **pretrained inference benchmarks** (04_Prescription_OCR, 05_Bangla_Voice_AI).
6. **Supplemental Pediatric Dermatology:** Added `06_DermoPed_Pediatric_Skin` (EXP_B & EXP_D) as a technical appendix documenting crop-level (89.65% F1) vs patient-level (73.33% F1) variance across 4 test patients.

---

## 2. Multi-Modal Quality & Traceability Matrix

| Module | Modality | Clean Sample Size | Model & Execution Status | Rigorous Evaluation Metric | Verified Result | Clinical Safety Gate | Provenance Status |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :---: |
| **01 PCOS Clinical** | Tabular Clinical ML | 88 Patients | **XGBoost**<br>*(Actually Trained)* | Repeated 50-Fold Stratified CV<br>Permutation Feature Importance | **Repeated CV BalAcc: 88.57% ± 8.29%**<br>Held-out Test (N=18): **94.44% BalAcc, 94.43% F1** | Endocrine disclaimer: Biomarkers cannot diagnose PCOS without pelvic ultrasound + cycle history | Complete (Audit V2) |
| **02 PCOS Ultrasound** | Bedside Ovarian Ultrasound | 299 Images | **ResNet18**<br>*(Actually Trained on GPU)* | 15-Fold Repeated Group CV<br>(0% frame burst leakage) | **15-Fold Group CV: 84.53% ± 7.33% BalAcc**<br>Held-out Test (N=45): **86.24% BalAcc, 87.70% F1** | Ultrasound morphology does not equal systemic PCOS; requires clinical gynecologist correlation | Complete (Audit V2) |
| **03 Measles / Viral Rash** | Pediatric Viral Exanthem | 10,384 Images | **ResNet18**<br>*(Actually Trained on GPU)* | Exact SHA-256 Deduplication<br>(305 duplicate groups purged) | **Held-out Test (N=1,558): Acc 99.10%, F1 99.08%**<br>**Measles Sensitivity: 99.12% (113/114 detected)** | 2D image classifier cannot confirm measles without fever, Koplik spots, and serological IgM/PCR | Complete & Audited |
| **04 Prescription OCR** | Bilingual Doctor Handwriting | 997 Prescriptions | **EasyOCR**<br>*(Pretrained Benchmark Only)* | Character & Word Error Rate<br>Medication Entity Recall | **GPU Latency: 0.698s (1.43 pages/s)**<br>Mean CER: 101.07%–118.4%<br>Medication Recall: 3.12%–6.96% | **100% Mandatory Pharmacist Gate:** All auto-reminders disabled; all 152 test prescriptions quarantined | Baseline Benchmarked |
| **05 Bangla Voice AI** | Bengali Speech Recognition | 402 Utterances<br>(86.9 min) | **Whisper-Tiny & Base**<br>*(Pretrained Benchmark Only)* | Speaker-Independent Split<br>Character Set & RTF Audit | **Throughput: 48.1x (Tiny) & 37.6x (Base)**<br>Peak VRAM: 182.8 MB & 335.0 MB<br>Bengali Unicode Char Proportion: **0.00%** | **Strict EHR Disconnection:** Raw unadapted speech recognition must not commit to medical records | Baseline Benchmarked |
| **06 DermoPed (Appendix)** | Pediatric Dermatology | 110 Lesion Crops | **ResNet18 / CNN**<br>*(Actually Trained)* | Patient-Clustered Split<br>(Crop vs Patient Evaluation) | **EXP_B Crop Acc: 92.73% (F1 89.65%)**<br>**Patient-Level Acc: 75.0% (F1 73.33%)** | Patient clustering disclosure: High crop accuracy masks single-patient clinical misclassification | Supplemental Appendix |

---

## 3. Directory of Audited Proof Deliverables

All updated and verified artifacts are accessible in `_reports/final_qa/`:
- **Voice ASR Accuracy Audit:** [`VOICE_ASR_ACCURACY_AUDIT.md`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/_reports/final_qa/VOICE_ASR_ACCURACY_AUDIT.md)
- **Voice Model Comparison Matrix:** [`VOICE_MODEL_COMPARISON.csv`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/_reports/final_qa/VOICE_MODEL_COMPARISON.csv)
- **Measles Dataset Reconciliation:** [`MEASLES_DATASET_RECONCILIATION.md`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/_reports/final_qa/MEASLES_DATASET_RECONCILIATION.md)
- **OCR Clinical Safety Verification:** [`OCR_SAFETY_VERIFICATION.md`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/_reports/final_qa/OCR_SAFETY_VERIFICATION.md)
- **Module Completion Matrix:** [`MODULE_COMPLETION_MATRIX.csv`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/_reports/final_qa/MODULE_COMPLETION_MATRIX.csv)
- **Metric Provenance Ledger:** [`METRIC_PROVENANCE.json`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/_reports/final_qa/METRIC_PROVENANCE.json)
- **Reproducibility Checklist:** [`REPRODUCIBILITY_CHECKLIST.md`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/_reports/final_qa/REPRODUCIBILITY_CHECKLIST.md)
- **Submission Readiness Appraisal:** [`SUBMISSION_READINESS.md`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/_reports/final_qa/SUBMISSION_READINESS.md)

---
*Autonomous QA Audit completed and certified by ShasthoSetu AI Senior Research Auditor.*
