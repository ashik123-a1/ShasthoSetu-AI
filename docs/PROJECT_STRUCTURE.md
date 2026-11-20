# ShasthoSetu AI — Project Directory Inventory & GitHub vs. Hugging Face Split

This document explains every top-level folder in **ShasthoSetu AI** and clarifies which artifacts live inside **GitHub** (clean source, docs, evidence, and 1 MB sample QA pack), which live on **Hugging Face** (~2.03 GiB clinical datasets), and which stay **local-only** via `.gitignore`.

---

## 1. Repository Storage Separation Policy

| Storage Tier | Destination | Contents | Why |
| :--- | :--- | :--- | :--- |
| **Tier 1 (GitHub)** | `ashik123-a1/ShasthoSetu-AI` | Application source (`apps/web`, `services/`), 15 API routers, 3 MCP servers, LangGraph/agent adapters, **A–Z docs**, frozen audit hashes, **execution screenshots**, and **`testingmainapps/`** (`1.01 MB`) | Fast git clones (< 50 MB), zero broken tests (`38 pytest + 15 vitest`), immediate UI/API testing out of the box. |
| **Tier 2 (Hugging Face)** | `ashik1236/shasthosetu-clinical-datasets` | Full clinical images, ultrasound scans, MCVSLD crops, Gazipur prescriptions, FLEURS audio, and DermoPed subsets (`35,641` files) | Keeps Git lightweight while preserving full public reproducibility & DOI traceability. |
| **Tier 3 (Local Only)** | Ignored via `.gitignore` | Virtualenvs (`_shared/venv/`, `.venv/`), `node_modules/`, SQLite runtime `.db` files, `.env`, `.pth`/`.joblib` weights, `.zip` archives, `_reference_repos/`, internal scratchpads | Prevents bloated commits, environment lock-in, or leaking local configs. |

---

## 2. Complete Directory Reference (A–Z)

### Application & Service Core
- **`apps/web/`** — React 19 + TypeScript + Vite 6 + Tailwind CSS v4 frontend, Three.js 3D Medical Care Twin & Holographic Body Scanner, Leaflet Bangladesh map, gyroscopic `MedicalAiChatbotOrb`, 4 role portals, and Vitest suite (`src/test/designSystem.test.tsx`).
- **`services/api/`** — FastAPI backend (`15` routers, `139` endpoints), SQLite 55-table WAL schema (`db/schema.sql`), Alembic migrations, `evals/`, `tests/` (`38` automated tests), and cPanel `passenger_wsgi.py`.
- **`services/agents/`** — Live LangGraph clinical triage engine (`langgraph_triage.py`), OpenAI Agents navigator, and framework adapters (`autogen_adapter.py`, `crewai_adapter.py`, `openai_agents_adapter.py`).
- **`services/mcp/`** — 3 custom MCP servers (`guideline_mcp.py`, `directory_mcp.py`, `care_record_mcp.py`) + shared transport runner (`common.py`) + live verifier (`verify_mcp_suite.py`).

### QA Data, Research Modules & Audits
- **`testingmainapps/`** — Ready-to-test 5-system benchmark & negative-control QA suite (`01_prescription_ocr/` .. `05_rag_bilingual_assistant/` + `DOCUMENTATION.md`).
- **`01_PCOS_Clinical/` .. `06_DermoPed_Pediatric_Skin/`** — Per-module training/evaluation scripts, configs, audits, and reproducibility scripts (`reproduce.ps1`). Heavy `data/raw/*` & `data/processed/*` payloads reside on Hugging Face.
- **`SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/`** — Cryptographic SHA-256 verification lock (`final_lock/FINAL_AUDIT_SIGNOFF.md`, `FINAL_RESEARCH_MODEL_REGISTER.csv`, `verify_final_lock.py`).
- **`docs/`** — Engineering architecture guides (`ARCHITECTURE.md`, `SECURITY.md`, `USER_ROLES_AND_PERMISSIONS.md`, `TESTING.md`, `DEPLOYMENT.md`, `PROJECT_STRUCTURE.md`, `mcp_architecture.md`), HF provenance audit (`HF_DATASET_PROVENANCE_AUDIT_01/`), and verified benchmark JSON/Markdown + UI screenshots (`evidence/`).

### Root Files & Turnkey Scripts
- **`README.md`**, **`DOCUMENTATION.md`**, **`API.md`**, **`DATASETS.md`**, **`MODEL_CARDS/README.md`**, **`LICENSE`** — Root entry documentation & MIT license.
- **`requirements.txt`** — Unified Python dependency manifest synced with `services/api/requirements.txt`.
- **`start.bat`** & **`start_shasthosetu.ps1`** — Turnkey local/tunnel startup scripts (auto-seed SQLite DB + FastAPI `:8000` + Vite `:5173`).
- **`.mcp.json`** & **`.env.example`** — Portable MCP client configuration (all 7 servers) and environment template.
