from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..core.audit import notify_user, record_audit
from ..core.dependencies import require_approved_doctor, require_role
from ..core.security import new_id, utc_now_iso
from ..db.sqlite import get_db_conn, row_to_dict, rows_to_dicts

router = APIRouter(prefix="/v1/doctor", tags=["Doctor Portal & Consultation Workspace"])


def _doctor_id_of(user: dict) -> str:
    doc = user.get("doctor_profile") or {}
    doc_id = doc.get("id")
    if not doc_id:
        raise HTTPException(status_code=403, detail="Doctor profile not found.")
    return doc_id


class DoctorProfilePatchRequest(BaseModel):
    display_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    display_name_bn: Optional[str] = Field(default=None, max_length=120)
    practice_location: Optional[str] = Field(default=None, max_length=150)
    district: Optional[str] = Field(default=None, max_length=80)
    languages_csv: Optional[str] = Field(default=None, max_length=120)
    symptom_tags_csv: Optional[str] = Field(default=None, max_length=250)
    consultation_modality: Optional[str] = None
    bio: Optional[str] = Field(default=None, max_length=1000)
    bio_bn: Optional[str] = Field(default=None, max_length=1000)
    consultation_fee_minor_poisha: Optional[int] = Field(default=None, ge=0, le=5000000)
    followup_fee_minor_poisha: Optional[int] = Field(default=None, ge=0, le=5000000)
    slot_duration_minutes: Optional[int] = None


class OnlineStatusPatchRequest(BaseModel):
    is_online_now: bool


class AvailabilityRuleCreateRequest(BaseModel):
    weekday: int = Field(..., ge=0, le=6)
    start_local_hhmm: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    end_local_hhmm: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    break_start_hhmm: Optional[str] = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    break_end_hhmm: Optional[str] = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    slot_duration_minutes: int = Field(default=20)


class TimeOffCreateRequest(BaseModel):
    start_utc: str
    end_utc: str
    reason_code: str = Field(default="LEAVE", max_length=40)
    note: Optional[str] = Field(default=None, max_length=300)


class SlotGenerateRequest(BaseModel):
    date_local: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    start_hhmm: str = Field(default="10:00", pattern=r"^\d{2}:\d{2}$")
    end_hhmm: str = Field(default="12:00", pattern=r"^\d{2}:\d{2}$")
    slot_duration_minutes: int = Field(default=20)
    modality: str = Field(default="ONLINE_DEMO")
    capacity: int = Field(default=1, ge=1, le=5)
    # Optional direct UTC slot creation (useful for tests & single custom slot)
    start_utc: Optional[str] = None
    end_utc: Optional[str] = None


class AppointmentStatusPatchRequest(BaseModel):
    status: str
    reason: Optional[str] = Field(default=None, max_length=300)


class ConsultationNoteSaveRequest(BaseModel):
    subjective_notes: str = Field(default="", max_length=3000)
    assessment_summary: str = Field(default="", max_length=2000)
    advice_summary: str = Field(default="", max_length=2000)
    followup_instruction: Optional[str] = Field(default=None, max_length=1000)
    followup_date: Optional[str] = None
    state: str = Field(default="DRAFT")  # DRAFT | SIGNED | ADDENDUM
    parent_note_id: Optional[str] = None


class EPrescriptionCreateRequest(BaseModel):
    diagnosis_summary: str = Field(..., min_length=2, max_length=500)
    medications: list[dict] = Field(..., min_length=1)
    advice_notes: Optional[str] = Field(default=None, max_length=1500)
    followup_date: Optional[str] = None


