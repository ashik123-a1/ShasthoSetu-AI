from __future__ import annotations

import hashlib
import secrets
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
import uuid
from typing import Any

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import HTTPException, Request, status

_PH = PasswordHasher(time_cost=2, memory_cost=65536, parallelism=2)
_DUMMY_PASSWORD_HASH = _PH.hash("ShasthoSetuTimingEqualizer#2026")
_RATE_LOCK = threading.Lock()
_RATE_BUCKETS: dict[str, deque[float]] = defaultdict(deque)
_TRUSTED_PROXIES = {"127.0.0.1", "::1", "localhost", "testclient"}


def resolve_client_ip(request: Request | None) -> str:
    """Securely resolve client IP. Only honors X-Forwarded-For if socket IP is an approved trusted proxy."""
    if request is None:
        return "local"
    direct_ip = (request.client.host if request.client else "") or "unknown"
    # Never blindly trust X-Forwarded-For from arbitrary direct Internet clients
    trust_proxy = direct_ip in _TRUSTED_PROXIES or os.getenv("SHASTHOSETU_TRUST_PROXIES", "false").lower() in ("true", "1", "yes")
    if trust_proxy:
        fwd = (request.headers.get("x-forwarded-for") or "").strip()
        if fwd:
            first_ip = fwd.split(",")[0].strip()
            if first_ip:
                return first_ip[:45]
    return direct_ip[:45]


def mask_ip(ip: str | None) -> str:
    """Dynamically mask client IP for privacy/Zero-PHI audit logs (e.g. 192.168.1.5 -> 192.168.1.x)."""
    if not ip or ip in ("local", "unknown", "testclient"):
        return "127.0.0.x"
    clean = ip.strip()
    if "." in clean:
        parts = clean.split(".")
        if len(parts) == 4:
            return f"{parts[0]}.{parts[1]}.{parts[2]}.x"
    if ":" in clean:
        parts = clean.split(":")
        return ":".join(parts[:3]) + ":x"
    return clean[:12] + ".x"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def utc_future_iso(hours: int = 24) -> str:
    return (datetime.now(timezone.utc) + timedelta(hours=hours)).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def new_id(prefix: str = "") -> str:
    uid = uuid.uuid4().hex
    return f"{prefix}-{uid[:16]}" if prefix else uid


def hash_password(password: str) -> str:
    return _PH.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _PH.verify(password_hash, password)
    except (VerifyMismatchError, Exception):
        return False


def verify_password_constant_time(password: str, password_hash: str | None) -> bool:
    """Always run Argon2id verification even when user does not exist to prevent timing enumeration."""
    if not password_hash:
        try:
            _PH.verify(_DUMMY_PASSWORD_HASH, password)
        except Exception:
            pass
        return False
    return verify_password(password, password_hash)


def generate_session_token() -> tuple[str, str]:
    raw = secrets.token_urlsafe(32)
    return raw, sha256_hex(raw)


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def build_rate_limit_key(
    prefix: str,
    request: Request | None = None,
    identifier: str | None = None,
) -> str:
    ip_part = resolve_client_ip(request)
    ident_part = sha256_hex(identifier.strip().lower())[:12] if identifier else "anon"
    return f"{prefix}:{ip_part}:{ident_part}"


def enforce_rate_limit(
    bucket_key: str,
    max_requests: int = 30,
    window_seconds: int = 60,
    *,
    request: Request | None = None,
    identifier: str | None = None,
) -> None:
    effective_key = (
        build_rate_limit_key(bucket_key, request=request, identifier=identifier)
        if (request is not None or identifier is not None)
        else bucket_key
    )
    now_wall = time.time()
    cutoff_wall = now_wall - window_seconds

    # Persistent SQLite store shared across workers & process restarts
    try:
        from ..db.sqlite import get_db_conn

        with _RATE_LOCK, get_db_conn() as conn:
            conn.execute(
                "CREATE TABLE IF NOT EXISTS rate_limit_buckets ("
                "bucket_key TEXT NOT NULL, hit_ts REAL NOT NULL)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_rate_limit_key_ts ON rate_limit_buckets(bucket_key, hit_ts)"
            )
            conn.execute("BEGIN IMMEDIATE;")
            conn.execute("DELETE FROM rate_limit_buckets WHERE hit_ts < ?", (cutoff_wall,))
            cnt = conn.execute(
                "SELECT COUNT(*) FROM rate_limit_buckets WHERE bucket_key = ? AND hit_ts >= ?",
                (effective_key, cutoff_wall),
            ).fetchone()[0]
            if cnt >= max_requests:
                conn.execute("COMMIT;")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests. Please wait a moment and try again.",
                )
            conn.execute(
                "INSERT INTO rate_limit_buckets (bucket_key, hit_ts) VALUES (?, ?)",
                (effective_key, now_wall),
            )
            conn.execute("COMMIT;")
            return
    except HTTPException:
        raise
    except Exception:
        pass

    # Fallback thread-safe monotonic deque if SQLite is unreachable
    now_mono = time.monotonic()
    with _RATE_LOCK:
        dq = _RATE_BUCKETS[effective_key]
        cutoff_mono = now_mono - window_seconds
        while dq and dq[0] < cutoff_mono:
            dq.popleft()
        if len(dq) >= max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please wait a moment and try again.",
            )
        dq.append(now_mono)


def reset_rate_limits() -> None:
    with _RATE_LOCK:
        _RATE_BUCKETS.clear()
        try:
            from ..db.sqlite import get_db_conn

            with get_db_conn() as conn:
                conn.execute(
                    "CREATE TABLE IF NOT EXISTS rate_limit_buckets ("
                    "bucket_key TEXT NOT NULL, hit_ts REAL NOT NULL)"
                )
                conn.execute("BEGIN IMMEDIATE;")
                conn.execute("DELETE FROM rate_limit_buckets;")
                conn.execute("COMMIT;")
        except Exception:
            pass
