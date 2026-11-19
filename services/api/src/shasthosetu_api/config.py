from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

API_DIR = Path(__file__).resolve().parents[2]  # services/api
PROJECT_ROOT = API_DIR.parents[1]              # project root
DEFAULT_DATA_DIR = API_DIR / "data"
DEFAULT_DB_PATH = DEFAULT_DATA_DIR / "shasthosetu.db"
FINAL_LOCK_DIR = PROJECT_ROOT / "SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT" / "final_lock"


def _parse_origins() -> list[str]:
    raw = os.getenv("SHASTHOSETU_CORS_ORIGINS", "").strip()
    if raw:
        return [o.strip() for o in raw.split(",") if o.strip()]
    # Explicit safe localhost dev origins — never wildcard '*' with credentials
    return [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:4173",
        "http://localhost:4173",
    ]


@dataclass(frozen=True)
class Settings:
    env: str = os.getenv("SHASTHOSETU_ENV", "development")
    db_path: Path = Path(os.getenv("SHASTHOSETU_DB_PATH", str(DEFAULT_DB_PATH)))
    session_cookie_name: str = "ss_session"
    session_ttl_hours: int = 24
    allow_demo_login_banner: bool = os.getenv("SHASTHOSETU_SHOW_DEMO_CREDENTIALS", "true").lower() == "true"
    cors_origins: list[str] = field(default_factory=_parse_origins)


settings = Settings()
