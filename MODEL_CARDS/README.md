# ShasthoSetu AI — Model Cards & Clinical Governance

This registry documents all primary, auxiliary, and benchmarking models deployed or evaluated within the ShasthoSetu ecosystem.

---

## 1. Primary Clinical Models

### Model M01: `qwen2.5:7b` (Alibaba Cloud / Qwen)
- **Role**: Primary Bilingual Clinical Triage & RAG Synthesizer
- **Inference Runtime**: Ollama (GPU-offloaded to NVIDIA RTX 5060 Ti, 16GB VRAM)
- **Context Length**: 8,192 tokens
- **Safety Policy**: Enforces non-diagnostic guidance, emergency 999 handoff, and prescription gate
- **Benchmark Performance**: Mean Reciprocal Rank (MRR) `0.9750`, Faithfulness `0.94`

### Model M02: `bge-m3` (BAAI)
- **Role**: Multilingual Dense Embedding & Vector Retrieval
- **Inference Runtime**: Ollama / HuggingFace Local
- **Dimensions**: 1,024
- **Language Coverage**: Bengali, English, 100+ languages

### Model M03: `whisper-v3-turbo` (OpenAI / Local)
- **Role**: Bilingual Speech-to-Text Transcription for Clinical Voice AI
- **Specialization**: Bandpass-filtered for South Asian accent & colloquial Bengali phonetics

---

## 2. Evaluation & Stress-Test Benchmarks

### Model M04: `qwen3.8-27b-uncensored:latest` (10 GB Local Weight)
- **Role**: Offline Red-Team Adversarial Guardrail Stress-Test Baseline
- **Purpose**: Evaluates whether external uncensored weights can breach `safety_guard.py` layers. Verified: 100% fail-closed safety block maintained.

### Model M05: `deepseek-r1:8b`
- **Role**: Clinical Chain-of-Thought Reasoning Benchmark

### Model M06: `glm4:9b`
- **Role**: Multi-turn Dialogue Quality Evaluation
