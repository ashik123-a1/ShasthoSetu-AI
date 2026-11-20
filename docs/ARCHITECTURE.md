# ShasthoSetu AI — System Architecture Guide (`Colorful Mermaid Topology`)

This document details the six architectural layers connecting the **React 19 + Three.js frontend**, **FastAPI 15-router API gateway**, **Hybrid RAG & LangGraph orchestration**, **MCP hub**, **6 clinical ML/DL prototypes**, and **55-table SQLite WAL persistence engine**.

---

## 1. End-to-End 6-Layer System Topology

```mermaid
flowchart TB
    classDef uiLayer fill:#0c4a6e,stroke:#38bdf8,stroke-width:2px,color:#f8fafc;
    classDef apiLayer fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#f8fafc;
    classDef secLayer fill:#7f1d1d,stroke:#f87171,stroke-width:2px,color:#f8fafc;
    classDef aiLayer fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#f8fafc;
    classDef mlLayer fill:#701a75,stroke:#f472b6,stroke-width:2px,color:#f8fafc;
    classDef dbLayer fill:#451a03,stroke:#fbbf24,stroke-width:2px,color:#f8fafc;

    subgraph L1["1. PRESENTATION & 3D WEB CLIENT (apps/web · :5173)"]
        UI["<b>React 19 + Tailwind + i18n</b><br/>Public · Patient · Doctor · Support · Admin"]:::uiLayer
        THREE["<b>Three.js WebGL &amp; Leaflet Atlas</b><br/>Care Lattice · Body Scanner · 8-Div BD Map"]:::uiLayer
    end

    subgraph L2["2. FASTAPI ASGI GATEWAY (services/api · :8000)"]
        ROUTERS["<b>15 Domain Routers · 139 Endpoints</b><br/>REST · WebRTC Signaling · Multipart OCR"]:::apiLayer
    end

    subgraph L3["3. SECURITY & CLINICAL SAFETY GUARDRAILS"]
        SEC["<b>Argon2id + ss_session + RBAC</b><br/>HTTP 403 Zero-PHI · HTTP 422 OCR Lock · 999 Guard"]:::secLayer
    end

    subgraph L4["4. HYBRID RAG, LANGGRAPH &amp; MCP HUB"]
        RAG["<b>Hybrid RRF (BM25Okapi + BGE-M3 Dense)</b><br/>Recall@1 95% · Recall@3 100% · MRR 0.975"]:::aiLayer
        MCP["<b>3 Custom MCP Servers + LangGraph</b><br/>guideline · directory · care_record"]:::aiLayer
    end

    subgraph L5["5. AUDITED CLINICAL ML &amp; SPEECH ENGINES"]
        ML["<b>XGBoost PCOS · ResNet-18 Ultrasound &amp; Rash</b><br/>EasyOCR ['bn','en'] · Whisper-Small-BN + Base"]:::mlLayer
    end

    subgraph L6["6. LOCAL-FIRST PERSISTENCE &amp; EDGE LLM"]
        DB[("<b>SQLite 55 Tables (WAL Mode)</b><br/>PRAGMA foreign_keys=ON · BEGIN IMMEDIATE")]:::dbLayer
        OLL["<b>Ollama Local Runtime (:11434)</b><br/>Qwen 2.5 7B + bge-m3"]:::dbLayer
    end

    L1 -->|"HTTPS / Cookies / Vite /v1 Proxy"| L2
    L2 --> L3
    L3 --> L4 & L5
    L4 -.-> OLL
    L4 & L5 --> DB
```

---

## 2. Database Engine & Concurrency (`services/api/src/shasthosetu_api/db/`)

- **Schema Scope:** **55 SQLite tables** (`54` defined in [`schema.sql`](../services/api/src/shasthosetu_api/db/schema.sql) + `webhook_replay_nonces` created in [`agents_and_automation.py`](../services/api/src/shasthosetu_api/routers/agents_and_automation.py)). Full catalog documented in [`DATABASE.md`](DATABASE.md).
- **Write-Ahead Logging (`sqlite.py`):** Every connection executes `PRAGMA journal_mode = WAL`, `PRAGMA synchronous = NORMAL`, `PRAGMA foreign_keys = ON`, and `PRAGMA busy_timeout = 5000`.
- **Atomic Slot Locks:** Appointment bookings wrap inside explicit `BEGIN IMMEDIATE` transactions (`begin_immediate`) preventing concurrent slot collisions (`HTTP 409 Conflict`).

