from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..core.audit import notify_user, record_audit
from ..core.dependencies import require_role
from ..core.security import new_id, utc_now_iso
from ..db.sqlite import get_db_conn, row_to_dict, rows_to_dicts
from ..seeds.seed_demo import _seed_business_and_six_month_ledger

router = APIRouter(prefix="/v1/support", tags=["Support Helpdesk (Zero-PHI Policy)"])

ZERO_PHI_NOTICE = (
    "Zero-PHI Policy Active: Clinical consultation notes, prescriptions, OCR medical documents, "
    "PCOS logs, pediatric symptoms, and visit symptoms are excluded from Support queries."
)

# Strictly Zero-PHI transaction projection: item_title (clinical/medicine/lab names) is PERMANENTLY EXCLUDED!
_SUPPORT_TXN_COLUMNS = """
    pt.id,
    pt.txn_ref,
    pt.receipt_number,
    pt.revenue_stream,
    pt.support_safe_label,
    pt.payer_name_masked,
    pt.gateway_method,
    pt.bank_account_id,
    b.account_code AS bank_account_code,
    b.provider_name AS bank_provider_name,
    pt.gross_amount_minor_poisha,
    pt.commission_rate_pct,
    pt.commission_minor_poisha,
    pt.status,
    pt.billing_month,
    pt.created_at_utc,
    pt.updated_at_utc
"""


class SupportTxnDisputeRequest(BaseModel):
    reason: str = Field(default="Support billing inquiry flagged for Admin Treasury reconciliation", max_length=300)


class SupportReplyRequest(BaseModel):
    body_text: str = Field(..., min_length=2, max_length=2000)
    visibility: str = Field(default="PUBLIC")  # PUBLIC | INTERNAL


class SupportStatusPatchRequest(BaseModel):
    status: str
    reason: Optional[str] = Field(default=None, max_length=300)


class SupportEscalateRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=400)
    priority: str = Field(default="URGENT")


@router.get("/dashboard")
def support_dashboard(user: dict = Depends(require_role("SUPPORT"))):
    with get_db_conn() as conn:
        _seed_business_and_six_month_ledger(conn, utc_now_iso())
        counts = row_to_dict(
            conn.execute(
                """
                SELECT
                    COUNT(*) AS total_tickets,
                    SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) AS open_count,
                    SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS in_progress_count,
                    SUM(CASE WHEN status = 'WAITING_FOR_USER' THEN 1 ELSE 0 END) AS waiting_count,
                    SUM(CASE WHEN status = 'ESCALATED' THEN 1 ELSE 0 END) AS escalated_count,
                    SUM(CASE WHEN status IN ('RESOLVED', 'CLOSED') THEN 1 ELSE 0 END) AS resolved_count,
                    SUM(CASE WHEN priority IN ('HIGH', 'URGENT') AND status NOT IN ('RESOLVED', 'CLOSED') THEN 1 ELSE 0 END) AS urgent_open_count
                  FROM support_tickets
                """
            ).fetchone()
        ) or {}
        # Zero-PHI column projection only: no clinical columns queried
        recent_tickets = rows_to_dicts(
            conn.execute(
                """
                SELECT st.id, st.ticket_number, st.category, st.priority, st.status, st.subject,
                       st.assignee_support_user_id, st.related_appointment_id, st.related_demo_payment_id,
                       st.created_at_utc, st.updated_at_utc,
                       u.full_name AS requester_name, u.email AS requester_email, u.primary_role AS requester_role,
                       a.booking_reference AS appointment_ref, a.status AS appointment_status,
                       dp.demo_ref AS payment_ref, dp.status AS payment_status
                  FROM support_tickets st
                  JOIN users u ON u.id = st.requester_user_id
                  LEFT JOIN appointments a ON a.id = st.related_appointment_id
                  LEFT JOIN demo_payments dp ON dp.id = st.related_demo_payment_id
                 ORDER BY CASE WHEN st.priority = 'URGENT' THEN 0 WHEN st.priority = 'HIGH' THEN 1 ELSE 2 END, st.updated_at_utc DESC
                 LIMIT 20
                """
            ).fetchall()
        )
        txn_kpis = row_to_dict(
            conn.execute(
                """
                SELECT
                    COUNT(*) AS total_txns,
                    SUM(CASE WHEN status IN ('PAID', 'SETTLED') THEN 1 ELSE 0 END) AS paid_txns,
                    SUM(CASE WHEN status = 'REFUNDED' THEN 1 ELSE 0 END) AS refunded_txns,
                    SUM(CASE WHEN status = 'DISPUTED' THEN 1 ELSE 0 END) AS disputed_txns,
                    COALESCE(SUM(CASE WHEN status IN ('PAID', 'SETTLED') THEN gross_amount_minor_poisha ELSE 0 END), 0) AS total_verified_poisha
                  FROM platform_transactions
                """
            ).fetchone()
        ) or {}
        recent_txns = rows_to_dicts(
            conn.execute(
                f"""
                SELECT {_SUPPORT_TXN_COLUMNS}
                  FROM platform_transactions pt
                  JOIN bank_settlement_accounts b ON b.id = pt.bank_account_id
                 ORDER BY pt.created_at_utc DESC
                 LIMIT 25
                """
            ).fetchall()
        )
        return {
            "kpis": counts,
            "recent_tickets": recent_tickets,
            "transaction_kpis": txn_kpis,
            "recent_transactions": recent_txns,
            "zero_phi_policy": ZERO_PHI_NOTICE,
        }


