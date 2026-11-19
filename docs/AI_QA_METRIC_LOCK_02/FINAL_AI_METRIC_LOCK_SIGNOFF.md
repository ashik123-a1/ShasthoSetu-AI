# ShasthoSetu AI — Final AI Metric Lock Sign-Off (`AI-QA-METRIC-LOCK-02`)

**Final Decision:** **`AI_QA_PASS_WITH_LIMITATIONS`**  
**Audit Date:** 2026-11-20  
**Scope:** Resolving the remaining BM25 ranking-table vs. summary contradiction and freezing reproducible primary evidence across RAG, OCR, Voice, Security/Authorization, and Project Tracker artifacts.  
**Verification Governance:** Executed via automated Python reconciliation & unit tests by the coding agent (**awaits independent owner verification** of scripts/JSONs below).

---

## 1. Locked RAG Retrieval & Provenance Summary (`N = 26`: `20` Medical + `6` Safety)

| Strategy | Hits@1 / 20 | Hits@3 / 20 | Hits@5 / 20 | Recall@1 | Recall@3 | Recall@5 | Exact MRR | Primary Source |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Dense (`bge-m3`, 1024-d)** | 18 / 20 | 20 / 20 | 20 / 20 | 90.00% | 100.00% | 100.00% | `19/20` (**0.950000**) | `rag_benchmark_results.json` |
| **BM25 (`BM25Okapi`)** | **16 / 20** | **18 / 20** | **19 / 20** | **80.00%** | **90.00%** | **95.00%** | `41/48` (**0.854167**) | `rag_benchmark_results.json` (`EN-06`=rank `2`) |
| **Hybrid RRF ($k=60$)** | **19 / 20** | **20 / 20** | **20 / 20** | **95.00%** | **100.00%** | **100.00%** | `39/40` (**0.975000**) | `rag_benchmark_results.json` (`MX-03`=rank `2`) |

- **Root Cause Locked (`ISS-013`):** Both `rag_benchmark_results.json` and `pre_fix_rag_benchmark_results.json` scored `EN-06` at BM25 rank **`2`** (`ultrasound-pcom-terminology-guide` ranked #1; `bangladesh-prescription-terminology` ranked #2). A manual transcription typo (`1` instead of `2`) in the earlier `AI-QA-FIX-01` Markdown tables was corrected, and all Markdown tables in `CORRECTED_RAG_METRICS.md`, `RAG_EVALUATION_REPORT.md`, and `BM25_ROOT_CAUSE_AND_CORRECTION.md` are now programmatically generated and verified by [`test_rag_metric_lock_02.py`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/services/api/tests/test_rag_metric_lock_02.py).
- **Corpus Provenance (`14` sources, `35` chunks):** `all_hashes_and_counts_match = True` in [`RAG_CITATION_PROVENANCE_AUDIT.csv`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/AI_QA_FIX_01/RAG_CITATION_PROVENANCE_AUDIT.csv) (`11` `FIRST_PARTY_SYNTHESIZED_SUMMARY` medical summaries referencing WHO/MedlinePlus/CDC/UNICEF/DGHS + `3` `FIRST_PARTY_PLATFORM_DOC` internal guides). `"0% hallucinations"` remains retracted.

---

## 2. Preserved OCR, Voice & Authorization Evidence Baseline

- **Prescription OCR (`AI-QA-FIX-01`, untouched):** Synthetic printed (`N=4`, `7` expected medicines): Mean CER **`12.94%`**, Mean WER **`49.31%`**, **`TP = 7, FP = 2, FN = 0`**, Precision **`77.78%`**, Recall **`100.00%`**, F1 **`87.50%`** (`128.6%` bug removed). Real camera image `0052.jpg` (`59.29%` mean token confidence, `28/44` uncertain tokens) is an unannotated smoke test only — **real handwritten prescription accuracy is `NOT VALIDATED`**.
- **OCR 5-Stage Clinical Authorization (`AI-QA-FIX-01`, untouched):** `RAW_OCR -> PATIENT_CORRECTED -> PATIENT_ACKNOWLEDGED -> DOCTOR_VERIFIED -> AUTHORIZED_MEDICATION_PLAN` with `422` raw activation block, `403 CLINICIAN_VERIFICATION_REQUIRED` on non-doctor/pending/unconsented transitions, and `filename_sha256` audit hashing.
- **Voice ASR (`AI-QA-FIX-01`, untouched):** 18 clips (`BN_01..06` = `Smoke_Test_6` Human FLEURS, 2 unique non-medical sentences: Sample-Avg Raw WER **`45.56%`**, Corpus **`45.33%`**; EN Synthetic `8.39%` / `8.33%`; Mixed Synthetic `48.24%` / `48.65%`; full frozen 26-clip FLEURS baseline `45.80%` Sample-Avg / `45.62%` Corpus) with non-bypassable editable transcript confirmation (`is_confirmed = 1`).

---

## 3. Deliverable Inventory (`docs/AI_QA_METRIC_LOCK_02/`)

1. [`BM25_ROOT_CAUSE_AND_CORRECTION.md`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/AI_QA_METRIC_LOCK_02/BM25_ROOT_CAUSE_AND_CORRECTION.md)
2. [`RAG_PER_QUERY_VERIFIED_METRICS.csv`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/AI_QA_METRIC_LOCK_02/RAG_PER_QUERY_VERIFIED_METRICS.csv)
3. [`FINAL_RAG_METRICS.json`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/AI_QA_METRIC_LOCK_02/FINAL_RAG_METRICS.json)
4. [`REPRODUCIBLE_VERIFICATION.md`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/AI_QA_METRIC_LOCK_02/REPRODUCIBLE_VERIFICATION.md)
5. [`FINAL_AI_METRIC_LOCK_SIGNOFF.md`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/AI_QA_METRIC_LOCK_02/FINAL_AI_METRIC_LOCK_SIGNOFF.md)

Reproducibility script & verification log: [`verify_rag_metric_lock_02.py`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/services/api/evals/verify_rag_metric_lock_02.py) · [`qa_metric_lock_02_verification_log.txt`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/evidence/AI_RAG_VOICE_OCR_01/qa_metric_lock_02_verification_log.txt)

---

## 4. Explicit Limitations Supporting `AI_QA_PASS_WITH_LIMITATIONS`

1. **Independent Owner Execution Pending:** Backend tests (`34/34` `AI-QA-FIX-01`, `4/4` `test_rag_metric_lock_02.py`), metric locks, and security assertions were run by the coding agent; the project owner can independently verify all RAG arithmetic via the single command in [`REPRODUCIBLE_VERIFICATION.md`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/AI_QA_METRIC_LOCK_02/REPRODUCIBLE_VERIFICATION.md).
2. **Small Author-Created RAG Benchmark & First-Party Summaries:** Retrieval covers `20` author-written queries against `11` first-party synthesized medical summaries + `3` internal docs; generative Bengali/Banglish faithfulness awaits clinician audit.
3. **Real Handwritten OCR & Real Noisy Speech Unvalidated:** Real handwritten prescription CER/WER/Recall/F1 is `NOT VALIDATED`, and live noisy-clinic Banglish microphone speech remains untested (`N=6` per voice cohort; English & Banglish audio synthesized via SAPI5).
4. **Playwright Visual Refresh Deferred:** Excluded intentionally under `AI-QA-METRIC-LOCK-02` scope (`"DO NOT run Playwright"`).
