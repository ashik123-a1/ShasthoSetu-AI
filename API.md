# ShasthoSetu AI — REST & MCP API Reference

Base URL: `http://127.0.0.1:8000` (or `https://unix-synthesis-franklin-across.trycloudflare.com`)

---

## 1. Clinical AI Endpoints

### `POST /v1/ai/chat`
Bilingual RAG triage endpoint with source grounding and Zero-PHI scrubbing.
- **Request**:
  ```json
  {
    "message": "আমার ৩ দিন ধরে ১০৩ ডিগ্রি জ্বর আর তীব্র চোখের পেছনে ব্যথা, কি করব?",
    "session_id": "sess_102",
    "language": "bn"
  }
  ```
- **Response**:
  ```json
  {
    "reply": "আপনার লক্ষণগুলি ডেঙ্গু জ্বরের সতর্কতামূলক লক্ষণের সাথে মিলে যায়...",
    "triage_level": "URGENT",
    "is_emergency": false,
    "sources": [
      {
        "title": "National Dengue Clinical Guideline (DGHS 2024)",
        "score": 0.9412
      }
    ]
  }
  ```

### `POST /v1/ai/voice-triage`
Processes bilingual audio recordings using `whisper-v3-turbo` and streams response back with local TTS synthesis.

---

## 2. Model Context Protocol (MCP) Hub

### `GET /v1/mcp/catalog`
Returns available MCP servers, tools, and transport modes (`stdio`, `sse`, `streamable-http`).

### `POST /v1/mcp/invoke`
Direct tool invocation across `guideline_mcp`, `directory_mcp`, and `care_record_mcp`.

---

## 3. Emergency & Coordination Endpoints

### `GET /v1/blood/donors`
Queries donor network by blood group (`A+`, `O-`, etc.), administrative division, and geo-radius.

### `POST /v1/ocr/prescription`
Multi-engine OCR parsing of doctor prescriptions with `HTTP 422` refusal on illegible handwriting.
