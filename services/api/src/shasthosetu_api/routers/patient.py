from __future__ import annotations

import json
import sqlite3
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..core.audit import notify_user, record_audit
from ..core.dependencies import require_role
from ..core.security import new_id, sha256_hex, utc_now_iso
from ..db.sqlite import get_db_conn, row_to_dict, rows_to_dicts

router = APIRouter(prefix="/v1", tags=["Patient Portal, Bookings & Demo Payments"])


def _owned_profile_ids(conn: sqlite3.Connection, user_id: str) -> list[str]:
    rows = conn.execute("SELECT id FROM patient_profiles WHERE owner_user_id = ?", (user_id,)).fetchall()
    return [r["id"] for r in rows]


def _assert_profile_owned(conn: sqlite3.Connection, user_id: str, profile_id: str) -> None:
    row = conn.execute("SELECT 1 FROM patient_profiles WHERE id = ? AND owner_user_id = ?", (profile_id, user_id)).fetchone()
    if not row:
        raise HTTPException(status_code=403, detail="Access denied: patient profile does not belong to you.")


class DependentCreateRequest(BaseModel):
    display_name: str = Field(..., min_length=2, max_length=120)
    relationship_type: str = Field(default="CHILD")
    date_of_birth: Optional[str] = None
    sex: str = Field(default="OTHER")
    blood_group: Optional[str] = None
    district: str = Field(default="Dhaka")


class BookAppointmentRequest(BaseModel):
    slot_id: str
    patient_profile_id: Optional[str] = None
    visit_reason_summary: str = Field(..., min_length=3, max_length=400)
    consultation_mode: str = Field(default="ONLINE_DEMO")
    idempotency_key: str = Field(..., min_length=4, max_length=120)
    parent_followup_appointment_id: Optional[str] = None


class RescheduleRequest(BaseModel):
    new_slot_id: str
    reason: str = Field(default="Patient requested reschedule", max_length=250)


class ConsultationPrepRequest(BaseModel):
    prep_symptoms_text: str = Field(..., min_length=3, max_length=1000)
    bp_systolic: Optional[str] = None
    temperature_f: Optional[str] = None
    consent_shared_with_doctor: bool = True


class DemoCheckoutRequest(BaseModel):
    appointment_id: str
    method: str = Field(..., pattern="^(DEMO_BKASH|DEMO_NAGAD|DEMO_CARD|DEMO_FREE)$")
    outcome: str = Field(default="SUCCESS", pattern="^(SUCCESS|FAILED|CANCELLED)$")
    idempotency_key: str = Field(..., min_length=4, max_length=120)


class VerifyOcrFieldRequest(BaseModel):
    verified_value: str = Field(..., min_length=1, max_length=250)


class ActivateOcrPlanRequest(BaseModel):
    patient_profile_id: str
    activation_mode: str = Field(default="PATIENT_REMINDER_DRAFT", pattern="^(PATIENT_REMINDER_DRAFT|CLINICIAN_AUTHORIZED_PLAN)$")


class MedLogRequest(BaseModel):
    action_status: str = Field(..., pattern="^(TAKEN|SKIPPED|SNOOZED)$")


class PcosEntryRequest(BaseModel):
    patient_profile_id: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    cycle_length_days: Optional[int] = Field(default=None, ge=15, le=180)
    symptoms_json: dict = Field(default_factory=dict)
    user_notes: str = Field(default="", max_length=500)


class PediatricIntakeRequest(BaseModel):
    child_profile_id: str
    age_months: int = Field(..., ge=0, le=216)
    fever_days: float = Field(default=0, ge=0, le=30)
    temp_f: float = Field(default=98.6, ge=94.0, le=108.0)
    has_rash: bool = False
    breathing_difficulty: bool = False
    lethargy_or_unresponsive: bool = False
    convulsions: bool = False
    unable_to_drink: bool = False
    petechiae_or_purple_spots: bool = False


class DiagnosticOrderRequest(BaseModel):
    patient_profile_id: Optional[str] = None
    test_id: str
    preferred_date: str
    collection_mode: str = Field(default="LAB_VISIT_DEMO", pattern="^(LAB_VISIT_DEMO|HOME_SAMPLE_DEMO)$")
    notes: str = Field(default="", max_length=300)


class PatientTicketCreateRequest(BaseModel):
    category: str = Field(default="DEMO_PAYMENT")
    subject: str = Field(..., min_length=4, max_length=200)
    message: str = Field(..., min_length=4, max_length=1500)
    related_appointment_id: Optional[str] = None
    related_demo_payment_id: Optional[str] = None


class PatientTicketReplyRequest(BaseModel):
    body_text: str = Field(..., min_length=2, max_length=1500)


class DocumentCreateRequest(BaseModel):
    patient_profile_id: Optional[str] = None
    doc_type: str = Field(default="PRESCRIPTION")
    original_filename: str = Field(..., min_length=3, max_length=160)
    mime_type: str = Field(default="image/jpeg")
    run_demo_ocr_draft: bool = True


