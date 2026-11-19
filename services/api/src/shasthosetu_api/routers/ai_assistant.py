from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from ..core.audit import record_audit
from ..core.dependencies import get_current_user, get_optional_user
from ..core.security import enforce_rate_limit, new_id, utc_now_iso
from ..db.sqlite import get_db_conn, row_to_dict, rows_to_dicts
from ..services.model_manager import get_full_runtime_status
from ..services.rag_engine import allowed_scopes_for_role, generate_rag_answer
from ..services.safety_guard import redact_for_audit
from ..services.voice_asr import transcribe_audio_bytes
from ..services.voice_tts import get_tts_capabilities, synthesize_speech_wav

router = APIRouter(prefix="/v1/ai", tags=["Bilingual RAG Chatbot & Voice Assistant"])


def _is_flag_enabled(conn, flag_key: str, default: bool = True) -> bool:
    row = conn.execute("SELECT enabled FROM feature_flags WHERE flag_key = ?", (flag_key,)).fetchone()
    if row is None:
        return default
    return bool(row["enabled"])


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2500)
    session_id: Optional[str] = None
    language_mode: str = Field(default="auto", pattern="^(auto|bn|en)$")
    input_modality: str = Field(default="TEXT", pattern="^(TEXT|VOICE|OCR_EXPLAIN)$")
    asr_job_id: Optional[str] = None
    patient_profile_id: Optional[str] = None


class FeedbackRequest(BaseModel):
    rating: str = Field(..., pattern="^(HELPFUL|NOT_HELPFUL)$")
    comment_text: str = Field(default="", max_length=400)


class VoiceConsentRequest(BaseModel):
    consent_scope: str = Field(default="LOCAL_ASR_TRANSCRIPTION", pattern="^(LOCAL_ASR_TRANSCRIPTION|LOCAL_TTS_PLAYBACK)$")
    consented: bool = True


class VoiceConfirmRequest(BaseModel):
    confirmed_transcript: str = Field(..., min_length=1, max_length=2500)


class SpeakRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1500)
    language: str = Field(default="auto", pattern="^(auto|bn|en)$")


@router.get("/models/status")
def ai_models_status():
    status_info = get_full_runtime_status()
    with get_db_conn() as conn:
        status_info["feature_flags"] = {
            "ai_chatbot_enabled": _is_flag_enabled(conn, "ai_chatbot_enabled", True),
            "voice_ai_enabled": _is_flag_enabled(conn, "voice_ai_enabled", True),
        }
    return status_info


