# Bengali ASR Model Comparison: Baseline vs. Fine-Tuned Candidates
**Module:** `05_Bangla_Voice_AI`  
**Evaluation Date:** 2026-11-18  
**Execution Environment:** NVIDIA GeForce RTX 5060 Ti (16 GB VRAM) | PyTorch 2.11.0+cu128 | CUDA 12.8  
**Benchmark Script:** [`run_comparison.py`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/05_Bangla_Voice_AI/pretrained_bengali_comparison/run_comparison.py)  
**Predictions Log:** [`per_sample_model_predictions.csv`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/05_Bangla_Voice_AI/pretrained_bengali_comparison/per_sample_model_predictions.csv)  

---

## 1. Benchmark Overview & Methodology

This report documents the rigorous GPU inference benchmark conducted on the 6 human-spoken Bengali audio clips (`bn_sample_01.wav` to `bn_sample_06.wav`) stored in `05_Bangla_Voice_AI/data/bilingual_test/`.

The primary objective was to compare:
1. `openai/whisper-tiny` (Multilingual baseline, 37.8M parameters)
2. `openai/whisper-base` (Multilingual baseline, 72.6M parameters)
3. `vivasoft/whisper-small-bn` (Reported Bengali fine-tuned checkpoint, ~244M parameters)

### Critical Provenance & Dataset Disclosures:
- **Audio Source:** All 6 clips are human-read speech excerpts from the Bengali subset of the Google FLEURS benchmark (`google/fleurs`).
- **Sentence Redundancy:** The 6 clips represent only **two distinct sentences** (each recorded by 3 different speakers):
  - **Reference Text 01 (`REF_TEXT_01`):** `"এটিকে মঙ্গলবার কেটে ফেলার কথা ছিল তবে আদালতের জরুরী রায় আসার পরে এটি বাঁচানো হয়"` (Clips: `bn_sample_01.wav`, `bn_sample_02.wav`, `bn_sample_03.wav`)
  - **Reference Text 02 (`REF_TEXT_02`):** `"চক্রান্ত বিশ্লেষণ করে ফলাফল একটি পাবলিক ওয়েবসাইটে পোস্ট করা হবে"` (Clips: `bn_sample_04.wav`, `bn_sample_05.wav`, `bn_sample_06.wav`)
- **Medical Term Recall:** Strictly **`N/A`** (Not Applicable). Because these sentences originate from general civic/legal FLEURS prompts, they contain **zero clinical entities**. It is scientifically dishonest to report 100% or any percentage for medical term recall on these clips.

---

## 2. Comparative Performance Matrix

The following table summarizes the quantitative results evaluated using standard JiWER metrics (JiWER normalized per-sample and corpus-level):

| Metric | `openai/whisper-tiny` | `openai/whisper-base` | `vivasoft/whisper-small-bn` |
| :--- | :---: | :---: | :---: |
| **Model Parameters** | 37,760,640 | 72,593,920 | ~244,000,000 |
| **Availability / Access** | Local Cache / Public | Local Cache / Public | **Blocked (HTTP 401)** |
| **Mean Per-Sample WER** | **227.78%** | **120.55%** | *Blocked* |
| **Corpus-Level WER** | **212.00%** | **117.33%** | *Blocked* |
| **Mean Per-Sample CER** | 185.78% | 101.22% | *Blocked* |
| **Corpus-Level CER** | 180.69% | 100.69% | *Blocked* |
| **Bengali Unicode Script %** | **0.00%** | **0.00%** | *Blocked* |
| **Exact Match Rate** | 0.00% | 0.00% | *Blocked* |
| **Mean GPU Latency** | 280.57 ms | **184.26 ms** | *Blocked* |
| **Peak VRAM Consumption** | **182.84 MB** | 432.94 MB | *Blocked* |

*Note on Latency:* Whisper-Tiny's mean latency was higher than Whisper-Base because Tiny fell into severe repetition loops on samples BN_03 and BN_04, decoding the maximum permitted token length (`max_new_tokens=128`).

---

## 3. Qualitative Sample-by-Sample Analysis

The detailed output from [`per_sample_model_predictions.csv`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/05_Bangla_Voice_AI/pretrained_bengali_comparison/per_sample_model_predictions.csv) demonstrates two fundamental failure modes in the OpenAI baselines:

### Reference Text 01: `"এটিকে মঙ্গলবার কেটে ফেলার কথা ছিল তবে আদালতের জরুরী রায় আসার পরে এটি বাঁচানো হয়"`

- **BN_01 (Duration: 7.08s):**
  - **Whisper-Tiny:** `"8G Moonbulbar Kiraehlar kothachilo, sobe Adalothe Joruri Rai Ashhar Pore, 8Bachanohai"` (WER: 100.0%, CER: 98.77%, BN: 0.0%)
  - **Whisper-Base:** `"8.8mg ketefellar katha chillu, tobe aadalote jorurirai asharpore eti baachanohoi."` (WER: 100.0%, CER: 93.83%, BN: 0.0%)
  - *Observation:* Both models transcribe the Bengali speech into Latin characters (Banglish transliteration) with spurious punctuation and numbers (`8G`, `8.8mg`). Zero Bengali Unicode characters (`U+0980`–`U+09FF`) were emitted.

- **BN_02 (Duration: 8.82s):**
  - **Whisper-Tiny:** `"8.5V KT Feller Cotacilo"` (WER: 100.0%, CER: 96.30%, BN: 0.0%)
  - **Whisper-Base:** `"8. Ṭhbhag."` (WER: 100.0%, CER: 98.77%, BN: 0.0%)
  - *Observation:* Catastrophic truncation. Both models failed to decode beyond the first acoustic phoneme, hallucinatively interpreting the utterance as an electrical/medical measurement (`8.5V`, `8. Ṭhbhag`).

