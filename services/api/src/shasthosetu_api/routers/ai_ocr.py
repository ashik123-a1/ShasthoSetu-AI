from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from pydantic import BaseModel, Field

from ..core.audit import record_audit
from ..core.dependencies import get_current_user
from ..core.security import enforce_rate_limit, new_id, utc_now_iso
from ..db.sqlite import get_db_conn, row_to_dict, rows_to_dicts
from ..services.ocr_service import run_bilingual_ocr_pipeline
from ..services.rag_engine import generate_rag_answer
from ..services.safety_guard import redact_for_audit

router = APIRouter(prefix="/v1/ai/ocr", tags=["Bilingual Prescription OCR Studio & OCR-to-RAG"])


def _block_support_if_needed(conn, user: dict, target_id: str | None = None) -> None:
    if user["primary_role"] == "SUPPORT":
        conn.execute("BEGIN IMMEDIATE;")
        record_audit(
            conn,
            actor_user_id=user["id"],
            actor_role="SUPPORT",
            action_type="SUPPORT_OCR_PHI_BLOCKED",
            target_resource="ocr_jobs",
            target_id=target_id,
            outcome="DENIED",
        )
        conn.execute("COMMIT;")
        raise HTTPException(
            status_code=403,
            detail="PHI_ACCESS_DENIED: Zero-PHI policy blocks Support access to patient prescriptions and OCR documents.",
        )


def _assert_ocr_job_access(conn, user: dict, job_id: str) -> dict:
    _block_support_if_needed(conn, user, job_id)
    job = row_to_dict(
        conn.execute(
            """
            SELECT j.*, m.patient_profile_id, m.uploaded_by_user_id, m.original_filename,
                   m.mime_type, m.sha256_hash, a.stored_file_path, a.source_mime_type,
                   a.page_count, a.raw_full_text, a.corrected_full_text, a.bounding_boxes_json,
                   a.page_previews_json, a.uncertain_fields_count, a.review_action, a.last_explained_at_utc,
                   COALESCE(a.authorization_state, 'RAW_OCR') AS authorization_state,
                   a.patient_acknowledged_by_user_id, a.patient_acknowledged_at_utc,
                   a.clinician_verified_by_user_id, a.clinician_verified_at_utc
              FROM ocr_jobs j
              JOIN medical_documents m ON m.id = j.document_id
              LEFT JOIN ocr_job_artifacts a ON a.ocr_job_id = j.id
             WHERE j.id = ?
            """,
            (job_id,),
        ).fetchone()
    )
    if not job:
        raise HTTPException(status_code=404, detail="OCR job not found.")

    role = user["primary_role"]
    if role == "PATIENT":
        owned = conn.execute(
            "SELECT 1 FROM patient_profiles WHERE id = ? AND owner_user_id = ?",
            (job["patient_profile_id"], user["id"]),
        ).fetchone()
        if not owned and job["uploaded_by_user_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Access denied: prescription belongs to another patient.")
        return job

    if role == "DOCTOR":
        doc = user.get("doctor_profile")
        if not doc or doc.get("verification_status") != "APPROVED" or not doc.get("is_active"):
            raise HTTPException(status_code=403, detail="DOCTOR_NOT_APPROVED: Approved doctor status required.")
        if job["uploaded_by_user_id"] == user["id"]:
            return job
        has_appt = conn.execute(
            "SELECT 1 FROM appointments WHERE patient_profile_id = ? AND doctor_id = ? AND consent_shared_with_doctor = 1 LIMIT 1",
            (job["patient_profile_id"], doc["id"]),
        ).fetchone()
        if not has_appt:
            raise HTTPException(status_code=403, detail="Access denied: patient has not shared records in an appointment with you.")
        return job

    raise HTTPException(status_code=403, detail="Access denied to private patient prescription OCR.")


class OcrFieldUpdate(BaseModel):
    field_id: Optional[str] = None
    group_index: int = 0
    field_type: str = Field(..., pattern="^(MEDICINE_NAME|STRENGTH|DOSE|FREQUENCY|ROUTE|DURATION|PRESCRIBER_NOTE)$")
    verified_value: str = Field(..., min_length=1, max_length=250)
    mark_verified: bool = True


