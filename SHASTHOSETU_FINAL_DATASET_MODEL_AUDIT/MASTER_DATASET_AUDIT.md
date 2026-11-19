# Master Dataset Forensic Audit Report
**Project:** ShasthoSetu AI — Multimodal Clinical Healthcare Platform  
**Audit Scope:** Forensic Data Audit across all 6 Research Modules  
**Auditor:** Senior ML Research Auditor  
**Audit Date:** November 18, 2026  
**Compliance Standard:** Master SRS v1.0 / v2.0 Section 16 & 21 (Data Governance & Evaluation Integrity)  

---

## 1. Executive Forensic Summary

Across the six core research modules of ShasthoSetu AI, an exhaustive forensic audit was conducted on every raw file, processed manifest, split specification, and ground-truth annotation.

```
+----------------------------------------------------------------------------------------------------------------+
| MODULE                   | SOURCE & IDENTIFIER            | SAMPLES / RECORDS  | VERIFIED INDEPENDENCE LEVEL   |
+--------------------------+--------------------------------+--------------------+-------------------------------+
| 01_PCOS_Clinical         | Mendeley tw34c7hv7z/1          | 88 patients        | Verified Patient-Level (N=88) |
| 02_PCOS_Ultrasound       | Ovarian Ultrasound Dataset     | 299 unique images  | Pseudo-Patient Grouping (244) |
| 03_Measles_Viral_Rash    | MCVSLD (6 Viral Classes)       | 10,384 image crops | Source-Photo Family (N=751)   |
| 04_Prescription_OCR      | Mendeley d75b394xvx.2          | 1,000 prescriptions| Image-Level (149 Test Audited)|
| 05_Bangla_Voice_AI       | Google FLEURS + Common Voice   | 26 human clips +12 | Speaker-Independent (22 Spk)  |
| 06_DermoPed_Pediatric    | Zenodo 20829589 (Local subset) | 22 patients (656c) | Verified Patient-Level (N=22) |
+----------------------------------------------------------------------------------------------------------------+
```

> [!IMPORTANT]
> **Fundamental Independence Hierarchy Enforced:**
> 1. **Verified Patient-Level Independence:** Multiple images/records from the same human patient are strictly isolated to one split (`01_PCOS_Clinical`, `06_DermoPed`).
> 2. **Source-Photo Family Independence:** Augmented, rotated, or cropped variants of the same photographic frame are kept in the same split (`03_Measles_Viral_Rash`). *Never to be confused with patient-level independence.*
> 3. **Pseudo-Patient Grouping:** Images clustered by perceptual hash or visual feature connected components (`02_PCOS_Ultrasound`). *Surrogate clustering only.*
> 4. **Speaker Independence:** Distinct human voice recordings from separate registered speakers (`05_Bangla_Voice_AI`).
> 5. **Image-Level Independence:** Single images treated as independent samples without patient tracking (`04_Prescription_OCR`).

---

## 2. Module 01: PCOS Clinical Tabular Dataset

### A. Provenance and Metadata
- **Source Identifier:** Mendeley Data, DOI `10.17632/tw34c7hv7z.1` ("Data on vitamin D, hormonal and metabolic profiles in PCOS women and controls").
- **Clinical Origin:** Recruited at the Department of Obstetrics and Gynecology, Sfax Hospital, Tunisia.
- **Study Type:** Case-control cross-sectional clinical study.
- **Raw File:** `01_PCOS_Clinical/data/raw/vitD_donnees_2022Mai.xlsx` (20.8 KB, 88 rows).
- **Cleaned File:** `01_PCOS_Clinical/data/processed/pcos_clinical_cleaned.csv` (11.6 KB, 88 rows, 21 columns).

