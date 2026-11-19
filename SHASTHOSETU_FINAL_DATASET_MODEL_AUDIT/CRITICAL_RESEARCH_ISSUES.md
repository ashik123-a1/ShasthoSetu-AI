# Critical Research Issues and Scientific Risk Register
**Project:** ShasthoSetu AI — Multimodal Clinical Healthcare Platform  
**Auditor:** Senior ML Research Auditor  
**Audit Date:** November 18, 2026  
**Standard:** ShasthoSetu AI Master SRS v1.0 / v2.0 Section 16 & 21  

---

## 1. Risk Severity Hierarchy & Matrix

Every identified finding is assigned a severity grade based on its impact on clinical safety, scientific integrity, and platform reliability:

| Severity Level | Definition & Clinical Impact | Action Required |
| :--- | :--- | :--- |
| **CRITICAL** | Severe contamination, zero-script failure, or ungrounded medical claims that would invalidate scientific publication or endanger patient safety. | Immediate resolution / Mandatory disclaimer before any clinical demo. |
| **HIGH** | Structural sample limitations, missing patient identifiers, or sample sizes under $N=50$ that limit generalizability. | Disclose explicit boundaries; forbid autonomous diagnostic claims. |
| **MEDIUM** | Computational / storage bottlenecks or domain shifts that affect system execution or prompt decoding. | Architectural mitigation (e.g. cache re-routing, token budget expansion). |
| **LOW** | Minor algorithmic edge cases, tie-breaking rules, or deprecated config schemas. | Documentation and standard engineering fixes. |

---

## 2. Critical Issues (Rank 1–4)

### Issue C1: Historical 99.10% Measles Accuracy Invalidated by Train-Test Contamination
- **Module:** `03_Measles_Viral_Rash`
- **Evidence:** `03_Measles_Viral_Rash/clean_grouped_split/MCVSLD_SOURCE_FAMILY_AUDIT.csv`
- **Finding:** In the original random split (`clean_split_manifest.csv`), pre-cropped and augmented image variants originating from the exact same physical camera photograph (e.g., `HFMD_131_01_1.jpg`, `_5.jpg`, `_7.jpg`, `_8.jpg`) were scattered across Train, Val, and Test splits. The reported 99.10% test accuracy was an artifact of evaluating on familiar photographic frames.
- **Audit Resolution:** Completely resolved by implementing the **Source-Photo Family Grouped Split** (751 families; 0.00% cross-family overlap). The genuine, uncompromised validation image accuracy is **84.65%** (Macro F1 = **84.22%**, Family Accuracy = **85.84%**).
- **Mandatory Policy:** Historical 99.10% figures must be marked permanently as `HISTORICAL_CONTAMINATED_ARCHIVE` in all public materials.

---

### Issue C2: Complete Failure of Multilingual Whisper Baselines on Bengali Script (0% Unicode)
- **Module:** `05_Bangla_Voice_AI`
- **Evidence:** `05_Bangla_Voice_AI/pretrained_bengali_comparison/comparison_metrics.json`
- **Finding:** Off-the-shelf multilingual `openai/whisper-base` and `openai/whisper-tiny` produced **0.00% Bengali Unicode characters** across all human Bengali audio clips. Whisper-Base drifted entirely into Latin phonetic transliteration ("Banglish", e.g., *"8.8mg ketefellar katha chillu..."* with 117.33%–266.01% WER), while Whisper-Tiny fell into degenerate repetition loops (*"1.5 kTcal"* repeated 18 times).
- **Audit Resolution:** Evaluated and verified `anuragshas/whisper-small-bn` on RTX 5060 Ti GPU, achieving **98.37% Bengali Unicode**, **33.33%** smoke-test norm WER (**8.97%** CER), and **40.15%** extended norm WER (**14.16%** CER).
- **Mandatory Policy:** English speech recognition remains on `openai/whisper-base` (5.36% WER); Bengali speech recognition routes through `anuragshas/whisper-small-bn` as an **Editable Draft Note only**.

---

### Issue C3: False "100% Medication Recall" Narrative in Prescription OCR
- **Module:** `04_Prescription_OCR`
- **Evidence:** `04_Prescription_OCR/final_integration/patch_v1/proofs/bilingual_ocr_results.json` vs. `audit_v2/OCR_METRICS_AUDITED.json`
- **Finding:** The Patch V1 integration report claimed "100% medication entity recall", creating the false impression that OCR is clinically infallible. Auditing the underlying test harness revealed this score was measured on a **single selected demonstration image** (`0974.jpeg`) containing 6 prominent printed headings. Across the genuine 149-prescription test set, EasyOCR achieved **96.69% English CER**, **103.34% Bangla CER**, and only **6.96% heuristic medicine recall**.
- **Audit Resolution:** Corrected in master reports. The single-image scope of Patch V1 is explicitly documented.
- **Mandatory Policy:** Autonomous prescription parsing and automatic reminder generation remain **strictly disabled**. 92.11% of prescriptions must be quarantined for human review.

---

### Issue C4: Missing Ground-Truth Entity Annotations in Mendeley Prescription Dataset
- **Module:** `04_Prescription_OCR`
- **Evidence:** `04_Prescription_OCR/audit_v2/ANNOTATION_INTEGRITY_REPORT.md`
- **Finding:** The public Mendeley Data v2 repository provides raw prescription scans and doctor narrative transcriptions in CSV format, but provides **zero isolated bounding-box or token-level ground-truth labels for drug names, dosages, or frequencies**. Prior "6.96% recall" numbers were calculated using unvalidated regex matching against narrative text, conflating OCR errors with grammatical regex mismatches.
- **Audit Resolution:** Reclassified from "Certified NER Benchmark" to `EXPLORATORY_HEURISTIC_ESTIMATE_UNVALIDATED`.

