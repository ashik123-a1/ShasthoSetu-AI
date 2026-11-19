# ShasthoSetu AI — Bilingual Voice ASR Evaluation Report

**Evaluation Date:** 2026-11-19T16:11:02Z  
**Hardware:** NVIDIA GeForce RTX 5060 Ti 16 GB VRAM (CUDA 13.2 / PyTorch 2.11)  
**Dataset Provenance Transparency:**
- **Human Bengali FLEURS (N=6):** Genuine native human speakers from Google FLEURS dev set (`05_Bangla_Voice_AI/data/raw/extracted/dev`).
- **Synthetic English Clinical (N=6):** Synthesized via Windows SAPI5 Hazel Desktop TTS (`en_clinical_01..06.wav`).
- **Synthetic Mixed Code-Switch (N=6):** Multilingual medical prompts synthesized via SAPI5 Hazel Desktop TTS (`mix_codeswitch_01..06.wav`).

## Quantitative Cohort Results

| Evaluation Cohort | Speech Source | Evaluated Model | Mean WER | Mean CER | Bengali Unicode % | Avg Latency (ms) |
|---|---|---|---|---|---|---|
| **Human Bengali FLEURS (N=6)** | Native Human (FLEURS) | `anuragshas/whisper-small-bn (Forced BN)` | **45.56%** | 11.41% | 97.7% | 1518.6 ms |
| **Human Bengali FLEURS (N=6)** | Native Human (FLEURS) | `openai/whisper-base (Forced EN)` | **111.67%** | 98.19% | 0.0% | 212.0 ms |
| **Human Bengali FLEURS (N=6)** | Native Human (FLEURS) | `Bilingual Auto-Routing (Whisper-BN + Whisper-Base)` | **45.56%** | 11.41% | 97.7% | 2502.8 ms |
| **Synthetic English Clinical (N=6)** | Synthetic SAPI5 Audio | `anuragshas/whisper-small-bn (Forced BN)` | **100.00%** | 95.49% | 98.6% | 1533.1 ms |
| **Synthetic English Clinical (N=6)** | Synthetic SAPI5 Audio | `openai/whisper-base (Forced EN)` | **8.39%** | 3.00% | 0.0% | 128.5 ms |
| **Synthetic English Clinical (N=6)** | Synthetic SAPI5 Audio | `Bilingual Auto-Routing (Whisper-BN + Whisper-Base)` | **8.39%** | 3.00% | 0.0% | 240.3 ms |
| **Synthetic Mixed Code-Switch (N=6)** | Synthetic SAPI5 Audio | `anuragshas/whisper-small-bn (Forced BN)` | **105.93%** | 114.64% | 97.4% | 1575.2 ms |
| **Synthetic Mixed Code-Switch (N=6)** | Synthetic SAPI5 Audio | `openai/whisper-base (Forced EN)` | **48.24%** | 18.38% | 0.0% | 139.2 ms |
| **Synthetic Mixed Code-Switch (N=6)** | Synthetic SAPI5 Audio | `Bilingual Auto-Routing (Whisper-BN + Whisper-Base)` | **48.24%** | 18.38% | 0.0% | 158.6 ms |

## Acoustic & Deployment Findings

1. **Bengali Specialization:** `anuragshas/whisper-small-bn` produces 97.68% Bengali Unicode on the 6-clip `Smoke_Test_6` cohort (98.37% across the full 26-clip frozen FLEURS baseline) for native human speech, but hallucinates repetitive Bengali tokens when forced onto purely English clinical audio (`100.00%` WER).
2. **English & Code-Switch Handling:** `openai/whisper-base` achieves `8.39%` Sample-Avg Raw WER / `3.00%` CER on synthetic SAPI5 English clinical clips (`EN_01..EN_06`), though pharmaceutical tokens can still suffer acoustic distortion (e.g., `Amoxicillin` -> `a Moxasillin` on `EN_02`, and `Tab Napa Extra` -> `Tabnappa extra` on `MIX_05`).
3. **Mandatory Human-in-the-Loop Confirmation:** Because observed acoustic Raw WER is `45.56%` (Sample-Avg) on Human Bengali FLEURS and `48.24%` (Sample-Avg) on Synthetic Mixed Code-Switch, ShasthoSetu enforces a non-bypassable editable transcript confirmation gate (`is_confirmed = 1`) before audio ever submits to AI chat.