@router.get("/transactions")
def list_support_transactions_zero_phi(
    status: Optional[str] = None,
    revenue_stream: Optional[str] = None,
    q: Optional[str] = None,
    user: dict = Depends(require_role("SUPPORT")),
):
    """Support Desk TNX-Only view: returns commercial transaction IDs, receipts, gateway, amount, and status while stripping all medical/clinical item names."""
    with get_db_conn() as conn:
        _seed_business_and_six_month_ledger(conn, utc_now_iso())
        sql = f"""
            SELECT {_SUPPORT_TXN_COLUMNS}
              FROM platform_transactions pt
              JOIN bank_settlement_accounts b ON b.id = pt.bank_account_id
             WHERE 1=1
        """
        params: list = []
        if status:
            sql += " AND pt.status = ?"
            params.append(status)
        if revenue_stream:
            sql += " AND pt.revenue_stream = ?"
            params.append(revenue_stream)
        if q:
            like = f"%{q.strip()}%"
            sql += " AND (pt.txn_ref LIKE ? OR pt.receipt_number LIKE ? OR pt.payer_name_masked LIKE ? OR pt.gateway_method LIKE ?)"
            params.extend([like, like, like, like])
        sql += " ORDER BY pt.created_at_utc DESC LIMIT 100"
        rows = rows_to_dicts(conn.execute(sql, tuple(params)).fetchall())
        return {
            "transactions": rows,
            "redacted_phi_fields": [
                "item_title_clinical_details",
                "medicine_skus_and_dosages",
                "diagnostic_panel_clinical_names",
                "consultation_notes",
                "eprescriptions",
            ],
            "zero_phi_policy": ZERO_PHI_NOTICE,
        }


@router.post("/transactions/{txn_id}/flag-dispute")
def flag_support_transaction_dispute(
    txn_id: str,
    payload: SupportTxnDisputeRequest,
    user: dict = Depends(require_role("SUPPORT")),
):
    """Allows Support Officer to flag a transaction for Admin billing review without accessing PHI."""
    with get_db_conn() as conn:
        tx = row_to_dict(
            conn.execute(
                f"SELECT {_SUPPORT_TXN_COLUMNS} FROM platform_transactions pt JOIN bank_settlement_accounts b ON b.id = pt.bank_account_id WHERE pt.id = ?",
                (txn_id,),
            ).fetchone()
        )
        if not tx:
            raise HTTPException(status_code=404, detail="Transaction not found.")
        now = utc_now_iso()
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            "UPDATE platform_transactions SET status = 'DISPUTED', updated_at_utc = ? WHERE id = ?",
            (now, txn_id),
        )
        record_audit(
            conn,
            actor_user_id=user["id"],
            actor_role="SUPPORT",
            action_type="SUPPORT_TXN_DISPUTE_FLAGGED",
            target_resource="platform_transactions",
            target_id=txn_id,
            details={"txn_ref": tx["txn_ref"], "reason": payload.reason.strip()},
        )
        conn.execute("COMMIT;")
        return {"transaction_id": txn_id, "txn_ref": tx["txn_ref"], "status": "DISPUTED"}


