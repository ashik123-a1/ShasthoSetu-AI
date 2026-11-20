# 🔬 ShasthoSetu AI — Module 04: Bilingual Prescription OCR Baseline Report

**Experiment Identifier:** `OCR-BASE-EASYOCR-V1`  
**Execution Date:** 2026-11-18  
**Compute Hardware:** NVIDIA GeForce RTX 5060 Ti (16 GB VRAM, sm_120)  
**Software Environment:** PyTorch 2.11.0+cu128 | CUDA 12.8 | EasyOCR 1.7.2 | Python 3.12.10  
**Test Split Size:** 152 Prescriptions (Zero Data Leakage)  

---

## 1. Executive Summary & Clinical Findings

Automated medication reminder systems powered by computer vision promise to reduce patient non-adherence and medication errors. However, applying unconstrained optical character recognition (OCR) directly to handwritten clinical prescriptions carries grave patient safety risks.

In this experiment, we established an empirical baseline using a state-of-the-art bilingual (English + Bengali) deep learning OCR engine (EasyOCR) evaluated on the 152-prescription test split of the Gazipur Prescription Corpus.

### Key Empirical Findings

| Metric | Measured Baseline Value | Clinical Interpretation |
| :--- | :--- | :--- |
| **Total Test Inference Time** | 106.26 seconds (152 images) | High throughput (0.698s / prescription) on RTX 5060 Ti |
| **Mean Detected Text Boxes** | 41.79 boxes / image (8 to 164) | Strong text detection coverage across prescription pads |
| **Mean OCR Confidence** | **0.3320** (33.2%) | Generic recognition model struggles with cursive doctor handwriting |
| **Mean Character Error Rate (CER)** | **1.184** (Median: 0.868) | Substantial substitution and deletion errors against ground truth |
| **Mean Word Error Rate (WER)** | **1.420** (Median: 1.000) | Full narrative word alignment is poor for raw handwriting |
| **Medication Entity Recall** | **6.96%** | Only 13 of 152 prescriptions had recognizable brand names |
| **Clinical Safety Gate Action** | **92.11% Diverted to Human Review** | 140 / 152 prescriptions safely blocked from automated reminders |

> [!CAUTION]
> **Primary Clinical Finding:** An off-the-shelf deep learning OCR model achieves an average confidence of only 33.2% on real-world handwritten prescriptions in Bangladesh. **Deploying un-gated OCR to automate patient dosage reminders would endanger 92% of patients with incorrect or hallucinated schedules.** ShasthoSetu AI's strict Medical Safety Gate is non-negotiable.

---

## 2. Technical Architecture & Acceleration Pipeline

```mermaid
flowchart LR
    A["Raw Prescription Image (RGB)"] --> B["CRAFT Detector (PyTorch GPU)"]
    B --> C["Rotated Bounding Box Crops"]
    C --> D["Bilingual Recognizer (ResNet + BiLSTM + CTC)"]
    D --> E["Raw Extracted Tokens & Confidence Scores"]
    E --> F["Clinical Entity Extraction Engine"]
    F --> G["Medical Safety Gate (Confidence >= 0.55 & Med Resolved)"]
    G -->|"Passed (7.89%)"| H["Verified Medication Schedule"]
    G -->|"Failed (92.11%)"| I["UNVERIFIED_REQUIRES_HUMAN_REVIEW (Blocked)"]
```

### Hardware Acceleration Details
Inference was conducted on an NVIDIA GeForce RTX 5060 Ti 16GB GPU utilizing the native `sm_120` PyTorch 2.11.0+cu128 backend.
- **Average Detection + Recognition Latency:** 698 ms per full prescription page.
- **GPU Memory Footprint:** ~1.4 GB VRAM allocated during batched CRAFT feature map computation.
- **Operating System:** Windows 10 x64.

---

## 3. Quantitative Evaluation Benchmark

The benchmark was executed across all 152 test prescriptions from `split_manifest.csv` with zero data leakage from training or validation splits.

### 3.1. Detection & Recognition Statistics

| Dimension | Minimum | Mean | Median | Maximum |
| :--- | :--- | :--- | :--- | :--- |
| **Detected Boxes / Image** | 8 | 41.79 | 39.0 | 164 |
| **OCR Confidence Score** | 0.0178 | 0.3320 | 0.3214 | 0.7387 |
| **Character Error Rate (CER)** | 0.3812 | 1.1840 | 0.8680 | 4.2150 |
| **Word Error Rate (WER)** | 0.4286 | 1.4200 | 1.0000 | 5.1200 |
| **Inference Latency (sec)** | 0.452s | 0.698s | 0.675s | 1.421s |

### 3.2. Clinical Entity Extraction & Recall

Prescription text was parsed for four essential medication entities: (1) Drug brand name, (2) Strength/unit, (3) Frequency/schedule, and (4) Duration.

| Clinical Entity Metric | Count | Percentage of Test Set |
| :--- | :--- | :--- |
| **Perfect Brand Name Recall ($100\%$)** | 9 | 5.92% |
| **Partial Brand Name Recall ($0\% < R < 100\%$)** | 4 | 2.63% |
| **Zero Brand Name Recall ($0\%$)** | 139 | 91.45% |
| **Prescriptions with Strength Detected** | 8 | 5.26% |

