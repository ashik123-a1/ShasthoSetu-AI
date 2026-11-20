# 01 — Original Source & DOI Forensic Reconciliation Matrix
**Task ID:** `HF-DATASET-PROVENANCE-AUDIT-01`  
**Repository Target:** `ashik1236/shasthosetu-clinical-datasets`  
**Audit Standard:** Master SRS v1.0 / v2.0 Section 16 & 21 (Scientific Provenance & Audit Integrity)  
**Date:** November 20, 2026  
**Auditor:** Principal AI Research Auditor & Clinical Governance Lead  

---

## 1. Executive Forensic Reconcilation

During initial dataset card composition, several dataset components were assigned generic or erroneous institutional origins (e.g., attributing the PCOS Clinical cohort to Kottayam Medical College instead of Sfax Hospital, or describing web-scraped MCVSLD collections as multi-centre clinical hospital registries). 

This document performs an exhaustive, forensic file-by-file reconciliation against original raw data files, DOIs, published papers, and repository metadata, establishing the **true, unassailable provenance** of every module in the ShasthoSetu AI dataset collection.

```
+----------------------------------------------------------------------------------------------------------------------------+
| MODULE ID | DATASET NAME          | PREVIOUS CLAIMED SOURCE      | VERIFIED TRUE PRIMARY SOURCE         | CANONICAL DOI    |
+-----------+-----------------------+------------------------------+--------------------------------------+------------------+
| DS-01     | 01_PCOS_Clinical      | Kottayam Medical College     | Sfax Hospital, Sfax, Tunisia         | 10.17632/        |
|           |                       | (Prasoon Kottarathil cohort) | (Khansa Chaabouni et al., Mendeley)  | tw34c7hv7z.1     |
| DS-02     | 02_PCOS_Ultrasound    | Generic Gynecology Imaging   | Tarbiat Modares / Hamadan University | 10.3389/         |
|           |                       | Archive (Unspecified Clinic) | (Hanan Saadat et al., Frontiers)     | fphys.2025.      |
|           |                       |                              |                                      | 1520898          |
| DS-03     | 03_Measles_Viral_Rash | Multi-Centre Clinical        | Mendeley MCVSLD (Ahmed et al., AUST) | 10.17632/        |
|           |                       | Dermatology Registry         | Web-Scraped & Google Image Search    | dfztdtfsxz.1     |
| DS-04     | 04_Prescription_OCR   | Gazipur Medical Centres with | Mendeley Data v2 (Diya et al.)       | 10.17632/        |
|           |                       | Certified Privacy Clearance  | Publisher-Redacted Clinic Prescripts | tg2hm7n2bs.2     |
| DS-05     | 05_Bangla_Voice_AI    | Google FLEURS Bengali        | Google Research FLEURS (bn_in)       | IEEE SLT 2022    |
|           |                       | Speech Recognition Benchmark | (Conneau et al., FLoRES-101 subset)  |                  |
| DS-06     | 06_DermoPed_Pediatric | Guardian-Consented Pediatric | Zenodo Record 20829589               | 10.5281/         |
|           |                       | Dermatology Registry         | (Bellatreccia et al., IRCCS Bologna) | zenodo.20829589  |
+----------------------------------------------------------------------------------------------------------------------------+
```

---

## 2. Item-Level Module Provenance Breakdown

