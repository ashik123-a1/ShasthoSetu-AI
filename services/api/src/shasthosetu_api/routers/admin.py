from __future__ import annotations

import json
import sqlite3
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..core.audit import mask_personal_identifier, notify_user, record_audit
from ..core.dependencies import require_role
from ..core.security import hash_password, new_id, utc_now_iso
from ..db.sqlite import get_db_conn, row_to_dict, rows_to_dicts
from ..seeds.seed_demo import _recompute_bank_balances, _seed_business_and_six_month_ledger

router = APIRouter(prefix="/v1/admin", tags=["Admin Governance, Approvals & Audit"])

_MONTH_LABELS = {
    "2026-06": "Jun 2026",
    "2026-07": "Jul 2026",
    "2026-08": "Aug 2026",
    "2026-09": "Sep 2026",
    "2026-10": "Oct 2026",
    "2026-11": "Nov 2026",
}


def _build_admin_finance_snapshot(
    conn: sqlite3.Connection,
    *,
    status_filter: Optional[str] = None,
    stream_filter: Optional[str] = None,
    month_filter: Optional[str] = None,
) -> dict:
    now = utc_now_iso()
    _seed_business_and_six_month_ledger(conn, now)

    kpis = row_to_dict(
        conn.execute(
            """
            SELECT
                COUNT(*) AS total_transactions_count,
                SUM(CASE WHEN status IN ('PAID', 'SETTLED') THEN 1 ELSE 0 END) AS paid_transactions_count,
                COALESCE(SUM(CASE WHEN status IN ('PAID', 'SETTLED') THEN gross_amount_minor_poisha ELSE 0 END), 0) AS gross_gmv_poisha,
                COALESCE(SUM(CASE WHEN status IN ('PAID', 'SETTLED') THEN commission_minor_poisha ELSE 0 END), 0) AS platform_commission_poisha,
                COALESCE(SUM(CASE WHEN status IN ('PAID', 'SETTLED') THEN net_partner_payout_minor_poisha ELSE 0 END), 0) AS net_partner_payout_poisha,
                COALESCE(SUM(CASE WHEN status = 'REFUNDED' THEN gross_amount_minor_poisha ELSE 0 END), 0) AS refunded_poisha,
                ROUND(COALESCE(AVG(commission_rate_pct), 15.0), 2) AS avg_commission_rate_pct
              FROM platform_transactions
            """
        ).fetchone()
    ) or {}

    bank_accounts = rows_to_dicts(
        conn.execute("SELECT * FROM bank_settlement_accounts ORDER BY id ASC").fetchall()
    )

    month_rows = rows_to_dicts(
        conn.execute(
            """
            SELECT
                billing_month,
                COUNT(*) AS tx_count,
                COALESCE(SUM(CASE WHEN status IN ('PAID', 'SETTLED') AND revenue_stream = 'DOCTOR_CONSULTATION' THEN gross_amount_minor_poisha ELSE 0 END), 0) AS consultation_gmv_poisha,
                COALESCE(SUM(CASE WHEN status IN ('PAID', 'SETTLED') AND revenue_stream = 'EPHARMA_SALE' THEN gross_amount_minor_poisha ELSE 0 END), 0) AS epharma_sales_gmv_poisha,
                COALESCE(SUM(CASE WHEN status IN ('PAID', 'SETTLED') AND revenue_stream = 'DIAGNOSTIC_TEST' THEN gross_amount_minor_poisha ELSE 0 END), 0) AS diagnostic_test_gmv_poisha,
                COALESCE(SUM(CASE WHEN status IN ('PAID', 'SETTLED') AND revenue_stream = 'HEALTH_PLAN' THEN gross_amount_minor_poisha ELSE 0 END), 0) AS health_plan_gmv_poisha,
                COALESCE(SUM(CASE WHEN status IN ('PAID', 'SETTLED') THEN gross_amount_minor_poisha ELSE 0 END), 0) AS total_gmv_poisha,
                COALESCE(SUM(CASE WHEN status IN ('PAID', 'SETTLED') THEN commission_minor_poisha ELSE 0 END), 0) AS total_commission_poisha,
                COALESCE(SUM(CASE WHEN status IN ('PAID', 'SETTLED') THEN net_partner_payout_minor_poisha ELSE 0 END), 0) AS net_payout_poisha
              FROM platform_transactions
             GROUP BY billing_month
             ORDER BY billing_month ASC
            """
        ).fetchall()
    )
    for mr in month_rows:
        mr["month_label"] = _MONTH_LABELS.get(mr["billing_month"], mr["billing_month"])

    stream_rows = rows_to_dicts(
        conn.execute(
            """
            SELECT
                revenue_stream,
                COUNT(*) AS tx_count,
                ROUND(AVG(commission_rate_pct), 1) AS commission_rate_pct,
                COALESCE(SUM(CASE WHEN status IN ('PAID', 'SETTLED') THEN gross_amount_minor_poisha ELSE 0 END), 0) AS gross_gmv_poisha,
                COALESCE(SUM(CASE WHEN status IN ('PAID', 'SETTLED') THEN commission_minor_poisha ELSE 0 END), 0) AS commission_poisha,
                COALESCE(SUM(CASE WHEN status IN ('PAID', 'SETTLED') THEN net_partner_payout_minor_poisha ELSE 0 END), 0) AS net_partner_payout_poisha
              FROM platform_transactions
             GROUP BY revenue_stream
             ORDER BY gross_gmv_poisha DESC
            """
        ).fetchall()
    )

    tx_sql = """
        SELECT pt.*, b.account_code AS bank_account_code, b.provider_name AS bank_provider_name
          FROM platform_transactions pt
          JOIN bank_settlement_accounts b ON b.id = pt.bank_account_id
         WHERE 1=1
    """
    tx_params: list = []
    if status_filter:
        tx_sql += " AND pt.status = ?"
        tx_params.append(status_filter)
    if stream_filter:
        tx_sql += " AND pt.revenue_stream = ?"
        tx_params.append(stream_filter)
    if month_filter:
        tx_sql += " AND pt.billing_month = ?"
        tx_params.append(month_filter)
    tx_sql += " ORDER BY pt.created_at_utc DESC LIMIT 120"
    txns = rows_to_dicts(conn.execute(tx_sql, tuple(tx_params)).fetchall())

    return {
        "kpis": kpis,
        "bank_accounts": bank_accounts,
        "monthly_six_month_trend": month_rows,
        "stream_commission_breakdown": stream_rows,
        "platform_transactions": txns,
    }