@router.post("/chat")
def ai_chat(payload: ChatRequest, user: Optional[dict] = Depends(get_optional_user)):
    enforce_rate_limit(f"ai_chat:{user['id'] if user else 'anon'}", max_requests=30, window_seconds=60)
    role = user["primary_role"] if user else "PUBLIC"

    with get_db_conn() as conn:
        if not _is_flag_enabled(conn, "ai_chatbot_enabled", True):
            raise HTTPException(
                status_code=503,
                detail="AI Health Assistant is temporarily disabled by Admin feature flag (ai_chatbot_enabled=0).",
            )

        session_id = payload.session_id
        history: list[dict[str, str]] = []

        if user and session_id:
            sess = row_to_dict(
                conn.execute("SELECT * FROM ai_chat_sessions WHERE id = ? AND is_deleted = 0", (session_id,)).fetchone()
            )
            if not sess or sess["owner_user_id"] != user["id"]:
                raise HTTPException(status_code=403, detail="Access denied to chat session.")
            hist_rows = rows_to_dicts(
                conn.execute(
                    "SELECT role, content_text FROM ai_chat_messages WHERE session_id = ? ORDER BY created_at_utc ASC",
                    (session_id,),
                ).fetchall()
            )
            history = [
                {"role": "user" if r["role"] == "USER" else "assistant", "content": r["content_text"]}
                for r in hist_rows[-6:]
            ]

        if payload.asr_job_id:
            asr = row_to_dict(conn.execute("SELECT * FROM ai_asr_jobs WHERE id = ?", (payload.asr_job_id,)).fetchone())
            if not asr:
                raise HTTPException(status_code=404, detail="Voice transcription job not found.")
            if asr["user_id"] and (not user or asr["user_id"] != user["id"]):
                raise HTTPException(status_code=403, detail="Access denied to voice transcription job.")
            if not asr["is_confirmed"]:
                raise HTTPException(
                    status_code=422,
                    detail="VOICE_CONFIRMATION_REQUIRED: Review and confirm the voice transcript before submitting to AI chat.",
                )

    result = generate_rag_answer(
        query=payload.query,
        role=role,
        language_mode=payload.language_mode,
        history=history,
    )

    user_msg_id: Optional[str] = None
    assistant_msg_id: Optional[str] = None
    persisted = False

    if user:
        now = utc_now_iso()
        scope = "SUPPORT_FAQ" if role == "SUPPORT" else ("CLINICAL_REF" if role == "DOCTOR" else "MEDICAL_INFO")
        with get_db_conn() as conn:
            conn.execute("BEGIN IMMEDIATE;")
            try:
                if not session_id:
                    session_id = new_id("chat")
                    title_clean = payload.query.strip().splitlines()[0][:64] or "Health Assistant Chat"
                    conn.execute(
                        """
                        INSERT INTO ai_chat_sessions (
                            id, owner_user_id, owner_role, patient_profile_id, title, language_mode, scope, is_deleted, created_at_utc, updated_at_utc
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
                        """,
                        (session_id, user["id"], role, payload.patient_profile_id, title_clean, payload.language_mode, scope, now, now),
                    )
                else:
                    conn.execute("UPDATE ai_chat_sessions SET updated_at_utc = ?, language_mode = ? WHERE id = ?", (now, payload.language_mode, session_id))

                user_msg_id = new_id("msg")
                conn.execute(
                    """
                    INSERT INTO ai_chat_messages (
                        id, session_id, role, input_modality, language_detected, content_text,
                        grounded_status, model_id, index_version, latency_ms, safety_flags_json, asr_job_id, created_at_utc
                    ) VALUES (?, ?, 'USER', ?, ?, ?, 'USER_INPUT', '', '', 0, '[]', ?, ?)
                    """,
                    (
                        user_msg_id,
                        session_id,
                        payload.input_modality,
                        result["language_detected"],
                        payload.query.strip(),
                        payload.asr_job_id,
                        now,
                    ),
                )

                assistant_msg_id = new_id("msg")
                conn.execute(
                    """
                    INSERT INTO ai_chat_messages (
                        id, session_id, role, input_modality, language_detected, content_text,
                        grounded_status, model_id, index_version, latency_ms, safety_flags_json, created_at_utc
                    ) VALUES (?, ?, 'ASSISTANT', ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        assistant_msg_id,
                        session_id,
                        payload.input_modality,
                        result["response_language"],
                        result["answer_text"],
                        result["grounded_status"],
                        result["model_id"],
                        result["index_version"],
                        int(result["latency_ms"]),
                        json.dumps(result["safety_flags"]),
                        utc_now_iso(),
                    ),
                )

                for c in result["citations"]:
                    conn.execute(
                        """
                        INSERT INTO ai_message_citations (
                            id, message_id, citation_num, source_id, chunk_id, source_title,
                            publisher, page_or_section_ref, source_url, snippet_text, score
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            new_id("cite"),
                            assistant_msg_id,
                            c["citation_num"],
                            c["source_id"],
                            c["chunk_id"],
                            c["source_title"],
                            c["publisher"],
                            c["page_or_section_ref"],
                            c["source_url"],
                            c["snippet_text"],
                            float(c["score"]),
                        ),
                    )

                record_audit(
                    conn,
                    actor_user_id=user["id"],
                    actor_role=role,
                    action_type="AI_RAG_CHAT_TURN",
                    target_resource="ai_chat_sessions",
                    target_id=session_id,
                    outcome="SUCCESS" if result["grounded_status"] != "MODEL_UNAVAILABLE" else "ERROR",
                    details={
                        **redact_for_audit(payload.query),
                        "grounded_status": result["grounded_status"],
                        "citations_count": len(result["citations"]),
                        "safety_flags": result["safety_flags"],
                    },
                )
                conn.execute("COMMIT;")
                persisted = True
            except Exception:
                if conn.in_transaction:
                    conn.execute("ROLLBACK;")
                raise

    return {
        "session_id": session_id,
        "user_message_id": user_msg_id,
        "message_id": assistant_msg_id,
        "persisted": persisted,
        **result,
    }