- **BN_03 (Duration: 8.82s):**
  - **Whisper-Tiny:** `"1.5 kTcal kTcal, 1.5 kTcal, 1.5 kTcal, 1.5 kTcal, 1.5 kTcal, 1.5 kTcal, 1.5 kTcal, 1.5 kTcal, 1.5 kTcal, 1.5 kTcal, 1.5 kTcal, 1.5 kTcal, 1.5 kTcal, 1.5 kTcal, 1.5 kTcal, 1.5 kTcal, 1.5 kTcal, 1.5 kTcal"` (WER: 246.67%, CER: 232.10%, BN: 0.0%)
  - **Whisper-Base:** `"kete ke mungol bar kete falar kota silo, kabe adalo te jurur irai asar pore eti baachanohar."` (WER: 113.33%, CER: 97.53%, BN: 0.0%)
  - *Observation:* Whisper-Tiny fell into a severe degenerate loop, repeating `"1.5 kTcal"` 18 consecutive times. Whisper-Base captured phonemic syllables relatively accurately, but entirely in Romanized Banglish.

---

### Reference Text 02: `"চক্রান্ত বিশ্লেষণ করে ফলাফল একটি পাবলিক ওয়েবসাইটে পোস্ট করা হবে"`

- **BN_04 (Duration: 8.52s):**
  - **Whisper-Tiny:** `"JAPAN TAN TOR BISLESSOAN KOREA FALL A KEEP PAPBIR OF THE POPER OF THE POPER OF THE POPER OF THE POPER OF THE POPER OF THE POPER OF THE POPER OF THE POPER OF THE POPER OF THE POPER OF THE POPER OF THE POPER OF THE POPER OF THE POPER OF THE POPER OF THE POPER OF THE POPER OF THE POPER OF THE POPER OF THE POPER OF THE P"` (WER: 720.0%, CER: 482.81%, BN: 0.0%)
  - **Whisper-Base:** `"Chaptan to bithle son kore hala fal ek kip pabli po yuf saide kokas kara hale"` (WER: 160.0%, CER: 107.81%, BN: 0.0%)
  - *Observation:* Whisper-Tiny suffered an extreme hallucination loop, repeating `"OF THE POPER"` 22 times until cutoff. Whisper-Base produced Banglish tokens (`"bithle son kore hala fal..."`).

- **BN_05 (Duration: 7.62s):**
  - **Whisper-Tiny:** `"Chakra, bislation, kore, Halluffle, ect. Public website, post, Kora, Habe."` (WER: 100.0%, CER: 106.25%, BN: 0.0%)
  - **Whisper-Base:** `"Chakra to Vislation kore, Khalafal ek ki Papplik website e post kora habe."` (WER: 130.0%, CER: 104.69%, BN: 0.0%)
  - *Observation:* Both models emit English and Banglish mix (`"website"`, `"post"`, `"Kora"`), but 0% Bengali script.

- **BN_06 (Duration: 7.68s):**
  - **Whisper-Tiny:** `"1 tpq."` (WER: 100.0%, CER: 98.44%, BN: 0.0%)
  - **Whisper-Base:** `"Chakraan to bislaishan kore falafal ek ki papli kuebsa ite kustkoda habe."` (WER: 120.0%, CER: 104.69%, BN: 0.0%)
  - *Observation:* Whisper-Tiny truncated completely into a single hallucinated token. Whisper-Base captured acoustic sounds into Latin text.

---

## 4. Hardware & Efficiency Analysis

Benchmarks logged in [`gpu_inference_benchmark.json`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/05_Bangla_Voice_AI/pretrained_bengali_comparison/gpu_inference_benchmark.json) on the local NVIDIA GeForce RTX 5060 Ti (16 GB):

1. **VRAM Footprint:**
   - Whisper-Tiny: **182.84 MB**
   - Whisper-Base: **432.94 MB**
   - Available VRAM Headroom: **~15.5 GB**
   - *Implication:* A Whisper-Small architecture (~244M parameters, ~960 MB FP16 weights) requires approximately 1.2 GB to 1.8 GB VRAM during inference. The local GPU has more than 10x the headroom required to run Whisper-Small or even Whisper-Medium locally.

2. **Latency:**
   - Whisper-Base: **184.26 ms** per clip (~7.9 seconds of speech). Real-Time Factor (RTF) is $\approx 0.023$, representing over 40x faster than real-time.
   - Whisper-Tiny: **280.57 ms** per clip (elevated due to decoding repetition penalty delays and 128-token cap exhaustion).

---

## 5. Summary & Key Conclusions

1. **`vivasoft/whisper-small-bn` is Inaccessible:** Without Hugging Face credentials, this private repository cannot be evaluated.
2. **OpenAI Baselines Completely Fail on Bengali Script:** Both `whisper-tiny` and `whisper-base` exhibit **0.0% Bengali Unicode character output**. They suffer from script-drift into Romanized Banglish or catastrophic hallucination loops.
3. **Contrast with English:** Whisper-Base performs robustly on English (5.36% WER on synthetic clinical dictation). Its failure is purely due to inadequate Bengali token representation and decoder tuning in OpenAI's base weights.
4. **Conclusion:** Fine-tuning on genuine Bengali speech corpora (e.g., OpenSLR 53 / Shruti or Common Voice) or acquiring access to a verified, uncontaminated Bengali checkpoint is strictly necessary before Bengali Voice AI can be deployed.
