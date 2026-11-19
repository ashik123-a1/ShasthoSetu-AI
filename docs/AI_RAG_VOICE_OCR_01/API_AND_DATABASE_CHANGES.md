# ShasthoSetu AI — API & Database Schema Evolution Report
**Document ID:** `REP-API-DB-01`  
**Subsystem:** SQLite Schema, Alembic Migrations & REST Endpoints  
**Date:** 2026-11-19  
**Status:** MIGRATED & VERIFIED  

---

## 1. Database Schema Evolution & Migration `002`

The database layer runs on SQLite with Write-Ahead Logging (`WAL`) mode enabled and strict foreign key enforcement (`PRAGMA foreign_keys = ON;`).

Migration `002_ai_rag_voice_ocr.py` expanded the schema from 42 to **54 tables**, introducing 12 specialized tables for AI conversational history, vector chunk provenance, speech telemetry, OCR parsing, and audit trails.

### 1.1 The 12 New Tables

| Table Name | Primary Key | Foreign Keys & Indices | Purpose |
| :--- | :--- | :--- | :--- |
| `ai_chat_sessions` | `id (TEXT)` | `user_id -> users(id)` | Persistent conversation sessions across guest and authenticated users |
| `ai_chat_messages` | `id (TEXT)` | `session_id -> ai_chat_sessions(id)` | Individual message bubbles, prompt tokens, grounded citations, and safety metadata |
| `rag_sources` | `id (TEXT)` | `INDEX(status, category)` | Curated knowledge base source documents with SHA-256 hashes and admin approval status |
| `rag_chunks` | `id (TEXT)` | `source_id -> rag_sources(id)` | Semantic chunk nodes with character spans, token counts, and section breadcrumbs |
| `rag_retrieval_logs`| `id (TEXT)` | `session_id`, `INDEX(created_at_utc)` | Zero-PHI query retrieval latencies, dense vs sparse scores, and MRR metrics |
| `voice_transcription_logs` | `id (TEXT)` | `user_id -> users(id)` | Speech-to-text telemetry (WER/CER metrics, duration, model version, confirmation status) |
| `voice_synthesis_logs` | `id (TEXT)` | `user_id -> users(id)` | Spoken response telemetry (SAPI5/MMS-TTS engine label, synthesized character count, elapsed ms) |
| `ocr_jobs` | `id (TEXT)` | `document_id -> medical_documents(id)` | Prescription OCR job state, verification status (`NEEDS_REVIEW`, `VERIFIED`), and confidence |
| `ocr_fields` | `id (TEXT)` | `ocr_job_id -> ocr_jobs(id)` | The 6 extracted clinical fields per drug row with raw text, verified values, and flags |
| `ocr_job_artifacts` | `id (TEXT)` | `ocr_job_id -> ocr_jobs(id)` | Stored image paths, bounding box JSON geometries, and preview image arrays |
| `prescription_explanations` | `id (TEXT)` | `ocr_job_id -> ocr_jobs(id)` | Grounded 4-block clinical educational explanations generated from parsed prescriptions |
| `ai_safety_events` | `id (TEXT)` | `INDEX(event_type, severity)` | Intercepted medical red-flags, emergency 999 triggers, and prescribing block events |

---

## 2. Comprehensive REST Endpoint Catalog

### 2.1 Bilingual RAG Health Assistant Endpoints (`/v1/ai/assistant/*`, `/v1/ai/chat/*`)

