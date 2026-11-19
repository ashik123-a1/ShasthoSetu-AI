# Experiment Summary: 05_Bangla_Voice_AI

- **Date:** 2026-11-18
- **Platform:** ShasthoSetu AI Multi-Modal Healthcare Research Suite
- **Hardware:** NVIDIA GeForce RTX 5060 Ti (16GB VRAM, Driver 596.36, CUDA 12.8)
- **Dataset:** Google FLEURS Bengali (Speech Recognition Benchmark `bn_in`, CC BY 4.0)

## Execution Milestones
1. **Data Ingestion & Integrity:**
   - 402 audio clips inspected via `soundfile`; 0 corrupted files, 100% valid 16kHz WAV format.
   - Total speech duration: 86.9 minutes across 150 speakers.
2. **Speaker-Independent Grouped Split:**
   - Zero speaker leakage: 105 training speakers (282 clips), 22 validation speakers (59 clips), 23 held-out test speakers (61 clips).
3. **GPU Benchmarking:**
   - Evaluated `Whisper-Tiny` (39M) and `Whisper-Base` (74M) on RTX 5060 Ti GPU.
   - Whisper-Tiny achieved **0.2849 s/clip** latency (46.2x real-time factor).
   - Documented phonetic Latin transliteration drift in off-the-shelf Indic ASR.
4. **Clinical Risk Assessment:**
   - Evaluated 5 critical voice intents (vital signs, medication dosages, emergency triage).
   - Verified that unassisted speech transcription must not autonomously commit medical records without physician verification.
