from __future__ import annotations

import hashlib
import secrets
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
import uuid

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import HTTPException, status

_PH = PasswordHasher(time_cost=2, memory_cost=65536, parallelism=2)
_RATE_LOCK = threading.Lock()
_RATE_BUCKETS: dict[str, deque[float]] = defaultdict(deque)


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


def generate_session_token() -> tuple[str, str]:
    raw = secrets.token_urlsafe(32)
    return raw, sha256_hex(raw)


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def enforce_rate_limit(bucket_key: str, max_requests: int = 30, window_seconds: int = 60) -> None:
    now = time.monotonic()
    with _RATE_LOCK:
        dq = _RATE_BUCKETS[bucket_key]
        cutoff = now - window_seconds
        while dq and dq[0] < cutoff:
            dq.popleft()
        if len(dq) >= max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please wait a moment and try again.",
            )
        dq.append(now)


def reset_rate_limits() -> None:
    with _RATE_LOCK:
        _RATE_BUCKETS.clear()
