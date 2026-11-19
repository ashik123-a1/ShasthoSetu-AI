# ShasthoSetu AI — Bangla Voice AI Critical Accuracy & Latency Audit
**Audited Module:** `05_Bangla_Voice_AI`  
**Dataset:** Google Research FLEURS Bengali (`google/fleurs`, `bn_in`, CC BY 4.0)  
**Evaluated Checkpoints:** `openai/whisper-tiny` (39M) & `openai/whisper-base` (74M)  
**Hardware:** NVIDIA GeForce RTX 5060 Ti 16GB (CUDA 12.8, PyTorch 2.11)  
**Audit Date:** 2026-11-18  

---

## 1. Metadata Verification & Speaker Isolation Audit

An exhaustive audit of `data/processed/voice_manifest.csv` and `data/processed/split_manifest.csv` was conducted using exact metadata inspection:
- **Total Valid Utterances:** 402 audio clips (100% 16 kHz Mono uncompressed WAV, 0 corrupted files).
- **Total Unique Speakers:** Exactly 150 speakers (all male speakers in this `dev` subset, mean of 2.68 utterances per speaker).
- **Total Speech Duration:** 5,214.54 seconds (**86.91 minutes**).

### Split Partitioning & Leakage Proof:
A speaker-grouped partition with fixed random seed (42) was enforced:
- **Train Split:** 282 utterances (105 speakers, 3,640.35 seconds / 60.67 minutes).
- **Validation Split:** 59 utterances (22 speakers, 735.93 seconds / 12.26 minutes).
- **Held-Out Test Split:** 61 utterances (23 speakers, 838.26 seconds / 13.97 minutes).

```python
# Speaker Overlap Verification:
train_speakers = set(df[df["split"] == "train"]["speaker_id"])
val_speakers   = set(df[df["split"] == "val"]["speaker_id"])
test_speakers  = set(df[df["split"] == "test"]["speaker_id"])

assert len(train_speakers.intersection(val_speakers)) == 0  # Passed (0 overlap)
assert len(train_speakers.intersection(test_speakers)) == 0 # Passed (0 overlap)
assert len(val_speakers.intersection(test_speakers)) == 0   # Passed (0 overlap)
```
**Conclusion:** Zero speaker leakage is verified. No speaker appears in multiple splits.

---

## 2. Mathematical Reconciliation of Reported Speedup

The initial report listed Whisper-Tiny at **46.2x** and Whisper-Base at **36.3x** real-time speedup, whereas dividing total test audio duration (838.26s) by total inference time (17.43s and 22.32s) yields **48.1x** and **37.6x**.

### Audit Explanation (Jensen's Inequality / Harmonic vs Arithmetic Mean):
1. **Aggregate Throughput Speedup ($\sum \text{Audio} / \sum \text{Latency}$):**
   - **Whisper-Tiny:** $838.26 \text{ s} / 17.43 \text{ s} = \mathbf{48.09\times}$ faster than real-time (**48.1x**).
   - **Whisper-Base:** $838.26 \text{ s} / 22.32 \text{ s} = \mathbf{37.56\times}$ faster than real-time (**37.6x**).
2. **Sample-Level Mean Real-Time Factor (RTF = $\frac{1}{N}\sum \frac{\text{Latency}_i}{\text{Duration}_i}$):**
   - Whisper-Tiny Mean RTF: **0.0216** (Median: 0.0219).
   - Whisper-Base Mean RTF: **0.0275** (Median: 0.0271).
   - The reciprocal of the mean sample RTF is: $\frac{1}{0.0216} = \mathbf{46.29\times}$ (Tiny) and $\frac{1}{0.0275} = \mathbf{36.36\times}$ (Base).

Because individual clips vary slightly in length (mean 13.7s, range 3.2s to 27.6s), the average of per-clip ratios $\frac{1}{N}\sum \frac{\text{Latency}_i}{\text{Duration}_i}$ does not equal the ratio of the totals $\frac{\sum \text{Latency}_i}{\sum \text{Duration}_i}$. Both numbers are mathematically correct under their respective definitions, but aggregate speedup (**48.1x** and **37.6x**) is the standard throughput metric for multi-utterance processing.

---

## 3. Genuine Bengali Transcription & Accuracy Audit

### Character Set Composition Analysis:
We audited the character-level composition across all 61 held-out test predictions:
- **Reference Ground Truth:**
  - Total Characters: 7,687
  - Bengali Unicode Characters (`\u0980`–`\u09FF`): 6,479 (**84.29%**)
  - ASCII Whitespace, Punctuation, Digits: 1,208 (**15.71%**)
- **Whisper-Tiny Hypothesis:**
  - Total Characters: 8,918
  - Bengali Unicode Characters: **0** (**0.00%**)
  - Latin ASCII Characters: 8,918 (**100.00%**)
- **Whisper-Base Hypothesis:**
  - Total Characters: 8,707
  - Bengali Unicode Characters: **0** (**0.00%**)
  - Latin ASCII Characters: 8,707 (**100.00%**)

