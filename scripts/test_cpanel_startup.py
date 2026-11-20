"""
Test FastAPI startup and route health with AI_INFERENCE_ENABLED=false (cPanel mode).
"""

import os
import sys
import time
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parents[1]
_API_SRC = _PROJECT_ROOT / "services" / "api" / "src"
sys.path.insert(0, str(_API_SRC))
sys.path.insert(0, str(_PROJECT_ROOT))

# Enforce cPanel mode
os.environ["AI_INFERENCE_ENABLED"] = "false"
os.environ["CPANEL_MODE"] = "true"
os.environ["VOICE_AI_ENABLED"] = "false"
os.environ["OCR_ENABLED"] = "false"

t0 = time.perf_counter()
from shasthosetu_api.main import app
boot_ms = round((time.perf_counter() - t0) * 1000, 2)

print(f"PASS: FastAPI application initialized in {boot_ms} ms with AI_INFERENCE_ENABLED=false.")

# Test routes using TestClient
from fastapi.testclient import TestClient

client = TestClient(app)

# 1. Health check
r_health = client.get("/v1/health")
assert r_health.status_code == 200, f"Expected 200, got {r_health.status_code}"
print("PASS: /v1/health returned 200 OK.")

# 2. Verify unauthenticated access to AI inference is rejected with 401
r_unauth = client.post("/v1/ai/infer/pcos-clinical", json={"age": 28, "bmi": 26.5})
assert r_unauth.status_code == 401, f"Expected 401, got {r_unauth.status_code}"
print("PASS: Unauthenticated inference access strictly rejected with HTTP 401.")

# Log in as patient demo to acquire session & CSRF token
r_login = client.post("/v1/auth/login", json={"identifier": "patient.demo@shasthosetu.local", "password": "PatientDemo#2026"})
assert r_login.status_code == 200, f"Login failed: {r_login.status_code}"
client.headers["x-csrf-token"] = r_login.json()["csrf_token"]

# 3. AI Inference Offline handling
r_pcos = client.post("/v1/ai/infer/pcos-clinical", json={"age": 28, "bmi": 26.5})
assert r_pcos.status_code == 200, f"Expected 200, got {r_pcos.status_code}"
pcos_data = r_pcos.json()
assert pcos_data.get("status") == "OFFLINE", "Expected OFFLINE status in cPanel mode"
print(f"PASS: PCOS clinical inference gracefully handled offline mode: {pcos_data['status']} - {pcos_data['message']}.")

# 4. LangGraph Orchestration in cPanel mode
r_orch = client.post("/v1/agents/orchestrate", json={"query": "আমার ৩ দিন ধরে ১০৩ জ্বর", "language": "bn"})
assert r_orch.status_code == 200, f"Expected 200, got {r_orch.status_code}"
orch_data = r_orch.json()
assert orch_data["ok"] is True
print("PASS: LangGraph orchestration functions deterministically in cPanel mode.")

print(f"\nALL CPANEL LIGHTWEIGHT MODE TESTS PASSED! Boot latency: {boot_ms} ms.")