class DoctorVerifyRequest(BaseModel):
    decision: str  # APPROVED | REJECTED | SUSPENDED
    reason: str = Field(..., min_length=3, max_length=400)


class UserStatusPatchRequest(BaseModel):
    account_status: str  # ACTIVE | SUSPENDED | LOCKED
    reason: Optional[str] = Field(default=None, max_length=300)


class StaffProvisionRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: str = Field(..., min_length=4, max_length=150)
    phone: Optional[str] = Field(default=None, max_length=40)
    password: str = Field(..., min_length=8, max_length=128)
    role: str = Field(default="SUPPORT")  # SUPPORT | ADMIN | PATIENT


class AppointmentOverrideRequest(BaseModel):
    status: str  # CANCELLED | CONFIRMED | NO_SHOW | COMPLETED
    reason: str = Field(..., min_length=3, max_length=400)


class DemoRefundRequest(BaseModel):
    reason: str = Field(default="Admin demo refund processed", max_length=300)


class FeatureFlagPatchRequest(BaseModel):
    enabled: bool


class SpecialtyCreateRequest(BaseModel):
    slug: str = Field(..., min_length=2, max_length=80)
    name_bn: str = Field(..., min_length=2, max_length=120)
    name_en: str = Field(..., min_length=2, max_length=120)
    min_fee_minor_poisha: int = Field(default=30000, ge=0)
    max_fee_minor_poisha: int = Field(default=250000, ge=0)


class DiagnosticTestCreateRequest(BaseModel):
    code: str = Field(..., min_length=2, max_length=60)
    name_bn: str = Field(..., min_length=2, max_length=120)
    name_en: str = Field(..., min_length=2, max_length=120)
    category: str = Field(..., min_length=2, max_length=80)
    sample_type: str = Field(default="Venous Blood", max_length=80)
    fee_minor_poisha: int = Field(..., ge=0)
    turnaround_hours: int = Field(default=24, ge=1, le=720)


class FacilityCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=160)
    facility_type: str = Field(default="DIAGNOSTIC")
    district: str = Field(..., min_length=2, max_length=80)
    address: str = Field(..., min_length=4, max_length=250)
    phone: Optional[str] = Field(default=None, max_length=40)


