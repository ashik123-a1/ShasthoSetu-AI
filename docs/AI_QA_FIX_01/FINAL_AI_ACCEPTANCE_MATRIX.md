# ShasthoSetu AI — Final AI Acceptance Matrix (`AI-QA-FIX-01`)

**Audit Date:** 2026-11-19  
**Audit Verdict:** **`AI_QA_PASS_WITH_LIMITATIONS`**  
*(Previous `AI_QA_NEEDS_CORRECTIONS` findings resolved for metrics, provenance, and authorization code; clinical/production readiness remains limited and uncertified as documented below.)*

---

## Subsystem Acceptance Matrix

| Subsystem | Implementation Status | Reconciled Verification Evidence | Known Limitations / Unproven Claims |
| :--- | :--- | :--- | :--- |
| **Bilingual RAG Chatbot (`AI-01`)** | Implemented & Agent-Tested (Frontend + FastAPI + Ollama `qwen2.5:7b` + `bge-m3` + BM25 RRF) | 14 sources / 35 chunks SHA-256 verified (`all_hashes_and_counts_match=true`); Hybrid MRR **0.9750** (`19.5/20`), Recall@1 **95.00%**, Recall@3 **100.00%** on `N=20` medical queries; `EM-01`/`EM-02` `EMERGENCY_ESCALATION` & `INJ-01`/`INJ-02` `SAFETY_REFUSAL` verified. | 11 medical docs are **first-party synthesized summaries** (non-verbatim); end-to-end Bengali/Banglish answer faithfulness not exhaustively audited by clinicians; "0% hallucinations" retracted. |
| **Bengali & English Voice (`AI-02`)** | Implemented & Agent-Tested (`whisper-small-bn` + `whisper-base` + SAPI5 + `mms-tts-ben` + Editable Transcript Gate) | Full 18-clip audio hashes & predictions reconciled: Human BN FLEURS Sample-Avg Raw WER **45.56%** (2 unique sentences); EN Clinical Raw WER **8.39%** (synthetic); Mixed Raw WER **48.24%** (synthetic). Gate `is_confirmed=1` & `voice_ai_enabled` / TTS fallbacks pass in pytest. | Small evaluation sample (`N=6` per cohort); real accented Banglish medical speech in noisy clinics is untested without microphone field trials. |
| **Bilingual Prescription OCR (`FEAT-09`)** | Implemented & Agent-Tested (EasyOCR `bn+en` + line clustering + 6-field extractor + 5-stage authorization) | Post-fix synthetic printed (`N=4`, 7 medicines): CER **12.94%**, WER **49.31%**, **TP=7, FP=2, FN=0**, Precision **77.78%**, Recall **100.00%**, F1 **87.50%** (`128.6%`/`150%` bug removed). `RAW_OCR -> DOCTOR_VERIFIED -> ACTIVE` transitions enforced by `403`/`422` tests. | **Real handwritten prescription OCR accuracy is NOT validated** (`0052.jpg` is an unannotated smoke test with `28/44` tokens `<0.75` conf). Synthetic printed results do not generalize to cursive doctor handwriting. |
| **Security, Zero-PHI & RBAC** | Implemented & Automated-Tested (`34/34` Pytest PASS) | Rate limits (`429`), cross-patient chat/OCR IDOR (`403`), Support/Admin chat/OCR blocks (`403`), zero PHI/filename leaks in `audit_logs`, zero patient chunks in `chunk_map.json`, and 7/7 `verify_final_lock.py` PASS. | UI edits (`CitationDrawer.tsx`, `PrescriptionOcrStudio.tsx`) passed `tsc --noEmit` (`0` errors) after `AI-QA-FIX-01`, while full Playwright E2E screenshots reflect the pre-fix state per "do not re-run Playwright" directive. |
| **Production / Clinical Readiness** | **PARTIAL — NOT CLINICALLY CERTIFIED** | Functional software prototype verified locally on RTX 5060 Ti (`54` SQLite tables, WAL + FK active). | Not clinically validated, not multi-clinician safety-trialed, and depends on local host daemon availability (`Ollama` + `FastAPI`). |
