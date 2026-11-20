# ShasthoSetu AI (স্বাস্থ্যসেতু) — Comprehensive Architecture & Engineering Handbook

**System Version:** 2.5.0 (Full-Stack Telemedicine & Bilingual Clinical Intelligence Ecosystem)  
**Authors:** Official 5-Member Engineering Leadership Team  
**License:** MIT Open Source ([`LICENSE`](LICENSE))  
**GitHub Repository:** https://github.com/ashik123-a1/ShasthoSetu-AI  
**Clinical Dataset Hub:** https://huggingface.co/datasets/ashik1236/shasthosetu-clinical-datasets  

---

## 1. Executive Summary & Mission

**ShasthoSetu AI (স্বাস্থ্যসেতু)** is an offline-first, bilingual (Bengali, English, and Banglish) clinical intelligence, research observability, and telemedicine platform engineered specifically for Bangladesh and underserved South Asian healthcare ecosystems.

Core engineering pillars:
- **Edge LLM Clinical Triage:** Local `qwen2.5:7b` inference via Ollama (`127.0.0.1:11434`) paired with fail-closed `safety_guard.py` filters.
- **DGHS & WHO Locked Guideline RAG:** Hybrid `BM25Okapi` + `bge-m3` Dense RRF retrieval (`Recall@1: 95.00%`, `Recall@3: 100.00%`, `MRR: 0.9750`).
- **4-Role Physically & Cryptographically Isolated Portals:** Patient, Doctor (Approved vs. Pending onboarding isolation), Support Desk (`HTTP 403` Zero-PHI wall), and System Admin across **139 REST/WS endpoints (15 routers)** and **55 SQLite WAL tables**.
- **Proximity Emergency Blood Coordination:** Covers all **8 administrative divisions of Bangladesh** with interactive Leaflet geospatial mapping and heuristic contact masking (`+880 17•• •••12`) until mutual consent.
- **Human-in-the-Loop Safe Prescription Verification (`HTTP 422`):** Locks automated medication reminders until uncertain bilingual OCR tokens are reviewed by a patient or approved physician (`SIMULATED_REVIEW_ONLY`).
- **Interactive 3D Medical Care Twin & Gyroscopic `MedicalAiChatbotOrb`:** Built with Three.js / React Three Fiber (`HeroCareLattice`, `HolographicBodyScanner3D`), cursor-tracking `MedicalAiChatbotOrb`, and an integrated radial menu for team & GitHub links.
- **Dual Conversational Voice Architecture:** Supports both hands-free live speech calls (`Whisper` + Web Audio Analyser + spoken replies) and standard text chat with one-click spoken playback (`শুনুন` / Listen).
- **Clinical Daylight White Mode & Dark Obsidian Theme:** High-contrast accessible themes in `apps/web/src/styles/tokens.css`, toggleable on public and authenticated headers alongside motion controls.

> [!NOTE]
> **Clinical Safety & Regulatory Boundary:** ShasthoSetu AI is a non-diagnostic research and telemedicine workflow prototype. Privacy scrubbing (`Zero-PHI` regex/masking) and non-prescribing safety interlocks are engineering heuristics aligned with clinical safety principles and do NOT represent formal regulatory certification from BMDC or external medical boards.

---

## 2. Official Engineering Leadership (5-Member Team)

Synced identically with [`apps/web/src/data/teamData.ts`](apps/web/src/data/teamData.ts):

