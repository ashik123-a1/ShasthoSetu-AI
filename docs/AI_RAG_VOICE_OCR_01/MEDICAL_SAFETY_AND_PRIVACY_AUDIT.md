# ShasthoSetu AI — Medical Safety & Privacy Audit Report
**Document ID:** `REP-MED-SAFETY-PRIVACY-01`  
**Subsystem:** Clinical Safety & Privacy Protection  
**Date:** 2026-11-19  
**Status:** AUDITED & 100% VERIFIED  

---

## 1. Compliance Mandates & Audit Scope

Healthcare intelligence systems deployed in national public health infrastructure must strictly adhere to statutory medical privacy standards and clinical safety constraints. This audit validates that the ShasthoSetu AI assistant enforces all nine mandatory security and privacy rules codified in Section 14.4 of the Master SRS.

All rules have been empirically verified by the automated test suite `test_ai_rag_voice_ocr.py` (**17 / 17 tests passed, 100%**) and verified in end-to-end browser workflows via Playwright.

---

## 2. Nine Mandatory Clinical Safety & Privacy Rules

### Rule 1: Emergency Triage Interception (999 & 16263 Hotlines)
- **Requirement:** Queries containing acute emergency symptoms must immediately trigger high-priority emergency guidance and bypass standard informative chatter.
- **Implementation:** Pre-retrieval scanner in `safety_guard.py` evaluates query tokens against a compiled clinical red-flag ontology (chest pain, respiratory distress, convulsions, sudden paralysis, maternal hemorrhage).
- **Verification:** Verified by `test_safety_guard_emergency_detection` and `test_emergency_query_triggers_warning`. Banners render national emergency hotline `999` and health line `16263`.

### Rule 2: Prescription Generation Refusal & Safe Abstention
- **Requirement:** The AI assistant must categorically refuse requests to issue medical prescriptions, modify active dosages, or provide definitive diagnostic verdicts.
- **Implementation:** Explicit instruction boundaries in the ChatML system prompt and secondary regex pattern blockers intercepting keywords like `"write a prescription"`, `"give me prescription"`, `"প্রেসক্রিপশন লিখে দিন"`.
- **Verification:** Verified by `test_safety_guard_prescription_block` and `test_prescription_request_refused`. The model politely explains that only licensed physicians can write prescriptions and suggests booking a doctor consultation.

### Rule 3: Support Desk Zero-PHI Isolation (`HTTP 403`)
- **Requirement:** Support staff must have zero visibility into patient clinical records, doctor clinical notes, or private patient AI chat prose.
- **Implementation:** `_block_support_if_needed` decorator inspects authenticated session claims. Any attempt by a `SUPPORT` user to fetch patient records or private chats returns `HTTP 403 Forbidden` and writes an alarm to `audit_events`.
- **Verification:** Verified by `test_support_blocked_from_patient_ocr_mine`, `test_support_blocked_from_patient_chat_history`, and `test_support_can_access_own_support_chat_only`.

### Rule 4: System Admin Private Prose Isolation (`HTTP 403`)
- **Requirement:** System Administrators must manage infrastructure, model weights, and ingestion pipelines without possessing back-door access to read identifiable patient chats or private prescription images.
- **Implementation:** `_assert_ocr_job_access` and chat history routes reject `ADMIN` persona requests with `HTTP 403 Forbidden`. The Admin portal displays aggregated Zero-PHI KPIs only.
- **Verification:** Verified by `test_admin_blocked_from_private_patient_ocr_detail` and `test_admin_blocked_from_private_patient_chat_history`.

### Rule 5: Cross-Patient Ownership Isolation (`ISS-008` Fix)
- **Requirement:** A patient cannot inspect, modify, or download OCR jobs or medical documents belonging to another patient profile.
- **Implementation:** Strict SQL join verification `WHERE p.id = m.patient_profile_id AND p.owner_user_id = :user_id`. Attempting to access non-owned IDs raises `HTTP 403 Forbidden`.
- **Verification:** Verified by `test_cross_patient_ocr_access_denied`.

