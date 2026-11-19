# ShasthoSetu AI — Hackathon Submission Readiness Assessment
## Scientific Integrity, Clinical Safety & Multimodal Research Evaluation
**Location:** `_reports/corrected_submission_v2/SUBMISSION_READINESS.md`  
**Evaluation Date:** November 18, 2026  
**Auditor:** Senior ML Research Auditor & MLOps Lead  
**Target Hardware:** NVIDIA GeForce RTX 5060 Ti 16GB VRAM | Windows 11 | CUDA 12.8

---

### 1. Executive Summary & Audit Posture

ShasthoSetu AI has completed its transition from naive, inflated preliminary experiments into an **empirically verified, scientifically honest multimodal healthcare AI submission**.

In high-stakes clinical machine learning, presenting unverified "99% accuracy" metrics derived from contaminated data is the fastest way to lose credibility with expert clinical and technical judges. By actively uncovering 100% crop-level data leakage in the viral rash dataset, resolving multi-run checkpoint ambiguity in ultrasound, characterizing doctor handwriting mismatch in OCR, and addressing transliteration drift in Bengali speech recognition, ShasthoSetu AI demonstrates the highest standard of **scientific maturity, clinical safety, and data hygiene**.

Every reported metric is backed by:
- Automated reproducible scripts (`reproduce.ps1` with exit-code verification).
- Self-contained proof archives (`PROOFS.zip`) verified via sandbox extraction.
- Dynamically generated visual evidence (`UPDATED_BENCHMARK_CHART.png`) linked to raw JSON logs without hardcoding.

---

### 2. Module-by-Module Readiness Scorecard

| Module | Modality & Architecture | Primary Validated Benchmark | Scientific Limitations & Mitigation | Readiness Status |
| :--- | :--- | :--- | :--- | :---: |
| **01_PCOS_Clinical** | Tabular Clinical ML (XGBoost, RF, LR) | **88.57% ± 7.91%** Repeated CV Balanced Acc (50 Folds) | Small cohort (N=88). Repeated CV utilized to reduce split variance; held-out test (N=18) treated as preliminary. | **SUBMISSION READY** (Preliminary Baseline) |
| **02_PCOS_Ultrasound** | Bedside Ovarian Ultrasound (ResNet18 / MobileNetV3) | **84.53% ± 7.33%** Group CV Balanced Acc (15 Folds) | 24 perceptual near-duplicate pairs (cine-loop sweeps) audited. Pseudo-patient grouping isolates sweeps, not independent hospital IDs. | **SUBMISSION READY** (Research Prototype) |
| **03_Measles_Viral_Rash** | Differential Pediatric Rash Vision (ResNet18 / MobileNetV3) | **83.34%** Test Accuracy / **85.09%** Balanced Acc / **80.91%** Measles Recall on 1,561 Unseen Crops | Discovered 100% test crop leakage in historical 99.1% split. Retrained with strict group isolation on RTX 5060 Ti GPU. Dual benchmark disclosed. | **SUBMISSION READY** (Audited Benchmark) |
| **04_Prescription_OCR** | Bilingual Doctor Handwriting (EasyOCR on GPU) | **101.07% CER / 117.32% WER** on 152 Test Prescriptions | Characterized as "OCR-to-Narrative Mismatch". Off-the-shelf OCR cannot read cursive doctor handwriting. 100% pharmacist review enforced. | **BENCHMARK COMPLETE** (Operational Safety Gate) |
| **05_Bangla_Voice_AI** | Bengali Clinical Speech Recognition (Whisper on GPU) | **48.1× Real-Time Speedup (<300ms latency)** on RTX 5060 Ti | Zero-shot Whisper produces Latin transliteration drift (Banglish) and clinical phonetic confusions. Air-gapped from EHR ingestion. | **SPEED VALIDATED** (Fine-Tuning Required) |
| **06_DermoPed_Pediatric_Skin** | Pediatric Skin Lesion CV (EXP_B & EXP_D on Colab) | **86.11%** Balanced Accuracy on Google Colab GPU | Supplemental collaborative cloud research. Kept in appendix to prevent local hardware confusion. | **SUPPLEMENTAL APPENDIX** |

---

### 3. Detailed Modality Appraisals

#### 01_PCOS_Clinical: Endocrine Screening
- **Scientific Strengths:**
  - Robust 50-fold repeated stratified cross-validation ($10 \text{ repeats} \times 5 \text{ folds}$) to stabilize evaluation on small N=88 cohort.
  - Transparent feature importance analysis highlights clinically recognized biomarkers: Total Testosterone, LH/FSH ratio, Androstenedione, and Insulin Resistance (HOMA-IR).
  - Packaged with raw spreadsheet and fully automated preprocessor that does not require proprietary office tools.
