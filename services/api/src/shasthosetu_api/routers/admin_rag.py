from __future__ import annotations

import json
import re
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from ..core.audit import record_audit
from ..core.dependencies import require_role
from ..core.security import utc_now_iso
from ..db.sqlite import get_db_conn, row_to_dict, rows_to_dicts
from ..services.model_manager import get_full_runtime_status
from ..services.rag_ingestion import (
    parse_uploaded_document,
    rebuild_rag_indexes,
    upsert_rag_source_document,
)

router = APIRouter(prefix="/v1/admin/rag", tags=["Admin RAG Knowledge & Governance"])


class SourceReviewRequest(BaseModel):
    reason: str = Field(default="Admin editorial review", max_length=300)


@router.get("/sources")
def list_admin_rag_sources(user: dict = Depends(require_role("ADMIN"))):
    with get_db_conn() as conn:
        sources = rows_to_dicts(
            conn.execute(
                """
                SELECT s.*, v.version_number, v.word_count, v.chunk_count, v.content_sha256, v.mime_type
                  FROM rag_sources s
                  LEFT JOIN rag_source_versions v ON v.id = s.current_version_id
                 ORDER BY CASE WHEN s.review_status = 'PENDING_REVIEW' THEN 0 WHEN s.review_status = 'APPROVED' THEN 1 ELSE 2 END,
                          s.updated_at_utc DESC
                """
            ).fetchall()
        )
        jobs = rows_to_dicts(
            conn.execute("SELECT * FROM rag_ingestion_jobs ORDER BY created_at_utc DESC LIMIT 20").fetchall()
        )
    return {"sources": sources, "ingestion_jobs": jobs}


@router.post("/sources", status_code=201)
async def upload_rag_source(
    file: UploadFile = File(...),
    title: str = Form(...),
    title_bn: str = Form(default=""),
    publisher: str = Form(...),
    source_url: str = Form(default=""),
    category: str = Form(default="General Medical Terms"),
    audience_scope: str = Form(default="PUBLIC_MEDICAL"),
    language: str = Form(default="bilingual"),
    license_basis: str = Form(default="Admin curated educational reference"),
    auto_approve: bool = Form(default=False),
    user: dict = Depends(require_role("ADMIN")),
):
    if audience_scope not in ("PUBLIC_MEDICAL", "SUPPORT_FAQ", "CLINICAL_REFERENCE"):
        raise HTTPException(status_code=422, detail="Invalid audience_scope.")
    if language not in ("bn", "en", "bilingual"):
        raise HTTPException(status_code=422, detail="Invalid language.")

    raw_bytes = await file.read()
    fname = file.filename or "document.md"
    try:
        clean_text, mime_type, _ = parse_uploaded_document(raw_bytes, fname)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    slug_base = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:64] or "admin-source"
    review_status = "APPROVED" if auto_approve else "PENDING_REVIEW"

    res = upsert_rag_source_document(
        slug=slug_base,
        title=title.strip()[:180],
        title_bn=title_bn.strip()[:180],
        publisher=publisher.strip()[:140],
        source_url=source_url.strip()[:300],
        category=category.strip()[:80],
        audience_scope=audience_scope,
        language=language,
        publication_date=utc_now_iso()[:10],
        retrieval_date=utc_now_iso()[:10],
        license_basis=license_basis.strip()[:200],
        clean_text=clean_text,
        mime_type=mime_type,
        original_filename=fname[:140],
        review_status=review_status,
        actor_user_id=user["id"],
    )

    reindex_meta = None
    if auto_approve:
        reindex_meta = rebuild_rag_indexes(triggered_by_user_id=user["id"], job_type="ADMIN_UPLOAD")

    with get_db_conn() as conn:
        conn.execute("BEGIN IMMEDIATE;")
        record_audit(
            conn,
            actor_user_id=user["id"],
            actor_role="ADMIN",
            action_type="ADMIN_RAG_SOURCE_UPLOADED",
            target_resource="rag_sources",
            target_id=res["source_id"],
            details={"review_status": review_status, "audience_scope": audience_scope, "chunks": res["chunk_count"]},
        )
        conn.execute("COMMIT;")

    return {"uploaded": True, "review_status": review_status, **res, "index": reindex_meta}