@router.get("/tickets")
def list_support_tickets(
    status: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    q: Optional[str] = None,
    user: dict = Depends(require_role("SUPPORT")),
):
    sql = """
        SELECT st.id, st.ticket_number, st.category, st.priority, st.status, st.subject,
               st.assignee_support_user_id, st.related_appointment_id, st.related_demo_payment_id,
               st.created_at_utc, st.updated_at_utc,
               u.full_name AS requester_name, u.email AS requester_email, u.phone AS requester_phone,
               u.primary_role AS requester_role,
               a.booking_reference AS appointment_ref, a.status AS appointment_status, a.consultation_mode,
               dp.demo_ref AS payment_ref, dp.status AS payment_status, dp.amount_minor_poisha
          FROM support_tickets st
          JOIN users u ON u.id = st.requester_user_id
          LEFT JOIN appointments a ON a.id = st.related_appointment_id
          LEFT JOIN demo_payments dp ON dp.id = st.related_demo_payment_id
         WHERE 1=1
    """
    params: list = []
    if status:
        sql += " AND st.status = ?"
        params.append(status)
    if category:
        sql += " AND st.category = ?"
        params.append(category)
    if priority:
        sql += " AND st.priority = ?"
        params.append(priority)
    if q:
        like = f"%{q.strip()}%"
        sql += " AND (st.ticket_number LIKE ? OR st.subject LIKE ? OR u.full_name LIKE ? OR COALESCE(a.booking_reference,'') LIKE ?)"
        params.extend([like, like, like, like])
    sql += " ORDER BY st.updated_at_utc DESC"
    with get_db_conn() as conn:
        rows = rows_to_dicts(conn.execute(sql, tuple(params)).fetchall())
        return {"tickets": rows, "zero_phi_policy": ZERO_PHI_NOTICE}


@router.get("/tickets/{ticket_id}")
def get_support_ticket_detail(ticket_id: str, user: dict = Depends(require_role("SUPPORT"))):
    with get_db_conn() as conn:
        ticket = row_to_dict(
            conn.execute(
                """
                SELECT st.id, st.ticket_number, st.category, st.priority, st.status, st.subject,
                       st.assignee_support_user_id, st.related_appointment_id, st.related_demo_payment_id,
                       st.created_at_utc, st.updated_at_utc,
                       u.full_name AS requester_name, u.email AS requester_email, u.phone AS requester_phone,
                       u.primary_role AS requester_role,
                       a.booking_reference AS appointment_ref, a.status AS appointment_status,
                       a.consultation_mode, a.fee_minor_poisha,
                       d.display_name AS doctor_name,
                       dp.demo_ref AS payment_ref, dp.method AS payment_method,
                       dp.amount_minor_poisha AS payment_amount_minor_poisha,
                       dp.status AS payment_status, dp.failure_reason_code
                  FROM support_tickets st
                  JOIN users u ON u.id = st.requester_user_id
                  LEFT JOIN appointments a ON a.id = st.related_appointment_id
                  LEFT JOIN doctor_profiles d ON d.id = a.doctor_id
                  LEFT JOIN demo_payments dp ON dp.id = st.related_demo_payment_id
                 WHERE st.id = ?
                """,
                (ticket_id,),
            ).fetchone()
        )
        if not ticket:
            raise HTTPException(status_code=404, detail="Support ticket not found.")
        messages = rows_to_dicts(
            conn.execute(
                """
                SELECT sm.*, u.full_name AS sender_name
                  FROM support_messages sm
                  JOIN users u ON u.id = sm.sender_user_id
                 WHERE sm.ticket_id = ?
                 ORDER BY sm.created_at_utc ASC
                """,
                (ticket_id,),
            ).fetchall()
        )
        events = rows_to_dicts(
            conn.execute(
                "SELECT * FROM ticket_events WHERE ticket_id = ? ORDER BY created_at_utc DESC",
                (ticket_id,),
            ).fetchall()
        )
        return {
            "ticket": ticket,
            "messages": messages,
            "events": events,
            "redacted_fields": ["visit_reason_summary", "prep_symptoms_text", "consultation_notes", "eprescriptions", "medical_documents"],
            "zero_phi_policy": ZERO_PHI_NOTICE,
        }


