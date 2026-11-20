# Bengali ASR GPU Benchmark & Cross-Corpus Comparison Report
**Module:** `05_Bangla_Voice_AI`  
**Task:** TASK 03.2 — Local RTX 5060 Ti Evaluation of Fine-Tuned Bengali Whisper vs. Multilingual Baseline  
**Execution Date:** 2026-11-18  
**Hardware:** NVIDIA GeForce RTX 5060 Ti (16 GB VRAM) | CUDA 12.8 | PyTorch 2.11.0+cu128  
**Benchmark Script:** [`run_benchmark.py`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/05_Bangla_Voice_AI/pretrained_bengali_comparison/task_03_2/run_benchmark.py)  
**Raw Predictions:** [`per_sample_predictions.csv`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/05_Bangla_Voice_AI/pretrained_bengali_comparison/task_03_2/per_sample_predictions.csv)  
**Metrics Data:** [`comparison_metrics.json`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/05_Bangla_Voice_AI/pretrained_bengali_comparison/task_03_2/comparison_metrics.json)  

---

## 1. Executive Summary

Evaluating [`anuragshas/whisper-small-bn`](https://huggingface.co/anuragshas/whisper-small-bn) (fine-tuned on Mozilla Common Voice 11.0 Bengali) against the existing multilingual baseline (`openai/whisper-base`) across **26 human-spoken Bengali Google FLEURS audio clips** (6 original smoke-test clips + 20 newly sampled speaker-independent distinct sentences) demonstrates a **transformative, statistically decisive improvement in Bengali Unicode transcription**:

- **Bengali Unicode Script Generation:** Jumped from **0.00%** (Whisper-Base) to **98.37%** (Whisper-Small-Bengali; remaining ~1.6% consists of valid Bengali punctuation `।`, `,`, `-`).
- **Smoke Test (6 clips, 2 distinct sentences):** Corpus normalized WER dropped from **117.33%** to **33.33%**, and corpus normalized CER plunged from **99.31%** to **8.97%**.
- **Broader Research Check (20 distinct sentences, 20 distinct speakers, Seed=42):** Corpus normalized WER dropped from **266.01%** to **40.15%**, and corpus normalized CER plunged from **187.96%** to **14.16%**.
- **GPU Feasibility:** Peak VRAM on the RTX 5060 Ti was **1,097.13 MB** (~1.07 GB, utilizing <7% of available 16 GB VRAM) with a median inference latency of **2.14 seconds** per utterance.

---

## 2. Evaluation Design & Controls

### A. Evaluation Cohorts
1. **Cohort 1 — Primary Smoke Test (`Smoke_Test_6`):**  
   The exact 6 human Bengali clips from `data/bilingual_test/` (`bn_sample_01.wav`–`bn_sample_06.wav`), covering 2 distinct reference sentences across 2 speaker groups (`1530` and `1552`). Maintained for direct backward comparison with TASK 03.1.
2. **Cohort 2 — Extended Broader Research Check (`Extended_FLEURS_20`):**  
   To overcome the 2-sentence limitation of the smoke test, **20 distinct reference sentences from 20 distinct speakers** were programmatically selected from `data/raw/extracted/dev/` (`dev.tsv`) **before running any model inference**, using a deterministic seed (`random.Random(42)`), strictly excluding all smoke-test sentences.

### B. Preprocessing & Decoding Parity
- **Identical Audio Input:** Both models received identical 16 kHz mono WAV audio loaded via `soundfile`.
- **Forced Bengali Transcription:** Both models executed with `language="bengali"` and `task="transcribe"` (no translation).
- **Critical Token Budget Correction (`max_new_tokens=440`):**  
  An initial diagnostic audit revealed that capping decoding at `max_new_tokens=128` severely truncated Bengali outputs mid-sentence because UTF-8 Bengali characters consume 2–3 tokens each in Whisper's byte-level BPE tokenizer. Both models were therefore evaluated identically at Whisper's native budget (`max_new_tokens=440`, matching the 448 decoder context window minus 4 prompt tokens).
- **Generation Config Compatibility Fix:** Because `anuragshas/whisper-small-bn` uses an older Transformers checkpoint schema lacking `lang_to_id`, its `generation_config` was initialized from `GenerationConfig.from_pretrained("openai/whisper-small", cache_dir=r"G:\hf_cache\hub")`.
- **Medical Term Recall:** Marked **`N/A`** across all 26 clips (FLEURS contains general news/encyclopedic sentences without clinical terminology).

---

## 3. Quantitative Performance Comparison

### Table A: Overall Combined Corpus (All 26 Clips — 22 Distinct Sentences, 22 Speakers)

| Metric | `openai/whisper-base` | `anuragshas/whisper-small-bn` | Improvement / Delta |
| :--- | :---: | :---: | :---: |
| **Mean Sample Raw WER** | 315.47% | **45.80%** | **-269.67 pp** |
| **Corpus Raw WER** | 243.33% | **45.62%** | **-197.71 pp** |
| **Mean Sample Normalized WER** | 315.24% | **38.23%** | **-277.01 pp** |
| **Corpus Normalized WER** | 242.83% | **39.09%** | **-203.74 pp** |
| **Mean Sample Raw CER** | 211.06% | **13.55%** | **-197.51 pp** |
| **Corpus Raw CER** | 180.40% | **14.58%** | **-165.82 pp** |
| **Mean Sample Normalized CER** | 205.39% | **12.24%** | **-193.15 pp** |
| **Corpus Normalized CER** | 175.62% | **13.44%** | **-162.18 pp** |
| **Bengali Unicode Character %** | **0.00%** | **98.37%** | **+98.37 pp** |
| **Exact Match Rate** | 0.00% | 0.00% | 0.00 pp |

### Table B: Cohort Breakdown (Smoke Test vs. Broader Speaker-Independent Check)

| Metric | Smoke Test (6 Clips)<br>`whisper-base` | Smoke Test (6 Clips)<br>`whisper-small-bn` | Extended (20 Clips)<br>`whisper-base` | Extended (20 Clips)<br>`whisper-small-bn` |
| :--- | :---: | :---: | :---: | :---: |
| **Mean Sample Norm WER** | 120.55% | **33.89%** | 373.64% | **39.53%** |
| **Median Sample Norm WER** | 116.66% | **30.00%** | 107.44% | **43.27%** |
| **Corpus Norm WER** | 117.33% | **33.33%** | 266.01% | **40.15%** |
| **Corpus Norm CER** | 99.31% | **8.97%** | 187.96% | **14.16%** |
| **Bengali Unicode %** | 0.00% | **97.68%** | 0.00% | **98.58%** |

---

## 4. GPU Resource & Latency Benchmark (`gpu_benchmark.json`)

| Model | Parameters | Mean Latency | Median Latency | Peak VRAM | RTX 5060 Ti Headroom |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `openai/whisper-base` | 72,593,920 | 586.52 ms | 389.81 ms | 341.47 MB | 15.66 GB free |
| `anuragshas/whisper-small-bn` | 241,734,912 | 2,198.24 ms | 2,135.10 ms | **1,097.13 MB** | **14.90 GB free** |

*Note:* Higher mean latency on `whisper-small-bn` (~2.2s per utterance) is expected due to the 3.3x larger parameter count and multi-byte Bengali BPE token generation (~200–350 tokens per full sentence). On ~8–12 second audio clips, this yields a Real-Time Factor (RTF) of **~0.20–0.27** (roughly 4x–5x faster than real-time).

---

## 5. Qualitative Error Analysis & Remaining Limitations

Inspecting [`per_sample_predictions.csv`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/05_Bangla_Voice_AI/pretrained_bengali_comparison/task_03_2/per_sample_predictions.csv) reveals why `anuragshas/whisper-small-bn` achieves strong Character Error Rate (8.97%–14.16% CER) while Word Error Rate remains at 33.33%–40.15% (and 0% exact match):

### Representative Side-by-Side Samples:
1. **`BN_01` (Smoke Test — Norm CER: 3.70%, Norm WER: 20.0%):**
   - **Reference:** `এটিকে মঙ্গলবার কেটে ফেলার কথা ছিল তবে আদালতের জরুরী রায় আসার পরে এটি বাঁচানো হয়`
   - **Whisper-Base:** `8.8mg ketefellar katha chillu, tobe aadalote jorurirai asharpore eti baachanohoi.` *(Unusable Banglish)*
   - **Whisper-Small-BN:** `এটিকে মঙ্গলবার কেটে ফেলার কথা ছিল, তবে আদালতের জরুরিরায় আসার পরে এটি বাচানো হয়।` *(Readable, nearly verbatim Bengali)*

2. **`EXT_01` (Speaker 1536 — Norm CER: 5.16%, Norm WER: 25.0%):**
   - **Reference:** `স্থানীয় কর্তৃপক্ষ গাছের আশেপাশে থাকা বাসিন্দাদের বাড়ির ভিতরে থাকার জন্য শীতাতপ নিয়ন্ত্রণ ব্যবস্থা বন্ধ রাখার জন্য এবং নলের জল না খাওয়ার জন্য সতর্ক করছে`
   - **Whisper-Small-BN:** `স্থানীয় কর্তৃপক্ষ গাছের আশেপাশে থাকা বাসিন্দাদের বাড়ির ভিতরে থাকার জন্য স্বীতাতাপ নিয়ন্ত্রণ ব্যবস্থা বন্দরাখার জন্য এবং নলের জল নাখাওয়ার জন্য সতর্ক করেছে।`

3. **`EXT_14` (Speaker 1577 — Script Failure Avoidance):**
   - **Whisper-Base:** `ایتا امریکہ سے ارطپن نو بولے مونہائنی...` *(Hallucinated Urdu/Arabic script!)*
   - **Whisper-Small-BN:** `এটা আমার কাসে অর্ধপূর্ণ বলে মনে হয়নি এটা স্বাবাভিকভাবে ম্যাচজ ছিল না।` *(Norm CER: 14.29%)*

4. **`EXT_19` (Speaker 1659 — Best Sample, Norm CER: 5.17%, Norm WER: 12.5%):**
   - **Reference:** `বিজ্ঞানীরা জানাচ্ছেন সংঘর্ষের ফলে সৃষ্ট বিস্ফোরণ ছিল বিপুল`
   - **Whisper-Small-BN:** `বিজ্ঞানীরা জানাচ্ছেন সংঘর্ষের ফলে সৃষ্ট বিশ্বরণ ছিল বিপুল।`

### Four Specific Residual Failure Modes in `anuragshas/whisper-small-bn`:
1. **Bengali Compound Word Spacing & Orthography:** Merging or splitting adjacent words (e.g., `জরুরিরায়` vs `জরুরী রায়`, `নাখাওয়ার` vs `না খাওয়ার`, `বাচানো` vs `বাঁচানো`) causes full-word WER penalties despite negligible character error.
2. **Spoken Numerals vs. Digits (`EXT_04`, `EXT_13`):** Reference texts contain Arabic digits (`41`, `70`, `19,500`, `14`), whereas the ASR transcribes spoken Bengali words (`একচোলদিশ`, `সত্যরান`, `উনিশাচার`, `চৌদ্ধটি`).
3. **Occasional Decoding Stutter (`EXT_07`):** On 1 of 26 clips (`EXT_07`), the model emitted a brief character repetition (`প্রক্ষক্ষক্ষক্ষ...`) before recovering and finishing the sentence (raising its sample CER to 40.88%).
4. **440-Token Ceiling on Very Long Utterances (`EXT_18`, `EXT_20`):** Utterances exceeding ~200 Bengali characters approach Whisper's native 448-token decoder limit due to UTF-8 multi-byte BPE encoding, causing minor tail truncation on the longest clips.

---

## 6. Conclusion

`anuragshas/whisper-small-bn` resolves the fundamental zero-Unicode script failure of OpenAI's baseline models on genuine, out-of-domain human Bengali speech without any training-set contamination. However, because normalized WER remains at ~33%–40% (and 0% exact match) and the model has not yet been tested on real human clinical Bengali dictation, it is suitable strictly for **human-editable draft transcription**, never unattended clinical automation.
