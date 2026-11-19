# ShasthoSetu AI — Independent Reproducible Verification Guide (`AI-QA-METRIC-LOCK-02`)

**Task ID:** `AI-QA-METRIC-LOCK-02`  
**Audit Date:** 2026-11-20  
**Governance Disclosure:** All verification commands below were executed by the coding agent to lock metric consistency; **independent owner re-execution** is supported in under 2 seconds using standard Python without running Ollama, Whisper, EasyOCR, GPU inference, or Playwright.

---

## 1. Primary Input & Locked Output SHA-256 Manifest

| Role | File Path | SHA-256 Digest |
| :--- | :--- | :--- |
| **Primary RAG Benchmark JSON** | [`docs/evidence/AI_RAG_VOICE_OCR_01/rag_benchmark_results.json`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/evidence/AI_RAG_VOICE_OCR_01/rag_benchmark_results.json) | `584093e9bd1342f6ec0081e05d510ee3ec934ccda4ff5132f2a91262fbdfd47f` |
| **Pre-Fix Traceability JSON** | [`docs/evidence/AI_RAG_VOICE_OCR_01/pre_fix_rag_benchmark_results.json`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/evidence/AI_RAG_VOICE_OCR_01/pre_fix_rag_benchmark_results.json) | `a7bbddd97943c0e88e553fec6c4ebc2b382445bd5653ba3e86d103d5db7dfd8e` |
| **Corpus Provenance Audit CSV** | [`docs/AI_QA_FIX_01/RAG_CITATION_PROVENANCE_AUDIT.csv`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/AI_QA_FIX_01/RAG_CITATION_PROVENANCE_AUDIT.csv) | `2b97443625e8d6d22821594668e015d5f7be46c84b74c055291b44bf7350ac0d` |
| **Locked Per-Query CSV** | [`docs/AI_QA_METRIC_LOCK_02/RAG_PER_QUERY_VERIFIED_METRICS.csv`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/AI_QA_METRIC_LOCK_02/RAG_PER_QUERY_VERIFIED_METRICS.csv) | `d01fba7e73e91502d94703df0efadfbce54ebd2c28858f83064e7ae9d26168db` |
| **Locked Summary JSON** | [`docs/AI_QA_METRIC_LOCK_02/FINAL_RAG_METRICS.json`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/AI_QA_METRIC_LOCK_02/FINAL_RAG_METRICS.json) | `bf24822f64f4ae181fb6d5c94501df7daf67c7b7076895397054d55fff8361c4` |

---

## 2. Independent Owner Reproduction Commands (Zero LLM / Zero Playwright)

```powershell
# 1. Verify primary JSON -> CSV -> JSON -> all 3 Markdown report tables
& "F:\Clude cccccccccccccccccccccccc\data we test\_shared\venv\Scripts\python.exe" `
  "F:\Clude cccccccccccccccccccccccc\data we test\services\api\evals\verify_rag_metric_lock_02.py" --verify-markdown

# 2. Run automated metric-lock regression tests (4 tests)
$env:PYTHONPATH = "F:\Clude cccccccccccccccccccccccc\data we test\services\api\src"
& "F:\Clude cccccccccccccccccccccccc\data we test\_shared\venv\Scripts\python.exe" -m pytest -v `
  "F:\Clude cccccccccccccccccccccccc\data we test\services\api\tests\test_rag_metric_lock_02.py"

# 3. Verify frozen research assets remain untouched (7 read-only suites)
& "F:\Clude cccccccccccccccccccccccc\data we test\_shared\venv\Scripts\python.exe" `
  "F:\Clude cccccccccccccccccccccccc\data we test\SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT\final_lock\verify_final_lock.py"