def _build_doctor_wallet(conn: sqlite3.Connection, doc_id: str, profile: dict) -> dict:
    doc_name_base = (profile.get("display_name") or "").replace(" (Demo)", "").strip()
    # Fetch consultation transactions for this clinician
    txs = rows_to_dicts(
        conn.execute(
            """
            SELECT pt.id, pt.txn_ref, pt.receipt_number, pt.item_title, pt.revenue_stream,
                   pt.payer_name_masked, pt.gross_amount_minor_poisha, pt.commission_rate_pct,
                   pt.commission_minor_poisha, pt.net_partner_payout_minor_poisha,
                   pt.status, pt.gateway_method, pt.billing_month, pt.created_at_utc,
                   COALESCE(a.booking_reference, 'TELE-DIRECT') AS booking_reference,
                   COALESCE(pp.display_name, pt.payer_name_masked) AS patient_name
              FROM platform_transactions pt
              LEFT JOIN appointments a ON a.id = pt.related_appointment_id
              LEFT JOIN patient_profiles pp ON pp.id = a.patient_profile_id
             WHERE pt.revenue_stream = 'DOCTOR_CONSULTATION'
               AND (
                    pt.beneficiary_entity LIKE ?
                    OR (pt.related_appointment_id IS NOT NULL AND a.doctor_id = ?)
               )
             ORDER BY pt.created_at_utc DESC
            """,
            (f"%{doc_name_base}%", doc_id),
        ).fetchall()
    )

    gross_poisha = sum(t["gross_amount_minor_poisha"] for t in txs)
    comm_poisha = sum(t["commission_minor_poisha"] for t in txs)
    net_earned_poisha = sum(t["net_partner_payout_minor_poisha"] for t in txs)
    settled_poisha = sum(t["net_partner_payout_minor_poisha"] for t in txs if t["status"] == "SETTLED")
    available_balance_poisha = sum(t["net_partner_payout_minor_poisha"] for t in txs if t["status"] in ("PAID", "SETTLED"))
    pending_payout_poisha = sum(t["net_partner_payout_minor_poisha"] for t in txs if t["status"] == "PAID")

    payout_account = row_to_dict(
        conn.execute("SELECT * FROM bank_settlement_accounts WHERE id = 'bank-brac-payout'").fetchone()
    ) or {
        "account_code": "BRACBANK-SETTLE-05",
        "provider_name": "BRAC Bank PLC Partner Payout Account",
        "account_number_masked": "A/C 1509-••••-3310 (Doctor / Lab / ePharma)",
    }

    return {
        "doctor_id": doc_id,
        "doctor_name": profile.get("display_name"),
        "bmdc_reg": profile.get("bmdc_demo_reg"),
        "consultation_fee_bdt": (profile.get("consultation_fee_minor_poisha") or 50000) / 100,
        "commission_rate_pct": 15.0,
        "clinician_payout_pct": 85.0,
        "total_consultations_count": len(txs),
        "gross_consultations_poisha": gross_poisha,
        "platform_commission_poisha": comm_poisha,
        "net_earned_poisha": net_earned_poisha,
        "available_balance_poisha": available_balance_poisha,
        "settled_payout_poisha": settled_poisha,
        "pending_payout_poisha": pending_payout_poisha,
        "payout_account": payout_account,
        "payout_schedule": "Weekly Automatic Settlement (Every Sunday 10:00 AM)",
        "transactions": txs,
    }


@router.get("/dashboard")
def doctor_dashboard(user: dict = Depends(require_role("DOCTOR"))):
    doc_id = _doctor_id_of(user)
    with get_db_conn() as conn:
        profile = row_to_dict(
            conn.execute("SELECT * FROM doctor_profiles WHERE id = ?", (doc_id,)).fetchone()
        )
        verification_events = rows_to_dicts(
            conn.execute(
                "SELECT * FROM doctor_verification_events WHERE doctor_profile_id = ? ORDER BY created_at_utc DESC",
                (doc_id,),
            ).fetchall()
        )
        if not profile or profile["verification_status"] != "APPROVED":
            return {
                "approved": False,
                "verification_status": profile["verification_status"] if profile else "PENDING",
                "doctor_profile": profile,
                "verification_events": verification_events,
                "message": "Admin verification is required before activating clinical queue and public slots.",
            }

        counts_row = row_to_dict(
            conn.execute(
                """
                SELECT
                    SUM(CASE WHEN status IN ('CONFIRMED', 'CHECKED_IN', 'IN_CONSULTATION', 'AWAITING_DEMO_PAYMENT') THEN 1 ELSE 0 END) AS active_queue_count,
                    SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_count,
                    SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_count
                  FROM appointments
                 WHERE doctor_id = ?
                """,
                (doc_id,),
            ).fetchone()
        ) or {}
        open_slots_count = conn.execute(
            "SELECT COUNT(*) FROM appointment_slots WHERE doctor_id = ? AND state = 'OPEN' AND start_utc >= ?",
            (doc_id, utc_now_iso()),
        ).fetchone()[0]
        demo_payout_row = conn.execute(
            """
            SELECT COALESCE(SUM(dp.amount_minor_poisha), 0) AS demo_gross_poisha
              FROM demo_payments dp
              JOIN appointments a ON a.id = dp.appointment_id
             WHERE a.doctor_id = ? AND dp.status = 'DEMO_PAID'
            """,
            (doc_id,),
        ).fetchone()
        upcoming_queue = rows_to_dicts(
            conn.execute(
                """
                SELECT a.id, a.booking_reference, a.status, a.consultation_mode, a.is_instant,
                       a.visit_reason_summary, a.fee_minor_poisha, a.created_at_utc,
                       pp.display_name AS patient_name, pp.relationship_type, pp.sex, pp.date_of_birth,
                       s.start_utc, s.end_utc,
                       COALESCE(dp.status, 'NONE') AS demo_payment_status
                  FROM appointments a
                  JOIN patient_profiles pp ON pp.id = a.patient_profile_id
                  JOIN appointment_slots s ON s.id = a.slot_id
                  LEFT JOIN demo_payments dp ON dp.appointment_id = a.id
                 WHERE a.doctor_id = ?
                 ORDER BY CASE WHEN a.status IN ('IN_CONSULTATION', 'CHECKED_IN', 'CONFIRMED') THEN 0 ELSE 1 END, s.start_utc ASC
                 LIMIT 15
                """,
                (doc_id,),
            ).fetchall()
        )
        wallet = _build_doctor_wallet(conn, doc_id, profile)
        return {
            "approved": True,
            "verification_status": profile["verification_status"],
            "doctor_profile": profile,
            "verification_events": verification_events,
            "kpis": {
                "active_queue": counts_row.get("active_queue_count") or 0,
                "completed_consultations": counts_row.get("completed_count") or 0,
                "open_slots": open_slots_count,
                "simulated_gross_poisha": demo_payout_row[0] if demo_payout_row else 0,
                "net_earned_poisha": wallet["net_earned_poisha"],
                "available_balance_poisha": wallet["available_balance_poisha"],
            },
            "wallet": wallet,
            "upcoming_queue": upcoming_queue,
        }