### 2.1 Module 01: PCOS Clinical Tabular Dataset (`01_pcos_clinical`)
- **Stated Previous Claim:** "Kottayam Medical College / Mendeley Clinical Cohort, South Asian Regional Hospital".
- **True Primary Source:** Mendeley Data, Dataset DOI: [`10.17632/tw34c7hv7z.1`](https://doi.org/10.17632/tw34c7hv7z.1).
- **Dataset Title:** "Data on vitamin D, hormonal and metabolic profiles in PCOS women and controls".
- **Principal Author / Contributor:** Khansa Chaabouni, Faculté de Médecine de Sfax, Université de Sfax, Tunisia.
- **Original Clinical Institution:** Department of Obstetrics and Gynecology, Sfax Hospital, Sfax, Tunisia.
- **Geographic Origin:** Sfax, Tunisia (North Africa / Mediterranean).
- **Study Design:** Prospective case-control cross-sectional clinical study ($N=88$: 45 women with PCOS diagnosed via Rotterdam criteria, 43 age- and BMI-matched healthy controls).
- **Raw File Verification:** `01_PCOS_Clinical/data/raw/vitD_donnees_2022Mai.xlsx` (20.8 KB, exactly 88 rows, 21 columns).
- **Root Cause of Previous Discrepancy:** The widely known 541-patient Kaggle PCOS dataset originates from Kottayam Medical College, Kerala, India (collected by Prasoon Kottarathil). Because both datasets study PCOS clinical parameters, the Kottayam attribution was mistakenly applied to this 88-patient cohort during early drafting. File-level inspection of column names (`vit_d_25oh`, `sdhea`, `e2`) and French column headers in the raw spreadsheet conclusively proves the dataset is from Sfax, Tunisia.

### 2.2 Module 02: PCOS Ultrasound Vision Dataset (`02_pcos_ultrasound`)
- **Stated Previous Claim:** "Gynecology & Obstetrics Imaging Archive, Diagnostic Ultrasound Wing".
- **True Primary Source:** Frontiers in Physiology (2025) / GitHub: `HananSaadat/ovarian_ultrasound_dataset`.
- **Peer-Reviewed Citation:** Borna M-R, Saadat H, Sepehri MM, Torkashvand H, Torkashvand L, Pilehvari S. *AI-powered diagnosis of ovarian conditions: insights from a newly introduced ultrasound dataset.* Frontiers in Physiology. 2025;16:1520898. DOI: [`10.3389/fphys.2025.1520898`](https://doi.org/10.3389/fphys.2025.1520898).
- **Principal Authors:** Mohammad-Reza Borna, Hanan Saadat, Mohammad Mehdi Sepehri, et al.
- **Original Clinical Institutions:** Healthcare Management and Informatics Department, Tarbiat Modares University, Tehran, Iran; in collaboration with the Ultrasound Clinic at Fatemieh Hospital, Hamadan University of Medical Sciences, Hamadan, Iran.
- **Geographic Origin:** Hamadan and Tehran, Iran.
- **Raw Data Volume & Hygiene:** 301 B-mode ultrasound images in original release. Two exact byte duplicates identified and purged via MD5 hash verification (`image_041.jpg` identical to `image_028.jpg`; `image_276.jpg` identical to `image_262.jpg`), yielding **299 unique ultrasound images** across three categories: `Dominant_Follicle` (142), `PCO` (116), and `Normal` (41).
- **Root Cause of Previous Discrepancy:** The repository lacked direct attribution to the 2025 Frontiers paper in early draft documents, relying instead on vague surrogate descriptions.

### 2.3 Module 03: Measles and Viral Rash Vision Dataset (`03_viral_rash_grouped`)
- **Stated Previous Claim:** "MCVSLD Multi-Centre Viral Skin Registry, Global & Regional Clinical Dermatology".
- **True Primary Source:** Mendeley Data, Dataset DOI: [`10.17632/dfztdtfsxz.1`](https://doi.org/10.17632/dfztdtfsxz.1).
- **Dataset Title:** "Multi-Class Viral Skin Lesion Dataset (MCVSLD)".
- **Principal Authors:** Kazi Rifat Ahmed, Md. Mazbaur Rashid, Suprove Chandra Sarkar, Mujahidul Islam.
- **Institutional Affiliation:** Department of Computer Science and Engineering, Ahsanullah University of Science and Technology (AUST), Dhaka, Bangladesh.
- **Acquisition Methodology (Crucial Disclosure):** The dataset publishers explicitly state that images were collected via **targeted Google Image Search queries and public web repositories (including DermNet NZ and health education portals)**, followed by automated cropping and augmentation.
- **Data Volume:** 10,384 image crops across 6 classes: Chickenpox, Cowpox, HFMD, Healthy, Measles, and Monkeypox.
- **Root Cause of Previous Discrepancy:** Describing this dataset as an "Audited Clinical Hospital Registry" is scientifically inaccurate. The images are web-scraped, unstandardized, and lack laboratory virological confirmation (RT-PCR or IgM antibody titers). Furthermore, ShasthoSetu AI discovered severe cross-split image leakage in the authors' original release, necessitating our custom 751-family grouped split.

### 2.4 Module 04: Prescription OCR Dataset (`04_prescription_ocr`)
- **Stated Previous Claim:** "Gazipur Medical Centres, 1,000-prescription reconciliation with verified privacy clearance".
- **True Primary Source:** Mendeley Data, Dataset DOI: [`10.17632/tg2hm7n2bs.2`](https://doi.org/10.17632/tg2hm7n2bs.2) (referenced in literature as `10.17632/d75b394xvx.2`).
- **Dataset Title:** "Image-to-Text Bilingual Dataset from Medical Prescriptions".
- **Principal Authors:** R. Diya, et al.
- **Geographic Origin:** Primary clinics, diagnostic centres, and pharmacies in Gazipur and Dhaka districts, Bangladesh.
- **Data Volume:** 1,000 photographic captures of real prescription pads (`0001.jpeg` through `1000.jpeg`, 57.5 MB). 992 admissible records + 8 quarantined/corrupted files.
- **De-Identification Disclosure:** The dataset authors manually obscured patient names and phone numbers. However, **no independent third-party institutional ethics review (IRB) or formal health data compliance certification** is documented in the Mendeley release.
- **Root Cause of Previous Discrepancy:** Early drafts presented publisher-reported de-identification as a formal, certified "Zero-PHI Certified" sign-off. The distinction between manual heuristic redaction and certified institutional compliance must be explicitly stated.

### 2.5 Module 05: Bangla Voice AI Benchmark (`05_bangla_voice_benchmark`)
- **Stated Previous Claim:** "Google FLEURS Bengali Acoustic Evaluation Benchmark".
- **True Primary Source:** Hugging Face Datasets: [`google/fleurs`](https://huggingface.co/datasets/google/fleurs) (derived from FLoRES-101).
- **Peer-Reviewed Citation:** Alexis Conneau, Min Ma, Anshuman Kaushik, et al. *FLEURS: Few-shot Learning Evaluation of Universal Representations of Speech.* IEEE SLT 2022.
- **Language Subset:** Bengali (`bn_in`), 16 kHz Mono uncompressed WAV audio.
- **Evaluation Corpus Used:** 26 human audio clips (22 unique reference sentences read by 22 distinct native speakers from the FLEURS `dev` split).
- **Fine-Tuning Provenance:** Acoustic model (`anuragshas/whisper-small-bn`) was fine-tuned on Mozilla Common Voice 11.0 Bengali, which shares zero audio clips, speakers, or sentences with FLEURS.
- **Clinical Content Disclosure:** Sentences in Google FLEURS are general-domain translations (Wikipedia/news). They contain **zero clinical pharmacology entities or medical consultation dialogue**.

### 2.6 Module 06: DermoPed Pediatric Dermatology Dataset (`06_dermoped_pediatric_crops`)
- **Stated Previous Claim:** "Pediatric Clinical Dermatology Registry, guardian-consented de-identified lesion imagery".
- **True Primary Source:** Zenodo Record: [`10.5281/zenodo.20829589`](https://doi.org/10.5281/zenodo.20829589).
- **Associated Journal Publication:** *Nature Scientific Data* (s41597-026-08353-2).
- **Dataset Title:** "DermoPed: A pediatric dermatology dataset of smartphone images".
- **Principal Authors:** Chiara Bellatreccia, Roberta Calegari, Andrea Borghesi, Daniele Zama, Arianna Dondi, Luca Pierantoni, Laura Andreozzi, Iria Neri, Marcello Lanari.
- **Affiliation:** IRCCS Azienda Ospedaliero-Universitaria di Bologna, Italy (Department of Medical and Surgical Sciences, Pediatric Dermatology Unit).
- **Evaluated Local Subset:** 656 image crops across 22 pediatric patients (19 Chickenpox, 3 Pediculosis: `patient71`, `patient72`, `patient74`).
- **Ethical & Consent Disclosure:** While the original authors obtained parental/guardian consent for their hospital research study at IRCCS Bologna, **ShasthoSetu AI has no direct institutional relationship with IRCCS Bologna, and secondary public redistribution of raw pediatric facial/body skin images on Hugging Face raises serious ethical and legal questions**.

---

## 3. Summary Reconciliation Matrix

| Module Name | True Primary Source | DOI / Reference | Authors | True Origin | Data Collection Method |
|---|---|---|---|---|---|
| **01_PCOS_Clinical** | Mendeley Data | [10.17632/tw34c7hv7z.1](https://doi.org/10.17632/tw34c7hv7z.1) | K. Chaabouni et al. | Sfax Hospital, Tunisia | Clinical cohort ($N=88$), Rotterdam criteria |
| **02_PCOS_Ultrasound** | Frontiers in Physiology / GitHub | [10.3389/fphys.2025.1520898](https://doi.org/10.3389/fphys.2025.1520898) | M-R. Borna, H. Saadat et al. | Fatemieh Hospital / Tarbiat Modares, Iran | B-mode ovarian ultrasound ($N=299$) |
| **03_Measles_Viral_Rash** | Mendeley Data (MCVSLD) | [10.17632/dfztdtfsxz.1](https://doi.org/10.17632/dfztdtfsxz.1) | K. R. Ahmed et al. | AUST, Bangladesh | Web-scraped Google searches ($10,384$ crops) |
| **04_Prescription_OCR** | Mendeley Data v2 | [10.17632/tg2hm7n2bs.2](https://doi.org/10.17632/tg2hm7n2bs.2) | R. Diya et al. | Gazipur/Dhaka, Bangladesh | Clinic prescription photos ($N=1,000$) |
| **05_Bangla_Voice_AI** | Google FLEURS (`bn_in`) | IEEE SLT 2022 | A. Conneau et al. | Google Research (Global/BD) | Mobile & studio recordings ($N=26$ clips) |
| **06_DermoPed_Pediatric** | Zenodo / Nature Sci Data | [10.5281/zenodo.20829589](https://doi.org/10.5281/zenodo.20829589) | C. Bellatreccia et al. | IRCCS Bologna, Italy | Hospital pediatric smartphone photos ($N=22$) |