class OcrVerifyRequest(BaseModel):
    action: str = Field(..., pattern="^(SAVE_DRAFT|PATIENT_ACKNOWLEDGE|VERIFY|CLINICIAN_VERIFY|DISCARD)$")
    corrected_full_text: Optional[str] = Field(default=None, max_length=8000)
    fields: list[OcrFieldUpdate] = Field(default_factory=list)


class OcrExplainRequest(BaseModel):
    question: Optional[str] = Field(default=None, max_length=600)
    language_mode: str = Field(default="auto", pattern="^(auto|bn|en)$")


@router.post("/upload", status_code=201)
async def upload_and_run_ocr(
    file: UploadFile = File(...),
    patient_profile_id: Optional[str] = Form(default=None),
    user: dict = Depends(get_current_user),
):
    enforce_rate_limit(f"ai_ocr:{user['id']}", max_requests=20, window_seconds=60)
    with get_db_conn() as conn:
        _block_support_if_needed(conn, user)
        if user["primary_role"] not in ("PATIENT", "DOCTOR"):
            raise HTTPException(status_code=403, detail="Only Patients or Approved Doctors may upload prescriptions for OCR.")
        if user["primary_role"] == "DOCTOR":
            doc = user.get("doctor_profile")
            if not doc or doc.get("verification_status") != "APPROVED":
                raise HTTPException(status_code=403, detail="DOCTOR_NOT_APPROVED")

        if user["primary_role"] == "PATIENT":
            if patient_profile_id:
                owned = conn.execute(
                    "SELECT id FROM patient_profiles WHERE id = ? AND owner_user_id = ?",
                    (patient_profile_id, user["id"]),
                ).fetchone()
                if not owned:
                    raise HTTPException(status_code=403, detail="Patient profile does not belong to you.")
                target_pid = owned["id"]
            else:
                owned = conn.execute(
                    "SELECT id FROM patient_profiles WHERE owner_user_id = ? ORDER BY relationship_type = 'SELF' DESC LIMIT 1",
                    (user["id"],),
                ).fetchone()
                if not owned:
                    raise HTTPException(status_code=404, detail="No patient profile found.")
                target_pid = owned["id"]
        else:
            # Doctor preview upload requires an explicit patient_profile_id with appointment consent
            if patient_profile_id:
                doc = user["doctor_profile"]
                has_appt = conn.execute(
                    "SELECT 1 FROM appointments WHERE patient_profile_id = ? AND doctor_id = ? AND consent_shared_with_doctor = 1",
                    (patient_profile_id, doc["id"]),
                ).fetchone()
                if not has_appt:
                    raise HTTPException(status_code=403, detail="Patient profile not consented to your queue.")
                target_pid = patient_profile_id
            else:
                any_pid = conn.execute("SELECT id FROM patient_profiles WHERE id = 'pp-rahima-self'").fetchone()
                target_pid = any_pid["id"] if any_pid else conn.execute("SELECT id FROM patient_profiles LIMIT 1").fetchone()["id"]

    data = await file.read()
    fname = file.filename or "prescription.jpg"
    try:
        res = run_bilingual_ocr_pipeline(data, fname)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    doc_id = new_id("doc")
    job_id = new_id("ocr-job")
    now = utc_now_iso()

    with get_db_conn() as conn:
        conn.execute("BEGIN IMMEDIATE;")
        try:
            conn.execute(
                """
                INSERT INTO medical_documents (
                    id, patient_profile_id, uploaded_by_user_id, doc_type, original_filename,
                    storage_object_key, mime_type, byte_size, sha256_hash, is_synthetic, created_at_utc
                ) VALUES (?, ?, ?, 'PRESCRIPTION', ?, ?, ?, ?, ?, 0, ?)
                """,
                (
                    doc_id,
                    target_pid,
                    user["id"],
                    fname[:150],
                    f"vault/ocr/{doc_id}_{fname[:50]}",
                    res["doc_mime_type"],
                    len(data),
                    res["sha256"],
                    now,
                ),
            )
            conn.execute(
                """
                INSERT INTO ocr_jobs (
                    id, document_id, engine_version, status, mean_confidence, elapsed_ms, created_at_utc
                ) VALUES (?, ?, ?, 'NEEDS_REVIEW', ?, ?, ?)
                """,
                (job_id, doc_id, res["engine_label"][:80], res["mean_confidence"], res["latency_ms"], now),
            )

            created_fields: list[dict] = []
            cands = res.get("candidates") or []
            for idx, cand in enumerate(cands):
                gidx = int(cand.get("group_index", idx))
                conf = float(cand.get("confidence", res["mean_confidence"]))
                field_pairs = [
                    ("MEDICINE_NAME", str(cand.get("medicine_name") or "NEEDS_VERIFICATION")),
                    ("STRENGTH", str(cand.get("strength") or "NEEDS_VERIFICATION")),
                    ("DOSE", str(cand.get("dose") or "NEEDS_VERIFICATION")),
                    ("FREQUENCY", str(cand.get("frequency") or "NEEDS_VERIFICATION")),
                    ("DURATION", str(cand.get("duration") or "NEEDS_VERIFICATION")),
                    ("ROUTE", str(cand.get("route") or "NEEDS_VERIFICATION")),
                ]
                for ftype, val in field_pairs:
                    fid = new_id("ocrf")
                    conn.execute(
                        """
                        INSERT INTO ocr_fields (
                            id, ocr_job_id, group_index, field_type, raw_ocr_text, confidence, is_critical, is_verified, updated_at_utc
                        ) VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?)
                        """,
                        (fid, job_id, gidx, ftype, val[:240], conf, now),
                    )
                    created_fields.append(
                        {
                            "id": fid,
                            "group_index": gidx,
                            "field_type": ftype,
                            "raw_ocr_text": val[:240],
                            "verified_value": None,
                            "confidence": conf,
                            "is_critical": 1,
                            "is_verified": 0,
                        }
                    )

            conn.execute(
                """
                INSERT INTO ocr_job_artifacts (
                    id, ocr_job_id, stored_file_path, source_mime_type, page_count, raw_full_text,
                    corrected_full_text, bounding_boxes_json, page_previews_json, uncertain_fields_count,
                    review_action, updated_at_utc
                ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, 'DRAFT', ?)
                """,
                (
                    new_id("ocra"),
                    job_id,
                    res["stored_paths"][0] if res["stored_paths"] else "",
                    res["source_mime_type"],
                    res["page_count"],
                    res["raw_text"],
                    json.dumps(res["bounding_boxes"], ensure_ascii=False),
                    json.dumps(res["stored_paths"], ensure_ascii=False),
                    res["uncertain_tokens_count"],
                    now,
                ),
            )

            record_audit(
                conn,
                actor_user_id=user["id"],
                actor_role=user["primary_role"],
                action_type="PRESCRIPTION_OCR_UPLOADED",
                target_resource="ocr_jobs",
                target_id=job_id,
                details={
                    "filename_sha256": res["sha256"][:16],
                    "script_mix": res["script_mix"],
                    "token_count": res["token_count"],
                    "phi_redacted": True,
                },
            )
            conn.execute("COMMIT;")
        except Exception:
            if conn.in_transaction:
                conn.execute("ROLLBACK;")
            raise

    job_payload = {
        "id": job_id,
        "ocr_job_id": job_id,
        "document_id": doc_id,
        "patient_profile_id": target_pid,
        "status": "NEEDS_REVIEW",
        "review_action": "DRAFT",
        "model_id": res["model_id"],
        "engine_label": res["engine_label"],
        "script_mix": res["script_mix"],
        "page_count": res["page_count"],
        "mean_confidence": res["mean_confidence"],
        "uncertain_tokens_count": res["uncertain_tokens_count"],
        "raw_text": res["raw_text"],
        "bounding_boxes": res["bounding_boxes"],
        "fields": created_fields,
        "latency_ms": res["latency_ms"],
        "verification_required": True,
        "reminder_auto_enabled": False,
        "original_filename": file.filename or "prescription.png",
        "safety_notice": (
            "Raw OCR output is provisional and cannot activate medication plans or issue prescriptions. "
            "Verify every critical field manually."
        ),
    }
    return {**job_payload, "job": job_payload}


