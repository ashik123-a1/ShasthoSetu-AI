---
language:
- bn
- en
license: other
license_name: mixed-upstream-open-access
license_link: https://creativecommons.org/licenses/by/4.0/
tags:
- healthcare
- clinical-telemedicine
- bangla-nlp
- bangla-voice
- medical-imaging
- prescription-ocr
- pcos
- pediatric-dermatology
- zero-phi-heuristic
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

# 🩺 ShasthoSetu AI: Multilingual Clinical Telemedicine & Diagnostic Research Benchmarks

[![Hugging Face Dataset](https://img.shields.io/badge/%F0%9F%A4%97%20Hugging%20Face-Dataset-blue)](https://huggingface.co/datasets/ashik1236/shasthosetu-clinical-datasets)
[![Privacy Protocol](https://img.shields.io/badge/Privacy-Heuristic%20Zero--PHI%20Masking-emerald)](#-privacy-governance--heuristic-de-identification)
[![Audit Status](https://img.shields.io/badge/Audit-Reproducible%20Baselines-cyan)](#-verified-scientific-benchmarks--limitations)
[![License: Mixed Open Access](https://img.shields.io/badge/License-Mixed%20CC%20BY%204.0%20Upstream-lightgrey.svg)](#-licensing--per-component-attribution)

**Primary Clinical & Geographic Context:** Bangladesh (Gazipur, Dhaka, Rajshahi, Khulna, Chittagong, Sylhet, Barisal, Rangpur)  
**Total Repository Artifacts:** **35,641 files** (~2.03 GiB / 2.18 GB) across 7 audited research directories  
**Companion Web Platform:** [ShasthoSetu AI Clinical Telemedicine](https://github.com/ASHIK311)  

---

## 📌 Executive Overview

This repository hosts the canonical, cryptographically audited clinical datasets, ultrasound scans, dermatological lesion crops, handwritten doctor prescriptions, and Bengali acoustic speech benchmarks supporting **ShasthoSetu AI (স্বাস্থ্যসেতু এআই)**. 

Unlike unverified synthetic corpora, every partition in this collection has been audited against **cross-split patient leakage**, **perceptual image duplication (pHash)**, and **direct personal health identifier (PHI) exposure**, accompanied by SHA-256 checksums and reconciliation code.

> [!NOTE]
> **Research-Only Disclaimer:** This dataset collection is published exclusively for academic benchmarking, machine learning reproducibility, and clinical AI safety research. It does NOT constitute a certified medical diagnostic device or automated prescribing system.

---

## 🔬 Dataset Modules & Directory Contents (35,641 Files, 2.03 GiB)

The repository file inventory is partitioned into 7 audited modules:

```
shasthosetu-clinical-datasets/
├── final_audit_lock/                 # 6 files (0.05 MB) — SHA-256 verification manifests & audit sign-off
├── 01_pcos_clinical/                 # 1 file (0.01 MB)  — N=88 standardized clinical biomarker cohort (Sfax Hospital)
├── 02_pcos_ultrasound/               # 2 files (0.08 MB) — N=299 pHash-deduplicated ovarian ultrasound manifests
├── 03_viral_rash_grouped/            # 11,329 files (327.1 MB) — 6-class viral lesions partitioned by 751 photo families
├── 04_prescription_ocr/              # 43 files (0.28 MB) — Gazipur prescription manifests, OCR logs & 422 gate audits
├── 05_bangla_voice_benchmark/        # 9 files (0.08 MB)  — Google FLEURS Bengali evaluation telemetry & WER benchmarks
└── 06_dermoped_pediatric_crops/      # 24,249 files (1,750 MB) — DermoPed pediatric lesion crops & masks (N=22 patients)
```

### File Extension & Category Breakdown
- **Segmented Lesion & Scan Crops (`.png`):** 24,203 files (874.10 MB)
- **High-Resolution Clinical Images (`.jpg`):** 11,325 files (159.71 MB)
- **Compressed Raw Archives (`.zip`):** 5 files (1,033.72 MB)
- **Dataset Manifests & Tabular CSVs (`.csv`):** 10 files (7.57 MB)
- **Metadata, Masks & Bounding Labels (`.json`):** 51 files (2.25 MB)
- **Audit Reports, Code & Governance (`.md`, `.py`, `.ps1`):** 48 files (0.32 MB)

---

## 🏛️ Exact Data Provenance & Primary Sources

All component datasets originate from peer-reviewed research publications, open-access academic data repositories (Mendeley Data, Zenodo), and established public speech benchmarks. Full scientific source attribution:

| Module ID | Module Name | Primary Acquisition Source | Canonical DOI / Citation | Original Authors & Institution | Geographic Origin | Acquisition Methodology |
|---|---|---|---|---|---|---|
| **01** | **01_PCOS_Clinical** | Mendeley Data | [10.17632/tw34c7hv7z.1](https://doi.org/10.17632/tw34c7hv7z.1) | K. Chaabouni et al., Sfax Hospital & Univ. of Sfax | Sfax, Tunisia | Case-control clinical cohort ($N=88$); Rotterdam criteria |
| **02** | **02_PCOS_Ultrasound** | Frontiers in Physiology | [10.3389/fphys.2025.1520898](https://doi.org/10.3389/fphys.2025.1520898) | M-R. Borna, H. Saadat et al., Tarbiat Modares Univ. & Fatemieh Hospital | Hamadan / Tehran, Iran | Ovarian B-mode ultrasound scans ($N=299$ unique) |
| **03** | **03_Measles_Viral_Rash** | Mendeley Data (MCVSLD) | [10.17632/dfztdtfsxz.1](https://doi.org/10.17632/dfztdtfsxz.1) | K. R. Ahmed, M. M. Rashid et al., Ahsanullah Univ. of Science and Technology | Dhaka, Bangladesh | Web-scraped Google searches & public dermatology sites ($10,384$ crops) |
| **04** | **04_Prescription_OCR** | Mendeley Data v2 | [10.17632/tg2hm7n2bs.2](https://doi.org/10.17632/tg2hm7n2bs.2) | R. Diya et al. | Gazipur & Dhaka, Bangladesh | Real clinic prescription photos ($N=1,000$); names/phones masked |
| **05** | **05_Bangla_Voice_AI** | Google FLEURS (`bn_in`) | [IEEE SLT 2022](https://arxiv.org/abs/2205.12446) | A. Conneau, M. Ma et al., Google Research | Global / Bangladesh | Mobile & studio speech recordings ($N=26$ evaluation clips) |
| **06** | **06_DermoPed_Pediatric** | Zenodo Record 20829589 | [10.5281/zenodo.20829589](https://doi.org/10.5281/zenodo.20829589) | C. Bellatreccia et al., IRCCS Azienda Ospedaliero-Universitaria di Bologna | Bologna, Italy | Hospital pediatric lesion photography ($N=22$ patient subset) |

---

## 📊 Verified Scientific Benchmarks & Limitations

The table below reflects **honest, audited research metrics** locked in `SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/INDEPENDENT_METRIC_VERIFICATION.json`. Every metric has been reproduced from frozen model weights:

| Diagnostic Module | Architecture / Checkpoint | Evaluation Metric | Audited Score | Evaluation Sample Size | Independence Protocol | Critical Scientific Limitations |
|---|---|---|:---:|---|---|---|
| **PCOS Clinical** | XGBoost (`M01-XGB-01`) | Accuracy / Balanced Acc / Macro F1 | **94.44% / 94.44% / 0.9443** | $N=18$ held-out patients | Verified Patient-Level | Small test set ($N=18$). 50-fold repeated CV mean balanced accuracy is **88.57% ($\pm 8.29\%$)**. |
| **PCOS Ultrasound** | ResNet-18 (`M02-RESNET-01`) | Balanced Accuracy / Macro F1 | **86.24% / 87.70%** | $N=45$ images (21 Dominant, 18 PCO, 6 Normal) | Pseudo-Patient Grouping (pHash) | Class imbalance ($N=6$ Normal in test). Visual clustering only (no patient IDs). Imaging alone does not diagnose PCOS. |
| **Viral Skin Rash** | ResNet-18 Grouped (`M03-RESNET-GROUPED-01`) | Grouped Family Accuracy / Image Acc | **85.09% / 83.34%** | 114 test families (1,561 crops) | Source-Photo Family Level | Quarantined leaked 99.1% baseline. Honest grouped evaluation is 85.09%. Web-scraped photos lack RT-PCR confirmation. |
| **Prescription OCR** | EasyOCR + LayoutLM (`M04-EASYOCR-PIPELINE-01`) | Line Parsing Rate / Safety Gate Quarantine | **91.20% / 92.11%** | $N=149$ test prescriptions | Image-Level | Lack of bounding-box ground truth in Mendeley v2. 92.11% of prescriptions fail confidence and require human verification. |
| **Bangla Voice ASR** | Whisper-Small Bengali (`M05-WHISPER-SMALL-BN-03`) | Norm WER / Unicode Integrity | **39.09% / 98.37%** | 26 human clips (22 sentences, 22 speakers) | Speaker-Independent | General-domain FLEURS sentences (zero clinical entities; clinical recall = N/A). Outperforms vanilla Whisper (0% Unicode). |
| **Pediatric Rash** | DermoPed EXP_D (`M06-EXP-D-01`) | Test Patient Accuracy / Image Acc | **100.0% / 100.0%** | Test: 4 patients (110 crops) | Verified Patient-Level | **CRITICAL:** Dataset contains only 3 pediculosis patients ($N=3$). Validation recall swings violently. Architectural PoC only. |
| **Hybrid Clinical RAG** | BM25 + BGE-M3 + Qwen 2.5 7B | MRR / Hit@3 | **0.9750 / 1.0000** | 20 bilingual clinical queries (DGHS/WHO) | Golden Query Benchmark | Grounded retrieval strictly bounds generation. Safety guardrails enforce 999 hotline emergency exit on red-flag conditions. |

---

## 📜 Licensing & Per-Component Attribution

This repository contains components published under different open-access licenses by their respective upstream creators:

- **Upstream Open Access:** All six component datasets (`01_pcos_clinical`, `02_pcos_ultrasound`, `03_viral_rash_grouped`, `04_prescription_ocr`, `05_bangla_voice_benchmark`, `06_dermoped_pediatric_crops`) were released by their original authors under **Creative Commons Attribution 4.0 International (CC BY 4.0)**.
- **Derivative ShasthoSetu AI Contributions:** The leak-free family grouping algorithms, deduplication manifests, verification scripts, and benchmark evaluation harnesses created by ShasthoSetu AI are licensed under **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)**.
- **Third-Party Rights Notice:** Web-scraped components in MCVSLD (`03_viral_rash_grouped`) may contain images where underlying third-party rights belong to original creators. Re-use is intended strictly for non-commercial educational and academic evaluation.

---

## 🛡️ Privacy Governance & Heuristic De-Identification

To uphold ethical healthcare data principles:
1. **Heuristic Masking**: All patient names in tabular cohorts are pseudonymized (`PATIENT_001` .. `PATIENT_088`). Prescription images have names and phone numbers manually blurred by the upstream dataset creators.
2. **No Primary Patient Contact**: ShasthoSetu AI had no direct contact with human subjects; all data was acquired from published open repositories.
3. **No Certification Claim**: Mention of privacy practices reflects internal software engineering heuristics (regular-expression filtering, local SQLite WAL storage). It does NOT constitute formal regulatory certification from the Bangladesh Medical & Dental Council (BMDC) or external institutional review boards.
4. **Mandatory Non-Prescribing Safety Rule**: Models evaluated on this data must NEVER issue unverified pharmaceutical dosage prescriptions without registered physician authorization.

---

## 💻 How to Load & Use with Python

### 1. Download via Hugging Face Hub
```python
from huggingface_hub import snapshot_download

# Download audited manifests and tabular datasets
dataset_path = snapshot_download(
    repo_id="ashik1236/shasthosetu-clinical-datasets",
    repo_type="dataset",
    local_dir="./shasthosetu_data",
    allow_patterns=["*.csv", "*.json", "*.md", "01_pcos_clinical/*", "02_pcos_ultrasound/*"],
)
print(f"Dataset downloaded to: {dataset_path}")
```

### 2. Loading Audited PCOS Clinical Cohort with Pandas
```python
import pandas as pd
from huggingface_hub import hf_hub_download

# Load verified Sfax Hospital PCOS Clinical cohort (N=88)
pcos_file = hf_hub_download(
    repo_id="ashik1236/shasthosetu-clinical-datasets",
    filename="01_pcos_clinical/pcos_clinical_cleaned.csv",
    repo_type="dataset",
)
df_pcos = pd.read_csv(pcos_file)
print("PCOS Cohort Shape:", df_pcos.shape)
print("Features (20 verified):", list(df_pcos.columns))
```

---

## 📖 Citation & Academic Attribution

If you utilize this benchmark collection or its leak-free manifests in research, please cite both ShasthoSetu AI and the underlying primary creators:

```bibtex
@dataset{shasthosetu_ai_benchmarks_2026,
  author       = {ShasthoSetu AI Research Team},
  title        = {ShasthoSetu AI: Audited Clinical Telemedicine Datasets, Grouped Viral Rash Splits, and Bilingual Bengali Benchmarks},
  year         = {2026},
  publisher    = {Hugging Face},
  howpublished = {\url{https://huggingface.co/datasets/ashik1236/shasthosetu-clinical-datasets}},
  note         = {Audited provenance with 751-family grouped splits, pHash deduplication, and heuristic Zero-PHI masking}
}

@article{borna2025ovarian,
  title={AI-powered diagnosis of ovarian conditions: insights from a newly introduced ultrasound dataset},
  author={Borna, Mohammad-Reza and Saadat, Hanan and Sepehri, Mohammad Mehdi and Torkashvand, Hojat and Torkashvand, Leila and Pilehvari, Shahryar},
  journal={Frontiers in Physiology},
  volume={16},
  pages={1520898},
  year={2025},
  publisher={Frontiers}
}

@inproceedings{conneau2022fleurs,
  title={FLEURS: Few-shot Learning Evaluation of Universal Representations of Speech},
  author={Conneau, Alexis and Ma, Min and Kaushik, Anshuman and others},
  booktitle={IEEE Spoken Language Technology Workshop (SLT)},
  year={2022}
}
```
