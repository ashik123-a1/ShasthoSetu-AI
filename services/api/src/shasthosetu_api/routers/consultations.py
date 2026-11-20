from __future__ import annotations

import json
import time
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from ..config import settings
from ..core.dependencies import get_current_user
from ..db.sqlite import get_db_conn

router = APIRouter(prefix="/v1/consultations", tags=["Live Consultation Signaling & Pre-Call Intake"])


def _verify_room_access_and_payment(room_id: str, user: dict) -> dict[str, Any]:
    """
    Enforce strict Consultation Room Governance:
    1. Authentication required (caller session verified).
    2. Zero-PHI isolation: SUPPORT desk accounts are strictly barred from clinical rooms (HTTP 403).
    3. Clinical ownership: Only the booked patient, assigned doctor, or ADMIN may join (HTTP 403).
    4. Payment-before-call: Consultation must be confirmed/paid before entering (HTTP 402).
    """
    role = user.get("primary_role", "")
    user_id = user.get("id", "")

    if role == "SUPPORT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ERR_ZERO_PHI_FORBIDDEN: Support desk accounts are strictly barred from clinical consultation rooms.",
        )

    norm_id = room_id.strip()
    clean_id = norm_id.lower().removeprefix("apt-").removeprefix("room-")

    with get_db_conn() as conn:
        apt_row = conn.execute(
            """
            SELECT a.*, p.owner_user_id AS patient_owner_id, d.user_id AS doctor_user_id
              FROM appointments a
              LEFT JOIN patient_profiles p ON p.id = a.patient_profile_id
              LEFT JOIN doctor_profiles d ON d.id = a.doctor_id
             WHERE a.id = ? OR a.id = ? OR a.booking_reference = ? OR a.booking_reference = ?
             LIMIT 1
            """,
            (norm_id, clean_id, norm_id, clean_id),
        ).fetchone()

        if apt_row:
            apt = dict(apt_row)
            # Ownership check:
            if role == "PATIENT":
                if apt.get("booked_by_user_id") != user_id and apt.get("patient_owner_id") != user_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="ERR_CONSULTATION_ACCESS_DENIED: You are not authorized to access another patient's consultation room.",
                    )
            elif role == "DOCTOR":
                if apt.get("doctor_user_id") != user_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="ERR_CONSULTATION_ACCESS_DENIED: You are not the assigned doctor for this consultation.",
                    )
            elif role != "ADMIN":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="ERR_CONSULTATION_ACCESS_DENIED: Insufficient permissions to join consultation room.",
                )

            # Payment-before-call server-side enforcement:
            is_confirmed = apt.get("status") in ("CONFIRMED", "IN_CONSULTATION", "COMPLETED")
            has_paid_record = conn.execute(
                "SELECT 1 FROM demo_payments WHERE appointment_id = ? AND status = 'DEMO_PAID' LIMIT 1",
                (apt["id"],),
            ).fetchone() is not None

            if not is_confirmed and not has_paid_record:
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail="ERR_PAYMENT_REQUIRED_BEFORE_CONSULTATION: Payment must be completed before joining this consultation room.",
                )
            return apt

        # Fallback for unlinked generic preview rooms:
        if settings.env == "production":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="ERR_ROOM_NOT_FOUND: Consultation appointment not found.",
            )
        return {"id": norm_id, "status": "DEMO"}


def _ensure_room_durable(room_id: str, appointment_id: Optional[str] = None) -> None:
    norm_id = room_id.strip().lower()
    with get_db_conn() as conn:
        conn.execute(
            """
            INSERT OR IGNORE INTO consultation_rooms (room_id, appointment_id, status)
            VALUES (?, ?, 'ACTIVE')
            """,
            (norm_id, appointment_id),
        )


class JoinRoomPayload(BaseModel):
    peer_id: str = Field(..., min_length=2, max_length=64)
    role: str = Field(default="PATIENT", pattern="^(PATIENT|DOCTOR|ADMIN)$")
    display_name: str = Field(default="Participant", min_length=1, max_length=120)


class SignalPayload(BaseModel):
    from_peer: str = Field(..., min_length=2, max_length=64)
    to_peer: Optional[str] = None
    signal_type: str = Field(..., pattern="^(offer|answer|ice|ready|call_mode|end_call)$")
    data: Any


class ChatPayload(BaseModel):
    sender_peer_id: str
    sender_role: str = "PATIENT"
    sender_name: str
    text: str = Field(..., min_length=1, max_length=1500)


class PreConsultationIntakePayload(BaseModel):
    appointment_id: str
    consultation_modality: str = Field(default="VIDEO", pattern="^(VIDEO|AUDIO)$")
    symptoms_text: Optional[str] = Field(default="", max_length=2000)
    has_uploaded_report: bool = False
    report_filename: Optional[str] = None
    report_file_type: Optional[str] = None
    has_audio_memo: bool = False
    audio_memo_duration_sec: Optional[int] = None
    payment_reference: Optional[str] = None