@router.get("/patient/dashboard")
def patient_dashboard(user: dict = Depends(require_role("PATIENT"))):
    with get_db_conn() as conn:
        profiles = rows_to_dicts(conn.execute("SELECT * FROM patient_profiles WHERE owner_user_id = ? ORDER BY created_at_utc ASC", (user["id"],)).fetchall())
        pids = [p["id"] for p in profiles]
        if not pids:
            return {"profiles": [], "appointments": [], "payments": [], "medications": [], "tickets": [], "eprescriptions": [], "diagnostic_orders": []}
        ph = ",".join("?" * len(pids))
        appts = rows_to_dicts(
            conn.execute(
                f"""
                SELECT a.*, d.display_name AS doctor_name, d.display_name_bn AS doctor_name_bn, d.specialty,
                       s.start_utc AS slot_start_utc, s.end_utc AS slot_end_utc,
                       pp.display_name AS patient_name
                  FROM appointments a
                  JOIN doctor_profiles d ON d.id = a.doctor_id
                  JOIN appointment_slots s ON s.id = a.slot_id
                  JOIN patient_profiles pp ON pp.id = a.patient_profile_id
                 WHERE a.patient_profile_id IN ({ph})
                 ORDER BY a.created_at_utc DESC
                """,
                pids,
            ).fetchall()
        )
        payments = rows_to_dicts(
            conn.execute(
                """
                SELECT p.*, a.booking_reference, r.receipt_number, r.disclaimer_label
                  FROM demo_payments p
                  JOIN appointments a ON a.id = p.appointment_id
                  LEFT JOIN demo_receipts r ON r.payment_id = p.id
                 WHERE p.payer_user_id = ?
                 ORDER BY p.created_at_utc DESC
                """,
                (user["id"],),
            ).fetchall()
        )
        meds = rows_to_dicts(
            conn.execute(
                f"SELECT * FROM medication_plans WHERE patient_profile_id IN ({ph}) ORDER BY created_at_utc DESC",
                pids,
            ).fetchall()
        )
        rx_list = rows_to_dicts(
            conn.execute(
                f"""
                SELECT rx.*, d.display_name AS doctor_name, d.display_name_bn AS doctor_name_bn, d.specialty
                  FROM eprescriptions rx
                  JOIN doctor_profiles d ON d.id = rx.doctor_id
                 WHERE rx.patient_profile_id IN ({ph})
                 ORDER BY rx.created_at_utc DESC
                """,
                pids,
            ).fetchall()
        )
        diag_orders = rows_to_dicts(
            conn.execute(
                f"""
                SELECT o.*, t.name_en, t.name_bn, t.sample_type
                  FROM diagnostic_demo_orders o
                  JOIN diagnostic_tests t ON t.id = o.test_id
                 WHERE o.patient_profile_id IN ({ph})
                 ORDER BY o.created_at_utc DESC
                """,
                pids,
            ).fetchall()
        )
        tickets = rows_to_dicts(
            conn.execute("SELECT * FROM support_tickets WHERE requester_user_id = ? ORDER BY created_at_utc DESC", (user["id"],)).fetchall()
        )
    return {
        "profiles": profiles,
        "appointments": appts,
        "payments": payments,
        "medications": meds,
        "eprescriptions": rx_list,
        "diagnostic_orders": diag_orders,
        "tickets": tickets,
    }


