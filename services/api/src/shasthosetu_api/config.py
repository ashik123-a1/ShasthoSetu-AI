from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

API_DIR = Path(__file__).resolve().parents[2]  # services/api
PROJECT_ROOT = API_DIR.parents[1]              # project root
DEFAULT_DATA_DIR = API_DIR / "data"
DEFAULT_DB_PATH = DEFAULT_DATA_DIR / "shasthosetu.db"
DEFAULT_RAG_INDEX_DIR = DEFAULT_DATA_DIR / "rag_index"
DEFAULT_OCR_VAULT_DIR = DEFAULT_DATA_DIR / "vault" / "ocr"
DEFAULT_RAG_CORPUS_DIR = DEFAULT_DATA_DIR / "rag_corpus"
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
    csrf_cookie_name: str = "ss_csrf"
    session_ttl_hours: int = 24
    allow_demo_login_banner: bool = os.getenv("SHASTHOSETU_SHOW_DEMO_CREDENTIALS", "false").lower() == "true"
    cors_origins: list[str] = field(default_factory=_parse_origins)
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
    ollama_chat_model: str = os.getenv("OLLAMA_CHAT_MODEL", "qwen2.5:7b")
    ollama_embed_model: str = os.getenv("OLLAMA_EMBED_MODEL", "bge-m3")
    hf_home: str = os.getenv("HF_HOME", str(DEFAULT_DATA_DIR / "hf_cache"))
    rag_index_dir: Path = Path(os.getenv("RAG_INDEX_DIR", str(DEFAULT_RAG_INDEX_DIR)))
    ocr_vault_dir: Path = Path(os.getenv("OCR_VAULT_DIR", str(DEFAULT_OCR_VAULT_DIR)))
    rag_corpus_dir: Path = Path(os.getenv("RAG_CORPUS_DIR", str(DEFAULT_RAG_CORPUS_DIR)))
    ai_request_timeout_sec: int = int(os.getenv("AI_REQUEST_TIMEOUT_SEC", "90"))

    # Lightweight cPanel / Shared Hosting Optional AI Flags
    ai_inference_enabled: bool = os.getenv("AI_INFERENCE_ENABLED", "true").lower() in ("true", "1", "yes")
    rag_inference_enabled: bool = os.getenv("RAG_INFERENCE_ENABLED", "true").lower() in ("true", "1", "yes")
    voice_ai_enabled: bool = os.getenv("VOICE_AI_ENABLED", "true").lower() in ("true", "1", "yes")
    ocr_enabled: bool = os.getenv("OCR_ENABLED", "true").lower() in ("true", "1", "yes")
    cpanel_mode: bool = os.getenv("CPANEL_MODE", "false").lower() in ("true", "1", "yes")


settings = Settings()
