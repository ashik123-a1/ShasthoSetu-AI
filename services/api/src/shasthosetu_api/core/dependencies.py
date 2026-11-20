from __future__ import annotations

from typing import Callable
from fastapi import Depends, HTTPException, Request, status

from ..config import settings
from ..db.sqlite import get_db_conn, row_to_dict
from .audit import record_audit
from .security import sha256_hex, utc_now_iso


def extract_raw_token(request: Request) -> str | None:
    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        return auth_header[7:].strip()
    cookie_val = request.cookies.get(settings.session_cookie_name)
    if cookie_val:
        return cookie_val.strip()
    token_param = request.query_params.get("token")
    if token_param:
        return token_param.strip()
    return None


def get_optional_user(request: Request) -> dict | None:
    raw_token = extract_raw_token(request)
    if not raw_token:
        return None
    token_hash = sha256_hex(raw_token)
    now_iso = utc_now_iso()
    with get_db_conn() as conn:
        row = conn.execute(
            """
            SELECT s.id AS session_id, s.csrf_token, s.expires_at_utc,
                   u.id, u.email, u.phone, u.full_name, u.primary_role,
                   u.preferred_locale, u.account_status, u.is_synthetic
              FROM sessions s
              JOIN users u ON u.id = s.user_id
             WHERE s.token_hash = ?
               AND s.revoked_at_utc IS NULL
               AND s.expires_at_utc > ?
            """,
            (token_hash, now_iso),
        ).fetchone()
        user = row_to_dict(row)
        if not user or user["account_status"] != "ACTIVE":
            return None
        if user["primary_role"] == "DOCTOR":
            doc = row_to_dict(
                conn.execute(
                    "SELECT id, verification_status, display_name, display_name_bn, is_active FROM doctor_profiles WHERE user_id = ?",
                    (user["id"],),
                ).fetchone()
            )
            user["doctor_profile"] = doc
        return user


def get_current_user(request: Request) -> dict:
    user = get_optional_user(request)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )
    return user


def require_role(*allowed_roles: str) -> Callable:
    def _dependency(user: dict = Depends(get_current_user)) -> dict:
        if user["primary_role"] not in allowed_roles:
            with get_db_conn() as conn:
                conn.execute("BEGIN IMMEDIATE;")
                record_audit(
                    conn,
                    actor_user_id=user["id"],
                    actor_role=user["primary_role"],
                    action_type="ROLE_ACCESS_DENIED",
                    target_resource=",".join(allowed_roles),
                    outcome="DENIED",
                    details={"required_roles": list(allowed_roles)},
                )
                conn.execute("COMMIT;")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient role permission for this portal.",
            )
        return user

    return _dependency


def require_approved_doctor(user: dict = Depends(require_role("DOCTOR"))) -> dict:
    doc = user.get("doctor_profile")
    if not doc or doc.get("verification_status") != "APPROVED" or not doc.get("is_active"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="DOCTOR_NOT_APPROVED: Doctor verification must be APPROVED by an Admin before accessing clinical schedules.",
        )
    return user
