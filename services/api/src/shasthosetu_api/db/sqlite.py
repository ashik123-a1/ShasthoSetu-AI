from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from ..config import settings

SCHEMA_SQL_PATH = Path(__file__).resolve().with_name("schema.sql")


def resolve_db_path(db_path: Path | None = None) -> Path:
    if db_path is not None:
        return db_path
    env_override = os.getenv("SHASTHOSETU_DB_PATH", "").strip()
    return Path(env_override) if env_override else settings.db_path


def configure_sqlite_connection(conn: sqlite3.Connection) -> None:
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA busy_timeout = 5000;")


def connect_db(db_path: Path | None = None) -> sqlite3.Connection:
    target = resolve_db_path(db_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(target), check_same_thread=False, isolation_level=None)
    configure_sqlite_connection(conn)
    return conn


@contextmanager
def get_db_conn(db_path: Path | None = None) -> Iterator[sqlite3.Connection]:
    conn = connect_db(db_path)
    try:
        yield conn
    finally:
        conn.close()


@contextmanager
def begin_immediate(conn: sqlite3.Connection) -> Iterator[sqlite3.Connection]:
    conn.execute("BEGIN IMMEDIATE;")
    try:
        yield conn
        conn.execute("COMMIT;")
    except Exception:
        conn.execute("ROLLBACK;")
        raise


def ensure_ocr_authorization_columns(conn: sqlite3.Connection) -> None:
    """Idempotently add 5-stage OCR clinical authorization columns on existing SQLite DBs."""
    art_cols = {r[1] for r in conn.execute("PRAGMA table_info(ocr_job_artifacts)").fetchall()}
    if art_cols:
        art_additions = {
            "authorization_state": "ALTER TABLE ocr_job_artifacts ADD COLUMN authorization_state TEXT NOT NULL DEFAULT 'RAW_OCR'",
            "patient_acknowledged_by_user_id": "ALTER TABLE ocr_job_artifacts ADD COLUMN patient_acknowledged_by_user_id TEXT REFERENCES users(id)",
            "patient_acknowledged_at_utc": "ALTER TABLE ocr_job_artifacts ADD COLUMN patient_acknowledged_at_utc TEXT",
            "clinician_verified_by_user_id": "ALTER TABLE ocr_job_artifacts ADD COLUMN clinician_verified_by_user_id TEXT REFERENCES users(id)",
            "clinician_verified_at_utc": "ALTER TABLE ocr_job_artifacts ADD COLUMN clinician_verified_at_utc TEXT",
        }
        for col, ddl in art_additions.items():
            if col not in art_cols:
                conn.execute(ddl)

    med_cols = {r[1] for r in conn.execute("PRAGMA table_info(medication_plans)").fetchall()}
    if med_cols:
        med_additions = {
            "authorization_type": "ALTER TABLE medication_plans ADD COLUMN authorization_type TEXT NOT NULL DEFAULT 'PATIENT_ACKNOWLEDGED_REMINDER'",
            "clinician_verified_by_user_id": "ALTER TABLE medication_plans ADD COLUMN clinician_verified_by_user_id TEXT REFERENCES users(id)",
        }
        for col, ddl in med_additions.items():
            if col not in med_cols:
                conn.execute(ddl)


def apply_schema(db_path: Path | None = None) -> None:
    sql = SCHEMA_SQL_PATH.read_text(encoding="utf-8")
    with get_db_conn(db_path) as conn:
        conn.executescript(sql)
        ensure_ocr_authorization_columns(conn)
        configure_sqlite_connection(conn)


def rows_to_dicts(rows: list[sqlite3.Row]) -> list[dict]:
    return [dict(r) for r in rows]


def row_to_dict(row: sqlite3.Row | None) -> dict | None:
    return dict(row) if row is not None else None