@router.post("/sources/{source_id}/approve")
def approve_rag_source(source_id: str, payload: SourceReviewRequest, user: dict = Depends(require_role("ADMIN"))):
    now = utc_now_iso()
    with get_db_conn() as conn:
        src = row_to_dict(conn.execute("SELECT * FROM rag_sources WHERE id = ?", (source_id,)).fetchone())
        if not src:
            raise HTTPException(status_code=404, detail="RAG source not found.")
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            "UPDATE rag_sources SET review_status = 'APPROVED', approved_by_admin_id = ?, approved_at_utc = ?, updated_at_utc = ? WHERE id = ?",
            (user["id"], now, now, source_id),
        )
        record_audit(
            conn,
            actor_user_id=user["id"],
            actor_role="ADMIN",
            action_type="ADMIN_RAG_SOURCE_APPROVED",
            target_resource="rag_sources",
            target_id=source_id,
            details={"reason": payload.reason},
        )
        conn.execute("COMMIT;")

    meta = rebuild_rag_indexes(triggered_by_user_id=user["id"], job_type="ADMIN_REINDEX")
    return {"approved": True, "source_id": source_id, "index": meta}


@router.post("/sources/{source_id}/deprecate")
def deprecate_rag_source(source_id: str, payload: SourceReviewRequest, user: dict = Depends(require_role("ADMIN"))):
    now = utc_now_iso()
    with get_db_conn() as conn:
        src = row_to_dict(conn.execute("SELECT * FROM rag_sources WHERE id = ?", (source_id,)).fetchone())
        if not src:
            raise HTTPException(status_code=404, detail="RAG source not found.")
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            "UPDATE rag_sources SET review_status = 'DEPRECATED', updated_at_utc = ? WHERE id = ?",
            (now, source_id),
        )
        record_audit(
            conn,
            actor_user_id=user["id"],
            actor_role="ADMIN",
            action_type="ADMIN_RAG_SOURCE_DEPRECATED",
            target_resource="rag_sources",
            target_id=source_id,
            details={"reason": payload.reason},
        )
        conn.execute("COMMIT;")

    meta = rebuild_rag_indexes(triggered_by_user_id=user["id"], job_type="ADMIN_REINDEX")
    return {"deprecated": True, "source_id": source_id, "index": meta}


@router.post("/reindex")
def trigger_admin_reindex(user: dict = Depends(require_role("ADMIN"))):
    meta = rebuild_rag_indexes(triggered_by_user_id=user["id"], job_type="ADMIN_REINDEX")
    with get_db_conn() as conn:
        conn.execute("BEGIN IMMEDIATE;")
        record_audit(
            conn,
            actor_user_id=user["id"],
            actor_role="ADMIN",
            action_type="ADMIN_RAG_REINDEXED",
            target_resource="rag_index",
            details={"chunk_count": meta.get("chunk_count", 0), "dense_ready": meta.get("dense_ready", False)},
        )
        conn.execute("COMMIT;")
    return {"reindexed": True, "index": meta}


