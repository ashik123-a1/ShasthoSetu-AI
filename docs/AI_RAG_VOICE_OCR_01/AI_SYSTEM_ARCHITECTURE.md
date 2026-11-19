# ShasthoSetu AI — Bilingual AI Assistant Architecture Specification
**Document ID:** `ARCH-AI-RAG-VOICE-OCR-01`  
**System:** ShasthoSetu AI (National Healthcare Platform of Bangladesh)  
**Hardware Target:** Local Edge Host (NVIDIA GeForce RTX 5060 Ti 16 GB VRAM, 32 GB Host RAM, Windows 11)  
**Status:** IMPLEMENTED & VERIFIED  

---

## 1. High-Level Executive Summary

The ShasthoSetu AI system delivers an evidence-grounded, bilingual (Bengali, English, and Romanized Banglish) healthcare intelligence engine directly integrated into the existing ShasthoSetu full-stack web application. It unifies four mission-critical subsystems:

1. **Bilingual RAG Chatbot:** Grounded semantic retrieval from a curated, approved 14-document medical corpus using hybrid dense (BGE-M3 1024-dim) and sparse (BM25) reciprocal rank fusion (RRF), coupled with local Qwen2.5-7B ChatML generative inference.
2. **Bengali & English Speech Intelligence (ASR & TTS):** Dual-engine acoustic transcription (Anuragshas Whisper-Small-Bn for Bengali Unicode and OpenAI Whisper-Base for English/code-switching) with a mandatory, non-bypassable human editable transcript confirmation gate; paired with zero-network speech synthesis (Windows SAPI5 for English and Meta MMS-TTS for Bengali).
3. **Bilingual Prescription OCR Studio:** Dual-script OCR (EasyOCR Bengali + English) with spatial line clustering, 6 critical medicine field parsing, interactive canvas bounding-box inspector, HTTP 422 clinical verification gate, and 4-block OCR-to-RAG educational explanations.
4. **Administrative Governance & Zero-PHI Guard:** Strict RBAC across four operational personas (`PATIENT`, `DOCTOR`, `ADMIN`, `SUPPORT`), persistent SQLite telemetry, live VRAM monitoring, and complete redaction of patient identifiers from support logs and vector indices.

---

## 2. Hardware Topology & Resource Allocation

```
+-----------------------------------------------------------------------------------------+
|                               HOST HARDWARE ARCHITECTURE                                |
|  CPU: AMD/Intel x86_64 Multi-Core (32 GB RAM) | GPU: NVIDIA GeForce RTX 5060 Ti (16 GB) |
+-----------------------------------------------------------------------------------------+
                                             |
            +--------------------------------+--------------------------------+
            |                                                                 |
            v                                                                 v
+-------------------------------+                               +-------------------------------+
|     OLLAMA RUNTIME ENGINE     |                               |   DIRECT PYTORCH CUDA ENGINE  |
|  (Task-195 on 127.0.0.1:11434)|                               |    (FastAPI / PyTorch 2.6)    |
|                               |                               |                               |
| • Qwen2.5:7B (Q4_K_M GGUF)    |                               | • Anuragshas Whisper-Small-Bn |
|   VRAM: ~4.7 GB               |                               |   VRAM: ~950 MB (CUDA:0)      |
| • BGE-M3 Embeddings (GGUF)    |                               | • OpenAI Whisper-Base         |
|   VRAM: ~437 MB               |                               |   VRAM: ~480 MB (CUDA:0)      |
|                               |                               | • EasyOCR ResNet-Craft        |
| Total VRAM Allocated: ~5.2 GB |                               |   VRAM: ~850 MB (On-Demand)   |
+-------------------------------+                               +-------------------------------+
                                             |
                                             v
                           +-----------------------------------+
                           |  COMBINED PEAK VRAM: ~7.5 GB      |
                           |  REMAINING HEADROOM: ~8.5 GB      |
                           |  (Zero Out-Of-Memory Collisions)  |
                           +-----------------------------------+
```

---

## 3. Subsystem Architectural Workflows

### 3.1 Hybrid RAG Retrieval Engine

```mermaid
flowchart TD
    UserQuery["User Input (Bangla / English / Banglish / Mixed)"] --> ScriptNorm["Language Detection & Script Normalization"]
    ScriptNorm --> ParallelRetrieval{"Parallel Retrieval Dispatch"}
    
    ParallelRetrieval -->|"Dense 1024-dim Vector"| BGE["Ollama BGE-M3 Embeddings"]
    ParallelRetrieval -->|"Sparse Lexical Tokens"| BM25["Rank-BM25 Inverted Index"]
    
    BGE --> FAISS["Faiss FlatIP Index (Inner Product / Cosine)"]
    FAISS --> DenseTop["Top-5 Dense Candidates"]
    BM25 --> SparseTop["Top-5 Lexical Candidates"]
    
    DenseTop --> RRF["Reciprocal Rank Fusion (k=60)"]
    SparseTop --> RRF
    
    RRF --> Filter["Status & Role Security Filter (APPROVED & Scope)"]
    Filter --> TopContext["Top-3 Evidence Chunks (Numbered [1], [2], [3])"]
    
    TopContext --> PromptBuilder["ChatML Prompt Builder with System Safety Rules"]
    PromptBuilder --> QwenLLM["Qwen2.5-7B Generative Synthesis (Temp=0.2)"]
    QwenLLM --> PostProc["Citation Verification & Emergency Warning Gate"]
    PostProc --> ClientDelivery["Client UI with Clickable Citation Badges"]
```

