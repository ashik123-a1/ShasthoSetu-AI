"""Initial ShasthoSetu fullstack 36-table SQLite schema with ISS-003..006 fixes

Revision ID: 001_fullstack_initial
Revises:
Create Date: 2026-11-19
"""
from __future__ import annotations

from pathlib import Path
from alembic import op

revision = "001_fullstack_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    schema_path = Path(__file__).resolve().parents[2] / "src" / "shasthosetu_api" / "db" / "schema.sql"
    sql = schema_path.read_text(encoding="utf-8")
    raw_conn = op.get_bind().connection.dbapi_connection
    raw_conn.executescript(sql)


def downgrade() -> None:
    pass