@router.get("/wallet")
def get_doctor_wallet(user: dict = Depends(require_role("DOCTOR"))):
    """Returns the authenticated clinician's balance, payout stats, 15% platform commission cut, and consultation transaction history."""
    doc_id = _doctor_id_of(user)
    with get_db_conn() as conn:
        profile = row_to_dict(
            conn.execute("SELECT * FROM doctor_profiles WHERE id = ?", (doc_id,)).fetchone()
        )
        if not profile:
            raise HTTPException(status_code=404, detail="Doctor profile not found.")
        return _build_doctor_wallet(conn, doc_id, profile)


@router.post("/wallet/payout-request")
def request_doctor_payout(user: dict = Depends(require_role("DOCTOR"))):
    """Reconciles and requests settlement of pending consultation fees to the doctor's partner payout bank account."""
    doc_id = _doctor_id_of(user)
    with get_db_conn() as conn:
        profile = row_to_dict(
            conn.execute("SELECT * FROM doctor_profiles WHERE id = ?", (doc_id,)).fetchone()
        )
        if not profile:
            raise HTTPException(status_code=404, detail="Doctor profile not found.")
        wallet = _build_doctor_wallet(conn, doc_id, profile)
        if wallet["pending_payout_poisha"] <= 0:
            return {
                "message": "All consultation balances are already reconciled and settled to your BRAC Bank partner account.",
                "wallet": wallet,
            }

        doc_name_base = (profile.get("display_name") or "").replace(" (Demo)", "").strip()
        now = utc_now_iso()
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            """
            UPDATE platform_transactions
               SET status = 'SETTLED', updated_at_utc = ?
             WHERE revenue_stream = 'DOCTOR_CONSULTATION'
               AND status = 'PAID'
               AND (
                    beneficiary_entity LIKE ?
                    OR related_appointment_id IN (SELECT id FROM appointments WHERE doctor_id = ?)
               )
            """,
            (now, f"%{doc_name_base}%", doc_id),
        )
        record_audit(
            conn,
            actor_user_id=user["id"],
            actor_role="DOCTOR",
            action_type="DOCTOR_PAYOUT_SETTLEMENT_REQUESTED",
            target_resource="doctor_profiles",
            target_id=doc_id,
            details={"disbursed_poisha": wallet["pending_payout_poisha"], "channel": "BRAC Bank Partner Payout"},
        )
        conn.execute("COMMIT;")
        fresh_wallet = _build_doctor_wallet(conn, doc_id, profile)
        return {
            "message": f"Successfully settled ৳{(wallet['pending_payout_poisha'] / 100):.2f} to {wallet['payout_account']['provider_name']}.",
            "wallet": fresh_wallet,
        }


@router.get("/profile")
def get_doctor_profile(user: dict = Depends(require_role("DOCTOR"))):
    doc_id = _doctor_id_of(user)
    with get_db_conn() as conn:
        profile = row_to_dict(conn.execute("SELECT * FROM doctor_profiles WHERE id = ?", (doc_id,)).fetchone())
        events = rows_to_dicts(
            conn.execute(
                "SELECT * FROM doctor_verification_events WHERE doctor_profile_id = ? ORDER BY created_at_utc DESC",
                (doc_id,),
            ).fetchall()
        )
        return {"doctor_profile": profile, "verification_events": events}