@router.post("/patient/dependents", status_code=201)
def add_dependent(payload: DependentCreateRequest, user: dict = Depends(require_role("PATIENT"))):
    pid = new_id("pp")
    with get_db_conn() as conn:
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            """
            INSERT INTO patient_profiles (id, owner_user_id, display_name, relationship_type, date_of_birth, sex, blood_group, district)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (pid, user["id"], payload.display_name.strip(), payload.relationship_type, payload.date_of_birth, payload.sex, payload.blood_group, payload.district),
        )
        conn.execute("COMMIT;")
        prof = row_to_dict(conn.execute("SELECT * FROM patient_profiles WHERE id = ?", (pid,)).fetchone())
    return {"profile": prof}


@router.post("/appointments/book", status_code=201)
def book_appointment(payload: BookAppointmentRequest, user: dict = Depends(require_role("PATIENT"))):
    with get_db_conn() as conn:
        # Idempotency check
        existing = row_to_dict(
            conn.execute(
                "SELECT * FROM appointments WHERE idempotency_key = ?",
                (payload.idempotency_key,),
            ).fetchone()
        )
        if existing:
            if existing["booked_by_user_id"] != user["id"]:
                raise HTTPException(status_code=403, detail="Idempotency conflict.")
            return {"appointment": existing, "idempotent_replay": True}

        pids = _owned_profile_ids(conn, user["id"])
        if not pids:
            raise HTTPException(status_code=400, detail="No patient profile found.")
        target_pid = payload.patient_profile_id or pids[0]
        _assert_profile_owned(conn, user["id"], target_pid)

        conn.execute("BEGIN IMMEDIATE;")
        try:
            slot = row_to_dict(
                conn.execute(
                    """
                    SELECT s.*, d.verification_status, d.is_active AS doc_active,
                           d.consultation_fee_minor_poisha, d.followup_fee_minor_poisha, d.user_id AS doc_user_id
                      FROM appointment_slots s
                      JOIN doctor_profiles d ON d.id = s.doctor_id
                     WHERE s.id = ?
                    """,
                    (payload.slot_id,),
                ).fetchone()
            )
            if not slot:
                raise HTTPException(status_code=404, detail="Slot not found.")
            if slot["verification_status"] != "APPROVED" or not slot["doc_active"]:
                raise HTTPException(status_code=409, detail="Doctor is not active/approved for booking.")

            # Atomic slot reservation guard (SRS V2-T-007 & ISS-004 exact 'OPEN' check)
            cur = conn.execute(
                """
                UPDATE appointment_slots
                   SET reserved_count = reserved_count + 1,
                       state = CASE WHEN reserved_count + 1 >= capacity THEN 'BOOKED' ELSE 'OPEN' END,
                       version = version + 1,
                       updated_at_utc = ?
                 WHERE id = ? AND state = 'OPEN' AND reserved_count < capacity
                """,
                (utc_now_iso(), payload.slot_id),
            )
            if cur.rowcount != 1:
                raise HTTPException(
                    status_code=409,
                    detail="SLOT_UNAVAILABLE: This appointment slot was just reserved by another patient.",
                )

            fee = (
                slot["followup_fee_minor_poisha"]
                if payload.parent_followup_appointment_id
                else slot["consultation_fee_minor_poisha"]
            )
            apt_id = new_id("apt")
            ref = f"APT-{apt_id.split('-')[1][:8].upper()}"
            init_status = "CONFIRMED" if fee == 0 else "AWAITING_DEMO_PAYMENT"
            pay_req = "DEMO_FREE_WAIVED" if fee == 0 else "REQUIRED_DEMO"

            conn.execute(
                """
                INSERT INTO appointments (
                    id, booking_reference, patient_profile_id, booked_by_user_id, doctor_id, slot_id,
                    parent_followup_appointment_id, consultation_mode, status, visit_reason_summary,
                    fee_minor_poisha, payment_requirement, idempotency_key, is_synthetic
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
                """,
                (
                    apt_id,
                    ref,
                    target_pid,
                    user["id"],
                    slot["doctor_id"],
                    payload.slot_id,
                    payload.parent_followup_appointment_id,
                    payload.consultation_mode,
                    init_status,
                    payload.visit_reason_summary.strip(),
                    fee,
                    pay_req,
                    payload.idempotency_key,
                ),
            )
            conn.execute(
                """
                INSERT INTO appointment_events (id, appointment_id, actor_user_id, actor_role, from_status, to_status, reason)
                VALUES (?, ?, ?, 'PATIENT', NULL, ?, 'Patient booked slot')
                """,
                (new_id("ae"), apt_id, user["id"], init_status),
            )
            notify_user(
                conn,
                recipient_user_id=user["id"],
                topic="APPOINTMENT_CREATED",
                entity_type="appointment",
                entity_id=apt_id,
                title_bn=f"অ্যাপয়েন্টমেন্ট {ref} সংরক্ষিত হয়েছে — ডেমো পেমেন্ট সম্পন্ন করুন",
                title_en=f"Appointment {ref} reserved — complete demo checkout to confirm",
            )
            record_audit(conn, actor_user_id=user["id"], actor_role="PATIENT", action_type="APPOINTMENT_BOOKED", target_resource="appointments", target_id=apt_id)
            conn.execute("COMMIT;")
        except Exception:
            if conn.in_transaction:
                conn.execute("ROLLBACK;")
            raise

        created = row_to_dict(
            conn.execute(
                """
                SELECT a.*, d.display_name AS doctor_name, d.display_name_bn AS doctor_name_bn, d.specialty, s.start_utc AS slot_start_utc, s.end_utc AS slot_end_utc
                  FROM appointments a
                  JOIN doctor_profiles d ON d.id = a.doctor_id
                  JOIN appointment_slots s ON s.id = a.slot_id
                 WHERE a.id = ?
                """,
                (apt_id,),
            ).fetchone()
        )
    return {"appointment": created, "idempotent_replay": False}


@router.post("/appointments/{appointment_id}/prep")
def save_consultation_prep(appointment_id: str, payload: ConsultationPrepRequest, user: dict = Depends(require_role("PATIENT"))):
    with get_db_conn() as conn:
        pids = _owned_profile_ids(conn, user["id"])
        apt = row_to_dict(conn.execute("SELECT * FROM appointments WHERE id = ?", (appointment_id,)).fetchone())
        if not apt or apt["patient_profile_id"] not in pids:
            raise HTTPException(status_code=403, detail="Not authorized for this appointment.")
        vitals = json.dumps({"bp_systolic": payload.bp_systolic, "temperature_f": payload.temperature_f})
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            """
            UPDATE appointments
               SET prep_symptoms_text = ?, prep_vitals_json = ?, consent_shared_with_doctor = ?, updated_at_utc = ?
             WHERE id = ?
            """,
            (payload.prep_symptoms_text.strip(), vitals, 1 if payload.consent_shared_with_doctor else 0, utc_now_iso(), appointment_id),
        )
        conn.execute("COMMIT;")
    return {"saved": True}


@router.post("/appointments/{appointment_id}/cancel")
def cancel_appointment(appointment_id: str, user: dict = Depends(require_role("PATIENT"))):
    with get_db_conn() as conn:
        pids = _owned_profile_ids(conn, user["id"])
        apt = row_to_dict(conn.execute("SELECT * FROM appointments WHERE id = ?", (appointment_id,)).fetchone())
        if not apt or apt["patient_profile_id"] not in pids:
            raise HTTPException(status_code=403, detail="Not authorized for this appointment.")
        if apt["status"] in ("COMPLETED", "CANCELLED"):
            raise HTTPException(status_code=409, detail=f"Cannot cancel appointment in state {apt['status']}.")

        conn.execute("BEGIN IMMEDIATE;")
        try:
            conn.execute(
                "UPDATE appointments SET status = 'CANCELLED', version = version + 1, updated_at_utc = ? WHERE id = ?",
                (utc_now_iso(), appointment_id),
            )
            conn.execute(
                """
                UPDATE appointment_slots
                   SET reserved_count = MAX(0, reserved_count - 1),
                       state = CASE WHEN MAX(0, reserved_count - 1) < capacity THEN 'OPEN' ELSE state END,
                       updated_at_utc = ?
                 WHERE id = ?
                """,
                (utc_now_iso(), apt["slot_id"]),
            )
            conn.execute(
                "INSERT INTO appointment_events (id, appointment_id, actor_user_id, actor_role, from_status, to_status, reason) VALUES (?, ?, ?, 'PATIENT', ?, 'CANCELLED', 'Cancelled by patient')",
                (new_id("ae"), appointment_id, user["id"], apt["status"]),
            )
            conn.execute("COMMIT;")
        except Exception:
            if conn.in_transaction:
                conn.execute("ROLLBACK;")
            raise
    return {"cancelled": True, "appointment_id": appointment_id}


@router.post("/appointments/{appointment_id}/reschedule")
def reschedule_appointment(appointment_id: str, payload: RescheduleRequest, user: dict = Depends(require_role("PATIENT"))):
    with get_db_conn() as conn:
        pids = _owned_profile_ids(conn, user["id"])
        apt = row_to_dict(conn.execute("SELECT * FROM appointments WHERE id = ?", (appointment_id,)).fetchone())
        if not apt or apt["patient_profile_id"] not in pids:
            raise HTTPException(status_code=403, detail="Not authorized.")
        if apt["status"] in ("COMPLETED", "CANCELLED"):
            raise HTTPException(status_code=409, detail="Cannot reschedule finished/cancelled appointment.")

        conn.execute("BEGIN IMMEDIATE;")
        try:
            cur = conn.execute(
                """
                UPDATE appointment_slots
                   SET reserved_count = reserved_count + 1,
                       state = CASE WHEN reserved_count + 1 >= capacity THEN 'BOOKED' ELSE 'OPEN' END,
                       version = version + 1, updated_at_utc = ?
                 WHERE id = ? AND doctor_id = ? AND state = 'OPEN' AND reserved_count < capacity
                """,
                (utc_now_iso(), payload.new_slot_id, apt["doctor_id"]),
            )
            if cur.rowcount != 1:
                raise HTTPException(status_code=409, detail="Requested new slot is unavailable.")

            conn.execute(
                "UPDATE appointment_slots SET reserved_count = MAX(0, reserved_count - 1), state = 'OPEN', updated_at_utc = ? WHERE id = ?",
                (utc_now_iso(), apt["slot_id"]),
            )
            conn.execute(
                "UPDATE appointments SET slot_id = ?, version = version + 1, updated_at_utc = ? WHERE id = ?",
                (payload.new_slot_id, utc_now_iso(), appointment_id),
            )
            conn.execute(
                "INSERT INTO appointment_events (id, appointment_id, actor_user_id, actor_role, from_status, to_status, reason) VALUES (?, ?, ?, 'PATIENT', ?, ?, ?)",
                (new_id("ae"), appointment_id, user["id"], apt["status"], apt["status"], payload.reason),
            )
            conn.execute("COMMIT;")
        except Exception:
            if conn.in_transaction:
                conn.execute("ROLLBACK;")
            raise
    return {"rescheduled": True, "new_slot_id": payload.new_slot_id}


@router.post("/payments/checkout", status_code=201)
def demo_checkout(payload: DemoCheckoutRequest, user: dict = Depends(require_role("PATIENT"))):
    with get_db_conn() as conn:
        existing_pay = row_to_dict(
            conn.execute(
                """
                SELECT p.*, r.receipt_number, r.disclaimer_label
                  FROM demo_payments p
                  LEFT JOIN demo_receipts r ON r.payment_id = p.id
                 WHERE p.idempotency_key = ?
                """,
                (payload.idempotency_key,),
            ).fetchone()
        )
        if existing_pay:
            if existing_pay["payer_user_id"] != user["id"]:
                raise HTTPException(status_code=403, detail="Forbidden.")
            return {"payment": existing_pay, "idempotent_replay": True}

        pids = _owned_profile_ids(conn, user["id"])
        apt = row_to_dict(
            conn.execute(
                "SELECT a.*, d.user_id AS doc_user_id FROM appointments a JOIN doctor_profiles d ON d.id = a.doctor_id WHERE a.id = ?",
                (payload.appointment_id,),
            ).fetchone()
        )
        if not apt or apt["patient_profile_id"] not in pids:
            raise HTTPException(status_code=403, detail="Cannot pay for another patient's appointment.")

        status_map = {
            "SUCCESS": "DEMO_PAID",
            "FAILED": "DEMO_FAILED",
            "CANCELLED": "DEMO_CANCELLED",
        }
        pay_status = status_map[payload.outcome]
        pay_id = new_id("pay")
        demo_ref = f"DEMO-{payload.method.split('_')[1]}-{pay_id.split('-')[1][:6].upper()}"
        now = utc_now_iso()

        conn.execute("BEGIN IMMEDIATE;")
        try:
            conn.execute(
                """
                INSERT INTO demo_payments (
                    id, demo_ref, appointment_id, payer_user_id, method, amount_minor_poisha,
                    status, is_simulated, idempotency_key, failure_reason_code, created_at_utc, updated_at_utc
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
                """,
                (
                    pay_id,
                    demo_ref,
                    apt["id"],
                    user["id"],
                    payload.method,
                    apt["fee_minor_poisha"],
                    pay_status,
                    payload.idempotency_key,
                    "DEMO_GATEWAY_DECLINE" if pay_status == "DEMO_FAILED" else None,
                    now,
                    now,
                ),
            )
            conn.execute(
                "INSERT INTO demo_payment_events (id, payment_id, from_status, to_status, actor_user_id, note) VALUES (?, ?, NULL, ?, ?, 'Demo checkout processed')",
                (new_id("pe"), pay_id, pay_status, user["id"]),
            )
            if pay_status == "DEMO_PAID":
                rcp_id = new_id("rcp")
                rcp_num = f"DEMO-RCP-{pay_id.split('-')[1][:6].upper()}"
                conn.execute(
                    "INSERT INTO demo_receipts (id, payment_id, receipt_number) VALUES (?, ?, ?)",
                    (rcp_id, pay_id, rcp_num),
                )
                conn.execute(
                    "UPDATE appointments SET status = 'CONFIRMED', version = version + 1, updated_at_utc = ? WHERE id = ? AND status IN ('BOOKING_PENDING', 'AWAITING_DEMO_PAYMENT')",
                    (now, apt["id"]),
                )
                conn.execute(
                    "INSERT INTO appointment_events (id, appointment_id, actor_user_id, actor_role, from_status, to_status, reason) VALUES (?, ?, ?, 'SYSTEM', ?, 'CONFIRMED', 'Confirmed after simulated demo payment')",
                    (new_id("ae"), apt["id"], user["id"], apt["status"]),
                )
                notify_user(
                    conn,
                    recipient_user_id=user["id"],
                    topic="PAYMENT_DEMO_PAID",
                    entity_type="demo_payment",
                    entity_id=pay_id,
                    title_bn=f"ডেমো পেমেন্ট {demo_ref} সম্পন্ন — অ্যাপয়েন্টমেন্ট নিশ্চিত হয়েছে",
                    title_en=f"Demo payment {demo_ref} recorded — appointment confirmed",
                )
                notify_user(
                    conn,
                    recipient_user_id=apt["doc_user_id"],
                    topic="NEW_CONFIRMED_APPOINTMENT",
                    entity_type="appointment",
                    entity_id=apt["id"],
                    title_bn=f"নতুন নিশ্চিতকৃত অ্যাপয়েন্টমেন্ট: {apt['booking_reference']}",
                    title_en=f"New confirmed booking: {apt['booking_reference']}",
                )
            record_audit(conn, actor_user_id=user["id"], actor_role="PATIENT", action_type=f"DEMO_CHECKOUT_{pay_status}", target_resource="demo_payments", target_id=pay_id)
            conn.execute("COMMIT;")
        except Exception:
            if conn.in_transaction:
                conn.execute("ROLLBACK;")
            raise

        payment = row_to_dict(
            conn.execute(
                """
                SELECT p.*, r.receipt_number, r.disclaimer_label, a.status AS appointment_status, a.booking_reference
                  FROM demo_payments p
                  JOIN appointments a ON a.id = p.appointment_id
                  LEFT JOIN demo_receipts r ON r.payment_id = p.id
                 WHERE p.id = ?
                """,
                (pay_id,),
            ).fetchone()
        )
    return {"payment": payment, "idempotent_replay": False}


@router.get("/patient/receipts/{payment_id}")
def get_demo_receipt(payment_id: str, user: dict = Depends(require_role("PATIENT"))):
    with get_db_conn() as conn:
        rec = row_to_dict(
            conn.execute(
                """
                SELECT p.*, r.receipt_number, r.disclaimer_label, r.issued_at_utc,
                       a.booking_reference, pp.display_name AS patient_name,
                       d.display_name AS doctor_name, d.display_name_bn AS doctor_name_bn, d.specialty
                  FROM demo_payments p
                  JOIN demo_receipts r ON r.payment_id = p.id
                  JOIN appointments a ON a.id = p.appointment_id
                  JOIN patient_profiles pp ON pp.id = a.patient_profile_id
                  JOIN doctor_profiles d ON d.id = a.doctor_id
                 WHERE p.id = ?
                """,
                (payment_id,),
            ).fetchone()
        )
        if not rec:
            raise HTTPException(status_code=404, detail="Receipt not found.")
        if rec["payer_user_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Access denied: cannot view another patient's receipt.")
    return {"receipt": rec}


@router.get("/patient/consultations")
def get_consultation_history(user: dict = Depends(require_role("PATIENT"))):
    with get_db_conn() as conn:
        pids = _owned_profile_ids(conn, user["id"])
        if not pids:
            return {"consultations": []}
        ph = ",".join("?" * len(pids))
        rows = rows_to_dicts(
            conn.execute(
                f"""
                SELECT a.id AS appointment_id, a.booking_reference, a.status, a.visit_reason_summary, a.created_at_utc,
                       d.id AS doctor_id, d.display_name AS doctor_name, d.display_name_bn AS doctor_name_bn, d.specialty,
                       cn.subjective_notes, cn.assessment_summary, cn.advice_summary, cn.followup_instruction, cn.followup_date, cn.state AS note_state,
                       rx.id AS eprescription_id, rx.rx_reference, rx.diagnosis_summary, rx.medications_json, rx.advice_notes AS rx_advice, rx.status AS rx_status
                  FROM appointments a
                  JOIN doctor_profiles d ON d.id = a.doctor_id
                  LEFT JOIN consultation_notes cn ON cn.appointment_id = a.id AND cn.state = 'SIGNED'
                  LEFT JOIN eprescriptions rx ON rx.appointment_id = a.id AND rx.status = 'SIGNED'
                 WHERE a.patient_profile_id IN ({ph})
                 ORDER BY a.created_at_utc DESC
                """,
                pids,
            ).fetchall()
        )
    return {"consultations": rows}


@router.get("/patient/documents")
def list_documents_and_ocr(user: dict = Depends(require_role("PATIENT"))):
    with get_db_conn() as conn:
        pids = _owned_profile_ids(conn, user["id"])
        if not pids:
            return {"documents": [], "ocr_jobs": []}
        ph = ",".join("?" * len(pids))
        docs = rows_to_dicts(
            conn.execute(
                f"SELECT * FROM medical_documents WHERE patient_profile_id IN ({ph}) ORDER BY created_at_utc DESC",
                pids,
            ).fetchall()
        )
        jobs = rows_to_dicts(
            conn.execute(
                f"""
                SELECT j.*, m.original_filename, m.patient_profile_id
                  FROM ocr_jobs j
                  JOIN medical_documents m ON m.id = j.document_id
                 WHERE m.patient_profile_id IN ({ph})
                 ORDER BY j.created_at_utc DESC
                """,
                pids,
            ).fetchall()
        )
        for job in jobs:
            job["fields"] = rows_to_dicts(
                conn.execute("SELECT * FROM ocr_fields WHERE ocr_job_id = ? ORDER BY group_index ASC, id ASC", (job["id"],)).fetchall()
            )
    return {"documents": docs, "ocr_jobs": jobs}


@router.post("/patient/documents", status_code=201)
def create_document_and_ocr_draft(payload: DocumentCreateRequest, user: dict = Depends(require_role("PATIENT"))):
    with get_db_conn() as conn:
        pids = _owned_profile_ids(conn, user["id"])
        pid = payload.patient_profile_id or pids[0]
        _assert_profile_owned(conn, user["id"], pid)
        doc_id = new_id("docu")
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            """
            INSERT INTO medical_documents (id, patient_profile_id, uploaded_by_user_id, doc_type, original_filename, storage_object_key, mime_type, byte_size, sha256_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?, 64000, ?)
            """,
            (doc_id, pid, user["id"], payload.doc_type, payload.original_filename, f"vault/{pid}/{doc_id}", payload.mime_type, sha256_hex(doc_id)),
        )
        job_id = None
        if payload.run_demo_ocr_draft and payload.doc_type == "PRESCRIPTION":
            job_id = new_id("ocr")
            conn.execute(
                "INSERT INTO ocr_jobs (id, document_id, status, mean_confidence, elapsed_ms) VALUES (?, ?, 'NEEDS_REVIEW', 0.65, 640)",
                (job_id, doc_id),
            )
            for idx, (ftype, txt, conf) in enumerate(
                [
                    ("MEDICINE_NAME", "Tab. Napa 500mg (OCR Draft — Verify)", 0.72),
                    ("DOSE", "1 tablet", 0.61),
                    ("FREQUENCY", "1+0+1 After Meal (Verify manually)", 0.58),
                ]
            ):
                conn.execute(
                    "INSERT INTO ocr_fields (id, ocr_job_id, group_index, field_type, raw_ocr_text, confidence, is_critical, is_verified) VALUES (?, ?, 0, ?, ?, ?, 1, 0)",
                    (new_id("ocrf"), job_id, ftype, txt, conf),
                )
        conn.execute("COMMIT;")
    return {"document_id": doc_id, "ocr_job_id": job_id}


@router.patch("/patient/ocr-fields/{field_id}/verify")
def verify_ocr_field(field_id: str, payload: VerifyOcrFieldRequest, user: dict = Depends(require_role("PATIENT"))):
    with get_db_conn() as conn:
        pids = _owned_profile_ids(conn, user["id"])
        row = row_to_dict(
            conn.execute(
                """
                SELECT f.*, m.patient_profile_id
                  FROM ocr_fields f
                  JOIN ocr_jobs j ON j.id = f.ocr_job_id
                  JOIN medical_documents m ON m.id = j.document_id
                 WHERE f.id = ?
                """,
                (field_id,),
            ).fetchone()
        )
        if not row or row["patient_profile_id"] not in pids:
            raise HTTPException(status_code=403, detail="Access denied.")
        now = utc_now_iso()
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            "UPDATE ocr_fields SET verified_value = ?, is_verified = 1, verified_by_user_id = ?, updated_at_utc = ? WHERE id = ?",
            (payload.verified_value.strip(), user["id"], now, field_id),
        )
        # Update job status if all critical fields acknowledged by patient (NOT clinician verified)
        unverified = conn.execute(
            "SELECT COUNT(*) FROM ocr_fields WHERE ocr_job_id = ? AND is_critical = 1 AND is_verified = 0",
            (row["ocr_job_id"],),
        ).fetchone()[0]
        auth_state = "PATIENT_ACKNOWLEDGED" if unverified == 0 else "PATIENT_CORRECTED"
        if unverified == 0:
            conn.execute(
                "UPDATE ocr_jobs SET status = 'VERIFIED', verified_by_user_id = ?, verified_at_utc = ? WHERE id = ?",
                (user["id"], now, row["ocr_job_id"]),
            )
        conn.execute(
            """
            INSERT INTO ocr_job_artifacts (
                id, ocr_job_id, raw_full_text, review_action, authorization_state,
                patient_acknowledged_by_user_id, patient_acknowledged_at_utc, updated_at_utc
            ) VALUES (?, ?, '', ?, ?, ?, ?, ?)
            ON CONFLICT(ocr_job_id) DO UPDATE SET
                review_action = excluded.review_action,
                authorization_state = CASE
                    WHEN ocr_job_artifacts.authorization_state IN ('DOCTOR_VERIFIED', 'AUTHORIZED_MEDICATION_PLAN')
                    THEN ocr_job_artifacts.authorization_state
                    ELSE excluded.authorization_state
                END,
                patient_acknowledged_by_user_id = excluded.patient_acknowledged_by_user_id,
                patient_acknowledged_at_utc = excluded.patient_acknowledged_at_utc,
                updated_at_utc = excluded.updated_at_utc
            """,
            (
                new_id("ocra"),
                row["ocr_job_id"],
                "VERIFIED" if unverified == 0 else "SAVED_DRAFT",
                auth_state,
                user["id"],
                now,
                now,
            ),
        )
        conn.execute("COMMIT;")
    return {
        "verified": True,
        "remaining_unverified_critical": unverified,
        "authorization_state": auth_state,
        "clinician_verified": False,
    }


@router.post("/patient/ocr-jobs/{job_id}/activate-plan")
def activate_medication_plan_from_ocr(job_id: str, payload: ActivateOcrPlanRequest, user: dict = Depends(require_role("PATIENT"))):
    """Hard SRS V2-T-031 + Clinical Authorization Gate: rejects IDOR (403), unverified fields (422), and patient self-authorization of clinician plans (403)."""
    with get_db_conn() as conn:
        _assert_profile_owned(conn, user["id"], payload.patient_profile_id)
        job_row = row_to_dict(
            conn.execute(
                """
                SELECT j.id, j.status, m.patient_profile_id,
                       COALESCE(a.authorization_state, 'RAW_OCR') AS authorization_state,
                       a.clinician_verified_by_user_id
                  FROM ocr_jobs j
                  JOIN medical_documents m ON m.id = j.document_id
                  LEFT JOIN ocr_job_artifacts a ON a.ocr_job_id = j.id
                 WHERE j.id = ?
                """,
                (job_id,),
            ).fetchone()
        )
        if not job_row:
            raise HTTPException(status_code=404, detail="OCR job not found.")
        pids = _owned_profile_ids(conn, user["id"])
        if job_row["patient_profile_id"] not in pids:
            conn.execute("BEGIN IMMEDIATE;")
            record_audit(
                conn,
                actor_user_id=user["id"],
                actor_role="PATIENT",
                action_type="OCR_JOB_CROSS_PATIENT_BLOCKED",
                target_resource="ocr_jobs",
                target_id=job_id,
                outcome="DENIED",
            )
            conn.execute("COMMIT;")
            raise HTTPException(status_code=403, detail="Access denied: OCR job does not belong to your family profiles.")
        fields = rows_to_dicts(conn.execute("SELECT * FROM ocr_fields WHERE ocr_job_id = ? ORDER BY group_index ASC", (job_id,)).fetchall())
        if not fields:
            raise HTTPException(status_code=404, detail="OCR job fields not found.")
        unverified = [f for f in fields if f["is_critical"] == 1 and f["is_verified"] == 0]
        if unverified:
            raise HTTPException(
                status_code=422,
                detail=f"UNVERIFIED_OCR_FIELDS: Cannot activate medication reminders while {len(unverified)} critical OCR field(s) remain unverified.",
            )

        clinician_id = job_row.get("clinician_verified_by_user_id")
        auth_state = job_row.get("authorization_state") or "RAW_OCR"
        is_clinician_verified = (auth_state in ("DOCTOR_VERIFIED", "AUTHORIZED_MEDICATION_PLAN")) and bool(clinician_id)

        if payload.activation_mode == "CLINICIAN_AUTHORIZED_PLAN" and not is_clinician_verified:
            conn.execute("BEGIN IMMEDIATE;")
            record_audit(
                conn,
                actor_user_id=user["id"],
                actor_role="PATIENT",
                action_type="OCR_UNAUTHORIZED_PLAN_ACTIVATION",
                target_resource="ocr_jobs",
                target_id=job_id,
                outcome="DENIED",
                details={"authorization_state": auth_state},
            )
            conn.execute("COMMIT;")
            raise HTTPException(
                status_code=403,
                detail="CLINICIAN_VERIFICATION_REQUIRED: Patient-edited OCR cannot activate a clinician-authorized medication plan without approved doctor verification.",
            )

        by_type = {f["field_type"]: (f["verified_value"] or f["raw_ocr_text"]) for f in fields if f["group_index"] == 0}
        plan_id = new_id("medp")
        now = utc_now_iso()
        if payload.activation_mode == "CLINICIAN_AUTHORIZED_PLAN":
            auth_type = "CLINICIAN_AUTHORIZED_PLAN"
            plan_status = "ACTIVE"
            clinician_authorized = True
            next_art_state = "AUTHORIZED_MEDICATION_PLAN"
        else:
            auth_type = "PATIENT_ACKNOWLEDGED_REMINDER"
            plan_status = "VERIFIED"
            clinician_authorized = False
            clinician_id = None
            next_art_state = "PATIENT_ACKNOWLEDGED"

        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            """
            INSERT INTO medication_plans (
                id, patient_profile_id, source_ocr_job_id, medicine_name, dose_text, frequency_rule,
                status, authorization_type, verified_by_user_id, clinician_verified_by_user_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                plan_id,
                payload.patient_profile_id,
                job_id,
                by_type.get("MEDICINE_NAME", "Verified Medicine"),
                by_type.get("DOSE", "1 unit"),
                by_type.get("FREQUENCY", "1+0+0"),
                plan_status,
                auth_type,
                user["id"],
                clinician_id,
            ),
        )
        conn.execute("UPDATE ocr_jobs SET status = 'SCHEDULED' WHERE id = ?", (job_id,))
        conn.execute(
            "UPDATE ocr_job_artifacts SET authorization_state = ?, updated_at_utc = ? WHERE ocr_job_id = ?",
            (next_art_state, now, job_id),
        )
        record_audit(
            conn,
            actor_user_id=user["id"],
            actor_role="PATIENT",
            action_type=f"MEDICATION_PLAN_{auth_type}",
            target_resource="medication_plans",
            target_id=plan_id,
            details={"authorization_type": auth_type, "clinician_authorized": clinician_authorized},
        )
        conn.execute("COMMIT;")
    return {
        "activated": True,
        "plan_id": plan_id,
        "authorization_type": auth_type,
        "plan_status": plan_status,
        "clinician_authorized": clinician_authorized,
        "warning": None if clinician_authorized else "Patient-acknowledged personal reminder draft only — not clinician prescribing authorization.",
    }


@router.post("/patient/medications/{plan_id}/log")
def log_medication_action(plan_id: str, payload: MedLogRequest, user: dict = Depends(require_role("PATIENT"))):
    with get_db_conn() as conn:
        pids = _owned_profile_ids(conn, user["id"])
        plan = row_to_dict(conn.execute("SELECT * FROM medication_plans WHERE id = ?", (plan_id,)).fetchone())
        if not plan or plan["patient_profile_id"] not in pids:
            raise HTTPException(status_code=403, detail="Access denied.")
        eid = new_id("mede")
        now = utc_now_iso()
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            "INSERT INTO medication_events (id, plan_id, due_utc, notification_status, action_status, acknowledged_at_utc) VALUES (?, ?, ?, 'DELIVERED', ?, ?)",
            (eid, plan_id, now, payload.action_status, now),
        )
        conn.execute("COMMIT;")
    return {"logged": True, "event_id": eid, "action_status": payload.action_status}