### B. Sample Counts and Class Balance
- **Total Records:** 88 human patients.
- **Target Label:** `target_pcos` (Binary: `0` = Healthy Control, `1` = PCOS Positive).
- **Class Balance:**
  - Control (`0`): 43 patients (48.86%)
  - PCOS (`1`): 45 patients (51.14%)
  - *Class Imbalance Ratio:* 1.05:1 (Naturally well-balanced).

### C. Feature Audit & Missing Data
- **Clinical & Lab Features (20 total):** `age`, `bmi`, `waist_circumference`, `sbp`, `dbp`, `glucose`, `total_cholesterol`, `triglycerides`, `hdl_c`, `ldl_c`, `fsh`, `lh`, `e2` (estradiol), `oh_prog_17`, `prl`, `testosterone`, `androstenedione`, `sdhea`, `vit_d_25oh`, `homa_ir`.
- **Missing Value Count:** 16 features exhibit missing values: `sdhea` (16), `androstenedione` (14), `waist_circumference` (9), `vit_d_25oh` (6), `age` (5), `glucose` (5), `e2` (2), `total_cholesterol` (2), `triglycerides` (2), `ldl_c` (2), `oh_prog_17` (1), `sbp` (1), `dbp` (1), `hdl_c` (1), `homa_ir` (1).
- **Fit Boundary Verification:** Imputation (median/iterative) was strictly fit inside each CV training fold and applied to validation/test folds without data leakage (`01_PCOS_Clinical/audit_v2/src/train_audit.py`).
- **Feature Derivation Note:** The dataset contains independent laboratory features `lh` and `fsh`. No computed `lh_fsh_ratio` column exists in the raw data; `e2` was identified as the highest gain/permutation feature.

### D. Partitioning Protocol
- **Training Set:** 70 patients (35 PCOS, 35 Control).
- **Held-Out Test Set:** 18 patients (9 PCOS, 9 Control).
- **Cross-Validation:** Repeated Stratified 5-Fold (10 repeats = 50 folds on the 70 training patients).
- **Leakage Status:** `NO_OVERLAP_DETECTED_AT_VERIFIED_GROUPING_LEVEL`.
- **Limitation:** Held-out test set has $N=18$. A single misclassified patient shifts test accuracy by $\pm 5.56\%$.

---

## 3. Module 02: PCOS Ultrasound Vision Dataset

### A. Provenance and Metadata
- **Source Identifier:** Ovarian Ultrasound Dataset (Mendeley Data / Kaggle: `anuragshas/pcos-ultrasound-images`).
- **Raw File Count:** 301 files in `data/raw/` (~55.2 MB).
- **Manifests:** `data/processed/dataset_manifest.csv` (301 rows), `data/processed/split_manifest.csv` (299 rows).

### B. Duplicate Detection and Sample Filtering
- **Exact Duplicate Discovery:** Two exact byte duplicates identified via MD5 hash comparison:
  - `image_041.jpg` (MD5: `2f4a...`, duplicate of `image_028.jpg`)
  - `image_276.jpg` (MD5: `9e1c...`, duplicate of `image_262.jpg`)
- **Cleaned Dataset Count:** 299 unique ultrasound images.

### C. Class Distribution
- `Dominant_Follicle`: 142 unique images (47.49%)
- `PCO`: 116 unique images (38.80%)
- `Normal`: 41 unique images (13.71%)
- **Imbalance Warning:** `Normal` class is severely underrepresented (only 41 images across the entire dataset; 35 in development, 6 in test).

### D. Grouping & Split Strategy
- **Pseudo-Patient Grouping:** Development images ($N=254$) were grouped into **244 connected components** using perceptual hashing (pHash hamming distance $\le 6$) and CNN feature cosine distance ($\ge 0.92$) to isolate near-duplicates.
- **Split Breakdown:**
  - Train: 209 images
  - Validation: 45 images
  - Held-out Test: 45 images (21 Dominant Follicle, 18 PCO, 6 Normal)