@router.patch("/profile")
def update_doctor_profile(payload: DoctorProfilePatchRequest, user: dict = Depends(require_role("DOCTOR"))):
    doc_id = _doctor_id_of(user)
    if payload.consultation_modality and payload.consultation_modality not in ("IN_CLINIC_DEMO", "ONLINE_DEMO", "BOTH"):
        raise HTTPException(status_code=422, detail="Invalid consultation_modality.")
    if payload.slot_duration_minutes and payload.slot_duration_minutes not in (10, 15, 20, 30, 45, 60):
        raise HTTPException(status_code=422, detail="slot_duration_minutes must be one of 10, 15, 20, 30, 45, 60.")

    updates = []
    params = []
    for field in (
        "display_name",
        "display_name_bn",
        "practice_location",
        "district",
        "languages_csv",
        "symptom_tags_csv",
        "consultation_modality",
        "bio",
        "bio_bn",
        "consultation_fee_minor_poisha",
        "followup_fee_minor_poisha",
        "slot_duration_minutes",
    ):
        val = getattr(payload, field)
        if val is not None:
            updates.append(f"{field} = ?")
            params.append(val)

    if not updates:
        raise HTTPException(status_code=422, detail="No profile fields provided.")

    now = utc_now_iso()
    updates.append("updated_at_utc = ?")
    params.extend([now, doc_id])
    with get_db_conn() as conn:
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(f"UPDATE doctor_profiles SET {', '.join(updates)} WHERE id = ?", tuple(params))
        record_audit(
            conn,
            actor_user_id=user["id"],
            actor_role="DOCTOR",
            action_type="DOCTOR_PROFILE_UPDATED",
            target_resource="doctor_profiles",
            target_id=doc_id,
        )
        conn.execute("COMMIT;")
        profile = row_to_dict(conn.execute("SELECT * FROM doctor_profiles WHERE id = ?", (doc_id,)).fetchone())
        return {"doctor_profile": profile}


@router.patch("/online-status")
def set_online_status(payload: OnlineStatusPatchRequest, user: dict = Depends(require_approved_doctor)):
    doc_id = _doctor_id_of(user)
    now = utc_now_iso()
    with get_db_conn() as conn:
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            "UPDATE doctor_profiles SET is_online_now = ?, updated_at_utc = ? WHERE id = ?",
            (1 if payload.is_online_now else 0, now, doc_id),
        )
        record_audit(
            conn,
            actor_user_id=user["id"],
            actor_role="DOCTOR",
            action_type="DOCTOR_ONLINE_STATUS",
            target_resource="doctor_profiles",
            target_id=doc_id,
            details={"is_online_now": payload.is_online_now},
        )
        conn.execute("COMMIT;")
        return {"is_online_now": payload.is_online_now}


@router.get("/availability")
def get_doctor_availability(user: dict = Depends(require_approved_doctor)):
    doc_id = _doctor_id_of(user)
    with get_db_conn() as conn:
        rules = rows_to_dicts(
            conn.execute(
                "SELECT * FROM doctor_availability_rules WHERE doctor_id = ? ORDER BY weekday, start_local_hhmm",
                (doc_id,),
            ).fetchall()
        )
        time_off = rows_to_dicts(
            conn.execute(
                "SELECT * FROM doctor_time_off WHERE doctor_id = ? ORDER BY start_utc DESC",
                (doc_id,),
            ).fetchall()
        )
        slots = rows_to_dicts(
            conn.execute(
                "SELECT * FROM appointment_slots WHERE doctor_id = ? ORDER BY start_utc ASC LIMIT 80",
                (doc_id,),
            ).fetchall()
        )
        return {"rules": rules, "time_off": time_off, "slots": slots}


@router.post("/availability/rules", status_code=201)
def add_availability_rule(payload: AvailabilityRuleCreateRequest, user: dict = Depends(require_approved_doctor)):
    doc_id = _doctor_id_of(user)
    if payload.end_local_hhmm <= payload.start_local_hhmm:
        raise HTTPException(status_code=422, detail="end_local_hhmm must be after start_local_hhmm.")
    rule_id = new_id("rule")
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    with get_db_conn() as conn:
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            """
            INSERT INTO doctor_availability_rules
            (id, doctor_id, weekday, start_local_hhmm, end_local_hhmm, break_start_hhmm, break_end_hhmm,
             slot_duration_minutes, timezone, effective_from_date, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Asia/Dhaka', ?, 1)
            """,
            (
                rule_id,
                doc_id,
                payload.weekday,
                payload.start_local_hhmm,
                payload.end_local_hhmm,
                payload.break_start_hhmm,
                payload.break_end_hhmm,
                payload.slot_duration_minutes,
                today_str,
            ),
        )
        conn.execute("COMMIT;")
        return {"rule": row_to_dict(conn.execute("SELECT * FROM doctor_availability_rules WHERE id = ?", (rule_id,)).fetchone())}


