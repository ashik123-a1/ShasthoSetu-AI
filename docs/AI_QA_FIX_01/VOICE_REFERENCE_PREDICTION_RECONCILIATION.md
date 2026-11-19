# ShasthoSetu AI — Voice Benchmark Reference, Prediction & Hash Reconciliation (`AI-QA-FIX-01`)

**Audit Date:** 2026-11-19  
**Primary Manifest & Audio Directory:** [`05_Bangla_Voice_AI/data/bilingual_test/bilingual_voice_manifest.csv`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/05_Bangla_Voice_AI/data/bilingual_test/bilingual_voice_manifest.csv)  
**Primary Raw Predictions JSON:** [`docs/evidence/AI_RAG_VOICE_OCR_01/voice_benchmark_results.json`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/evidence/AI_RAG_VOICE_OCR_01/voice_benchmark_results.json)  
**Frozen 26-Clip FLEURS Baseline:** [`05_Bangla_Voice_AI/pretrained_bengali_comparison/task_03_2/per_sample_predictions.csv`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/05_Bangla_Voice_AI/pretrained_bengali_comparison/task_03_2/per_sample_predictions.csv)  
**Reconciliation Script:** [`services/api/evals/reconcile_qa_fix_01.py`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/services/api/evals/reconcile_qa_fix_01.py)  

---

## 1. Resolution of the FLEURS Example Discrepancy

Independent QA review flagged that the previous [`VOICE_EVALUATION_REPORT.md`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/AI_RAG_VOICE_OCR_01/VOICE_EVALUATION_REPORT.md) printed 6 different invented sentences (and non-existent clip IDs `fleurs_bn_01..06`, `en_clin_01..06`, `mix_cs_01..06` with fake medical Bengali examples), whereas the actual `Smoke_Test_6` FLEURS cohort has only **2 unique reference sentences across 6 clips**.

**Audit Finding:** **The prior markdown report contained hand-fabricated prose examples** that did **NOT** match `voice_benchmark_results.json` or `bilingual_voice_manifest.csv`. The actual `bn_sample_01.wav..06.wav` clips used in `eval_voice.py` are **100% identical** (`smoke_6_exact_match_with_new_fleurs = True`) to the frozen `Smoke_Test_6` FLEURS clips audited in `per_sample_predictions.csv` (2 speakers × 3 clips = 2 distinct non-medical news sentences). Meanwhile, the broader frozen 26-clip FLEURS audit covers **22 unique sentences** across 22 speakers (`Smoke_Test_6` + `Extended_FLEURS_20`).

---

## 2. Exact Audio Inventory & SHA-256 Hashes (`18` Clips in `bilingual_test/`)

