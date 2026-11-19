# ShasthoSetu AI — Independent QA Fix Audit Sign-Off (`AI-QA-FIX-01`)

**Sign-Off Decision:** **`AI_QA_PASS_WITH_LIMITATIONS`**  
**Audit Date:** 2026-11-19T23:58+06:00  
**Scope:** Full reconciliation of `AI-RAG-VOICE-OCR-01` RAG, Voice, OCR metrics, citation provenance, 5-stage clinical authorization, and targeted security/privacy tests.

---

## 1. Summary of Corrections Completed

1. **RAG Metrics & Safety Fixes ([`CORRECTED_RAG_METRICS.md`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/AI_QA_FIX_01/CORRECTED_RAG_METRICS.md)):**
   - Reconciled the contradiction between the primary `N=20` medical benchmark (**Hybrid MRR = 0.9750**, **Recall@1 = 95.00%**, **Dense MRR = 0.9500**, **BM25 MRR = 0.854167**) and the mismatched 12-row prose table (`0.958333` / `91.67%`) in the earlier report.
   - Repaired `EM-01` / `INJ-01` / `INJ-02` bypasses in [`safety_guard.py`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/services/api/src/shasthosetu_api/services/safety_guard.py) and query inspection ordering in [`rag_engine.py`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/services/api/src/shasthosetu_api/services/rag_engine.py); verified `EM-01`/`EM-02` -> `EMERGENCY_ESCALATION` and `INJ-01`/`INJ-02` -> `SAFETY_REFUSAL`.
   - Retracted unsubstantiated `"0% hallucinations"` and `"production-grade"` claims.

2. **RAG Provenance Audit ([`RAG_CITATION_PROVENANCE_AUDIT.csv`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/AI_QA_FIX_01/RAG_CITATION_PROVENANCE_AUDIT.csv)):**
   - Audited all **14 sources** and **35 chunks** across `corpus_manifest.json`, `RAG_KNOWLEDGE_SOURCE_REGISTER.csv`, SQLite `rag_sources`/`rag_chunks`, and `chunk_map.json` (`all_hashes_and_counts_match = True`).
   - Updated citation metadata in `rag_engine.py` and `CitationDrawer.tsx` to explicitly distinguish the **11 `FIRST_PARTY_SYNTHESIZED_SUMMARY`** medical guides from the **3 `FIRST_PARTY_PLATFORM_DOC`** (`https://shasthosetu.local/docs/...` internal ref) documents.

3. **OCR Entity Matching & Synthetic-vs-Real Boundary ([`CORRECTED_OCR_METRICS.md`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/AI_QA_FIX_01/CORRECTED_OCR_METRICS.md)):**
   - Removed the invalid `total_candidates_found / total_candidates_expected` ratio (`128.6%` / `150%`) and replaced it with strict 1-to-1 entity matching (`TP, FP, FN, Precision, Recall <= 100%, F1`).
   - Fixed Bengali prefix regex and `consumed_lines` tracking in `ocr_service.py`, improving `N=4` synthetic printed entity matching from Pre-Fix **TP=5, FP=4, FN=2 (P=55.56%, R=71.43%, F1=62.50%)** to Post-Fix **TP=7, FP=2, FN=0 (P=77.78%, R=100.00%, F1=87.50%)**.
   - Re-ran real `0052.jpg` cleanly as an unannotated read-only smoke test (`59.29%` conf, `28/44` uncertain tokens), explicitly noting **real handwritten OCR accuracy is NOT validated**.

4. **5-Stage OCR Clinical Authorization ([`OCR_CLINICAL_AUTHORIZATION_AUDIT.md`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/AI_QA_FIX_01/OCR_CLINICAL_AUTHORIZATION_AUDIT.md)):**
   - Separated `RAW_OCR` -> `PATIENT_CORRECTED` -> `PATIENT_ACKNOWLEDGED` -> `DOCTOR_VERIFIED` -> `AUTHORIZED_MEDICATION_PLAN` across `schema.sql`, `sqlite.py`, `ai_ocr.py`, `patient.py`, and `PrescriptionOcrStudio.tsx`.
   - Enforced `HTTP 403` blocking patients, pending doctors, and unconsented doctors from clinician verification or activating `'ACTIVE'` clinician medication plans, and hashed OCR upload filenames in `audit_logs`.

