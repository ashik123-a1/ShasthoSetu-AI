# 04 — Benchmark Claim Forensic Validation Report
**Task ID:** `HF-DATASET-PROVENANCE-AUDIT-01`  
**Repository Target:** `ashik1236/shasthosetu-clinical-datasets`  
**Audit Standard:** Master SRS v1.0 Section 21 & `SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT`  
**Date:** November 20, 2026  
**Auditor:** Principal AI Evaluation Engineer & Biostatistician  

---

## 1. Executive Summary

Every machine learning benchmark and clinical accuracy claim published on the Hugging Face dataset card was audited against the frozen, tamper-proof audit records in `SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/INDEPENDENT_METRIC_VERIFICATION.json` and on-disk model artifacts.

All metrics published by ShasthoSetu AI are mathematically genuine and reproducible from frozen weights. However, **sample sizes, clinical bottlenecks, and evaluation constraints must be explicitly disclosed** to prevent over-interpreting research prototypes as clinical diagnostic systems.

---

## 2. Comprehensive Model Benchmark Validation Table

| Module ID | Model Checkpoint | Evaluation Metric | Audited Score | Evaluation Sample Size | Independence Level | Independent Reproduction Status | Critical Clinical Bottlenecks & Limitations |
|---|---|---|:---:|---|---|:---:|---|
| **01_PCOS_Clinical** | `M01-XGB-01` (XGBoost) | Held-out Accuracy / Balanced Acc / Macro F1 | **94.44% / 94.44% / 0.9443** | $N=18$ patients (9 PCOS, 9 Control) | Verified Patient-Level | **VERIFIED** (17/18 correct) | Extremely small held-out test cohort ($N=18$). A single patient error shifts test accuracy by $\pm 5.56\%$. 50-fold repeated CV mean balanced accuracy is **88.57% ($\pm 8.29\%$)**. |
| **02_PCOS_Ultrasound** | `M02-RESNET-01` (ResNet-18) | Held-out Balanced Acc / Macro F1 | **86.24% / 87.70%** | $N=45$ images (21 Dominant, 18 PCO, 6 Normal) | Pseudo-Patient Grouping (pHash) | **VERIFIED** (39/45 correct) | Severe class imbalance: only 6 Normal images in test set. Zero patient hospital IDs; visual grouping only. Ultrasound appearance alone does NOT diagnose PCOS without Rotterdam criteria. |
| **03_Measles_Viral_Rash** | `M03-RESNET-GROUPED-01` (ResNet-18 Grouped) | Grouped Family Accuracy / Image Acc | **85.09% / 83.34%** | 114 test families (1,561 crops) | Source-Photo Family Level | **VERIFIED** (97/114 families correct) | Quarantined the author-reported 99.1% leaky baseline. Grouped accuracy on held-out families is honest 85.09%. Web-scraped photos lack RT-PCR or laboratory confirmation. |
| **04_Prescription_OCR** | `M04-EASYOCR-PIPELINE-01` (EasyOCR + LayoutLM) | Line Parsing Rate / Safety Gate Quarantine | **91.20% / 92.11%** | $N=149$ test prescriptions (out of 152) | Image-Level | **VERIFIED** (140/152 quarantined) | Mendeley v2 provides zero bounding-box or token annotations. Raw CER is high (~0.97–1.03). 92.11% of prescriptions fail OCR confidence and are routed to HTTP 422 human gate. |
| **05_Bangla_Voice_AI** | `M05-WHISPER-SMALL-BN-03` (Fine-tuned Whisper) | Normalized WER / Bengali Unicode | **39.09% / 98.37%** | 26 human Bengali clips (22 sentences, 22 speakers) | Speaker-Independent | **VERIFIED** (39.09% Norm WER) | General-domain FLEURS sentences contain zero clinical terms (Clinical recall = N/A). Outperformed vanilla OpenAI Whisper, which completely collapsed (0% Unicode, 242.8% WER). |
| **06_DermoPed_Pediatric** | `M06-EXP-B-01` (Champion) / `M06-EXP-D-01` (Regularized) | Val Macro F1 / Test Patient Acc | **57.76% (EXP_B) / 100.0% (EXP_D)** | Val: 4 patients (92 crops); Test: 4 patients (110 crops) | Verified Patient-Level | **VERIFIED** (EXP_D: 4/4 test patients) | **CRITICAL LIMITATION:** The entire dataset contains only 3 pediculosis patients in total ($N=3$). Validation recall swings violently ($0\%$ to $100\%$). Strictly an architectural proof-of-concept. |
| **Hybrid Clinical RAG** | BM25 + BGE-M3 + Qwen 2.5 7B | MRR / Hit@1 / Hit@3 | **0.9750 / 0.9500 / 1.0000** | 20 bilingual clinical queries (DGHS/WHO) | Query-Level Synthetic Gold | **VERIFIED** (MRR = 0.9750) | Grounded retrieval strictly bounds generation. Safety guardrails enforce 999 hotline emergency exit on red-flag conditions. |

---

## 3. Discrepancy Reconciliation vs Previous Drafts

### 3.1 PCOS Clinical
- **Draft Claim:** "94.44% Accuracy / 0.9412 F1".
- **Audited Truth:** Exactly verified in `01_PCOS_Clinical/audit_v2/outputs/metrics.json`. XGBoost achieved 94.44% accuracy (17/18 correct; 8 TP, 9 TN, 1 FN, 0 FP). However, the draft failed to emphasize that this test set contains only 18 individuals. The 50-fold cross-validation balanced accuracy of **88.57%** is the more robust scientific estimate.

### 3.2 Measles Viral Rash (MCVSLD)
- **Draft Claim:** "Grouped Accuracy 84.65%".
- **Audited Truth:** 84.65% is the image-level accuracy on the **validation partition** (113 families, 1,544 crops). On the **held-out test set** (114 families, 1,561 crops), ResNet-18 Grouped achieved **83.34% image accuracy** and **85.09% family accuracy** (97/114 families correct). Both metrics are verified in `VALIDATION_METRICS_VERIFIED.json`.

### 3.3 Prescription OCR
- **Draft Claim:** "Line Parsing Rate 91.20%".
- **Audited Truth:** The 91.20% figure represents heuristic text block extraction on clean, high-contrast prescription segments. When evaluated across the full unconstrained 149 test images against clinical medication recognition standards, **140 out of 152 prescriptions (92.11%) were safely rejected by the HTTP 422 human verification gate**. Presenting "91.20% OCR accuracy" without the 92.11% quarantine rate creates an inaccurate impression of clinical readiness.

### 3.4 DermoPed Pediatric Dermatology
- **Draft Claim:** "Macro F1 82.35%".
- **Audited Truth:** In `06_DermoPed_Pediatric_Skin/audit_v3/metric_recalculation.json`, the champion model (EXP_B) achieved a validation Macro F1 of **57.76%** (due to pediculosis class scarcity) and test image Macro F1 of **89.65%** (image accuracy 92.73%). The regularized model (EXP_D) achieved **100% test patient accuracy** (4/4 patients), but validation pediculosis recall dropped to 0%. The draft claim of 82.35% conflated intermediate experimental runs.
