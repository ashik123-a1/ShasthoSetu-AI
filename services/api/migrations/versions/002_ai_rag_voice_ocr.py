"""Add 12 RAG, Voice ASR/TTS, Chat History, Feedback, Runtime & OCR Artifact tables (AI-RAG-VOICE-OCR-01)

Revision ID: 002_ai_rag_voice_ocr
Revises: 001_fullstack_initial
Create Date: 2026-11-19
"""
from __future__ import annotations

from pathlib import Path
from alembic import op

revision = "002_ai_rag_voice_ocr"
down_revision = "001_fullstack_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    schema_path = Path(__file__).resolve().parents[2] / "src" / "shasthosetu_api" / "db" / "schema.sql"
    sql = schema_path.read_text(encoding="utf-8")
    raw_conn = op.get_bind().connection.dbapi_connection
    raw_conn.executescript(sql)


def downgrade() -> None:
    raw_conn = op.get_bind().connection.dbapi_connection
    for tbl in (
        "ai_runtime_snapshots",
        "ocr_job_artifacts",
        "ai_feedback",
        "ai_message_citations",
        "ai_chat_messages",
        "ai_chat_sessions",
        "ai_asr_jobs",
        "ai_voice_consents",
        "rag_ingestion_jobs",
        "rag_chunks",
        "rag_source_versions",
        "rag_sources",
    ):
        raw_conn.execute(f"DROP TABLE IF EXISTS {tbl};")
