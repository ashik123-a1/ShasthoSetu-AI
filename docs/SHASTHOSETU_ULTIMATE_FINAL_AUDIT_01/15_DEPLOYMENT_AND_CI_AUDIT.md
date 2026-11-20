# 15 — DEPLOYMENT PROFILES & CI AUTOMATION AUDIT

Audit of deployment profiles and GitHub Actions continuous integration workflow.

---

## 1. Supported Deployment Profiles
1. **Local Full-Stack Development:** FastAPI backend + Vite dev server + SQLite WAL + Local PyTorch/XGBoost inference.
2. **Restricted Local Public Demo:** Public demo mode with synthetic accounts enabled; external financial egress disabled.
3. **cPanel Shared Hosting (Lightweight):** `AI_INFERENCE_ENABLED=false`, `CPANEL_MODE=true`; FastAPI initializes in under 5s using `passenger_wsgi.py`.
4. **Ollama-Enabled Production Inference:** Local LLM integration with graceful fallback when Ollama is offline.

---

## 2. GitHub Actions CI Configuration
- **Location:** `.github/workflows/ci.yml` (corrected from root `.github/ci.yml`).
- **Workflow ID:** `425086746` (Active).
- **Execution Evidence:** Run `44755243666` triggered on `main` passed **100%** across both jobs:
  - `FastAPI Backend, Security & OCR Regression Tests (Python 3.11)`: PASSED (2m 32s).
  - `React 19 Frontend Vitest & Production Build (Node 20)`: PASSED (28s).
- **Owner Control Status:** `CI_LOCAL_VALIDATED — REMOTE_RUN_PENDING_OWNER_APPROVAL`.