5. **Voice Reference, Prediction & Hash Reconciliation ([`VOICE_REFERENCE_PREDICTION_RECONCILIATION.md`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/AI_QA_FIX_01/VOICE_REFERENCE_PREDICTION_RECONCILIATION.md)):**
   - Identified prior report's invented examples, documented all 18 WAV SHA-256 hashes + full references + full raw predictions, computed both sample-avg and corpus WER/CER, and verified exact alignment of `BN_01..BN_06` with `Smoke_Test_6` of the frozen 26-clip FLEURS audit.

---

## 2. Reproducible Verification Command Manifest

| Verification Command | Result | Artifact |
| :--- | :---: | :--- |
| `eval_ocr.py` | PASS (`TP=7, FP=2, FN=0, P=77.78%, R=100%, F1=87.50%`) | `docs/evidence/AI_RAG_VOICE_OCR_01/ocr_benchmark_results.json` |
| `eval_rag.py` | PASS (`Hybrid MRR=0.9750, R@1=95%, R@3=100%; EM/INJ/UN pass`) | `docs/evidence/AI_RAG_VOICE_OCR_01/rag_benchmark_results.json` |
| `reconcile_qa_fix_01.py` | PASS (`14 sources / 35 chunks` hash parity `True`; Voice/OCR reconciled) | `docs/evidence/AI_RAG_VOICE_OCR_01/qa_fix_01_reconciliation.json` |
| `pytest -v test_fullstack_api.py test_ai_rag_voice_ocr.py` | PASS (**34 / 34 passed in 42.76s**) | `docs/evidence/AI_RAG_VOICE_OCR_01/qa_fix_01_pytest_output.txt` |
| `apps/web: npm run typecheck` | PASS (`tsc --noEmit` 0 errors) | Terminal stdout |
| `verify_final_lock.py` | PASS (**7 / 7 suites PASS**) | Terminal stdout |

---

## 3. Explicit Remaining Limitations (Reasons for `WITH_LIMITATIONS`)

1. Real handwritten clinical prescription accuracy has **no verbatim ground-truth benchmark**; only a single unannotated read-only smoke test (`0052.jpg`) was inspected.
2. Public RAG medical sources are **first-party synthesized summaries referencing WHO/MedlinePlus/CDC/DGHS/UNICEF**, not verbatim redistributed upstream documents.
3. Bengali/Banglish RAG answers and Voice ASR were tested on small benchmark cohorts (`N=20` medical queries; `N=6` per voice cohort, `2` unique Bengali FLEURS sentences in `Smoke_Test_6`); clinical safety and generative faithfulness require human clinician review before clinical use.
4. Production clinical deployment readiness is **not established** (`AGENT-REPORTED` local verification only; Playwright E2E screenshots pre-date the final `AI-QA-FIX-01` UI label adjustments).

---

## 4. `AI-QA-METRIC-LOCK-02` Addendum (2026-11-20)

- Independent owner review identified a remaining transcription discrepancy in Section 3 of `CORRECTED_RAG_METRICS.md` and `RAG_EVALUATION_REPORT.md`: query `EN-06` had BM25 rank mistyped as `1` instead of its primary JSON value **`2 (0.5000)`** (`top_5_slugs[0]` = `ultrasound-pcom-terminology-guide`), which had caused the visible Markdown rows to imply `17/20` (`0.879167`) against the true JSON summary `16/20` (`0.854167`).
- Fixed via [`services/api/evals/verify_rag_metric_lock_02.py`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/services/api/evals/verify_rag_metric_lock_02.py), self-asserting table generation in `eval_rag.py`, and automated Markdown/JSON/CSV consistency tests in [`test_rag_metric_lock_02.py`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/services/api/tests/test_rag_metric_lock_02.py). See [`docs/AI_QA_METRIC_LOCK_02/FINAL_AI_METRIC_LOCK_SIGNOFF.md`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/AI_QA_METRIC_LOCK_02/FINAL_AI_METRIC_LOCK_SIGNOFF.md) for the locked evidence package.