@router.get("/chats")
def list_my_chats(user: dict = Depends(get_current_user)):
    with get_db_conn() as conn:
        sessions = rows_to_dicts(
            conn.execute(
                """
                SELECT s.*,
                       (SELECT COUNT(*) FROM ai_chat_messages m WHERE m.session_id = s.id) AS message_count
                  FROM ai_chat_sessions s
                 WHERE s.owner_user_id = ? AND s.is_deleted = 0
                 ORDER BY s.updated_at_utc DESC
                 LIMIT 40
                """,
                (user["id"],),
            ).fetchall()
        )
    return {"sessions": sessions}


@router.get("/chats/{session_id}")
def get_chat_session(session_id: str, user: dict = Depends(get_current_user)):
    with get_db_conn() as conn:
        sess = row_to_dict(
            conn.execute("SELECT * FROM ai_chat_sessions WHERE id = ? AND is_deleted = 0", (session_id,)).fetchone()
        )
        if not sess:
            raise HTTPException(status_code=404, detail="Chat session not found.")

        if sess["owner_user_id"] != user["id"]:
            role = user["primary_role"]
            conn.execute("BEGIN IMMEDIATE;")
            if role == "SUPPORT":
                record_audit(
                    conn,
                    actor_user_id=user["id"],
                    actor_role="SUPPORT",
                    action_type="SUPPORT_CHAT_PHI_BLOCKED",
                    target_resource="ai_chat_sessions",
                    target_id=session_id,
                    outcome="DENIED",
                )
                conn.execute("COMMIT;")
                raise HTTPException(
                    status_code=403,
                    detail="PHI_ACCESS_DENIED: Support accounts cannot read patient AI conversations.",
                )
            if role == "ADMIN":
                record_audit(
                    conn,
                    actor_user_id=user["id"],
                    actor_role="ADMIN",
                    action_type="ADMIN_PATIENT_CHAT_PRIVACY_BLOCKED",
                    target_resource="ai_chat_sessions",
                    target_id=session_id,
                    outcome="DENIED",
                )
                conn.execute("COMMIT;")
                raise HTTPException(
                    status_code=403,
                    detail="CHAT_PRIVACY_RESTRICTED_FOR_ADMIN: Admin cannot read private patient conversations.",
                )
            record_audit(
                conn,
                actor_user_id=user["id"],
                actor_role=role,
                action_type="AI_CHAT_CROSS_USER_BLOCKED",
                target_resource="ai_chat_sessions",
                target_id=session_id,
                outcome="DENIED",
            )
            conn.execute("COMMIT;")
            raise HTTPException(status_code=403, detail="Access denied: conversation belongs to another user.")

        msgs = rows_to_dicts(
            conn.execute(
                "SELECT * FROM ai_chat_messages WHERE session_id = ? ORDER BY created_at_utc ASC",
                (session_id,),
            ).fetchall()
        )
        for m in msgs:
            m["safety_flags"] = json.loads(m.pop("safety_flags_json", "[]") or "[]")
            m["citations"] = rows_to_dicts(
                conn.execute(
                    "SELECT * FROM ai_message_citations WHERE message_id = ? ORDER BY citation_num ASC",
                    (m["id"],),
                ).fetchall()
            )
            fb = row_to_dict(
                conn.execute(
                    "SELECT rating FROM ai_feedback WHERE message_id = ? AND user_id = ?",
                    (m["id"], user["id"]),
                ).fetchone()
            )
            m["user_feedback"] = fb["rating"] if fb else None
    return {"session": sess, "messages": msgs}


@router.delete("/chats/{session_id}")
def delete_chat_session(session_id: str, user: dict = Depends(get_current_user)):
    with get_db_conn() as conn:
        sess = row_to_dict(
            conn.execute("SELECT * FROM ai_chat_sessions WHERE id = ? AND is_deleted = 0", (session_id,)).fetchone()
        )
        if not sess:
            raise HTTPException(status_code=404, detail="Chat session not found.")
        if sess["owner_user_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Cannot delete another user's conversation.")

        now = utc_now_iso()
        conn.execute("BEGIN IMMEDIATE;")
        # Permanently remove messages/citations and mark session deleted per user retention expectation
        conn.execute("DELETE FROM ai_chat_messages WHERE session_id = ?", (session_id,))
        conn.execute("UPDATE ai_chat_sessions SET is_deleted = 1, updated_at_utc = ? WHERE id = ?", (now, session_id))
        record_audit(
            conn,
            actor_user_id=user["id"],
            actor_role=user["primary_role"],
            action_type="AI_CHAT_DELETED",
            target_resource="ai_chat_sessions",
            target_id=session_id,
        )
        conn.execute("COMMIT;")
    return {"deleted": True, "session_id": session_id}


