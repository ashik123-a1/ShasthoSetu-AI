# ShasthoSetu AI — Final Implementation & Acceptance Report
**Document ID:** `REP-FINAL-ACCEPT-AI-01`  
**Task Codes:** `AI-RAG-VOICE-OCR-01` + Reconciled under `AI-QA-FIX-01`  
**System:** ShasthoSetu Healthcare Web Application (`FULLSTACK-01`)  
**Date:** 2026-11-19  
**Audit Verdict:** **`AI_QA_PASS_WITH_LIMITATIONS`** *(Software prototype agent-tested; NOT clinically or production certified)*

> **QA Reconciliation Notice (`AI-QA-FIX-01`):** A prior version of this report contained `"production-grade"`, `"certified for deployment"`, `"0% hallucinations"`, and `"128.6%"` OCR recall claims that were retracted and reconciled under [`docs/AI_QA_FIX_01/AI_QA_FIX_SIGNOFF.md`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/AI_QA_FIX_01/AI_QA_FIX_SIGNOFF.md).

---

## 1. Executive Summary & Reconciled Deliverables

The bilingual RAG assistant, speech interface, and Prescription OCR subsystem are integrated into the ShasthoSetu React + FastAPI + SQLite (`54` tables, `WAL`, foreign keys enabled) prototype:

1. **Multilingual Medical Information RAG (`AI-01`):** Hybrid `bge-m3` (`1024-d` FAISS `IndexFlatIP`) + `BM25Okapi` (`RRF k=60`) over `14` verified sources (`35` chunks, `all_hashes_and_counts_match = True`), explicit provenance classification (`11` `FIRST_PARTY_SYNTHESIZED_SUMMARY` medical guides + `3` `FIRST_PARTY_PLATFORM_DOC` internal references), Ollama `qwen2.5:7b` grounded synthesis, clickable citation drawer, `999` emergency escalation, and injection refusal.
2. **Bilingual Speech ASR & Offline TTS (`AI-02`):** Dual ASR routing (`anuragshas/whisper-small-bn` + `openai/whisper-base`), Windows SAPI5 / Meta `mms-tts-ben` graceful TTS fallback, and non-bypassable editable transcript confirmation (`is_confirmed = 1`).
3. **Bilingual Prescription OCR & 5-Stage Authorization (`FEAT-09`):** EasyOCR (`bn` + `en`), spatial line clustering, 6-field extractor, and enforced 5-stage clinical authorization (`RAW_OCR` -> `PATIENT_CORRECTED` -> `PATIENT_ACKNOWLEDGED` -> `DOCTOR_VERIFIED` -> `AUTHORIZED_MEDICATION_PLAN`) with `422` raw activation block and `403` blocking non-doctors, pending doctors, and unconsented doctors from clinician sign-off or `ACTIVE` plan creation.
4. **Role & Privacy Controls:** Automated tests verify rate limits (`429`), patient chat/OCR IDOR isolation (`403`), Support/Admin clinical access blocks (`403`), filename SHA-256 hashing in `audit_logs`, zero patient docs in RAG vector/BM25 indexes, and `7/7` frozen research lock suites (`verify_final_lock.py`).

---

## 2. Reconciled Quantitative Summary (Verified JSON Outputs)

### 2.1 Hybrid RAG Retrieval (`N = 20` Medical Queries + `N = 9` Generation Probes)
- **Hybrid RRF MRR:** **0.9750** (`19.5 / 20`, Recall@1 **95.00%**, Recall@3 **100.00%**, Recall@5 **100.00%**, avg latency **141.88 ms**)
- **Dense Only (`bge-m3`):** MRR **0.9500** (`19.0 / 20`), Recall@1 **90.00%**
- **BM25 Only (`BM25Okapi`):** MRR **0.854167** (`17.083333 / 20`), Recall@1 **80.00%**, Recall@5 **95.00%**
- **Generation & Guard Probes (`N = 9`):** `BN-01, EN-01, BG-01, MX-01` -> `GROUNDED`; `EM-01, EM-02` -> `EMERGENCY_ESCALATION`; `UN-01` -> `ABSTAINED`; `INJ-01, INJ-02` -> `SAFETY_REFUSAL`.
- **Retracted Claim:** Any `"0% hallucination"` statement is invalid and omitted; answer faithfulness across open-ended patient queries has not been exhaustively scored by clinicians.