@router.get("/dashboard")
def admin_dashboard(user: dict = Depends(require_role("ADMIN"))):
    with get_db_conn() as conn:
        user_counts = row_to_dict(
            conn.execute(
                """
                SELECT
                    COUNT(*) AS total_users,
                    SUM(CASE WHEN primary_role = 'PATIENT' THEN 1 ELSE 0 END) AS patients,
                    SUM(CASE WHEN primary_role = 'DOCTOR' THEN 1 ELSE 0 END) AS doctors,
                    SUM(CASE WHEN primary_role = 'SUPPORT' THEN 1 ELSE 0 END) AS support_staff,
                    SUM(CASE WHEN primary_role = 'ADMIN' THEN 1 ELSE 0 END) AS admins,
                    SUM(CASE WHEN account_status != 'ACTIVE' THEN 1 ELSE 0 END) AS suspended_or_locked
                  FROM users
                """
            ).fetchone()
        ) or {}
        doctor_counts = row_to_dict(
            conn.execute(
                """
                SELECT
                    SUM(CASE WHEN verification_status = 'PENDING' THEN 1 ELSE 0 END) AS pending_doctors,
                    SUM(CASE WHEN verification_status = 'APPROVED' THEN 1 ELSE 0 END) AS approved_doctors,
                    SUM(CASE WHEN verification_status IN ('REJECTED', 'SUSPENDED') THEN 1 ELSE 0 END) AS blocked_doctors
                  FROM doctor_profiles
                """
            ).fetchone()
        ) or {}
        appt_counts = row_to_dict(
            conn.execute(
                """
                SELECT
                    COUNT(*) AS total_appointments,
                    SUM(CASE WHEN status IN ('CONFIRMED', 'CHECKED_IN', 'IN_CONSULTATION') THEN 1 ELSE 0 END) AS active_appointments,
                    SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_appointments,
                    SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_appointments
                  FROM appointments
                """
            ).fetchone()
        ) or {}
        payment_counts = row_to_dict(
            conn.execute(
                """
                SELECT
                    COALESCE(SUM(CASE WHEN status = 'DEMO_PAID' THEN amount_minor_poisha ELSE 0 END), 0) AS demo_paid_poisha,
                    COALESCE(SUM(CASE WHEN status = 'DEMO_REFUNDED' THEN amount_minor_poisha ELSE 0 END), 0) AS demo_refunded_poisha,
                    COUNT(*) AS total_transactions
                  FROM demo_payments
                """
            ).fetchone()
        ) or {}
        escalated_count = conn.execute(
            "SELECT COUNT(*) FROM support_tickets WHERE status = 'ESCALATED' OR category = 'SAFETY_ESCALATION'"
        ).fetchone()[0]
        recent_audit = rows_to_dicts(
            conn.execute("SELECT * FROM audit_logs ORDER BY created_at_utc DESC LIMIT 15").fetchall()
        )
        finance = _build_admin_finance_snapshot(conn)
        payment_counts["gross_six_month_gmv_poisha"] = finance["kpis"].get("gross_gmv_poisha", 0)
        payment_counts["platform_commission_poisha"] = finance["kpis"].get("platform_commission_poisha", 0)
        payment_counts["net_partner_payout_poisha"] = finance["kpis"].get("net_partner_payout_poisha", 0)
        return {
            "users": user_counts,
            "doctors": doctor_counts,
            "appointments": appt_counts,
            "demo_payments": payment_counts,
            "finance_summary": finance,
            "escalated_tickets_count": escalated_count,
            "recent_audit_logs": recent_audit,
        }


@router.get("/doctors")
def list_admin_doctors(status: Optional[str] = None, user: dict = Depends(require_role("ADMIN"))):
    sql = """
        SELECT d.*, u.email, u.phone, u.account_status, u.full_name, u.created_at_utc AS user_created_at_utc
          FROM doctor_profiles d
          JOIN users u ON u.id = d.user_id
         WHERE 1=1
    """
    params: list = []
    if status:
        sql += " AND d.verification_status = ?"
        params.append(status)
    sql += " ORDER BY CASE WHEN d.verification_status = 'PENDING' THEN 0 ELSE 1 END, d.created_at_utc DESC"
    with get_db_conn() as conn:
        doctors = rows_to_dicts(conn.execute(sql, tuple(params)).fetchall())
        for d in doctors:
            d["verification_events"] = rows_to_dicts(
                conn.execute(
                    "SELECT * FROM doctor_verification_events WHERE doctor_profile_id = ? ORDER BY created_at_utc DESC",
                    (d["id"],),
                ).fetchall()
            )
        return {"doctors": doctors}