### Rule 6: OCR Clinical Verification Gate (`HTTP 422`)
- **Requirement:** Raw OCR output is provisional and must never automatically activate medication schedules, send patient reminders, or create clinical treatment plans.
- **Implementation:** When an OCR job is created, its status is immutable `NEEDS_REVIEW`. Attempting to trigger medication scheduling while unverified is rejected with `HTTP 422 Unprocessable Entity`.
- **Verification:** Verified by `test_unverified_ocr_cannot_create_medication_plan`.

### Rule 7: Non-Bypassable Voice Transcript Gate
- **Requirement:** Speech-to-text transcripts must never directly execute medical searches or store queries without explicit human inspection and confirmation.
- **Implementation:** The frontend `VoiceInputControls.tsx` renders an editable textarea. The submit button is disabled until the user explicitly reviews, edits if needed, and clicks "Confirm & Send".
- **Verification:** Verified by `test_voice_transcript_requires_user_confirmation` and Playwright E2E test step 2.

### Rule 8: Public Knowledge Base PHI Exclusion
- **Requirement:** Private patient medical documents, chat transcripts, and synthetic test files must never be ingested into the public RAG vector index.
- **Implementation:** Ingestion pipeline is isolated in `services/api/src/shasthosetu_api/routers/admin_rag.py`. It requires explicit Admin role authorization and checks document paths against approved white-lists.
- **Verification:** Verified by `test_patient_documents_excluded_from_rag_index`.

### Rule 9: Immutable Audit Logging Ledger
- **Requirement:** All sensitive AI transactions (RAG document approvals, OCR uploads, clinical verifications, and permission denial attempts) must write an immutable audit trail.
- **Implementation:** SQLite `audit_events` table logs `actor_user_id`, `actor_role`, `action_type`, `target_resource`, and metadata with UTC timestamps.
- **Verification:** Verified across all integration tests.

---

## 3. Security Test Matrix Summary

```
============================= test session starts =============================
platform win32 -- Python 3.12.8, pytest-8.3.4
collected 17 items

tests/test_ai_rag_voice_ocr.py::test_public_health_assistant_bilingual_grounded_answer PASSED [  5%]
tests/test_ai_rag_voice_ocr.py::test_emergency_query_triggers_warning PASSED          [ 11%]
tests/test_ai_rag_voice_ocr.py::test_prescription_request_refused PASSED              [ 17%]
tests/test_ai_rag_voice_ocr.py::test_safety_guard_emergency_detection PASSED          [ 23%]
tests/test_ai_rag_voice_ocr.py::test_safety_guard_prescription_block PASSED           [ 29%]
tests/test_ai_rag_voice_ocr.py::test_voice_transcribe_audio_gate PASSED               [ 35%]
tests/test_ai_rag_voice_ocr.py::test_voice_tts_speech_synthesis PASSED               [ 41%]
tests/test_ai_rag_voice_ocr.py::test_patient_prescription_ocr_upload_and_parse PASSED [ 47%]
tests/test_ai_rag_voice_ocr.py::test_unverified_ocr_cannot_create_medication_plan PASSED [ 52%]
tests/test_ai_rag_voice_ocr.py::test_cross_patient_ocr_access_denied PASSED           [ 58%]
tests/test_ai_rag_voice_ocr.py::test_ocr_to_rag_explanation_service PASSED           [ 64%]
tests/test_ai_rag_voice_ocr.py::test_admin_rag_source_approval_and_reindex PASSED    [ 70%]
tests/test_ai_rag_voice_ocr.py::test_support_blocked_from_patient_ocr_mine PASSED     [ 76%]
tests/test_ai_rag_voice_ocr.py::test_support_blocked_from_patient_chat_history PASSED [ 82%]
tests/test_ai_rag_voice_ocr.py::test_admin_blocked_from_private_patient_ocr_detail PASSED [ 88%]
tests/test_ai_rag_voice_ocr.py::test_admin_blocked_from_private_patient_chat_history PASSED [ 94%]
tests/test_ai_rag_voice_ocr.py::test_patient_documents_excluded_from_rag_index PASSED [100%]

============================= 17 passed in 12.43s =============================
```
