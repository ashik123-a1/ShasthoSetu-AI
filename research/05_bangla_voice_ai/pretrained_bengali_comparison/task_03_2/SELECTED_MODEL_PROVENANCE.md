# Selected Bengali Model Provenance & Data Integrity Report
**Module:** `05_Bangla_Voice_AI`  
**Evaluation Date:** 2026-11-18  
**Model Identifier:** [`anuragshas/whisper-small-bn`](https://huggingface.co/anuragshas/whisper-small-bn)  
**Selected Under Protocol:** TASK 03.2 (Accessible Checkpoint Selection Protocol)  

---

## 1. Checkpoint Identity & Specifications

| Parameter | Specification |
| :--- | :--- |
| **Model Repository** | `anuragshas/whisper-small-bn` |
| **Repository URL** | https://huggingface.co/anuragshas/whisper-small-bn |
| **Base Architecture** | OpenAI Whisper-Small (`WhisperForConditionalGeneration`) |
| **Parameter Count** | 241,734,912 (~241.7M) |
| **Author / Organization** | `anuragshas` |
| **License** | **Apache-2.0** (Permissive open-source research and commercial use) |
| **Pipeline Tag** | `automatic-speech-recognition` |
| **Primary Weights Format** | PyTorch binary (`pytorch_model.bin`, 922.3 MB / 967,102,601 bytes) |
| **Vocabulary Size** | 51,865 tokens (`vocab.json`, `merges.txt`, `normalizer.json`) |
| **Target Language** | Bengali (`bn`) |

---

## 2. Checkpoint Files Verification

All mandatory configuration and tokenizer files were verified via Hugging Face Hub API prior to execution:

1. `config.json` (Model architecture hyperparameters)
2. `preprocessor_config.json` (Audio feature extractor: 80 log-mel filterbanks, 16 kHz sampling rate)
3. `tokenizer_config.json` & `special_tokens_map.json` (Whisper BPE tokenizer configuration)
4. `vocab.json` & `merges.txt` (Subword vocabulary mappings)
5. `normalizer.json` (Bengali text normalization parameters)
6. `pytorch_model.bin` (Trained model weights)

---

## 3. Training Corpus & Benchmark Provenance

According to the official model card and metadata:
- **Training Corpus:** Mozilla Foundation **Common Voice 11.0** (Bengali subset, `mozilla-foundation/common_voice_11_0 bn`).
- **Training Strategy:** Full fine-tuning of `openai/whisper-small` using the Hugging Face Seq2Seq Trainer during the Whisper sprint.
- **Reported Benchmark Performance (on Common Voice 11.0 Test Set):**
  - **Evaluation Loss:** `0.1638`
  - **Word Error Rate (WER):** `18.22%`

---

## 4. Evaluation Independence & Contamination Audit

A critical issue in prior evaluations was potential data contamination (e.g. `Noobbbbb/whisper-small-bn-v2` listing `google/fleurs`). We audited `anuragshas/whisper-small-bn` against our evaluation audio:

1. **Origin of Evaluation Clips:**  
   Our test clips (`bn_sample_01.wav` to `bn_sample_06.wav` and the broader FLEURS dev set) originate from the **Google FLEURS** (`google/fleurs`) Bengali benchmark.
2. **Independence of Common Voice 11.0:**  
   Mozilla Common Voice is an open crowdsourced platform where volunteer speakers donate voice recordings of sentences sourced from Wikipedia and public domain prose. Google FLEURS is derived from the FLoRES-101 machine translation evaluation dataset.
3. **Cross-Corpus Integrity:**  
   The training corpus (Common Voice 11.0) and our test corpus (FLEURS) have **zero sample or recording overlap**.
4. **Scientific Value:**  
   Benchmarking `anuragshas/whisper-small-bn` on FLEURS audio constitutes a true **out-of-domain cross-corpus generalization evaluation**, reflecting real-world clinical deployment performance far more accurately than in-domain testing.

---

## 5. Storage & Cache Allocation

- **Cache Directory:** `G:\hf_cache\hub\models--anuragshas--whisper-small-bn`
- **Drive Utilized:** Drive `G:` (110.60 GB free space)
- **Drive `C:` Protection:** Drive `C:` (3.71 GB free) was completely bypassed by explicitly configuring `HF_HOME=G:\hf_cache`.