@router.post("/doctors/{doctor_id}/verify")
def verify_doctor(doctor_id: str, payload: DoctorVerifyRequest, user: dict = Depends(require_role("ADMIN"))):
    if payload.decision not in ("APPROVED", "REJECTED", "SUSPENDED"):
        raise HTTPException(status_code=422, detail="decision must be APPROVED, REJECTED, or SUSPENDED.")

    with get_db_conn() as conn:
        doc = row_to_dict(conn.execute("SELECT * FROM doctor_profiles WHERE id = ?", (doctor_id,)).fetchone())
        if not doc:
            raise HTTPException(status_code=404, detail="Doctor profile not found.")

        prev_status = doc["verification_status"]
        is_active = 1 if payload.decision == "APPROVED" else 0
        membership_state = "APPROVED" if payload.decision == "APPROVED" else ("REJECTED" if payload.decision == "REJECTED" else "REVOKED")
        now = utc_now_iso()

        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            "UPDATE doctor_profiles SET verification_status = ?, is_active = ?, updated_at_utc = ? WHERE id = ?",
            (payload.decision, is_active, now, doctor_id),
        )
        conn.execute(
            "UPDATE role_memberships SET approval_state = ?, granted_by_user_id = ? WHERE user_id = ? AND role = 'DOCTOR'",
            (membership_state, user["id"], doc["user_id"]),
        )
        conn.execute(
            """
            INSERT INTO doctor_verification_events
            (id, doctor_profile_id, reviewer_admin_id, from_status, to_status, reason, created_at_utc)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (new_id("docver"), doctor_id, user["id"], prev_status, payload.decision, payload.reason.strip(), now),
        )
        notify_user(
            conn,
            recipient_user_id=doc["user_id"],
            topic="DOCTOR_VERIFICATION",
            entity_type="doctor_profile",
            entity_id=doctor_id,
            title_bn=f"আপনার ডাক্তার প্রোফাইল যাচাইকরণ অবস্থা: {payload.decision}",
            title_en=f"Your doctor verification status is now: {payload.decision}",
        )
        record_audit(
            conn,
            actor_user_id=user["id"],
            actor_role="ADMIN",
            action_type=f"ADMIN_DOCTOR_{payload.decision}",
            target_resource="doctor_profiles",
            target_id=doctor_id,
            details={"from": prev_status, "to": payload.decision, "reason": payload.reason.strip()},
        )
        conn.execute("COMMIT;")
        updated = row_to_dict(conn.execute("SELECT * FROM doctor_profiles WHERE id = ?", (doctor_id,)).fetchone())
        return {"doctor_profile": updated}


@router.get("/users")
def list_admin_users(role: Optional[str] = None, q: Optional[str] = None, user: dict = Depends(require_role("ADMIN"))):
    sql = """
        SELECT id, email, phone, full_name, primary_role, preferred_locale,
               account_status, is_synthetic, last_login_at_utc, created_at_utc
          FROM users
         WHERE 1=1
    """
    params: list = []
    if role:
        sql += " AND primary_role = ?"
        params.append(role)
    if q:
        like = f"%{q.strip()}%"
        sql += " AND (full_name LIKE ? OR COALESCE(email,'') LIKE ? OR COALESCE(phone,'') LIKE ?)"
        params.extend([like, like, like])
    sql += " ORDER BY created_at_utc DESC"
    with get_db_conn() as conn:
        return {"users": rows_to_dicts(conn.execute(sql, tuple(params)).fetchall())}


@router.patch("/users/{user_id}/status")
def update_user_status(user_id: str, payload: UserStatusPatchRequest, user: dict = Depends(require_role("ADMIN"))):
    if payload.account_status not in ("ACTIVE", "SUSPENDED", "LOCKED"):
        raise HTTPException(status_code=422, detail="account_status must be ACTIVE, SUSPENDED, or LOCKED.")
    if user_id == user["id"] and payload.account_status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Admin cannot suspend or lock their own active account.")

    with get_db_conn() as conn:
        target = row_to_dict(conn.execute("SELECT id, account_status, primary_role, is_synthetic FROM users WHERE id = ?", (user_id,)).fetchone())
        if not target:
            raise HTTPException(status_code=404, detail="User not found.")
        if user.get("is_synthetic") and not target.get("is_synthetic"):
            conn.execute("BEGIN IMMEDIATE;")
            record_audit(
                conn,
                actor_user_id=user["id"],
                actor_role="ADMIN",
                action_type="DEMO_ADMIN_MODIFICATION_BLOCKED",
                target_resource="users",
                target_id=user_id,
                outcome="DENIED",
                details={"reason": "Demo admin attempted to modify real non-synthetic user"},
            )
            conn.execute("COMMIT;")
            raise HTTPException(
                status_code=403,
                detail="DEMO_ADMIN_RESTRICTION: Demo admin accounts cannot modify real non-synthetic system users.",
            )
        now = utc_now_iso()
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            "UPDATE users SET account_status = ?, updated_at_utc = ? WHERE id = ?",
            (payload.account_status, now, user_id),
        )
        if payload.account_status != "ACTIVE":
            conn.execute("UPDATE sessions SET revoked_at_utc = ? WHERE user_id = ? AND revoked_at_utc IS NULL", (now, user_id))
        record_audit(
            conn,
            actor_user_id=user["id"],
            actor_role="ADMIN",
            action_type="ADMIN_USER_STATUS_UPDATED",
            target_resource="users",
            target_id=user_id,
            details={"from": target["account_status"], "to": payload.account_status, "reason": payload.reason},
        )
        conn.execute("COMMIT;")
        return {"user_id": user_id, "account_status": payload.account_status}


@router.post("/staff/provision", status_code=201)
def provision_staff_user(payload: StaffProvisionRequest, user: dict = Depends(require_role("ADMIN"))):
    if payload.role not in ("SUPPORT", "ADMIN", "PATIENT"):
        raise HTTPException(status_code=422, detail="Provisionable role must be SUPPORT, ADMIN, or PATIENT.")

    email = payload.email.strip().lower()
    phone = payload.phone.strip() if payload.phone else None
    new_uid = new_id("usr")
    now = utc_now_iso()
    pw_hash = hash_password(payload.password)

    with get_db_conn() as conn:
        conn.execute("BEGIN IMMEDIATE;")
        try:
            dup = conn.execute(
                "SELECT 1 FROM users WHERE email = ? OR (? IS NOT NULL AND phone = ?)",
                (email, phone, phone),
            ).fetchone()
            if dup:
                conn.execute("ROLLBACK;")
                raise HTTPException(status_code=409, detail="Email or phone already exists.")
            conn.execute(
                """
                INSERT INTO users (id, email, phone, password_hash, full_name, primary_role, preferred_locale, account_status, is_synthetic, created_at_utc, updated_at_utc)
                VALUES (?, ?, ?, ?, ?, ?, 'bn', 'ACTIVE', 0, ?, ?)
                """,
                (new_uid, email, phone, pw_hash, payload.full_name.strip(), payload.role, now, now),
            )
            conn.execute(
                """
                INSERT INTO role_memberships (id, user_id, role, approval_state, granted_by_user_id)
                VALUES (?, ?, ?, 'APPROVED', ?)
                """,
                (new_id("role"), new_uid, payload.role, user["id"]),
            )
            if payload.role == "PATIENT":
                conn.execute(
                    """
                    INSERT INTO patient_profiles (id, owner_user_id, display_name, relationship_type, district, preferred_locale, is_synthetic)
                    VALUES (?, ?, ?, 'SELF', 'Dhaka', 'bn', 0)
                    """,
                    (new_id("pat"), new_uid, payload.full_name.strip()),
                )
            record_audit(
                conn,
                actor_user_id=user["id"],
                actor_role="ADMIN",
                action_type="ADMIN_PROVISIONED_ACCOUNT",
                target_resource="users",
                target_id=new_uid,
                details={"role": payload.role, "email": mask_personal_identifier(email)},
            )
            conn.execute("COMMIT;")
        except HTTPException:
            raise
        except sqlite3.IntegrityError:
            if conn.in_transaction:
                conn.execute("ROLLBACK;")
            raise HTTPException(status_code=409, detail="Email or phone already exists.")
        except Exception:
            if conn.in_transaction:
                conn.execute("ROLLBACK;")
            raise
        return {"user_id": new_uid, "email": email, "role": payload.role}


@router.get("/appointments")
def list_admin_appointments(status: Optional[str] = None, user: dict = Depends(require_role("ADMIN"))):
    # Excludes private prep_symptoms_text and raw clinical notes
    sql = """
        SELECT a.id, a.booking_reference, a.consultation_mode, a.is_instant, a.status,
               a.fee_minor_poisha, a.payment_requirement, a.created_at_utc, a.updated_at_utc,
               pp.display_name AS patient_name,
               d.display_name AS doctor_name, d.specialty,
               s.start_utc, s.end_utc,
               COALESCE(dp.status, 'NONE') AS demo_payment_status
          FROM appointments a
          JOIN patient_profiles pp ON pp.id = a.patient_profile_id
          JOIN doctor_profiles d ON d.id = a.doctor_id
          JOIN appointment_slots s ON s.id = a.slot_id
          LEFT JOIN demo_payments dp ON dp.appointment_id = a.id
         WHERE 1=1
    """
    params: list = []
    if status:
        sql += " AND a.status = ?"
        params.append(status)
    sql += " ORDER BY a.created_at_utc DESC LIMIT 100"
    with get_db_conn() as conn:
        return {"appointments": rows_to_dicts(conn.execute(sql, tuple(params)).fetchall())}


@router.patch("/appointments/{appointment_id}/override")
def override_appointment_status(
    appointment_id: str,
    payload: AppointmentOverrideRequest,
    user: dict = Depends(require_role("ADMIN")),
):
    if payload.status not in ("CANCELLED", "CONFIRMED", "NO_SHOW", "COMPLETED"):
        raise HTTPException(status_code=422, detail="Invalid override status.")
    with get_db_conn() as conn:
        appt = row_to_dict(conn.execute("SELECT * FROM appointments WHERE id = ?", (appointment_id,)).fetchone())
        if not appt:
            raise HTTPException(status_code=404, detail="Appointment not found.")
        now = utc_now_iso()
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            "UPDATE appointments SET status = ?, version = version + 1, updated_at_utc = ? WHERE id = ?",
            (payload.status, now, appointment_id),
        )
        if payload.status == "CANCELLED" and appt["status"] != "CANCELLED":
            conn.execute(
                """
                UPDATE appointment_slots
                   SET reserved_count = CASE WHEN reserved_count > 0 THEN reserved_count - 1 ELSE 0 END,
                       state = CASE WHEN state IN ('BOOKED', 'HELD') AND reserved_count <= 1 THEN 'OPEN' ELSE state END,
                       updated_at_utc = ?
                 WHERE id = ?
                """,
                (now, appt["slot_id"]),
            )
        conn.execute(
            "INSERT INTO appointment_events (id, appointment_id, actor_user_id, actor_role, from_status, to_status, reason) VALUES (?, ?, ?, 'ADMIN', ?, ?, ?)",
            (new_id("appevt"), appointment_id, user["id"], appt["status"], payload.status, payload.reason.strip()),
        )
        record_audit(
            conn,
            actor_user_id=user["id"],
            actor_role="ADMIN",
            action_type="ADMIN_APPOINTMENT_OVERRIDE",
            target_resource="appointments",
            target_id=appointment_id,
            details={"from": appt["status"], "to": payload.status, "reason": payload.reason.strip()},
        )
        conn.execute("COMMIT;")
        return {"appointment_id": appointment_id, "status": payload.status}


@router.get("/payments")
def list_admin_payments(
    status: Optional[str] = None,
    revenue_stream: Optional[str] = None,
    billing_month: Optional[str] = None,
    user: dict = Depends(require_role("ADMIN")),
):
    sql = """
        SELECT dp.*, a.booking_reference, u.full_name AS payer_name, u.email AS payer_email,
               dr.receipt_number
          FROM demo_payments dp
          JOIN appointments a ON a.id = dp.appointment_id
          JOIN users u ON u.id = dp.payer_user_id
          LEFT JOIN demo_receipts dr ON dr.payment_id = dp.id
         WHERE 1=1
    """
    params: list = []
    if status:
        sql += " AND dp.status = ?"
        params.append(status)
    sql += " ORDER BY dp.created_at_utc DESC LIMIT 100"
    with get_db_conn() as conn:
        legacy_payments = rows_to_dicts(conn.execute(sql, tuple(params)).fetchall())
        finance = _build_admin_finance_snapshot(
            conn,
            status_filter=status,
            stream_filter=revenue_stream,
            month_filter=billing_month,
        )
        return {
            "payments": legacy_payments,
            **finance,
        }


@router.get("/finance/overview")
def get_admin_finance_overview(
    status: Optional[str] = None,
    revenue_stream: Optional[str] = None,
    billing_month: Optional[str] = None,
    user: dict = Depends(require_role("ADMIN")),
):
    with get_db_conn() as conn:
        return _build_admin_finance_snapshot(
            conn,
            status_filter=status,
            stream_filter=revenue_stream,
            month_filter=billing_month,
        )


@router.post("/finance/transactions/{txn_id}/refund")
def refund_platform_transaction(txn_id: str, payload: DemoRefundRequest, user: dict = Depends(require_role("ADMIN"))):
    with get_db_conn() as conn:
        tx = row_to_dict(conn.execute("SELECT * FROM platform_transactions WHERE id = ?", (txn_id,)).fetchone())
        if not tx:
            raise HTTPException(status_code=404, detail="Platform transaction not found.")
        if tx["status"] == "REFUNDED":
            raise HTTPException(status_code=409, detail="Transaction is already refunded.")
        now = utc_now_iso()
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            "UPDATE platform_transactions SET status = 'REFUNDED', updated_at_utc = ? WHERE id = ?",
            (now, txn_id),
        )
        if tx.get("related_demo_payment_id"):
            conn.execute(
                "UPDATE demo_payments SET status = 'DEMO_REFUNDED', version = version + 1, updated_at_utc = ? WHERE id = ?",
                (now, tx["related_demo_payment_id"]),
            )
        _recompute_bank_balances(conn, now)
        record_audit(
            conn,
            actor_user_id=user["id"],
            actor_role="ADMIN",
            action_type="ADMIN_PLATFORM_TXN_REFUNDED",
            target_resource="platform_transactions",
            target_id=txn_id,
            details={"txn_ref": tx["txn_ref"], "gross_poisha": tx["gross_amount_minor_poisha"], "reason": payload.reason},
        )
        conn.execute("COMMIT;")
        return {"transaction_id": txn_id, "txn_ref": tx["txn_ref"], "status": "REFUNDED"}


@router.post("/finance/banks/{bank_id}/settle")
def settle_bank_account(bank_id: str, user: dict = Depends(require_role("ADMIN"))):
    with get_db_conn() as conn:
        bank = row_to_dict(conn.execute("SELECT * FROM bank_settlement_accounts WHERE id = ?", (bank_id,)).fetchone())
        if not bank:
            raise HTTPException(status_code=404, detail="Bank settlement account not found.")
        now = utc_now_iso()
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            "UPDATE platform_transactions SET status = 'SETTLED', updated_at_utc = ? WHERE bank_account_id = ? AND status = 'PAID'",
            (now, bank_id),
        )
        conn.execute(
            "UPDATE bank_settlement_accounts SET settlement_status = 'AUDITED', last_reconciled_at_utc = ? WHERE id = ?",
            (now, bank_id),
        )
        _recompute_bank_balances(conn, now)
        record_audit(
            conn,
            actor_user_id=user["id"],
            actor_role="ADMIN",
            action_type="ADMIN_BANK_SETTLEMENT_RECONCILED",
            target_resource="bank_settlement_accounts",
            target_id=bank_id,
            details={"account_code": bank["account_code"], "balance_poisha": bank["balance_minor_poisha"]},
        )
        conn.execute("COMMIT;")
        updated = row_to_dict(conn.execute("SELECT * FROM bank_settlement_accounts WHERE id = ?", (bank_id,)).fetchone())
        return {"bank_account": updated}


@router.post("/payments/{payment_id}/refund")
def refund_demo_payment(payment_id: str, payload: DemoRefundRequest, user: dict = Depends(require_role("ADMIN"))):
    with get_db_conn() as conn:
        pay = row_to_dict(conn.execute("SELECT * FROM demo_payments WHERE id = ?", (payment_id,)).fetchone())
        if not pay:
            raise HTTPException(status_code=404, detail="Demo payment not found.")
        if pay["status"] != "DEMO_PAID":
            raise HTTPException(status_code=409, detail=f"Cannot refund payment in status {pay['status']}.")
        now = utc_now_iso()
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            "UPDATE demo_payments SET status = 'DEMO_REFUNDED', version = version + 1, updated_at_utc = ? WHERE id = ?",
            (now, payment_id),
        )
        conn.execute(
            """
            INSERT INTO demo_payment_events (id, payment_id, from_status, to_status, actor_user_id, note)
            VALUES (?, ?, 'DEMO_PAID', 'DEMO_REFUNDED', ?, ?)
            """,
            (new_id("payevt"), payment_id, user["id"], payload.reason),
        )
        notify_user(
            conn,
            recipient_user_id=pay["payer_user_id"],
            topic="DEMO_REFUND",
            entity_type="demo_payment",
            entity_id=payment_id,
            title_bn=f"ডেমো পেমেন্ট {pay['demo_ref']} রিফান্ড (SIMULATED) সম্পন্ন হয়েছে।",
            title_en=f"Simulated demo payment {pay['demo_ref']} marked DEMO_REFUNDED.",
        )
        record_audit(
            conn,
            actor_user_id=user["id"],
            actor_role="ADMIN",
            action_type="ADMIN_DEMO_PAYMENT_REFUNDED",
            target_resource="demo_payments",
            target_id=payment_id,
            details={"demo_ref": pay["demo_ref"], "reason": payload.reason},
        )
        conn.execute("COMMIT;")
        return {"payment_id": payment_id, "status": "DEMO_REFUNDED"}


@router.get("/catalog")
def get_admin_catalog(user: dict = Depends(require_role("ADMIN"))):
    with get_db_conn() as conn:
        return {
            "specialties": rows_to_dicts(conn.execute("SELECT * FROM specialties ORDER BY name_en").fetchall()),
            "diagnostic_tests": rows_to_dicts(conn.execute("SELECT * FROM diagnostic_tests ORDER BY name_en").fetchall()),
            "healthcare_plans": rows_to_dicts(conn.execute("SELECT * FROM healthcare_plans ORDER BY monthly_fee_minor_poisha").fetchall()),
            "facilities": rows_to_dicts(conn.execute("SELECT * FROM facilities ORDER BY district, name").fetchall()),
            "feature_flags": rows_to_dicts(conn.execute("SELECT * FROM feature_flags ORDER BY flag_key").fetchall()),
        }


@router.post("/catalog/specialties", status_code=201)
def add_specialty(payload: SpecialtyCreateRequest, user: dict = Depends(require_role("ADMIN"))):
    if payload.max_fee_minor_poisha < payload.min_fee_minor_poisha:
        raise HTTPException(status_code=422, detail="max_fee_minor_poisha must be >= min_fee_minor_poisha.")
    spec_id = new_id("spec")
    with get_db_conn() as conn:
        if conn.execute("SELECT 1 FROM specialties WHERE slug = ?", (payload.slug.strip(),)).fetchone():
            raise HTTPException(status_code=409, detail="Specialty slug already exists.")
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            """
            INSERT INTO specialties (id, slug, name_bn, name_en, min_fee_minor_poisha, max_fee_minor_poisha, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 1)
            """,
            (spec_id, payload.slug.strip(), payload.name_bn.strip(), payload.name_en.strip(), payload.min_fee_minor_poisha, payload.max_fee_minor_poisha),
        )
        record_audit(conn, actor_user_id=user["id"], actor_role="ADMIN", action_type="ADMIN_CATALOG_SPECIALTY_ADDED", target_resource="specialties", target_id=spec_id)
        conn.execute("COMMIT;")
        return {"specialty": row_to_dict(conn.execute("SELECT * FROM specialties WHERE id = ?", (spec_id,)).fetchone())}


@router.post("/catalog/diagnostic-tests", status_code=201)
def add_diagnostic_test(payload: DiagnosticTestCreateRequest, user: dict = Depends(require_role("ADMIN"))):
    tid = new_id("diag")
    with get_db_conn() as conn:
        if conn.execute("SELECT 1 FROM diagnostic_tests WHERE code = ?", (payload.code.strip().upper(),)).fetchone():
            raise HTTPException(status_code=409, detail="Diagnostic test code already exists.")
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            """
            INSERT INTO diagnostic_tests (id, code, name_bn, name_en, category, sample_type, fee_minor_poisha, turnaround_hours, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            """,
            (tid, payload.code.strip().upper(), payload.name_bn.strip(), payload.name_en.strip(), payload.category.strip(), payload.sample_type.strip(), payload.fee_minor_poisha, payload.turnaround_hours),
        )
        record_audit(conn, actor_user_id=user["id"], actor_role="ADMIN", action_type="ADMIN_CATALOG_DIAGNOSTIC_ADDED", target_resource="diagnostic_tests", target_id=tid)
        conn.execute("COMMIT;")
        return {"diagnostic_test": row_to_dict(conn.execute("SELECT * FROM diagnostic_tests WHERE id = ?", (tid,)).fetchone())}


@router.post("/catalog/facilities", status_code=201)
def add_facility(payload: FacilityCreateRequest, user: dict = Depends(require_role("ADMIN"))):
    if payload.facility_type not in ("HOSPITAL", "CLINIC", "PHARMACY", "DIAGNOSTIC"):
        raise HTTPException(status_code=422, detail="Invalid facility_type.")
    fid = new_id("fac")
    with get_db_conn() as conn:
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            """
            INSERT INTO facilities (id, name, facility_type, district, address, phone, source_name, last_verified_date)
            VALUES (?, ?, ?, ?, ?, ?, 'Admin Curated Demo Directory', ?)
            """,
            (fid, payload.name.strip(), payload.facility_type, payload.district.strip(), payload.address.strip(), payload.phone, utc_now_iso()[:10]),
        )
        record_audit(conn, actor_user_id=user["id"], actor_role="ADMIN", action_type="ADMIN_CATALOG_FACILITY_ADDED", target_resource="facilities", target_id=fid)
        conn.execute("COMMIT;")
        return {"facility": row_to_dict(conn.execute("SELECT * FROM facilities WHERE id = ?", (fid,)).fetchone())}


@router.patch("/feature-flags/{flag_key}")
def update_feature_flag(flag_key: str, payload: FeatureFlagPatchRequest, user: dict = Depends(require_role("ADMIN"))):
    with get_db_conn() as conn:
        existing = row_to_dict(conn.execute("SELECT * FROM feature_flags WHERE flag_key = ?", (flag_key,)).fetchone())
        if not existing:
            raise HTTPException(status_code=404, detail="Feature flag not found.")
        now = utc_now_iso()
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            "UPDATE feature_flags SET enabled = ?, updated_by_admin_id = ?, updated_at_utc = ? WHERE flag_key = ?",
            (1 if payload.enabled else 0, user["id"], now, flag_key),
        )
        record_audit(
            conn,
            actor_user_id=user["id"],
            actor_role="ADMIN",
            action_type="ADMIN_FEATURE_FLAG_UPDATED",
            target_resource="feature_flags",
            target_id=flag_key,
            details={"enabled": payload.enabled},
        )
        conn.execute("COMMIT;")
        return {"flag": row_to_dict(conn.execute("SELECT * FROM feature_flags WHERE flag_key = ?", (flag_key,)).fetchone())}


@router.get("/escalations")
def list_admin_escalations(user: dict = Depends(require_role("ADMIN"))):
    with get_db_conn() as conn:
        rows = rows_to_dicts(
            conn.execute(
                """
                SELECT st.id, st.ticket_number, st.category, st.priority, st.status, st.subject,
                       st.created_at_utc, st.updated_at_utc, u.full_name AS requester_name, u.email AS requester_email
                  FROM support_tickets st
                  JOIN users u ON u.id = st.requester_user_id
                 WHERE st.status = 'ESCALATED' OR st.category = 'SAFETY_ESCALATION'
                 ORDER BY st.updated_at_utc DESC
                """
            ).fetchall()
        )
        return {"escalations": rows}


@router.get("/audit-logs")
def list_audit_logs(
    outcome: Optional[str] = None,
    actor_role: Optional[str] = None,
    action_type: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(require_role("ADMIN")),
):
    sql = "SELECT * FROM audit_logs WHERE 1=1"
    params: list = []
    if outcome:
        sql += " AND outcome = ?"
        params.append(outcome)
    if actor_role:
        sql += " AND actor_role = ?"
        params.append(actor_role)
    if action_type:
        sql += " AND action_type LIKE ?"
        params.append(f"%{action_type.strip()}%")
    if q:
        like = f"%{q.strip()}%"
        sql += " AND (action_type LIKE ? OR target_resource LIKE ? OR COALESCE(details_redacted_json,'') LIKE ?)"
        params.extend([like, like, like])
    sql += " ORDER BY created_at_utc DESC LIMIT ?"
    params.append(min(max(limit, 1), 300))
    with get_db_conn() as conn:
        return {"audit_logs": rows_to_dicts(conn.execute(sql, tuple(params)).fetchall())}


@router.get("/clinical-notes/{note_id}")
def redact_clinical_note_for_admin(note_id: str, user: dict = Depends(require_role("ADMIN"))):
    """Privacy boundary: Admin governs operations & verification but cannot read private clinician consultation prose."""
    with get_db_conn() as conn:
        conn.execute("BEGIN IMMEDIATE;")
        record_audit(
            conn,
            actor_user_id=user["id"],
            actor_role="ADMIN",
            action_type="ADMIN_CLINICAL_NOTE_REDACTED",
            target_resource="consultation_notes",
            target_id=note_id,
            outcome="DENIED",
            details={"policy": "PRIVACY_CLINICAL_NOTE_ISOLATION"},
        )
        conn.execute("COMMIT;")
    raise HTTPException(
        status_code=403,
        detail="CLINICAL_NOTE_REDACTED_FOR_ADMIN: Private doctor consultation notes cannot be read via Admin Governance APIs.",
    )