@router.post("/time-off", status_code=201)
def create_time_off(payload: TimeOffCreateRequest, user: dict = Depends(require_approved_doctor)):
    doc_id = _doctor_id_of(user)
    if payload.end_utc <= payload.start_utc:
        raise HTTPException(status_code=422, detail="end_utc must be after start_utc.")
    to_id = new_id("leave")
    now = utc_now_iso()
    with get_db_conn() as conn:
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            "INSERT INTO doctor_time_off (id, doctor_id, start_utc, end_utc, reason_code, note, created_at_utc) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (to_id, doc_id, payload.start_utc, payload.end_utc, payload.reason_code, payload.note, now),
        )
        blocked = conn.execute(
            """
            UPDATE appointment_slots
               SET state = 'BLOCKED_LEAVE', updated_at_utc = ?
             WHERE doctor_id = ? AND state = 'OPEN'
               AND start_utc < ? AND end_utc > ?
            """,
            (now, doc_id, payload.end_utc, payload.start_utc),
        ).rowcount
        record_audit(
            conn,
            actor_user_id=user["id"],
            actor_role="DOCTOR",
            action_type="DOCTOR_TIME_OFF_CREATED",
            target_resource="doctor_time_off",
            target_id=to_id,
            details={"blocked_slots": blocked},
        )
        conn.execute("COMMIT;")
        return {"time_off_id": to_id, "blocked_slots": blocked}


@router.post("/slots/generate", status_code=201)
def generate_slots(payload: SlotGenerateRequest, user: dict = Depends(require_approved_doctor)):
    doc_id = _doctor_id_of(user)
    if payload.modality not in ("ONLINE_DEMO", "IN_CLINIC_DEMO"):
        raise HTTPException(status_code=422, detail="modality must be ONLINE_DEMO or IN_CLINIC_DEMO.")

    intervals: list[tuple[str, str]] = []
    if payload.start_utc and payload.end_utc:
        if payload.end_utc <= payload.start_utc:
            raise HTTPException(status_code=422, detail="end_utc must be after start_utc.")
        intervals.append((payload.start_utc, payload.end_utc))
    else:
        if not payload.date_local:
            raise HTTPException(status_code=422, detail="Provide either date_local or start_utc/end_utc.")
        if payload.slot_duration_minutes not in (10, 15, 20, 30, 45, 60):
            raise HTTPException(status_code=422, detail="slot_duration_minutes must be one of 10, 15, 20, 30, 45, 60.")
        dhaka_tz = timezone(timedelta(hours=6))
        start_local = datetime.strptime(f"{payload.date_local} {payload.start_hhmm}", "%Y-%m-%d %H:%M").replace(tzinfo=dhaka_tz)
        end_local = datetime.strptime(f"{payload.date_local} {payload.end_hhmm}", "%Y-%m-%d %H:%M").replace(tzinfo=dhaka_tz)
        if end_local <= start_local:
            raise HTTPException(status_code=422, detail="end_hhmm must be after start_hhmm.")
        step = timedelta(minutes=payload.slot_duration_minutes)
        cursor = start_local
        while cursor + step <= end_local:
            s_utc = cursor.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            e_utc = (cursor + step).astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            intervals.append((s_utc, e_utc))
            cursor += step
        if not intervals:
            raise HTTPException(status_code=422, detail="Window is smaller than one slot duration.")

    created_slots = []
    now = utc_now_iso()
    with get_db_conn() as conn:
        try:
            conn.execute("BEGIN IMMEDIATE;")
            for s_utc, e_utc in intervals:
                slot_id = new_id("slot")
                conn.execute(
                    """
                    INSERT INTO appointment_slots
                    (id, doctor_id, start_utc, end_utc, modality, capacity, reserved_count, state, version, created_at_utc, updated_at_utc)
                    VALUES (?, ?, ?, ?, ?, ?, 0, 'OPEN', 1, ?, ?)
                    """,
                    (slot_id, doc_id, s_utc, e_utc, payload.modality, payload.capacity, now, now),
                )
                created_slots.append(
                    row_to_dict(conn.execute("SELECT * FROM appointment_slots WHERE id = ?", (slot_id,)).fetchone())
                )
            record_audit(
                conn,
                actor_user_id=user["id"],
                actor_role="DOCTOR",
                action_type="DOCTOR_SLOTS_GENERATED",
                target_resource="appointment_slots",
                target_id=doc_id,
                details={"count": len(created_slots)},
            )
            conn.execute("COMMIT;")
        except (sqlite3.IntegrityError, sqlite3.OperationalError) as exc:
            conn.rollback()
            msg = str(exc)
            if "OVERLAPPING_APPOINTMENT_SLOT" in msg or "UNIQUE" in msg:
                raise HTTPException(
                    status_code=409,
                    detail="OVERLAPPING_APPOINTMENT_SLOT: One or more slots overlap an existing active slot.",
                )
            raise
    return {"created_count": len(created_slots), "slots": created_slots}


