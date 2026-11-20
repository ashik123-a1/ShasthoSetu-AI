from __future__ import annotations

import os
import sqlite3
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field

from ..config import settings
from ..core.audit import mask_personal_identifier, notify_user, record_audit
from ..core.dependencies import extract_raw_token, get_current_user, get_optional_user
from ..core.security import (
    enforce_rate_limit,
    generate_session_token,
    hash_password,
    new_id,
    sha256_hex,
    utc_future_iso,
    utc_now_iso,
    verify_password_constant_time,
)
from ..db.sqlite import get_db_conn, row_to_dict

router = APIRouter(prefix="/v1/auth", tags=["Authentication & Sessions"])


class PatientRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: Optional[str] = Field(default=None, max_length=150)
    phone: Optional[str] = Field(default=None, max_length=40)
    password: str = Field(..., min_length=8, max_length=128)
    district: str = Field(default="Dhaka", max_length=80)
    preferred_locale: str = Field(default="bn")
    role: Optional[str] = Field(default=None)  # Checked to log & reject escalation attempts


class DoctorApplyRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    display_name_bn: Optional[str] = Field(default=None, max_length=120)
    email: str = Field(..., min_length=4, max_length=150)
    phone: Optional[str] = Field(default=None, max_length=40)
    password: str = Field(..., min_length=8, max_length=128)
    degrees: str = Field(..., min_length=2, max_length=150)
    specialty: str = Field(..., min_length=2, max_length=100)
    bmdc_demo_reg: str = Field(..., min_length=3, max_length=60)
    practice_location: str = Field(default="Dhaka (Demo Clinic)", max_length=150)
    district: str = Field(default="Dhaka", max_length=80)
    consultation_fee_bdt: int = Field(default=500, ge=0, le=10000)
    bio: Optional[str] = Field(default="", max_length=800)


class LoginRequest(BaseModel):
    identifier: str = Field(..., min_length=3, max_length=150)  # email or phone
    password: str = Field(..., min_length=1, max_length=128)


class DemoPasswordResetRequest(BaseModel):
    identifier: str = Field(..., min_length=3, max_length=150)


