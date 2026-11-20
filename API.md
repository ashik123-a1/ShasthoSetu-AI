# ShasthoSetu AI — Complete REST, WebRTC & MCP API Reference

- **Local Development Base URL:** `http://127.0.0.1:8000` (Vite proxies `/v1/*` automatically on `:5173`)
- **Interactive Swagger UI:** `http://127.0.0.1:8000/docs`
- **ReDoc Reference:** `http://127.0.0.1:8000/redoc`
- **API Footprint:** **139 route handlers across 15 domain routers** (`services/api/src/shasthosetu_api/routers/`)

---

## 1. Router Inventory (15 Routers · 139 Endpoints)

| Router Module | URL Prefix | Endpoints | Access / Security Policy |
| :--- | :--- | :---: | :--- |
| `auth.py` | `/v1/auth` | 6 | Cookie sessions (`ss_session` HttpOnly, Argon2id, rate-limited) |
| `public.py` | `/v1/public` | 11 | Unauthenticated public directory, overview, research ledger & PCOS calculator |
| `patient.py` | `/v1/patient` | 22 | Strictly `PATIENT` role (`get_current_user` + owner isolation) |
| `doctor.py` | `/v1/doctor` | 14 | Strictly `DOCTOR` role with **`APPROVED` BMDC verification gate** |
| `consultations.py` | `/v1/consultations` | 7 | Verified Patient / Approved Doctor room participant guard + payment check |
| `blood_connect.py` | `/v1/blood` | 11 | Geo-matching across 8 divisions; phone masking until mutual consent |
| `ai_assistant.py` | `/v1/ai` | 13 | Bilingual Hybrid RAG, live Voice ASR/TTS, prompt-injection & 999 guard |
| `ai_inference.py` | `/v1/ai/inference` | 10 | XGBoost PCOS, Ultrasound ResNet-18, Viral Rash, DermoPed & 3D body scanner |
| `ai_ocr.py` | `/v1/ai/ocr` | 7 | Bilingual EasyOCR + **mandatory `HTTP 422` verification gate** |
| `journal.py` | `/v1/journal` | 2 | Medical news, PubMed abstracts & bilingual clinical feed |
| `support.py` | `/v1/support` | 7 | `SUPPORT` role ticket desk (**`HTTP 403` Zero-PHI** clinical note lockout) |
| `admin.py` | `/v1/admin` | 18 | Strictly `ADMIN` governance, doctor verification & immutable audit logs |
| `admin_rag.py` | `/v1/admin/rag` | 6 | Strictly `ADMIN` RAG source approval & FAISS/BM25 re-indexing |
| `mcp_hub.py` | `/v1/mcp` | 2 | Live MCP server catalog (`GET /catalog`) & direct tool invocation (`POST /invoke`) |
| `agents_and_automation.py` | `/v1/agents` | 3 | Live LangGraph triage execution & n8n/Prefect/Dagster telemetry |

---

## 2. Authentication & Session Contract (`/v1/auth`)

| Method | Path | Purpose |
| :---: | :--- | :--- |
| `POST` | `/v1/auth/login` | Authenticates email or phone via Argon2id and sets `ss_session` HttpOnly cookie |
| `POST` | `/v1/auth/register` | Creates `PATIENT` account (explicitly rejects role-escalation attempts in payload) |
| `POST` | `/v1/auth/doctor-apply` | Submits BMDC doctor registration into `PENDING` onboarding state |
| `POST` | `/v1/auth/logout` | Invalidates active session token in SQLite `sessions` table |
| `GET` | `/v1/auth/me` | Returns authenticated user profile & role context (`{authenticated: false}` if guest) |
| `POST` | `/v1/auth/demo-reset-password` | Resets demo persona password in synthetic evaluation environments |

**Example Request (`POST /v1/auth/login`):**
```json
{
  "identifier": "patient.demo@shasthosetu.local",
  "password": "PatientDemo#2026"
}
```

---

## 3. Clinical Hybrid RAG & Dual Voice AI (`/v1/ai`)