@router.get("/metrics")
def get_admin_rag_metrics(user: dict = Depends(require_role("ADMIN"))):
    """Aggregate usage, safety & failure metrics ONLY — strictly excludes patient chat prose."""
    with get_db_conn() as conn:
        session_counts = row_to_dict(
            conn.execute(
                """
                SELECT COUNT(*) AS total_sessions,
                       SUM(CASE WHEN owner_role = 'PATIENT' THEN 1 ELSE 0 END) AS patient_sessions,
                       SUM(CASE WHEN owner_role = 'DOCTOR' THEN 1 ELSE 0 END) AS doctor_sessions,
                       SUM(CASE WHEN owner_role = 'SUPPORT' THEN 1 ELSE 0 END) AS support_sessions
                  FROM ai_chat_sessions
                 WHERE is_deleted = 0
                """
            ).fetchone()
        ) or {}
        msg_counts = row_to_dict(
            conn.execute(
                """
                SELECT COUNT(*) AS total_assistant_turns,
                       SUM(CASE WHEN grounded_status = 'GROUNDED' THEN 1 ELSE 0 END) AS grounded_count,
                       SUM(CASE WHEN grounded_status = 'ABSTAINED' THEN 1 ELSE 0 END) AS abstained_count,
                       SUM(CASE WHEN grounded_status = 'EMERGENCY_ESCALATION' THEN 1 ELSE 0 END) AS emergency_count,
                       SUM(CASE WHEN grounded_status = 'SAFETY_REFUSAL' THEN 1 ELSE 0 END) AS safety_refusal_count,
                       SUM(CASE WHEN grounded_status = 'MODEL_UNAVAILABLE' THEN 1 ELSE 0 END) AS model_unavailable_count,
                       ROUND(AVG(CASE WHEN latency_ms > 0 THEN latency_ms END), 1) AS avg_latency_ms
                  FROM ai_chat_messages
                 WHERE role = 'ASSISTANT'
                """
            ).fetchone()
        ) or {}
        feedback_counts = row_to_dict(
            conn.execute(
                """
                SELECT SUM(CASE WHEN rating = 'HELPFUL' THEN 1 ELSE 0 END) AS helpful,
                       SUM(CASE WHEN rating = 'NOT_HELPFUL' THEN 1 ELSE 0 END) AS not_helpful
                  FROM ai_feedback
                """
            ).fetchone()
        ) or {}
        asr_counts = row_to_dict(
            conn.execute(
                """
                SELECT COUNT(*) AS total_asr_jobs,
                       SUM(CASE WHEN is_confirmed = 1 THEN 1 ELSE 0 END) AS confirmed_jobs,
                       SUM(CASE WHEN was_edited = 1 THEN 1 ELSE 0 END) AS edited_jobs
                  FROM ai_asr_jobs
                """
            ).fetchone()
        ) or {}
        ocr_counts = row_to_dict(
            conn.execute(
                """
                SELECT COUNT(*) AS total_ocr_jobs,
                       SUM(CASE WHEN status = 'VERIFIED' OR status = 'SCHEDULED' THEN 1 ELSE 0 END) AS verified_jobs,
                       SUM(CASE WHEN status = 'NEEDS_REVIEW' THEN 1 ELSE 0 END) AS needs_review_jobs
                  FROM ocr_jobs
                """
            ).fetchone()
        ) or {}
        ai_audit_events = rows_to_dicts(
            conn.execute(
                """
                SELECT id, actor_role, action_type, target_resource, target_id, outcome, details_redacted_json, created_at_utc
                  FROM audit_logs
                 WHERE action_type LIKE 'AI_%'
                    OR action_type LIKE 'OCR_%'
                    OR action_type LIKE 'ADMIN_RAG_%'
                    OR action_type LIKE 'SUPPORT_CHAT_%'
                    OR action_type LIKE 'SUPPORT_OCR_%'
                    OR action_type LIKE 'ADMIN_PATIENT_CHAT_%'
                 ORDER BY created_at_utc DESC
                 LIMIT 25
                """
            ).fetchall()
        )

    return {
        "runtime": get_full_runtime_status(),
        "sessions": session_counts,
        "messages": msg_counts,
        "feedback": feedback_counts,
        "voice_asr": asr_counts,
        "prescription_ocr": ocr_counts,
        "audit_events": ai_audit_events,
        "privacy_notice": "Aggregate metrics only — private patient chat messages and OCR texts are never returned in Admin metrics.",
    }