- **Leakage Status:** `POTENTIAL_LEAKAGE` (At Patient Level). While near-duplicate leakage across splits is 0%, the repository provided **zero clinical patient identifiers**. Multiple images could originate from the same patient across splits if visual appearance varied beyond the near-duplicate threshold.

---

## 4. Module 03: Measles and Viral Skin Lesions (MCVSLD)

### A. Provenance and Metadata
- **Source Identifier:** Multi-Class Viral Skin Lesion Dataset (MCVSLD).
- **Total Local Images:** 10,384 dermatological image crops (~148 MB).
- **Classes (6 Viral Conditions):** `Chickenpox`, `Cowpox`, `HFMD`, `Healthy`, `Measles`, `Monkeypox`.

### B. Historical Contamination Discovery & Forensics
- **Original Flawed Manifest (`clean_split_manifest.csv`):** 10,384 images split randomly by image index (Train: 7,268, Val: 1,558, Test: 1,558).
- **The Contamination:** High-resolution camera photographs had been pre-cropped and augmented into numbered variants (e.g., `HFMD_131_01_1.jpg`, `HFMD_131_01_5.jpg`, `HFMD_131_01_7.jpg`, `HFMD_131_01_8.jpg`). In the original random split, variants of the exact same physical lesion were distributed across Train, Val, and Test.
- **Impact:** Produced an artificial, non-generalizable 99.10% test accuracy.

### C. Corrected Grouped Partitioning
- **Source-Photo Family Grouping:** Implemented in `03_Measles_Viral_Rash/clean_grouped_split/` and audited in `MCVSLD_SOURCE_FAMILY_AUDIT.csv`. All numbered variants sharing a common root (e.g. `HFMD_131_01`) were locked into a single split.
- **Total Families:** 751 source-photo families.
- **Corrected Split Counts:**
  - **Train:** 524 families (7,279 image crops)
  - **Validation:** 113 families (1,544 image crops)
  - **Held-out Test:** 114 families (1,561 image crops)
- **Cross-Split Family Overlap:** **0.00%** (Verified).
- **Leakage Status:** `NO_OVERLAP_DETECTED_AT_VERIFIED_GROUPING_LEVEL` (Source-Photo Family Level). Patient-level leakage cannot be ruled out as MCVSLD did not record patient hospital IDs.

---

## 5. Module 04: Prescription OCR Dataset

### A. Provenance and Metadata
- **Source Identifier:** Mendeley Data v2 ("Image-to-Text Bilingual Dataset from Medical Prescriptions", DOI `10.17632/d75b394xvx.2`).
- **Data Volume:** 1,000 photographic prescription images (`0001.jpeg`–`1000.jpeg`, ~57.5 MB).
- **Manifest:** `04_Prescription_OCR/data/processed/prescription_manifest.csv`.

### B. Data Quality & Quarantined Files
- **Corrupted / Truncated Files (3 samples):**
  - `0174.jpeg` (Truncated JPEG stream, decoding failure)
  - `0729.jpeg` (Empty / corrupted byte buffer)
  - `0775.jpeg` (Corrupted header)
  - *Resolution:* Permanently quarantined in `patch_v1/QUARANTINE_MANIFEST_VERIFIED.json`.
- **Evaluated Test Set:** 149 valid prescription images (out of 152 in canonical 70/15/15 test split).

### C. Ground-Truth Integrity & Severe Annotation Gap
- **Critical Audit Finding:** The Mendeley v2 metadata CSV provides unstructured free-text descriptions and printed doctor header transcriptions. It provides **NO isolated, ground-truth annotated bounding boxes or token lists for prescribed medications, dosages, or frequencies**.
- **Impact on Reported Metrics:** Previous exploratory claims of "6.96% medication recall" were generated using unvalidated regex string searches on narrative text. The "100% recall" claim in patch_v1 was verified strictly on a **single demonstration image** (`0974.jpeg`).
- **Leakage Status:** `NO_OVERLAP_DETECTED_AT_VERIFIED_GROUPING_LEVEL` (Image-level split).

