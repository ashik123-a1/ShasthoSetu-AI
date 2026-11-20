# ShasthoSetu AI — Deployment & Tunneling Guide

ShasthoSetu AI supports four deployment profiles: **Local Development**, **Local GPU AI Acceleration (Ollama)**, **Zero-Config Public Tunnels**, and **Lightweight cPanel / Shared Hosting WSGI**.

---

## 1. Local Full-Stack Setup (Windows / Linux / macOS)

### Prerequisites
- Python **3.10–3.12** (tested with 3.12.10)
- Node.js **18+** & npm (tested with Node 26)
- Optional: [Ollama](https://ollama.com/) for local LLM RAG & dense vector embeddings

### Automated Launch (Windows)
```powershell
.\start.bat
# Optional flags:
.\start_shasthosetu.ps1 -ResetDemoDb -WithTunnel
```

### Manual Setup (Cross-Platform)
```bash
cp .env.example .env
python -m venv .venv
source .venv/bin/activate        # Windows: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Initialize SQLite WAL database with 55 tables & demo data
PYTHONPATH="services/api/src:." python -m shasthosetu_api.seeds.seed_demo

# Start FastAPI on all interfaces (:8000)
PYTHONPATH="services/api/src:." python -m uvicorn shasthosetu_api.main:app --host 0.0.0.0 --port 8000

# In a second terminal: start Vite dev server (:5173)
cd apps/web && npm install && npm run dev
```

---

## 2. Local GPU AI Setup (Ollama)

Pull the required bilingual LLM and dense multilingual embedder:
```bash
ollama pull qwen2.5:7b
ollama pull bge-m3
ollama serve
```
Ensure `.env` matches your Ollama endpoint (`OLLAMA_BASE_URL=http://127.0.0.1:11434`). When Ollama is offline, non-generative routes (auth, portals, blood connect, SQLite booking, BM25/cached retrieval, and safety refusals) continue operating gracefully.

---

## 3. Public Tunneling & Multi-Device Access (Cloudflare, ngrok, Localtunnel, LAN)

ShasthoSetu AI is configured so external demos behave **identically to localhost** (including all 1-click demo personas on `/login`, cookies, and 2-device WebRTC calls):
- **`apps/web/vite.config.ts`:** Binds `host: "0.0.0.0"` with `allowedHosts: true` and proxies `/v1` to `http://127.0.0.1:8000`.
- **`services/api/src/shasthosetu_api/main.py`:** Enables `allow_credentials=True` with `allow_origin_regex=r"^https?://.*$"`.

Example tunnel launch (after starting backend & Vite):
```bash
# Cloudflare Quick Tunnel
cloudflared tunnel --url http://127.0.0.1:5173

# OR ngrok
ngrok http 5173

# OR Localtunnel
npx localtunnel --port 5173
```

---

## 4. Shared Hosting / cPanel Deployment (Passenger WSGI)

For low-RAM shared hosting without local GPUs or Ollama:
1. Build the static frontend bundle:
   ```bash
   cd apps/web && npm run build
   ```
   Deploy `apps/web/dist/*` alongside [`apps/web/public/.htaccess`](../apps/web/public/.htaccess) (handles SPA client-side routing).
2. Configure Python App on cPanel pointing to [`services/api/passenger_wsgi.py`](../services/api/passenger_wsgi.py).
3. Copy [`services/api/.env.cpanel.example`](../services/api/.env.cpanel.example) to `.env` — `passenger_wsgi.py` sets `CPANEL_MODE=true`, `AI_INFERENCE_ENABLED=false`, `VOICE_AI_ENABLED=false`, and `OCR_ENABLED=false` while bridging FastAPI ASGI cleanly via `a2wsgi.ASGIMiddleware`.
4. Smoke test configuration locally via:
   ```bash
   python scripts/test_cpanel_startup.py
   ```
