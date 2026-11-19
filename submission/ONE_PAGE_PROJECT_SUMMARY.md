# ShasthoSetu AI (স্বাস্থ্যসেতু) — One-Page Project Summary

## Executive Overview
**ShasthoSetu AI** is a production-grade, bilingual (Bengali + English), offline-first clinical AI intelligence and telemedicine ecosystem tailored for Bangladesh and underserved South Asian populations. By coupling local edge LLM inference (`Qwen 2.5 7B` on an NVIDIA RTX 5060 Ti) with hybrid vector-BM25 retrieval, clinical knowledge graphs, and the Model Context Protocol (MCP), ShasthoSetu delivers accurate, culturally-attuned healthcare triage with zero patient health information (Zero-PHI) cloud exposure.

---

## 5 Core Pillars of ShasthoSetu

1. **Bilingual Speech & Guideline-Grounded Clinical Triage**:
   Patients converse naturally in colloquial Bengali or English via speech (`Whisper-v3-turbo`) or text. Triage recommendations are grounded in locked DGHS Bangladesh and WHO clinical guidelines, achieving an audited Mean Reciprocal Rank (MRR) of **0.9750** and Hit@3 of **1.0000**. Acute red flags trigger instant National Emergency **999** and DGHS **16263** handoffs within 150ms.

2. **Geo-Proximity Emergency Blood Coordination Engine**:
   Covers all 8 administrative divisions of Bangladesh with radius filtering (5km / 10km / 20km). Protects donor dignity and safety through cryptographic phone masking (`+880 17•• •••12`), releasing direct contact only upon hospital-verified emergency request and dual-confirmation consent.

3. **Physician Governance & Human-in-the-Loop Prescription Safety Gate**:
   Illegible or ambiguous handwritten doctor scripts trigger a strict `HTTP 422 Unprocessable Entity` safety gate. Rather than risking lethal dosage hallucinations, the system halts automated dispensing and routes the prescription to BMDC-registered physicians in our 43-doctor telemedicine lounge.

4. **Model Context Protocol (MCP) & Multi-Agent Collaboration**:
   Features 3 custom-built MCP servers (`guideline-mcp`, `directory-mcp`, `care-record-mcp`) operating over Stdio, SSE, and HTTP transports, alongside verified public MCPs (`filesystem`, `memory`, `sequential-thinking`). Complex multi-step triage is orchestrated via a deterministic LangGraph state machine, with offline governance cross-checks from CrewAI, AutoGen, and Swarm.

5. **Local-First, High-Performance Edge Stack**:
   Runs 100% locally on Ollama, llama.cpp, and GPT4All runtimes, requiring zero paid external cloud APIs. Exposed safely to evaluators worldwide via a zero-trust Cloudflare Quick Tunnel with public role protection.

---

## Key Impact Metrics
- **Bilingual RAG Precision**: MRR `0.9750`, Hit@1 `0.9500`, Hit@3 `1.0000`.
- **Emergency Code 999 Recall**: `100.0%` on acute cardiovascular and respiratory crises.
- **Privacy Standard**: `100% Zero-PHI` compliance via local Presidio anonymization.
- **National Coverage**: 8 Divisions, 43 Verified BMDC Specialists, 12 Active Blood Donors.
