# ShasthoSetu AI — Bilingual Voice ASR & TTS Evaluation Report
**Document ID:** `REP-EVAL-VOICE-01`  
**Subsystem:** Bilingual Speech-to-Text (`whisper-small-bn` + `whisper-base`) & Offline TTS  
**Date:** 2026-11-19 (Reconciled under `AI-QA-FIX-01`)  
**Status:** AGENT-TESTED / LIMITED BENCHMARK COHORT (`AI_QA_PASS_WITH_LIMITATIONS`)  

> **QA Reconciliation Notice (`AI-QA-FIX-01`):** A prior draft of this report contained mismatched synthetic clip IDs (`fleurs_bn_01..06`) and invented example Bengali sentences. All audio inventories, SHA-256 hashes, verbatim reference texts, raw model predictions, and both Sample-Average (Macro) and Corpus (Micro) error rates below come directly from [`05_Bangla_Voice_AI/data/bilingual_test/bilingual_voice_manifest.csv`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/05_Bangla_Voice_AI/data/bilingual_test/bilingual_voice_manifest.csv), [`docs/evidence/AI_RAG_VOICE_OCR_01/voice_benchmark_results.json`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/evidence/AI_RAG_VOICE_OCR_01/voice_benchmark_results.json), and [`docs/AI_QA_FIX_01/VOICE_REFERENCE_PREDICTION_RECONCILIATION.md`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/AI_QA_FIX_01/VOICE_REFERENCE_PREDICTION_RECONCILIATION.md).

---

## 1. Acoustic Benchmark Scope (Human vs. Synthetic Separation)

`eval_voice.py` evaluates **18 clips** (`N = 6` per cohort) strictly separated by audio origin:
1. **Human Bengali Speech (`BN_01..BN_06`):** 6 authentic native Bengali FLEURS recordings (2 speakers × 3 clips, **2 unique non-medical news sentences**) — **100% identical** (`smoke_6_exact_match_with_new_fleurs = True`) to `Smoke_Test_6` of the frozen 26-clip FLEURS audit in [`per_sample_predictions.csv`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/05_Bangla_Voice_AI/pretrained_bengali_comparison/task_03_2/per_sample_predictions.csv).
2. **Synthetic English Clinical (`EN_01..EN_06`):** 6 synthetic clips generated with Windows SAPI5 (`Microsoft Hazel Desktop`).
3. **Synthetic Mixed Code-Switching (`MIX_01..MIX_06`):** 6 synthetic Banglish-English clinical clips generated with Windows SAPI5 (`Microsoft Hazel Desktop`).

---

## 2. Reconciled Metrics: Sample-Average (Macro) vs. Corpus (Micro)

| Cohort (`N`) | Evaluated Engine & Mode | Sample-Avg WER (Raw / Norm) | Corpus WER (Raw / Norm) | Sample-Avg CER (Raw / Norm) | Corpus CER (Raw / Norm) | BN Unicode % | Avg Latency (ms) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Human Bengali FLEURS (`N=6`, 2 sentences)** | `anuragshas/whisper-small-bn` (`bn` / `auto`) | **45.56%** / 33.89% | **45.33%** / 33.33% | **11.41%** / 9.39% | **11.03%** / 8.97% | 97.68% | 1,518.6 (`bn`) / 2,502.8 (`auto`) |
| **Human Bengali FLEURS (`N=6`, 2 sentences)** | `openai/whisper-base` (`en`) | 111.67% / 111.67% | 109.33% / 109.33% | 98.19% / 96.62% | 97.24% / 95.86% | 0.00% | 212.0 |
| **Synthetic English Clinical (`N=6`)** | `openai/whisper-base` (`en` / `auto`) | **8.39%** / 5.36% | **8.33%** / 5.48% | **3.00%** / 2.47% | **3.23%** / 2.65% | 0.00% | 128.5 (`en`) / 240.3 (`auto`) |
| **Synthetic English Clinical (`N=6`)** | `anuragshas/whisper-small-bn` (`bn`) | 100.00% / 100.00% | 100.00% / 100.00% | 95.49% / 95.43% | 95.56% / 95.51% | 98.59% | 1,533.1 |
| **Synthetic Mixed Code-Switch (`N=6`)** | `openai/whisper-base` (`en` / `auto`) | **48.24%** / 38.86% | **48.65%** / 39.19% | **18.38%** / 13.36% | **18.22%** / 13.16% | 0.00% | 139.2 (`en`) / 158.6 (`auto`) |
| **Synthetic Mixed Code-Switch (`N=6`)** | `anuragshas/whisper-small-bn` (`bn`) | 105.93% / 105.93% | 105.41% / 105.41% | 114.64% / 114.25% | 111.62% / 111.09% | 97.41% | 1,575.2 |

