# ShasthoSetu AI — Comprehensive Engineering & Feature Handbook (`v2.5.0`)

**Repository:** https://github.com/ashik123-a1/ShasthoSetu-AI  
**Dataset Hub:** https://huggingface.co/datasets/ashik1236/shasthosetu-clinical-datasets  
**License:** MIT Open Source ([`../LICENSE`](../LICENSE))  

---

## 1. Engineering Highlights & Platform Scope

- **API Surface:** 15 domain FastAPI routers exposing **139 REST/WS endpoints** (`services/api/src/shasthosetu_api/routers/`).
- **Database Persistence:** **55 SQLite tables** (`54` relational tables in `schema.sql` + `webhook_replay_nonces` guard table) running in WAL mode with explicit `BEGIN IMMEDIATE` transaction locks.
- **Clinical Coverage:** **43 approved demo clinicians** across **8 departments**, **8 administrative divisions of Bangladesh**, **12 diagnostic testing panels**, and **8 ePharma medicine categories**.
- **Edge AI & Hybrid RAG:** Local Ollama inference (`qwen2.5:7b` + `bge-m3`), `BM25Okapi` lexical ranking + RRF fusion (**95.00% Recall@1**, **100.00% Recall@3**, **0.9750 MRR**), dual-mode Bengali/English Voice AI, and **HTTP 422** Safe-OCR prescription gate.
- **3D Experience & Accessibility:** Three.js Care Lattice & Holographic Body Scanner, gyroscopic `MedicalAiChatbotOrb`, **Clinical Daylight White Mode** & **Sapphire Obsidian Dark Mode**, full `EN` / `বাংলা` localization.

---

## 2. Official 5-Member Engineering Leadership Team

Synced identically with [`../apps/web/src/data/teamData.ts`](../apps/web/src/data/teamData.ts):

| Name | Member No | Role & Specialization | Phone | Email |
| :--- | :---: | :--- | :--- | :--- |
| **Nakib Md Ashik** | `Team Leader` | Team Leader & System Architect — Bilingual RAG, Whisper ASR, Full-Stack Integration & Zero-PHI Security | `+880 1771449164` | `ashiknakib25@gmail.com` |
| **Mynuddin Ahmed** | `Member 01` | Frontend & 3D Geospatial UI/UX Designer — Three.js 3D Twins, 8-Division Leaflet Atlas & Clinical Glassmorphism | `+880 1643897205` | `mayanahmedopu@gmail.com` |
| **Hasin Ishruq** | `Member 02` | Clinical AI & ML Research Engineer — EasyOCR Bilingual, PyTorch Inference, DermoPed AI, PCOS Ultrasound & Guardrails | `+880 1405080369` | `hasin.ishruq@gmail.com` |
| **Al Kabir** | `Member 03` | Backend, Security & Telemetry Engineer — FastAPI Microservices, 55-Table SQLite WAL, Zero-PHI Isolation & WebRTC | `+880 01798323391` | `alkabir.cse@gmail.com` |
| **Rifah Sunjidah Remu** | `Member 04` | Clinical QA & Health Informatics Engineer — Clinical Data QA, Dataset Validation, UAT Testing & Audit Compliance | `+880 1798727607` | `rifahsunjidahremu@gmail.com` |

---

## 3. Core Subsystems Implemented

1. **Unified Brand & Daylight White Mode:** Circular glowing stethoscope emblem + `SHASTHOSETU AI` across the floating public header and all 4 authenticated portals, backed by calibrated high-contrast CSS tokens (`apps/web/src/styles/tokens.css`).
2. **Gyroscopic `MedicalAiChatbotOrb` & Radial Menu:** 60 FPS `requestAnimationFrame` SVG ring orbit around `(50, 50)`, cursor-tracking eyes, radial shortcut menu for Team Directory (`5 Engineers`) & GitHub repository.
3. **Dual Conversational Voice AI:** Supports hands-free live voice conversations (`Whisper` + spoken TTS) and text chat with one-click `[ 🔊 Listen / শুনুন ]` playback and mandatory editable transcript review.
4. **Payment-Before-Call 2-Device Telemedicine:** Unpaid consultations cannot join consultation rooms; payment triggers pre-call intake (`ConsultationPreparationModal`) and synchronized 2-device WebRTC signaling (`apt-demo-9001`).
5. **Custom & Integrated MCP Servers:** 3 custom Python MCP servers (`guideline-mcp`, `directory-mcp`, `care-record-mcp`) supporting `stdio`, `sse`, and `streamable-http` alongside 4 public/external MCP integrations (`.mcp.json`).