@router.delete("/slots/{slot_id}")
def cancel_doctor_slot(slot_id: str, user: dict = Depends(require_approved_doctor)):
    doc_id = _doctor_id_of(user)
    with get_db_conn() as conn:
        slot = row_to_dict(conn.execute("SELECT * FROM appointment_slots WHERE id = ?", (slot_id,)).fetchone())
        if not slot:
            raise HTTPException(status_code=404, detail="Slot not found.")
        if slot["doctor_id"] != doc_id:
            raise HTTPException(status_code=403, detail="Cannot modify another doctor's slot.")
        if slot["reserved_count"] > 0 or slot["state"] in ("BOOKED", "HELD"):
            raise HTTPException(status_code=409, detail="Cannot remove a slot with an active reservation.")
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            "UPDATE appointment_slots SET state = 'CANCELLED', updated_at_utc = ? WHERE id = ?",
            (utc_now_iso(), slot_id),
        )
        conn.execute("COMMIT;")
        return {"cancelled": True, "slot_id": slot_id}


@router.get("/appointments")
def list_doctor_appointments(status_filter: Optional[str] = None, user: dict = Depends(require_approved_doctor)):
    doc_id = _doctor_id_of(user)
    sql = """
        SELECT a.*, pp.display_name AS patient_name, pp.relationship_type, pp.sex,
               pp.date_of_birth, pp.blood_group, pp.district AS patient_district,
               s.start_utc, s.end_utc,
               COALESCE(dp.status, 'NONE') AS demo_payment_status, dp.method AS payment_method
          FROM appointments a
          JOIN patient_profiles pp ON pp.id = a.patient_profile_id
          JOIN appointment_slots s ON s.id = a.slot_id
          LEFT JOIN demo_payments dp ON dp.appointment_id = a.id
         WHERE a.doctor_id = ?
    """
    params: list = [doc_id]
    if status_filter:
        sql += " AND a.status = ?"
        params.append(status_filter)
    sql += " ORDER BY s.start_utc ASC"
    with get_db_conn() as conn:
        rows = rows_to_dicts(conn.execute(sql, tuple(params)).fetchall())
        return {"appointments": rows}


@router.patch("/appointments/{appointment_id}/status")
def update_doctor_appointment_status(
    appointment_id: str,
    payload: AppointmentStatusPatchRequest,
    user: dict = Depends(require_approved_doctor),
):
    doc_id = _doctor_id_of(user)
    allowed = {"CONFIRMED", "CHECKED_IN", "IN_CONSULTATION", "COMPLETED", "NO_SHOW", "CANCELLED"}
    if payload.status not in allowed:
        raise HTTPException(status_code=422, detail=f"Invalid status. Allowed: {sorted(allowed)}")

    with get_db_conn() as conn:
        appt = row_to_dict(conn.execute("SELECT * FROM appointments WHERE id = ?", (appointment_id,)).fetchone())
        if not appt:
            raise HTTPException(status_code=404, detail="Appointment not found.")
        if appt["doctor_id"] != doc_id:
            conn.execute("BEGIN IMMEDIATE;")
            record_audit(
                conn,
                actor_user_id=user["id"],
                actor_role="DOCTOR",
                action_type="CROSS_DOCTOR_IDOR_BLOCKED",
                target_resource="appointments",
                target_id=appointment_id,
                outcome="DENIED",
            )
            conn.execute("COMMIT;")
            raise HTTPException(status_code=403, detail="Access denied: appointment belongs to another doctor.")

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
            """
            INSERT INTO appointment_events (id, appointment_id, actor_user_id, actor_role, from_status, to_status, reason)
            VALUES (?, ?, ?, 'DOCTOR', ?, ?, ?)
            """,
            (new_id("appevt"), appointment_id, user["id"], appt["status"], payload.status, payload.reason or "Doctor queue transition"),
        )
        notify_user(
            conn,
            recipient_user_id=appt["booked_by_user_id"],
            topic="APPOINTMENT_STATUS",
            entity_type="appointment",
            entity_id=appointment_id,
            title_bn=f"অ্যাপয়েন্টমেন্ট {appt['booking_reference']} অবস্থা: {payload.status}",
            title_en=f"Appointment {appt['booking_reference']} status: {payload.status}",
        )
        record_audit(
            conn,
            actor_user_id=user["id"],
            actor_role="DOCTOR",
            action_type="DOCTOR_APPOINTMENT_STATUS_UPDATED",
            target_resource="appointments",
            target_id=appointment_id,
            details={"from": appt["status"], "to": payload.status},
        )
        conn.execute("COMMIT;")
        updated = row_to_dict(conn.execute("SELECT * FROM appointments WHERE id = ?", (appointment_id,)).fetchone())
        return {"appointment": updated}