| ID | Cohort Label (`HUMAN` vs `SYNTHETIC`) | Audio File | Dur (s) | Size (B) | SHA-256 Hash | Full Ground-Truth Reference Text |
| :--- | :--- | :--- | :---: | :---: | :--- | :--- |
| `BN_01` | Human FLEURS (`bn_in`, Spk 1530) | `bn_sample_01.wav` | 7.08 | 453,178 | `7e289eb422a38ae828402647579933188aa79c6cdcc470ce31eee480a43f11f0` | এটিকে মঙ্গলবার কেটে ফেলার কথা ছিল তবে আদালতের জরুরী রায় আসার পরে এটি বাঁচানো হয় |
| `BN_02` | Human FLEURS (`bn_in`, Spk 1530) | `bn_sample_02.wav` | 8.82 | 564,538 | `c9d293d3c9b1739219f0ae524a0766471c3ddfc4a23753379584fdcfa830c5e1` | এটিকে মঙ্গলবার কেটে ফেলার কথা ছিল তবে আদালতের জরুরী রায় আসার পরে এটি বাঁচানো হয় |
| `BN_03` | Human FLEURS (`bn_in`, Spk 1530) | `bn_sample_03.wav` | 8.82 | 564,538 | `3f82af128e7a3bacaff16a6bfc8f81447d4574e65517e2f388521d441abef2ab` | এটিকে মঙ্গলবার কেটে ফেলার কথা ছিল তবে আদালতের জরুরী রায় আসার পরে এটি বাঁচানো হয় |
| `BN_04` | Human FLEURS (`bn_in`, Spk 1552) | `bn_sample_04.wav` | 8.52 | 545,338 | `a14dde77aa767ec1aba01ae4b4d3ed48542f485ea71d07a92b2c4c41b4ceed00` | চক্রান্ত বিশ্লেষণ করে ফলাফল একটি পাবলিক ওয়েবসাইটে পোস্ট করা হবে |
| `BN_05` | Human FLEURS (`bn_in`, Spk 1552) | `bn_sample_05.wav` | 7.62 | 487,738 | `a67fea15c3f655ddffd20b5b4f6f134d8fa4cfed449aaff092d4f3a84b2d8516` | চক্রান্ত বিশ্লেষণ করে ফলাফল একটি পাবলিক ওয়েবসাইটে পোস্ট করা হবে |
| `BN_06` | Human FLEURS (`bn_in`, Spk 1552) | `bn_sample_06.wav` | 7.68 | 491,578 | `444737882c8696eee8450560799d6da9120214f43536a190becaf151286d1eb0` | চক্রান্ত বিশ্লেষণ করে ফলাফল একটি পাবলিক ওয়েবসাইটে পোস্ট করা হবে |
| `EN_01` | Synthetic SAPI5 (`Hazel`) | `en_clinical_01.wav` | 6.04 | 193,428 | `d39c8e61136b8c434135e40d09642a2d35b2f054780f82502718e95377118079` | Patient blood pressure is 120 over 80 and heart rate is 72 beats per minute. |
| `EN_02` | Synthetic SAPI5 (`Hazel`) | `en_clinical_02.wav` | 6.59 | 210,862 | `69bd32aa5b22c324a0691633249395d44dba177ce8f4f17baf096e4bae61eb9d` | Prescribe Amoxicillin 500 milligrams capsules three times daily after meals for seven days. |
| `EN_03` | Synthetic SAPI5 (`Hazel`) | `en_clinical_03.wav` | 4.79 | 153,272 | `f599283507a7fbace04b060bf430d90e30f1d0c510b2659d3f5c9f29164d0a4d` | Patient presents with high fever productive cough and severe chest discomfort. |
| `EN_04` | Synthetic SAPI5 (`Hazel`) | `en_clinical_04.wav` | 5.02 | 160,630 | `9afc691f346cd8d959a8088c1486ddaf91d8f22c413ac7acc5c79c1562436d0e` | Urgent referral required transfer patient to intensive care unit immediately. |
| `EN_05` | Synthetic SAPI5 (`Hazel`) | `en_clinical_05.wav` | 6.21 | 198,866 | `a394e1920c08718667441f90c756fca67901f14495c355808a2df0acce4a237c` | Order fasting blood sugar serum creatinine lipid profile and 12-lead electrocardiogram. |
| `EN_06` | Synthetic SAPI5 (`Hazel`) | `en_clinical_06.wav` | 6.06 | 194,068 | `769c80c20f4a9142abfa3a2246dcbc37f661ba6d9c964e49902ccbd3fa007c7a` | Pediatric patient has maculopapular rash on face and trunk suspected measles infection. |
| `MIX_01` | Synthetic SAPI5 (`Hazel`) | `mix_codeswitch_01.wav` | 6.73 | 215,342 | `f5c49fdbe8d34baeb752bf79c9b1f075e9ee59d50935ce353c5337df1d779a32` | Patient er blood pressure 130 over 80 and temperature 101 degrees Fahrenheit. |
| `MIX_02` | Synthetic SAPI5 (`Hazel`) | `mix_codeswitch_02.wav` | 5.95 | 190,552 | `93ed111a1022403861c7905b2f17c157406ca521174a65b4953593ece91d3312` | Cap Moxacil 500 milligram dine tin bar after meal 7 din continue korben. |
| `MIX_03` | Synthetic SAPI5 (`Hazel`) | `mix_codeswitch_03.wav` | 4.97 | 159,194 | `7b19488a1e4e1799eff1a4a97f2894fb79f39a6e7a79e4d8802529ab91acbb72` | Patient complaining of acute chest pain emergency ward e admit korte hobe. |
| `MIX_04` | Synthetic SAPI5 (`Hazel`) | `mix_codeswitch_04.wav` | 5.77 | 184,638 | `a750520831ac7e2c1bcf6f195e2b015d3aa150b0123ea0a16990651837f8969a` | Fasting blood sugar ebong ECG report shathe niye next week e follow up ashben. |
| `MIX_05` | Synthetic SAPI5 (`Hazel`) | `mix_codeswitch_05.wav` | 5.33 | 170,716 | `94ce0ae8d501124698cb59f430426dcc98d54ebce36550076a649917d4c1f429` | Tab Napa Extra 500 milligram SOS basis e fever ashle khaben. |
| `MIX_06` | Synthetic SAPI5 (`Hazel`) | `mix_codeswitch_06.wav` | 5.67 | 181,592 | `64daa0415d9f15134a417a560e9a1764d2874d6536bc91abe1d1bc5759e3a781` | Pediatric patient er viral exanthem rash dekha geche Koplik spots check koren. |

