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


def seed_database(db_path: Path | None = None, force_reset: bool = False) -> dict:
    target = db_path
    if force_reset and target and target.exists():
        target.unlink()
    apply_schema(target)

    with get_db_conn(target) as conn:
        existing = conn.execute("SELECT COUNT(*) FROM users WHERE is_synthetic = 1").fetchone()[0]
        if existing > 0 and not force_reset:
            return {"seeded": False, "reason": "Synthetic demo records already present."}

        conn.execute("BEGIN IMMEDIATE;")
        try:
            if force_reset:
                # Clear dependent tables safely in reverse order
                for tbl in [
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

            # Past slot for seeded historical completed appointment
            past_start = "2026-11-17T04:00:00.000Z"
            past_end = "2026-11-17T04:20:00.000Z"
            conn.execute(
                """
                INSERT OR IGNORE INTO appointment_slots (id, doctor_id, start_utc, end_utc, modality, capacity, reserved_count, state)
                VALUES ('slot-hist-9001', 'doc-farhana', ?, ?, 'ONLINE_DEMO', 1, 1, 'BOOKED')
                """,
                (past_start, past_end),
            )

            # 6. Historical Appointment, Demo Payment, Receipt, Note, E-Prescription
            conn.execute(
                """
                INSERT OR IGNORE INTO appointments (
                    id, booking_reference, patient_profile_id, booked_by_user_id, doctor_id, slot_id,
                    consultation_mode, status, visit_reason_summary, prep_symptoms_text,
                    fee_minor_poisha, payment_requirement, idempotency_key, is_synthetic
                ) VALUES (
                    'apt-hist-9001', 'APT-DEMO-9001', 'pp-rahima-self', 'usr-pt-demo', 'doc-farhana', 'slot-hist-9001',
                    'ONLINE_DEMO', 'COMPLETED', 'PCOS cycle check & prescription follow-up (Synthetic)',
                    'Irregular 38-day cycles and mild fatigue over 2 months.',
                    50000, 'REQUIRED_DEMO', 'seed-idem-apt-9001', 1
                )
                """
            )
            conn.execute(
                """
                INSERT OR IGNORE INTO appointment_events (id, appointment_id, actor_user_id, actor_role, from_status, to_status, reason)
                VALUES ('ae-hist-1', 'apt-hist-9001', 'usr-dr-farhana', 'DOCTOR', 'IN_CONSULTATION', 'COMPLETED', 'Seeded historical consultation completed')
                """
            )
            conn.execute(
                """
                INSERT OR IGNORE INTO demo_payments (id, demo_ref, appointment_id, payer_user_id, method, amount_minor_poisha, status, is_simulated, idempotency_key)
                VALUES ('pay-hist-9001', 'DEMO-BKASH-9001', 'apt-hist-9001', 'usr-pt-demo', 'DEMO_BKASH', 50000, 'DEMO_PAID', 1, 'seed-idem-pay-9001')
                """
            )
            conn.execute(
                """
                INSERT OR IGNORE INTO demo_receipts (id, payment_id, receipt_number)
                VALUES ('rcp-hist-9001', 'pay-hist-9001', 'DEMO-RCP-9001')
                """
            )
            conn.execute(
                """
                INSERT OR IGNORE INTO consultation_notes (
                    id, appointment_id, author_doctor_id, subjective_notes, assessment_summary,
                    advice_summary, followup_instruction, followup_date, state, signed_at_utc
                ) VALUES (
                    'cn-hist-9001', 'apt-hist-9001', 'doc-farhana',
                    'Patient logged two irregular cycles (38 days, 41 days). Reviewed cycle chart.',
                    'Clinician review ongoing — recommended structured diet, sleep log & fasting glucose review.',
                    'Maintain cycle log; verify prescribed supplement schedule manually.',
                    'Follow up after 14 days with fasting lipid & glucose panel.', '2026-12-02', 'SIGNED', ?
                )
                """,
                (now,),
            )
            meds_demo = json.dumps([
                {"name": "Tab. Metformin 500mg (Demo)", "dose": "1 tablet", "frequency": "0+0+1 After Dinner", "duration": "14 days"},
                {"name": "Tab. Myo-Inositol + Folate (Demo)", "dose": "1 sachet", "frequency": "1+0+0 After Breakfast", "duration": "30 days"},
            ])
            conn.execute(
                """
                INSERT OR IGNORE INTO eprescriptions (
                    id, rx_reference, appointment_id, doctor_id, patient_profile_id,
                    diagnosis_summary, medications_json, advice_notes, followup_date,
                    status, signed_by_user_id, signed_at_utc, is_simulated
                ) VALUES (
                    'rx-hist-9001', 'DEMO-RX-9001', 'apt-hist-9001', 'doc-farhana', 'pp-rahima-self',
                    'Cycle irregularity monitoring (Clinician Reviewed Demo)', ?,
                    'Always confirm dose labels carefully; not a valid legal pharmacy slip.', '2026-12-02',
                    'SIGNED', 'usr-dr-farhana', ?, 1
                )
                """,
                (meds_demo, now),
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

            # Verified medication plan & events for Rahima
            conn.execute(
                """
                INSERT OR IGNORE INTO medication_plans (id, patient_profile_id, source_document_id, medicine_name, strength_text, dose_text, frequency_rule, status, verified_by_user_id)
                VALUES ('medp-1', 'pp-rahima-self', 'doc-ocr-0052', 'Vitamin D3 (Cholecalciferol)', '2000 IU', '1 capsule', '1+0+0 After Breakfast', 'ACTIVE', 'usr-pt-demo')
                """
            )
            conn.execute(
                """
                INSERT OR IGNORE INTO medication_events (id, plan_id, due_utc, notification_status, action_status)
                VALUES ('mede-1', 'medp-1', ?, 'DELIVERED', 'UNACKNOWLEDGED')
                """,
                (_slot_iso(0, 3, 0),),
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

            # 10. Support Ticket Fixture (Zero-PHI)
            conn.execute(
                """
                INSERT OR IGNORE INTO support_tickets (id, ticket_number, requester_user_id, category, priority, status, assignee_support_user_id, related_appointment_id, related_demo_payment_id, subject)
                VALUES ('tkt-401', 'TKT-DEMO-401', 'usr-pt-demo', 'DEMO_PAYMENT', 'NORMAL', 'IN_PROGRESS', 'usr-sup-demo', 'apt-hist-9001', 'pay-hist-9001', 'Need confirmation receipt PDF link for APT-DEMO-9001')
                """
            )
            conn.execute(
                """
                INSERT OR IGNORE INTO support_messages (id, ticket_id, sender_user_id, sender_role, visibility, body_text)
                VALUES
                  ('sm-1', 'tkt-401', 'usr-pt-demo', 'PATIENT', 'PUBLIC', 'Hello Support, where can I download my DEMO-BKASH-9001 receipt?'),
                  ('sm-2', 'tkt-401', 'usr-sup-demo', 'SUPPORT', 'PUBLIC', 'আপনি পেমেন্ট ও রিসিপ্ট ট্যাব থেকে DEMO-RCP-9001 প্রিন্ট/ডাউনলোড করতে পারবেন।'),
                  ('sm-3', 'tkt-401', 'usr-sup-demo', 'SUPPORT', 'INTERNAL', 'Verified payment status DEMO_PAID without accessing patient clinical records.')
                """
            )

            # 11. Feature Flags (Fail-Closed RAG & Voice DEFERRED)
            flags = [
                ("research_pcos_ml_preview", 1, "Read-only research preview for M01 XGBoost PCOS metrics (Non-diagnostic)"),
                ("research_ultrasound_preview", 1, "Read-only research preview for M02 PCOM morphology (Non-diagnostic)"),
                ("research_viral_rash_preview", 1, "Read-only research preview for M03 Grouped ResNet18 (Non-diagnostic)"),
                ("research_ocr_draft_review", 1, "Safe OCR draft review requiring explicit human verification before schedule activation"),
                ("research_dermoped_preview", 1, "Read-only research evaluator preview for M06 EXP_B"),
                ("deferred_rag_chatbot", 0, "DEFERRED TO PHASE G: Medical RAG Chatbot disabled"),
                ("deferred_voice_asr", 0, "DEFERRED TO PHASE G: Bangla Voice ASR disabled"),
            ]
            for fk, enb, desc in flags:
                conn.execute(
                    "INSERT OR IGNORE INTO feature_flags (flag_key, enabled, description) VALUES (?, ?, ?)",
                    (fk, enb, desc),
                )

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

            conn.execute("COMMIT;")
        except Exception:
            conn.execute("ROLLBACK;")
            raise

    return {"seeded": True}


if __name__ == "__main__":
    print(seed_database())