@router.get("/appointments/{appointment_id}/workspace")
def get_consultation_workspace(appointment_id: str, user: dict = Depends(require_approved_doctor)):
    doc_id = _doctor_id_of(user)
    with get_db_conn() as conn:
        appt = row_to_dict(
            conn.execute(
                """
                SELECT a.*, s.start_utc, s.end_utc,
                       pp.display_name AS patient_name, pp.relationship_type, pp.date_of_birth,
                       pp.sex, pp.blood_group, pp.district AS patient_district,
                       COALESCE(dp.status, 'NONE') AS demo_payment_status
                  FROM appointments a
                  JOIN appointment_slots s ON s.id = a.slot_id
                  JOIN patient_profiles pp ON pp.id = a.patient_profile_id
                  LEFT JOIN demo_payments dp ON dp.appointment_id = a.id
                 WHERE a.id = ?
                """,
                (appointment_id,),
            ).fetchone()
        )
        if not appt:
            raise HTTPException(status_code=404, detail="Appointment not found.")
        if appt["doctor_id"] != doc_id:
            conn.execute("BEGIN IMMEDIATE;")
            record_audit(
                conn,
                actor_user_id=user["id"],
                actor_role="DOCTOR",
                action_type="CROSS_DOCTOR_WORKSPACE_DENIED",
                target_resource="appointments",
                target_id=appointment_id,
                outcome="DENIED",
            )
            conn.execute("COMMIT;")
            raise HTTPException(status_code=403, detail="Access denied: you are not assigned to this consultation.")

        notes = rows_to_dicts(
            conn.execute(
                "SELECT * FROM consultation_notes WHERE appointment_id = ? ORDER BY created_at_utc DESC",
                (appointment_id,),
            ).fetchall()
        )
        eprescriptions = rows_to_dicts(
            conn.execute(
                "SELECT * FROM eprescriptions WHERE appointment_id = ? ORDER BY created_at_utc DESC",
                (appointment_id,),
            ).fetchall()
        )
        shared_documents = []
        pcos_entries = []
        pediatric_cases = []
        if appt["consent_shared_with_doctor"]:
            shared_documents = rows_to_dicts(
                conn.execute(
                    """
                    SELECT md.id, md.doc_type, md.original_filename, md.mime_type, md.created_at_utc,
                           oj.status AS ocr_status, oj.mean_confidence
                      FROM medical_documents md
                      LEFT JOIN ocr_jobs oj ON oj.document_id = md.id
                     WHERE md.patient_profile_id = ?
                     ORDER BY md.created_at_utc DESC
                    """,
                    (appt["patient_profile_id"],),
                ).fetchall()
            )
            pcos_entries = rows_to_dicts(
                conn.execute(
                    "SELECT * FROM pcos_cycle_entries WHERE patient_profile_id = ? ORDER BY start_date DESC LIMIT 6",
                    (appt["patient_profile_id"],),
                ).fetchall()
            )
            pediatric_cases = rows_to_dicts(
                conn.execute(
                    "SELECT * FROM pediatric_intake_cases WHERE child_profile_id = ? ORDER BY created_at_utc DESC LIMIT 6",
                    (appt["patient_profile_id"],),
                ).fetchall()
            )

        return {
            "appointment": appt,
            "notes": notes,
            "eprescriptions": eprescriptions,
            "shared_documents": shared_documents,
            "pcos_entries": pcos_entries,
            "pediatric_cases": pediatric_cases,
            "room_disclaimer": "LOCAL DEVICE PREVIEW / DEMO CONSULTATION WORKSPACE — NOT A CLINICAL TELEMEDICINE BRIDGE",
        }