@router.post("/rooms/{room_id}/join")
def join_consultation_room(
    room_id: str,
    payload: JoinRoomPayload,
    user: dict = Depends(get_current_user),
):
    apt = _verify_room_access_and_payment(room_id, user)
    norm_id = room_id.strip().lower()
    now = time.time()
    _ensure_room_durable(norm_id, appointment_id=apt.get("id"))

    with get_db_conn() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO consultation_peers (room_id, peer_id, user_id, role, display_name, last_seen_utc)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (norm_id, payload.peer_id, user["id"], user["primary_role"], payload.display_name, now),
        )

        # Retrieve active peers (active within last 60 seconds)
        peer_rows = conn.execute(
            """
            SELECT peer_id, role, display_name, last_seen_utc
              FROM consultation_peers
             WHERE room_id = ? AND (? - last_seen_utc) < 60
            """,
            (norm_id, now),
        ).fetchall()
        active_peers = [
            {"peer_id": r["peer_id"], "role": r["role"], "display_name": r["display_name"], "last_seen": r["last_seen_utc"]}
            for r in peer_rows
        ]

        # Retrieve intake
        room_row = conn.execute(
            "SELECT intake_json FROM consultation_rooms WHERE room_id = ?",
            (norm_id,),
        ).fetchone()
        intake = json.loads(room_row["intake_json"]) if room_row and room_row["intake_json"] else None

        # Retrieve recent 20 chat messages
        chat_rows = conn.execute(
            """
            SELECT id, sender_peer_id, sender_name AS name, message_text AS text, sent_at_iso AS time, created_at_utc AS ts
              FROM consultation_messages
             WHERE room_id = ?
             ORDER BY created_at_utc ASC
             LIMIT 20
            """,
            (norm_id,),
        ).fetchall()
        chat_history = [dict(r) for r in chat_rows]

    return {
        "room_id": norm_id,
        "peer_id": payload.peer_id,
        "active_peers": active_peers,
        "intake": intake,
        "chat_history": chat_history,
    }


@router.post("/rooms/{room_id}/signal")
def send_signal(
    room_id: str,
    payload: SignalPayload,
    user: dict = Depends(get_current_user),
):
    _verify_room_access_and_payment(room_id, user)
    norm_id = room_id.strip().lower()
    now = time.time()
    _ensure_room_durable(norm_id)

    with get_db_conn() as conn:
        cur = conn.execute(
            """
            INSERT INTO consultation_signals (room_id, from_peer, to_peer, signal_type, data_json, created_at_utc)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (norm_id, payload.from_peer, payload.to_peer, payload.signal_type, json.dumps(payload.data), now),
        )
        sig_id = cur.lastrowid

        # Update sender peer activity
        conn.execute(
            "UPDATE consultation_peers SET last_seen_utc = ? WHERE room_id = ? AND peer_id = ?",
            (now, norm_id, payload.from_peer),
        )

        # Auto-prune signals older than 1 hour to keep SQLite compact
        conn.execute("DELETE FROM consultation_signals WHERE room_id = ? AND created_at_utc < ?", (norm_id, now - 3600))

    return {"status": "dispatched", "signal_id": sig_id}


@router.get("/rooms/{room_id}/poll")
def poll_room(
    room_id: str,
    peer_id: str,
    since_signal_id: int = 0,
    since_chat_ts: float = 0.0,
    user: dict = Depends(get_current_user),
):
    _verify_room_access_and_payment(room_id, user)
    norm_id = room_id.strip().lower()
    now = time.time()

    with get_db_conn() as conn:
        # Update peer heartbeat
        conn.execute(
            "UPDATE consultation_peers SET last_seen_utc = ? WHERE room_id = ? AND peer_id = ?",
            (now, norm_id, peer_id),
        )

        # Signals directed to this peer or broadcast, created after since_signal_id
        sig_rows = conn.execute(
            """
            SELECT id, from_peer, to_peer, signal_type AS type, data_json, created_at_utc AS ts
              FROM consultation_signals
             WHERE room_id = ?
               AND id > ?
               AND from_peer != ?
               AND (to_peer IS NULL OR to_peer = ?)
             ORDER BY id ASC
            """,
            (norm_id, since_signal_id, peer_id, peer_id),
        ).fetchall()
        new_signals = []
        for r in sig_rows:
            try:
                data = json.loads(r["data_json"])
            except Exception:
                data = r["data_json"]
            new_signals.append({
                "id": r["id"],
                "from_peer": r["from_peer"],
                "to_peer": r["to_peer"],
                "type": r["type"],
                "data": data,
                "ts": r["ts"],
            })

        # New chat messages
        chat_rows = conn.execute(
            """
            SELECT id, sender_peer_id, sender_name AS name, message_text AS text, sent_at_iso AS time, created_at_utc AS ts
              FROM consultation_messages
             WHERE room_id = ?
               AND created_at_utc > ?
               AND sender_peer_id != ?
             ORDER BY created_at_utc ASC
            """,
            (norm_id, since_chat_ts, peer_id),
        ).fetchall()
        new_chat = [dict(c) for c in chat_rows]

        # Active peers (< 45s)
        peer_rows = conn.execute(
            """
            SELECT peer_id, role, display_name, last_seen_utc
              FROM consultation_peers
             WHERE room_id = ? AND (? - last_seen_utc) < 45
            """,
            (norm_id, now),
        ).fetchall()
        active_peers = [
            {"peer_id": r["peer_id"], "role": r["role"], "display_name": r["display_name"], "last_seen": r["last_seen_utc"]}
            for r in peer_rows
        ]

        # Latest signal ID
        max_sig = conn.execute(
            "SELECT COALESCE(MAX(id), ?) FROM consultation_signals WHERE room_id = ?",
            (since_signal_id, norm_id),
        ).fetchone()[0]

        # Intake
        room_row = conn.execute(
            "SELECT intake_json FROM consultation_rooms WHERE room_id = ?",
            (norm_id,),
        ).fetchone()
        intake = json.loads(room_row["intake_json"]) if room_row and room_row["intake_json"] else None

    return {
        "room_id": norm_id,
        "active_peers": active_peers,
        "signals": new_signals,
        "chat": new_chat,
        "intake": intake,
        "latest_signal_id": max_sig,
        "now_ts": now,
    }


@router.post("/rooms/{room_id}/chat")
def post_room_chat(
    room_id: str,
    payload: ChatPayload,
    user: dict = Depends(get_current_user),
):
    _verify_room_access_and_payment(room_id, user)
    norm_id = room_id.strip().lower()
    now = time.time()
    msg_id = f"msg-{int(now * 1000)}"
    time_str = time.strftime("%I:%M %p")
    _ensure_room_durable(norm_id)

    with get_db_conn() as conn:
        conn.execute(
            """
            INSERT INTO consultation_messages (id, room_id, sender_peer_id, sender_user_id, sender_role, sender_name, message_text, sent_at_iso, created_at_utc)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (msg_id, norm_id, payload.sender_peer_id, user["id"], user["primary_role"], payload.sender_name, payload.text, time_str, now),
        )

    msg_entry = {
        "id": msg_id,
        "sender_peer_id": payload.sender_peer_id,
        "sender_role": user["primary_role"],
        "name": payload.sender_name,
        "text": payload.text,
        "time": time_str,
        "ts": now,
    }
    return {"status": "sent", "message": msg_entry}