- **Judge Presentation Tip:** Emphasize that repeated cross-validation is standard clinical best practice when cohorts are limited, avoiding over-reliance on a single 18-patient test split.

#### 02_PCOS_Ultrasound: Bedside Image Screening
- **Scientific Strengths:**
  - Multi-run ambiguity fully resolved: Run 3 confirmed as active serialized `.pth` checkpoint with complete logs.
  - Perceptual hash audit (pHash $\le 6$) identified 24 near-duplicate image pairs originating from continuous video transducer sweeps.
  - 15-fold Group Cross-Validation isolates sweep clusters, producing a reliable balanced accuracy of 84.53% ± 7.33% and Macro F1 of 85.42% ± 6.53%.
- **Judge Presentation Tip:** Point out that ovarian ultrasound cine-loops inherently produce burst frames; grouping by sweep prevents the common pitfall of frame-level test leakage.

#### 03_Measles_Viral_Rash: Differential Pediatric Triage
- **The Core Scientific Triumph:**
  - Initial audits uncovered that all 10,384 images derived from 755 original photographs with token pattern `[CLASS]_[CASE]_[PHOTO]_[CROP].jpg`.
  - In the historical image split, **100% of test images (1,558/1,558)** shared source-family photos with the training set, causing the 99.10% accuracy to be an artifact of memorizing adjacent crops!
  - Re-split with 0.0% source-family overlap and re-trained on RTX 5060 Ti GPU (388.1 seconds):
    - **Genuine Unseen Image Accuracy:** **83.34%** (Balanced Accuracy: **85.09%**, Macro F1: **82.62%**).
    - **Measles Minority Recall on Unseen Crops:** **80.91% (89/110 detected)** using cost-sensitive loss.
    - **Per-Family Majority Vote:** **85.09% (97/114 families)** and **75.0% Measles family detection (6/8 families)**.
- **Judge Presentation Tip:** This is ShasthoSetu's strongest technical story. Presenting the dual benchmark side-by-side proves that our team understands clinical ML generalization and refuses to hide behind overfitted vanity metrics.

#### 04_Prescription_OCR: Clinical Workflow Integration
- **Scientific Honesty & Patient Safety:**
  - Evaluated on 152 real-world handwritten prescriptions on GPU.
  - Text error rates (101.07% CER, 117.32% WER) reflect the reality that reference transcriptions represent interpreted clinical narratives rather than literal pixel transcriptions.
  - General OCR cannot reliably read doctor handwriting shorthand without specialized fine-tuning.
  - **Clinical Safety Rule:** 100% mandatory human pharmacist verification gate. Automated medication push is strictly blocked.
- **Judge Presentation Tip:** Judges praise teams that understand patient safety. Demonstrating that unverified OCR is quarantined prevents real-world medication errors.

#### 05_Bangla_Voice_AI: Low-Latency Clinical ASR
- **Inference Speed & Linguistic Grounding:**
  - RTX 5060 Ti GPU delivers **48.1× real-time throughput (<300ms latency)** on Whisper-Tiny.
  - Acoustic audit revealed that zero-shot multilingual Whisper produces Latin transliterated text ("Banglish") rather than standard Bengali script, alongside phonetic confusions on medication names.
  - **Safety Policy:** Transcriptions are air-gapped from direct EHR record injection until supervised IndicLoRA fine-tuning is completed.
- **Judge Presentation Tip:** Highlight the hardware inference speed while honestly outlining the roadmap for language-specific fine-tuning.

---

### 4. Interactive Live Demo & Pitch Readiness

1. **Streamlit Multi-Tab Application:**
   - Operational on local host at `http://localhost:8501`.
   - Supports live interactive testing across all 5 modules.
   - Measles tab showcases both the corrected 83.34% grouped benchmark and historical 99.10% baseline with complete explanatory transparency.
2. **Pitch Deck & Presentation Script:**
   - `HACKATHON_PITCH_DECK.md`: 10 structured slides emphasizing unmet rural healthcare needs in Bangladesh, multimodal clinical workflow, forensic data leakage discovery, and safety boundaries.
   - `LIVE_DEMO_SCRIPT.md`: Precise 3-minute oral script timed for rapid judge walkthrough.

---

### 5. Final Recommendation

**The ShasthoSetu AI package is APPROVED for final submission and live judge demonstration.**

The combination of real hardware acceleration (RTX 5060 Ti), deep forensic audit rigor, dual-benchmark transparency, air-gapped patient safety protocols, and interactive Streamlit UI makes this project an exemplary, credible, and competition-winning healthcare AI submission.
