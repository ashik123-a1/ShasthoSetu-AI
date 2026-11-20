from __future__ import annotations

import time
from typing import Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/v1/consultations", tags=["Live Consultation Signaling & Pre-Call Intake"])

# In-memory signaling & intake store for real-time 2-device WebRTC coordination
_ROOMS: dict[str, dict[str, Any]] = {}


def _get_or_create_room(room_id: str) -> dict[str, Any]:
    norm_id = room_id.strip().lower()
    if norm_id not in _ROOMS:
        _ROOMS[norm_id] = {
            "room_id": norm_id,
            "created_at": time.time(),
            "peers": {},  # peer_id -> { "role": str, "display_name": str, "last_seen": float }
            "signals": [],  # list of { "id": int, "from_peer": str, "to_peer": Optional[str], "type": str, "data": Any, "ts": float }
            "chat": [],  # list of { "id": str, "sender": str, "name": str, "text": str, "time": str, "ts": float }
            "intake": None,  # optional pre-consultation intake dict
            "signal_seq": 0,
        }
    return _ROOMS[norm_id]


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
def join_consultation_room(room_id: str, payload: JoinRoomPayload):
    room = _get_or_create_room(room_id)
    now = time.time()
    room["peers"][payload.peer_id] = {
        "peer_id": payload.peer_id,
        "role": payload.role,
        "display_name": payload.display_name,
        "last_seen": now,
    }

    # Clean inactive peers (> 60s)
    active_peers = {
        pid: p for pid, p in room["peers"].items() if now - p["last_seen"] < 60 or pid == payload.peer_id
    }
    room["peers"] = active_peers

    return {
        "room_id": room["room_id"],
        "peer_id": payload.peer_id,
        "active_peers": list(active_peers.values()),
        "intake": room.get("intake"),
        "chat_history": room.get("chat", [])[-20:],
    }


@router.post("/rooms/{room_id}/signal")
def send_signal(room_id: str, payload: SignalPayload):
    room = _get_or_create_room(room_id)
    now = time.time()
    room["signal_seq"] += 1
    sig_entry = {
        "id": room["signal_seq"],
        "from_peer": payload.from_peer,
        "to_peer": payload.to_peer,
        "type": payload.signal_type,
        "data": payload.data,
        "ts": now,
    }
    room["signals"].append(sig_entry)

    # Keep signal buffer bounded
    if len(room["signals"]) > 200:
        room["signals"] = room["signals"][-100:]

    # Update sender activity
    if payload.from_peer in room["peers"]:
        room["peers"][payload.from_peer]["last_seen"] = now

    return {"status": "dispatched", "signal_id": sig_entry["id"]}


@router.get("/rooms/{room_id}/poll")
def poll_room(room_id: str, peer_id: str, since_signal_id: int = 0, since_chat_ts: float = 0.0):
    room = _get_or_create_room(room_id)
    now = time.time()

    # Touch peer
    if peer_id in room["peers"]:
        room["peers"][peer_id]["last_seen"] = now

    # Signals directed to this peer or broadcast (to_peer is None), created after since_signal_id
    new_signals = [
        s for s in room["signals"]
        if s["id"] > since_signal_id and s["from_peer"] != peer_id and (s["to_peer"] is None or s["to_peer"] == peer_id)
    ]

    # New chat messages
    new_chat = [
        c for c in room["chat"]
        if c["ts"] > since_chat_ts and c.get("sender_peer_id") != peer_id
    ]

    active_peers = [
        p for p in room["peers"].values() if now - p["last_seen"] < 45
    ]

    max_signal_id = max([s["id"] for s in room["signals"]], default=since_signal_id)

    return {
        "room_id": room["room_id"],
        "active_peers": active_peers,
        "signals": new_signals,
        "chat": new_chat,
        "intake": room.get("intake"),
        "latest_signal_id": max_signal_id,
        "now_ts": now,
    }


@router.post("/rooms/{room_id}/chat")
def post_room_chat(room_id: str, payload: ChatPayload):
    room = _get_or_create_room(room_id)
    now = time.time()
    msg_id = f"msg-{int(now * 1000)}"
    time_str = time.strftime("%I:%M %p")
    msg_entry = {
        "id": msg_id,
        "sender_peer_id": payload.sender_peer_id,
        "sender_role": payload.sender_role,
        "name": payload.sender_name,
        "text": payload.text,
        "time": time_str,
        "ts": now,
    }
    room["chat"].append(msg_entry)
    if len(room["chat"]) > 100:
        room["chat"] = room["chat"][-50:]

    return {"status": "sent", "message": msg_entry}


@router.post("/rooms/{room_id}/intake")
def save_room_intake(room_id: str, payload: PreConsultationIntakePayload):
    room = _get_or_create_room(room_id)
    intake_data = payload.model_dump()
    intake_data["submitted_at"] = time.time()
    room["intake"] = intake_data

    # Also broadcast an intake notification chat
    room["chat"].append({
        "id": f"intake-note-{int(time.time() * 1000)}",
        "sender_peer_id": "system",
        "sender_role": "SYSTEM",
        "name": "Clinical Intake Desk",
        "text": f"📋 Patient pre-consultation intake submitted (Mode: {payload.consultation_modality}). Symptoms: {payload.symptoms_text or 'None specified'}.",
        "time": time.strftime("%I:%M %p"),
        "ts": time.time(),
    })

    return {"status": "saved", "intake": intake_data}


@router.get("/rooms/{room_id}/intake")
def get_room_intake(room_id: str):
    room = _get_or_create_room(room_id)
    return {"room_id": room["room_id"], "intake": room.get("intake")}


@router.post("/rooms/{room_id}/leave")
def leave_room(room_id: str, peer_id: str):
    norm_id = room_id.strip().lower()
    if norm_id in _ROOMS:
        _ROOMS[norm_id]["peers"].pop(peer_id, None)
    return {"status": "left"}