def _issue_session(conn, user: dict, request: Request, response: Response) -> dict:
    raw_token, token_hash = generate_session_token()
    csrf_token = new_id("csrf")
    sid = new_id("ses")
    expires = utc_future_iso(settings.session_ttl_hours)
    now = utc_now_iso()
    conn.execute(
        """
        INSERT INTO sessions (id, user_id, token_hash, csrf_token, user_agent, ip_redacted, expires_at_utc, created_at_utc)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            sid,
            user["id"],
            token_hash,
            csrf_token,
            (request.headers.get("user-agent") or "unknown")[:180],
            "127.0.0.x",
            expires,
            now,
        ),
    )
    conn.execute("UPDATE users SET last_login_at_utc = ?, updated_at_utc = ? WHERE id = ?", (now, now, user["id"]))
    is_prod = settings.env == "production" or os.getenv("SHASTHOSETU_ENV") == "production"
    response.set_cookie(
        key=settings.session_cookie_name,
        value=raw_token,
        httponly=True,
        samesite="lax",
        secure=is_prod,
        path="/",
        max_age=settings.session_ttl_hours * 3600,
    )
    response.set_cookie(
        key=settings.csrf_cookie_name,
        value=csrf_token,
        httponly=False,
        samesite="lax",
        secure=is_prod,
        path="/",
        max_age=settings.session_ttl_hours * 3600,
    )
    return {"csrf_token": csrf_token, "expires_at_utc": expires}


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_patient(payload: PatientRegisterRequest, request: Request, response: Response):
    ident_key = (payload.email or payload.phone or "anon").strip()
    enforce_rate_limit("auth_register", max_requests=25, window_seconds=60, request=request, identifier=ident_key)
    if not payload.email and not payload.phone:
        raise HTTPException(status_code=422, detail="Either email or phone is required.")

    escalation_attempted = bool(payload.role and payload.role.upper() != "PATIENT")
    if escalation_attempted:
        with get_db_conn() as conn:
            conn.execute("BEGIN IMMEDIATE;")
            record_audit(
                conn,
                actor_user_id=None,
                actor_role="PUBLIC_ANONYMOUS",
                action_type="PRIVILEGE_ESCALATION_BLOCKED",
                target_resource="users",
                outcome="DENIED",
                details={"attempted_role": payload.role, "email": mask_personal_identifier(payload.email)},
            )
            conn.execute("COMMIT;")
        raise HTTPException(
            status_code=403,
            detail="ROLE_ESCALATION_REJECTED: Public signup is strictly restricted to PATIENT accounts.",
        )

    uid = new_id("usr")
    pid = new_id("pp")
    locale = "en" if payload.preferred_locale == "en" else "bn"
    pw_hash = hash_password(payload.password)
    email = payload.email.strip().lower() if payload.email else None
    phone = payload.phone.strip() if payload.phone else None
    now = utc_now_iso()

    with get_db_conn() as conn:
        conn.execute("BEGIN IMMEDIATE;")
        try:
            if email and conn.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
                conn.execute("ROLLBACK;")
                raise HTTPException(status_code=409, detail="Registration conflict: unable to register with the provided credentials.")
            if phone and conn.execute("SELECT 1 FROM users WHERE phone = ?", (phone,)).fetchone():
                conn.execute("ROLLBACK;")
                raise HTTPException(status_code=409, detail="Registration conflict: unable to register with the provided credentials.")

            conn.execute(
                """
                INSERT INTO users (id, email, phone, password_hash, full_name, primary_role, preferred_locale, account_status, is_synthetic, created_at_utc, updated_at_utc)
                VALUES (?, ?, ?, ?, ?, 'PATIENT', ?, 'ACTIVE', 0, ?, ?)
                """,
                (uid, email, phone, pw_hash, payload.full_name.strip(), locale, now, now),
            )
            conn.execute(
                """
                INSERT INTO role_memberships (id, user_id, role, organization_id, approval_state)
                VALUES (?, ?, 'PATIENT', NULL, 'APPROVED')
                """,
                (new_id("rm"), uid),
            )
            conn.execute(
                """
                INSERT INTO patient_profiles (id, owner_user_id, display_name, relationship_type, district, phone_contact, preferred_locale, is_synthetic)
                VALUES (?, ?, ?, 'SELF', ?, ?, ?, 0)
                """,
                (pid, uid, payload.full_name.strip(), payload.district, phone, locale),
            )
            user = row_to_dict(conn.execute("SELECT id, email, phone, full_name, primary_role, preferred_locale, account_status, is_synthetic FROM users WHERE id = ?", (uid,)).fetchone())
            ses_meta = _issue_session(conn, user, request, response)
            notify_user(
                conn,
                recipient_user_id=uid,
                topic="WELCOME_PATIENT",
                title_bn="স্বাস্থ্যসেতু এআই-তে স্বাগতম! আপনার ডেমো প্রোফাইল তৈরি হয়েছে।",
                title_en="Welcome to ShasthoSetu AI! Your patient profile is ready.",
            )
            record_audit(conn, actor_user_id=uid, actor_role="PATIENT", action_type="PATIENT_REGISTER", target_resource="users", target_id=uid)
            conn.execute("COMMIT;")
        except HTTPException:
            raise
        except sqlite3.IntegrityError:
            if conn.in_transaction:
                conn.execute("ROLLBACK;")
            raise HTTPException(status_code=409, detail="Registration conflict: unable to register with the provided credentials.")
        except Exception:
            if conn.in_transaction:
                conn.execute("ROLLBACK;")
            raise

    return {"user": user, "redirect_url": "/patient/dashboard", **ses_meta}


@router.post("/doctor-apply", status_code=status.HTTP_201_CREATED)
def apply_doctor(payload: DoctorApplyRequest, request: Request, response: Response):
    email = payload.email.strip().lower()
    enforce_rate_limit("auth_doctor_apply", max_requests=15, window_seconds=60, request=request, identifier=email)
    phone = payload.phone.strip() if payload.phone else None
    uid = new_id("usr")
    doc_id = new_id("doc")
    pw_hash = hash_password(payload.password)
    now = utc_now_iso()

    with get_db_conn() as conn:
        conn.execute("BEGIN IMMEDIATE;")
        try:
            if conn.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
                conn.execute("ROLLBACK;")
                raise HTTPException(status_code=409, detail="Registration conflict: unable to submit application with the provided credentials.")
            if phone and conn.execute("SELECT 1 FROM users WHERE phone = ?", (phone,)).fetchone():
                conn.execute("ROLLBACK;")
                raise HTTPException(status_code=409, detail="Registration conflict: unable to submit application with the provided credentials.")

            conn.execute(
                """
                INSERT INTO users (id, email, phone, password_hash, full_name, primary_role, preferred_locale, account_status, is_synthetic, created_at_utc, updated_at_utc)
                VALUES (?, ?, ?, ?, ?, 'DOCTOR', 'bn', 'ACTIVE', 0, ?, ?)
                """,
                (uid, email, phone, pw_hash, payload.full_name.strip(), now, now),
            )
            conn.execute(
                """
                INSERT INTO role_memberships (id, user_id, role, organization_id, approval_state)
                VALUES (?, ?, 'DOCTOR', NULL, 'PENDING')
                """,
                (new_id("rm"), uid),
            )
            conn.execute(
                """
                INSERT INTO doctor_profiles (
                    id, user_id, display_name, display_name_bn, degrees, specialty, bmdc_demo_reg,
                    practice_location, district, bio, consultation_fee_minor_poisha, verification_status, is_fictional_demo
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 1)
                """,
                (
                    doc_id,
                    uid,
                    payload.full_name.strip(),
                    payload.display_name_bn or payload.full_name.strip(),
                    payload.degrees.strip(),
                    payload.specialty.strip(),
                    payload.bmdc_demo_reg.strip(),
                    payload.practice_location.strip(),
                    payload.district.strip(),
                    payload.bio or "Submitted application pending Admin verification.",
                    payload.consultation_fee_bdt * 100,
                ),
            )
            conn.execute(
                """
                INSERT INTO doctor_verification_events (id, doctor_profile_id, to_status, reason)
                VALUES (?, ?, 'PENDING', 'Doctor application submitted')
                """,
                (new_id("dve"), doc_id),
            )
            user = row_to_dict(conn.execute("SELECT id, email, phone, full_name, primary_role, preferred_locale, account_status FROM users WHERE id = ?", (uid,)).fetchone())
            user["doctor_profile"] = {"id": doc_id, "verification_status": "PENDING", "display_name": payload.full_name.strip(), "is_active": 1}
            ses_meta = _issue_session(conn, user, request, response)
            record_audit(conn, actor_user_id=uid, actor_role="DOCTOR", action_type="DOCTOR_APPLICATION_SUBMITTED", target_resource="doctor_profiles", target_id=doc_id)
            conn.execute("COMMIT;")
        except HTTPException:
            raise
        except sqlite3.IntegrityError:
            if conn.in_transaction:
                conn.execute("ROLLBACK;")
            raise HTTPException(status_code=409, detail="Registration conflict: unable to submit application with the provided credentials.")
        except Exception:
            if conn.in_transaction:
                conn.execute("ROLLBACK;")
            raise

    return {"user": user, "redirect_url": "/doctor/onboarding-status", **ses_meta}


@router.post("/login")
def login(payload: LoginRequest, request: Request, response: Response):
    ident = payload.identifier.strip()
    enforce_rate_limit("auth_login", max_requests=40, window_seconds=60, request=request, identifier=ident)
    with get_db_conn() as conn:
        user_row = row_to_dict(
            conn.execute(
                "SELECT * FROM users WHERE lower(email) = lower(?) OR phone = ?",
                (ident, ident),
            ).fetchone()
        )
        pw_ok = verify_password_constant_time(
            payload.password,
            user_row["password_hash"] if user_row else None,
        )
        if not user_row or not pw_ok:
            conn.execute("BEGIN IMMEDIATE;")
            record_audit(
                conn,
                actor_user_id=user_row["id"] if user_row else None,
                actor_role="ANONYMOUS",
                action_type="LOGIN_FAILED",
                target_resource="sessions",
                outcome="DENIED",
                details={"identifier": mask_personal_identifier(ident)},
            )
            conn.execute("COMMIT;")
            raise HTTPException(status_code=401, detail="Invalid credentials.")

        if (settings.env == "production" or os.getenv("SHASTHOSETU_ENV") == "production") and user_row.get("is_synthetic"):
            conn.execute("BEGIN IMMEDIATE;")
            record_audit(
                conn,
                actor_user_id=user_row["id"],
                actor_role="ANONYMOUS",
                action_type="DEMO_ACCOUNT_IN_PRODUCTION_BLOCKED",
                target_resource="sessions",
                outcome="DENIED",
                details={"reason": "Synthetic demo accounts strictly blocked in production"},
            )
            conn.execute("COMMIT;")
            raise HTTPException(
                status_code=403,
                detail="PRODUCTION_SECURITY_GATE: Demo accounts are strictly disabled in production environments.",
            )

        if user_row["account_status"] != "ACTIVE":
            raise HTTPException(status_code=403, detail=f"Account is {user_row['account_status']}.")

        conn.execute("BEGIN IMMEDIATE;")
        try:
            ses_meta = _issue_session(conn, user_row, request, response)
            record_audit(conn, actor_user_id=user_row["id"], actor_role=user_row["primary_role"], action_type="LOGIN_SUCCESS", target_resource="sessions")
            conn.execute("COMMIT;")
        except Exception:
            conn.execute("ROLLBACK;")
            raise

        doc_profile = None
        if user_row["primary_role"] == "DOCTOR":
            doc_profile = row_to_dict(
                conn.execute("SELECT id, verification_status, display_name, display_name_bn, is_active FROM doctor_profiles WHERE user_id = ?", (user_row["id"],)).fetchone()
            )

    safe_user = {
        "id": user_row["id"],
        "email": user_row["email"],
        "phone": user_row["phone"],
        "full_name": user_row["full_name"],
        "primary_role": user_row["primary_role"],
        "preferred_locale": user_row["preferred_locale"],
        "account_status": user_row["account_status"],
        "is_synthetic": user_row["is_synthetic"],
        "doctor_profile": doc_profile,
    }
    role_redirects = {
        "PATIENT": "/patient/dashboard",
        "DOCTOR": "/doctor/dashboard" if (doc_profile and doc_profile["verification_status"] == "APPROVED") else "/doctor/onboarding-status",
        "ADMIN": "/admin/dashboard",
        "SUPPORT": "/support/dashboard",
    }
    return {
        "user": safe_user,
        "redirect_url": role_redirects.get(user_row["primary_role"], "/"),
        **ses_meta,
    }


@router.post("/logout")
def logout(request: Request, response: Response):
    raw_token = extract_raw_token(request)
    if raw_token:
        token_hash = sha256_hex(raw_token)
        with get_db_conn() as conn:
            conn.execute("BEGIN IMMEDIATE;")
            conn.execute("UPDATE sessions SET revoked_at_utc = ? WHERE token_hash = ? AND revoked_at_utc IS NULL", (utc_now_iso(), token_hash))
            conn.execute("COMMIT;")
    response.delete_cookie(key=settings.session_cookie_name, path="/")
    response.delete_cookie(key=settings.csrf_cookie_name, path="/")
    return {"logged_out": True}


@router.get("/me")
def get_me(request: Request):
    user = get_optional_user(request)
    if not user:
        return {"authenticated": False, "user": None, "csrf_token": None}
    return {"authenticated": True, "user": user, "csrf_token": user.get("csrf_token")}


@router.post("/forgot-password")
def request_password_reset(payload: DemoPasswordResetRequest, request: Request):
    enforce_rate_limit("auth_forgot_pw", max_requests=10, window_seconds=60, request=request, identifier=payload.identifier)
    # Never leak whether an account exists (SRS FR-AUTH-106)
    with get_db_conn() as conn:
        conn.execute("BEGIN IMMEDIATE;")
        record_audit(
            conn,
            actor_user_id=None,
            actor_role="PUBLIC_ANONYMOUS",
            action_type="PASSWORD_RESET_REQUESTED",
            target_resource="users",
            details={"identifier": mask_personal_identifier(payload.identifier)},
        )
        conn.execute("COMMIT;")
    return {
        "accepted": True,
        "message": "If a matching account exists, recovery instructions have been recorded in demo audit logs. Contact Admin/Support in synthetic mode.",
    }