| Portrait | Name | Role & Specialization | Phone | Email |
| :---: | :--- | :--- | :--- | :--- |
| <img src="apps/web/public/images/team/nakib_md_ashik.png" width="56" alt="Nakib Md Ashik"/> | **Nakib Md Ashik** (`Team Leader`) | **Team Leader & System Architect**<br>System Architecture, Bilingual RAG, Whisper ASR, Full-Stack Integration & Zero-PHI Security | `+880 1771449164` | `ashiknakib25@gmail.com` |
| <img src="apps/web/public/images/team/mynuddin_ahmed.png" width="56" alt="Mynuddin Ahmed"/> | **Mynuddin Ahmed** (`Member 01`) | **Frontend & 3D Geospatial UI/UX Designer**<br>Three.js 3D Twins, 8-Division Leaflet GeoJSON Atlas & Responsive Clinical Glassmorphism | `+880 1643897205` | `mayanahmedopu@gmail.com` |
| <img src="apps/web/public/images/team/hasin_ishruq.png" width="56" alt="Hasin Ishruq"/> | **Hasin Ishruq** (`Member 02`) | **Clinical AI & ML Research Engineer**<br>EasyOCR Bilingual, PyTorch Inference, DermoPed AI, PCOS Ultrasound & Domain Guardrails | `+880 1405080369` | `hasin.ishruq@gmail.com` |
| <img src="apps/web/public/images/team/al_kabir.png" width="56" alt="Al Kabir"/> | **Al Kabir** (`Member 03`) | **Backend, Security & Telemetry Engineer**<br>FastAPI Microservices, 55-Table SQLite WAL, Zero-PHI Isolation & WebRTC Signaling | `+880 01798323391` | `alkabir.cse@gmail.com` |
| <img src="apps/web/public/images/team/rifah_sunjidah_remu.png" width="56" alt="Rifah Sunjidah Remu"/> | **Rifah Sunjidah Remu** (`Member 04`) | **Clinical QA & Health Informatics Engineer**<br>Clinical Data QA, Dataset Validation, UAT Testing, Healthcare Informatics & Audit Compliance | `+880 1798727607` | `rifahsunjidahremu@gmail.com` |

---

## 3. High-Level System Architecture

```text
                                  [ React 19 Web / 3D / Audio Client (:5173) ]
                                                       │
                                 ┌─────────────────────┴─────────────────────┐
                                 ▼                                           ▼
                    [ Public Floating Header & 3D Orb ]         [ 4 Role-Isolated Portals ]
                                 │                                           │
                                 └─────────────────────┬─────────────────────┘
                                                       ▼
                                     [ FastAPI Gateway (:8000 · 15 Routers · 139 Endpoints) ]
                                                       │
             ┌──────────────────┬──────────────────────┴──────────────────┬──────────────────┐
             ▼                  ▼                                         ▼                  ▼
    [ Hybrid RAG Engine ]  [ MCP Server Suite ]                  [ Multi-Agent Triager ]  [ 6 Audited ML/DL Modules ]
    • BM25Okapi Lexical    • guideline_mcp (Stdio/SSE/HTTP)      • LangGraph State Graph  • 01 PCOS XGBoost (N=88)
    • BGE-M3 Dense         • directory_mcp (Stdio/SSE/HTTP)      • AutoGen Adapter        • 02 PCOS Ultrasound ResNet18
    • DGHS / WHO Chunks    • care_record_mcp (RBAC + 422 Gate)   • CrewAI Audit Adapter   • 03 Viral Rash Grouped (N=755)
    • Citation Provenance  • filesystem / memory / seq-think     • OpenAI Agents Adapter  • 04 Safe-OCR (HTTP 422 Gate)
             │                  │                                         │               • 05 Bangla Voice (FLEURS)
             └──────────────────┼─────────────────────────────────────────┴───────────────┤ 06 DermoPed (22 Patients)
                                ▼
                   [ SQLite 55-Table Operational Database ]
                   • WAL Mode + PRAGMA foreign_keys = ON
                   • BEGIN IMMEDIATE Atomic Slot & Consultation Locking
```

For full technical deep-dives, see:
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Subsystem internals, SQLite schema families, RAG & WebRTC signaling
- [`docs/SECURITY.md`](docs/SECURITY.md) — Argon2id authentication, RBAC boundaries, Zero-PHI & Safe-OCR rules
- [`docs/mcp_architecture.md`](docs/mcp_architecture.md) — MCP transport specs & JSON-RPC tool inventory

---

## 4. Visual, Telemedicine & Interactive Systems

### 4.1 Unified Brand Identity & Daylight White Mode
- **Brand Lockup (`KineticBrandLogo`):** Circular high-contrast stethoscope emblem + `SHASTHOSETU` (`#ffffff` in dark / dark slate in light) + `AI` (`#38bdf8`) across Public Header and all 4 Portal Headers.
- **Clinical Daylight White Mode:** Calibrated in `apps/web/src/styles/tokens.css` (`#f8fafc` canvas, `#ffffff` elevated cards, `#0f172a` slate foreground, accessible borders).