---

## 6. Module 05: Bangla Voice AI Datasets

### A. Provenance and Metadata
- **Corpus 1 (Evaluation Benchmark):** Google FLEURS Bengali subset (`google/fleurs`, derived from FLoRES-101).
  - Local Archive: `data/raw/extracted/dev/*.wav` (402 WAV clips, 150 unique reference sentences, 150 registered speakers).
  - Format: 16 kHz Mono WAV audio.
- **Corpus 2 (Acoustic Model Training):** Mozilla Common Voice 11.0 Bengali (`mozilla-foundation/common_voice_11_0 bn`). Used by `anuragshas/whisper-small-bn`.
- **Corpus 3 (Synthetic Hospital Audio):** 6 clinical English dictations and 6 mixed code-switching dictations generated via Windows SAPI TTS.

### B. Evaluation Samples Architecture
- **Cohort 1 — Smoke Test ($N=6$):** 6 human Bengali clips (`bn_sample_01.wav` to `bn_sample_06.wav`).
  - *Disclosure:* Contains only **2 distinct reference sentences** read by 2 speaker groups (`1530` and `1552`).
- **Cohort 2 — Extended Research Set ($N=20$):** 20 distinct sentences read by 20 distinct speakers randomly sampled with `Random(42)` from `dev.tsv` prior to inference.
- **Total Human Bengali Evaluation Corpus:** 26 audio clips (22 distinct sentences, 22 distinct speakers).

### C. Contamination & Independence Audit
- **Cross-Corpus Independence:** Mozilla Common Voice 11.0 (used for fine-tuning `anuragshas/whisper-small-bn`) and Google FLEURS have **zero recording, text, or speaker overlap**.
- **Alternative Contamination Audit:** Disqualified `Noobbbbb/whisper-small-bn-v2` because its evaluation pipeline was tied to FLEURS.
- **Leakage Status:** `NO_OVERLAP_DETECTED_AT_VERIFIED_GROUPING_LEVEL`.
- **Medical Entity Status:** FLEURS sentences contain **zero clinical entities**; clinical term recall is strictly **`N/A`**.

---

## 7. Module 06: DermoPed Pediatric Dermatology Dataset

### A. Provenance and Metadata
- **Source Identifier:** DermoPed (Zenodo Record 20829589, Federal University of Pelotas, Brazil).
- **Total Remote Volume:** ~19 GB full archive (20+ pediatric skin conditions).
- **Local Available Subset:** 656 image crops from **22 patients** across two classes:
  - `Chickenpox`: 19 patients (546 image crops)
  - `Pediculosis`: 3 patients (110 image crops)

### B. Patient Split Verification
- **Partitioning Protocol (Patient-Locked, Seed=42):**
  - **Train:** 14 patients (454 crops: Chickenpox=12 patients/429 crops; Pediculosis=2 patients/25 crops)
  - **Validation:** 4 patients (92 crops: Chickenpox=3 patients/72 crops; Pediculosis=1 patient/20 crops)
  - **Test:** 4 patients (110 crops: Chickenpox=3 patients/45 crops; Pediculosis=1 patient/65 crops)
- **Patient Cross-Split Overlap:** **0.00%** (Verified across `outputs/split_manifest.csv` and `audit_v3_corrections/corrected_patient_splits.csv`).

### C. Clinical Sample Size Limitation
- **CRITICAL SCIENTIFIC FINDING:** The local and published Zenodo archive for Pediculosis contains **only 3 unique human patients** ($n=3$). One patient in train, one in val, one in test.
- **Conclusion:** While patient-level isolation is mathematically zero-leakage, $n=1$ test patient cannot validate clinical generalizability.
- **Leakage Status:** `NO_OVERLAP_DETECTED_AT_VERIFIED_GROUPING_LEVEL` (Patient Level).
