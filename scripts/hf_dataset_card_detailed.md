---
language:
- bn
- en
license: cc-by-nc-sa-4.0
tags:
- healthcare
- clinical-telemedicine
- bangla-nlp
- bangla-voice
- medical-imaging
- prescription-ocr
- pcos
- pediatric-dermatology
- zero-phi
- bangladesh
task_categories:
- tabular-classification
- image-classification
- automatic-speech-recognition
- text-retrieval
- visual-question-answering
pretty_name: ShasthoSetu AI — Curated Clinical Research Datasets & Benchmarks
size_categories:
- 10K<n<100K
---

# 🩺 ShasthoSetu AI: Multilingual Clinical Telemedicine & Diagnostic Research Datasets

[![Hugging Face Dataset](https://img.shields.io/badge/%F0%9F%A4%97%20Hugging%20Face-Dataset-blue)](https://huggingface.co/datasets/ashik1236/shasthosetu-clinical-datasets)
[![Zero-PHI Verified](https://img.shields.io/badge/Privacy-Zero--PHI%20Scrubbed-emerald)](#-zero-phi-privacy--data-sanitization)
[![Clinical Audit](https://img.shields.io/badge/Audit%20Lock-100%25%20Verified-cyan)](#-cryptographic-audit-lock--provenance)
[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

**Primary Clinical & Geographic Context:** Bangladesh (Gazipur, Dhaka Medical College Hospital, Sir Salimullah Medical College, Rajshahi, Khulna, Chittagong, Sylhet, Barisal, Rangpur)  
**Total Curated Artifacts:** **35,641 files** across 7 audited research directories  
**Companion Web Platform:** [ShasthoSetu AI Clinical Telemedicine](https://github.com/ASHIK311)  

---

## 📌 Executive Overview

This repository hosts the canonical, cryptographically audited clinical datasets, ultrasound scans, dermatological lesion crops, handwritten doctor prescriptions, and Bengali acoustic speech benchmarks supporting **ShasthoSetu AI (স্বাস্থ্যসেতু এআই)**. 

Unlike unverified synthetic corpora, every partition in this collection has been audited against **cross-split patient leakage**, **perceptual image duplication (pHash)**, and **direct personal health identifier (PHI) exposure**, accompanied by SHA-256 checksums and reconciliation code.

---

## 🔬 Dataset Modules & Directory Contents (~35,641 Files)

### 1. `final_audit_lock/` (Cryptographic Governance & Audit Sign-Off)
Contains authoritative reconciliation manifests, frozen verification scripts, and SHA-256 hashes:
* **`FINAL_AUDIT_SIGNOFF.md`**: Official audit verdict (`RESEARCH_AUDIT_PASS_WITH_LIMITATIONS`) locking verified performance baselines.
* **`FINAL_EVIDENCE_RECONCILIATION.md`**: Master reconciliation table across all 6 diagnostic and NLP modules.
* **`CORRECTED_DATASET_COUNTS.csv`**: Discrepancy-free record counts verified against disk storage.
* **`DERMOPED_PATIENT_CHECKPOINT_VERIFICATION.csv`**: Patient-level tracking for 22 pediatric patients and checkpoint hashes.
* **`FINAL_RESEARCH_MODEL_REGISTER.csv`**: Complete manifest of 16 frozen clinical models with SHA-256 checksums.
* **`verify_final_lock.py`**: Standalone Python test suite executing 7 read-only cryptographic validation tests.

### 2. `01_pcos_clinical/` (Tabular PCOS Metabolic & Hormonal Biomarkers)
* **`pcos_clinical_cleaned.csv`**: Cleaned, missingness-imputed, and standardized clinical cohort ($N = 88$ patients, 44 features).
* **Biomarkers Tracked**: BMI, Cycle regularity ($R/I$), Follicle counts (L & R), LH/FSH ratio, Anti-Müllerian Hormone (AMH), Hirsutism score, fasting glucose, and blood pressure.
* **Integrity Hash**: `3e38331357da3c4dd3a48e89f8d95eb07f0bb1d6e87f1bf2491bb4d44aa54661` (11,919 bytes).

### 3. `02_pcos_ultrasound/` (B-Mode Transvaginal Ultrasound Scans)
* **`data/processed/`**: 299 high-resolution ovarian B-mode ultrasound images categorized into *Infected / Cystic* and *Normal*.
* **Perceptual Deduplication**: Filtered via 64-bit difference hashing (`pHash`) to eliminate repeated scan frames from the same patient ultrasound sweep.
* **Manifests**: `dataset_manifest.csv` and `split_manifest.csv` defining deterministic 80/20 train/test partitions.

### 4. `03_viral_rash_grouped/` (MCVSLD Clean Grouped Split, ~10,384 Crops)
* **Viral Classes (6 Categories)**: Measles (*হাম*), Chickenpox (*জলবসন্ত*), Monkeypox, Cowpox, Hand-Foot-and-Mouth Disease (HFMD), and Healthy Skin.
* **Source-Photo Family Grouping**: Grouped into **755 unique source-photo families** (528 train, 113 val, 114 test).
* **Leakage Resolution**: Eliminates cross-split contamination where multiple cropped patches of the same physical lesion previously leaked across train and test sets.

### 5. `04_prescription_ocr/` (Gazipur Doctor Prescription Dataset)
* **`final_integration/`**: Full 1,000-prescription accounting from primary healthcare facilities in Gazipur, Bangladesh.
* **Breakdown**: 992 admissible prescriptions + 8 quarantined records (including unannotated `0747.jpeg` and low-contrast specimens).
* **Splits**: 697 train + 150 validation + 152 test ($N = 149$ admissible test images).
* **Annotations**: Bounding boxes, medicine line tokens, dosage frequencies, and doctor instructions in mixed Bengali and English script.

### 6. `05_bangla_voice_benchmark/` (Google FLEURS Bengali Acoustic Evaluation)
* **`pretrained_bengali_comparison/task_03_2/`**: 26 human audio clips (.wav) across 22 unique reference sentences and 22 native Bengali speakers.
* **Provenance**: Derived from the Google FLEURS Bengali benchmark to evaluate ASR phonetic robustness.
* **Per-Sample Telemetry**: `per_sample_predictions.csv` documenting normalized Word Error Rate (38.23% Sample-Avg Norm WER) and 98.37% Bengali Unicode integrity.

### 7. `06_dermoped_pediatric_crops/` (Pediatric Skin Lesions, 656 Crops)
* **Patient Diversity**: 22 pediatric patients (19 Chickenpox, 3 Pediculosis: `pt72`, `pt71`, `pt74`).
* **Artifact Checkpoints**: Verified weights for EXP_B (`5a98479c...`, 44.79 MB) and EXP_D (`e9ef59b4...`, 44.78 MB).

---

## 🏛️ Exact Data Provenance & Acquisition Sources

Where did these datasets come from? Full scientific source attribution:

| Module | Primary Source / Acquisition Centre | Geographic Origin | Ethical & Consent Standard | Original Format |
|---|---|---|---|---|
| **01_PCOS_Clinical** | Kottayam Medical College / Mendeley Clinical Cohort | South Asian Regional Hospital | De-identified clinical telemetry; ethical institutional sign-off | Tabular CSV / Clinical Chart |
| **02_PCOS_Ultrasound** | Gynecology & Obstetrics Imaging Archive | Diagnostic Ultrasound Wing | Fully anonymized DICOM to PNG; zero patient facial/PII exposure | B-Mode 2D Ultrasound |
| **03_Measles_Viral_Rash** | MCVSLD Multi-Centre Viral Skin Registry | Global & Regional Clinical Dermatology | De-identified clinical lesion photography | High-resolution macro photos |
| **04_Prescription_OCR** | Mendeley Doctor Prescription Dataset (Gazipur Centres) | Gazipur & Dhaka Districts, Bangladesh | Patient names & phones scrubbed; real clinic prescription slips | 300 DPI Scanner & Mobile Photos |
| **05_Bangla_Voice_AI** | Google FLEURS (Few-shot Learning Evaluation of Universal Representations of Speech) | Bangladesh Native Bengali Speakers | Open-licensed speech corpus (CC-BY 4.0) | 16 kHz Mono WAV Audio |
| **06_DermoPed_Pediatric** | Pediatric Clinical Dermatology Registry | Clinical Hospital Ward | Pediatric guardian-consented de-identified lesion imagery | High-magnification crops |

---

## 📊 Verified Scientific Benchmarks & Model Evaluation

The table below reflects **honest, audited research metrics** locked in `SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT`:

| Diagnostic Module | Architecture / Model | Evaluation Metric | Audited Score | Baseline / Caveat |
|---|---|---|:---:|---|
| **PCOS Clinical** | XGBoost (`M01-XGB-01`) | Accuracy / F1 | **94.44% / 0.9412** | 17/18 balanced holdout patients |
| **PCOS Ultrasound** | ResNet-18 (`M02-RESNET-01`) | Balanced Accuracy | **86.67%** | 299 pHash-deduplicated scans |
| **Viral Skin Rash** | ResNet-18 Grouped (`M03-RESNET-GROUPED-01`) | Grouped Accuracy | **84.65%** | Quarantined inflated 99.1% checkpoint; honest 755-family split |
| **Prescription OCR** | EasyOCR + LayoutLM (`M04-EASYOCR-PIPELINE-01`) | Line Parsing Rate | **91.20%** | Ambiguous cases rejected via **HTTP 422** Human Gate |
| **Bangla Voice ASR** | Whisper-Small Bengali (`M05-WHISPER-SMALL-BN-03`) | Norm WER / Unicode | **38.23% / 98.37%** | Solved 0% Bengali loop error in vanilla OpenAI Whisper |
| **Pediatric Rash** | DermoPed EXP_B (`M06-EXP-B-01`) | Macro F1 | **82.35%** | $N=22$ caveat: Research preview; blocked from automated prescription |
| **Hybrid RAG** | BM25 + BGE-M3 + Qwen 2.5 7B | MRR / Hit@3 | **0.9750 / 1.0000** | Strict 999 hotline emergency exit & BMDC source citation |

---

## 🛡️ Zero-PHI Privacy & Data Sanitization

To ensure complete adherence to medical ethics and the **Bangladesh Medical & Dental Council (BMDC)** guidelines:
1. **Name Masking**: All patient names have been removed or replaced with synthetic cohort IDs (`PATIENT_001` .. `PATIENT_088`).
2. **Phone Number Redaction**: All doctor prescription images have phone numbers blurred or syntheticized as `+880 17•• •••12`.
3. **National ID (NID) & Address Removal**: Doctor serial numbers and patient home addresses are permanently obfuscated.
4. **Mandatory Non-Prescribing Disclaimer**: This data is released strictly for research benchmarking. Models trained on this dataset must never generate unverified prescription orders without registered physician authorization.

---

## 💻 How to Load & Use with Python

### 1. Download via Hugging Face Hub (Recommended)
```python
from huggingface_hub import snapshot_download

# Download entire dataset repository locally (~2.5 GB)
dataset_path = snapshot_download(
    repo_id="ashik1236/shasthosetu-clinical-datasets",
    repo_type="dataset",
    local_dir="./shasthosetu_data",
)
print(f"Dataset downloaded to: {dataset_path}")
```

### 2. Loading Individual Tabular & Manifest Files with Pandas
```python
import pandas as pd
from huggingface_hub import hf_hub_download

# Load audited PCOS Clinical biomarkers
pcos_file = hf_hub_download(
    repo_id="ashik1236/shasthosetu-clinical-datasets",
    filename="01_pcos_clinical/pcos_clinical_cleaned.csv",
    repo_type="dataset",
)
df_pcos = pd.read_csv(pcos_file)
print("PCOS Cohort Shape:", df_pcos.shape)
print("Features:", df_pcos.columns[:10])
```

### 3. CLI Download
```bash
# Using the official Hugging Face CLI
hf download ashik1236/shasthosetu-clinical-datasets --repo-type dataset --local-dir ./shasthosetu_clinical_data
```

---

## 📖 Citation & Academic Attribution

If you utilize this dataset in academic research, clinical AI development, or benchmarking competitions, please cite:

```bibtex
@dataset{shasthosetu_ai_2026,
  author       = {ShasthoSetu AI Research Team},
  title        = {ShasthoSetu AI: Curated Clinical Research Datasets, Ultrasound Scans, and Bengali Telemedicine Benchmarks},
  year         = {2026},
  publisher    = {Hugging Face},
  howpublished = {\url{https://huggingface.co/datasets/ashik1236/shasthosetu-clinical-datasets}},
  note         = {Audited provenance with 755-family grouped splits, pHash deduplication, and Zero-PHI compliance}
}
```

---

## 📜 License
This dataset collection is released under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)** license. It is intended for non-commercial research, academic benchmarking, and healthcare innovation.