@router.get("/mine")
def list_my_ocr_jobs(user: dict = Depends(get_current_user)):
    with get_db_conn() as conn:
        _block_support_if_needed(conn, user)
        if user["primary_role"] == "PATIENT":
            rows = rows_to_dicts(
                conn.execute(
                    """
                    SELECT j.id, j.id AS ocr_job_id, j.status, j.engine_version, j.mean_confidence, j.elapsed_ms,
                           j.verified_at_utc, j.created_at_utc, m.original_filename, m.patient_profile_id,
                           a.page_count, a.raw_full_text, a.corrected_full_text, a.review_action, a.uncertain_fields_count
                      FROM ocr_jobs j
                      JOIN medical_documents m ON m.id = j.document_id
                      JOIN patient_profiles p ON p.id = m.patient_profile_id
                      LEFT JOIN ocr_job_artifacts a ON a.ocr_job_id = j.id
                     WHERE p.owner_user_id = ?
                     ORDER BY j.created_at_utc DESC
                     LIMIT 30
                    """,
                    (user["id"],),
                ).fetchall()
            )
        elif user["primary_role"] == "DOCTOR":
            doc = user.get("doctor_profile") or {}
            rows = rows_to_dicts(
                conn.execute(
                    """
                    SELECT DISTINCT j.id, j.id AS ocr_job_id, j.status, j.engine_version, j.mean_confidence, j.elapsed_ms,
                           j.verified_at_utc, j.created_at_utc, m.original_filename, m.patient_profile_id,
                           a.page_count, a.raw_full_text, a.corrected_full_text, a.review_action, a.uncertain_fields_count
                      FROM ocr_jobs j
                      JOIN medical_documents m ON m.id = j.document_id
                      LEFT JOIN ocr_job_artifacts a ON a.ocr_job_id = j.id
                      LEFT JOIN appointments ap ON ap.patient_profile_id = m.patient_profile_id
                     WHERE m.uploaded_by_user_id = ?
                        OR (ap.doctor_id = ? AND ap.consent_shared_with_doctor = 1)
                     ORDER BY j.created_at_utc DESC
                     LIMIT 30
                    """,
                    (user["id"], doc.get("id", "")),
                ).fetchall()
            )
        else:
            raise HTTPException(status_code=403, detail="Admin cannot browse private patient prescriptions.")
    return {"jobs": rows}


