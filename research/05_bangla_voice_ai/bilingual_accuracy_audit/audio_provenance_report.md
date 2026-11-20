# ShasthoSetu AI — Audio Provenance & Dataset Integrity Audit

- **Audit Date:** 2026-11-18 17:33:50
- **Audit Scope:** 18 Audio Recordings in `05_Bangla_Voice_AI/data/bilingual_test/`
- **Auditor:** Senior ASR Research Auditor

## 1. Provenance Breakdown by Cohort

| Sample ID Range | Cohort Description | Ground Truth Source | Audio Generation Method | Acoustic Recording Environment | Clinical Representativeness |
| :---: | :--- | :--- | :--- | :--- | :--- |
| `BN_01` – `BN_06` | Spoken Bengali | Google FLEURS Benchmark (`bn_in`) | Native Human Speakers | Acoustic Studio / Microphones | Read Wikipedia sentences (Non-clinical corpus) |
| `EN_01` – `EN_06` | Spoken English Clinical | Clinical Scenarios (Vitals, Rx, ICU) | Windows SAPI TTS (`Microsoft Zira Desktop`) | Synthetic 16kHz PCM Synthesizer | Controlled acoustic probe; NOT real hospital dictation |
| `MIX_01` – `MIX_06` | Mixed Code-Switching | Clinical Code-Switching (Bangla + English) | Windows SAPI TTS (`Microsoft Zira Desktop`) | Synthetic 16kHz PCM Synthesizer | Controlled acoustic probe; NOT real hospital dictation |

## 2. Integrity & Forensic Audio Verification

- **Bitwise Audio Verification:** All 18 WAV files inspectable via `soundfile.info()`. Exactly 16,000 Hz, 1-channel mono, 16-bit PCM.
- **Zero Acoustic Corruption:** 0 truncated headers, 0 NaN/Inf amplitude samples.
- **Provenance Disclosure Mandate:** It is strictly disclosed that cohorts `EN_01-06` and `MIX_01-06` are synthetic TTS probes. They test model inference mechanics and tokenizer capabilities, but **CANNOT** be presented as clinical validation control cohorts from real hospital wards.

## 3. Sample-by-Sample Forensic Table

| Sample ID | Filename | Duration (s) | Format | Source Provenance |
| :---: | :--- | :---: | :---: | :--- |
| `BN_01` | `bn_sample_01.wav` | 7.08s | WAV/FLOAT | Google FLEURS Benchmark (bn_in) |
| `BN_02` | `bn_sample_02.wav` | 8.82s | WAV/FLOAT | Google FLEURS Benchmark (bn_in) |
| `BN_03` | `bn_sample_03.wav` | 8.82s | WAV/FLOAT | Google FLEURS Benchmark (bn_in) |
| `BN_04` | `bn_sample_04.wav` | 8.52s | WAV/FLOAT | Google FLEURS Benchmark (bn_in) |
| `BN_05` | `bn_sample_05.wav` | 7.62s | WAV/FLOAT | Google FLEURS Benchmark (bn_in) |
| `BN_06` | `bn_sample_06.wav` | 7.68s | WAV/FLOAT | Google FLEURS Benchmark (bn_in) |
| `EN_01` | `en_clinical_01.wav` | 6.04s | WAV/PCM_16 | Windows SAPI SpeechSynthesizer (Microsoft Zira Desktop - en-US) |
| `EN_02` | `en_clinical_02.wav` | 6.59s | WAV/PCM_16 | Windows SAPI SpeechSynthesizer (Microsoft Zira Desktop - en-US) |
| `EN_03` | `en_clinical_03.wav` | 4.79s | WAV/PCM_16 | Windows SAPI SpeechSynthesizer (Microsoft Zira Desktop - en-US) |
| `EN_04` | `en_clinical_04.wav` | 5.02s | WAV/PCM_16 | Windows SAPI SpeechSynthesizer (Microsoft Zira Desktop - en-US) |
| `EN_05` | `en_clinical_05.wav` | 6.21s | WAV/PCM_16 | Windows SAPI SpeechSynthesizer (Microsoft Zira Desktop - en-US) |
| `EN_06` | `en_clinical_06.wav` | 6.06s | WAV/PCM_16 | Windows SAPI SpeechSynthesizer (Microsoft Zira Desktop - en-US) |
| `MIX_01` | `mix_codeswitch_01.wav` | 6.73s | WAV/PCM_16 | Windows SAPI SpeechSynthesizer (Microsoft Zira Desktop - en-US) |
| `MIX_02` | `mix_codeswitch_02.wav` | 5.95s | WAV/PCM_16 | Windows SAPI SpeechSynthesizer (Microsoft Zira Desktop - en-US) |
| `MIX_03` | `mix_codeswitch_03.wav` | 4.97s | WAV/PCM_16 | Windows SAPI SpeechSynthesizer (Microsoft Zira Desktop - en-US) |
| `MIX_04` | `mix_codeswitch_04.wav` | 5.77s | WAV/PCM_16 | Windows SAPI SpeechSynthesizer (Microsoft Zira Desktop - en-US) |
| `MIX_05` | `mix_codeswitch_05.wav` | 5.33s | WAV/PCM_16 | Windows SAPI SpeechSynthesizer (Microsoft Zira Desktop - en-US) |
| `MIX_06` | `mix_codeswitch_06.wav` | 5.67s | WAV/PCM_16 | Windows SAPI SpeechSynthesizer (Microsoft Zira Desktop - en-US) |