@router.post("/rooms/{room_id}/intake")
def save_room_intake(
    room_id: str,
    payload: PreConsultationIntakePayload,
    user: dict = Depends(get_current_user),
):
    _verify_room_access_and_payment(room_id, user)
    norm_id = room_id.strip().lower()
    now = time.time()
    _ensure_room_durable(norm_id, appointment_id=payload.appointment_id)

    intake_data = payload.model_dump()
    intake_data["submitted_at"] = now
    intake_data["submitted_by_user_id"] = user["id"]

    time_str = time.strftime("%I:%M %p")
    sys_msg_id = f"intake-note-{int(now * 1000)}"
    sys_msg_text = f"📋 Patient pre-consultation intake submitted (Mode: {payload.consultation_modality}). Symptoms: {payload.symptoms_text or 'None specified'}."

    with get_db_conn() as conn:
        conn.execute(
            "UPDATE consultation_rooms SET intake_json = ? WHERE room_id = ?",
            (json.dumps(intake_data), norm_id),
        )
        conn.execute(
            """
            INSERT INTO consultation_messages (id, room_id, sender_peer_id, sender_user_id, sender_role, sender_name, message_text, sent_at_iso, created_at_utc)
            VALUES (?, ?, 'system', 'system', 'SYSTEM', 'Clinical Intake Desk', ?, ?, ?)
            """,
            (sys_msg_id, norm_id, sys_msg_text, time_str, now),
        )

    return {"status": "saved", "intake": intake_data}


@router.get("/rooms/{room_id}/intake")
def get_room_intake(
    room_id: str,
    user: dict = Depends(get_current_user),
):
    _verify_room_access_and_payment(room_id, user)
    norm_id = room_id.strip().lower()
    with get_db_conn() as conn:
        room_row = conn.execute(
            "SELECT intake_json FROM consultation_rooms WHERE room_id = ?",
            (norm_id,),
        ).fetchone()
        intake = json.loads(room_row["intake_json"]) if room_row and room_row["intake_json"] else None
    return {"room_id": norm_id, "intake": intake}


@router.post("/rooms/{room_id}/leave")
def leave_room(
    room_id: str,
    peer_id: str,
    user: dict = Depends(get_current_user),
):
    norm_id = room_id.strip().lower()
    with get_db_conn() as conn:
        conn.execute(
            "DELETE FROM consultation_peers WHERE room_id = ? AND peer_id = ?",
            (norm_id, peer_id),
        )
    return {"status": "left"}
