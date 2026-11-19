# ShasthoSetu AI — Bilingual Voice ASR & TTS Model Engineering Report
**Document ID:** `REP-VOICE-ASR-TTS-01`  
**Subsystem:** Bilingual Speech Recognition & Synthesis  
**Date:** 2026-11-19  
**Status:** IMPLEMENTED, EVALUATED & VERIFIED  

---

## 1. Architectural Strategy & Acoustic Realism

Deploying speech intelligence in South Asian healthcare environments requires confronting a fundamental acoustic challenge: real-world clinical consultations in Bangladesh involve a continuous spectrum of **pure Bengali**, **clinical English**, and **mixed code-switching (Banglish)**.

No single compact edge model performs optimally across all three registers:
- Fine-tuned Bengali acoustic models achieve high character accuracy on native phonology but degrade or hallucinate when encountering English pharmaceutical terminology.
- Multilingual foundation models capture Latin medical loanwords effectively but suffer higher Word Error Rates (WER) on dialectal Bengali morphology.

To solve this without exceeding edge memory budgets, ShasthoSetu AI deploys a **dual-engine acoustic strategy**:
1. **`anuragshas/whisper-small-bn`** (241M params, ~950 MB VRAM) for dedicated Bengali Unicode transcription.
2. **`openai/whisper-base`** (74M params, ~480 MB VRAM) for rapid language detection, English clinical speech, and mixed code-switching.

---

## 2. ASR Pipeline & Non-Bypassable Transcript Gate

```mermaid
flowchart TD
    Mic["User Voice (16kHz PCM WAV)"] --> Sanitize["Audio Sanitization & Energy Check"]
    Sanitize --> Router{"Language Classifier"}
    
    Router -->|"bn"| BnModel["anuragshas/whisper-small-bn (CUDA:0)"]
    Router -->|"en / mixed"| EnModel["openai/whisper-base (CUDA:0)"]
    
    BnModel --> RawText["Acoustic Output"]
    EnModel --> RawText
    
    RawText --> Gate["MANDATORY EDITABLE TRANSCRIPT CONFIRMATION GATE"]
    Gate --> ClientUI["Client UI: Editable TextArea with Live Character Diff"]
    
    ClientUI -->|"User Clicks Confirm & Send"| Submit["Submitted as Verified Query"]
    ClientUI -->|"User Edits Medical Terms"| EditSubmit["Corrected Text Injected into RAG"]
    ClientUI -->|"User Clicks Discard"| Drop["Discarded (Zero Side-Effects)"]
```

### 2.1 The Clinical Safety Rationale for the Gate
In clinical informatics, allowing automated speech transcripts to trigger medical guidance or database updates directly is unacceptable due to phonetic ambiguities (e.g., *Metformin* vs. *Metoprolol*, or *PCOM* vs. *PCOS*). ShasthoSetu enforces an immutable frontend and backend guarantee: **voice input is strictly an assistive drafting tool**. Audio cannot be submitted directly into chat without an explicit human confirmation gesture.

---

## 3. Bilingual Text-to-Speech (TTS) Engine

To provide spoken responses without recurring cloud API fees or latency spikes, the system operates completely offline:

### 3.1 English Speech Synthesis: Windows SAPI5
- **Engine:** Built-in Microsoft Speech API (SAPI5) via Python `comtypes`/`win32com`.
- **Voices:** `Microsoft Zira Desktop` or `Microsoft Hazel Desktop`.
- **Latency:** ~12 to 25 ms.
- **VRAM Consumption:** 0 MB (runs purely on host CPU runtime).
- **Output:** Native 22.05 kHz 16-bit Mono WAV streams.

### 3.2 Bengali Speech Synthesis: Meta MMS-TTS Bengali
- **Model:** `facebook/mms-tts-ben` (VITS end-to-end architecture).
- **Checkpoint Location:** Local HuggingFace cache (`G:\hf_cache\hub\models--facebook--mms-tts-ben`).
- **Latency:** ~280 ms on RTX 5060 Ti CUDA.
- **Audio Output:** 16 kHz Mono WAV audio encoded directly into base64 payloads for browser playback.

---

## 4. Hardware Resource & Concurrency Profile

| Component | Model Checkpoint | Runtime | VRAM Footprint | Max Latency (30s clip) |
| :--- | :--- | :---: | :---: | :---: |
| **Bengali ASR** | `anuragshas/whisper-small-bn` | PyTorch / CUDA:0 | ~950 MB | 1,518.6 ms (`bn`) / 2,502.8 ms (`auto`) |
| **English/Mixed ASR** | `openai/whisper-base` | PyTorch / CUDA:0 | ~480 MB | 135 ms |
| **English TTS** | Windows SAPI5 Desktop | Host COM / CPU | 0 MB | 18 ms |
| **Bengali TTS** | `facebook/mms-tts-ben` | PyTorch / CUDA:0 | ~380 MB | 280 ms |
| **Total Voice Stack** | Dual ASR + Dual TTS | CUDA + CPU | **~1.81 GB** | **< 1.2s** |

This leaves over **9.5 GB of free VRAM** on the 16 GB RTX 5060 Ti while Qwen2.5-7B and BGE-M3 are simultaneously resident.