| Method | Path | Auth / Role | Description |
| :---: | :--- | :---: | :--- |
| `POST` | `/v1/ai/assistant/chat` | Public / Any | Submit query (Bangla, English, Banglish) -> Returns grounded answer with citation pills and disclaimer |
| `GET` | `/v1/ai/assistant/health-models` | Public / Any | Returns active model status (`qwen2.5:7b`, `bge-m3:latest`, VRAM allocation, index status) |
| `GET` | `/v1/ai/chat/sessions` | Authenticated | Retrieve user conversation sessions ordered by most recent activity |
| `GET` | `/v1/ai/chat/sessions/{id}/messages` | Authenticated | Fetch full message thread for a session (with ownership check) |
| `DELETE` | `/v1/ai/chat/sessions/{id}` | Authenticated | Soft-delete or purge a conversation thread |
| `POST` | `/v1/ai/assistant/voice-to-text` | Public / Any | Upload audio (16kHz PCM WAV) -> Transcribes via Whisper; returns candidate text for confirmation |
| `POST` | `/v1/ai/assistant/text-to-speech` | Public / Any | Generate spoken audio stream (SAPI5 for English, MMS-TTS for Bengali) |

### 2.2 Bilingual Prescription OCR Studio Endpoints (`/v1/ai/ocr/*`)

| Method | Path | Auth / Role | Description |
| :---: | :--- | :---: | :--- |
| `POST` | `/v1/ai/ocr/upload` | `PATIENT`, `DOCTOR` | Upload prescription image/PDF -> Runs EasyOCR, clusters lines, extracts 6 fields -> Status `NEEDS_REVIEW` |
| `GET` | `/v1/ai/ocr/mine` | `PATIENT`, `DOCTOR` | List recent prescription OCR jobs belonging to user or consented patients (Admin/Support get `403`) |
| `GET` | `/v1/ai/ocr/{job_id}` | `PATIENT`, `DOCTOR` | Fetch detailed OCR job, bounding boxes, and field values (Strict cross-patient ownership check) |
| `GET` | `/v1/ai/ocr/{job_id}/preview` | `PATIENT`, `DOCTOR` | Stream normalized preview image bytes with `Cache-Control: no-store` |
| `POST` | `/v1/ai/ocr/{job_id}/verify` | `PATIENT`, `DOCTOR` | Save draft or mark fields as `VERIFIED`. (Unverified jobs cannot schedule medication plans: `422`) |
| `POST` | `/v1/ai/ocr/{job_id}/explain` | `PATIENT`, `DOCTOR` | OCR-to-RAG integration: Generates structured 4-block clinical educational explanation |

### 2.3 Administrative RAG Governance Endpoints (`/v1/ai/admin/rag/*`)

| Method | Path | Auth / Role | Description |
| :---: | :--- | :---: | :--- |
| `GET` | `/v1/ai/admin/rag/sources` | `ADMIN` only | List all curated medical sources, approval states, and chunk counts |
| `POST` | `/v1/ai/admin/rag/upload` | `ADMIN` only | Upload new medical guideline document -> Parses, chunks, hashes -> Status `PENDING_REVIEW` |
| `POST` | `/v1/ai/admin/rag/sources/{id}/approve` | `ADMIN` only | Approve source document for inclusion in active vector retrieval index |
| `POST` | `/v1/ai/admin/rag/sources/{id}/deprecate` | `ADMIN` only | Deprecate source document and remove its chunks from the active index |
| `POST` | `/v1/ai/admin/rag/reindex` | `ADMIN` only | Re-embed all approved sources using BGE-M3 and rebuild Faiss + BM25 indexes |
| `GET` | `/v1/ai/admin/rag/kpis` | `ADMIN` only | Returns aggregated Zero-PHI operational telemetry, VRAM metrics, and query volume |

---

## 3. Security Fix Verification (`ISS-008`)

- **Vulnerability:** Unchecked patient ID in prescription upload allowed a malicious user to link uploaded documents to another user's patient profile.
- **Resolution:** Added strict profile ownership validation in `routers/patient.py` and `routers/ai_ocr.py`:
  ```python
  owned = conn.execute(
      "SELECT id FROM patient_profiles WHERE id = ? AND owner_user_id = ?",
      (patient_profile_id, user["id"]),
  ).fetchone()
  if not owned:
      raise HTTPException(status_code=403, detail="Patient profile does not belong to you.")
  ```
- **Verification:** Verified by automated test `test_cross_patient_ocr_access_denied` passing with `HTTP 403`.