*Cross-Check vs. Full Frozen 26-Clip Bengali FLEURS Baseline (22 sentences, 22 speakers):* `Smoke_Test_6` matches (`45.56%` Sample-Avg Raw WER); full 26-clip `per_sample_predictions.csv` (`whisper-small-bn`) recomputes via `jiwer` to Sample-Avg Raw WER = **45.80%**, Corpus Raw WER = **45.62%**, Sample-Avg Norm WER = **38.23%**, Corpus Norm WER = **38.92%**.

---

## 3. Verbatim References, Audio Hashes & Auto-Routing Raw Predictions (`N = 18`)

*(Full byte sizes and SHA-256 hashes for every `.wav` file are archived in [`VOICE_REFERENCE_PREDICTION_RECONCILIATION.md`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/AI_QA_FIX_01/VOICE_REFERENCE_PREDICTION_RECONCILIATION.md).)*

| ID | File | SHA-256 (Prefix) | Ground Truth Text | Raw Auto-Routing Hypothesis (`hyp_text`) | Raw WER / CER |
| :---: | :--- | :--- | :--- | :--- | :---: |
| `BN_01` | `bn_sample_01.wav` | `7e289eb422a3` | এটিকে মঙ্গলবার কেটে ফেলার কথা ছিল তবে আদালতের জরুরী রায় আসার পরে এটি বাঁচানো হয় | এটিকে মঙ্গলবার কেটে ফেলার কথা ছিল, তবে আদালতের জরুরিরায় আসার পরে এটি বাচানো হয়। | 33.33% / 6.17% |
| `BN_02` | `bn_sample_02.wav` | `c9d293d3c9b1` | এটিকে মঙ্গলবার কেটে ফেলার কথা ছিল তবে আদালতের জরুরী রায় আসার পরে এটি বাঁচানো হয় | এটিকে মঙ্গোলবার কেটে ফেলার কথা ছিল, তবে আদালতে জরুরি রায় আসার পরে এটি বাচানো হয়। | 40.00% / 7.41% |
| `BN_03` | `bn_sample_03.wav` | `3f82af128e7a` | এটিকে মঙ্গলবার কেটে ফেলার কথা ছিল তবে আদালতের জরুরী রায় আসার পরে এটি বাঁচানো হয় | এটিকে মূঙ্গলবার কেঁটে খেলার কথা ছিল, কবে আদালতে জরুরই রায় আসার পরে এটি বাচানো হয়। | 60.00% / 11.11% |
| `BN_04` | `bn_sample_04.wav` | `a14dde77aa76` | চক্রান্ত বিশ্লেষণ করে ফলাফল একটি পাবলিক ওয়েবসাইটে পোস্ট করা হবে | চপ্ত্রান্ত্র বিশ্লেশন করে ফলাফল একটি পাবলিক ওয়েব সাইটে প্রকাশ করা হবে। | 60.00% / 21.88% |
| `BN_05` | `bn_sample_05.wav` | `a67fea15c3f6` | চক্রান্ত বিশ্লেষণ করে ফলাফল একটি পাবলিক ওয়েবসাইটে পোস্ট করা হবে | চক্রান্ত বিশ্লেশন করে ফলাফল একটি প্যাপলিক ওয়েবসাইডে পোস্ট করা হবে। | 40.00% / 10.94% |
| `BN_06` | `bn_sample_06.wav` | `444737882c86` | চক্রান্ত বিশ্লেষণ করে ফলাফল একটি পাবলিক ওয়েবসাইটে পোস্ট করা হবে | চক্রান্ত বিশ্লেশন করে ফলাফল একটি পাবলি কোয়েফসাইটে পোস্ট করা হবে। | 40.00% / 10.94% |
| `EN_01` | `en_clinical_01.wav` | `d39c8e61136b` | Patient blood pressure is 120 over 80 and heart rate is 72 beats per minute. | Patient blood pressure is 120 over 80 and heart rate is 72 beats per minute. | 0.00% / 0.00% |
| `EN_02` | `en_clinical_02.wav` | `69bd32aa5b22` | Prescribe Amoxicillin 500 milligrams capsules three times daily after meals for seven days. | Prescribe a Moxasillin 500 mg capsules three times daily after meals for seven days. | 23.08% / 14.29% |
| `EN_03` | `en_clinical_03.wav` | `f599283507a7` | Patient presents with high fever productive cough and severe chest discomfort. | Patient presence with high fever productive cough and severe chest discomfort. | 9.09% / 2.56% |
| `EN_04` | `en_clinical_04.wav` | `9afc691f346c` | Urgent referral required transfer patient to intensive care unit immediately. | Urgent referral required transfer patient to intensive care unit immediately. | 0.00% / 0.00% |
| `EN_05` | `en_clinical_05.wav` | `a394e1920c08` | Order fasting blood sugar serum creatinine lipid profile and 12-lead electrocardiogram. | Order fasting blood sugar serum creatinine lipid profile and 12 lead electrocardiogram. | 18.18% / 1.15% |
| `EN_06` | `en_clinical_06.wav` | `769c80c20f4a` | Pediatric patient has maculopapular rash on face and trunk suspected measles infection. | Pediatric patient has maculopapular rash on face and trunk suspected measles infection. | 0.00% / 0.00% |
| `MIX_01` | `mix_codeswitch_01.wav` | `f5c49fdbe8d3` | Patient er blood pressure 130 over 80 and temperature 101 degrees Fahrenheit. | Patient ER blood pressure 130 over 80 in temperature 101 degrees Fahrenheit. | 16.67% / 5.19% |
| `MIX_02` | `mix_codeswitch_02.wav` | `93ed111a1022` | Cap Moxacil 500 milligram dine tin bar after meal 7 din continue korben. | CAP Moxasil 500mg Dynetin bar after meal 7 didn't continue Corbin | 61.54% / 27.78% |
| `MIX_03` | `mix_codeswitch_03.wav` | `7b19488a1e4e` | Patient complaining of acute chest pain emergency ward e admit korte hobe. | Patient complaining of acute chest pain emergency warde admit corti-hold | 33.33% / 9.46% |
| `MIX_04` | `mix_codeswitch_04.wav` | `a750520831ac` | Fasting blood sugar ebong ECG report shathe niye next week e follow up ashben. | Fasting Blood Sugar Abung ECG Report Chathay 9 next week eFollow up Ashbin | 64.29% / 21.79% |
| `MIX_05` | `mix_codeswitch_05.wav` | `94ce0ae8d501` | Tab Napa Extra 500 milligram SOS basis e fever ashle khaben. | Tabnappa extra 500 milligram SOS basis e-feaver asholcuban. | 63.64% / 21.67% |
| `MIX_06` | `mix_codeswitch_06.wav` | `64daa0415d9f` | Pediatric patient er viral exanthem rash dekha geche Koplik spots check koren. | Pediatric patient ER viral Xantham rash deca-ca-cola spots check Koran. | 50.00% / 24.36% |

---

## 4. Safety Gate & Graceful Fallback Verification

1. **Drug-Name Misrecognition Proves Non-Bypassable Transcript Confirmation:** Real ASR distortions (`Amoxicillin` -> `a Moxasillin`, `Tab Napa Extra` -> `Tabnappa extra`) verify why voice transcripts are **never** auto-submitted as clinical orders; the user must inspect/edit and confirm (`is_confirmed = 1`) before `/v1/ai/chat` invocation.
2. **Speech Availability & Feature Flag Fallbacks (`test_qa_fix_7`):** When `mms-tts-ben` is unavailable locally, `/v1/ai/voice/synthesize` returns HTTP `200` with `{available: False}` rather than failing hard; when `voice_ai_enabled = 0`, ASR/TTS routes return `503 FEATURE_DISABLED` cleanly.
3. **Dataset Limitations:** Evaluation is constrained to `N = 6` clips per cohort (with synthetic SAPI5 audio for English and Banglish, and `2` unique non-medical sentences for Human FLEURS); noisy real clinical speech requires field evaluation before clinical deployment.