---

## 3. High Issues (Rank 5–7)

### Issue H1: Severe Class Imbalance & Extreme Patient Constraint in DermoPed ($n=3$ Pediculosis Patients)
- **Module:** `06_DermoPed_Pediatric_Skin`
- **Evidence:** `06_DermoPed_Pediatric_Skin/audit_v3/FINAL_AUDIT_REPORT.md`
- **Finding:** The entire DermoPed dataset available for Pediculosis comprises **only 3 unique human patients** ($n=3$). With 1 patient in training, 1 in validation, and 1 in test, EXP_D achieved 100% test accuracy solely because the single test patient had distinctive visual features, despite suffering 0% recall during validation.
- **Audit Resolution:** Confirmed EXP_B as genuine champion (Validation Macro F1 = 57.76%, Pediculosis recall = 15.00%).
- **Mandatory Policy:** Pediculosis classification on $n=3$ cannot support medical claims. Recommended transition to Chickenpox vs. Measles (Morbilliform Exanthema, 329 MB) for future work.

---

### Issue H2: Lack of Verified Clinical Patient IDs in PCOS Ultrasound Dataset
- **Module:** `02_PCOS_Ultrasound`
- **Evidence:** `02_PCOS_Ultrasound/outputs/cv_metrics.json`
- **Finding:** The public Ovarian Ultrasound Dataset provided no patient identifiers. Clustering 254 images into 244 pseudo-patient components via perceptual hashing protects against near-duplicate visual leakage, but cannot guarantee that multiple scans from the same human ovary did not cross into different folds.
- **Mandatory Policy:** Strictly labeled as `Pseudo-Patient Grouping`, never `Verified Patient-Level Independence`. Must state that morphology classification does not equal Rotterdam PCOS diagnosis.

---

### Issue H3: Small Held-Out Sample Size in PCOS Clinical Tabular ($N=18$)
- **Module:** `01_PCOS_Clinical`
- **Evidence:** `01_PCOS_Clinical/audit_v2/outputs/metrics.json`
- **Finding:** While the 88-patient dataset is verified and free of leakage, the held-out test split has only 18 patients (9 Control, 9 PCOS). A single misclassification alters accuracy by $\pm 5.56\%$.
- **Mandatory Policy:** The primary reported performance metric must be the 10x5 Repeated Cross-Validation mean (**88.57% Balanced Accuracy**, **88.39% Macro F1**), with the held-out 94.44% test score presented with small-sample caveats.

---

## 4. Medium Issues (Rank 8–10)

### Issue M1: Drive C: Storage Exhaustion Risk for Model Checkpoints
- **Module:** Infrastructure / Platform-wide
- **Evidence:** `C:\` free space: 3.71 GB to 5.17 GB (vs. `G:\` free space: 108.53 GB).
- **Finding:** Standard Hugging Face cache defaults to `C:\Users\ASHIK_CSE\.cache\huggingface\hub`. Downloading a 1 GB Whisper-Small checkpoint or storing large weights on `C:` risks drive exhaustion and system crashes.
- **Audit Resolution:** Enforced `HF_HOME=G:\hf_cache` across all scripts. All future weights must reside on Drive `G:`.

---

### Issue M2: Multi-Byte UTF-8 BPE Token Budget Truncation in Bengali Whisper
- **Module:** `05_Bangla_Voice_AI`
- **Evidence:** Initial run of `run_benchmark.py` truncated Bengali sentences at `max_new_tokens=128`.
- **Finding:** Because UTF-8 Bengali characters require 2–3 byte tokens in Whisper's BPE tokenizer, a 120-character Bengali sentence requires ~250–350 tokens. Standard default caps (`max_new_tokens=128`) prematurely cut off transcriptions mid-utterance.
- **Audit Resolution:** Configured `max_new_tokens=440` matching Whisper's native 448-token context window.

---

### Issue M3: Absence of Real Human Clinical Bengali Dictation Audio
- **Module:** `05_Bangla_Voice_AI`
- **Evidence:** `05_Bangla_Voice_AI/pretrained_bengali_comparison/task_03_2/BENGALI_ASR_COMPARISON.md`
- **Finding:** All human Bengali speech evaluated to date originates from Google FLEURS (civic, legal, and news domain text). Medical entity recall is strictly `N/A`. The model's performance on real-world physician hospital dictation in Dhaka or Chittagong remains untested.
- **Mandatory Policy:** Mark clinical term recall as `N/A` on all benchmark charts; forbid autonomous EHR entry.

---

## 5. Low Issues (Rank 11–12)

### Issue L1: Majority-Vote Ties in MCVSLD Validation Families
- **Module:** `03_Measles_Viral_Rash`
- **Evidence:** `03_Measles_Viral_Rash/clean_grouped_split/MAJORITY_VOTE_TIE_AUDIT.csv`
- **Finding:** 3 validation families (`MSL_41_01`, `CPX_11_01`, `MPX_11_01`) experienced 50/50 vote splits among their image crops.
- **Audit Resolution:** Audited and confirmed that ties are consistently resolved by selecting the class with highest mean softmax confidence.

---

### Issue L2: Deprecated Generation Config Schema in Fine-Tuned Checkpoints
- **Module:** `05_Bangla_Voice_AI`
- **Evidence:** Transformers error when loading `anuragshas/whisper-small-bn` with `language="bengali"`.
- **Finding:** Checkpoints created in older Transformers sprints lack `lang_to_id` in their `generation_config.json`.
- **Audit Resolution:** Solved by loading base generation config from `openai/whisper-small` before executing `.generate()`.
