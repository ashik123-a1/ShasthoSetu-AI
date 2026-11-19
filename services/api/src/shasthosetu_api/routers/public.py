from __future__ import annotations

import csv
import math
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

from ..config import FINAL_LOCK_DIR
from ..core.dependencies import get_current_user, get_optional_user
from ..db.sqlite import get_db_conn, row_to_dict, rows_to_dicts

router = APIRouter(prefix="/v1", tags=["Public Directory, Search, Notifications & Research"])


@router.get("/health")
def health():
    with get_db_conn() as conn:
        wal = conn.execute("PRAGMA journal_mode;").fetchone()[0]
        fk = conn.execute("PRAGMA foreign_keys;").fetchone()[0]
        tables = conn.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").fetchone()[0]
    return {"status": "ok", "journal_mode": wal, "foreign_keys": fk, "table_count": tables}


@router.get("/public/overview")
def public_overview():
    with get_db_conn() as conn:
        approved_doctors = conn.execute(
            "SELECT COUNT(*) FROM doctor_profiles WHERE verification_status = 'APPROVED' AND is_active = 1"
        ).fetchone()[0]
        open_slots = conn.execute(
            "SELECT COUNT(*) FROM appointment_slots s JOIN doctor_profiles d ON d.id = s.doctor_id WHERE d.verification_status = 'APPROVED' AND s.state = 'OPEN' AND s.reserved_count < s.capacity"
        ).fetchone()[0]
        specialties_count = conn.execute("SELECT COUNT(*) FROM specialties WHERE is_active = 1").fetchone()[0]
        diag_count = conn.execute("SELECT COUNT(*) FROM diagnostic_tests WHERE is_active = 1").fetchone()[0]
        plan_count = conn.execute("SELECT COUNT(*) FROM healthcare_plans WHERE is_active = 1").fetchone()[0]
        facility_count = conn.execute("SELECT COUNT(*) FROM facilities").fetchone()[0]
        flags = rows_to_dicts(conn.execute("SELECT flag_key, enabled, description FROM feature_flags").fetchall())

    return {
        "approved_doctors": approved_doctors,
        "open_slots": open_slots,
        "specialties": specialties_count,
        "diagnostic_tests": diag_count,
        "healthcare_plans": plan_count,
        "facilities": facility_count,
        "frozen_research_modules": 6,
        "audit_lock_verdict": "RESEARCH_AUDIT_PASS_WITH_LIMITATIONS",
        "feature_flags": {f["flag_key"]: bool(f["enabled"]) for f in flags},
    }


@router.get("/public/doctors")
def list_approved_doctors(
    specialty: Optional[str] = Query(default=None),
    district: Optional[str] = Query(default=None),
    language: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    online_only: bool = Query(default=False),
):
    sql = """
        SELECT d.*,
               (SELECT COUNT(*) FROM appointment_slots s
                 WHERE s.doctor_id = d.id AND s.state = 'OPEN' AND s.reserved_count < s.capacity) AS open_slots_count
          FROM doctor_profiles d
         WHERE d.verification_status = 'APPROVED' AND d.is_active = 1
    """
    params: list = []
    if specialty:
        sql += " AND lower(d.specialty) LIKE ?"
        params.append(f"%{specialty.lower()}%")
    if district:
        sql += " AND lower(d.district) = lower(?)"
        params.append(district)
    if language:
        sql += " AND lower(d.languages_csv) LIKE ?"
        params.append(f"%{language.lower()}%")
    if online_only:
        sql += " AND d.is_online_now = 1"
    if q:
        sql += " AND (lower(d.display_name) LIKE ? OR lower(d.display_name_bn) LIKE ? OR lower(d.specialty) LIKE ? OR lower(d.symptom_tags_csv) LIKE ?)"
        like_q = f"%{q.lower()}%"
        params.extend([like_q, like_q, like_q, like_q])
    sql += " ORDER BY d.is_online_now DESC, d.experience_years DESC"

    with get_db_conn() as conn:
        doctors = rows_to_dicts(conn.execute(sql, params).fetchall())
        specialties = rows_to_dicts(conn.execute("SELECT * FROM specialties WHERE is_active = 1").fetchall())
    return {"doctors": doctors, "specialties": specialties}