@router.post("/tickets/{ticket_id}/reply", status_code=201)
def reply_support_ticket(ticket_id: str, payload: SupportReplyRequest, user: dict = Depends(require_role("SUPPORT"))):
    if payload.visibility not in ("PUBLIC", "INTERNAL"):
        raise HTTPException(status_code=422, detail="visibility must be PUBLIC or INTERNAL.")

    with get_db_conn() as conn:
        ticket = row_to_dict(conn.execute("SELECT * FROM support_tickets WHERE id = ?", (ticket_id,)).fetchone())
        if not ticket:
            raise HTTPException(status_code=404, detail="Support ticket not found.")

        msg_id = new_id("tmsg")
        now = utc_now_iso()
        new_status = ticket["status"]
        if payload.visibility == "PUBLIC" and ticket["status"] in ("OPEN", "IN_PROGRESS"):
            new_status = "WAITING_FOR_USER"
        elif payload.visibility == "INTERNAL" and ticket["status"] == "OPEN":
            new_status = "IN_PROGRESS"

        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            """
            INSERT INTO support_messages (id, ticket_id, sender_user_id, sender_role, visibility, body_text, created_at_utc)
            VALUES (?, ?, ?, 'SUPPORT', ?, ?, ?)
            """,
            (msg_id, ticket_id, user["id"], payload.visibility, payload.body_text.strip(), now),
        )
        conn.execute(
            """
            UPDATE support_tickets
               SET assignee_support_user_id = COALESCE(assignee_support_user_id, ?),
                   status = ?,
                   version = version + 1,
                   updated_at_utc = ?
             WHERE id = ?
            """,
            (user["id"], new_status, now, ticket_id),
        )
        conn.execute(
            "INSERT INTO ticket_events (id, ticket_id, actor_user_id, transition_type, reason) VALUES (?, ?, ?, ?, ?)",
            (new_id("tevt"), ticket_id, user["id"], f"REPLY_{payload.visibility}", f"Status -> {new_status}"),
        )
        if payload.visibility == "PUBLIC":
            notify_user(
                conn,
                recipient_user_id=ticket["requester_user_id"],
                topic="SUPPORT_REPLY",
                entity_type="support_ticket",
                entity_id=ticket_id,
                title_bn=f"সাপোর্ট টিকিট {ticket['ticket_number']}-এ নতুন উত্তর এসেছে।",
                title_en=f"New support reply on ticket {ticket['ticket_number']}.",
            )
        record_audit(
            conn,
            actor_user_id=user["id"],
            actor_role="SUPPORT",
            action_type=f"SUPPORT_REPLY_{payload.visibility}",
            target_resource="support_tickets",
            target_id=ticket_id,
        )
        conn.execute("COMMIT;")
        return {"message_id": msg_id, "visibility": payload.visibility, "ticket_status": new_status}


@router.patch("/tickets/{ticket_id}/status")
def update_support_ticket_status(ticket_id: str, payload: SupportStatusPatchRequest, user: dict = Depends(require_role("SUPPORT"))):
    allowed = {"OPEN", "IN_PROGRESS", "WAITING_FOR_USER", "RESOLVED", "CLOSED"}
    if payload.status not in allowed:
        raise HTTPException(status_code=422, detail=f"Invalid status. Allowed: {sorted(allowed)}")

    with get_db_conn() as conn:
        ticket = row_to_dict(conn.execute("SELECT * FROM support_tickets WHERE id = ?", (ticket_id,)).fetchone())
        if not ticket:
            raise HTTPException(status_code=404, detail="Support ticket not found.")
        now = utc_now_iso()
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            """
            UPDATE support_tickets
               SET status = ?, assignee_support_user_id = COALESCE(assignee_support_user_id, ?),
                   version = version + 1, updated_at_utc = ?
             WHERE id = ?
            """,
            (payload.status, user["id"], now, ticket_id),
        )
        conn.execute(
            "INSERT INTO ticket_events (id, ticket_id, actor_user_id, transition_type, reason) VALUES (?, ?, ?, 'STATUS_CHANGE', ?)",
            (new_id("tevt"), ticket_id, user["id"], payload.reason or f"{ticket['status']} -> {payload.status}"),
        )
        record_audit(
            conn,
            actor_user_id=user["id"],
            actor_role="SUPPORT",
            action_type="SUPPORT_TICKET_STATUS",
            target_resource="support_tickets",
            target_id=ticket_id,
            details={"from": ticket["status"], "to": payload.status},
        )
        conn.execute("COMMIT;")
        return {"ticket_id": ticket_id, "status": payload.status}