@router.post("/appointments/{appointment_id}/notes", status_code=201)
def save_consultation_note(
    appointment_id: str,
    payload: ConsultationNoteSaveRequest,
    user: dict = Depends(require_approved_doctor),
):
    doc_id = _doctor_id_of(user)
    if payload.state not in ("DRAFT", "SIGNED", "ADDENDUM"):
        raise HTTPException(status_code=422, detail="state must be DRAFT, SIGNED, or ADDENDUM.")

    with get_db_conn() as conn:
        appt = row_to_dict(conn.execute("SELECT * FROM appointments WHERE id = ?", (appointment_id,)).fetchone())
        if not appt:
            raise HTTPException(status_code=404, detail="Appointment not found.")
        if appt["doctor_id"] != doc_id:
            raise HTTPException(status_code=403, detail="Access denied: cannot author clinical notes for another doctor's appointment.")

        now = utc_now_iso()
        signed_at = now if payload.state in ("SIGNED", "ADDENDUM") else None
        conn.execute("BEGIN IMMEDIATE;")
        existing_draft = None
        if payload.state != "ADDENDUM":
            existing_draft = row_to_dict(
                conn.execute(
                    "SELECT * FROM consultation_notes WHERE appointment_id = ? AND state = 'DRAFT' ORDER BY created_at_utc DESC LIMIT 1",
                    (appointment_id,),
                ).fetchone()
            )

        if existing_draft:
            note_id = existing_draft["id"]
            conn.execute(
                """
                UPDATE consultation_notes
                   SET subjective_notes = ?, assessment_summary = ?, advice_summary = ?,
                       followup_instruction = ?, followup_date = ?, state = ?, signed_at_utc = ?,
                       version = version + 1, updated_at_utc = ?
                 WHERE id = ?
                """,
                (
                    payload.subjective_notes,
                    payload.assessment_summary,
                    payload.advice_summary,
                    payload.followup_instruction,
                    payload.followup_date,
                    payload.state,
                    signed_at,
                    now,
                    note_id,
                ),
            )
        else:
            note_id = new_id("note")
            conn.execute(
                """
                INSERT INTO consultation_notes
                (id, appointment_id, author_doctor_id, parent_note_id, subjective_notes, assessment_summary,
                 advice_summary, followup_instruction, followup_date, state, signed_at_utc, version, created_at_utc, updated_at_utc)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                """,
                (
                    note_id,
                    appointment_id,
                    doc_id,
                    payload.parent_note_id,
                    payload.subjective_notes,
                    payload.assessment_summary,
                    payload.advice_summary,
                    payload.followup_instruction,
                    payload.followup_date,
                    payload.state,
                    signed_at,
                    now,
                    now,
                ),
            )
        record_audit(
            conn,
            actor_user_id=user["id"],
            actor_role="DOCTOR",
            action_type=f"DOCTOR_NOTE_{payload.state}",
            target_resource="consultation_notes",
            target_id=note_id,
            details={"appointment_id": appointment_id},
        )
        conn.execute("COMMIT;")
        return {"note": row_to_dict(conn.execute("SELECT * FROM consultation_notes WHERE id = ?", (note_id,)).fetchone())}


@router.post("/appointments/{appointment_id}/eprescription", status_code=201)
def create_signed_eprescription(
    appointment_id: str,
    payload: EPrescriptionCreateRequest,
    user: dict = Depends(require_approved_doctor),
):
    doc_id = _doctor_id_of(user)
    with get_db_conn() as conn:
        appt = row_to_dict(conn.execute("SELECT * FROM appointments WHERE id = ?", (appointment_id,)).fetchone())
        if not appt:
            raise HTTPException(status_code=404, detail="Appointment not found.")
        if appt["doctor_id"] != doc_id:
            raise HTTPException(status_code=403, detail="Access denied: cannot issue e-prescription for another doctor's appointment.")

        rx_id = new_id("rx")
        rx_ref = f"DEMO-RX-{rx_id[-6:].upper()}"
        now = utc_now_iso()
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            """
            INSERT INTO eprescriptions
            (id, rx_reference, appointment_id, doctor_id, patient_profile_id, diagnosis_summary,
             medications_json, advice_notes, followup_date, status, signed_by_user_id, signed_at_utc, is_simulated, created_at_utc)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'SIGNED', ?, ?, 1, ?)
            """,
            (
                rx_id,
                rx_ref,
                appointment_id,
                doc_id,
                appt["patient_profile_id"],
                payload.diagnosis_summary,
                json.dumps(payload.medications, ensure_ascii=False),
                payload.advice_notes,
                payload.followup_date,
                user["id"],
                now,
                now,
            ),
        )
        notify_user(
            conn,
            recipient_user_id=appt["booked_by_user_id"],
            topic="EPRESCRIPTION_READY",
            entity_type="eprescription",
            entity_id=rx_id,
            title_bn=f"ডাক্তারের স্বাক্ষরিত ডেমো ই-প্রেসক্রিপশন ({rx_ref}) প্রস্তুত হয়েছে।",
            title_en=f"Doctor-signed demo e-prescription ({rx_ref}) is ready.",
        )
        record_audit(
            conn,
            actor_user_id=user["id"],
            actor_role="DOCTOR",
            action_type="DOCTOR_EPRESCRIPTION_SIGNED",
            target_resource="eprescriptions",
            target_id=rx_id,
            details={"rx_reference": rx_ref, "appointment_id": appointment_id},
        )
        conn.execute("COMMIT;")
        rx = row_to_dict(conn.execute("SELECT * FROM eprescriptions WHERE id = ?", (rx_id,)).fetchone())
        return {
            "eprescription": rx,
            "disclaimer": "DEMO / SIMULATED E-PRESCRIPTION — HUMAN CLINICIAN EDUCATIONAL WORKFLOW ONLY",
        }