### Genuine Bengali Script Metrics:

| Metric | Whisper-Tiny (39M) | Whisper-Base (74M) | Target for Clinical Usability |
| :--- | :---: | :---: | :---: |
| **Bengali Script Character Proportion** | **0.00%** | **0.00%** | > 80.0% |
| **Exact Match Rate (EMR)** | **0.00%** | **0.00%** | > 50.0% |
| **Mean Character Error Rate (CER)** | **129.64%** | **106.28%** | < 15.0% |
| **Median Character Error Rate (CER)** | 100.93% | 104.69% | < 10.0% |
| **Mean Word Error Rate (WER)** | **137.54%** | **116.14%** | < 25.0% |
| **Median Word Error Rate (WER)** | 100.00% | 107.14% | < 20.0% |
| **Levenshtein String Similarity** | 10.44% | 12.30% | > 85.0% |

---

## 4. Why Does Whisper Output Banglish (Latin Script)?

We performed decoder experiments on the **development validation split** (`val`) using explicit generation parameters:
- `language="bn"` (mapped to Whisper token ID `50302` `<|bn|>`)
- `task="transcribe"` (token ID `50359` `<|transcribe|>`)
- `temperature=0.0`
- `num_beams=5`

### Qualitative Analysis of Predictions:
```
Reference:
মার্কিন যুক্তরাষ্ট্র জুড়ে প্রায় 400,000 সংখ্যক মাল্টিপল স্ক্লেরোসিসের এমএস পরিচিত ঘটনা রয়েছে যেটিকে অল্প বয়সী ও মধ্যবয়স্কদের মাঝে প্রথম সারির স্নায়বিক রোগ হিসাবে দেখা হচ্ছে।

Whisper-Base Greedy:
Markeen, Jyup, Taurh, Jure, Prya, Challak, Shanko, Multiple, Iskara, Sistair, MS, Polichito, Bhatnar, Jettike, Alpo, Bhai, Shia, Modho, Bhai, Shkade, Maje, Potom, Shari, Snayobik, Rho, Ghishe, Dhe, Khat, Shep,

Whisper-Base Beam 5:
Markeen jubturahto jure prai challa kshanko kmultipol iske roses ter ms poli chto bhatnaru se jetike alpo boi shi o modho boi shkadeer majhe pothum shari snayobik roo ghi sebe dhaha chhe
```

### Critical Findings:
1. **Phonetic Recognition is Partially Present:**
   - The acoustic encoder successfully maps spoken audio into Bengali phonetic equivalents (`Markeen` $\rightarrow$ মার্কিন, `jure` $\rightarrow$ জুড়ে, `prai` $\rightarrow$ প্রায়, `challa kshanko` $\rightarrow$ চার লাখ সংখ্যক, `snayobik` $\rightarrow$ স্নায়বিক, `roo ghi sebe` $\rightarrow$ রোগ হিসাবে).
2. **Decoder Vocabulary Bias (Latin Drift):**
   - In OpenAI's multilingual pretraining corpus, Bengali web-scraped audio frequently had Latin-transliterated subtitles or English metadata. The language model prior for Bengali predicts Latin BPE tokens rather than Bengali Unicode codepoints.
3. **Word Recognition Failures Exist:**
   - The error is **NOT merely a script conversion issue**. Severe acoustic confusions occur:
     - `multi-pol iske roses ter` (hallucination) for `মাল্টিপল স্ক্লেরোসিসের`
     - `daptar moul` for `ডাঃ মোল`
     - In numeric clinical vitals: `১২০ বাই ৮০` risks phonetic mangling as `aksho bish bai ashi`.
4. **Post-Hoc Transliteration is Insufficient:**
   - A rule-based phonetic transliterator cannot resolve word boundary errors, compound character (`যুক্তাক্ষর`) ambiguities, or missing medical terms.
   - **True resolution requires supervised parameter-efficient fine-tuning (e.g. IndicLoRA / Whisper-LoRA) on native Bengali audio-text pairs.**

---

## 5. Clinical Safety & Dataset Scope Limitations

1. **FLEURS Benchmark Scope:**
   - Google FLEURS (`bn_in`) consists of read Wikipedia and news articles recorded by native speakers.
   - It is **NOT a clinical dictation dataset**. It contains zero conversational doctor-patient consultations, emergency room triage noise, or clinical acoustic artifacts.
2. **Strict Medical Safety Protocol:**
   - Because current off-the-shelf Whisper has **0.00% exact match** and **>100% CER** against native Bengali text:
   - **Voice recognition outputs MUST NEVER be directly connected to electronic medical records (EHR), prescription generation, or automated triage without explicit human physician transcription and sign-off.**
   - Whisper-Tiny and Whisper-Base are evaluated strictly as **hardware latency and throughput baselines on RTX 5060 Ti**, not as clinically certified ASR systems.
