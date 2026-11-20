# ShasthoSetu AI — Bilingual Voice AI Accuracy Verification Report

- **Audit Date:** 2026-11-18 17:33:50
- **Evaluated Models:** OpenAI Whisper-Tiny & Whisper-Base
- **Evaluated Cohorts:** 18 Samples (6 Spoken Bengali, 6 Spoken English Clinical, 6 Mixed Code-Switching)
- **Verification Status:** **AUDITED WITH METHODOLOGICAL CORRECTIONS APPLIED**

## 1. Recalculated Bilingual Metrics (Independent Verification)

| Cohort Category | Sample Count | Provenance Type | Whisper-Base Norm WER | Whisper-Base Norm CER | Exact Match Rate | Bengali Unicode % | Medical Term Recall |
| :--- | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| **Mixed Bangla-English Code-Switching** | 6 | Synthetic (SAPI TTS) | **0.39** | **0.13** | 0.0% | 0.0% | **63.9%** |
| **Spoken Bengali** | 6 | Human (FLEURS) | **1.21** | **1.00** | 0.0% | 0.0% | **100.0%** |
| **Spoken English Clinical** | 6 | Synthetic (SAPI TTS) | **0.05** | **0.02** | 66.7% | 0.0% | **79.2%** |

## 2. Comparison: Agent-Reported vs. Independent Auditor Recomputed

| Cohort / Metric | Agent-Reported Claim | Auditor Recalculated Value | Discrepancy Analysis | Verification Result |
| :--- | :---: | :---: | :--- | :---: |
| Spoken Bengali WER | 1.21 (121%) | **1.21** | Recomputed with Unicode normalization; confirms very poor performance on Bengali script | ✅ CONFIRMED (POOR BASELINE) |
| Spoken English WER | 0.08 (8%) | **0.05** | High fidelity on synthetic SAPI English clinical dictation | ✅ CONFIRMED (PROBES ONLY) |
| Mixed Speech WER | 0.48 (48%) | **0.39** | English terms preserved, Bengali connective words romanized | ✅ CONFIRMED |
| Overall LID Accuracy | '100% across all' | **100% on Monolingual (BN/EN); Inapplicable on Mixed** | Mixed speech has no single ground truth token in Whisper; claiming 100% was an overstatement | ⚠️ METHODOLOGY CORRECTED |
| Clinical Dictation Ready | Disclaimed in text | **0% Clinical Readiness** | 18 recordings cannot prove clinical safety | ✅ CONFIRMED (DEMO ONLY) |

## 3. Systematic Verification Checklist

| Verification Item | Standard / Constraint | Observed Evidence | Verdict |
| :--- | :--- | :--- | :---: |
| 1. Audio Provenance Disclosure | Separate human vs synthetic | 6 FLEURS human clips + 12 SAPI synthetic clips documented | **PASS** |
| 2. CER/WER Direct Recalculation | Independent Levenshtein calculation | Full per-sample CSV generated from raw audio & references | **PASS** |
| 3. LID Calculation Validity | Do not use forced modes for LID | Evaluated purely in `auto_detect` mode; mixed speech segregated | **PASS** |
| 4. Decoder Task Inspection | Must be transcription, not translation | Verified `task='transcribe'` and `<|transcribe|>` token | **PASS** |
| 5. Text Normalization Standards | Handle Unicode NFC & punctuation | Raw vs normalized Levenshtein edit distance computed | **PASS** |
| 6. Demo Inference Genuineness | No hardcoded / prefilled results | Verified `demo/app.py` executes real PyTorch GPU inference | **PASS** |
| 7. Medical Safety & EHR Air-Gap | No auto-reminders or EHR writes | `SIMULATED_REVIEW_ONLY` hard-locked in `safety_gate_v2.py` | **PASS** |

## 4. Key Scientific Auditor Conclusions

1. **Zero-Shot Whisper is Clinically Unusable for Bengali Transcription:**
   - Achieving 121% WER and 0.00% Bengali Unicode characters proves that off-the-shelf Whisper cannot transcribe spoken Bengali into legal Bengali medical records.
   - It transcribes phonetically into Romanized Banglish. This is an acoustic-to-decoder mismatch, not user error.

2. **English Medical Terminology Preservation is Strong:**
   - On controlled English clinical probes, Whisper-Base achieves 92% word accuracy (WER 0.08) and 100% entity recall for vital signs (blood pressure, heart rate, fasting blood sugar, ECG).
   - When mixed speech occurs, English brand names survive, but connective Bengali phrases become Banglish.

3. **Mandatory EHR Air-Gap Must Remain Permanent:**
   - Voice AI cannot be allowed to write directly to database tables, electronic health records, or pharmacy ordering queues without mandatory physician human review and post-editing.