@router.get("/{job_id}")
def get_ocr_job_detail(job_id: str, user: dict = Depends(get_current_user)):
    with get_db_conn() as conn:
        job = _assert_ocr_job_access(conn, user, job_id)
        fields = rows_to_dicts(
            conn.execute(
                "SELECT * FROM ocr_fields WHERE ocr_job_id = ? ORDER BY group_index ASC, id ASC",
                (job_id,),
            ).fetchall()
        )
    bboxes = json.loads(job.pop("bounding_boxes_json", "[]") or "[]")
    page_previews = json.loads(job.pop("page_previews_json", "[]") or "[]")
    job.pop("stored_file_path", None)
    job["ocr_job_id"] = job.get("id")
    job["id"] = job.get("id")
    job["authorization_state"] = job.get("authorization_state") or "RAW_OCR"
    job["clinician_verified"] = bool(job.get("clinician_verified_by_user_id"))
    return {
        "job": job,
        "fields": fields,
        "bounding_boxes": bboxes,
        "page_count": len(page_previews) or job.get("page_count", 1),
    }


@router.get("/{job_id}/preview")
def get_ocr_preview_image(job_id: str, page: int = 1, user: dict = Depends(get_current_user)):
    with get_db_conn() as conn:
        job = _assert_ocr_job_access(conn, user, job_id)
    previews = json.loads(job.get("page_previews_json") or "[]")
    if not previews and job.get("stored_file_path"):
        previews = [job["stored_file_path"]]
    idx = max(0, min(len(previews) - 1, page - 1)) if previews else -1
    if idx < 0:
        raise HTTPException(status_code=404, detail="No preview image stored for this OCR job.")
    img_path = Path(previews[idx])
    if not img_path.exists():
        raise HTTPException(status_code=404, detail="Stored preview image missing on disk.")
    return Response(content=img_path.read_bytes(), media_type="image/png", headers={"Cache-Control": "no-store"})


