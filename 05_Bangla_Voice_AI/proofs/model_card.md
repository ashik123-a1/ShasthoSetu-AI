# Model Card: ShasthoSetu AI — Bengali Speech Recognition (ASR) Benchmark

## 1. Model Details
- **Architecture Family:** OpenAI Whisper (Encoder-Decoder Transformer for Speech Recognition)
- **Evaluated Variants:**
  - `openai/whisper-tiny` (39 Million Parameters)
  - `openai/whisper-base` (74 Million Parameters)
- **Target Language:** Bengali (`bn_in`, Standard Colloquial & Clinical Voice Interaction)
- **Acoustic Input:** 16 kHz Mono WAV audio, 80-channel log-Mel spectrogram
- **Execution Hardware:** NVIDIA GeForce RTX 5060 Ti 16GB (Blackwell sm_120, CUDA 12.8, PyTorch 2.11)
- **License:** Apache 2.0 (Model) / CC BY 4.0 (FLEURS Benchmark)

---

## 2. Intended Use & Clinical Scope
- **Assistive Clinical Context:** Voice-guided health intake, nurse workstation command transcription, and assistive patient history recording for ShasthoSetu AI.
- **Out-of-Scope:** Autonomous medical diagnosis or unverified prescription dispensation. Voice transcription MUST serve strictly as a first-pass assistive draft requiring explicit physician confirmation.

---

## 3. Dataset & Provenance
- **Dataset:** FLEURS Bengali (`google/fleurs`, `bn_in`), Google Research (Conneau et al., 2022).
- **Rights & License:** Creative Commons Attribution 4.0 International (CC BY 4.0).
- **Total Audio Utterances:** 402 clips (86.9 minutes).
- **Speaker Isolation:** Speaker-Independent Grouped Partition (Zero Speaker Leakage)
  - Train: 282 clips (105 speakers)
  - Validation: 59 clips (22 speakers)
  - Held-out Test: 61 clips (23 speakers)
  - **Speaker Leakage:** 0% cross-split speaker overlap verified.

---

## 4. Quantitative Evaluation on Held-Out Test Set (N=61 Utterances, 23 Speakers)

| Metric | Whisper-Tiny (39M) | Whisper-Base (74M) | Clinical Target (Future Fine-Tuning) |
| :--- | :--- | :--- | :--- |
| **Mean Character Error Rate (CER)** | **129.64%** | **106.28%** | < 15.0% |
| **Median CER** | 100.93% | 104.69% | < 10.0% |
| **Mean Word Error Rate (WER)** | **137.54%** | **116.14%** | < 25.0% |
| **Median WER** | 100.00% | 107.14% | < 20.0% |
| **Levenshtein String Similarity** | 10.44% | 12.30% | > 85.0% |
| **Inference Latency per Clip** | **0.2849 s** | **0.3648 s** | < 0.50 s |
| **Real-Time Factor (RTF)** | **0.0216** | **0.0275** | < 0.10 |
| **GPU Real-Time Speedup** | **46.2x Faster** | **36.3x Faster** | > 10x |
| **Peak VRAM Allocated** | **182.8 MB** | **335.0 MB** | < 4000 MB |

---

## 5. Key Scientific Findings & Limitations
1. **Phonetic Transliteration Drift (Banglish):**
   - Zero-shot multilingual Whisper transliterates spoken Bengali into Romanized phonetic text (e.g., ground truth *"চক্রান্ত বিশ্লেষণ..."* is transcribed as *"Chakra to Vislation..."*).
   - Because standard Bengali Unicode (`ঀ`–`৿`) and Latin ASCII are disjoint Unicode blocks, string-level CER and WER against native script exceed 100%.
2. **Ultra-Low Latency on RTX 5060 Ti:**
   - Inference latency averaged **284.9 ms** per 13.7-second audio clip (46.2x faster than real-time), consuming only **182.8 MB** of the 16 GB VRAM.
3. **Clinical Recommendation:**
   - Deployment in Bangladeshi clinical settings requires an IndicLoRA fine-tuning stage or an integrated Bangla phonetic transliteration module to map acoustic representations directly to standardized medical Bengali script.
