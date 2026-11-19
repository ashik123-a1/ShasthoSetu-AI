# ShasthoSetu AI — Voice AI Reproducibility & Linguistic Audit Report
**Audited Modality:** `05_Bangla_Voice_AI`  
**Dataset:** Google Research FLEURS Bengali (`google/fleurs`, `bn_in`, CC BY 4.0)  
**Evaluated Architectures:** OpenAI Whisper-Tiny (39M) & Whisper-Base (74M) on RTX 5060 Ti GPU  
**Lead Auditor:** Senior ML Research Auditor & MLOps Engineer  
**Date:** 2026-11-18  

---

## 1. Resolution of Missing Runnable Source Code

1. **Archive Completeness:**
   - The historical `05_Bangla_Voice_AI_PROOFS.zip` contained prediction CSVs, manifests, and metrics, but lacked the Python source code used to execute the Whisper benchmarks.
   - The updated archive embeds the complete runnable pipeline:
     - `src/inspect_and_preprocess.py` (soundfile integrity inspection of 402 clips)
     - `src/split_data.py` (speaker-isolated group split, 150 speakers)
     - `src/benchmark_voice.py` (Whisper-Tiny and Whisper-Base GPU evaluation harness)
     - `src/package_proofs.py` (model card & metrics generator)
     - `reproduce.ps1` (PowerShell harness with `$LASTEXITCODE` checks)
     - `configs/config.json`
2. **Deterministic Speaker Split Confirmed:**
   - Total utterances: 402 across 150 unique speakers.
   - 0% speaker overlap verified between Train (105 spk), Val (22 spk), and Test (23 spk).

---

## 2. Speed Discrepancy Reconciliation & Scientific Summary

| Metric | Whisper-Tiny (39M) | Whisper-Base (74M) | Source & Interpretation |
| :--- | :---: | :---: | :--- |
| **Aggregate Real-Time Speedup** | **48.09x** (48.1x) | **37.56x** (37.6x) | Total audio duration (838.26s) / Total inference time (17.43s / 22.32s) |
| **Sample-Level Mean RTF** | **0.0216** (46.2x) | **0.0275** (36.3x) | Mean of per-sample ratios $\frac{1}{N}\sum \frac{\text{Latency}_i}{\text{Duration}_i}$ |
| **Bengali Script Proportion** | **0.00%** (0 / 8,918 chars) | **0.00%** (0 / 8,707 chars) | All hypothesis characters are Latin ASCII (*Banglish*) |
| **Character Error Rate (CER)** | **129.64%** | **106.28%** | Evaluated against standard Bengali UTF-8 script |
| **Word Error Rate (WER)** | **137.54%** | **116.14%** | Evaluated against standard Bengali UTF-8 script |
| **Exact Match Rate (EMR)** | **0.00%** | **0.00%** | Disjoint Unicode blocks (`\u0980`–`\u09FF` vs ASCII) |

---

## 3. Critical Linguistic & Medical Limitations

1. **High Speed $\neq$ Good Speech Recognition:**
   - While Whisper-Tiny transcribes audio in **285 ms on RTX 5060 Ti** (**48.1x faster than real-time**), the output text is Romanized Banglish rather than Bengali script.
   - Furthermore, severe acoustic word confusions occur on clinical terms (e.g. `multi-pol iske roses ter` for `মাল্টিপল স্ক্লেরোসিসের`, `daptar moul` for `ডাঃ মোল`).
   - We explicitly reject claiming "high voice accuracy" solely because GPU throughput was fast.
2. **FLEURS Benchmark Scope:**
   - FLEURS is read Wikipedia text recorded in controlled environments. It is **not** a clinical dictation dataset.
3. **Clinical Air-Gap:**
   - Raw, unadapted Whisper speech recognition is strictly disconnected from medical records, diagnostic intake, and drug orders.
   - True clinical deployment mandates supervised parameter-efficient fine-tuning (e.g. IndicLoRA / Whisper-LoRA) on native Bengali healthcare dictation.