@router.post("/messages/{message_id}/feedback")
def submit_message_feedback(message_id: str, payload: FeedbackRequest, user: dict = Depends(get_current_user)):
    with get_db_conn() as conn:
        row = row_to_dict(
            conn.execute(
                """
                SELECT m.id, s.owner_user_id
                  FROM ai_chat_messages m
                  JOIN ai_chat_sessions s ON s.id = m.session_id
                 WHERE m.id = ? AND s.is_deleted = 0
                """,
                (message_id,),
            ).fetchone()
        )
        if not row:
            raise HTTPException(status_code=404, detail="Message not found.")
        if row["owner_user_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Access denied.")

        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            """
            INSERT INTO ai_feedback (id, message_id, user_id, rating, comment_text, created_at_utc)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(message_id, user_id) DO UPDATE SET
                rating = excluded.rating,
                comment_text = excluded.comment_text
            """,
            (new_id("fb"), message_id, user["id"], payload.rating, payload.comment_text.strip(), utc_now_iso()),
        )
        conn.execute("COMMIT;")
    return {"saved": True, "message_id": message_id, "rating": payload.rating}


@router.get("/sources/{source_id}")
def get_approved_source_detail(source_id: str, user: Optional[dict] = Depends(get_optional_user)):
    role = user["primary_role"] if user else "PUBLIC"
    allowed = allowed_scopes_for_role(role)
    with get_db_conn() as conn:
        src = row_to_dict(conn.execute("SELECT * FROM rag_sources WHERE id = ?", (source_id,)).fetchone())
        if not src:
            raise HTTPException(status_code=404, detail="Knowledge source not found.")
        if src["review_status"] != "APPROVED" and role != "ADMIN":
            raise HTTPException(status_code=403, detail="Source is not approved for public retrieval.")
        if src["audience_scope"] not in allowed and role != "ADMIN":
            raise HTTPException(status_code=403, detail="Access denied for this knowledge scope.")
        ver = row_to_dict(
            conn.execute("SELECT * FROM rag_source_versions WHERE id = ?", (src["current_version_id"],)).fetchone()
        )
        chunks = rows_to_dicts(
            conn.execute(
                "SELECT id, chunk_index, section_heading, page_or_section_ref, chunk_text FROM rag_chunks WHERE source_id = ? AND version_id = ? AND is_active = 1 ORDER BY chunk_index ASC",
                (source_id, src["current_version_id"]),
            ).fetchall()
        )
    return {"source": src, "version": ver, "chunks": chunks}


@router.get("/voice/consent")
def get_voice_consent(user: dict = Depends(get_current_user)):
    with get_db_conn() as conn:
        rows = rows_to_dicts(
            conn.execute(
                "SELECT * FROM ai_voice_consents WHERE user_id = ? AND revoked_at_utc IS NULL ORDER BY created_at_utc DESC",
                (user["id"],),
            ).fetchall()
        )
    return {"consents": rows}


@router.post("/voice/consent")
def set_voice_consent(payload: VoiceConsentRequest, user: dict = Depends(get_current_user)):
    now = utc_now_iso()
    with get_db_conn() as conn:
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            "UPDATE ai_voice_consents SET revoked_at_utc = ? WHERE user_id = ? AND consent_scope = ? AND revoked_at_utc IS NULL",
            (now, user["id"], payload.consent_scope),
        )
        cid = new_id("vcon")
        conn.execute(
            "INSERT INTO ai_voice_consents (id, user_id, consent_scope, consented, created_at_utc) VALUES (?, ?, ?, ?, ?)",
            (cid, user["id"], payload.consent_scope, 1 if payload.consented else 0, now),
        )
        conn.execute("COMMIT;")
    return {"id": cid, "consent_scope": payload.consent_scope, "consented": payload.consented}


