from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from ..core.audit import notify_user, record_audit
from ..core.security import hash_password, new_id, utc_now_iso
from ..db.sqlite import SCHEMA_SQL_PATH, apply_schema, get_db_conn

DEMO_ACCOUNTS = {
    "patient": ("usr-pt-demo", "patient.demo@shasthosetu.local", "PatientDemo#2026", "+8801711000101", "রহিমা বেগম (Rahima Begum)", "PATIENT"),
    "patient2": ("usr-pt-demo2", "patient2.demo@shasthosetu.local", "PatientDemo#2026", "+8801711000109", "সাকিব হাসান (Sakib Hasan)", "PATIENT"),
    "dr_farhana": ("usr-dr-farhana", "dr.farhana@shasthosetu.local", "DoctorDemo#2026", "+8801711000201", "ডাঃ ফারহানা রহমান (Dr. Farhana)", "DOCTOR"),
    "dr_tanvir": ("usr-dr-tanvir", "dr.tanvir@shasthosetu.local", "DoctorDemo#2026", "+8801711000202", "ডাঃ তানভীর আহমেদ (Dr. Tanvir)", "DOCTOR"),
    "dr_nusrat": ("usr-dr-nusrat", "dr.nusrat@shasthosetu.local", "DoctorDemo#2026", "+8801711000203", "ডাঃ নুসরাত জাহান (Dr. Nusrat)", "DOCTOR"),
    "dr_pending": ("usr-dr-pending", "dr.pending@shasthosetu.local", "DoctorDemo#2026", "+8801711000204", "ডাঃ কামাল হোসেন (Pending Approval)", "DOCTOR"),
    "admin": ("usr-ad-demo", "admin.demo@shasthosetu.local", "AdminDemo#2026", "+8801711000301", "সিস্টেম অ্যাডমিন (ShasthoSetu Admin)", "ADMIN"),
    "support": ("usr-sup-demo", "support.demo@shasthosetu.local", "SupportDemo#2026", "+8801711000401", "সাপোর্ট অফিসার (Support Desk)", "SUPPORT"),
}


def _slot_iso(days_ahead: int, hour_utc: int, minute: int = 0) -> str:
    base = datetime.now(timezone.utc).replace(hour=hour_utc, minute=minute, second=0, microsecond=0) + timedelta(days=days_ahead)
    return base.strftime("%Y-%m-%dT%H:%M:%S.000Z")