---

## 3. Independently Recalculated Corpus (Micro) vs. Sample-Average (Macro) WER / CER

Computed deterministically from primary predictions via `jiwer`:

| Cohort (`N`) | Evaluated Configuration | Sample-Avg WER (Raw / Norm) | Corpus WER (Raw / Norm) | Sample-Avg CER (Raw / Norm) | Corpus CER (Raw / Norm) | BN Unicode % | Avg Latency (ms) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Human Bengali FLEURS (`N=6`, 2 sentences)** | `anuragshas/whisper-small-bn` (`bn` / `auto`) | **45.56%** / **33.89%** | **45.33%** / **33.33%** | **11.41%** / **9.39%** | **11.03%** / **8.97%** | 97.68% | 1,518.6 (`bn`) / 2,502.8 (`auto`) |
| **Human Bengali FLEURS (`N=6`, 2 sentences)** | `openai/whisper-base` (`en`) | 111.67% / 111.67% | 109.33% / 109.33% | 98.19% / 96.62% | 97.24% / 95.86% | 0.00% | 212.0 |
| **Synthetic English Clinical (`N=6`)** | `openai/whisper-base` (`en` / `auto`) | **8.39%** / **5.36%** | **8.33%** / **5.48%** | **3.00%** / **2.47%** | **3.23%** / **2.65%** | 0.00% | 128.5 (`en`) / 240.3 (`auto`) |
| **Synthetic English Clinical (`N=6`)** | `anuragshas/whisper-small-bn` (`bn`) | 100.00% / 100.00% | 100.00% / 100.00% | 95.49% / 95.43% | 95.56% / 95.51% | 98.59% | 1,533.1 |
| **Synthetic Mixed Code-Switch (`N=6`)** | `openai/whisper-base` (`en` / `auto`) | **48.24%** / **38.86%** | **48.65%** / **39.19%** | **18.38%** / **13.36%** | **18.22%** / **13.16%** | 0.00% | 139.2 (`en`) / 158.6 (`auto`) |
| **Synthetic Mixed Code-Switch (`N=6`)** | `anuragshas/whisper-small-bn` (`bn`) | 105.93% / 105.93% | 105.41% / 105.41% | 114.64% / 114.25% | 111.62% / 111.09% | 97.41% | 1,575.2 |

