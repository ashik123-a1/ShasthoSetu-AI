# ShasthoSetu AI — Complete A–Z Installation & Evaluation Instruction Book

This manual walks faculty reviewers, judges, and developers from a fresh `git clone` to running **every subsystem** of ShasthoSetu AI locally in under 10 minutes.

---

## 1. System Prerequisites

| Component | Recommended Version | Purpose |
| :--- | :--- | :--- |
| **Python** | `3.10` – `3.12` (verified `3.12.10`) | FastAPI API, SQLite WAL, ML/OCR inference, MCP servers |
| **Node.js & npm** | Node `18+` (verified `v26.0.0`) | React 19 + Vite 6 + Three.js frontend + Vitest |
| **Ollama** *(Optional)* | Latest | Local edge inference (`qwen2.5:7b` LLM + `bge-m3` embeddings) |
| **Cloudflared / ngrok** *(Optional)* | Latest | Public HTTPS sharing (`0.0.0.0` + permissive CORS enabled) |

---

## 2. Step-by-Step Local Setup

### Windows PowerShell (Recommended 1-Click Flow)
```powershell
# 1. Clone the repository
git clone https://github.com/ashik123-a1/ShasthoSetu-AI.git
cd ShasthoSetu-AI

# 2. Create Python virtual environment & install dependencies
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 3. Install React frontend packages
cd apps\web && npm.cmd install && cd ..\..

# 4. Copy safe default config
Copy-Item .env.example .env

# 5. Launch Full Stack (auto-seeds SQLite DB if missing + starts FastAPI :8000 & Vite :5173)
.\start.bat
```

Optional launcher flags:
- Reset SQLite database cleanly: `.\start_shasthosetu.ps1 -ResetDemoDb`
- Launch with Cloudflare public tunnel: `.\start_shasthosetu.ps1 -WithTunnel`

### Linux / macOS Setup
```bash
git clone https://github.com/ashik123-a1/ShasthoSetu-AI.git
cd ShasthoSetu-AI
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
PYTHONPATH="services/api/src:." python -m shasthosetu_api.seeds.seed_demo

# Terminal 1 (Backend :8000)
PYTHONPATH="services/api/src:." python -m uvicorn shasthosetu_api.main:app --host 0.0.0.0 --port 8000

# Terminal 2 (Frontend :5173)
cd apps/web && npm install && npm run dev
```

---

## 3. Enabling Full Local Edge AI (`Ollama`)
```bash
ollama pull qwen2.5:7b
ollama pull bge-m3
ollama serve
```
Keep Ollama running on `127.0.0.1:11434`. When Ollama is stopped, non-generative routes (Auth, Patient/Doctor portals, Safe-OCR `HTTP 422` gate, Blood Connect map, BM25/cached triage, and `0.1 ms` safety refusals) continue working normally.

---

## 4. Downloading Full Research Datasets vs. In-Repo QA Pack
- **Ready Out of the Box (`../testingmainapps/`):** A curated **1.01 MB** sample dataset pack (prescriptions, ultrasound scans, rash photos + negative controls, IMCI cases, BN/EN/Banglish queries) is already included in Git for instant evaluation.
- **Full 35,641-File Clinical Dataset Archive (`~2.03 GiB`):**
  ```bash
  pip install huggingface-hub
  hf download ashik1236/shasthosetu-clinical-datasets --repo-type dataset --local-dir ./hf_datasets
  ```

---

## 5. Step-by-Step Evaluator Walkthrough (`http://127.0.0.1:5173`)
1. **Home (`/`) & Themes:** Observe particle intro (or click Skip), toggle **EN / বাংলা** and **White / Obsidian Dark** mode, explore the **3D Medical Care Lattice**, click the bottom-right **Radial Menu (`≡`) → Official Project Team** to view all 5 members, or click the **Support 3D Orb** for bilingual live voice chat.
2. **8-Division National Atlas (`/care-map` & `/blood-connect`):** Filter Bangladesh hospitals/diagnostics and masked donor requests (`+880 17•• •••12`).
3. **1-Click Portal Logins (`/login`):** Test Patient (`patient.demo@shasthosetu.local`), Approved Doctor (`dr.farhana@shasthosetu.local`), Support (`support.demo@shasthosetu.local`), Admin (`admin.demo@shasthosetu.local`), and Pending Doctor (`dr.pending@shasthosetu.local`) — unlocked identically on localhost, LAN IPs, and public tunnels.
4. **Safe-OCR `HTTP 422` & Domain Guardrails (`/services` or Patient Portal):** Upload [`sample_hospital_prescription_01.png`](../testingmainapps/01_prescription_ocr/sample_hospital_prescription_01.png) and confirm medication reminders are blocked until confirmation; upload [`negative_control_smartphone.jpg`](../testingmainapps/04_dermoped_skin/negative_controls_unrelated/negative_control_smartphone.jpg) to DermoPed Studio to verify domain rejection.

---

## 6. Troubleshooting Common Windows Issues
- **PowerShell `npm.ps1` execution policy error:** Run `npm.cmd run dev` (or use `start.bat` which bypasses execution policy).
- **Port `8000` or `5173` already occupied:** Terminate old uvicorn/node processes or inspect with `netstat -ano | findstr ":8000 :5173"`.
- **Database lock or stale schema:** Run `.\start_shasthosetu.ps1 -ResetDemoDb` to rebuild the clean 55-table synthetic SQLite WAL database.
