# ShasthoSetu AI — Complete Automated Testing, Security & Research Audit Guide

This document provides the complete inventory of **backend pytest suites (`38` tests)**, **frontend Vitest unit/component tests (`15` tests)**, **TypeScript/Vite build verification**, **Playwright browser E2E specs (`3` specs)**, **MCP JSON-RPC checks**, and **cryptographic research lock suites (`7` checks)**.

---

## 1. Master Test Suite Summary

| Layer | Suite / File | Count / Scope | Command | Expected Outcome |
| :--- | :--- | :---: | :--- | :---: |
| **Backend API** | [`services/api/tests/test_ai_rag_voice_ocr.py`](../services/api/tests/test_ai_rag_voice_ocr.py) | `24 tests` | `pytest services/api/tests/test_ai_rag_voice_ocr.py -q` | **24 Passed** |
| **Backend API** | [`services/api/tests/test_fullstack_api.py`](../services/api/tests/test_fullstack_api.py) | `10 tests` | `pytest services/api/tests/test_fullstack_api.py -q` | **10 Passed** |
| **Metric Lock** | [`services/api/tests/test_rag_metric_lock_02.py`](../services/api/tests/test_rag_metric_lock_02.py) | `4 tests` | `pytest services/api/tests/test_rag_metric_lock_02.py -q` | **4 Passed** |
| **Frontend Unit** | [`apps/web/src/test/designSystem.test.tsx`](../apps/web/src/test/designSystem.test.tsx) | `15 tests` | `cd apps/web && npm run test` | **15 Passed** |
| **Type Safety** | Strict `tsc --noEmit` across React 19 UI | Full SPA | `cd apps/web && npm run typecheck` | **0 Errors** |
| **Prod Bundle** | Vite 6 + Tailwind v4 CSS/JS production bundle | Full SPA | `cd apps/web && npm run build` | **Built Cleanly** |
| **Browser E2E** | [`apps/web/e2e/*.spec.ts`](../apps/web/e2e) (`ui01`, `fullstack01`, `ai_rag_voice_ocr_01`) | `3 specs` | `cd apps/web && npm run test:e2e` | Multi-viewport & workflow E2E |
| **Research Lock** | [`verify_final_lock.py`](../SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/final_lock/verify_final_lock.py) | `7 suites` | `python SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/final_lock/verify_final_lock.py` | **7/7 Suites Passed** |
| **MCP Verifier** | [`verify_mcp_suite.py`](../services/mcp/verify_mcp_suite.py) | `6 stdio MCPs` | `python services/mcp/verify_mcp_suite.py` | **JSON-RPC Pass** |

---

## 2. Backend Pytest Suite Details (`38 / 38 Passed`)

### Run All Backend Tests
```powershell
cd services/api
$env:PYTHONPATH = "src;../.."
python -m pytest tests -q
# Output: 38 passed
```

- **`test_ai_rag_voice_ocr.py` (`24 tests`):** Tests bilingual Hybrid RAG citation grounding, Emergency 999 red-flag routing, prompt injection refusal across BN/EN/Banglish, Whisper audio draft confirmation (`is_confirmed`), Safe-OCR extraction, **mandatory `HTTP 422`** lockout prior to verification, clinician verification sign-off, and RAG index governance.
- **`test_fullstack_api.py` (`10 tests`):** Tests full auth login/registration/anti-escalation, Argon2id cookies, `BEGIN IMMEDIATE` double-booking rejection (`HTTP 409`), simulated payment receipts, Support **`HTTP 403` Zero-PHI isolation**, Pending vs Approved doctor gates, cross-doctor IDOR denial, Blood Connect masking, and PCOS/research honesty.
- **`test_rag_metric_lock_02.py` (`4 tests`):** Programmatically recomputes Dense (`bge-m3`), `BM25`, and Hybrid RRF metrics directly from primary query traces (`MRR 0.9750`, `Recall@1 95.00%`, `EN-06` BM25 rank 2 root-cause check) and asserts exact numerical parity with `FINAL_RAG_METRICS.json`, `RAG_PER_QUERY_VERIFIED_METRICS.csv`, and Markdown evaluation tables.

### Standalone Backend Evaluation & Security Scripts (`services/api/evals/`)
- `evals/eval_rag.py` · `evals/benchmark_all_rag_modes.py` · `evals/verify_rag_metric_lock_02.py`
- `evals/eval_ocr.py` · `evals/eval_voice.py` · `evals/benchmark_local_llms.py` · `evals/verify_six_ai_tools.py`
- `evals/test_demo_isolation_security.py` · `evals/test_ocr_authorization_gate.py` · `evals/test_webhook_security.py`

---

## 3. Frontend Test Suite Details (`apps/web/src/test/designSystem.test.tsx` — `15 / 15 Passed`)

| # | Test Case Name | Verified Behavior |
| :-: | :--- | :--- |
| 1 | `bn.json` ↔ `en.json` key parity | 100% recursive translation key parity and non-empty strings |
| 2 | Bilingual locale toggle | Defaults to Bengali (`bn`) & persists English switch |
| 3 | Obsidian Dark ↔ Clinical Daylight toggle | Defaults to Dark theme & persists White Mode (`data-theme="light"`) |
| 4 | WCAG Pause Motion toggle | Persists `html.reduce-motion` cleanly |
| 5 | ConfirmModal accessibility | Focus trap, Escape dismissal & trigger focus restoration |
| 6 | SlidePillTabs keyboard nav | Arrow navigation and tab panel switching |
| 7 | RoleSidebar & route guards | Role switching + unauthenticated portal redirect enforcement |
| 8 | DataTable component | Search, status pill filter, sort & empty state fallback |
| 9 | Feedback states & badges | Loading, empty, error, offline banner, toast & TrustBadges |
| 10 | Formatters parity | Poisha integer BDT formatting & Asia/Dhaka timestamps in BN/EN |
| 11 | PublicHomepage (`/`) | Logo lockup, floating navbar & 3D Care Lattice fallback |
| 12 | Feature & Care Map routes | `/features/pcos`, `/features/prescription-ocr`, `/features/pediatric-rash`, `/care-map` |
| 13 | MedicalReceiptDocument | Official logo, helpline, itemized BDT breakdown & demo watermark |
| 14 | MedicalPrescriptionDocument | Clinician BMDC creds, patient vitals & structured Rx table |
| 15 | DoctorProfileDetailModal | Credentials, BMDC reg, bio, ratings & slot selection |

---

## 4. Built-In 5-System QA Benchmark Pack (`../testingmainapps/`)

For rapid manual verification without downloading the ~2.03 GiB Hugging Face dataset, use [`../testingmainapps/DOCUMENTATION.md`](../testingmainapps/DOCUMENTATION.md) covering sample PDF/JPG prescriptions, pelvic USG scans, IMCI triage cases, negative-control rejection photos, and BN/EN/Banglish queries.