def _seed_blood_and_journal(conn, now: str) -> None:
    """Idempotent seed for Blood Connect & Health Journal (runs safely even on existing DBs)."""
    donor_count = conn.execute("SELECT COUNT(*) FROM blood_donors").fetchone()[0]
    if donor_count == 0:
        donors = [
            ("bdon-rahima", "usr-pt-demo", "রহিমা বেগম (Rahima Begum • Demo)", "O+", "WHOLE_BLOOD", "2026-07-10", "AVAILABLE", "Dhaka", "Dhaka", "Bakshibazar / DMCH Zone", 23.7295, 90.3985, "+8801711000101", 4.9, 3, 0),
            ("bdon-sakib", "usr-pt-demo2", "সাকিব হাসান (Sakib Hasan • Demo)", "B+", "WHOLE_BLOOD", "2026-08-22", "AVAILABLE", "Dhaka", "Dhaka", "Dhanmondi / Kalabagan", 23.7450, 90.3820, "+8801711000109", 4.85, 2, 0),
            ("bdon-tanvir-dhk", None, "তানজিম করিম (Tanzim • Demo Donor)", "O+", "PLATELETS", "2026-09-04", "AVAILABLE", "Dhaka", "Dhaka", "Shahbagh Square", 23.7382, 90.3958, "+8801711900111", 4.95, 5, 0),
            ("bdon-nusrat-dhk", None, "মালিহা তাসনিম (Maliha • Demo Donor)", "A+", "WHOLE_BLOOD", "2026-06-18", "AVAILABLE", "Dhaka", "Dhaka", "Mohakhali icddr,b Zone", 23.7785, 90.3992, "+8801711900112", 4.9, 4, 0),
            ("bdon-farhan-dhk", None, "ফারহান ইসলাম (Farhan • Demo Donor)", "O-", "WHOLE_BLOOD", None, "AVAILABLE", "Dhaka", "Dhaka", "Uttara Sector 7", 23.8685, 90.4012, "+8801711900113", 4.8, 1, 0),
            ("bdon-arif-ctg", None, "আরিফ চৌধুরী (Arif • Chattogram)", "B+", "WHOLE_BLOOD", "2026-08-01", "AVAILABLE", "Chattogram", "Chattogram", "Panchlaish / CMCH Gate", 22.3612, 91.8322, "+8801811900201", 4.92, 4, 0),
            ("bdon-sumaiya-ctg", None, "সুমাইয়া আক্তার (Sumaiya • Ctg)", "AB+", "PLASMA", "2026-10-12", "RECENTLY_DONATED", "Chattogram", "Chattogram", "Agrabad Commercial", 22.3264, 91.8124, "+8801811900202", 4.7, 2, 0),
            ("bdon-mahmud-raj", None, "মাহমুদ হাসান (Mahmud • Rajshahi)", "A+", "WHOLE_BLOOD", "2026-07-28", "AVAILABLE", "Rajshahi", "Rajshahi", "Laxmipur / RMCH Road", 24.3735, 88.5842, "+8801711900301", 4.88, 3, 0),
            ("bdon-nadia-syl", None, "নাদিয়া ইসলাম (Nadia • Sylhet)", "AB-", "WHOLE_BLOOD", "2026-05-15", "AVAILABLE", "Sylhet", "Sylhet", "Ambarkhana / Osmani Rd", 24.9045, 91.8615, "+8801711900401", 4.94, 3, 0),
            ("bdon-kamrul-khl", None, "কামরুল শেখ (Kamrul • Khulna)", "O+", "WHOLE_BLOOD", "2026-08-19", "AVAILABLE", "Khulna", "Khulna", "Boyra Medical More", 22.8315, 89.5418, "+8801911900501", 4.85, 2, 0),
            ("bdon-tasnia-bar", None, "তাসনিয়া রহমান (Tasnia • Barishal)", "B-", "WHOLE_BLOOD", None, "AVAILABLE", "Barishal", "Barishal", "Band Road / SBMCH", 22.6889, 90.3635, "+8801711900601", 4.8, 1, 0),
            ("bdon-shafiq-rng", None, "শফিকুল ইসলাম (Shafiq • Rangpur)", "A-", "WHOLE_BLOOD", "2026-07-02", "AVAILABLE", "Rangpur", "Rangpur", "Medical East Gate", 25.7662, 89.2361, "+8801711900701", 4.87, 2, 0),
            ("bdon-mehedi-mym", None, "মেহেদী হাসান (Mehedi • Mymensingh)", "O+", "WHOLE_BLOOD", "2026-09-01", "AVAILABLE", "Mymensingh", "Mymensingh", "Charpara MMCH Crossing", 24.7445, 90.4112, "+8801711900801", 4.9, 3, 0),
        ]
        for row in donors:
            conn.execute(
                """
                INSERT OR IGNORE INTO blood_donors (
                    id, user_id, display_name, blood_group, donation_type, last_donation_date,
                    availability_status, division, district, area_name, lat, lng, contact_phone,
                    trust_score, verified_donations_count, no_show_count, screening_policy_acknowledged,
                    is_synthetic, created_at_utc, updated_at_utc
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
                """,
                (*row, now, now),
            )

    req_count = conn.execute("SELECT COUNT(*) FROM blood_requests").fetchone()[0]
    if req_count == 0:
        reqs = [
            ("breq-dmch-emg", "usr-pt-demo2", "Ward-14 Hematology Patient (Demo)", "O+", 2, 0, "EMERGENCY", "Dhaka Medical College Hospital (DMCH)", 1, "Dhaka", "Dhaka", 23.7259, 90.3976, 5.0, "2026-11-20T12:00:00.000Z", "Urgent 2 bags Whole Blood / RBC needed per hospital blood bank cross-match requisition.", "OPEN"),
            ("breq-cmch-emg", "usr-dr-nusrat", "Surgical Unit-2 Patient (Demo)", "B+", 1, 0, "EMERGENCY", "Chattogram Medical College Hospital (CMCH)", 1, "Chattogram", "Chattogram", 22.3596, 91.8305, 10.0, "2026-11-20T18:00:00.000Z", "Hospital-verified emergency surgery support; cross-match desk open 24h.", "OPEN"),
            ("breq-rmch-urg", "usr-pt-demo", "Maternal Care Ward-4 (Demo)", "A+", 1, 0, "URGENT", "Rajshahi Medical College Hospital (RMCH)", 0, "Rajshahi", "Rajshahi", 24.3718, 88.5806, 10.0, "2026-11-21T10:00:00.000Z", "Postpartum anemia coordination request.", "OPEN"),
            ("breq-somch-sch", "usr-dr-farhana", "Thalassemia Routine Schedule (Demo)", "AB-", 1, 0, "SCHEDULED", "Sylhet MAG Osmani Medical College Hospital", 1, "Sylhet", "Sylhet", 24.9016, 91.8533, 20.0, "2026-11-23T09:00:00.000Z", "Planned scheduled support; blood bank screening mandatory before donation.", "OPEN"),
        ]
        for row in reqs:
            conn.execute(
                """
                INSERT OR IGNORE INTO blood_requests (
                    id, requester_user_id, patient_ref_label, blood_group, units_required, units_fulfilled,
                    urgency_level, hospital_name, hospital_verified, division, district, lat, lng,
                    search_radius_km, needed_by_utc, notes, status, is_synthetic, created_at_utc, updated_at_utc
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                """,
                (*row, now, now),
            )

        conn.execute(
            """
            INSERT OR IGNORE INTO blood_match_logs (id, request_id, donor_id, notified_at_utc, response_status, consent_phone_shared)
            VALUES
              ('bmat-seed-1', 'breq-dmch-emg', 'bdon-rahima', ?, 'NOTIFIED', 0),
              ('bmat-seed-2', 'breq-cmch-emg', 'bdon-arif-ctg', ?, 'NOTIFIED', 0)
            """,
            (now, now),
        )

    blog_count = conn.execute("SELECT COUNT(*) FROM journal_items WHERE item_type = 'BLOG'").fetchone()[0]
    if blog_count == 0:
        curated = [
            (
                "jrn-blog-pcos", "BLOG", "bilingual", "womens-health",
                "PCOS Clinical Assessment vs. Ultrasound PCOM Morphology: Why Track Separation Matters",
                "পিসিওএস ক্লিনিকাল মূল্যায়ন বনাম আল্ট্রাসাউন্ড PCOM মরফোলজি: দুই ট্র্যাক আলাদা রাখা কেন জরুরি",
                "Rotterdam diagnostic guidelines require multiple clinical, hormonal, and sonographic inputs. Research classifiers must keep lab models (M01) separate from ovarian ultrasound morphology (M02) under clinician oversight.",
                "রটারডাম মানদণ্ড অনুযায়ী হরমোনাল ল্যাব তথ্য ও আল্ট্রাসাউন্ড মরফোলজি আলাদাভাবে চিকিৎসকের পর্যালোচনায় দেখা উচিত—একটি আল্ট্রাসাউন্ড ছবি এককভাবে রোগ নির্ণয় নয়।",
                "ShasthoSetu Editorial Board", "https://www.who.int/news-room/fact-sheets/detail/polycystic-ovary-syndrome",
                None, None, None, "2026-11-18T10:00:00Z", "EDITORIAL_REVIEWED", '{"reading_min": 4}',
            ),
            (
                "jrn-blog-ocr", "BLOG", "bilingual", "medical-news",
                "Why Every Scanned Prescription Needs Human Verification Before Setting Pill Reminders",
                "ওষুধের রিমাইন্ডার চালুর আগে প্রেসক্রিপশন OCR কেন মানুষের যাচাই বাধ্যতামূলক?",
                "Handwritten Bangla/English dosage scripts carry ambiguity (e.g., 5mg vs 50mg or 1+0+1). ShasthoSetu's HTTP 422 Safe-OCR gate blocks automatic scheduling until you verify every flagged medicine.",
                "হাতে লেখা প্রেসক্রিপশনে ডোজ ভুল পড়ার ঝুঁকি থাকে। তাই ব্যবহারকারী নিশ্চিত না করা পর্যন্ত সার্ভার HTTP 422 দ্বারা রিমাইন্ডার চালু বন্ধ রাখে।",
                "ShasthoSetu Clinical Safety Team", "https://medlineplus.gov/medicines.html",
                None, None, None, "2026-11-17T10:00:00Z", "EDITORIAL_REVIEWED", '{"reading_min": 3}',
            ),
            (
                "jrn-blog-ped", "BLOG", "bilingual", "child-care",
                "Pediatric Fever & Viral Rash Warning Signs + Bangladesh EPI Immunization Checklist",
                "শিশুর জ্বর ও ভাইরাল র‍্যাশের জরুরি বিপদচিহ্ন ও বাংলাদেশ ইপিআই টিকা সূচি",
                "Immediate medical attention is vital when child fever or rash accompanies fast breathing, chest indrawing, convulsions, or extreme lethargy. Follow Bangladesh EPI intervals at birth, 6/10/14 weeks, 9 months & 15 months.",
                "শিশুর জ্বর-র‍্যাশের সাথে শ্বাসকষ্ট, পাঁজর দেবে যাওয়া বা তীব্র ঝিমুনি থাকলে দ্রুত হাসপাতালে নিন এবং ইপিআই টিকার নির্ধারিত তারিখ মেনে চলুন।",
                "ShasthoSetu Pediatric Guidance", "https://www.unicef.org/bangladesh/en",
                None, None, None, "2026-11-16T10:00:00Z", "EDITORIAL_REVIEWED", '{"reading_min": 4}',
            ),
            (
                "jrn-blog-blood", "BLOG", "bilingual", "blood-donation",
                "Voluntary Blood Donation Preparation, Clinical Screening & Cross-Match Safety Facts",
                "স্বেচ্ছায় রক্তদান প্রস্তুতি, স্থানীয় ব্লাড ব্যাংক স্ক্রিনিং ও ক্রস-ম্যাচিং নিরাপত্তা",
                "Eligibility intervals depend on donation component (Whole Blood, Platelets, Plasma), hemoglobin levels, and local blood bank clinical screening — never rely solely on software dates or skip laboratory cross-matching.",
                "রক্তদানের যোগ্যতা রক্তের উপাদান, হিমোগ্লোবিন ও ব্লাড ব্যাংকের সরাসরি চিকিৎসক স্ক্রিনিংয়ে নির্ধারিত হয়—ট্রান্সফিউশনের আগে ল্যাব ক্রস-ম্যাচিং অপরিহার্য।",
                "ShasthoSetu Blood Connect Editorial", "https://www.who.int/campaigns/world-blood-donor-day",
                None, None, None, "2026-11-15T10:00:00Z", "EDITORIAL_REVIEWED", '{"reading_min": 4}',
            ),
        ]
        for row in curated:
            conn.execute(
                """
                INSERT OR IGNORE INTO journal_items (
                    id, item_type, language, category, title, title_bn, summary, summary_bn,
                    source_name, source_url, video_id, video_embed_url, thumbnail_url,
                    published_at_utc, editorial_status, citation_meta_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                row,
            )


def _seed_ai_feature_flags(conn, now: str) -> None:
    """Ensure AI-RAG-VOICE-OCR-01 feature flags are registered and active (idempotent)."""
    ai_flags = [
        ("ai_chatbot_enabled", 1, "Bilingual Medical Information RAG Chatbot (Ollama + Hybrid Retrieval, AI-RAG-VOICE-OCR-01)"),
        ("voice_ai_enabled", 1, "Bengali + English Voice ASR & Tested Local TTS Controls (AI-RAG-VOICE-OCR-01)"),
        ("deferred_rag_chatbot", 1, "Authorized under AI-RAG-VOICE-OCR-01: Bilingual Medical RAG Chatbot active"),
        ("deferred_voice_asr", 1, "Authorized under AI-RAG-VOICE-OCR-01: Voice ASR + Editable Confirmation active"),
    ]
    for fk, enb, desc in ai_flags:
        conn.execute(
            """
            INSERT INTO feature_flags (flag_key, enabled, description, updated_at_utc)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(flag_key) DO UPDATE SET
                enabled = excluded.enabled,
                description = excluded.description,
                updated_at_utc = excluded.updated_at_utc
            """,
            (fk, enb, desc, now),
        )


def _seed_expanded_doctors_and_catalog(conn, now: str) -> None:
    """Idempotently add rich doctor profile columns, 40 additional demo clinicians (43 total across 8 specialties), slots & 12 diagnostic tests."""
    existing_cols = {row[1] for row in conn.execute("PRAGMA table_info(doctor_profiles)").fetchall()}
    migrations = [
        ("avatar_url", "TEXT"),
        ("doctor_code", "TEXT"),
        ("rating", "REAL DEFAULT 4.9"),
        ("reviews_count", "INTEGER DEFAULT 180"),
        ("patients_seen", "INTEGER DEFAULT 1200"),
        ("avg_wait_minutes", "INTEGER DEFAULT 15"),
        ("joined_date_label", "TEXT DEFAULT 'June 02, 2022'"),
        ("instant_hours_label", "TEXT DEFAULT 'Sat - Thu (8:00 PM - 11:30 PM)'"),
        ("appointment_hours_label", "TEXT DEFAULT 'Sat - Fri (10:00 AM - 10:00 PM)'"),
        ("workplace_history_json", "TEXT"),
    ]
    for col, col_def in migrations:
        if col not in existing_cols:
            conn.execute(f"ALTER TABLE doctor_profiles ADD COLUMN {col} {col_def};")

    # Enrich base 3 doctors
    base_meta = [
        (
            "doc-farhana", "/images/doctors/doc-f-01.jpg", "SS7001", 4.9, 412, 1574, 15, "June 02, 2022",
            "Sat - Wed (8:00 PM - 11:00 PM)", "Sat - Thu (4:00 PM - 9:00 PM)",
            json.dumps([
                {"hospital": "Dhanmondi Care Hub (Demo)", "role": "Consultant OB-GYN & PCOS Specialist", "period": "2021 - Present"},
                {"hospital": "Dhaka Medical College Hospital", "role": "Registrar (OB-GYN Demo Fellowship)", "period": "2017 - 2021"},
            ]),
        ),
        (
            "doc-tanvir", "/images/doctors/doc-m-01.jpg", "SS7002", 4.9, 368, 1869, 12, "July 05, 2021",
            "Sat - Thu (8:00 PM - 11:55 PM)", "Sat - Fri (11:00 AM - 8:00 PM)",
            json.dumps([
                {"hospital": "Uttara Family Clinic (Demo)", "role": "Senior Pediatrician", "period": "2020 - Present"},
                {"hospital": "Dhaka Shishu Hospital", "role": "Resident MD (Pediatrics Demo)", "period": "2016 - 2020"},
            ]),
        ),
        (
            "doc-nusrat", "/images/doctors/doc-f-02.jpg", "SS7003", 4.8, 294, 1140, 15, "March 14, 2022",
            "Sun - Thu (7:30 PM - 11:00 PM)", "Sat - Thu (3:00 PM - 8:30 PM)",
            json.dumps([
                {"hospital": "Agrabad Skin Point (Demo)", "role": "Consultant Dermatologist", "period": "2021 - Present"},
                {"hospital": "Chattogram Medical College Hospital", "role": "Medical Officer (Dermatology)", "period": "2018 - 2021"},
            ]),
        ),
    ]
    for did, av, dcode, rat, rev, pts, wait, joined, ih, ah, wh in base_meta:
        conn.execute(
            """
            UPDATE doctor_profiles
               SET avatar_url = ?, doctor_code = ?, rating = ?, reviews_count = ?,
                   patients_seen = ?, avg_wait_minutes = ?, joined_date_label = ?,
                   instant_hours_label = ?, appointment_hours_label = ?, workplace_history_json = ?
             WHERE id = ?
            """,
            (av, dcode, rat, rev, pts, wait, joined, ih, ah, wh, did),
        )

    # Ensure all 8 core specialties exist
    extra_specialties = [
        ("spec-gp", "general-physician", "জেনারেল ফিজিশিয়ান", "General Physician", 25000, 100000),
        ("spec-gyn", "gynecology-pcos", "স্ত্রীরোগ ও পিসিওএস", "Gynecology & PCOS", 30000, 150000),
        ("spec-ped", "pediatrics", "শিশু ও নবজাতক রোগ", "Pediatrics & Child Care", 30000, 150000),
        ("spec-derm", "dermatology", "চর্ম ও ভাইরাল র‍্যাশ", "Dermatology & Skin Care", 30000, 150000),
        ("spec-med", "internal-medicine", "জেনারেল ও ইন্টারনাল মেডিসিন", "Internal Medicine", 20000, 120000),
        ("spec-endo", "endocrinology", "এন্ডোক্রিনোলজি (হরমোন ও ডায়াবেটিস)", "Endocrinology", 40000, 160000),
        ("spec-ortho", "orthopedics", "অর্থোপেডিক্স ও হাড়ের রোগ", "Orthopedics", 40000, 180000),
        ("spec-card", "cardiology", "হৃদরোগ ও রক্তচাপ", "Cardiology", 50000, 200000),
    ]
    for sid, slug, bn, en, mn, mx in extra_specialties:
        conn.execute(
            "INSERT OR IGNORE INTO specialties (id, slug, name_bn, name_en, min_fee_minor_poisha, max_fee_minor_poisha) VALUES (?, ?, ?, ?, ?, ?)",
            (sid, slug, bn, en, mn, mx),
        )

    # 40 additional synthetic clinicians (5 per each of 8 departments = 43 APPROVED total)
    dept_catalog = [
        ("General Physician", "gp", "general physician,fever,cold,flu,allergy,weakness,primary care", [
            ("Dr. Asif Hossain (Demo)", "ডাঃ আসিফ হোসাইন", "MBBS, PGT (Medicine), CCD (BIRDEM)", "Dhaka Medical College Hospital", "Dhaka", 9, 40000, 25000, "m", 2, 1),
            ("Dr. Samira Karim (Demo)", "ডাঃ সামিরা করিম", "MBBS, MPH, Primary Care Demo", "Ibn Sina Consultation Center", "Dhaka", 7, 35000, 20000, "f", 3, 1),
            ("Dr. Mahbubur Rahman (Demo)", "ডাঃ মাহবুবুর রহমান", "MBBS, BCS (Health)", "Rajshahi Medical College Hospital", "Rajshahi", 11, 30000, 20000, "m", 3, 1),
            ("Dr. Sabina Yasmin (Demo)", "ডাঃ সাবিনা ইয়াসমিন", "MBBS, CMU (Sonology)", "Sylhet MAG Osmani Medical College", "Sylhet", 8, 35000, 20000, "f", 4, 0),
            ("Dr. Rafiqul Alam (Demo)", "ডাঃ রফিকুল আলম", "MBBS, FCGP (General Practice)", "Khulna Medical College Hospital", "Khulna", 14, 45000, 25000, "m", 4, 1),
        ]),
        ("Gynecology & Obstetrics", "gyn", "pcos,irregular periods,pregnancy,obgyn,maternal,hormone,ultrasound", [
            ("Dr. Tahmina Hoque Pinki (Demo)", "ডাঃ তাহমিনা হক পিঙ্কি", "MBBS, MCPS (OB-GYN), MS, FCPS", "Dhaka Medical College Hospital", "Dhaka", 16, 100000, 70000, "f", 5, 1),
            ("Dr. Tanzina Ahmed (Demo)", "ডাঃ তানজিনা আহমেদ", "MBBS (CU), FCPS (OB-GYN Final), CMU", "Dhaka Medical College Hospital", "Dhaka", 8, 32000, 21000, "f", 6, 1),
            ("Dr. Laila Arjumand (Demo)", "ডাঃ লায়লা আরজুমান্দ", "MBBS, DGO, MS (Gynae)", "BSMMU Super Specialized Desk", "Dhaka", 15, 90000, 60000, "f", 7, 0),
            ("Dr. Meherun Nessa (Demo)", "ডাঃ মেহেরুন নেসা", "MBBS, FCPS (Gynae & Obs)", "Chattogram Medical College Hospital", "Chattogram", 12, 70000, 40000, "f", 8, 1),
            ("Dr. Dilruba Parvin (Demo)", "ডাঃ দিলরুবা পারভীন", "MBBS, MCPS (OB-GYN)", "Mymensingh Medical College Hospital", "Mymensingh", 10, 50000, 30000, "f", 1, 1),
        ]),
        ("Pediatrics & Child Care", "ped", "child fever,pediatric,vaccine,rash,cough,neonatal,epi", [
            ("Assoc. Prof. Dr. Hasan Mahmud (Demo)", "সহযোগী অধ্যাপক ডাঃ হাসান মাহমুদ", "MBBS, DCH, FCPS (Pediatrics)", "Dhaka Shishu Hospital (Demo)", "Dhaka", 17, 70000, 45000, "m", 5, 1),
            ("Dr. Md. Mehedi Hasan (Demo)", "ডাঃ মোঃ মেহেদী হাসান", "MBBS, BCS (Health), MD (Pediatric)", "Satkhira Medical College Hospital", "Khulna", 14, 70000, 40000, "m", 6, 1),
            ("Dr. Tamanna Chowdhury (Demo)", "ডাঃ তামান্না চৌধুরী", "MBBS, MD (Pediatrics)", "Square Child Health Desk (Demo)", "Dhaka", 9, 80000, 50000, "f", 2, 1),
            ("Dr. Nazmul Haque (Demo)", "ডাঃ নাজমুল হক", "MBBS, DCH (Child Health)", "Rangpur Medical College Hospital", "Rangpur", 11, 45000, 25000, "m", 7, 0),
            ("Dr. Afroza Begum (Demo)", "ডাঃ আফরোজা বেগম", "MBBS, FCPS (Pediatrics)", "Sher-e-Bangla Medical College", "Barishal", 13, 55000, 30000, "f", 3, 1),
        ]),
        ("Dermatology & Skin Care", "derm", "skin rash,itching,acne,hair fall,fungal,chickenpox,eczema,dermatology", [
            ("Dr. Sharmin Sultana (Demo)", "ডাঃ শারমিন সুলতানা", "MBBS, DDV, FCPS (Dermatology)", "BSMMU Dermatology Wing (Demo)", "Dhaka", 12, 80000, 50000, "f", 4, 1),
            ("Dr. Rezwanul Karim (Demo)", "ডাঃ রেজওয়ানুল করিম", "MBBS, MD (Dermatology & VD)", "Popular Diagnostic Dhanmondi", "Dhaka", 10, 70000, 40000, "m", 8, 1),
            ("Dr. Sadia Afrin (Demo)", "ডাঃ সাদিয়া আফরিন", "MBBS, DDV (CU)", "Chattogram Skin Laser Clinic (Demo)", "Chattogram", 7, 50000, 30000, "f", 5, 1),
            ("Dr. Touhidul Islam (Demo)", "ডাঃ তৌহিদুল ইসলাম", "MBBS, MCPS (Dermatology)", "Rajshahi Skin Care Center (Demo)", "Rajshahi", 9, 45000, 25000, "m", 1, 0),
            ("Dr. Taslima Akter (Demo)", "ডাঃ তাসলিমা আক্তার", "MBBS, PGT (Skin & Hair)", "Sylhet Modern Skin Hub (Demo)", "Sylhet", 6, 40000, 25000, "f", 6, 1),
        ]),
        ("Internal Medicine", "med", "internal medicine,fever,diabetes,hypertension,gastric,dengue,general", [
            ("Dr. Pradicta Das Shreya (Demo)", "ডাঃ প্রাদিক্তা দাস শ্রেয়া", "MBBS, CCD, PGT, MRCP (UK)", "Evercare Internal Medicine (Demo)", "Dhaka", 11, 90000, 55000, "f", 7, 1),
            ("Dr. Rayhan Ahmed (Demo)", "ডাঃ রায়হান আহমেদ", "MBBS, BCS (Health), FCPS, MD", "Dhaka Medical College Hospital", "Dhaka", 15, 85000, 50000, "m", 2, 1),
            ("Dr. Shamsul Haque (Demo)", "ডাঃ শামসুল হক", "MBBS, FCPS (Medicine)", "Chattogram Medical College Hospital", "Chattogram", 18, 95000, 60000, "m", 3, 0),
            ("Dr. Rubina Yasmin (Demo)", "ডাঃ রুবিনা ইয়াসমিন", "MBBS, MD (Internal Medicine)", "icddr,b Infectious Consultation Desk", "Dhaka", 12, 75000, 45000, "f", 8, 1),
            ("Dr. Jahangir Kabir (Demo)", "ডাঃ জাহাঙ্গীর কবীর", "MBBS, MACP (Medicine)", "Barishal Central Care Hub (Demo)", "Barishal", 10, 50000, 30000, "m", 4, 1),
        ]),
        ("Endocrinology", "endo", "diabetes,thyroid,pcos,hormone,obesity,insulin,endocrine,weight", [
            ("Dr. Imranul Haque (Demo)", "ডাঃ ইমরানুল হক", "MBBS, DEM (BIRDEM), MD (Endocrinology)", "BIRDEM General Desk (Demo)", "Dhaka", 14, 90000, 50000, "m", 5, 1),
            ("Dr. Farzana Yasmin (Demo)", "ডাঃ ফারজানা ইয়াসমিন", "MBBS, FCPS (Endocrinology & Metabolism)", "Square Hormone Studio (Demo)", "Dhaka", 11, 100000, 65000, "f", 1, 1),
            ("Dr. Mizanur Rahman (Demo)", "ডাঃ মিজানুর রহমান", "MBBS, CCD, MPhil (Endocrine)", "Rajshahi Diabetic Hub (Demo)", "Rajshahi", 9, 55000, 35000, "m", 6, 0),
            ("Dr. Nargis Sultana (Demo)", "ডাঃ নার্গিস সুলতানা", "MBBS, DEM (BSMMU)", "Chattogram Endocrine Clinic (Demo)", "Chattogram", 10, 65000, 40000, "f", 2, 1),
            ("Dr. Ashrafuzzaman Khan (Demo)", "ডাঃ আশরাফুজ্জামান খান", "MBBS, MD (Hormone & Thyroid)", "Sylhet Thyroid & Diabetes Care", "Sylhet", 13, 75000, 45000, "m", 7, 1),
        ]),
        ("Orthopedics", "ortho", "joint pain,knee,back pain,fracture,arthritis,bone,spine,orthopedics", [
            ("Asst. Prof. Dr. Mamunur Rashid (Demo)", "সহকারী অধ্যাপক ডাঃ মামুনুর রশীদ", "MBBS, BCS, MRCS (UK), FACS, MS (Ortho)", "NITOR (Pangu Hospital) Demo Desk", "Dhaka", 16, 100000, 60000, "m", 8, 1),
            ("Dr. Kamrul Hasan (Demo)", "ডাঃ কামরুল হাসান", "MBBS, D-Ortho, MS (Orthopedics)", "Popular Orthopedic Wing (Demo)", "Dhaka", 12, 75000, 45000, "m", 1, 1),
            ("Dr. Nausheen Tabassum (Demo)", "ডাঃ নওশীন তাবাসসুম", "MBBS, MS (Ortho & Trauma Demo)", "United Bone & Joint Clinic (Demo)", "Dhaka", 8, 70000, 40000, "f", 3, 0),
            ("Dr. Belayet Hossain (Demo)", "ডাঃ বেলায়েত হোসেন", "MBBS, D-Ortho (CU)", "Chattogram Ortho Care (Demo)", "Chattogram", 14, 65000, 40000, "m", 2, 1),
            ("Dr. Monirul Islam (Demo)", "ডাঃ মনিরুল ইসলাম", "MBBS, BCS, PGT (Orthopedics)", "Rangpur Medical College Hospital", "Rangpur", 9, 45000, 25000, "m", 3, 1),
        ]),
        ("Cardiology", "card", "chest pain,blood pressure,hypertension,heart,ecg,palpitation,cardiology", [
            ("Prof. Dr. Zakir Hossain (Demo)", "অধ্যাপক ডাঃ জাকির হোসেন", "MBBS, MD (Cardiology), FSCAI", "NICVD Heart Center (Demo)", "Dhaka", 21, 120000, 80000, "m", 4, 1),
            ("Dr. Humayra Kabir (Demo)", "ডাঃ হুমায়রা কবির", "MBBS, D-Card, FCPS (Cardiology)", "Ibn Sina Cardiac Care (Demo)", "Dhaka", 13, 90000, 55000, "f", 4, 1),
            ("Dr. Saiful Islam (Demo)", "ডাঃ সাইফুল ইসলাম", "MBBS, MD (Cardiology)", "Mymensingh Heart Foundation", "Mymensingh", 12, 65000, 40000, "m", 5, 1),
            ("Dr. Tania Sultana (Demo)", "ডাঃ তানিয়া সুলতানা", "MBBS, MRCP, Fellow Cardiology", "Evercare Cardiac Desk (Demo)", "Dhaka", 10, 95000, 60000, "f", 5, 0),
            ("Dr. Anwarul Azim (Demo)", "ডাঃ আনোয়ারুল আজিম", "MBBS, D-Card (BSMMU)", "Khulna Heart & BP Center (Demo)", "Khulna", 14, 70000, 45000, "m", 6, 1),
        ]),
    ]

    pw_hash = hash_password("DoctorDemo#2026")
    seq_num = 4
    new_doc_ids: list[str] = []
    for spec_name, prefix, tags, entries in dept_catalog:
        for i, (name_en, name_bn, degrees, hospital, district, exp, fee, ffee, gender, img_idx, online) in enumerate(entries, 1):
            did = f"doc-demo-{prefix}-{i}"
            uid = f"usr-dr-demo-{prefix}-{i}"
            email = f"dr.{prefix}{i}@shasthosetu.local"
            phone = f"+8801722{seq_num:06d}"
            dcode = f"SS{7000 + seq_num}"
            bmdc = f"BMDC-DEMO-{51540 + seq_num}"
            avatar = f"/images/doctors/doc-{gender}-{img_idx:02d}.jpg"
            rating = round(4.8 + ((seq_num % 3) * 0.1), 1)
            if rating > 5.0:
                rating = 5.0
            reviews = 140 + (seq_num * 23) % 880
            patients_seen = 580 + (seq_num * 67) % 2780
            bio_en = (
                f"Fictional synthetic specialist demo profile practicing {spec_name} at {hospital}, {district}. "
                f"Supports video consultations, prescription explanation, and safe non-diagnostic triage."
            )
            bio_bn = (
                f"{hospital}, {district}-এ কর্মরত {spec_name} বিভাগের কাল্পনিক ডেমো বিশেষজ্ঞ। "
                f"ভিডিও ও অডিও পরামর্শ এবং ফলো-আপ সহায়তার জন্য নিবন্ধিত।"
            )
            work_hist = json.dumps([
                {"hospital": hospital, "role": f"Consultant • {spec_name}", "period": "2021 - Present"},
                {"hospital": f"{district} Clinical Teaching Desk (Demo)", "role": "Registrar", "period": "2017 - 2021"},
            ])

            conn.execute(
                """
                INSERT OR IGNORE INTO users (id, email, phone, password_hash, full_name, primary_role, preferred_locale, account_status, is_synthetic, created_at_utc, updated_at_utc)
                VALUES (?, ?, ?, ?, ?, 'DOCTOR', 'bn', 'ACTIVE', 1, ?, ?)
                """,
                (uid, email, phone, pw_hash, name_en, now, now),
            )
            conn.execute(
                """
                INSERT OR IGNORE INTO role_memberships (id, user_id, role, organization_id, approval_state, created_at_utc)
                VALUES (?, ?, 'DOCTOR', NULL, 'APPROVED', ?)
                """,
                (f"rm-{uid}", uid, now),
            )
            conn.execute(
                """
                INSERT OR IGNORE INTO doctor_profiles (
                    id, user_id, display_name, display_name_bn, degrees, specialty, bmdc_demo_reg,
                    practice_location, district, experience_years, languages_csv, symptom_tags_csv,
                    consultation_modality, is_online_now, bio, bio_bn,
                    consultation_fee_minor_poisha, followup_fee_minor_poisha, slot_duration_minutes,
                    verification_status, is_active, is_fictional_demo,
                    avatar_url, doctor_code, rating, reviews_count, patients_seen, avg_wait_minutes,
                    joined_date_label, instant_hours_label, appointment_hours_label, workplace_history_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'bn,en', ?, 'BOTH', ?, ?, ?, ?, ?, 20, 'APPROVED', 1, 1, ?, ?, ?, ?, ?, 15, 'July 05, 2021', 'Sat - Thu (8:00 PM - 11:30 PM)', 'Sat - Fri (11:00 AM - 10:00 PM)', ?)
                """,
                (
                    did, uid, name_en, name_bn, degrees, spec_name, bmdc,
                    hospital, district, exp, tags, online, bio_en, bio_bn,
                    fee, ffee, avatar, dcode, rating, reviews, patients_seen, work_hist,
                ),
            )
            new_doc_ids.append(did)
            seq_num += 1

    # Ensure every newly added doctor has open bookable slots if none exist
    for did in new_doc_ids:
        open_cnt = conn.execute(
            "SELECT COUNT(*) FROM appointment_slots WHERE doctor_id = ? AND state = 'OPEN'", (did,)
        ).fetchone()[0]
        if open_cnt == 0:
            for idx, (day_off, hr) in enumerate(((1, 4), (1, 11), (2, 5))):
                conn.execute(
                    """
                    INSERT OR IGNORE INTO appointment_slots (id, doctor_id, start_utc, end_utc, modality, capacity, reserved_count, state)
                    VALUES (?, ?, ?, ?, 'ONLINE_DEMO', 1, 0, 'OPEN')
                    """,
                    (f"slot-{did}-{idx}", did, _slot_iso(day_off, hr, 0), _slot_iso(day_off, hr, 20)),
                )

    # Expand diagnostic_tests to 12 realistic Bangladesh pathology & imaging panels
    extra_tests = [
        ("diag-cbc", "CBC-01", "সিবিসি ও রক্তের সাধারণ পরীক্ষা (ডেমো)", "Complete Blood Count (CBC)", "Hematology", "Whole Blood (Home Collect)", 45000, 12),
        ("diag-fbg", "FBG-02", "ফাস্টিং ব্লাড গ্লুকোজ ও HbA1c (ডেমো)", "Fasting Glucose + HbA1c Panel", "Metabolic", "Serum / EDTA (Home Collect)", 85000, 18),
        ("diag-pcos", "PCOS-03", "হরমোন ও পিসিওএস স্ক্রিনিং প্যানেল (ডেমো)", "Endocrine Hormone Panel (LH/FSH/TSH)", "Endocrinology", "Serum (Home Collect)", 180000, 24),
        ("diag-usg", "USG-04", "পেলভিক আল্ট্রাসাউন্ড (ডেমো বুকিং)", "Pelvic / Ovarian Ultrasound", "Imaging", "Lab Imaging Visit", 120000, 6),
        ("diag-thyroid", "THY-05", "থাইরয়েড প্রোফাইল (TSH, FT3, FT4)", "Thyroid Function Panel (TSH, FT3, FT4)", "Endocrinology", "Serum (Home Collect)", 110000, 16),
        ("diag-lipid", "LIP-06", "লিপিড প্রোফাইল ও কোলেস্টেরল প্যানেল", "Full Lipid Profile (Cholesterol/LDL/HDL/TG)", "Cardiology", "Fasting Serum (Home Collect)", 95000, 14),
        ("diag-dengue", "DEN-07", "ডেঙ্গু NS1 অ্যান্টিজেন + IgM/IgG প্যানেল", "Dengue NS1 Antigen + IgM/IgG Combo", "Infectious", "Serum (Urgent Home Collect)", 90000, 4),
        ("diag-lft", "LFT-08", "লিভার ফাংশন টেস্ট (SGPT, SGOT, Bilirubin)", "Liver Function Test (LFT Complete)", "Internal Medicine", "Serum (Home Collect)", 80000, 12),
        ("diag-rft", "RFT-09", "কিডনি ও ক্রিয়েটিনিন প্যানেল (Serum Creatinine)", "Renal Function & Serum Creatinine", "Nephrology", "Serum (Home Collect)", 65000, 12),
        ("diag-vitd", "VTD-10", "ভিটামিন ডি-৩ (25-OH Vitamin D)", "25-Hydroxy Vitamin D3 Assay", "Nutrition", "Serum (Home Collect)", 160000, 24),
        ("diag-urine", "URN-11", "প্রস্রাবের রুটিন পরীক্ষা (Urine R/M/E)", "Urine Routine & Microscopic Examination", "Pathology", "Urine Container (Home Collect)", 25000, 6),
        ("diag-ecg", "ECG-12", "১২-লিড ইসিজি ও ট্রপোনিন-I স্ক্রিনিং", "12-Lead ECG + Cardiac Screening", "Cardiology", "Clinic / Home Nurse Visit", 140000, 3),
    ]
    for tid, code, bn, en, cat, smp, fee, hrs in extra_tests:
        conn.execute(
            "INSERT OR IGNORE INTO diagnostic_tests (id, code, name_bn, name_en, category, sample_type, fee_minor_poisha, turnaround_hours) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (tid, code, bn, en, cat, smp, fee, hrs),
        )


def seed_database(db_path: Path | None = None, force_reset: bool = False) -> dict:
    target = db_path
    if force_reset and target and target.exists():
        target.unlink()
    apply_schema(target)

    with get_db_conn(target) as conn:
        now = utc_now_iso()
        existing = conn.execute("SELECT COUNT(*) FROM users WHERE is_synthetic = 1").fetchone()[0]
        if existing > 0 and not force_reset:
            conn.execute("BEGIN IMMEDIATE;")
            try:
                _seed_blood_and_journal(conn, now)
                _seed_ai_feature_flags(conn, now)
                _seed_expanded_doctors_and_catalog(conn, now)
                conn.execute("COMMIT;")
            except Exception:
                conn.execute("ROLLBACK;")
                raise
            return {"seeded": False, "reason": "Base synthetic records present; ensured Blood Connect, Journal, AI flags & 43-doctor catalog."}

        conn.execute("BEGIN IMMEDIATE;")
        try:
            if force_reset:
                # Clear dependent tables safely in reverse order
                for tbl in [
                    "ai_runtime_snapshots", "ocr_job_artifacts", "ai_feedback", "ai_message_citations",
                    "ai_chat_messages", "ai_chat_sessions", "ai_asr_jobs", "ai_voice_consents",
                    "rag_ingestion_jobs", "rag_chunks", "rag_source_versions", "rag_sources",
                    "ai_inference_drafts",
                    "journal_sync_runs", "journal_items", "blood_match_logs", "blood_requests", "blood_donors",
                    "audit_logs", "notifications", "feature_flags", "diagnostic_demo_orders", "diagnostic_tests",
                    "healthcare_plans", "facilities", "pediatric_vaccine_records", "pediatric_intake_cases",
                    "pcos_cycle_entries", "medication_events", "medication_plans", "ocr_fields", "ocr_jobs",
                    "medical_documents", "ticket_events", "support_messages", "support_tickets",
                    "demo_receipts", "demo_payment_events", "demo_payments", "eprescriptions",
                    "consultation_notes", "appointment_events", "appointments", "appointment_slots",
                    "doctor_time_off", "doctor_availability_rules", "specialties", "doctor_verification_events",
                    "doctor_profiles", "profile_access", "patient_profiles", "role_memberships", "sessions", "users"
                ]:
                    conn.execute(f"DELETE FROM {tbl};")

            now = utc_now_iso()

            # 1. Users & Role Memberships
            for _, (uid, email, raw_pw, phone, name, role) in DEMO_ACCOUNTS.items():
                pw_hash = hash_password(raw_pw)
                conn.execute(
                    """
                    INSERT OR IGNORE INTO users (id, email, phone, password_hash, full_name, primary_role, preferred_locale, account_status, is_synthetic, created_at_utc, updated_at_utc)
                    VALUES (?, ?, ?, ?, ?, ?, 'bn', 'ACTIVE', 1, ?, ?)
                    """,
                    (uid, email, phone, pw_hash, name, role, now, now),
                )
                app_state = "PENDING" if uid == "usr-dr-pending" else "APPROVED"
                conn.execute(
                    """
                    INSERT OR IGNORE INTO role_memberships (id, user_id, role, organization_id, approval_state, created_at_utc)
                    VALUES (?, ?, ?, NULL, ?, ?)
                    """,
                    (f"rm-{uid}", uid, role, app_state, now),
                )

            # 2. Patient & Dependent Profiles
            conn.execute(
                """
                INSERT OR IGNORE INTO patient_profiles (id, owner_user_id, display_name, relationship_type, date_of_birth, sex, blood_group, district, phone_contact, emergency_contact, preferred_locale, is_synthetic)
                VALUES
                  ('pp-rahima-self', 'usr-pt-demo', 'রহিমা বেগম (Rahima Begum)', 'SELF', '1996-05-14', 'FEMALE', 'O+', 'Dhaka', '+8801711000101', '+8801811000999', 'bn', 1),
                  ('pp-ariyan-child', 'usr-pt-demo', 'আরিয়ান হাসান (Ariyan - Child)', 'CHILD', '2021-08-22', 'MALE', 'O+', 'Dhaka', '+8801711000101', '+8801811000999', 'bn', 1),
                  ('pp-sakib-self', 'usr-pt-demo2', 'সাকিব হাসান (Sakib Hasan)', 'SELF', '1993-02-10', 'MALE', 'B+', 'Dhaka', '+8801711000109', '+8801811000888', 'bn', 1)
                """
            )

            # 3. Specialties
            specialties = [
                ("spec-gyn", "gynecology-pcos", "স্ত্রীরোগ ও পিসিওএস", "Gynecology & PCOS", 30000, 150000),
                ("spec-ped", "pediatrics", "শিশু ও নবজাতক রোগ", "Pediatrics & Child Care", 30000, 150000),
                ("spec-derm", "dermatology", "চর্ম ও ভাইরাল র‍্যাশ", "Dermatology & Skin Care", 30000, 150000),
                ("spec-med", "internal-medicine", "জেনারেল ও ইন্টারনাল মেডিসিন", "Internal Medicine", 20000, 120000),
                ("spec-card", "cardiology", "হৃদরোগ ও রক্তচাপ", "Cardiology", 50000, 200000),
            ]
            for sid, slug, bn, en, mn, mx in specialties:
                conn.execute(
                    "INSERT OR IGNORE INTO specialties (id, slug, name_bn, name_en, min_fee_minor_poisha, max_fee_minor_poisha) VALUES (?, ?, ?, ?, ?, ?)",
                    (sid, slug, bn, en, mn, mx),
                )

            # 4. Doctor Profiles (3 APPROVED + 1 PENDING)
            doctors = [
                (
                    "doc-farhana", "usr-dr-farhana", "Dr. Farhana Rahman (Demo)", "ডাঃ ফারহানা রহমান (ডেমো)",
                    "MBBS, FCPS (OB-GYN)", "Gynecology & PCOS", "BMDC-DEMO-44102",
                    "Dhanmondi Care Hub (Demo)", "Dhaka", 11, "bn,en",
                    "pcos,irregular periods,hormone,gynecology,ultrasound,women", "BOTH", 1,
                    "Fictional demo clinician focusing on menstrual health, PCOS tracking, and maternal follow-ups.",
                    "পিসিওএস, অনিয়মিত পিরিয়ড ও প্রসূতি পরামর্শের কাল্পনিক ডেমো চিকিৎসক।",
                    50000, 25000, 20, "APPROVED",
                ),
                (
                    "doc-tanvir", "usr-dr-tanvir", "Dr. Tanvir Ahmed (Demo)", "ডাঃ তানভীর আহমেদ (ডেমো)",
                    "MBBS, DCH, MD (Pediatrics)", "Pediatrics & Child Care", "BMDC-DEMO-55218",
                    "Uttara Family Clinic (Demo)", "Dhaka", 9, "bn,en",
                    "child fever,rash,pediatric,vaccine,cough,dehydration", "BOTH", 1,
                    "Fictional demo pediatrician covering childhood fever, immunization schedules, and rash triage.",
                    "শিশুর জ্বর, র‍্যাশ ও টিকা রুটিন পর্যালোচনার কাল্পনিক ডেমো শিশু বিশেষজ্ঞ।",
                    60000, 30000, 20, "APPROVED",
                ),
                (
                    "doc-nusrat", "usr-dr-nusrat", "Dr. Nusrat Jahan (Demo)", "ডাঃ নুসরাত জাহান (ডেমো)",
                    "MBBS, DDV (Dermatology)", "Dermatology & Skin Care", "BMDC-DEMO-61905",
                    "Agrabad Skin Point (Demo)", "Chattogram", 8, "bn,en",
                    "skin rash,blisters,chickenpox,measles,allergy,itching", "ONLINE_DEMO", 1,
                    "Fictional demo dermatologist for vesicular skin lesions, rash review, and non-diagnostic triage.",
                    "ত্বকের র‍্যাশ ও ফুসকুড়ি পরামর্শের কাল্পনিক ডেমো চর্ম বিশেষজ্ঞ।",
                    70000, 35000, 20, "APPROVED",
                ),
                (
                    "doc-kamal-pending", "usr-dr-pending", "Dr. Kamal Hossain (Pending Demo)", "ডাঃ কামাল হোসেন (অনুমোদন বাকি)",
                    "MBBS, BCS (Health)", "Internal Medicine", "BMDC-DEMO-90112",
                    "Rajshahi General Demo Desk", "Rajshahi", 5, "bn,en",
                    "fever,diabetes,blood pressure,medicine", "ONLINE_DEMO", 0,
                    "Pending doctor application awaiting Admin verification before clinical schedule unlocks.",
                    "অ্যাডমিন অনুমোদনের অপেক্ষায় থাকা চিকিৎসক আবেদন।",
                    40000, 20000, 20, "PENDING",
                ),
            ]
            for row in doctors:
                conn.execute(
                    """
                    INSERT OR IGNORE INTO doctor_profiles (
                        id, user_id, display_name, display_name_bn, degrees, specialty, bmdc_demo_reg,
                        practice_location, district, experience_years, languages_csv, symptom_tags_csv,
                        consultation_modality, is_online_now, bio, bio_bn,
                        consultation_fee_minor_poisha, followup_fee_minor_poisha, slot_duration_minutes, verification_status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    row,
                )

            conn.execute(
                """
                INSERT OR IGNORE INTO doctor_verification_events (id, doctor_profile_id, reviewer_admin_id, from_status, to_status, reason)
                VALUES
                  ('dve-1', 'doc-farhana', 'usr-ad-demo', 'PENDING', 'APPROVED', 'Initial synthetic verified demo fixture'),
                  ('dve-2', 'doc-tanvir', 'usr-ad-demo', 'PENDING', 'APPROVED', 'Initial synthetic verified demo fixture'),
                  ('dve-3', 'doc-nusrat', 'usr-ad-demo', 'PENDING', 'APPROVED', 'Initial synthetic verified demo fixture'),
                  ('dve-4', 'doc-kamal-pending', NULL, NULL, 'PENDING', 'Application submitted awaiting admin verification')
                """
            )

            # 5. Weekly Availability & Open Future Appointment Slots
            for doc_id in ("doc-farhana", "doc-tanvir", "doc-nusrat"):
                for wd in (0, 1, 2, 3, 4):
                    conn.execute(
                        """
                        INSERT OR IGNORE INTO doctor_availability_rules (id, doctor_id, weekday, start_local_hhmm, end_local_hhmm, break_start_hhmm, break_end_hhmm, slot_duration_minutes, effective_from_date)
                        VALUES (?, ?, ?, '09:00', '17:00', '13:00', '14:00', 20, '2026-11-01')
                        """,
                        (f"dar-{doc_id}-{wd}", doc_id, wd),
                    )
                for day_offset in (1, 2, 3):
                    for idx, hr in enumerate((4, 5, 10)):  # 10:00 AM, 11:00 AM, 4:00 PM Asia/Dhaka
                        s_utc = _slot_iso(day_offset, hr, 0)
                        e_utc = _slot_iso(day_offset, hr, 20)
                        conn.execute(
                            """
                            INSERT OR IGNORE INTO appointment_slots (id, doctor_id, start_utc, end_utc, modality, capacity, reserved_count, state)
                            VALUES (?, ?, ?, ?, 'ONLINE_DEMO', 1, 0, 'OPEN')
                            """,
                            (f"slot-{doc_id}-d{day_offset}-{idx}", doc_id, s_utc, e_utc),
                        )

            # Past slots for seeded historical completed appointments
            past_start = "2026-11-17T04:00:00.000Z"
            past_end = "2026-11-17T04:20:00.000Z"
            past_start2 = "2026-11-14T05:00:00.000Z"
            past_end2 = "2026-11-14T05:20:00.000Z"
            past_start3 = "2026-11-10T10:00:00.000Z"
            past_end3 = "2026-11-10T10:20:00.000Z"

            conn.execute(
                """
                INSERT OR IGNORE INTO appointment_slots (id, doctor_id, start_utc, end_utc, modality, capacity, reserved_count, state)
                VALUES
                  ('slot-hist-9001', 'doc-farhana', ?, ?, 'ONLINE_DEMO', 1, 1, 'BOOKED'),
                  ('slot-hist-9002', 'doc-tanvir', ?, ?, 'ONLINE_DEMO', 1, 1, 'BOOKED'),
                  ('slot-hist-9003', 'doc-nusrat', ?, ?, 'ONLINE_DEMO', 1, 1, 'BOOKED')
                """,
                (past_start, past_end, past_start2, past_end2, past_start3, past_end3),
            )

            # 6. Historical Appointments, Rebranded Demo Payments, Receipts, Notes, E-Prescriptions
            conn.execute(
                """
                INSERT OR IGNORE INTO appointments (
                    id, booking_reference, patient_profile_id, booked_by_user_id, doctor_id, slot_id,
                    consultation_mode, status, visit_reason_summary, prep_symptoms_text,
                    fee_minor_poisha, payment_requirement, idempotency_key, is_synthetic
                ) VALUES
                (
                    'apt-hist-9001', 'APT-DEMO-9001', 'pp-rahima-self', 'usr-pt-demo', 'doc-farhana', 'slot-hist-9001',
                    'ONLINE_DEMO', 'COMPLETED', 'PCOS cycle check & prescription follow-up (Synthetic)',
                    'Irregular 38-day cycles and mild fatigue over 2 months.',
                    50000, 'REQUIRED_DEMO', 'seed-idem-apt-9001', 1
                ),
                (
                    'apt-hist-9002', 'APT-DEMO-9002', 'pp-ariyan-child', 'usr-pt-demo', 'doc-tanvir', 'slot-hist-9002',
                    'ONLINE_DEMO', 'COMPLETED', 'Pediatric checkup for toddler mild fever & nasal congestion',
                    'Low-grade fever (100.2 F) and runny nose for 2 days. Normal hydration.',
                    60000, 'REQUIRED_DEMO', 'seed-idem-apt-9002', 1
                ),
                (
                    'apt-hist-9003', 'APT-DEMO-9003', 'pp-rahima-self', 'usr-pt-demo', 'doc-nusrat', 'slot-hist-9003',
                    'ONLINE_DEMO', 'COMPLETED', 'Dermatology consultation for seasonal skin allergy and forearm rash',
                    'Erythematous itchy patch with mild peeling. No blister formation.',
                    70000, 'REQUIRED_DEMO', 'seed-idem-apt-9003', 1
                )
                """
            )
            conn.execute(
                """
                INSERT OR IGNORE INTO appointment_events (id, appointment_id, actor_user_id, actor_role, from_status, to_status, reason)
                VALUES
                  ('ae-hist-1', 'apt-hist-9001', 'usr-dr-farhana', 'DOCTOR', 'IN_CONSULTATION', 'COMPLETED', 'Seeded historical consultation completed'),
                  ('ae-hist-2', 'apt-hist-9002', 'usr-dr-tanvir', 'DOCTOR', 'IN_CONSULTATION', 'COMPLETED', 'Pediatric consultation completed successfully'),
                  ('ae-hist-3', 'apt-hist-9003', 'usr-dr-nusrat', 'DOCTOR', 'IN_CONSULTATION', 'COMPLETED', 'Dermatology consultation completed successfully')
                """
            )
            conn.execute(
                """
                INSERT OR IGNORE INTO demo_payments (id, demo_ref, appointment_id, payer_user_id, method, amount_minor_poisha, status, is_simulated, idempotency_key)
                VALUES
                  ('pay-hist-9001', 'DEMO-SPAY-9001', 'apt-hist-9001', 'usr-pt-demo', 'DEMO_BKASH', 50000, 'DEMO_PAID', 1, 'seed-idem-pay-9001'),
                  ('pay-hist-9002', 'DEMO-DPAY-9002', 'apt-hist-9002', 'usr-pt-demo', 'DEMO_NAGAD', 60000, 'DEMO_PAID', 1, 'seed-idem-pay-9002'),
                  ('pay-hist-9003', 'DEMO-CARD-9003', 'apt-hist-9003', 'usr-pt-demo', 'DEMO_CARD', 70000, 'DEMO_PAID', 1, 'seed-idem-pay-9003')
                """
            )
            conn.execute(
                """
                INSERT OR IGNORE INTO demo_receipts (id, payment_id, receipt_number)
                VALUES
                  ('rcp-hist-9001', 'pay-hist-9001', 'DEMO-RCP-9001'),
                  ('rcp-hist-9002', 'pay-hist-9002', 'DEMO-RCP-9002'),
                  ('rcp-hist-9003', 'pay-hist-9003', 'DEMO-RCP-9003')
                """
            )
            conn.execute(
                """
                INSERT OR IGNORE INTO consultation_notes (
                    id, appointment_id, author_doctor_id, subjective_notes, assessment_summary,
                    advice_summary, followup_instruction, followup_date, state, signed_at_utc
                ) VALUES
                (
                    'cn-hist-9001', 'apt-hist-9001', 'doc-farhana',
                    'Patient logged two irregular cycles (38 days, 41 days). Reviewed cycle chart.',
                    'Clinician review ongoing — recommended structured diet, sleep log & fasting glucose review.',
                    'Maintain cycle log; verify prescribed supplement schedule manually.',
                    'Follow up after 14 days with fasting lipid & glucose panel.', '2026-12-02', 'SIGNED', ?
                ),
                (
                    'cn-hist-9002', 'apt-hist-9002', 'doc-tanvir',
                    'Mother reports 2-day low-grade fever (100.2 F) and runny nose in toddler Ariyan. Eating well, alert.',
                    'Mild acute viral rhinitis / common cold. No chest retractions or red flags observed.',
                    'Keep child well-hydrated, continue home meals, use paracetamol syrup only if temperature > 100°F.',
                    'Follow up in 5 days if fever persists or child becomes lethargic.', '2026-11-20', 'SIGNED', ?
                ),
                (
                    'cn-hist-9003', 'apt-hist-9003', 'doc-nusrat',
                    'Erythematous pruritic maculopapular rash on left forearm for 4 days. Contact with detergent suspected.',
                    'Mild localized contact dermatitis. No systemic rash or mucosal involvement.',
                    'Avoid harsh detergents; apply topical hydrocortisone sparingly; take oral antihistamine at bedtime.',
                    'Follow up in 7 days if itching or lesion does not resolve.', '2026-11-18', 'SIGNED', ?
                )
                """,
                (now, now, now),
            )
            meds_demo_farhana = json.dumps([
                {"name": "Tab. Metformin 500mg (Demo)", "dose": "1 tablet", "frequency": "0+0+1 After Dinner", "duration": "14 days"},
                {"name": "Tab. Myo-Inositol + Folate (Demo)", "dose": "1 sachet", "frequency": "1+0+0 After Breakfast", "duration": "30 days"},
                {"name": "Cap. Seclo 20mg (Omeprazole)", "dose": "1 capsule", "frequency": "1+0+0 Before Breakfast", "duration": "14 days"},
            ])
            meds_demo_tanvir = json.dumps([
                {"name": "Syr. Paracetamol 120mg/5ml (Demo)", "dose": "1 teaspoonful (5ml)", "frequency": "3 times daily if fever > 100°F", "duration": "3 days"},
                {"name": "Normal Saline 0.9% Nasal Drops", "dose": "2 drops each nostril", "frequency": "Before nap & sleep", "duration": "5 days"},
            ])
            meds_demo_nusrat = json.dumps([
                {"name": "Tab. Fexofenadine 120mg (Demo)", "dose": "1 tablet", "frequency": "0+0+1 At Bedtime", "duration": "7 days"},
                {"name": "Hydrocortisone 1% Topical Cream", "dose": "Thin layer on affected skin", "frequency": "Twice daily after wash", "duration": "5 days"},
            ])
            conn.execute(
                """
                INSERT OR IGNORE INTO eprescriptions (
                    id, rx_reference, appointment_id, doctor_id, patient_profile_id,
                    diagnosis_summary, medications_json, advice_notes, followup_date,
                    status, signed_by_user_id, signed_at_utc, is_simulated
                ) VALUES
                (
                    'rx-hist-9001', 'DEMO-RX-9001', 'apt-hist-9001', 'doc-farhana', 'pp-rahima-self',
                    'PCOS cycle irregularity & insulin resistance monitoring (Clinician Reviewed Demo)', ?,
                    'Regular 30-min walking, reduce refined carbohydrates, drink 2.5L water daily.', '2026-12-02',
                    'SIGNED', 'usr-dr-farhana', ?, 1
                ),
                (
                    'rx-hist-9002', 'DEMO-RX-9002', 'apt-hist-9002', 'doc-tanvir', 'pp-ariyan-child',
                    'Acute Viral Rhinitis & Toddler Fever (Clinician Reviewed Demo)', ?,
                    'Ensure frequent fluids, tepid sponging if warm, monitor for fast breathing or lethargy.', '2026-11-20',
                    'SIGNED', 'usr-dr-tanvir', ?, 1
                ),
                (
                    'rx-hist-9003', 'DEMO-RX-9003', 'apt-hist-9003', 'doc-nusrat', 'pp-rahima-self',
                    'Localized Contact Dermatitis & Allergic Skin Rash (Clinician Reviewed Demo)', ?,
                    'Wear loose cotton clothing, avoid harsh soaps, do not scratch or apply hot compresses.', '2026-11-18',
                    'SIGNED', 'usr-dr-nusrat', ?, 1
                )
                """,
                (meds_demo_farhana, now, meds_demo_tanvir, now, meds_demo_nusrat, now),
            )

            # 7. Seed Safe OCR Draft (Unverified — blocked from medication schedule until user verifies!)
            conn.execute(
                """
                INSERT OR IGNORE INTO medical_documents (id, patient_profile_id, uploaded_by_user_id, doc_type, original_filename, storage_object_key, mime_type, byte_size, sha256_hash, is_synthetic)
                VALUES ('doc-ocr-0052', 'pp-rahima-self', 'usr-pt-demo', 'PRESCRIPTION', 'sample_bilingual_0052.jpg', 'vault/synth/0052.jpg', 'image/jpeg', 142800, 'demo-sha256-0052', 1)
                """
            )
            conn.execute(
                """
                INSERT OR IGNORE INTO ocr_jobs (id, document_id, engine_version, status, mean_confidence, elapsed_ms)
                VALUES ('ocr-job-0052', 'doc-ocr-0052', 'easyocr-bn-en-v1', 'NEEDS_REVIEW', 0.68, 820)
                """
            )
            ocr_seed_fields = [
                ("ocrf-1", "ocr-job-0052", 0, "MEDICINE_NAME", "Tab. Napa Extra (500+65mg)", 0.91, 1, 0),
                ("ocrf-2", "ocr-job-0052", 0, "DOSE", "1+0+1 (খাওয়ার পর)", 0.64, 1, 0),
                ("ocrf-3", "ocr-job-0052", 0, "FREQUENCY", "Twice daily x 5 days", 0.59, 1, 0),
                ("ocrf-4", "ocr-job-0052", 1, "MEDICINE_NAME", "Cap. Seclo 20mg", 0.88, 1, 0),
                ("ocrf-5", "ocr-job-0052", 1, "DOSE", "1+0+0 (Before breakfast)", 0.52, 1, 0),
                ("ocrf-6", "ocr-job-0052", 1, "FREQUENCY", "Once daily x 14 days", 0.67, 1, 0),
            ]
            for fid, jid, gidx, ftype, raw_txt, conf, crit, ver in ocr_seed_fields:
                conn.execute(
                    """
                    INSERT OR IGNORE INTO ocr_fields (id, ocr_job_id, group_index, field_type, raw_ocr_text, confidence, is_critical, is_verified)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (fid, jid, gidx, ftype, raw_txt, conf, crit, ver),
                )

            # Verified medication plans & events for Rahima & Ariyan
            conn.execute(
                """
                INSERT OR IGNORE INTO medication_plans (id, patient_profile_id, source_document_id, medicine_name, strength_text, dose_text, frequency_rule, status, verified_by_user_id)
                VALUES
                  ('medp-1', 'pp-rahima-self', 'doc-ocr-0052', 'Vitamin D3 (Cholecalciferol)', '2000 IU', '1 capsule', '1+0+0 After Breakfast', 'ACTIVE', 'usr-pt-demo'),
                  ('medp-2', 'pp-rahima-self', 'doc-ocr-0052', 'Tab. Metformin 500mg (Demo)', '500 mg', '1 tablet', '0+0+1 After Dinner', 'ACTIVE', 'usr-pt-demo'),
                  ('medp-3', 'pp-rahima-self', 'doc-ocr-0052', 'Tab. Myo-Inositol + Folate (Demo)', '2000 mg', '1 sachet', '1+0+0 After Breakfast', 'ACTIVE', 'usr-pt-demo'),
                  ('medp-4', 'pp-rahima-self', 'doc-ocr-0052', 'Cap. Seclo 20mg (Omeprazole)', '20 mg', '1 capsule', '1+0+0 30 mins Before Breakfast', 'ACTIVE', 'usr-pt-demo'),
                  ('medp-5', 'pp-rahima-self', 'doc-ocr-0052', 'Tab. Fexofenadine 120mg (Demo)', '120 mg', '1 tablet', '0+0+1 At Bedtime', 'COMPLETED', 'usr-pt-demo'),
                  ('medp-6', 'pp-ariyan-child', 'doc-ocr-0052', 'Syr. Paracetamol 120mg/5ml (Demo)', '120mg/5ml', '1 teaspoonful', '3 times daily if fever > 100°F', 'COMPLETED', 'usr-pt-demo')
                """
            )
            conn.execute(
                """
                INSERT OR IGNORE INTO medication_events (id, plan_id, due_utc, notification_status, action_status)
                VALUES
                  ('mede-1', 'medp-1', ?, 'DELIVERED', 'UNACKNOWLEDGED'),
                  ('mede-2', 'medp-2', ?, 'DELIVERED', 'ACKNOWLEDGED'),
                  ('mede-3', 'medp-3', ?, 'DELIVERED', 'ACKNOWLEDGED'),
                  ('mede-4', 'medp-4', ?, 'DELIVERED', 'UNACKNOWLEDGED')
                """,
                (_slot_iso(0, 3, 0), _slot_iso(0, 13, 0), _slot_iso(0, 2, 30), _slot_iso(0, 1, 30)),
            )

            # 8. PCOS Cycles & Pediatric Vaccines
            conn.execute(
                """
                INSERT OR IGNORE INTO pcos_cycle_entries (id, patient_profile_id, start_date, end_date, cycle_length_days, symptoms_json, user_notes)
                VALUES
                  ('pcos-1', 'pp-rahima-self', '2026-10-08', '2026-10-13', 38, '{"fatigue": true, "acne": false, "cramp_level": 2}', 'Logged by user prior to consultation'),
                  ('pcos-2', 'pp-rahima-self', '2026-11-15', '2026-11-19', 38, '{"fatigue": true, "acne": true, "cramp_level": 3}', 'Cycle started late')
                """
            )
            conn.execute(
                """
                INSERT OR IGNORE INTO pediatric_vaccine_records (id, child_profile_id, vaccine_name, dose_label, due_date, administered_date, status)
                VALUES
                  ('vac-1', 'pp-ariyan-child', 'Pentavalent (DTP-HepB-Hib)', 'Dose 3', '2022-02-15', '2022-02-18', 'COMPLETED'),
                  ('vac-2', 'pp-ariyan-child', 'MR / Measles-Rubella Booster', 'Booster', '2026-12-01', NULL, 'UPCOMING')
                """
            )

            # 9. DocTime Catalogs: Diagnostic Tests, Healthcare Plans, Facilities
            diag_tests = [
                ("diag-cbc", "CBC-01", "সিবিসি ও রক্তের সাধারণ পরীক্ষা (ডেমো)", "Complete Blood Count (CBC)", "Hematology", "Whole Blood", 45000, 12),
                ("diag-fbg", "FBG-02", "ফাস্টিং ব্লাড গ্লুকোজ ও HbA1c (ডেমো)", "Fasting Glucose + HbA1c Panel", "Metabolic", "Serum / EDTA", 85000, 18),
                ("diag-pcos", "PCOS-03", "হরমোন ও পিসিওএস স্ক্রিনিং প্যানেল (ডেমো)", "Endocrine Hormone Panel (LH/FSH/TSH)", "Endocrinology", "Serum", 180000, 24),
                ("diag-usg", "USG-04", "পেলভিক আল্ট্রাসাউন্ড (ডেমো বুকিং)", "Pelvic / Ovarian Ultrasound", "Imaging", "Imaging Visit", 120000, 6),
            ]
            for tid, code, bn, en, cat, smp, fee, hrs in diag_tests:
                conn.execute(
                    "INSERT OR IGNORE INTO diagnostic_tests (id, code, name_bn, name_en, category, sample_type, fee_minor_poisha, turnaround_hours) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (tid, code, bn, en, cat, smp, fee, hrs),
                )

            plans = [
                ("plan-basic", "CARE-INDIVIDUAL", "স্বাস্থ্যসেতু কেয়ার (একক — ডেমো)", "ShasthoSetu Care Individual (Demo)", "মাসিক ২টি অনলাইন ডেমো পরামর্শ ও সম্পূর্ণ স্বাস্থ্য রেকর্ড ভল্ট।", "2 demo consultations/month plus encrypted local PHR & OCR review.", 29900, 1, '["2 Demo Consults/mo","OCR Safe Vault","Bilingual Care Log"]'),
                ("plan-family", "CARE-FAMILY-4", "পরিবার সুরক্ষা প্যাক (৪ সদস্য — ডেমো)", "Family Care Pack (Up to 4 — Demo)", "মা-বাবা ও শিশুসহ ৪ জন সদস্যের সমন্বিত টিকা, পিসিওএস ও পরামর্শ ট্র্যাকিং।", "Up to 4 family profiles including child vaccine alerts and caregiver grants.", 69900, 4, '["4 Family Profiles","Caregiver Consent Grants","Priority Demo Support"]'),
                ("plan-maternal", "PCOS-PEDIATRIC", "মা ও শিশু স্পেশাল (ডেমো)", "Maternal, PCOS & Pediatric Care (Demo)", "পিসিওএস ট্র্যাকিং, শিশু জরুরি লাল-সংকেত নিয়ম এবং ফলো-আপ রিমাইন্ডার।", "Dedicated PCOS cycle prep + deterministic pediatric red-flag triage.", 49900, 3, '["PCOS Tracker","Pediatric Triage Rules","20% Demo Lab Waiver"]'),
            ]
            for pid, code, nbn, nen, dbn, den, fee, mf, feats in plans:
                conn.execute(
                    "INSERT OR IGNORE INTO healthcare_plans (id, code, name_bn, name_en, description_bn, description_en, monthly_fee_minor_poisha, max_family_members, features_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (pid, code, nbn, nen, dbn, den, fee, mf, feats),
                )

            facs = [
                ("fac-dmch", "Dhaka Medical College Hospital (Reference Directory)", "HOSPITAL", "Dhaka", "Secretariat Road, Ramna, Dhaka 1000", 23.7259, 90.3976, "Emergency Dept (Public Dir)", "2026-11-10"),
                ("fac-icddrb", "icddr,b Mohakhali Hospital (Reference Directory)", "HOSPITAL", "Dhaka", "68 Shaheed Tajuddin Ahmed Sarani, Mohakhali", 23.7776, 90.4004, "+880-2-222277001", "2026-11-10"),
                ("fac-dhanmondi", "Popular Diagnostic Centre Dhanmondi (Directory Sample)", "DIAGNOSTIC", "Dhaka", "House 16, Road 2, Dhanmondi, Dhaka", 23.7393, 90.3821, "Unknown / Verify Locally", "2026-11-10"),
                ("fac-lazz", "Lazz Pharma Kalabagan (24h Reference Entry)", "PHARMACY", "Dhaka", "Mirpur Road, Kalabagan, Dhaka", 23.7484, 90.3812, "Unknown / Verify Locally", "2026-11-10"),
                ("fac-cmch", "Chattogram Medical College Hospital (Directory)", "HOSPITAL", "Chattogram", "K.B. Fazlul Kader Road, Chattogram", 22.3596, 91.8305, "Public Directory", "2026-11-10"),
                ("fac-rmch", "Rajshahi Medical College Hospital (Directory)", "HOSPITAL", "Rajshahi", "Laxmipur, Rajshahi", 24.3718, 88.5806, "Public Directory", "2026-11-10"),
                ("fac-somch", "Sylhet MAG Osmani Medical College Hospital (Directory)", "HOSPITAL", "Sylhet", "Medical College Road, Sylhet", 24.9016, 91.8533, "Public Directory / Verify Locally", "2026-11-10"),
                ("fac-kmch", "Khulna Medical College Hospital (Directory)", "HOSPITAL", "Khulna", "Boyra, Khulna 9000", 22.8286, 89.5382, "Public Directory / Verify Locally", "2026-11-10"),
                ("fac-sbmch", "Sher-e-Bangla Medical College Hospital (Directory)", "HOSPITAL", "Barishal", "Band Road, Barishal 8200", 22.6865, 90.3612, "Public Directory / Verify Locally", "2026-11-10"),
                ("fac-rpmch", "Rangpur Medical College Hospital (Directory)", "HOSPITAL", "Rangpur", "Medical East Gate, Rangpur 5400", 25.7647, 89.2336, "Public Directory / Verify Locally", "2026-11-10"),
                ("fac-mmch", "Mymensingh Medical College Hospital (Directory)", "HOSPITAL", "Mymensingh", "Charpara, Mymensingh 2200", 24.7421, 90.4094, "Public Directory / Verify Locally", "2026-11-10"),
                ("fac-ibnsina", "Ibn Sina Diagnostic Dhanmondi (Directory Sample)", "DIAGNOSTIC", "Dhaka", "House 48, Road 9/A, Satmasjid Road, Dhaka", 23.7458, 90.3716, "Public Directory / Verify Locally", "2026-11-10"),
            ]
            for frow in facs:
                conn.execute(
                    "INSERT OR IGNORE INTO facilities (id, name, facility_type, district, address, latitude, longitude, phone, last_verified_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    frow,
                )

            # 10. Multi-Role Support Ticket Fixtures (Zero-PHI)
            conn.execute(
                """
                INSERT OR IGNORE INTO support_tickets (id, ticket_number, requester_user_id, category, priority, status, assignee_support_user_id, related_appointment_id, related_demo_payment_id, subject)
                VALUES
                  ('tkt-401', 'TKT-DEMO-401', 'usr-pt-demo', 'DEMO_PAYMENT', 'NORMAL', 'RESOLVED', 'usr-sup-demo', 'apt-hist-9001', 'pay-hist-9001', 'Need confirmation receipt PDF link for APT-DEMO-9001'),
                  ('tkt-402', 'TKT-DEMO-402', 'usr-dr-farhana', 'DOCTOR_APPOINTMENT', 'NORMAL', 'IN_PROGRESS', 'usr-sup-demo', NULL, NULL, 'Update evening telemedicine consultation slot schedule'),
                  ('tkt-403', 'TKT-DEMO-403', 'usr-pt-demo', 'GENERAL', 'NORMAL', 'IN_PROGRESS', 'usr-sup-demo', NULL, NULL, 'Ariyan child vaccination reminder schedule inquiry'),
                  ('tkt-404', 'TKT-DEMO-404', 'usr-dr-tanvir', 'DOCUMENT_TECHNICAL', 'LOW', 'OPEN', 'usr-sup-demo', NULL, NULL, 'Inquiry regarding pediatric weight-based dosing chart reference')
                """
            )
            conn.execute(
                """
                INSERT OR IGNORE INTO support_messages (id, ticket_id, sender_user_id, sender_role, visibility, body_text)
                VALUES
                  ('sm-1', 'tkt-401', 'usr-pt-demo', 'PATIENT', 'PUBLIC', 'Hello Support, where can I download my DEMO-SPAY-9001 receipt PDF?'),
                  ('sm-2', 'tkt-401', 'usr-sup-demo', 'SUPPORT', 'PUBLIC', 'আপনি পেমেন্ট ও রিসিপ্ট ট্যাব থেকে DEMO-RCP-9001 প্রিন্ট/মেডিকেল PDF ডাউনলোড করতে পারবেন।'),
                  ('sm-3', 'tkt-401', 'usr-sup-demo', 'SUPPORT', 'INTERNAL', 'Verified payment status DEMO_PAID without accessing patient clinical records.'),
                  ('sm-4', 'tkt-402', 'usr-dr-farhana', 'DOCTOR', 'PUBLIC', 'Hello Support, I need to open 2 additional slots on Sunday evenings for maternal follow-up.'),
                  ('sm-5', 'tkt-402', 'usr-sup-demo', 'SUPPORT', 'PUBLIC', 'ধন্যবাদ ডাঃ ফারহানা। আপনার আবেদন অ্যাডমিন ডেস্কে পাঠানো হয়েছে এবং অনুমোদিত হয়েছে।'),
                  ('sm-6', 'tkt-403', 'usr-pt-demo', 'PATIENT', 'PUBLIC', 'আরিয়ানের পরবর্তী বুস্টার টিকার নোটিফিকেশন কখন আসবে জানতে চাই।'),
                  ('sm-7', 'tkt-403', 'usr-sup-demo', 'SUPPORT', 'PUBLIC', 'আরিয়ানের এমআর বুস্টার টিকা আগামী ডিসেম্বরে নির্ধারিত। নির্ধারিত তারিখের ৩ দিন আগে এসএমএস পাঠানো হবে।'),
                  ('sm-8', 'tkt-404', 'usr-dr-tanvir', 'DOCTOR', 'PUBLIC', 'Can we confirm the pediatric weight-based dosing table sync in the latest update?')
                """
            )

            # 11. Feature Flags (AI-RAG-VOICE-OCR-01 Enabled + Admin Toggleable)
            flags = [
                ("research_pcos_ml_preview", 1, "Read-only research preview for M01 XGBoost PCOS metrics (Non-diagnostic)"),
                ("research_ultrasound_preview", 1, "Read-only research preview for M02 PCOM morphology (Non-diagnostic)"),
                ("research_viral_rash_preview", 1, "Read-only research preview for M03 Grouped ResNet18 (Non-diagnostic)"),
                ("research_ocr_draft_review", 1, "Safe OCR draft review requiring explicit human verification before schedule activation"),
                ("research_dermoped_preview", 1, "Read-only research evaluator preview for M06 EXP_B"),
            ]
            for fk, enb, desc in flags:
                conn.execute(
                    "INSERT OR IGNORE INTO feature_flags (flag_key, enabled, description) VALUES (?, ?, ?)",
                    (fk, enb, desc),
                )
            _seed_ai_feature_flags(conn, now)

            # 12. Real Notifications & Audit Log Seed
            notify_user(
                conn,
                recipient_user_id="usr-pt-demo",
                topic="APPOINTMENT_COMPLETED",
                entity_type="appointment",
                entity_id="apt-hist-9001",
                title_bn="ডাঃ ফারহানা রহমান আপনার পরামর্শ নোট ও ডেমো প্রেসক্রিপশন স্বাক্ষর করেছেন",
                title_en="Dr. Farhana Rahman signed your consultation note & demo e-prescription",
            )
            notify_user(
                conn,
                recipient_user_id="usr-dr-farhana",
                topic="SCHEDULE_ACTIVE",
                entity_type="doctor_profile",
                entity_id="doc-farhana",
                title_bn="আগামী ৩ দিনের ৯টি খোলা অ্যাপয়েন্টমেন্ট স্লট সক্রিয় আছে",
                title_en="9 open appointment slots active over the next 3 days",
            )
            notify_user(
                conn,
                recipient_user_id="usr-ad-demo",
                topic="DOCTOR_PENDING",
                entity_type="doctor_profile",
                entity_id="doc-kamal-pending",
                title_bn="১টি নতুন চিকিৎসক আবেদন অনুমোদনের অপেক্ষায় আছে (ডাঃ কামাল)",
                title_en="1 pending doctor application requires Admin verification (Dr. Kamal)",
            )
            record_audit(
                conn,
                actor_user_id="usr-ad-demo",
                actor_role="ADMIN",
                action_type="SYNTHETIC_SEED_INITIALIZED",
                target_resource="database",
                outcome="SUCCESS",
                details={"synthetic": True},
            )
            _seed_blood_and_journal(conn, now)
            _seed_expanded_doctors_and_catalog(conn, now)

            conn.execute("COMMIT;")
        except Exception:
            conn.execute("ROLLBACK;")
            raise

    try:
        from shasthosetu_api.services.rag_ingestion import seed_curated_corpus
        seed_curated_corpus(force_reindex=False)
    except Exception:
        pass

    return {"seeded": True}


if __name__ == "__main__":
    print(seed_database())
