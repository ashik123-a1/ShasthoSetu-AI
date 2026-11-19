from __future__ import annotations

import json
import sqlite3
from .security import new_id, utc_now_iso

_SENSITIVE_KEYS = {"password", "password_hash", "token", "token_hash", "csrf_token", "otp", "pin", "cvv", "pan"}


def _redact_dict(data: dict | None) -> str:
    if not data:
        return "{}"
    cleaned = {}
    for k, v in data.items():
        if k.lower() in _SENSITIVE_KEYS:
            cleaned[k] = "[REDACTED]"
        else:
            cleaned[k] = v
    return json.dumps(cleaned, ensure_ascii=False)


def record_audit(
    conn: sqlite3.Connection,
    *,
    actor_user_id: str | None,
    actor_role: str,
    action_type: str,
    target_resource: str,
    target_id: str | None = None,
    outcome: str = "SUCCESS",
    details: dict | None = None,
    ip_redacted: str = "127.0.0.x",
) -> str:
    aid = new_id("aud")
    conn.execute(
        """
        INSERT INTO audit_logs (
            id, actor_user_id, actor_role, action_type, target_resource,
            target_id, outcome, ip_redacted, details_redacted_json, created_at_utc
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            aid,
            actor_user_id,
            actor_role,
            action_type,
            target_resource,
            target_id,
            outcome,
            ip_redacted,
            _redact_dict(details),
            utc_now_iso(),
        ),
    )
    return aid


def notify_user(
    conn: sqlite3.Connection,
    *,
    recipient_user_id: str,
    topic: str,
    title_bn: str,
    title_en: str,
    entity_type: str | None = None,
    entity_id: str | None = None,
) -> str:
    nid = new_id("ntf")
    conn.execute(
        """
        INSERT INTO notifications (
            id, recipient_user_id, topic, entity_type, entity_id,
            title_bn, title_en, delivery_status, created_at_utc
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'DELIVERED', ?)
        """,
        (nid, recipient_user_id, topic, entity_type, entity_id, title_bn, title_en, utc_now_iso()),
    )
    return nid
