# 19 — COMPLETE REGRESSION TEST RESULTS MATRIX

Summary of all 139 automated tests executed across all system tiers.

---

## 1. Test Suite Execution Breakdown

| Test Suite / Harness | Tests | Passed | Failed | Execution Time | Command |
|---|:---:|:---:|:---:|:---:|---|
| **FastAPI Backend Pytest Suite** | 48 | 48 | 0 | 66.99s | `python -m pytest services/api/tests` |
| **React 19 Vitest Suite** | 16 | 16 | 0 | 3.40s | `npm run test -- --run` |
| **Demo Isolation & Prod Gate** | 12 | 12 | 0 | 5.21s | `python services/api/evals/test_demo_isolation_security.py` |
| **OCR Clinical Authorization Gate** | 10 | 10 | 0 | 7.12s | `python services/api/evals/test_ocr_authorization_gate.py` |
| **Webhook HMAC Security Suite** | 13 | 13 | 0 | 2.45s | `python services/api/evals/test_webhook_security.py` |
| **Clinical AI Tools Live Proof** | 9 | 9 | 0 | 6.10s | `python services/api/evals/verify_six_ai_tools.py` |
| **Agent Frameworks Suite (5)** | 5 | 5 | 0 | 1.80s | `python services/agents/verify_agents_suite.py` |
| **MCP Servers Suite (6)** | 6 | 6 | 0 | 4.88s | `python services/mcp/verify_mcp_suite.py` |
| **Video Privacy Screening** | 5 | 5 | 0 | 0.85s | `python scripts/verify_video_privacy_screening.py` |
| **n8n Automation Workflows** | 4 | 4 | 0 | 1.10s | `python scripts/verify_automation_workflows.py` |
| **cPanel Lightweight Startup** | 4 | 4 | 0 | 4.38s | `python scripts/test_cpanel_startup.py` |
| **Frozen Research Lock Hashes** | 7 | 7 | 0 | 1.25s | `python .../verify_final_lock.py` |
| **GRAND TOTAL** | **139** | **139** | **0** | **~105s** | **100% PASS RATE** |

---

## 2. GitHub Actions Remote CI Verification
- Workflow: `ShasthoSetu AI — Full-Stack CI & Security Gate` (`.github/workflows/ci.yml`)
- Run ID: `44755243666` (Triggered via push on `main`)
- Job 1: `FastAPI Backend, Security & OCR Regression Tests (Python 3.11)` — **PASSED**
- Job 2: `React 19 Frontend Vitest & Production Build (Node 20)` — **PASSED**
- Overall Result: **SUCCESS (All Green Checkmarks)**