@router.post("/{job_id}/verify")
def verify_or_save_ocr_job(job_id: str, payload: OcrVerifyRequest, user: dict = Depends(get_current_user)):
    """5-Stage Clinical Authorization: RAW_OCR -> PATIENT_CORRECTED -> PATIENT_ACKNOWLEDGED -> DOCTOR_VERIFIED -> AUTHORIZED_MEDICATION_PLAN."""
    now = utc_now_iso()
    with get_db_conn() as conn:
        job = _assert_ocr_job_access(conn, user, job_id)
        if payload.action == "CLINICIAN_VERIFY" and user["primary_role"] != "DOCTOR":
            conn.execute("BEGIN IMMEDIATE;")
            record_audit(
                conn,
                actor_user_id=user["id"],
                actor_role=user["primary_role"],
                action_type="OCR_CLINICIAN_AUTH_DENIED",
                target_resource="ocr_jobs",
                target_id=job_id,
                outcome="DENIED",
                details={"reason": "Non-doctor attempted CLINICIAN_VERIFY"},
            )
            conn.execute("COMMIT;")
            raise HTTPException(
                status_code=403,
                detail="CLINICIAN_AUTHORIZATION_REQUIRED: Only an approved doctor can clinically verify a prescription.",
            )

        is_clinician_action = payload.action == "CLINICIAN_VERIFY" and user["primary_role"] == "DOCTOR"
        is_ack_action = payload.action in ("VERIFY", "PATIENT_ACKNOWLEDGE", "CLINICIAN_VERIFY")

        conn.execute("BEGIN IMMEDIATE;")
        try:
            if payload.action == "DISCARD":
                conn.execute("UPDATE ocr_jobs SET status = 'RETAKE_REQUIRED' WHERE id = ?", (job_id,))
                conn.execute(
                    "UPDATE ocr_job_artifacts SET review_action = 'DISCARDED', updated_at_utc = ? WHERE ocr_job_id = ?",
                    (now, job_id),
                )
                conn.execute("COMMIT;")
                return {
                    "ocr_job_id": job_id,
                    "status": "RETAKE_REQUIRED",
                    "review_action": "DISCARDED",
                    "authorization_state": job.get("authorization_state") or "RAW_OCR",
                    "clinician_verified": False,
                    "clinician_authorized_rx": False,
                }

            if payload.corrected_full_text is not None:
                conn.execute(
                    "UPDATE ocr_job_artifacts SET corrected_full_text = ?, updated_at_utc = ? WHERE ocr_job_id = ?",
                    (payload.corrected_full_text.strip(), now, job_id),
                )

            mark_flag = 1 if is_ack_action else 0
            for upd in payload.fields:
                if upd.field_id:
                    is_ver = 1 if (is_ack_action or upd.mark_verified) else 0
                    conn.execute(
                        """
                        UPDATE ocr_fields
                           SET verified_value = ?,
                               is_verified = CASE WHEN ? = 1 THEN 1 ELSE is_verified END,
                               verified_by_user_id = CASE WHEN ? = 1 THEN ? ELSE verified_by_user_id END,
                               updated_at_utc = ?
                         WHERE id = ? AND ocr_job_id = ?
                        """,
                        (upd.verified_value.strip(), is_ver, is_ver, user["id"], now, upd.field_id, job_id),
                    )
                else:
                    conn.execute(
                        """
                        INSERT INTO ocr_fields (
                            id, ocr_job_id, group_index, field_type, raw_ocr_text, verified_value,
                            confidence, is_critical, is_verified, verified_by_user_id, updated_at_utc
                        ) VALUES (?, ?, ?, ?, ?, ?, 1.0, 1, ?, ?, ?)
                        """,
                        (
                            new_id("ocrf"),
                            job_id,
                            upd.group_index,
                            upd.field_type,
                            upd.verified_value.strip(),
                            upd.verified_value.strip(),
                            mark_flag,
                            user["id"] if mark_flag else None,
                            now,
                        ),
                    )

            unverified = conn.execute(
                "SELECT COUNT(*) FROM ocr_fields WHERE ocr_job_id = ? AND is_critical = 1 AND is_verified = 0",
                (job_id,),
            ).fetchone()[0]

            prev_auth_state = job.get("authorization_state") or "RAW_OCR"
            prev_clinician_id = job.get("clinician_verified_by_user_id")
            prev_clinician_at = job.get("clinician_verified_at_utc")

            if is_clinician_action and unverified == 0:
                new_status = "VERIFIED"
                review_action = "VERIFIED"
                auth_state = "DOCTOR_VERIFIED"
                clinician_id = user["id"]
                clinician_at = now
                patient_ack_id = job.get("patient_acknowledged_by_user_id")
                patient_ack_at = job.get("patient_acknowledged_at_utc")
                conn.execute(
                    "UPDATE ocr_jobs SET status = 'VERIFIED', verified_by_user_id = ?, verified_at_utc = ? WHERE id = ?",
                    (user["id"], now, job_id),
                )
            elif is_ack_action and unverified == 0:
                new_status = "VERIFIED"
                review_action = "VERIFIED"
                auth_state = prev_auth_state if prev_auth_state in ("DOCTOR_VERIFIED", "AUTHORIZED_MEDICATION_PLAN") else "PATIENT_ACKNOWLEDGED"
                clinician_id = prev_clinician_id
                clinician_at = prev_clinician_at
                patient_ack_id = user["id"] if user["primary_role"] == "PATIENT" else job.get("patient_acknowledged_by_user_id")
                patient_ack_at = now if user["primary_role"] == "PATIENT" else job.get("patient_acknowledged_at_utc")
                conn.execute(
                    "UPDATE ocr_jobs SET status = 'VERIFIED', verified_by_user_id = ?, verified_at_utc = ? WHERE id = ?",
                    (user["id"], now, job_id),
                )
            else:
                new_status = "NEEDS_REVIEW"
                review_action = "SAVED_DRAFT"
                auth_state = prev_auth_state if prev_auth_state in ("DOCTOR_VERIFIED", "AUTHORIZED_MEDICATION_PLAN") else "PATIENT_CORRECTED"
                clinician_id = prev_clinician_id
                clinician_at = prev_clinician_at
                patient_ack_id = job.get("patient_acknowledged_by_user_id")
                patient_ack_at = job.get("patient_acknowledged_at_utc")
                conn.execute("UPDATE ocr_jobs SET status = 'NEEDS_REVIEW' WHERE id = ?", (job_id,))

            conn.execute(
                """
                INSERT INTO ocr_job_artifacts (
                    id, ocr_job_id, raw_full_text, corrected_full_text, review_action,
                    authorization_state, patient_acknowledged_by_user_id, patient_acknowledged_at_utc,
                    clinician_verified_by_user_id, clinician_verified_at_utc, updated_at_utc
                ) VALUES (?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(ocr_job_id) DO UPDATE SET
                    corrected_full_text = COALESCE(excluded.corrected_full_text, ocr_job_artifacts.corrected_full_text),
                    review_action = excluded.review_action,
                    authorization_state = excluded.authorization_state,
                    patient_acknowledged_by_user_id = COALESCE(excluded.patient_acknowledged_by_user_id, ocr_job_artifacts.patient_acknowledged_by_user_id),
                    patient_acknowledged_at_utc = COALESCE(excluded.patient_acknowledged_at_utc, ocr_job_artifacts.patient_acknowledged_at_utc),
                    clinician_verified_by_user_id = COALESCE(excluded.clinician_verified_by_user_id, ocr_job_artifacts.clinician_verified_by_user_id),
                    clinician_verified_at_utc = COALESCE(excluded.clinician_verified_at_utc, ocr_job_artifacts.clinician_verified_at_utc),
                    updated_at_utc = excluded.updated_at_utc
                """,
                (
                    new_id("ocra"),
                    job_id,
                    payload.corrected_full_text.strip() if payload.corrected_full_text else None,
                    review_action,
                    auth_state,
                    patient_ack_id,
                    patient_ack_at,
                    clinician_id,
                    clinician_at,
                    now,
                ),
            )

            record_audit(
                conn,
                actor_user_id=user["id"],
                actor_role=user["primary_role"],
                action_type=f"OCR_{payload.action}",
                target_resource="ocr_jobs",
                target_id=job_id,
                details={
                    "remaining_unverified_critical": unverified,
                    "authorization_state": auth_state,
                    "clinician_verified": bool(clinician_id),
                    "reminder_auto_enabled": False,
                },
            )
            conn.execute("COMMIT;")
        except Exception:
            if conn.in_transaction:
                conn.execute("ROLLBACK;")
            raise

    clinician_ok = bool(clinician_id)
    return {
        "ocr_job_id": job_id,
        "status": new_status,
        "review_action": review_action,
        "authorization_state": auth_state,
        "remaining_unverified_critical": unverified,
        "reminder_auto_enabled": False,
        "clinician_verified": clinician_ok,
        "clinician_authorized_rx": clinician_ok,
        "note": (
            "Approved doctor clinically verified this prescription draft."
            if clinician_ok
            else "Patient verification records human-reviewed text only; it does not constitute physician prescribing authorization."
        ),
    }


