from __future__ import annotations

import hashlib
import json
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, Response, UploadFile
from pydantic import BaseModel, Field

from ..core.audit import notify_user, record_audit
from ..core.dependencies import (
    get_current_user,
    get_optional_user,
    require_approved_doctor,
    require_role,
)
from ..core.security import enforce_rate_limit, new_id, utc_now_iso
from ..db.sqlite import get_db_conn, row_to_dict, rows_to_dicts
from ..services.ml_inference import (
    MAX_UPLOAD_BYTES,
    get_curated_sample_image,
    infer_dermoped,
    infer_pcos_clinical,
    infer_pcos_ultrasound,
    infer_prescription_ocr,
    infer_viral_rash,
)

router = APIRouter(prefix="/v1/ai", tags=["Real AI Model Inference & Clinician Draft Review"])


async def _read_upload_bounded(file: UploadFile, max_bytes: int = MAX_UPLOAD_BYTES) -> bytes:
    """Stream upload in 64 KB chunks and abort immediately if size exceeds max_bytes (prevents OOM DoS)."""
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(64 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"FILE_TOO_LARGE: Uploaded file exceeds {max_bytes // (1024 * 1024)} MB maximum size limit.",
            )
        chunks.append(chunk)
    if total == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    return b"".join(chunks)


class PcosClinicalInferPayload(BaseModel):
    age: Optional[float] = Field(default=None, ge=12, le=65)
    testosterone: Optional[float] = Field(default=None, ge=0, le=500)
    androstenedione: Optional[float] = Field(default=None, ge=0, le=50)
    sdhea: Optional[float] = Field(default=None, ge=0, le=1000)
    waist_circumference: Optional[float] = Field(default=None, ge=40, le=180)
    bmi: Optional[float] = Field(default=None, ge=10, le=65)
    fsh: Optional[float] = Field(default=None, ge=0, le=100)
    lh: Optional[float] = Field(default=None, ge=0, le=100)
    prl: Optional[float] = Field(default=None, ge=0, le=300)
    homa_ir: Optional[float] = Field(default=None, ge=0, le=30)
    e2: Optional[float] = Field(default=None, ge=0, le=1000)
    oh_prog_17: Optional[float] = Field(default=None, ge=0, le=50)
    sbp: Optional[float] = Field(default=None, ge=60, le=240)
    dbp: Optional[float] = Field(default=None, ge=40, le=160)
    glucose: Optional[float] = Field(default=None, ge=30, le=500)
    total_cholesterol: Optional[float] = Field(default=None, ge=50, le=600)
    triglycerides: Optional[float] = Field(default=None, ge=20, le=1000)
    hdl_c: Optional[float] = Field(default=None, ge=10, le=200)
    ldl_c: Optional[float] = Field(default=None, ge=10, le=400)
    vit_d_25oh: Optional[float] = Field(default=None, ge=1, le=200)


class SaveAiDraftRequest(BaseModel):
    module_key: str = Field(..., pattern="^(pcos-clinical|pcos-ultrasound|viral-rash|prescription-ocr|dermoped)$")
    model_id: str = Field(..., min_length=2, max_length=80)
    input_summary: str = Field(..., min_length=2, max_length=500)
    result_json: dict[str, Any]
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0)
    patient_profile_id: Optional[str] = None
    shared_with_doctor: bool = True


class DoctorReviewDraftRequest(BaseModel):
    doctor_review_status: str = Field(default="CLINICIAN_REVIEWED", pattern="^(CLINICIAN_REVIEWED|FLAGGED_INCONCLUSIVE)$")
    doctor_notes: str = Field(..., min_length=3, max_length=1200)


@router.post("/infer/pcos-clinical")
def run_pcos_clinical(
    payload: PcosClinicalInferPayload,
    request: Request,
    user: dict = Depends(get_current_user),
):
    enforce_rate_limit("ai_infer_pcos_clinical", max_requests=25, window_seconds=60, request=request, identifier=user["id"])
    try:
        return infer_pcos_clinical(payload.model_dump())
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"PCOS clinical inference failed: {exc}")