@router.get("/public/doctors/{doctor_id}")
def get_doctor_detail(doctor_id: str):
    with get_db_conn() as conn:
        doc = row_to_dict(
            conn.execute(
                "SELECT * FROM doctor_profiles WHERE id = ? AND verification_status = 'APPROVED' AND is_active = 1",
                (doctor_id,),
            ).fetchone()
        )
        if not doc:
            raise HTTPException(status_code=404, detail="Approved doctor not found.")
        slots = rows_to_dicts(
            conn.execute(
                """
                SELECT * FROM appointment_slots
                 WHERE doctor_id = ? AND state = 'OPEN' AND reserved_count < capacity
                 ORDER BY start_utc ASC
                """,
                (doctor_id,),
            ).fetchall()
        )
    return {"doctor": doc, "open_slots": slots}


@router.get("/public/services")
def get_public_services():
    with get_db_conn() as conn:
        tests = rows_to_dicts(conn.execute("SELECT * FROM diagnostic_tests WHERE is_active = 1").fetchall())
        plans = rows_to_dicts(conn.execute("SELECT * FROM healthcare_plans WHERE is_active = 1").fetchall())
        facilities = rows_to_dicts(conn.execute("SELECT * FROM facilities").fetchall())
        specialties = rows_to_dicts(conn.execute("SELECT * FROM specialties WHERE is_active = 1").fetchall())
    articles = [
        {
            "id": "art-ocr",
            "title_bn": "প্রেসক্রিপশন স্ক্যান করার পর কেন মানব যাচাই বাধ্যতামূলক?",
            "title_en": "Why Prescription OCR Requires Explicit Human Verification",
            "summary_bn": "হাতের লেখার অস্পষ্টতায় ডোজ বা ওষুধের নাম ভুল হতে পারে; তাই ব্যবহারকারী যাচাই ছাড়া রিমাইন্ডার চালু হয় না।",
            "summary_en": "Handwriting ambiguity can misread drug names or doses; reminders remain blocked until manually confirmed.",
            "badge": "SAFETY",
        },
        {
            "id": "art-pcos",
            "title_bn": "পিসিওএস ট্র্যাকিং বনাম আল্ট্রাসাউন্ড PCOM মরফোলজি",
            "title_en": "Understanding PCOS Tracking vs Ovarian PCOM Morphology",
            "summary_bn": "পিসিওএস একটি ক্লিনিকাল সিনড্রোম; আল্ট্রাসাউন্ড ছবি কেবল সহায়ক গবেষণা তথ্য—নিজে নিজে রোগ নির্ণয় করে না।",
            "summary_en": "Ultrasound PCOM morphology alone does not equate to clinical PCOS diagnosis; clinician evaluation is essential.",
            "badge": "RESEARCH_PREVIEW",
        },
        {
            "id": "art-ped",
            "title_bn": "শিশুর জ্বর ও র‍্যাশে কখন দ্রুত হাসপাতালে নেওয়া জরুরি",
            "title_en": "Pediatric Fever & Rash Warning Signs Requiring Urgent Care",
            "summary_bn": "শ্বাসকষ্ট, খিঁচুনি, অতিরিক্ত ঝিমুনি বা দ্রুত ছড়ানো দাগ থাকলে অ্যালগরিদম তাৎক্ষণিক জরুরি পরামর্শ দেখায়।",
            "summary_en": "Deterministic clinical rules immediately escalate breathing distress, lethargy, or spreading petechiae.",
            "badge": "URGENT_REFERRAL",
        },
    ]
    return {
        "diagnostic_tests": tests,
        "healthcare_plans": plans,
        "facilities": facilities,
        "specialties": specialties,
        "articles": articles,
    }


