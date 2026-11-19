"""Shared SQLite, audit-lock, Zero-PHI sanitization, and CLI transport helpers for ShasthoSetu MCP servers."""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

PROJECT_ROOT = Path(__file__).resolve().parents[2]
API_SRC_DIR = PROJECT_ROOT / "services" / "api" / "src"
if str(API_SRC_DIR) not in sys.path:
    sys.path.insert(0, str(API_SRC_DIR))

DEFAULT_DB_PATH = PROJECT_ROOT / "services" / "api" / "data" / "shasthosetu.db"
FINAL_LOCK_DIR = PROJECT_ROOT / "SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT" / "final_lock"


def get_db_path() -> Path:
    env_override = os.getenv("SHASTHOSETU_DB_PATH", "").strip()
    return Path(env_override) if env_override else DEFAULT_DB_PATH


@contextmanager
def get_readonly_db_conn() -> Iterator[sqlite3.Connection]:
    """Open SQLite WAL connection in read-only safe mode (falls back to normal RO if URI unavailable)."""
    db_path = get_db_path()
    if not db_path.exists():
        raise FileNotFoundError(f"ShasthoSetu SQLite DB not found at {db_path}")
    conn = sqlite3.connect(f"file:{db_path.as_posix()}?mode=ro", uri=True, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA query_only = ON;")
    conn.execute("PRAGMA busy_timeout = 5000;")
    try:
        yield conn
    finally:
        conn.close()


def mask_phone(raw: str | None) -> str:
    """Redact phone numbers for Zero-PHI and Blood Connect consent boundaries."""
    digits = "".join(ch for ch in (raw or "") if ch.isdigit())
    if len(digits) < 4:
        return "HIDDEN_UNTIL_CONSENT"
    return f"***-***-{digits[-2:]}"


def scrub_phi_dict(record: dict[str, Any]) -> dict[str, Any]:
    """Strip or mask phone, password, and raw secret keys from returned MCP payloads."""
    blocked = {"password_hash", "token_hash", "session_token", "raw_full_text", "corrected_full_text"}
    phone_keys = {"phone", "phone_contact", "contact_phone", "emergency_contact", "requester_phone"}
    cleaned: dict[str, Any] = {}
    for k, v in record.items():
        lk = k.lower()
        if lk in blocked:
            continue
        if lk in phone_keys or "phone" in lk:
            cleaned[k] = "HIDDEN_UNTIL_CONSENT" if v else None
        else:
            cleaned[k] = v
    return cleaned


def run_mcp_server(server: Any, default_port: int = 8101) -> None:
    """Standard CLI transport dispatcher supporting stdio, SSE, and Streamable HTTP."""
    parser = argparse.ArgumentParser(description=f"Run {getattr(server, 'name', 'ShasthoSetu MCP')} server")
    parser.add_argument(
        "--transport",
        choices=["stdio", "sse", "streamable-http"],
        default=os.getenv("SHASTHOSETU_MCP_TRANSPORT", "stdio"),
        help="MCP transport protocol (default: stdio)",
    )
    parser.add_argument("--host", default="127.0.0.1", help="HTTP/SSE bind host (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=default_port, help=f"HTTP/SSE port (default: {default_port})")
    args = parser.parse_args()

    if args.transport == "stdio":
        server.run(transport="stdio")
        return

    import uvicorn

    if args.transport == "sse":
        app = server.sse_app(host=args.host)
        uvicorn.run(app, host=args.host, port=args.port, log_level="warning")
    else:
        app = server.streamable_http_app(host=args.host)
        uvicorn.run(app, host=args.host, port=args.port, log_level="warning")


def to_pretty_json(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2)