### 4.2 Interactive 3D & Gyroscopic AI Chatbot Orb (`MedicalAiChatbotOrb`)
- Counter-rotating gyroscopic rings synchronized via `requestAnimationFrame` SVG transforms around `(50, 50)`.
- Glowing radial core with cursor-tracking eyes, natural blinking, and audio/speech reactive mouth animations.
- Top launcher cluster providing direct triggers for the **5-Member Team Directory (`TeamRosterModal`)** and **GitHub Source Repository (`ashik123-a1/ShasthoSetu-AI`)**.

### 4.3 Clinical Directories, ePharma & Diagnostic Panels
- **Doctors Directory:** 43 verified demo doctors filterable across **8 Clinical Departments** (`General Physician`, `Pediatrics`, `Gynecology`, `Dermatology`, `Internal Medicine`, `Endocrinology`, `Cardiology`, `Orthopedics`).
- **Diagnostic Lab Panels & ePharma Store:** 12 structured diagnostic lab test panels (CBC, HbA1c, Dengue NS1, Pelvic USG, Lipid Profile, etc.) and medicine store with visual dosage-form icons, demo cart, and printable PDF receipts (`/patient/receipts/:paymentId`).

### 4.4 Payment-Before-Call 2-Device Telemedicine
- Patients cannot launch consultation audio/video sessions prior to simulated fee settlement.
- Immediately after payment (`SimulatedPaymentCheckoutModal`), patients complete a pre-call consultation intake form (`ConsultationPreparationModal`) and enter a synced 2-device WebRTC signaling room (e.g., `apt-demo-9001`).

---

## 5. Dual Conversational Voice System

1. **Mode 1: Hands-Free Conversational Voice Call**
   - Direct real-time voice interaction without typing.
   - Captures audio stream through Web Audio API / local Whisper ASR endpoints and automatically speaks responses aloud in Bengali or English.
2. **Mode 2: Text Chat + On-Demand Spoken Playback**
   - Standard bilingual chat interface with Zero-PHI sanitization and mandatory DGHS/WHO source citations.
   - Includes per-message `[ 🔊 Listen / শুনুন ]` triggers backed by browser Speech Synthesis / local TTS fallback.

---

## 6. Emergency Helplines & Footer Channels

Synced with [`apps/web/src/components/layout/PublicFooter.tsx`](apps/web/src/components/layout/PublicFooter.tsx):
- **24/7 Care Telehealth Helpline (Demo):** `+880 9612-SHASTHO (74278)`
- **Demo WhatsApp Desk:** `+880 1771449164` (`https://wa.me/8801771449164`)
- **Demo Social Links:** Facebook (`#shasthosetu`), Instagram (`#shasthosetu`), and GitHub (`https://github.com/ashik123-a1/ShasthoSetu-AI`)

---

## 7. Local Development & Verification Commands

### Installation & Local Server Startup
```powershell
# 1. Install unified Python dependencies
pip install -r requirements.txt

# 2. Seed SQLite database (auto-creates services/api/data/shasthosetu.db)
$env:PYTHONPATH = "services/api/src;."
python -m shasthosetu_api.seeds.seed_demo

# 3. Start Backend API (:8000) & Frontend (:5173) via 1-click launcher:
.\start.bat
# Or manually:
python -m uvicorn shasthosetu_api.main:app --host 0.0.0.0 --port 8000
cd apps/web && npm install && npm run dev
```

### Verification Suites
```powershell
# Backend API, security & metric-lock tests (38 tests)
$env:PYTHONPATH = "services/api/src;."
pytest services/api/tests -q

# Frontend TypeScript check, Vitest unit suite (15 tests) & production build
cd apps/web
npm run typecheck
npm run test
npm run build

# Research provenance & hash lock check
python SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/final_lock/verify_final_lock.py
```

For deployment guides (Ollama GPU, Cloudflare/ngrok/Localtunnel, and cPanel WSGI), read [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).