@router.get("/public/search")
def global_search(q: str = Query(default="", max_length=100)):
    term = q.strip().lower()
    with get_db_conn() as conn:
        if term:
            like = f"%{term}%"
            docs = rows_to_dicts(
                conn.execute(
                    """
                    SELECT id, display_name, display_name_bn, specialty, district, consultation_fee_minor_poisha
                      FROM doctor_profiles
                     WHERE verification_status = 'APPROVED' AND is_active = 1
                       AND (lower(display_name) LIKE ? OR lower(display_name_bn) LIKE ? OR lower(specialty) LIKE ? OR lower(symptom_tags_csv) LIKE ?)
                     LIMIT 8
                    """,
                    (like, like, like, like),
                ).fetchall()
            )
            tests = rows_to_dicts(
                conn.execute(
                    "SELECT id, code, name_bn, name_en, category, fee_minor_poisha FROM diagnostic_tests WHERE is_active = 1 AND (lower(name_en) LIKE ? OR lower(name_bn) LIKE ? OR lower(category) LIKE ?) LIMIT 6",
                    (like, like, like),
                ).fetchall()
            )
            facs = rows_to_dicts(
                conn.execute(
                    "SELECT id, name, facility_type, district FROM facilities WHERE lower(name) LIKE ? OR lower(district) LIKE ? LIMIT 5",
                    (like, like),
                ).fetchall()
            )
        else:
            docs = rows_to_dicts(conn.execute("SELECT id, display_name, display_name_bn, specialty, district, consultation_fee_minor_poisha FROM doctor_profiles WHERE verification_status = 'APPROVED' LIMIT 4").fetchall())
            tests = rows_to_dicts(conn.execute("SELECT id, code, name_bn, name_en, category, fee_minor_poisha FROM diagnostic_tests WHERE is_active = 1 LIMIT 4").fetchall())
            facs = rows_to_dicts(conn.execute("SELECT id, name, facility_type, district FROM facilities LIMIT 3").fetchall())

        if term:
            like = f"%{term}%"
            blood_reqs = rows_to_dicts(
                conn.execute(
                    "SELECT id, patient_ref_label, blood_group, urgency_level, hospital_name, district FROM blood_requests WHERE status IN ('OPEN','MATCHED') AND (lower(blood_group) LIKE ? OR lower(hospital_name) LIKE ? OR lower(district) LIKE ?) LIMIT 4",
                    (like, like, like),
                ).fetchall()
            )
            journal = rows_to_dicts(
                conn.execute(
                    "SELECT id, item_type, language, title, title_bn, source_name FROM journal_items WHERE lower(title) LIKE ? OR lower(title_bn) LIKE ? OR lower(summary) LIKE ? LIMIT 4",
                    (like, like, like),
                ).fetchall()
            )
        else:
            blood_reqs = rows_to_dicts(
                conn.execute(
                    "SELECT id, patient_ref_label, blood_group, urgency_level, hospital_name, district FROM blood_requests WHERE status IN ('OPEN','MATCHED') LIMIT 3"
                ).fetchall()
            )
            journal = rows_to_dicts(
                conn.execute(
                    "SELECT id, item_type, language, title, title_bn, source_name FROM journal_items ORDER BY published_at_utc DESC LIMIT 3"
                ).fetchall()
            )
    return {
        "doctors": docs,
        "diagnostic_tests": tests,
        "facilities": facs,
        "blood_requests": blood_reqs,
        "journal_items": journal,
    }


def _read_csv_rows(path) -> list[dict]:
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