@router.get("/patient/pcos")
def get_pcos_logs(user: dict = Depends(require_role("PATIENT"))):
    with get_db_conn() as conn:
        pids = _owned_profile_ids(conn, user["id"])
        ph = ",".join("?" * len(pids))
        rows = rows_to_dicts(conn.execute(f"SELECT * FROM pcos_cycle_entries WHERE patient_profile_id IN ({ph}) ORDER BY start_date DESC", pids).fetchall())
    return {"entries": rows}


@router.post("/patient/pcos", status_code=201)
def add_pcos_log(payload: PcosEntryRequest, user: dict = Depends(require_role("PATIENT"))):
    with get_db_conn() as conn:
        pids = _owned_profile_ids(conn, user["id"])
        pid = payload.patient_profile_id or pids[0]
        _assert_profile_owned(conn, user["id"], pid)
        eid = new_id("pcos")
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            "INSERT INTO pcos_cycle_entries (id, patient_profile_id, start_date, end_date, cycle_length_days, symptoms_json, user_notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (eid, pid, payload.start_date, payload.end_date, payload.cycle_length_days, json.dumps(payload.symptoms_json), payload.user_notes),
        )
        conn.execute("COMMIT;")
    return {"id": eid}


@router.get("/patient/pediatric")
def get_pediatric_data(user: dict = Depends(require_role("PATIENT"))):
    with get_db_conn() as conn:
        pids = _owned_profile_ids(conn, user["id"])
        ph = ",".join("?" * len(pids))
        vaccines = rows_to_dicts(conn.execute(f"SELECT * FROM pediatric_vaccine_records WHERE child_profile_id IN ({ph}) ORDER BY due_date ASC", pids).fetchall())
        cases = rows_to_dicts(conn.execute(f"SELECT * FROM pediatric_intake_cases WHERE child_profile_id IN ({ph}) ORDER BY created_at_utc DESC", pids).fetchall())
    return {"vaccines": vaccines, "cases": cases}