@router.post("/infer/pcos-ultrasound")
async def run_pcos_ultrasound(
    request: Request,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    enforce_rate_limit("ai_infer_pcos_usg", max_requests=20, window_seconds=60, request=request, identifier=user["id"])
    data = await _read_upload_bounded(file)
    try:
        return infer_pcos_ultrasound(data, file.filename or "ultrasound.jpg")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.post("/infer/viral-rash")
async def run_viral_rash(
    request: Request,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    enforce_rate_limit("ai_infer_viral_rash", max_requests=20, window_seconds=60, request=request, identifier=user["id"])
    data = await _read_upload_bounded(file)
    try:
        return infer_viral_rash(data, file.filename or "rash.jpg")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.post("/infer/dermoped")
async def run_dermoped(
    request: Request,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    enforce_rate_limit("ai_infer_dermoped", max_requests=20, window_seconds=60, request=request, identifier=user["id"])
    data = await _read_upload_bounded(file)
    try:
        return infer_dermoped(data, file.filename or "skin.png")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.post("/infer/prescription-ocr")
async def run_prescription_ocr(
    request: Request,
    file: UploadFile = File(...),
    persist_to_queue: bool = Form(default=False),
    patient_profile_id: Optional[str] = Form(default=None),
    user: dict = Depends(get_current_user),
):
    enforce_rate_limit("ai_infer_rx_ocr", max_requests=20, window_seconds=60, request=request, identifier=user["id"])
    data = await _read_upload_bounded(file)
    fname = file.filename or "prescription.jpg"
    try:
        result = infer_prescription_ocr(data, fname)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    created_job_id: Optional[str] = None
    if persist_to_queue:
        if not user or user["primary_role"] != "PATIENT":
            raise HTTPException(status_code=401, detail="Patient login required to persist OCR draft to verification queue.")
        sha = hashlib.sha256(data).hexdigest()
        ext = "application/pdf" if result.get("is_pdf") else "image/jpeg"
        with get_db_conn() as conn:
            conn.execute("BEGIN IMMEDIATE;")
            try:
                if patient_profile_id:
                    owned = conn.execute(
                        "SELECT id FROM patient_profiles WHERE id = ? AND owner_user_id = ?",
                        (patient_profile_id, user["id"]),
                    ).fetchone()
                    if not owned:
                        raise HTTPException(status_code=403, detail="Patient profile does not belong to you.")
                    pid = owned["id"]
                else:
                    owned = conn.execute(
                        "SELECT id FROM patient_profiles WHERE owner_user_id = ? ORDER BY relationship_type = 'SELF' DESC LIMIT 1",
                        (user["id"],),
                    ).fetchone()
                    if not owned:
                        raise HTTPException(status_code=404, detail="No patient profile found.")
                    pid = owned["id"]

                doc_id = new_id("doc")
                job_id = new_id("ocr-job")
                conn.execute(
                    """
                    INSERT INTO medical_documents (
                        id, patient_profile_id, uploaded_by_user_id, doc_type,
                        original_filename, storage_object_key, mime_type, byte_size, sha256_hash, is_synthetic
                    ) VALUES (?, ?, ?, 'PRESCRIPTION', ?, ?, ?, ?, ?, 0)
                    """,
                    (doc_id, pid, user["id"], fname[:140], f"vault/real/{doc_id}_{fname[:60]}", ext, len(data), sha),
                )
                conn.execute(
                    """
                    INSERT INTO ocr_jobs (id, document_id, engine_version, status, mean_confidence, elapsed_ms)
                    VALUES (?, ?, ?, 'NEEDS_REVIEW', ?, ?)
                    """,
                    (job_id, doc_id, result["model_name"][:80], result["mean_confidence"], int(result["latency_ms"])),
                )
                cands = result.get("candidates") or []
                if not cands:
                    cands = [
                        {
                            "group_index": 0,
                            "medicine_name": (result.get("raw_text") or "Unresolved Scan")[:60],
                            "strength": "NEEDS_VERIFICATION",
                            "frequency": "NEEDS_VERIFICATION",
                            "confidence": result["mean_confidence"],
                        }
                    ]
                for idx, cand in enumerate(cands):
                    gidx = int(cand.get("group_index", idx))
                    conf = float(cand.get("confidence", result["mean_confidence"]))
                    for ftype, val in (
                        ("MEDICINE_NAME", str(cand.get("medicine_name") or "NEEDS_VERIFICATION")),
                        ("DOSE", str(cand.get("strength") or "NEEDS_VERIFICATION")),
                        ("FREQUENCY", str(cand.get("frequency") or "NEEDS_VERIFICATION")),
                    ):
                        conn.execute(
                            """
                            INSERT INTO ocr_fields (
                                id, ocr_job_id, group_index, field_type, raw_ocr_text, confidence, is_critical, is_verified
                            ) VALUES (?, ?, ?, ?, ?, ?, 1, 0)
                            """,
                            (new_id("ocrf"), job_id, gidx, ftype, val[:200], conf),
                        )

                record_audit(
                    conn,
                    actor_user_id=user["id"],
                    actor_role="PATIENT",
                    action_type="REAL_OCR_JOB_CREATED",
                    target_resource="ocr_jobs",
                    target_id=job_id,
                    details={"filename": fname, "token_count": result["token_count"]},
                )
                conn.execute("COMMIT;")
                created_job_id = job_id
            except Exception:
                conn.execute("ROLLBACK;")
                raise

    result["persisted_ocr_job_id"] = created_job_id
    return result


@router.get("/samples/{module_key}")
def fetch_curated_sample(module_key: str):
    try:
        data, fname, mime = get_curated_sample_image(module_key)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return Response(
        content=data,
        media_type=mime,
        headers={
            "X-Sample-Filename": fname,
            "Access-Control-Expose-Headers": "X-Sample-Filename",
            "Cache-Control": "no-store",
        },
    )


@router.post("/drafts", status_code=201)
def save_ai_draft(payload: SaveAiDraftRequest, user: dict = Depends(require_role("PATIENT"))):
    with get_db_conn() as conn:
        conn.execute("BEGIN IMMEDIATE;")
        try:
            if payload.patient_profile_id:
                owned = conn.execute(
                    "SELECT id FROM patient_profiles WHERE id = ? AND owner_user_id = ?",
                    (payload.patient_profile_id, user["id"]),
                ).fetchone()
                if not owned:
                    raise HTTPException(status_code=403, detail="Patient profile does not belong to you.")
                pid = owned["id"]
            else:
                owned = conn.execute(
                    "SELECT id FROM patient_profiles WHERE owner_user_id = ? ORDER BY relationship_type = 'SELF' DESC LIMIT 1",
                    (user["id"],),
                ).fetchone()
                pid = owned["id"] if owned else None

            draft_id = new_id("aid")
            conn.execute(
                """
                INSERT INTO ai_inference_drafts (
                    id, patient_profile_id, submitted_by_user_id, module_key,
                    model_id, input_summary, result_json, confidence_score, shared_with_doctor
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    draft_id,
                    pid,
                    user["id"],
                    payload.module_key,
                    payload.model_id,
                    payload.input_summary,
                    json.dumps(payload.result_json, ensure_ascii=False),
                    payload.confidence_score,
                    1 if payload.shared_with_doctor else 0,
                ),
            )
            record_audit(
                conn,
                actor_user_id=user["id"],
                actor_role="PATIENT",
                action_type="AI_DRAFT_SAVED",
                target_resource="ai_inference_drafts",
                target_id=draft_id,
                details={"module_key": payload.module_key, "shared_with_doctor": payload.shared_with_doctor},
            )
            conn.execute("COMMIT;")
        except Exception:
            conn.execute("ROLLBACK;")
            raise
    return {"id": draft_id, "status": "PENDING_CLINICIAN_REVIEW"}


@router.get("/drafts/mine")
def list_my_ai_drafts(user: dict = Depends(require_role("PATIENT"))):
    with get_db_conn() as conn:
        rows = rows_to_dicts(
            conn.execute(
                """
                SELECT d.*, p.display_name AS patient_name, doc.display_name AS reviewed_doctor_name
                  FROM ai_inference_drafts d
                  LEFT JOIN patient_profiles p ON p.id = d.patient_profile_id
                  LEFT JOIN doctor_profiles doc ON doc.id = d.reviewed_by_doctor_id
                 WHERE d.submitted_by_user_id = ?
                 ORDER BY d.created_at_utc DESC
                """,
                (user["id"],),
            ).fetchall()
        )
    return {"drafts": rows}


@router.get("/drafts/doctor-queue")
def list_doctor_ai_draft_queue(user: dict = Depends(get_current_user)):
    if user["primary_role"] == "SUPPORT":
        with get_db_conn() as conn:
            conn.execute("BEGIN IMMEDIATE;")
            record_audit(
                conn,
                actor_user_id=user["id"],
                actor_role="SUPPORT",
                action_type="SUPPORT_AI_DRAFT_PHI_BLOCKED",
                target_resource="ai_inference_drafts",
                outcome="DENIED",
            )
            conn.execute("COMMIT;")
        raise HTTPException(
            status_code=403,
            detail="PHI_ACCESS_DENIED: Zero-PHI policy blocks Support access to patient AI drafts and clinical inference data.",
        )
    if user["primary_role"] != "DOCTOR":
        raise HTTPException(status_code=403, detail="Only approved doctors may access clinician AI draft review queues.")
    doc = user.get("doctor_profile")
    if not doc or doc.get("verification_status") != "APPROVED" or not doc.get("is_active"):
        raise HTTPException(status_code=403, detail="DOCTOR_NOT_APPROVED: Doctor verification required.")

    with get_db_conn() as conn:
        rows = rows_to_dicts(
            conn.execute(
                """
                SELECT d.*, p.display_name AS patient_name, u.full_name AS submitted_by_name
                  FROM ai_inference_drafts d
                  JOIN users u ON u.id = d.submitted_by_user_id
                  LEFT JOIN patient_profiles p ON p.id = d.patient_profile_id
                 WHERE d.shared_with_doctor = 1
                 ORDER BY CASE WHEN d.doctor_review_status = 'PENDING_CLINICIAN_REVIEW' THEN 0 ELSE 1 END,
                          d.created_at_utc DESC
                """
            ).fetchall()
        )
    return {"drafts": rows}


@router.post("/drafts/{draft_id}/review")
def doctor_review_ai_draft(
    draft_id: str,
    payload: DoctorReviewDraftRequest,
    user: dict = Depends(require_approved_doctor),
):
    doc = user["doctor_profile"]
    now = utc_now_iso()
    with get_db_conn() as conn:
        draft = row_to_dict(
            conn.execute("SELECT * FROM ai_inference_drafts WHERE id = ? AND shared_with_doctor = 1", (draft_id,)).fetchone()
        )
        if not draft:
            raise HTTPException(status_code=404, detail="Shared patient AI draft not found.")

        conn.execute("BEGIN IMMEDIATE;")
        try:
            conn.execute(
                """
                UPDATE ai_inference_drafts
                   SET doctor_review_status = ?, reviewed_by_doctor_id = ?, doctor_notes = ?, reviewed_at_utc = ?
                 WHERE id = ?
                """,
                (payload.doctor_review_status, doc["id"], payload.doctor_notes.strip(), now, draft_id),
            )
            notify_user(
                conn,
                recipient_user_id=draft["submitted_by_user_id"],
                topic="AI_DRAFT_REVIEWED",
                entity_type="ai_inference_draft",
                entity_id=draft_id,
                title_bn=f"{doc.get('display_name_bn') or doc['display_name']} আপনার এআই গবেষণা ড্রাফট পর্যালোচনা করেছেন",
                title_en=f"{doc['display_name']} reviewed your shared AI research draft",
            )
            record_audit(
                conn,
                actor_user_id=user["id"],
                actor_role="DOCTOR",
                action_type="DOCTOR_AI_DRAFT_REVIEWED",
                target_resource="ai_inference_drafts",
                target_id=draft_id,
                details={"status": payload.doctor_review_status, "module_key": draft["module_key"]},
            )
            conn.execute("COMMIT;")
        except Exception:
            conn.execute("ROLLBACK;")
            raise
    return {"id": draft_id, "doctor_review_status": payload.doctor_review_status, "reviewed_at_utc": now}
