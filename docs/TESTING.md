# ShasthoSetu AI — Automated Testing, Benchmarks & Manual QA Guide

This guide documents all automated verification suites, cryptographic research audits, and hands-on 5-system QA checks.

---

## 1. Automated Verification Summary

| Check | Scope | Expected Outcome |
| :--- | :--- | :--- |
| **Backend Pytest** (`services/api/tests/`) | Auth RBAC, SQLite `BEGIN IMMEDIATE`, Safe-OCR `HTTP 422`, Zero-PHI `HTTP 403`, Consultation gating, RAG metric-lock parity | **38 passed** |
| **Frontend TypeScript** (`tsc --noEmit`) | Strict static type checking across all React 19 + Three.js modules | **0 errors** |
| **Frontend Unit Tests** (`vitest run`) | Bilingual locale persistence, White/Dark themes, WCAG reduce-motion, role sidebar guards | **15 / 15 passed** |
| **Frontend Production Build** (`vite build`) | Full production CSS & JS asset bundling (`apps/web/dist/`) | **Built cleanly** |
| **Final Audit Lock** (`verify_final_lock.py`) | Validates research counts & SHA-256 checkpoint hashes | **Passed** |
| **MCP Suite Verifier** (`verify_mcp_suite.py`) | Live JSON-RPC 2.0 handshake across 3 custom & 3 local public MCP servers | **Passed** |

---

## 2. Exact Commands

### Backend Test Suite (38 Tests)
```powershell
cd services/api
$env:PYTHONPATH = "src;../.."
python -m pytest tests -q
```

**Included Security & Metric-Lock Evaluations (`services/api/evals/`):**
- `evals/test_demo_isolation_security.py` — Validates demo credentials and isolation constraints
- `evals/test_ocr_authorization_gate.py` — Verifies the 5-stage `RAW_OCR` -> `HTTP 422` block
- `evals/test_webhook_security.py` — Checks webhook/automation payload boundaries
- `evals/verify_rag_metric_lock_02.py` — Cross-checks primary benchmark JSON/CSV against published Markdown tables

### Frontend Verification Suite
```powershell
cd apps/web
npm run typecheck
npm run test
npm run build
```

### Cryptographic Audit Lock & MCP Verification
```powershell
# Verify research dataset manifests & checkpoint SHA-256 hashes
python SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/final_lock/verify_final_lock.py

# Verify custom + public MCP servers via stdio JSON-RPC
python services/mcp/verify_mcp_suite.py
```

---

## 3. Hands-On 5-System QA Pack (`testingmainapps/`)

For rapid manual or evaluator verification without downloading the ~2.03 GiB Hugging Face archive, use the curated **1.01 MB** QA dataset included in [`testingmainapps/`](../testingmainapps/DOCUMENTATION.md):

1. **Prescription OCR (`testingmainapps/01_prescription_ocr/`):** Upload `sample_hospital_prescription_01.png` or `.pdf` alongside `ground_truth_prescriptions.json` checks; confirm reminder lockout until reviewed.
2. **PCOS Tracker & Ultrasound (`testingmainapps/02_pcos_tracker/`):** Test tabular features (`clinical_features_sample.json`) and B-mode ultrasound images (`pcos_positive_scan_01.jpg`, `normal_ovary_scan_01.jpg`).
3. **Pediatric IMCI & EPI (`testingmainapps/03_pediatric_triage/`):** Validate Red/Yellow/Green danger sign routing (`pediatric_triage_cases.json`) and immunization schedules.
4. **DermoPed Guardrails (`testingmainapps/04_dermoped_skin/`):** Confirm lesion classification on `chickenpox_lesion_01.png` AND confirm domain guardrail rejection on `negative_control_smartphone.jpg`, `negative_control_landscape_car.jpg`, and `negative_control_face_portrait.jpg`.
5. **Multilingual RAG & Voice (`testingmainapps/05_rag_bilingual_assistant/`):** Test prompts in Bengali (`test_queries_bangla.json`), Banglish (`test_queries_banglish.json`), and English (`test_queries_english.json`).