@router.post("/patient/pediatric/triage", status_code=201)
def submit_pediatric_triage(payload: PediatricIntakeRequest, user: dict = Depends(require_role("PATIENT"))):
    """Deterministic reviewed pediatric red-flag engine (SRS V2-T-034)."""
    flags = []
    if payload.breathing_difficulty:
        flags.append("RED_FLAG_BREATHING_DISTRESS")
    if payload.lethargy_or_unresponsive:
        flags.append("RED_FLAG_LETHARGY")
    if payload.convulsions:
        flags.append("RED_FLAG_CONVULSIONS")
    if payload.unable_to_drink:
        flags.append("RED_FLAG_DEHYDRATION_RISK")
    if payload.petechiae_or_purple_spots:
        flags.append("RED_FLAG_NON_BLANCHING_RASH")
    if payload.age_months < 3 and payload.temp_f >= 100.4:
        flags.append("RED_FLAG_INFANT_FEVER_UNDER_3M")
    if payload.fever_days >= 4:
        flags.append("PROLONGED_FEVER_REVIEW")

    review_state = "URGENT_REVIEW" if any(f.startswith("RED_FLAG") for f in flags) else "NEEDS_HUMAN_ASSESSMENT"
    with get_db_conn() as conn:
        _assert_profile_owned(conn, user["id"], payload.child_profile_id)
        cid = new_id("ped")
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            """
            INSERT INTO pediatric_intake_cases (id, child_profile_id, submitted_by_user_id, reported_facts_json, escalation_flags_json, review_state)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (cid, payload.child_profile_id, user["id"], payload.model_dump_json(), json.dumps(flags), review_state),
        )
        conn.execute("COMMIT;")
    return {"case_id": cid, "review_state": review_state, "escalation_flags": flags, "deterministic_rule": True}


@router.post("/patient/diagnostics/order", status_code=201)
def order_demo_diagnostic(payload: DiagnosticOrderRequest, user: dict = Depends(require_role("PATIENT"))):
    with get_db_conn() as conn:
        pids = _owned_profile_ids(conn, user["id"])
        pid = payload.patient_profile_id or pids[0]
        _assert_profile_owned(conn, user["id"], pid)
        test = row_to_dict(conn.execute("SELECT * FROM diagnostic_tests WHERE id = ? AND is_active = 1", (payload.test_id,)).fetchone())
        if not test:
            raise HTTPException(status_code=404, detail="Diagnostic test not found.")
        oid = new_id("diagord")
        ref = f"DEMO-LAB-{oid.split('-')[1][:6].upper()}"
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            """
            INSERT INTO diagnostic_demo_orders (id, order_ref, patient_profile_id, test_id, preferred_date, collection_mode, fee_minor_poisha, payment_status, status, notes, is_simulated)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'DEMO_PAID', 'CONFIRMED_DEMO', ?, 1)
            """,
            (oid, ref, pid, test["id"], payload.preferred_date, payload.collection_mode, test["fee_minor_poisha"], payload.notes),
        )
        conn.execute("COMMIT;")
    return {"order_id": oid, "order_ref": ref, "is_simulated": True}


@router.post("/patient/tickets", status_code=201)
def create_patient_ticket(payload: PatientTicketCreateRequest, user: dict = Depends(require_role("PATIENT"))):
    tid = new_id("tkt")
    tnum = f"TKT-{tid.split('-')[1][:6].upper()}"
    with get_db_conn() as conn:
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            """
            INSERT INTO support_tickets (id, ticket_number, requester_user_id, category, related_appointment_id, related_demo_payment_id, subject)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (tid, tnum, user["id"], payload.category, payload.related_appointment_id, payload.related_demo_payment_id, payload.subject.strip()),
        )
        conn.execute(
            "INSERT INTO support_messages (id, ticket_id, sender_user_id, sender_role, visibility, body_text) VALUES (?, ?, ?, 'PATIENT', 'PUBLIC', ?)",
            (new_id("sm"), tid, user["id"], payload.message.strip()),
        )
        conn.execute("COMMIT;")
    return {"ticket_id": tid, "ticket_number": tnum}


