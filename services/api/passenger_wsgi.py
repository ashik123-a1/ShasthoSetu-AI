"""
ShasthoSetu AI — cPanel Phusion Passenger WSGI Entrypoint
Allows running FastAPI in standard cPanel shared hosting Python environments.
Sets AI_INFERENCE_ENABLED=false for low-cost, low-RAM shared hosting tier.
"""

import os
import sys
from pathlib import Path

# Set paths
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
API_SRC = SCRIPT_DIR / "src"

if str(API_SRC) not in sys.path:
    sys.path.insert(0, str(API_SRC))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Enforce lightweight cPanel environment variables
os.environ.setdefault("SHASTHOSETU_ENV", "production")
os.environ.setdefault("CPANEL_MODE", "true")
os.environ.setdefault("AI_INFERENCE_ENABLED", "false")
os.environ.setdefault("RAG_INFERENCE_ENABLED", "true")
os.environ.setdefault("VOICE_AI_ENABLED", "false")
os.environ.setdefault("OCR_ENABLED", "false")
os.environ.setdefault("SHASTHOSETU_DB_PATH", str(SCRIPT_DIR / "data" / "shasthosetu.db"))

from shasthosetu_api.main import app as asgi_app

# Passenger requires a synchronous WSGI callable named 'application'
try:
    from a2wsgi import ASGIMiddleware
    application = ASGIMiddleware(asgi_app)
except ImportError:
    # Basic fallback adapter if a2wsgi is not installed
    def application(environ, start_response):
        import asyncio
        from io import BytesIO

        # Simple synchronous response for healthcheck if adapter is missing
        if environ.get("PATH_INFO") in ("/health", "/v1/health"):
            status = "200 OK"
            response_headers = [("Content-type", "application/json")]
            start_response(status, response_headers)
            return [b'{"status":"ok","mode":"cpanel_lightweight","ai_inference":false}']

        status = "500 Internal Server Error"
        response_headers = [("Content-type", "text/plain")]
        start_response(status, response_headers)
        return [b"Please install 'a2wsgi' in your cPanel Python virtual environment to bridge ASGI to WSGI."]