### 3.2 Voice Assistant: Speech-to-Text & Mandatory Editable Transcript Gate

```mermaid
flowchart TD
    AudioStream["Client Audio (Microphone 16kHz PCM WAV or File Upload)"] --> FormatVal["Format Validation (Max 15MB, 16kHz Float32)"]
    FormatVal --> FastDetect["Fast Language Pre-Check (Whisper-Base 30s Window)"]
    
    FastDetect --> ScriptBranch{"Target Language"}
    ScriptBranch -->|"Bengali Script"| WhisperBN["anuragshas/whisper-small-bn (CUDA:0)"]
    ScriptBranch -->|"English / Mixed"| WhisperBase["openai/whisper-base (CUDA:0)"]
    
    WhisperBN --> RawTranscript["Raw ASR Transcript"]
    WhisperBase --> RawTranscript
    
    RawTranscript --> NonBypassableGate["MANDATORY EDITABLE TRANSCRIPT CONFIRMATION GATE"]
    NonBypassableGate --> UserReview["User Views, Edits, and Verifies Transcript in UI"]
    
    UserReview -->|"Explicit User Approval"| ChatInjection["Injected into RAG Assistant Thread"]
    UserReview -->|"Discard / Cancel"| Drop["Audio and Transcript Dropped (Zero Action)"]
```

### 3.3 Bilingual Prescription OCR Studio

```mermaid
flowchart TD
    Prescription["Prescription (PNG / JPG / PDF)"] --> Prep["Preprocessing (Grayscale, Adaptive Contrast, Deskew)"]
    Prep --> EasyOCR["EasyOCR Engine (Bengali + English Dual-Model)"]
    
    EasyOCR --> TokenExtraction["Token Extraction (Text, Bounding Box, Confidence)"]
    TokenExtraction --> LineClustering["Spatial Line Clustering (Y-Overlap Threshold)"]
    LineClustering --> FieldParser["6-Field Clinical Parser"]
    
    FieldParser --> Fields["Extracted Fields:\n1. Medicine Name\n2. Strength\n3. Dose\n4. Frequency\n5. Duration\n6. Route"]
    
    Fields --> HumanGate{"Human Clinical Verification Gate"}
    HumanGate -->|"Status: NEEDS_REVIEW"| BlockMed["HTTP 422: Medication Reminders Blocked"]
    HumanGate -->|"Doctor/Patient Manually Verifies All Fields"| Verified["Status: VERIFIED"]
    
    Verified --> OptionalSync["Optional Medication Schedule Activation"]
    Fields --> OCRtoRAG["OCR-to-RAG Educational Explanation Engine"]
    OCRtoRAG --> FourBlocks["Structured 4-Block Plain-Language Explanation:\n1. Core Indication\n2. Administration Guidance\n3. Key Cautions\n4. Follow-up Recommendations"]
```

---

## 4. Multi-Tenant Role-Based Access Matrix

| Role | Public Assistant | Voice Input | Upload Own Prescription | Review Consented Records | RAG Knowledge Base Governance | Support Audit Logs | PHI Access |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **PATIENT** | Full Access | Full Access | Full Access (Self Profile) | Denied (`403`) | Denied (`403`) | Denied (`403`) | Self Only |
| **DOCTOR** | Full Access | Full Access | Full Access | Consented Patients Only | Denied (`403`) | Denied (`403`) | Consented Only |
| **ADMIN** | Full Access | Full Access | Denied (`403`) | Denied (`403`) | Full Ingestion & Reindex | System Events Only | Zero-PHI (`403`) |
| **SUPPORT** | Full Access | Full Access | Denied (`403`) | Denied (`403`) | View Sources (Read-Only) | Redacted FAQs Only | Zero-PHI (`403`) |

---

## 5. Architectural Verification & Zero-Failure Standard

- **No Public Leaks:** All API routes strictly enforce session cookies (`ss_session_id`) and Argon2id authenticated contexts.
- **Fail-Safe Fallbacks:** If Ollama or the local GPU experiences temporary unavailability, the system falls back gracefully to extractive context summarization without throwing unhandled exceptions.
- **Persistent Audit Logging:** Every document ingestion, OCR parsing run, and clinical verification event writes an immutable entry into the SQLite `audit_events` ledger.
