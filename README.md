# ShasthoSetu AI (স্বাস্থ্যসেতু) — Bilingual Clinical Intelligence & Telemedicine Ecosystem

[![Live Public Demo](https://img.shields.io/badge/Live_Tunnel-Cloudflare-orange.svg)](https://unix-synthesis-franklin-across.trycloudflare.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Bilingual: Bengali & English](https://img.shields.io/badge/Language-Bengali%20%7C%20English-emerald.svg)]()
[![Model Context Protocol: v2.3](https://img.shields.io/badge/MCP-3%20Built%20%7C%203%20Used-purple.svg)]()
[![Zero-PHI Verified](https://img.shields.io/badge/Privacy-100%25%20Zero--PHI-success.svg)]()

> **ShasthoSetu AI (স্বাস্থ্যসেতু)** is an open-source, offline-first, bilingual clinical intelligence and emergency healthcare ecosystem engineered specifically for Bangladesh and underserved South Asian clinical contexts. It couples local edge LLM inference (`Qwen 2.5 7B` on an NVIDIA RTX 5060 Ti) with hybrid vector-BM25 retrieval, clinical knowledge graphs, and the Model Context Protocol (MCP) to deliver culturally-attuned triage, emergency 999 handoffs, and physician-governed telemedicine.

---

## 🌟 Key Capabilities

1. **Bilingual Speech & Text Clinical Triage**:
   - Speak in colloquial Bengali via `Whisper-v3-turbo` or type in English/Bengali.
   - Grounded in locked DGHS Bangladesh and WHO clinical guidelines with **MRR 0.9750** and **Hit@3 1.0000**.
   - Immediate **Code 999 Emergency Handoff** for acute cardiovascular, respiratory, or stroke crises.

2. **Geo-Proximity Emergency Blood Coordination**:
   - Covers all 8 administrative divisions of Bangladesh with 5/10/20 km radius matching.
   - Privacy-preserving contact masking (`+880 17•• •••12`) until hospital verification and mutual consent.

3. **Human-in-the-Loop Prescription Safety Gate (HTTP 422)**:
   - Rejects illegible handwritten prescriptions with `HTTP 422 Unprocessable Entity` rather than hallucinating medication dosages.
   - Routes flagged prescriptions to BMDC-registered physicians across 43 telemedicine lounges.

4. **Model Context Protocol (MCP) Suite**:
   - **3 Custom Built MCP Servers**: `guideline_mcp`, `directory_mcp`, `care_record_mcp` supporting Stdio, SSE, and HTTP transports.
   - **3 Verified Public MCPs**: `filesystem`, `memory`, `sequential-thinking` configured in `.mcp.json`.
   - Role-Based Access Control enforcing `ERR_ZERO_PHI_FORBIDDEN` against non-clinical roles.

5. **Multi-Agent Orchestration**:
   - Live deterministic **LangGraph** triage state machine (`/v1/agents/orchestrate`).
   - Offline governance and cross-audit harnesses: **CrewAI**, **AutoGen**, **OpenAI Agents SDK**, and **Swarm**.

---

## 🏗️ System Architecture

```
[Web / PWA / Voice Client]
         │ (HTTP / WebSocket)
         ▼
[FastAPI Gateway :8000] ─── Zero-PHI Presidio & Regex Sanitizer
         │
         ├─► [Hybrid RAG Engine] ── BM25 + BGE-M3 Dense + Knowledge Graph
         ├─► [Local LLM Daemon] ── Ollama (:11434) / Qwen 2.5 7B (RTX 5060 Ti)
         ├─► [MCP Hub] ── guideline_mcp, directory_mcp, care_record_mcp
         ├─► [LangGraph Engine] ── Intent -> Triage -> Safety Critic -> Action
         └─► [SQLite WAL DB] ── Users, 43 Doctors, Blood Requests, Audit Logs
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Python 3.10+
- Node.js 18+
- Ollama with `qwen2.5:7b` and `bge-m3` pulled

### 2. Backend Setup
```bash
cd services/api
pip install -r requirements.txt
python -m uvicorn shasthosetu_api.main:app --host 127.0.0.1 --port 8000
```

### 3. Frontend Setup
```bash
cd apps/web
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

---

## 🔒 Security & Compliance
- **Zero-PHI Guarantee**: No unmasked patient identifiers ever touch logs or embedding vectors.
- **BMDC Doctor Governance**: All doctors verified against national registration IDs.
- **Public Tunnel Shield**: Privileged clinical accounts are secured against public tunnel 1-click exposure.

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
