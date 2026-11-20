# ShasthoSetu AI — Project Directory Inventory ("Where Everything Lives")

This guide maps every folder in the **ShasthoSetu AI** repository cleanly across **GitHub**, **Hugging Face**, and **local-only gitignored artifacts**.

---

## 1. Three-Tier Repository Storage Policy

| Storage Tier | Destination | Contents | Purpose |
| :--- | :--- | :--- | :--- |
| **Tier 1 (GitHub)** | `ashik123-a1/ShasthoSetu-AI` | Full-stack app (`apps/`, `services/`), **A–Z docs (`docs/`)**, reproducible **ML research code (`research/01..06`)**, frozen SHA-256 lock (`SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/`), and `testingmainapps/` (`1.01 MB` QA pack) | Clean, fast clone; all `38` pytest + `15` vitest + `7` audit-lock tests pass cleanly out of the box. |
| **Tier 2 (Hugging Face)** | [`ashik1236/shasthosetu-clinical-datasets`](https://huggingface.co/datasets/ashik1236/shasthosetu-clinical-datasets) | Full `35,641` clinical images, ultrasound scans, MCVSLD crops, Gazipur prescriptions, FLEURS audio, and DermoPed subsets (`~2.03 GiB`) | Keeps Git repository compact while preserving 100% dataset & DOI provenance. |
| **Tier 3 (Local Only)** | Ignored via `.gitignore` | Virtualenvs (`_shared/venv/`, `.venv/`), `node_modules/`, SQLite runtime `.db`, `.env`, trained `.pth`/`.joblib` weights, `.zip` bundles, `_reference_repos/` | Prevents bloat, credential leaks, and OS/path lock-in. |

---

## 2. Annotated Folder Tree (A–Z)

```text
ShasthoSetu-AI/
├── apps/web/                                   # React 19 + TypeScript + Vite 6 + Three.js + Leaflet Frontend
│   ├── e2e/                                    # 3 Playwright full-stack E2E browser suites
│   ├── public/images/team/                     # 5 official engineering team portraits (Nakib..Rifah)
│   └── src/
│       ├── components/                         # 3D Care Lattice, Body Scanner, MedicalAiChatbotOrb, Portal shells
│       ├── data/teamData.ts                    # Official 5-member roster + GitHub/helpline metadata
│       ├── pages/                              # Public pages, Blood Connect, Care Map, Research & 4 Role Portals
│       └── test/designSystem.test.tsx          # 15 automated Vitest unit & accessibility tests
│
├── services/
│   ├── api/                                    # FastAPI Backend (15 Routers · 139 Endpoints · 55 SQLite Tables)
│   │   ├── src/shasthosetu_api/
│   │   │   ├── db/schema.sql & sqlite.py       # 54 schema tables (+1 runtime table = 55) in WAL + BEGIN IMMEDIATE
│   │   │   ├── routers/                        # auth, patient, doctor, consultations, ai_*, blood_connect, support, admin*
│   │   │   ├── services/                       # rag_engine, safety_guard, ocr_service, ml_inference, voice_asr/tts
│   │   │   └── seeds/seed_demo.py              # Deterministic synthetic seeder (43 doctors, 8 divisions, 5 demo roles)
│   │   ├── evals/                              # Quantitative RAG, OCR, Voice, Security & Isolation benchmarks
│   │   ├── tests/                              # 38 automated pytest integration & metric-lock tests
│   │   └── passenger_wsgi.py                   # cPanel shared-hosting WSGI bridge
│   ├── agents/                                 # Live LangGraph clinical triage + AutoGen / CrewAI / OpenAI adapters
│   └── mcp/                                    # 3 custom MCP servers (guideline, directory, care_record) + verifier
│
├── research/                                   # Reproducible ML/DL Research Source Code & Audits (6 Modules)
│   ├── README.md                               # Faculty guide to all 6 models, verified metrics & HF download
│   ├── 01_pcos_clinical/                       # XGBoost tabular code, configs, CV evaluation (N=88)
│   ├── 02_pcos_ultrasound/                     # ResNet-18 pHash ultrasound code, Grad-CAM & curves (N=299)
│   ├── 03_viral_rash_grouped/                  # 755-family clean grouped split code, leakage audits & Grad-CAM
│   ├── 04_prescription_ocr/                    # EasyOCR bilingual pipeline, Gazipur audit manifests & model card
│   ├── 05_bangla_voice_ai/                     # Whisper-BN vs Whisper-Base FLEURS scripts & CER/WER charts
│   └── 06_dermoped_pediatric_skin/             # DermoPed EXP_B / EXP_D ResNet-18 training & patient-split audits
│
├── SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/      # Cryptographically frozen SHA-256 register & verify_final_lock.py
├── testingmainapps/                            # Curated 1 MB 5-System QA pack + negative controls for instant testing
├── docs/                                       # Organized A–Z documentation, readme/banner.svg, 9 UI PNGs & eval traces
├── scripts/                                    # HF dataset upload, RAG index builder, local benchmarks & cPanel smoke test
├── workflows/                                  # n8n, Prefect, and Dagster automation blueprints
├── README.md                                   # Flagship project presentation & faculty overview
├── LICENSE                                     # MIT Open Source License
├── requirements.txt                            # Unified Python 3.10–3.12 runtime & evaluation dependencies
├── start.bat / start_shasthosetu.ps1           # 1-Click Windows full-stack launchers (0.0.0.0:8000 + :5173)
└── .mcp.json / .env.example / .gitignore       # Portable MCP config, env template & clean ignore rules
```