### Reconciliation With Frozen 26-Clip Bengali FLEURS Benchmark (`05_Bangla_Voice_AI/.../per_sample_predictions.csv`)
- **Total Frozen Bengali FLEURS Clips:** 26 clips (22 unique sentences, 22 speakers: `Smoke_Test_6` + `Extended_FLEURS_20`).
- **Frozen `Smoke_Test_6` (`whisper-small-bn`) Sample-Avg Raw WER:** **45.56%** (exact match with `BN_01..BN_06` above).
- **Frozen `Extended_FLEURS_20` Sample-Avg Raw WER:** **45.88%**.
- **All 26 FLEURS Clips (`whisper-small-bn`)**: Sample-Avg Raw WER = **45.80%**, Corpus Raw WER = **45.62%**, Sample-Avg Norm WER = **38.23%**, Corpus Norm WER = **38.92%**. *(Note: the previously reported `39.09%` norm WER in `AUD-01` came from slightly different punctuation/whitespace normalization; `38.92%` corpus / `38.23%` macro is the exact `jiwer` calculation under Unicode NFC punctuation stripping).*

---

## 4. Full Raw Predictions Under Bilingual Auto-Routing (`auto`)

| Sample ID | Raw Auto-Routing Hypothesis (`hyp_text`) | Raw WER | Raw CER |
| :--- | :--- | :---: | :---: |
| `BN_01` | এটিকে মঙ্গলবার কেটে ফেলার কথা ছিল, তবে আদালতের জরুরিরায় আসার পরে এটি বাচানো হয়। | 33.33% | 6.17% |
| `BN_02` | এটিকে মঙ্গোলবার কেটে ফেলার কথা ছিল, তবে আদালতে জরুরি রায় আসার পরে এটি বাচানো হয়। | 40.00% | 7.41% |
| `BN_03` | এটিকে মূঙ্গলবার কেঁটে খেলার কথা ছিল, কবে আদালতে জরুরই রায় আসার পরে এটি বাচানো হয়। | 60.00% | 11.11% |
| `BN_04` | চপ্ত্রান্ত্র বিশ্লেশন করে ফলাফল একটি পাবলিক ওয়েব সাইটে প্রকাশ করা হবে। | 60.00% | 21.88% |
| `BN_05` | চক্রান্ত বিশ্লেশন করে ফলাফল একটি প্যাপলিক ওয়েবসাইডে পোস্ট করা হবে। | 40.00% | 10.94% |
| `BN_06` | চক্রান্ত বিশ্লেশন করে ফলাফল একটি পাবলি কোয়েফসাইটে পোস্ট করা হবে। | 40.00% | 10.94% |
| `EN_01` | Patient blood pressure is 120 over 80 and heart rate is 72 beats per minute. | 0.00% | 0.00% |
| `EN_02` | Prescribe a Moxasillin 500 mg capsules three times daily after meals for seven days. | 23.08% | 14.29% |
| `EN_03` | Patient presence with high fever productive cough and severe chest discomfort. | 9.09% | 2.56% |
| `EN_04` | Urgent referral required transfer patient to intensive care unit immediately. | 0.00% | 0.00% |
| `EN_05` | Order fasting blood sugar serum creatinine lipid profile and 12 lead electrocardiogram. | 18.18% | 1.15% |
| `EN_06` | Pediatric patient has maculopapular rash on face and trunk suspected measles infection. | 0.00% | 0.00% |
| `MIX_01` | Patient ER blood pressure 130 over 80 in temperature 101 degrees Fahrenheit. | 16.67% | 5.19% |
| `MIX_02` | CAP Moxasil 500mg Dynetin bar after meal 7 didn't continue Corbin | 61.54% | 27.78% |
| `MIX_03` | Patient complaining of acute chest pain emergency warde admit corti-hold | 33.33% | 9.46% |
| `MIX_04` | Fasting Blood Sugar Abung ECG Report Chathay 9 next week eFollow up Ashbin | 64.29% | 21.79% |
| `MIX_05` | Tabnappa extra 500 milligram SOS basis e-feaver asholcuban. | 63.64% | 21.67% |
| `MIX_06` | Pediatric patient ER viral Xantham rash deca-ca-cola spots check Koran. | 50.00% | 24.36% |

Notice real drug-name distortion in `MIX_05` (`Tab Napa Extra` -> `Tabnappa extra`) and `EN_02` (`Amoxicillin` -> `a Moxasillin`), proving conclusively why the **mandatory editable transcript confirmation gate** (`is_confirmed = 1` before `/v1/ai/chat`) is required.