@router.post("/voice/transcribe")
async def voice_transcribe(
    file: UploadFile = File(...),
    language_mode: str = Form(default="auto"),
    user: Optional[dict] = Depends(get_optional_user),
):
    enforce_rate_limit(f"ai_asr:{user['id'] if user else 'anon'}", max_requests=20, window_seconds=60)
    with get_db_conn() as conn:
        if not _is_flag_enabled(conn, "voice_ai_enabled", True):
            raise HTTPException(status_code=503, detail="Voice AI transcription is disabled by Admin feature flag.")

    audio_bytes = await file.read()
    fname = file.filename or "voice.wav"
    mode = language_mode if language_mode in {"auto", "bn", "en"} else "auto"

    try:
        asr_out = transcribe_audio_bytes(audio_bytes, fname, language_mode=mode)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    job_id = new_id("asr")
    with get_db_conn() as conn:
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            """
            INSERT INTO ai_asr_jobs (
                id, user_id, language_mode, detected_language, model_id, audio_format,
                duration_sec, byte_size, raw_transcript, is_confirmed, latency_ms, status, limitation_note, created_at_utc
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'TRANSCRIBED', ?, ?)
            """,
            (
                job_id,
                user["id"] if user else None,
                mode,
                asr_out["detected_language"],
                asr_out["model_id"],
                asr_out["audio_format"],
                asr_out["duration_sec"],
                len(audio_bytes),
                asr_out["raw_transcript"],
                asr_out["latency_ms"],
                asr_out["limitation_note"],
                utc_now_iso(),
            ),
        )
        if user:
            record_audit(
                conn,
                actor_user_id=user["id"],
                actor_role=user["primary_role"],
                action_type="AI_VOICE_TRANSCRIBED",
                target_resource="ai_asr_jobs",
                target_id=job_id,
                details={"model_id": asr_out["model_id"], "duration_sec": asr_out["duration_sec"], "phi_redacted": True},
            )
        conn.execute("COMMIT;")

    return {"asr_job_id": job_id, **asr_out}


@router.post("/voice/jobs/{asr_job_id}/confirm")
def confirm_voice_transcript(
    asr_job_id: str,
    payload: VoiceConfirmRequest,
    user: Optional[dict] = Depends(get_optional_user),
):
    with get_db_conn() as conn:
        job = row_to_dict(conn.execute("SELECT * FROM ai_asr_jobs WHERE id = ?", (asr_job_id,)).fetchone())
        if not job:
            raise HTTPException(status_code=404, detail="Voice transcription job not found.")
        if job["user_id"] and (not user or job["user_id"] != user["id"]):
            raise HTTPException(status_code=403, detail="Access denied.")

        confirmed = payload.confirmed_transcript.strip()
        was_edited = 1 if confirmed != (job["raw_transcript"] or "").strip() else 0
        now = utc_now_iso()
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            """
            UPDATE ai_asr_jobs
               SET confirmed_transcript = ?, was_edited = ?, is_confirmed = 1, status = 'CONFIRMED', confirmed_at_utc = ?
             WHERE id = ?
            """,
            (confirmed, was_edited, now, asr_job_id),
        )
        conn.execute("COMMIT;")
    return {
        "asr_job_id": asr_job_id,
        "confirmed_transcript": confirmed,
        "was_edited": bool(was_edited),
        "is_confirmed": True,
    }


@router.get("/voice/tts-status")
def voice_tts_status():
    return get_tts_capabilities()


@router.post("/voice/speak")
def voice_speak(payload: SpeakRequest, user: Optional[dict] = Depends(get_optional_user)):
    enforce_rate_limit(f"ai_tts:{user['id'] if user else 'anon'}", max_requests=25, window_seconds=60)
    with get_db_conn() as conn:
        if not _is_flag_enabled(conn, "voice_ai_enabled", True):
            return JSONResponse(
                status_code=200,
                content={"available": False, "unavailable_message": "Voice playback disabled by Admin flag."},
            )
    try:
        res = synthesize_speech_wav(payload.text, language=payload.language)
    except Exception as exc:
        return JSONResponse(
            status_code=200,
            content={"available": False, "language": payload.language, "unavailable_message": f"Speech synthesis unavailable: {exc}"},
        )

    if not res.get("available"):
        return JSONResponse(status_code=200, content=res)

    return Response(
        content=res["wav_bytes"],
        media_type="audio/wav",
        headers={
            "X-TTS-Model": res["model_id"],
            "X-TTS-Language": res["language"],
            "Access-Control-Expose-Headers": "X-TTS-Model, X-TTS-Language",
            "Cache-Control": "no-store",
        },
    )