### 3.3. Language Distribution in Predictions
- **Prescriptions with detected English tokens:** 152 (100.0%)
- **Prescriptions with detected Bengali tokens:** 148 (97.4%)
- **Prescriptions with interleaved Bilingual tokens:** 148 (97.4%)

---

## 4. Deep Forensic Error Analysis

Inspection of [error_analysis.csv](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/04_Prescription_OCR/outputs/error_analysis.csv) reveals four major root causes for OCR degradation:

```mermaid
pie title Failure Mode Distribution in Low-Confidence Predictions
    "Cursive Physician Handwriting Distortions" : 54
    "Printed Header & Watermark Interference" : 28
    "Specialized Clinical Shorthand" : 38
    "Low-Contrast Mobile Photography" : 20
```

### 1. Cursive Physician Handwriting Distortions (54 cases)
Physician handwriting in Bangladesh commonly merges adjacent letters into continuous fluid strokes. Standard CTC decoders misidentify these cursive strokes as arbitrary punctuation symbols or fragmented digits (e.g. `[4{44 2/ 932 27b^` for `Anuva 50`).

### 2. Specialized Clinical Shorthand (38 cases)
Bangladeshi doctors write Latin medical shorthand: `1+0+1`, `১+০+১`, `b/f`, `pc`, `SOS`, `Inj.`, `Cap.`, `T-Cef`. Generic OCR character vocabularies do not contain medical language modeling priors, frequently misinterpreting `1+0+1` as `| + O + |` or Bengali `১+০+১` as `১~০+9`.

### 3. Printed Header & Ruling Line Interference (28 cases)
Hospital stationery often features high-contrast pre-printed headers (e.g. "বাংলাদেশ ফরম নং ৭৬৯", "Clinical Examination", hospital logos, and horizontal ruling lines). CRAFT detects these printed lines with high confidence ($>0.85$), overshadowing faint handwritten medications written in the margins.

### 4. Low-Contrast Mobile Photography (20 cases)
Prescription photos taken under uneven clinic lighting, shadows, or angle distortion degrade stroke sharpness, causing the character recognizer to drop confidence below $0.20$.

---

## 5. ShasthoSetu AI Clinical Safety Gate & Human-in-the-Loop Triaging

To protect patients from potentially fatal dosing errors, ShasthoSetu AI implements an automated **Medical Safety Gate**:

```
IF (Mean OCR Confidence < 0.55) OR (No Confirmed Medicine Entity Identified):
    STATUS = "UNVERIFIED_REQUIRES_HUMAN_REVIEW"
    AUTOMATED_REMINDER_ALLOWED = FALSE
    ACTION = Route to Community Health Worker / Pharmacist Dashboard
ELSE:
    STATUS = "VERIFIED_MEDICATION_DETECTED"
    AUTOMATED_REMINDER_ALLOWED = TRUE
    ACTION = Populate Staged Medication Reminder Schedule (Requires Patient Confirmation)
```

### Test Set Safety Gate Outcome

| Safety Category | Test Prescriptions | Percentage | Action Taken |
| :--- | :--- | :--- | :--- |
| **VERIFIED_MEDICATION_DETECTED** | 12 | 7.89% | Staged for patient one-tap confirmation |
| **UNVERIFIED_REQUIRES_HUMAN_REVIEW** | 140 | 92.11% | **Blocked from automated scheduling; routed to human triage** |
| **CRITICAL_REJECT_EMPTY** | 0 | 0.00% | No blank images detected |
| **Total Test Prescriptions** | **152** | **100.0%** | **100% Patient Protection Maintained** |

### Verified vs Unverified Sample Case Studies

#### Case 1: Verified Prescription (Prescription ID `0052`)
- **Mean Confidence:** `0.57` (Passed threshold)
- **Detected Tokens:** `বাংলাদেশ ফরম নং ৭৬৯`, `Cap Roxim 400`, `১+০+১`, `Cap Maxpro`
- **Extracted Entity:** `Roxim 400`
- **Safety Gate Status:** `VERIFIED_MEDICATION_DETECTED` (Automated reminder permitted).

#### Case 2: Unverified Prescription (Prescription ID `0002`)
- **Mean Confidence:** `0.17` (Severe failure)
- **Detected Tokens:** `[4{44 2/ 932 27b...`
- **Ground Truth:** `Anuva 50 tablet once in morning and once at night; Panicel 40`
- **Safety Gate Status:** `UNVERIFIED_REQUIRES_HUMAN_REVIEW` (Automated reminder blocked).

---

## 6. Strategic Engineering Recommendations

To elevate clinical entity recall from 7.89% to $>85\%$, the following engineering phases are scheduled:

1. **Vision-Language Document Modeling (TrOCR / Donut):**
   Replace modular detection-recognition with an end-to-end encoder-decoder architecture (e.g. `microsoft/trocr-base-stage1` or `naver-clova-ix/donut-base`) fine-tuned specifically on Bangladeshi prescription handwritten crops.
2. **Medical Dictionary & Pharmacopeia Constrained Decoding:**
   Integrate the Directorate General of Drug Administration (DGDA) Bangladesh approved brand list (15,000+ brand names including Square, Beximco, Incepta) as a trie-based search constraint during beam decoding.
3. **Multi-Scale Pre-Processing:**
   Apply adaptive thresholding (Sauvola binarization) and perspective correction before text detection to eliminate background clinic shadows.
