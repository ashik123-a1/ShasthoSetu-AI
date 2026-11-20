# 09 — CLINICAL RAG, BANGLA VOICE & LLM EVALUATION

Audit of the bilingual retrieval pipeline, canonical benchmarks, and local LLM integration.

---

## 1. RAG Architecture & Locked Benchmark Metrics
- **Hybrid Retrieval:** Reciprocal Rank Fusion (RRF) combining BM25 keyword matching with BGE-M3 dense multilingual embeddings.
- **Benchmark Corpus:** 20 unique medical query IDs and 6 separated safety probes (26 total).
- **Verified Benchmark Results:**
  - **Dense Retrieval:** Hits@1 = 90.00% (18/20), Hits@3 = 100.0%, MRR = **0.950000**
  - **BM25 Retrieval:** Hits@1 = 80.00% (16/20), Hits@3 = 90.0%, MRR = **0.854167**
  - **Hybrid RRF:** Hits@1 = 95.00% (19/20), Hits@3 = 100.0%, MRR = **0.975000**
- Verified by `services/api/evals/verify_rag_metric_lock_02.py` asserting exact match against canonical locked JSON results.

---

## 2. Bangla Voice AI (ASR & TTS)
- **ASR Pipeline:** Fine-tuned Whisper Small model accepting WebM/WAV/MP3 audio streams and rendering native Bengali Unicode characters.
- **Transcript Confirmation:** Audio transcription is presented in an editable text area requiring explicit user confirmation before submitting to clinical RAG.
- **TTS Engine:** Offline gTTS fallback synthesizing natural Bengali spoken health advisories.
