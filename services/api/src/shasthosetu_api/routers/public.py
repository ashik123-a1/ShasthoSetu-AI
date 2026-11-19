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
        sql += " AND (lower(d.display_name) LIKE ? OR lower(d.display_name_bn) LIKE ? OR lower(d.specialty) LIKE ? OR lower(d.symptom_tags_csv) LIKE ? OR lower(COALESCE(d.doctor_code, '')) LIKE ? OR lower(d.practice_location) LIKE ? OR lower(d.district) LIKE ?)"
        like_q = f"%{q.lower()}%"
        params.extend([like_q, like_q, like_q, like_q, like_q, like_q, like_q])
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
    medicines = [
        {"id": "med-napa-ext", "sku": "PHM-001", "name_en": "Napa Extend 665mg", "name_bn": "নাপা এক্সটেন্ড ৬৬৫ মি.গ্রা.", "generic_name": "Paracetamol 665mg", "brand": "Beximco Pharma", "category": "Medicines", "pack_size": "10 Tablets", "mrp_minor_poisha": 3000, "discount_pct": 10, "price_minor_poisha": 2700, "rx_required": False, "in_stock": True, "best_seller": True, "image_tag": "tablets"},
        {"id": "med-seclo-20", "sku": "PHM-002", "name_en": "Seclo 20mg Capsule", "name_bn": "সেকলো ২০ মি.গ্রা.", "generic_name": "Omeprazole 20mg", "brand": "Square Pharma", "category": "Medicines", "pack_size": "10 Capsules", "mrp_minor_poisha": 6000, "discount_pct": 12, "price_minor_poisha": 5280, "rx_required": False, "in_stock": True, "best_seller": True, "image_tag": "capsules"},
        {"id": "med-fexo-120", "sku": "PHM-003", "name_en": "Fexo 120mg", "name_bn": "ফেক্সো ১২০ মি.গ্রা.", "generic_name": "Fexofenadine 120mg", "brand": "Square Pharma", "category": "Medicines", "pack_size": "10 Tablets", "mrp_minor_poisha": 8500, "discount_pct": 10, "price_minor_poisha": 7650, "rx_required": False, "in_stock": True, "best_seller": False, "image_tag": "tablets"},
        {"id": "med-ors-smc", "sku": "PHM-004", "name_en": "SMC Orsaline-N Pack", "name_bn": "এসএমসি ওরস্যালাইন-এন", "generic_name": "Oral Rehydration Salts", "brand": "SMC", "category": "Medicines", "pack_size": "25 Sachets", "mrp_minor_poisha": 15000, "discount_pct": 8, "price_minor_poisha": 13800, "rx_required": False, "in_stock": True, "best_seller": True, "image_tag": "sachets"},
        {"id": "med-comet-500", "sku": "PHM-005", "name_en": "Comet XR 500mg (Rx)", "name_bn": "কমেট এক্সআর ৫০০", "generic_name": "Metformin HCl 500mg", "brand": "Square Pharma", "category": "Diabetic Care", "pack_size": "10 Tablets", "mrp_minor_poisha": 6500, "discount_pct": 10, "price_minor_poisha": 5850, "rx_required": True, "in_stock": True, "best_seller": True, "image_tag": "diabetic"},
        {"id": "med-accu-strips", "sku": "PHM-006", "name_en": "GlucoCheck Test Strips (50s)", "name_bn": "গ্লুকোচেক টেস্ট স্ট্রিপস", "generic_name": "Blood Glucose Strips", "brand": "CareDiag", "category": "Diabetic Care", "pack_size": "50 Strips", "mrp_minor_poisha": 145000, "discount_pct": 15, "price_minor_poisha": 123250, "rx_required": False, "in_stock": True, "best_seller": True, "image_tag": "glucometer"},
        {"id": "med-sugar-free", "sku": "PHM-007", "name_en": "Stevia Zero-Cal Drops", "name_bn": "স্টেভিয়া জিরো-ক্যালরি ড্রপ", "generic_name": "Steviol Glycosides", "brand": "NutriCare", "category": "Diabetic Care", "pack_size": "30 ml Bottle", "mrp_minor_poisha": 42000, "discount_pct": 10, "price_minor_poisha": 37800, "rx_required": False, "in_stock": True, "best_seller": False, "image_tag": "drops"},
        {"id": "med-calcibo-d", "sku": "PHM-008", "name_en": "CoralCal-D Calcium + D3", "name_bn": "কোরালক্যাল-ডি ক্যালসিয়াম + ডি৩", "generic_name": "Calcium Carbonate 500mg + D3", "brand": "Radiant Pharma", "category": "Vitamins & Supplements", "pack_size": "30 Tablets", "mrp_minor_poisha": 36000, "discount_pct": 12, "price_minor_poisha": 31680, "rx_required": False, "in_stock": True, "best_seller": True, "image_tag": "supplement"},
        {"id": "med-neuro-b", "sku": "PHM-009", "name_en": "Neuro-B (B1 + B6 + B12)", "name_bn": "নিউরো-বি ভিটামিন বি কমপ্লেক্স", "generic_name": "Vitamin B1/B6/B12", "brand": "Square Pharma", "category": "Vitamins & Supplements", "pack_size": "10 Tablets", "mrp_minor_poisha": 10000, "discount_pct": 10, "price_minor_poisha": 9000, "rx_required": False, "in_stock": True, "best_seller": False, "image_tag": "supplement"},
        {"id": "med-d-rise", "sku": "PHM-010", "name_en": "D-Rise Vitamin D3 2000 IU", "name_bn": "ডি-রাইজ ভিটামিন ডি৩", "generic_name": "Cholecalciferol 2000 IU", "brand": "Beximco Pharma", "category": "Vitamins & Supplements", "pack_size": "10 Capsules", "mrp_minor_poisha": 12000, "discount_pct": 15, "price_minor_poisha": 10200, "rx_required": False, "in_stock": True, "best_seller": True, "image_tag": "capsules"},
        {"id": "med-sunblock", "sku": "PHM-011", "name_en": "DermaShield SPF 50+ Dry Touch", "name_bn": "ডার্মাশিল্ড সানব্লক SPF 50+", "generic_name": "Broad Spectrum Sunscreen Gel", "brand": "DermaLab BD", "category": "Personal Care", "pack_size": "88 ml Tube", "mrp_minor_poisha": 165000, "discount_pct": 18, "price_minor_poisha": 135300, "rx_required": False, "in_stock": True, "best_seller": True, "image_tag": "skincare"},
        {"id": "med-cetaphil-clean", "sku": "PHM-012", "name_en": "Gentle Skin Cleanser", "name_bn": "জেন্টল স্কিন ক্লিনজার", "generic_name": "Niacinamide + Glycerin Cleanser", "brand": "CareSkin", "category": "Personal Care", "pack_size": "125 ml Bottle", "mrp_minor_poisha": 115000, "discount_pct": 12, "price_minor_poisha": 101200, "rx_required": False, "in_stock": True, "best_seller": False, "image_tag": "skincare"},
        {"id": "med-calamine", "sku": "PHM-013", "name_en": "CalaSooth Soothing Lotion", "name_bn": "ক্যালামিন ও অ্যালোভেরা লোশন", "generic_name": "Calamine BP 15%", "brand": "ACI Pharma", "category": "Personal Care", "pack_size": "100 ml Bottle", "mrp_minor_poisha": 18000, "discount_pct": 10, "price_minor_poisha": 16200, "rx_required": False, "in_stock": True, "best_seller": False, "image_tag": "skincare"},
        {"id": "med-myoinositol", "sku": "PHM-014", "name_en": "OvaCare Myo-Inositol + Folate", "name_bn": "ওভাকেয়ার মায়ো-ইনোসিটল + ফোলেট", "generic_name": "Myo-Inositol + Folic Acid", "brand": "Incepta Women", "category": "Women's Care", "pack_size": "15 Sachets", "mrp_minor_poisha": 67500, "discount_pct": 10, "price_minor_poisha": 60750, "rx_required": False, "in_stock": True, "best_seller": True, "image_tag": "womens"},
        {"id": "med-folison", "sku": "PHM-015", "name_en": "FeroFol Iron + Folic Acid", "name_bn": "ফেরোফল আয়রন + ফলিক অ্যাসিড", "generic_name": "Ferrous Fumarate + Folate", "brand": "Renata Limited", "category": "Women's Care", "pack_size": "30 Capsules", "mrp_minor_poisha": 19500, "discount_pct": 10, "price_minor_poisha": 17550, "rx_required": False, "in_stock": True, "best_seller": False, "image_tag": "womens"},
        {"id": "med-maternal-pad", "sku": "PHM-016", "name_en": "Comfort Care Hygiene Wings (16s)", "name_bn": "কম্ফোর্ট হাইজিন প্যাড (১৬টি)", "generic_name": "Ultra-Soft Sanitary Care", "brand": "Senora / Wellness", "category": "Women's Care", "pack_size": "16 Pads", "mrp_minor_poisha": 24000, "discount_pct": 15, "price_minor_poisha": 20400, "rx_required": False, "in_stock": True, "best_seller": False, "image_tag": "womens"},
        {"id": "med-baby-drops", "sku": "PHM-017", "name_en": "PediaZinc Syrup 100ml", "name_bn": "পেডিয়াজিঙ্ক সিরাপ ১০০ মি.লি.", "generic_name": "Zinc Sulfate 20mg/5ml", "brand": "Renata Limited", "category": "Baby & Mom", "pack_size": "100 ml Bottle", "mrp_minor_poisha": 5500, "discount_pct": 10, "price_minor_poisha": 4950, "rx_required": False, "in_stock": True, "best_seller": True, "image_tag": "baby"},
        {"id": "med-napa-drops", "sku": "PHM-018", "name_en": "Napa Pediatric Drops 15ml", "name_bn": "নাপা পেডিয়াট্রিক ড্রপস", "generic_name": "Paracetamol 80mg/ml", "brand": "Beximco Pharma", "category": "Baby & Mom", "pack_size": "15 ml Dropper", "mrp_minor_poisha": 2500, "discount_pct": 5, "price_minor_poisha": 2375, "rx_required": False, "in_stock": True, "best_seller": True, "image_tag": "baby"},
        {"id": "med-baby-wash", "sku": "PHM-019", "name_en": "Mild Baby Oat Barrier Cream", "name_bn": "বেবি ওট ব্যারিয়ার ক্রিম", "generic_name": "Colloidal Oatmeal Balm", "brand": "BabySafe", "category": "Baby & Mom", "pack_size": "75 gm Tube", "mrp_minor_poisha": 68000, "discount_pct": 12, "price_minor_poisha": 59840, "rx_required": False, "in_stock": True, "best_seller": False, "image_tag": "baby"},
        {"id": "med-bp-monitor", "sku": "PHM-020", "name_en": "Digital Arm BP Monitor (Demo)", "name_bn": "ডিজিটাল বিপি মনিটর", "generic_name": "Automated Oscillometric Cuff", "brand": "MedTech BD", "category": "Health & Devices", "pack_size": "1 Unit + Cuff", "mrp_minor_poisha": 285000, "discount_pct": 15, "price_minor_poisha": 242250, "rx_required": False, "in_stock": True, "best_seller": True, "image_tag": "device"},
        {"id": "med-oximeter", "sku": "PHM-021", "name_en": "Pulse Oximeter LED Finger", "name_bn": "পালস অক্সিমিটার (SpO2)", "generic_name": "SpO2 & Pulse Rate Sensor", "brand": "MedTech BD", "category": "Health & Devices", "pack_size": "1 Unit", "mrp_minor_poisha": 110000, "discount_pct": 20, "price_minor_poisha": 88000, "rx_required": False, "in_stock": True, "best_seller": True, "image_tag": "device"},
        {"id": "med-thermo", "sku": "PHM-022", "name_en": "Infrared Digital Thermometer", "name_bn": "ডিজিটাল থার্মোমিটার", "generic_name": "Clinical Thermometer", "brand": "MedTech BD", "category": "Health & Devices", "pack_size": "1 Unit", "mrp_minor_poisha": 95000, "discount_pct": 10, "price_minor_poisha": 85500, "rx_required": False, "in_stock": True, "best_seller": False, "image_tag": "device"},
        {"id": "med-antiseptic", "sku": "PHM-023", "name_en": "Hexisol Hand Rub 250ml", "name_bn": "হেক্সিসল হ্যান্ড স্যানিটাইজার", "generic_name": "Chlorhexidine + Isopropanol", "brand": "ACI Pharma", "category": "Wellness", "pack_size": "250 ml Bottle", "mrp_minor_poisha": 16000, "discount_pct": 10, "price_minor_poisha": 14400, "rx_required": False, "in_stock": True, "best_seller": False, "image_tag": "wellness"},
        {"id": "med-mask-n95", "sku": "PHM-024", "name_en": "Clinical KN95 Protection Pack (10s)", "name_bn": "ক্লিনিকাল KN95 মাস্ক (১০টি)", "generic_name": "5-Layer Melt-Blown Mask", "brand": "SafeMed BD", "category": "Wellness", "pack_size": "10 Masks", "mrp_minor_poisha": 35000, "discount_pct": 20, "price_minor_poisha": 28000, "rx_required": False, "in_stock": True, "best_seller": True, "image_tag": "wellness"},
    ]
    return {
        "diagnostic_tests": tests,
        "healthcare_plans": plans,
        "facilities": facilities,
        "specialties": specialties,
        "articles": articles,
        "medicines": medicines,
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