### 2.2 Voice Recognition (`N = 18` Audio Clips Across 3 Cohorts)
- **Human Bengali FLEURS (`Smoke_Test_6`, 2 unique sentences):** Sample-Avg Raw WER **45.56%** (Norm **33.89%**), Corpus Raw WER **45.33%** (Norm **33.33%**), Sample-Avg CER **11.41%**, BN Unicode **97.68%**. *(Full frozen 26-clip FLEURS audit: **45.80%** Sample-Avg Raw WER / **45.62%** Corpus Raw WER).*
- **Synthetic English Clinical (`N = 6`, SAPI5):** Sample-Avg Raw WER **8.39%** (Corpus **8.33%**), CER **3.00%**.
- **Synthetic Mixed Code-Switching (`N = 6`, SAPI5):** Sample-Avg Raw WER **48.24%** (Corpus **48.65%**), CER **18.38%**.

### 2.3 Prescription OCR & Field Extraction (`N = 4` Synthetic Printed + `0052.jpg` Smoke)
- **Post-Fix Entity Matching (`N = 4` Synthetic Printed, `7` expected medicines):** Mean CER **12.94%**, Mean WER **49.31%**, **TP = 7, FP = 2, FN = 0**, **Precision = 77.78%**, **Recall = 100.00%**, **F1 = 87.50%** *(vs. Pre-Fix TP=5, FP=4, FN=2, F1=62.50%; prior `128.6%` bug eliminated)*.
- **Real Handwritten Clinical Prescriptions (`0052.jpg`):** Unannotated read-only smoke test (`mean_confidence = 59.29%`, `44` tokens with `28 < 0.75`). **Real handwritten prescription OCR accuracy is `NOT VALIDATED`.**

---

## 3. Verification Execution Manifest (Current vs. Historical)

| Check | Timing Relative to `AI-QA-FIX-01` | Observed Result |
| :--- | :--- | :--- |
| `pytest -v test_fullstack_api.py test_ai_rag_voice_ocr.py` | **Current (Post-`AI-QA-FIX-01`)** | **`34 / 34 passed` in `42.76s`** (`qa_fix_01_pytest_output.txt`) |
| `apps/web: npm run typecheck` (`tsc --noEmit`) | **Current (Post-`AI-QA-FIX-01`)** | **0 errors** (exit code `0`) |
| `eval_rag.py` / `eval_ocr.py` / `reconcile_qa_fix_01.py` | **Current (Post-`AI-QA-FIX-01`)** | **PASS** (all primary JSONs/CSVs reconciled) |
| `verify_final_lock.py` | **Current (Post-`AI-QA-FIX-01`)** | **7 / 7 suites PASS** (frozen research assets untouched) |
| Frontend Vitest (`12 / 12`) & Vite Build (`3.38s`) | **Historical (Pre-`AI-QA-FIX-01`)** | Passed prior to final label edits; not re-run in QA pass |
| Consolidated Playwright E2E (`10 / 10` checks, 10 PNGs) | **Historical (Pre-`AI-QA-FIX-01`)** | Passed prior to final label/API reconciliation; not re-run per instruction |

---

## 4. Acceptance Decision & Known Limitations

- **Decision:** **`AI_QA_PASS_WITH_LIMITATIONS`** — prototype software and evaluation metrics are internally consistent, reproducible, and protected by automated security/authorization tests.
- **Not Certified For Clinical / Production Deployment:** Real handwritten prescription OCR is unvalidated, the RAG medical corpus consists of 14 first-party synthesized or internal documents (`11` synthesized clinical summaries + `3` platform docs), evaluation cohorts are small (`N = 20` queries, `N = 6` clips/cohort, `N = 4` synthetic prescriptions), and Playwright visual evidence predates `AI-QA-FIX-01`.