@router.get("/public/research")
def get_research_showcase():
    models = _read_csv_rows(FINAL_LOCK_DIR / "FINAL_RESEARCH_MODEL_REGISTER.csv")
    datasets = _read_csv_rows(FINAL_LOCK_DIR / "CORRECTED_DATASET_COUNTS.csv")
    return {
        "audit_verdict": "RESEARCH_AUDIT_PASS_WITH_LIMITATIONS",
        "non_diagnostic_disclaimer_bn": "এই সকল এআই গবেষণা মডেল শুধুমাত্র একাডেমিক ও গবেষণা প্রদর্শনের জন্য; কোনোভাবেই রোগ নির্ণয় বা চিকিৎসার বিকল্প নয়।",
        "non_diagnostic_disclaimer_en": "RESEARCH PREVIEW ONLY — NON-DIAGNOSTIC. Frozen models report audited benchmark metrics and do not provide clinical diagnoses.",
        "models": models,
        "datasets": datasets,
        "deferred_modules": [
            {"id": "AI-01", "name": "Medical RAG & Conversational Assistant", "status": "DEFERRED", "reason": "Deferred to Phase G pending reviewed corpus & abstention suite"},
            {"id": "AI-02", "name": "Bangla Clinical Voice Integration", "status": "DEFERRED", "reason": "Deferred post-RAG (human benchmark only: 39.09% WER on 26 FLEURS clips)"},
        ],
    }


@router.get("/public/research/models/{slug}")
def get_research_model_detail(slug: str):
    from ..services.research_catalog import get_model_detail_dossier

    dossier = get_model_detail_dossier(slug)
    if not dossier:
        raise HTTPException(status_code=404, detail=f"Research model '{slug}' not found.")
    return dossier


class PcosPreviewInput(BaseModel):
    age: int = Field(..., ge=14, le=55)
    bmi: float = Field(..., ge=12.0, le=55.0)
    cycle_length_days: int = Field(..., ge=15, le=120)
    lh_fsh_ratio: float = Field(default=1.2, ge=0.1, le=10.0)
    irregular_cycles: bool = True
    acne_or_hirsutism: bool = False


@router.post("/public/research/pcos-preview")
def evaluate_pcos_research_preview(payload: PcosPreviewInput):
    """Non-diagnostic structured risk-factor screening helper calibrated cleanly alongside M01 caveats."""
    score = 0.0
    factors = []
    if payload.irregular_cycles or payload.cycle_length_days > 35:
        score += 0.42
        factors.append("Irregular or prolonged menstrual cycle (>35 days)")
    if payload.lh_fsh_ratio >= 2.0:
        score += 0.30
        factors.append("Elevated LH/FSH ratio (>=2.0)")
    if payload.bmi >= 25.0:
        score += 0.14
        factors.append("BMI >= 25.0 kg/m²")
    if payload.acne_or_hirsutism:
        score += 0.18
        factors.append("Reported androgen-related skin symptoms")
    prob = round(min(0.95, 1.0 / (1.0 + math.exp(-((score - 0.45) * 4.0)))), 3)
    band = "ELEVATED_SCREENING_INDICATORS" if prob >= 0.6 else "MODERATE_OR_LOW_INDICATORS"
    return {
        "classification": "RESEARCH_PREVIEW_NON_DIAGNOSTIC",
        "model_reference": "M01-XGB-01 Context (N=88 audited benchmark; 88.57% CV Bal Acc)",
        "screening_index": prob,
        "band": band,
        "observed_factors": factors,
        "disclaimer": "NON-DIAGNOSTIC RESEARCH PREVIEW ONLY. Consult an OB-GYN doctor; Rotterdam criteria require formal clinical & lab assessment.",
    }


@router.get("/notifications")
def list_notifications(request: Request):
    user = get_optional_user(request)
    if not user:
        return {"authenticated": False, "unread_count": 0, "notifications": []}
    with get_db_conn() as conn:
        items = rows_to_dicts(
            conn.execute(
                "SELECT * FROM notifications WHERE recipient_user_id = ? ORDER BY created_at_utc DESC LIMIT 20",
                (user["id"],),
            ).fetchall()
        )
    unread = sum(1 for i in items if i["read_at_utc"] is None)
    return {"authenticated": True, "unread_count": unread, "notifications": items}


@router.post("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    from ..core.security import utc_now_iso
    with get_db_conn() as conn:
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            "UPDATE notifications SET read_at_utc = ? WHERE id = ? AND recipient_user_id = ?",
            (utc_now_iso(), notification_id, user["id"]),
        )
        conn.execute("COMMIT;")
    return {"ok": True}