@router.get("/patient/tickets/{ticket_id}")
def get_patient_ticket_detail(ticket_id: str, user: dict = Depends(require_role("PATIENT"))):
    with get_db_conn() as conn:
        tkt = row_to_dict(conn.execute("SELECT * FROM support_tickets WHERE id = ?", (ticket_id,)).fetchone())
        if not tkt or tkt["requester_user_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Cannot view another user's ticket.")
        # Strictly exclude INTERNAL staff notes from patient view!
        msgs = rows_to_dicts(
            conn.execute(
                "SELECT id, sender_role, body_text, created_at_utc FROM support_messages WHERE ticket_id = ? AND visibility = 'PUBLIC' ORDER BY created_at_utc ASC",
                (ticket_id,),
            ).fetchall()
        )
    return {"ticket": tkt, "messages": msgs}


@router.post("/patient/tickets/{ticket_id}/reply")
def reply_patient_ticket(ticket_id: str, payload: PatientTicketReplyRequest, user: dict = Depends(require_role("PATIENT"))):
    with get_db_conn() as conn:
        tkt = row_to_dict(conn.execute("SELECT * FROM support_tickets WHERE id = ?", (ticket_id,)).fetchone())
        if not tkt or tkt["requester_user_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Forbidden.")
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            "INSERT INTO support_messages (id, ticket_id, sender_user_id, sender_role, visibility, body_text) VALUES (?, ?, ?, 'PATIENT', 'PUBLIC', ?)",
            (new_id("sm"), ticket_id, user["id"], payload.body_text.strip()),
        )
        conn.execute("UPDATE support_tickets SET status = 'OPEN', updated_at_utc = ? WHERE id = ?", (utc_now_iso(), ticket_id))
        conn.execute("COMMIT;")
    return {"ok": True}