```

---

## 3. Verbatim Executed Verification Log (`qa_metric_lock_02_verification_log.txt`)

Saved to [`docs/evidence/AI_RAG_VOICE_OCR_01/qa_metric_lock_02_verification_log.txt`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/evidence/AI_RAG_VOICE_OCR_01/qa_metric_lock_02_verification_log.txt):

```text
=================================================================
SHASTHOSETU AI — RAG METRIC LOCK VERIFICATION (AI-QA-METRIC-LOCK-02)
=================================================================
Primary JSON     : docs/evidence/AI_RAG_VOICE_OCR_01/rag_benchmark_results.json (sha256: 584093e9bd1342f6ec0081e05d510ee3ec934ccda4ff5132f2a91262fbdfd47f)
Pre-Fix JSON     : docs/evidence/AI_RAG_VOICE_OCR_01/pre_fix_rag_benchmark_results.json (sha256: a7bbddd97943c0e88e553fec6c4ebc2b382445bd5653ba3e86d103d5db7dfd8e)
Provenance CSV   : docs/AI_QA_FIX_01/RAG_CITATION_PROVENANCE_AUDIT.csv (sha256: 2b97443625e8d6d22821594668e015d5f7be46c84b74c055291b44bf7350ac0d)
Queries Checked  : 26 total (20 unique MEDICAL IDs + 6 separated safety probes)
Slug Validation  : PASS (100% MEDICAL + EMERGENCY targets in RAG_CITATION_PROVENANCE_AUDIT.csv)
-----------------------------------------------------------------
  [DENSE ] Hits@1=18/20 (90.00%) | Hits@3=20/20 (100.00%) | Hits@5=20/20 (100.00%) | MRR=0.950000 (19/20) | Lat(N=20)=236.17ms, Lat(N=26)=215.92ms
  [BM25  ] Hits@1=16/20 (80.00%) | Hits@3=18/20 (90.00%) | Hits@5=19/20 (95.00%) | MRR=0.854167 (41/48) | Lat(N=20)=2.57ms, Lat(N=26)=2.62ms
  [HYBRID] Hits@1=19/20 (95.00%) | Hits@3=20/20 (100.00%) | Hits@5=20/20 (100.00%) | MRR=0.975000 (39/40) | Lat(N=20)=140.51ms, Lat(N=26)=141.88ms
-----------------------------------------------------------------
Root Cause Locked: EN-06 BM25 primary rank=2 (RR=0.5) was mistyped in manual Markdown table as 1 (1.000).
-----------------------------------------------------------------
  [MD-PASS] docs/AI_QA_FIX_01/CORRECTED_RAG_METRICS.md (20/20 rows + summary 100% consistent)
  [MD-PASS] docs/AI_RAG_VOICE_OCR_01/RAG_EVALUATION_REPORT.md (20/20 rows + summary 100% consistent)
  [MD-PASS] docs/AI_QA_METRIC_LOCK_02/BM25_ROOT_CAUSE_AND_CORRECTION.md (20/20 rows + summary 100% consistent)
>>> ALL RAG METRIC LOCK ASSERTIONS PASSED! <<<

--- PYTEST (test_rag_metric_lock_02.py) ---
============================= test session starts =============================
platform win32 -- Python 3.12.10, pytest-9.2.0, pluggy-1.7.0 -- F:\Clude cccccccccccccccccccccccc\data we test\_shared\venv\Scripts\python.exe
cachedir: .pytest_cache
rootdir: F:\Clude cccccccccccccccccccccccc\data we test\services\api
configfile: pyproject.toml
plugins: anyio-4.16.0
collecting ... collected 4 items

F:\Clude cccccccccccccccccccccccc\data we test\services\api\tests\test_rag_metric_lock_02.py::test_primary_rag_json_consistency_and_eval_validator PASSED [ 25%]
F:\Clude cccccccccccccccccccccccc\data we test\services\api\tests\test_rag_metric_lock_02.py::test_final_rag_metrics_json_and_csv_match_primary PASSED [ 50%]
F:\Clude cccccccccccccccccccccccc\data we test\services\api\tests\test_rag_metric_lock_02.py::test_markdown_tables_match_primary_metrics PASSED [ 75%]
F:\Clude cccccccccccccccccccccccc\data we test\services\api\tests\test_rag_metric_lock_02.py::test_pre_fix_rag_benchmark_preserved PASSED [100%]

============================== 4 passed in 1.57s ==============================

--- FINAL LOCK ---
>>> ALL 7 READ-ONLY VERIFICATION TEST SUITES PASSED! <<<
```