| Method | Path | Purpose |
| :---: | :--- | :--- |
| `POST` | `/v1/ai/chat` | Bilingual Hybrid RAG (BM25 + BGE-M3 RRF) via `qwen2.5:7b` with source citations & 999 guard |
| `POST` | `/v1/ai/voice/transcribe` | Transcribes Bengali/English audio via Whisper and returns editable draft text |
| `POST` | `/v1/ai/voice/chat` | Conversational voice turn (accepts audio or confirmed transcript, returns reply + TTS payload) |

**Example Response (`POST /v1/ai/chat`):**
```json
{
  "reply": "আপনার লক্ষণগুলি ডেঙ্গু জ্বরের সতর্কতামূলক লক্ষণের সাথে মিলে যায়। অনুগ্রহ করে পর্যাপ্ত তরল পান করুন এবং নিকটস্থ হাসপাতালে এনএস১ (NS1) পরীক্ষা করান।",
  "triage_level": "URGENT",
  "is_emergency": false,
  "citations": [
    {
      "slug": "national-dengue-clinical-guideline",
      "title": "National Dengue Clinical Management Guideline (DGHS)",
      "score": 0.9412
    }
  ]
}
```

---

## 4. Safe Prescription OCR & `HTTP 422` Lockout (`/v1/ai/ocr`)

- **Upload & Extract:** `POST /v1/ai/ocr/extract` (accepts `PDF`, `JPG`, `PNG`; runs `EasyOCR ['bn','en']` and marks uncertain tokens).
- **Mandatory Verification Gate:** Attempting to activate automated medication reminders directly from an unverified OCR artifact (`authorization_state == 'RAW_OCR'`) fails closed with **`HTTP 422 Unprocessable Entity`**.
- **Authorized State Transition:** `RAW_OCR` -> Patient Confirmation (`PATIENT_ACKNOWLEDGED_REMINDER`) or Clinician Approval (`CLINICIAN_VERIFIED`).

---

## 5. Diagnostic Inference, Blood Connect & WebRTC Rooms

- **AI Inference (`/v1/ai/inference/*`):**
  - PCOS clinical biomarker risk calculator (`XGBoost`, $N=88$ held-out cohort).
  - Ovarian ultrasound morphology analyzer (enforces grayscale B-mode domain check — rejects non-ultrasound images).
  - Viral Rash & DermoPed pediatric skin lesion classifier (enforces chrominance skin-tone domain guardrail against unrelated photos).
- **Blood Connect (`/v1/blood/*`):**
  - Lists & creates blood requests filtered across Bangladesh's 8 divisions and donor radius matching (`5 / 10 / 20 km`), returning masked donor phone numbers until reciprocal consent.
- **2-Device Teleconsultation Rooms (`/v1/consultations/*`):**
  - Rejects call-room entry until appointment payment status is settled (`no call before payment`).
  - Exposes room state, SDP/ICE WebRTC signaling, intake preparation forms, and doctor SOAP notes / e-Rx endpoints.

---

## 6. Model Context Protocol (MCP) Hub (`/v1/mcp`)

| Method | Path | Purpose |
| :---: | :--- | :--- |
| `GET` | `/v1/mcp/catalog` | Lists all 3 custom MCP servers (`guideline-mcp`, `directory-mcp`, `care-record-mcp`) & configured public MCPs |
| `POST` | `/v1/mcp/invoke` | Dispatches typed JSON-RPC tool calls subject to RBAC (`ERR_ZERO_PHI_FORBIDDEN` for `SUPPORT`) |

---

## 7. Security Error Contract Summary

| HTTP Code | Meaning in ShasthoSetu AI | Typical Trigger |
| :---: | :--- | :--- |
| `401 Unauthorized` | Session missing or expired | Unauthenticated access to `/v1/patient/*`, `/v1/doctor/*`, `/v1/admin/*` |
| `403 Forbidden` | RBAC / Zero-PHI boundary enforcement | `SUPPORT` attempting to read clinical notes; Pending doctor accessing live workspace; cross-doctor IDOR |
| `409 Conflict` | Atomic slot lock collision | Double-booking the same appointment slot under SQLite `BEGIN IMMEDIATE` |
| `422 Unprocessable Entity` | Mandatory Safe-OCR Verification Gate or domain guardrail rejection | Activating unconfirmed handwritten prescription reminders; uploading non-ultrasound/car/selfie to clinical imaging endpoints |
| `429 Too Many Requests` | Brute-force protection | Exceeding login/registration/reset rate limits |