@router.post("/tickets/{ticket_id}/escalate")
def escalate_support_ticket(ticket_id: str, payload: SupportEscalateRequest, user: dict = Depends(require_role("SUPPORT"))):
    if payload.priority not in ("HIGH", "URGENT"):
        raise HTTPException(status_code=422, detail="Escalated priority must be HIGH or URGENT.")
    with get_db_conn() as conn:
        ticket = row_to_dict(conn.execute("SELECT * FROM support_tickets WHERE id = ?", (ticket_id,)).fetchone())
        if not ticket:
            raise HTTPException(status_code=404, detail="Support ticket not found.")
        now = utc_now_iso()
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            "UPDATE support_tickets SET status = 'ESCALATED', priority = ?, version = version + 1, updated_at_utc = ? WHERE id = ?",
            (payload.priority, now, ticket_id),
        )
        conn.execute(
            """
            INSERT INTO support_messages (id, ticket_id, sender_user_id, sender_role, visibility, body_text, created_at_utc)
            VALUES (?, ?, ?, 'SUPPORT', 'INTERNAL', ?, ?)
            """,
            (new_id("tmsg"), ticket_id, user["id"], f"[ESCALATED TO ADMIN] {payload.reason.strip()}", now),
        )
        conn.execute(
            "INSERT INTO ticket_events (id, ticket_id, actor_user_id, transition_type, reason) VALUES (?, ?, ?, 'ESCALATED', ?)",
            (new_id("tevt"), ticket_id, user["id"], payload.reason.strip()),
        )
        admins = conn.execute("SELECT id FROM users WHERE primary_role = 'ADMIN' AND account_status = 'ACTIVE'").fetchall()
        for adm in admins:
            notify_user(
                conn,
                recipient_user_id=adm["id"],
                topic="SUPPORT_ESCALATION",
                entity_type="support_ticket",
                entity_id=ticket_id,
                title_bn=f"এস্কেলেশন: সাপোর্ট টিকিট {ticket['ticket_number']}",
                title_en=f"Escalation: Support ticket {ticket['ticket_number']} requires Admin review.",
            )
        record_audit(
            conn,
            actor_user_id=user["id"],
            actor_role="SUPPORT",
            action_type="SUPPORT_TICKET_ESCALATED",
            target_resource="support_tickets",
            target_id=ticket_id,
            details={"reason": payload.reason.strip()},
        )
        conn.execute("COMMIT;")
        return {"ticket_id": ticket_id, "status": "ESCALATED", "priority": payload.priority}


@router.get("/clinical-guard/{appointment_id}")
def block_clinical_phi_access(appointment_id: str, user: dict = Depends(require_role("SUPPORT"))):
    """Explicit Zero-PHI barrier demonstrating Support is permanently blocked from clinical notes & patient records."""
    with get_db_conn() as conn:
        conn.execute("BEGIN IMMEDIATE;")
        record_audit(
            conn,
            actor_user_id=user["id"],
            actor_role="SUPPORT",
            action_type="SUPPORT_ZERO_PHI_BLOCKED",
            target_resource="clinical_phi",
            target_id=appointment_id,
            outcome="DENIED",
            details={"policy": "ZERO_PHI_SUPPORT"},
        )
        conn.execute("COMMIT;")
    raise HTTPException(
        status_code=403,
        detail="PHI_ACCESS_DENIED: Support agents cannot access clinical notes, prescriptions, or patient health records.",
    )