---

## 3. Bilingual Hybrid RAG & Safety Triage Flow

```mermaid
flowchart LR
    classDef inp fill:#0c4a6e,stroke:#38bdf8,stroke-width:2px,color:#fff;
    classDef guard fill:#451a03,stroke:#fbbf24,stroke-width:2px,color:#fff;
    classDef danger fill:#7f1d1d,stroke:#f87171,stroke-width:2px,color:#fff;
    classDef ret fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#fff;
    classDef synth fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#fff;

    U["User Voice / Text<br/>BN · EN · Banglish"]:::inp --> PHI["Heuristic PHI Redactor<br/>&amp; Script Detector"]:::guard
    PHI --> CHK{"Code 999 Crisis or<br/>Prompt Injection?"}:::guard
    CHK -->|"Red-Flag Symptoms"| EM["Immediate 999 Emergency Escalation"]:::danger
    CHK -->|"Injection / Prescribe"| REF["Fail-Closed Policy Refusal (0.1 ms)"]:::danger
    CHK -->|"Safe Clinical Query"| BM["BM25Okapi Lexical<br/>(2.62 ms avg)"]:::ret
    CHK -->|"Safe Clinical Query"| DENSE["BGE-M3 FAISS Vector<br/>(1024-d Dense)"]:::ret
    BM & DENSE --> RRF["Reciprocal Rank Fusion (RRF)<br/>Recall@1: 95% · MRR: 0.975"]:::ret
    RRF --> LLM["Qwen 2.5 7B Grounded Synthesis<br/>+ DGHS / WHO Citations"]:::synth
```

---

## 4. Safe-OCR `HTTP 422` Verification & Telemedicine Flow

```mermaid
sequenceDiagram
    autonumber
    actor P as Patient / User
    participant API as FastAPI Safe-OCR Service
    participant DB as SQLite Medication Plans
    participant MD as Approved Clinician

    P->>API: POST /v1/ai/ocr/extract (PDF / JPG / PNG)
    API->>API: EasyOCR (['bn','en']) + Line Clustering + Confidence Audit
    API-->>P: RAW_OCR Tokens + Uncertain Span Warnings

    rect rgb(75, 18, 28)
        Note over P,API: Safety Interlock — Unverified Dosages Blocked
        P->>API: Attempt Automated Reminder Activation (Unconfirmed)
        API-->>P: HTTP 422 Unprocessable Entity (Blocked Until Confirmation)
    end

    rect rgb(12, 58, 45)
        Note over P,MD: Human Verification Unlocked
        P->>API: Explicit Draft Confirmation (or Route to MD)
        MD->>API: Clinician Verification Sign-off
        API->>DB: Save Authorized Plan + Audit Trail
        API-->>P: 201 Created — Verified Medication Routine Active
    end
```

---

## 5. Frontend 3D Twins, Gyroscopic Orb & White/Dark Themes (`apps/web/src/`)

- **Three.js / React Three Fiber Scenes:** `HeroCareLattice.tsx`, `AiModuleScene3D.tsx`, and `HolographicBodyScanner3D.tsx` render interactive clinical geometries with motion-pause fallback (`prefers-reduced-motion` / manual toggle).
- **Gyroscopic `MedicalAiChatbotOrb.tsx`:** Uses a 60 FPS `requestAnimationFrame` SVG loop rotating counter-spinning rings cleanly around `(50, 50)`, with cursor-tracking pupils, natural blink intervals, reactive audio bars, and an expandable radial menu (`ShasthoSetuRadialMenu.tsx`) linking to the 5-member `TeamRosterModal` and GitHub.
- **Bilingual & Theme System (`tokens.css` & `preferences.tsx`):** Persists `en`/`bn` locale and **Obsidian Dark** vs **Clinical Daylight White Mode** across public and portal headers.