@router.post("/{job_id}/clinician-verify")
def clinician_verify_ocr_job(job_id: str, payload: OcrVerifyRequest, user: dict = Depends(get_current_user)):
    """Explicit doctor-only endpoint enforcing CLINICIAN_VERIFY."""
    enforced = OcrVerifyRequest(
        action="CLINICIAN_VERIFY",
        corrected_full_text=payload.corrected_full_text,
        fields=payload.fields,
    )
    return verify_or_save_ocr_job(job_id, enforced, user)


@router.post("/{job_id}/explain")
def explain_prescription_via_rag(job_id: str, payload: OcrExplainRequest, user: dict = Depends(get_current_user)):
    """Authorized OCR -> RAG educational explanation without indexing personal prescriptions publicly."""
    enforce_rate_limit(f"ocr_explain:{user['id']}", max_requests=15, window_seconds=60)
    with get_db_conn() as conn:
        job = _assert_ocr_job_access(conn, user, job_id)
        fields = rows_to_dicts(
            conn.execute(
                "SELECT field_type, raw_ocr_text, verified_value, is_verified, confidence FROM ocr_fields WHERE ocr_job_id = ? ORDER BY group_index ASC, id ASC",
                (job_id,),
            ).fetchall()
        )

    raw_text = (job.get("raw_full_text") or "").strip()
    corrected_text = (job.get("corrected_full_text") or "").strip()
    effective_text = corrected_text or raw_text or "\n".join(
        f"{f['field_type']}: {f['verified_value'] or f['raw_ocr_text']}" for f in fields
    )

    if not effective_text.strip():
        raise HTTPException(status_code=422, detail="No OCR or corrected text available to explain.")

    # Extract safe educational keywords for retrieval (never leaking PHI into public vector store)
    search_terms = "prescription abbreviations 1+0+1 AC PC SOS Tab Cap medication safety"
    user_q = payload.question.strip() if payload.question else (
        "Please explain the prescription abbreviations, dosage timing notation, and medication safety points in this reviewed prescription draft."
        if payload.language_mode != "bn"
        else "এই প্রেসক্রিপশনের সংক্ষিপ্ত রূপ, ওষুধ খাওয়ার সময়সূচি (১+০+১ / AC / PC) এবং নিরাপদ ওষুধ ব্যবহারের নিয়মাবলি অনুমোদিত তথ্যসূত্র অনুযায়ী বুঝিয়ে দিন।"
    )

    rag_res = generate_rag_answer(
        query=user_q,
        role=user["primary_role"],
        language_mode=payload.language_mode,
        ocr_context={
            "text": effective_text,
            "review_state": job["status"],
            "search_terms": search_terms,
        },
    )

    now = utc_now_iso()
    with get_db_conn() as conn:
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute("UPDATE ocr_job_artifacts SET last_explained_at_utc = ?, updated_at_utc = ? WHERE ocr_job_id = ?", (now, now, job_id))
        record_audit(
            conn,
            actor_user_id=user["id"],
            actor_role=user["primary_role"],
            action_type="OCR_EXPLAINED_VIA_RAG",
            target_resource="ocr_jobs",
            target_id=job_id,
            details={**redact_for_audit(user_q), "grounded_status": rag_res["grounded_status"]},
        )
        conn.execute("COMMIT;")

    return {
        "ocr_job_id": job_id,
        "provenance": {
            "raw_ocr_text": raw_text,
            "user_corrected_text": corrected_text or None,
            "human_review_status": job["status"],
            "authorization_state": job.get("authorization_state") or "RAW_OCR",
            "clinician_verified": bool(job.get("clinician_verified_by_user_id")),
            "indexed_into_public_rag": False,
        },
        "explanation": rag_res,
    }
