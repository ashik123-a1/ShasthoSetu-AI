-- ==============================================================================
-- ShasthoSetu AI — Full-Stack Normalized SQLite Schema (FULLSTACK-01 / M4)
-- Incorporates 30 base tables from INITIAL_SQLITE_SCHEMA.sql + fixes ISS-003..006
-- + DocTime-inspired healthcare catalogs, e-prescriptions & lab orders (36 tables)
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- 1. IDENTITY, SESSIONS & RBAC
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    phone TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    primary_role TEXT NOT NULL CHECK (primary_role IN ('PATIENT', 'DOCTOR', 'ADMIN', 'SUPPORT')),
    preferred_locale TEXT NOT NULL DEFAULT 'bn' CHECK (preferred_locale IN ('bn', 'en')),
    account_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (account_status IN ('ACTIVE', 'LOCKED', 'SUSPENDED', 'DELETED')),
    is_synthetic INTEGER NOT NULL DEFAULT 0 CHECK (is_synthetic IN (0, 1)),
    last_login_at_utc TEXT,
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    csrf_token TEXT NOT NULL,
    user_agent TEXT,
    ip_redacted TEXT,
    expires_at_utc TEXT NOT NULL,
    revoked_at_utc TEXT,
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, revoked_at_utc);

CREATE TABLE IF NOT EXISTS role_memberships (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('PATIENT', 'DOCTOR', 'ADMIN', 'SUPPORT', 'CAREGIVER', 'CHW', 'CLINIC_ADMIN', 'RESEARCH_EVALUATOR')),
    organization_id TEXT,
    approval_state TEXT NOT NULL DEFAULT 'APPROVED' CHECK (approval_state IN ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED')),
    granted_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    expires_at_utc TEXT,
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (user_id, role, organization_id)
);
CREATE INDEX IF NOT EXISTS idx_role_memberships_user ON role_memberships(user_id, role, approval_state);
-- FIX ISS-003: Prevent duplicate global memberships when organization_id IS NULL
CREATE UNIQUE INDEX IF NOT EXISTS uq_role_memberships_null_org
    ON role_memberships(user_id, role) WHERE organization_id IS NULL;

-- 2. PROFILES, CONSENTS & DOCTOR ONBOARDING
CREATE TABLE IF NOT EXISTS patient_profiles (
    id TEXT PRIMARY KEY,
    owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    relationship_type TEXT NOT NULL DEFAULT 'SELF' CHECK (relationship_type IN ('SELF', 'CHILD', 'ELDER_DEPENDENT', 'FAMILY_MEMBER')),
    date_of_birth TEXT,
    sex TEXT CHECK (sex IN ('FEMALE', 'MALE', 'OTHER', 'PREFER_NOT_TO_SAY')),
    blood_group TEXT,
    district TEXT DEFAULT 'Dhaka',
    phone_contact TEXT,
    emergency_contact TEXT,
    preferred_locale TEXT NOT NULL DEFAULT 'bn' CHECK (preferred_locale IN ('bn', 'en')),
    is_synthetic INTEGER NOT NULL DEFAULT 0 CHECK (is_synthetic IN (0, 1)),
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_patient_profiles_owner ON patient_profiles(owner_user_id);

CREATE TABLE IF NOT EXISTS profile_access (
    id TEXT PRIMARY KEY,
    patient_profile_id TEXT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    grantee_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_level TEXT NOT NULL CHECK (permission_level IN ('READ_SUMMARY', 'READ_RECORDS', 'CAREGIVER_MANAGE', 'CLINICAL_ENCOUNTER')),
    granted_by_user_id TEXT NOT NULL REFERENCES users(id),
    expires_at_utc TEXT NOT NULL,
    revoked_at_utc TEXT,
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_profile_access_grantee ON profile_access(grantee_user_id, patient_profile_id, revoked_at_utc);

CREATE TABLE IF NOT EXISTS doctor_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    display_name_bn TEXT,
    degrees TEXT NOT NULL,
    specialty TEXT NOT NULL,
    bmdc_demo_reg TEXT,
    practice_location TEXT NOT NULL DEFAULT 'Dhaka (Demo Clinic)',
    district TEXT NOT NULL DEFAULT 'Dhaka',
    experience_years INTEGER NOT NULL DEFAULT 6 CHECK (experience_years >= 0),
    languages_csv TEXT NOT NULL DEFAULT 'bn,en',
    symptom_tags_csv TEXT NOT NULL DEFAULT 'fever,consultation',
    consultation_modality TEXT NOT NULL DEFAULT 'BOTH' CHECK (consultation_modality IN ('IN_CLINIC_DEMO', 'ONLINE_DEMO', 'BOTH')),
    is_online_now INTEGER NOT NULL DEFAULT 1 CHECK (is_online_now IN (0, 1)),
    bio TEXT,
    bio_bn TEXT,
    consultation_fee_minor_poisha INTEGER NOT NULL DEFAULT 50000 CHECK (consultation_fee_minor_poisha >= 0),
    followup_fee_minor_poisha INTEGER NOT NULL DEFAULT 25000 CHECK (followup_fee_minor_poisha >= 0),
    slot_duration_minutes INTEGER NOT NULL DEFAULT 20 CHECK (slot_duration_minutes IN (10, 15, 20, 30, 45, 60)),
    verification_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED')),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    is_fictional_demo INTEGER NOT NULL DEFAULT 1 CHECK (is_fictional_demo IN (0, 1)),
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_status_spec ON doctor_profiles(verification_status, specialty, is_active);

CREATE TABLE IF NOT EXISTS doctor_verification_events (
    id TEXT PRIMARY KEY,
    doctor_profile_id TEXT NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
    reviewer_admin_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    from_status TEXT,
    to_status TEXT NOT NULL CHECK (to_status IN ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED')),
    reason TEXT NOT NULL,
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS specialties (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name_bn TEXT NOT NULL,
    name_en TEXT NOT NULL,
    min_fee_minor_poisha INTEGER NOT NULL DEFAULT 0 CHECK (min_fee_minor_poisha >= 0),
    max_fee_minor_poisha INTEGER NOT NULL DEFAULT 500000 CHECK (max_fee_minor_poisha >= min_fee_minor_poisha),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);

-- 3. AVAILABILITY, SLOTS & ATOMIC APPOINTMENTS
CREATE TABLE IF NOT EXISTS doctor_availability_rules (
    id TEXT PRIMARY KEY,
    doctor_id TEXT NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
    weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
    start_local_hhmm TEXT NOT NULL,
    end_local_hhmm TEXT NOT NULL,
    break_start_hhmm TEXT,
    break_end_hhmm TEXT,
    slot_duration_minutes INTEGER NOT NULL DEFAULT 20 CHECK (slot_duration_minutes > 0),
    timezone TEXT NOT NULL DEFAULT 'Asia/Dhaka',
    effective_from_date TEXT NOT NULL,
    effective_to_date TEXT,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CHECK (end_local_hhmm > start_local_hhmm)
);

CREATE TABLE IF NOT EXISTS doctor_time_off (
    id TEXT PRIMARY KEY,
    doctor_id TEXT NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
    start_utc TEXT NOT NULL,
    end_utc TEXT NOT NULL,
    reason_code TEXT NOT NULL DEFAULT 'LEAVE',
    note TEXT,
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CHECK (end_utc > start_utc)
);

CREATE TABLE IF NOT EXISTS appointment_slots (
    id TEXT PRIMARY KEY,
    doctor_id TEXT NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
    start_utc TEXT NOT NULL,
    end_utc TEXT NOT NULL,
    modality TEXT NOT NULL DEFAULT 'ONLINE_DEMO' CHECK (modality IN ('IN_CLINIC_DEMO', 'ONLINE_DEMO')),
    capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity >= 1),
    reserved_count INTEGER NOT NULL DEFAULT 0 CHECK (reserved_count >= 0 AND reserved_count <= capacity),
    -- FIX ISS-004: Strict state enum 'OPEN', 'HELD', 'BOOKED', 'BLOCKED_LEAVE', 'CANCELLED', 'EXPIRED'
    state TEXT NOT NULL DEFAULT 'OPEN' CHECK (state IN ('OPEN', 'HELD', 'BOOKED', 'BLOCKED_LEAVE', 'CANCELLED', 'EXPIRED')),
    held_until_utc TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (doctor_id, start_utc),
    CHECK (end_utc > start_utc)
);
CREATE INDEX IF NOT EXISTS idx_slots_doctor_time_state ON appointment_slots(doctor_id, start_utc, state);

-- FIX ISS-006: Prevent overlapping time slot intervals for the same doctor
CREATE TRIGGER IF NOT EXISTS trg_appointment_slots_no_overlap_ins
BEFORE INSERT ON appointment_slots
FOR EACH ROW
WHEN NEW.state NOT IN ('CANCELLED', 'EXPIRED') AND EXISTS (
    SELECT 1 FROM appointment_slots s
     WHERE s.doctor_id = NEW.doctor_id
       AND s.state NOT IN ('CANCELLED', 'EXPIRED')
       AND s.start_utc < NEW.end_utc
       AND s.end_utc > NEW.start_utc
)
BEGIN
    SELECT RAISE(ABORT, 'OVERLAPPING_APPOINTMENT_SLOT');
END;

CREATE TRIGGER IF NOT EXISTS trg_appointment_slots_no_overlap_upd
BEFORE UPDATE OF start_utc, end_utc, state ON appointment_slots
FOR EACH ROW
WHEN NEW.state NOT IN ('CANCELLED', 'EXPIRED') AND EXISTS (
    SELECT 1 FROM appointment_slots s
     WHERE s.doctor_id = NEW.doctor_id
       AND s.id != NEW.id
       AND s.state NOT IN ('CANCELLED', 'EXPIRED')
       AND s.start_utc < NEW.end_utc
       AND s.end_utc > NEW.start_utc
)
BEGIN
    SELECT RAISE(ABORT, 'OVERLAPPING_APPOINTMENT_SLOT');
END;

CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    booking_reference TEXT NOT NULL UNIQUE,
    patient_profile_id TEXT NOT NULL REFERENCES patient_profiles(id) ON DELETE RESTRICT,
    booked_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    doctor_id TEXT NOT NULL REFERENCES doctor_profiles(id) ON DELETE RESTRICT,
    slot_id TEXT NOT NULL REFERENCES appointment_slots(id) ON DELETE RESTRICT,
    parent_followup_appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL,
    consultation_mode TEXT NOT NULL DEFAULT 'ONLINE_DEMO' CHECK (consultation_mode IN ('IN_CLINIC_DEMO', 'ONLINE_DEMO')),
    is_instant INTEGER NOT NULL DEFAULT 0 CHECK (is_instant IN (0, 1)),
    status TEXT NOT NULL DEFAULT 'BOOKING_PENDING' CHECK (status IN (
        'BOOKING_PENDING',
        'AWAITING_DEMO_PAYMENT',
        'CONFIRMED',
        'CHECKED_IN',
        'IN_CONSULTATION',
        'COMPLETED',
        'RESCHEDULE_REQUESTED',
        'CANCELLED',
        'NO_SHOW'
    )),
    visit_reason_summary TEXT,
    prep_symptoms_text TEXT,
    prep_vitals_json TEXT DEFAULT '{}',
    consent_shared_with_doctor INTEGER NOT NULL DEFAULT 1 CHECK (consent_shared_with_doctor IN (0, 1)),
    fee_minor_poisha INTEGER NOT NULL CHECK (fee_minor_poisha >= 0),
    payment_requirement TEXT NOT NULL DEFAULT 'REQUIRED_DEMO' CHECK (payment_requirement IN ('REQUIRED_DEMO', 'DEMO_FREE_WAIVED')),
    idempotency_key TEXT UNIQUE,
    version INTEGER NOT NULL DEFAULT 1,
    is_synthetic INTEGER NOT NULL DEFAULT 0 CHECK (is_synthetic IN (0, 1)),
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_profile_id, status, created_at_utc);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id, status, created_at_utc);

CREATE TABLE IF NOT EXISTS appointment_events (
    id TEXT PRIMARY KEY,
    appointment_id TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    actor_role TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT NOT NULL,
    reason TEXT,
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS consultation_notes (
    id TEXT PRIMARY KEY,
    appointment_id TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    author_doctor_id TEXT NOT NULL REFERENCES doctor_profiles(id),
    parent_note_id TEXT REFERENCES consultation_notes(id),
    subjective_notes TEXT,
    assessment_summary TEXT,
    advice_summary TEXT,
    followup_instruction TEXT,
    followup_date TEXT,
    state TEXT NOT NULL DEFAULT 'DRAFT' CHECK (state IN ('DRAFT', 'SIGNED', 'ADDENDUM')),
    signed_at_utc TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS eprescriptions (
    id TEXT PRIMARY KEY,
    rx_reference TEXT NOT NULL UNIQUE,
    appointment_id TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    doctor_id TEXT NOT NULL REFERENCES doctor_profiles(id),
    patient_profile_id TEXT NOT NULL REFERENCES patient_profiles(id),
    diagnosis_summary TEXT NOT NULL,
    medications_json TEXT NOT NULL,
    advice_notes TEXT,
    followup_date TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SIGNED')),
    signed_by_user_id TEXT REFERENCES users(id),
    signed_at_utc TEXT,
    is_simulated INTEGER NOT NULL DEFAULT 1 CHECK (is_simulated = 1),
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CHECK (status != 'SIGNED' OR signed_by_user_id IS NOT NULL)
);

-- 4. DEMO PAYMENTS & RECEIPTS
CREATE TABLE IF NOT EXISTS demo_payments (
    id TEXT PRIMARY KEY,
    demo_ref TEXT NOT NULL UNIQUE,
    appointment_id TEXT NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT,
    payer_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    method TEXT NOT NULL CHECK (method IN ('DEMO_BKASH', 'DEMO_NAGAD', 'DEMO_CARD', 'DEMO_FREE')),
    amount_minor_poisha INTEGER NOT NULL CHECK (amount_minor_poisha >= 0),
    currency TEXT NOT NULL DEFAULT 'BDT' CHECK (currency = 'BDT'),
    status TEXT NOT NULL DEFAULT 'CHECKOUT_CREATED' CHECK (status IN (
        'CHECKOUT_CREATED',
        'DEMO_PENDING',
        'DEMO_PAID',
        'DEMO_FAILED',
        'DEMO_CANCELLED',
        'DEMO_REFUND_REQUESTED',
        'DEMO_REFUNDED'
    )),
    is_simulated INTEGER NOT NULL DEFAULT 1 CHECK (is_simulated = 1),
    idempotency_key TEXT NOT NULL UNIQUE,
    failure_reason_code TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS demo_payment_events (
    id TEXT PRIMARY KEY,
    payment_id TEXT NOT NULL REFERENCES demo_payments(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    note TEXT,
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS demo_receipts (
    id TEXT PRIMARY KEY,
    payment_id TEXT NOT NULL UNIQUE REFERENCES demo_payments(id) ON DELETE CASCADE,
    receipt_number TEXT NOT NULL UNIQUE,
    disclaimer_label TEXT NOT NULL DEFAULT 'SIMULATED / DEMO RECEIPT — NO ACTUAL MONEY CHARGED',
    issued_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 5. SUPPORT HELPDESK & ZERO-PHI TICKETING
CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY,
    ticket_number TEXT NOT NULL UNIQUE,
    requester_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    category TEXT NOT NULL CHECK (category IN (
        'ACCOUNT', 'DOCTOR_APPOINTMENT', 'DEMO_PAYMENT', 'CONSULTATION_CONNECTION',
        'DOCTOR_NO_SHOW', 'RESCHEDULE_HELP', 'DOCUMENT_TECHNICAL', 'GENERAL', 'SAFETY_ESCALATION'
    )),
    priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER', 'ESCALATED', 'RESOLVED', 'CLOSED')),
    assignee_support_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    related_appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL,
    related_demo_payment_id TEXT REFERENCES demo_payments(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS support_messages (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    sender_role TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'PUBLIC' CHECK (visibility IN ('PUBLIC', 'INTERNAL')),
    body_text TEXT NOT NULL,
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS ticket_events (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    transition_type TEXT NOT NULL,
    reason TEXT,
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 6. PHR DOCUMENTS, SAFE OCR, MEDS, PCOS, PEDIATRIC & DOCTIME CATALOGS
CREATE TABLE IF NOT EXISTS medical_documents (
    id TEXT PRIMARY KEY,
    patient_profile_id TEXT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    uploaded_by_user_id TEXT NOT NULL REFERENCES users(id),
    doc_type TEXT NOT NULL CHECK (doc_type IN ('PRESCRIPTION', 'LAB_REPORT', 'ULTRASOUND', 'DISCHARGE_SUMMARY', 'OTHER')),
    original_filename TEXT NOT NULL,
    storage_object_key TEXT NOT NULL UNIQUE,
    mime_type TEXT NOT NULL CHECK (mime_type IN ('application/pdf', 'image/jpeg', 'image/png')),
    byte_size INTEGER NOT NULL CHECK (byte_size > 0),
    sha256_hash TEXT NOT NULL,
    is_synthetic INTEGER NOT NULL DEFAULT 0 CHECK (is_synthetic IN (0, 1)),
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS ocr_jobs (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES medical_documents(id) ON DELETE CASCADE,
    engine_version TEXT NOT NULL DEFAULT 'easyocr-bn-en-v1',
    status TEXT NOT NULL DEFAULT 'UPLOADED' CHECK (status IN ('UPLOADED', 'PROCESSING', 'NEEDS_REVIEW', 'VERIFIED', 'SCHEDULED', 'FAILED', 'RETAKE_REQUIRED')),
    mean_confidence REAL,
    elapsed_ms INTEGER,
    verified_by_user_id TEXT REFERENCES users(id),
    verified_at_utc TEXT,
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS ocr_fields (
    id TEXT PRIMARY KEY,
    ocr_job_id TEXT NOT NULL REFERENCES ocr_jobs(id) ON DELETE CASCADE,
    group_index INTEGER NOT NULL DEFAULT 0,
    field_type TEXT NOT NULL CHECK (field_type IN ('MEDICINE_NAME', 'STRENGTH', 'DOSE', 'FREQUENCY', 'ROUTE', 'DURATION', 'PRESCRIBER_NOTE')),
    raw_ocr_text TEXT NOT NULL,
    verified_value TEXT,
    confidence REAL NOT NULL CHECK (confidence BETWEEN 0.0 AND 1.0),
    bbox_json TEXT,
    is_critical INTEGER NOT NULL DEFAULT 1 CHECK (is_critical IN (0, 1)),
    is_verified INTEGER NOT NULL DEFAULT 0 CHECK (is_verified IN (0, 1)),
    verified_by_user_id TEXT REFERENCES users(id),
    updated_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- FIX ISS-005 & AI-QA-FIX-01: verified_by_user_id nullable for DRAFT, separate PATIENT_ACKNOWLEDGED_REMINDER vs CLINICIAN_AUTHORIZED_PLAN
CREATE TABLE IF NOT EXISTS medication_plans (
    id TEXT PRIMARY KEY,
    patient_profile_id TEXT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    source_document_id TEXT REFERENCES medical_documents(id) ON DELETE SET NULL,
    source_ocr_job_id TEXT REFERENCES ocr_jobs(id) ON DELETE SET NULL,
    medicine_name TEXT NOT NULL,
    strength_text TEXT,
    dose_text TEXT NOT NULL,
    frequency_rule TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'Asia/Dhaka',
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'VERIFIED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED')),
    authorization_type TEXT NOT NULL DEFAULT 'PATIENT_ACKNOWLEDGED_REMINDER' CHECK (authorization_type IN ('PATIENT_ACKNOWLEDGED_REMINDER', 'CLINICIAN_AUTHORIZED_PLAN')),
    verified_by_user_id TEXT REFERENCES users(id),
    clinician_verified_by_user_id TEXT REFERENCES users(id),
    version INTEGER NOT NULL DEFAULT 1,
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CHECK (status NOT IN ('VERIFIED', 'ACTIVE') OR verified_by_user_id IS NOT NULL),
    CHECK (authorization_type != 'CLINICIAN_AUTHORIZED_PLAN' OR clinician_verified_by_user_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS medication_events (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL REFERENCES medication_plans(id) ON DELETE CASCADE,
    due_utc TEXT NOT NULL,
    notification_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (notification_status IN ('PENDING', 'QUEUED', 'DELIVERED', 'FAILED', 'UNKNOWN')),
    action_status TEXT NOT NULL DEFAULT 'UNACKNOWLEDGED' CHECK (action_status IN ('UNACKNOWLEDGED', 'TAKEN', 'SKIPPED', 'SNOOZED', 'NOT_SURE')),
    acknowledged_at_utc TEXT,
    UNIQUE (plan_id, due_utc)
);

CREATE TABLE IF NOT EXISTS pcos_cycle_entries (
    id TEXT PRIMARY KEY,
    patient_profile_id TEXT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    start_date TEXT NOT NULL,
    end_date TEXT,
    cycle_length_days INTEGER,
    symptoms_json TEXT DEFAULT '{}',
    user_notes TEXT,
    data_origin TEXT NOT NULL DEFAULT 'LOGGED_BY_USER' CHECK (data_origin IN ('LOGGED_BY_USER', 'CLINICIAN_VERIFIED')),
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS pediatric_intake_cases (
    id TEXT PRIMARY KEY,
    child_profile_id TEXT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    submitted_by_user_id TEXT NOT NULL REFERENCES users(id),
    reported_facts_json TEXT NOT NULL,
    missing_critical_fields_json TEXT NOT NULL DEFAULT '[]',
    rule_version TEXT NOT NULL DEFAULT 'reviewed-rules-v1',
    escalation_flags_json TEXT NOT NULL DEFAULT '[]',
    review_state TEXT NOT NULL DEFAULT 'NEEDS_HUMAN_ASSESSMENT' CHECK (review_state IN ('DRAFT', 'RULES_EVALUATED', 'NEEDS_HUMAN_ASSESSMENT', 'URGENT_REVIEW', 'REVIEWED', 'CLOSED')),
    reviewed_by_doctor_id TEXT REFERENCES doctor_profiles(id),
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS pediatric_vaccine_records (
    id TEXT PRIMARY KEY,
    child_profile_id TEXT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    vaccine_name TEXT NOT NULL,
    dose_label TEXT NOT NULL,
    due_date TEXT NOT NULL,
    administered_date TEXT,
    status TEXT NOT NULL DEFAULT 'UPCOMING' CHECK (status IN ('UPCOMING', 'COMPLETED', 'OVERDUE')),
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS facilities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    facility_type TEXT NOT NULL CHECK (facility_type IN ('HOSPITAL', 'CLINIC', 'PHARMACY', 'DIAGNOSTIC')),
    district TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    phone TEXT,
    source_name TEXT NOT NULL DEFAULT 'OpenStreetMap / Verified Directory',
    last_verified_date TEXT
);

CREATE TABLE IF NOT EXISTS diagnostic_tests (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_bn TEXT NOT NULL,
    name_en TEXT NOT NULL,
    category TEXT NOT NULL,
    sample_type TEXT NOT NULL,
    fee_minor_poisha INTEGER NOT NULL CHECK (fee_minor_poisha >= 0),
    turnaround_hours INTEGER NOT NULL DEFAULT 24,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS diagnostic_demo_orders (
    id TEXT PRIMARY KEY,
    order_ref TEXT NOT NULL UNIQUE,
    patient_profile_id TEXT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    test_id TEXT NOT NULL REFERENCES diagnostic_tests(id),
    preferred_date TEXT NOT NULL,
    collection_mode TEXT NOT NULL DEFAULT 'LAB_VISIT_DEMO' CHECK (collection_mode IN ('LAB_VISIT_DEMO', 'HOME_SAMPLE_DEMO')),
    fee_minor_poisha INTEGER NOT NULL CHECK (fee_minor_poisha >= 0),
    payment_status TEXT NOT NULL DEFAULT 'DEMO_PAID' CHECK (payment_status IN ('DEMO_PENDING', 'DEMO_PAID', 'CANCELLED')),
    status TEXT NOT NULL DEFAULT 'CONFIRMED_DEMO' CHECK (status IN ('REQUESTED', 'CONFIRMED_DEMO', 'COMPLETED_DEMO', 'CANCELLED')),
    notes TEXT,
    is_simulated INTEGER NOT NULL DEFAULT 1 CHECK (is_simulated = 1),
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS healthcare_plans (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_bn TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description_bn TEXT NOT NULL,
    description_en TEXT NOT NULL,
    monthly_fee_minor_poisha INTEGER NOT NULL CHECK (monthly_fee_minor_poisha >= 0),
    max_family_members INTEGER NOT NULL DEFAULT 4,
    features_json TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);

-- 7. NOTIFICATIONS, FEATURE FLAGS, RATE LIMIT & AUDIT LOGS
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    recipient_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    title_bn TEXT NOT NULL,
    title_en TEXT NOT NULL,
    delivery_status TEXT NOT NULL DEFAULT 'DELIVERED' CHECK (delivery_status IN ('QUEUED', 'DELIVERED', 'FAILED', 'UNKNOWN')),
    read_at_utc TEXT,
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(recipient_user_id, read_at_utc);

CREATE TABLE IF NOT EXISTS feature_flags (
    flag_key TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
    description TEXT,
    updated_by_admin_id TEXT REFERENCES users(id),
    updated_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    actor_role TEXT NOT NULL,
    action_type TEXT NOT NULL,
    target_resource TEXT NOT NULL,
    target_id TEXT,
    outcome TEXT NOT NULL CHECK (outcome IN ('SUCCESS', 'DENIED', 'ERROR')),
    request_id TEXT,
    ip_redacted TEXT,
    details_redacted_json TEXT DEFAULT '{}',
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_time ON audit_logs(actor_user_id, created_at_utc);

-- =========================================================================
-- 16. REAL AI MODEL INFERENCE DRAFTS & CLINICIAN REVIEW
-- =========================================================================

CREATE TABLE IF NOT EXISTS ai_inference_drafts (
    id TEXT PRIMARY KEY,
    patient_profile_id TEXT REFERENCES patient_profiles(id) ON DELETE CASCADE,
    submitted_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module_key TEXT NOT NULL CHECK (module_key IN ('pcos-clinical','pcos-ultrasound','viral-rash','prescription-ocr','dermoped')),
    model_id TEXT NOT NULL,
    input_summary TEXT NOT NULL,
    result_json TEXT NOT NULL,
    confidence_score REAL DEFAULT 0.0,
    shared_with_doctor INTEGER NOT NULL DEFAULT 1,
    doctor_review_status TEXT NOT NULL DEFAULT 'PENDING_CLINICIAN_REVIEW' CHECK (doctor_review_status IN ('PENDING_CLINICIAN_REVIEW','CLINICIAN_REVIEWED','FLAGGED_INCONCLUSIVE')),
    reviewed_by_doctor_id TEXT REFERENCES doctor_profiles(id) ON DELETE SET NULL,
    doctor_notes TEXT DEFAULT '',
    reviewed_at_utc TEXT,
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_ai_drafts_user_time ON ai_inference_drafts(submitted_by_user_id, created_at_utc);
CREATE INDEX IF NOT EXISTS idx_ai_drafts_doctor_shared ON ai_inference_drafts(shared_with_doctor, doctor_review_status);

-- =========================================================================
-- 17. BLOOD CONNECT (GEO-PROXIMITY DONORS, REQUESTS & CONSENT MATCH LOGS)
-- =========================================================================

CREATE TABLE IF NOT EXISTS blood_donors (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    display_name TEXT NOT NULL,
    blood_group TEXT NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
    donation_type TEXT NOT NULL DEFAULT 'WHOLE_BLOOD' CHECK (donation_type IN ('WHOLE_BLOOD','PLATELETS','PLASMA')),
    last_donation_date TEXT,
    availability_status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (availability_status IN ('AVAILABLE','PAUSED','RECENTLY_DONATED')),
    division TEXT NOT NULL,
    district TEXT NOT NULL,
    area_name TEXT NOT NULL DEFAULT '',
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    contact_phone TEXT NOT NULL,
    trust_score REAL NOT NULL DEFAULT 4.8 CHECK (trust_score >= 1.0 AND trust_score <= 5.0),
    verified_donations_count INTEGER NOT NULL DEFAULT 0 CHECK (verified_donations_count >= 0),
    no_show_count INTEGER NOT NULL DEFAULT 0 CHECK (no_show_count >= 0),
    screening_policy_acknowledged INTEGER NOT NULL DEFAULT 1 CHECK (screening_policy_acknowledged IN (0, 1)),
    is_synthetic INTEGER NOT NULL DEFAULT 0 CHECK (is_synthetic IN (0, 1)),
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_blood_donors_group_avail ON blood_donors(blood_group, availability_status);
CREATE INDEX IF NOT EXISTS idx_blood_donors_division ON blood_donors(division, district);

CREATE TABLE IF NOT EXISTS blood_requests (
    id TEXT PRIMARY KEY,
    requester_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_ref_label TEXT NOT NULL,
    blood_group TEXT NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
    units_required INTEGER NOT NULL DEFAULT 1 CHECK (units_required >= 1 AND units_required <= 10),
    units_fulfilled INTEGER NOT NULL DEFAULT 0 CHECK (units_fulfilled >= 0),
    urgency_level TEXT NOT NULL DEFAULT 'URGENT' CHECK (urgency_level IN ('EMERGENCY','URGENT','SCHEDULED')),
    hospital_name TEXT NOT NULL,
    hospital_verified INTEGER NOT NULL DEFAULT 0 CHECK (hospital_verified IN (0, 1)),
    division TEXT NOT NULL,
    district TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    search_radius_km REAL NOT NULL DEFAULT 5.0 CHECK (search_radius_km IN (5.0, 10.0, 20.0, 50.0)),
    needed_by_utc TEXT,
    notes TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','MATCHED','FULFILLED','CANCELLED')),
    is_synthetic INTEGER NOT NULL DEFAULT 0 CHECK (is_synthetic IN (0, 1)),
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_blood_requests_status_urg ON blood_requests(status, urgency_level, created_at_utc);

CREATE TABLE IF NOT EXISTS blood_match_logs (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
    donor_id TEXT NOT NULL REFERENCES blood_donors(id) ON DELETE CASCADE,
    notified_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    response_status TEXT NOT NULL DEFAULT 'NOTIFIED' CHECK (response_status IN ('NOTIFIED','ACCEPTED','DECLINED','COMPLETED','NO_SHOW')),
    consent_phone_shared INTEGER NOT NULL DEFAULT 0 CHECK (consent_phone_shared IN (0, 1)),
    requester_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (requester_confirmed IN (0, 1)),
    donor_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (donor_confirmed IN (0, 1)),
    feedback_rating INTEGER CHECK (feedback_rating IS NULL OR (feedback_rating >= 1 AND feedback_rating <= 5)),
    feedback_note TEXT DEFAULT '',
    responded_at_utc TEXT,
    completed_at_utc TEXT,
    UNIQUE (request_id, donor_id)
);
CREATE INDEX IF NOT EXISTS idx_blood_matches_req ON blood_match_logs(request_id, response_status);
CREATE INDEX IF NOT EXISTS idx_blood_matches_donor ON blood_match_logs(donor_id, response_status);

-- =========================================================================
-- 18. HEALTH JOURNAL (CACHED OFFICIAL FEEDS, VIDEOS, PUBMED & BLOGS)
-- =========================================================================

CREATE TABLE IF NOT EXISTS journal_items (
    id TEXT PRIMARY KEY,
    item_type TEXT NOT NULL CHECK (item_type IN ('NEWS','VIDEO','RESEARCH','BLOG')),
    language TEXT NOT NULL CHECK (language IN ('bn','en','bilingual')),
    category TEXT NOT NULL CHECK (category IN ('medical-news','research','womens-health','child-care','blood-donation','bangladesh-health')),
    title TEXT NOT NULL,
    title_bn TEXT DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    summary_bn TEXT DEFAULT '',
    source_name TEXT NOT NULL,
    source_url TEXT NOT NULL,
    video_id TEXT,
    video_embed_url TEXT,
    thumbnail_url TEXT,
    published_at_utc TEXT NOT NULL,
    fetched_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    editorial_status TEXT NOT NULL DEFAULT 'VERIFIED_OFFICIAL_FEED' CHECK (editorial_status IN ('VERIFIED_OFFICIAL_FEED','EDITORIAL_REVIEWED')),
    citation_meta_json TEXT DEFAULT '{}',
    UNIQUE (source_name, source_url)
);
CREATE INDEX IF NOT EXISTS idx_journal_items_filter ON journal_items(item_type, language, category, published_at_utc);

CREATE TABLE IF NOT EXISTS journal_sync_runs (
    id TEXT PRIMARY KEY,
    started_at_utc TEXT NOT NULL,
    completed_at_utc TEXT,
    status TEXT NOT NULL CHECK (status IN ('RUNNING','SUCCESS','PARTIAL','FAILED')),
    items_added INTEGER NOT NULL DEFAULT 0,
    sources_json TEXT NOT NULL DEFAULT '{}'
);

-- =========================================================================
-- 19. BILINGUAL RAG KNOWLEDGE BASE, VOICE ASR/TTS & OCR ARTIFACTS (AI-RAG-VOICE-OCR-01)
-- =========================================================================

CREATE TABLE IF NOT EXISTS rag_sources (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    title_bn TEXT NOT NULL DEFAULT '',
    publisher TEXT NOT NULL,
    source_url TEXT NOT NULL DEFAULT '',
    local_file_ref TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL,
    audience_scope TEXT NOT NULL DEFAULT 'PUBLIC_MEDICAL' CHECK (audience_scope IN ('PUBLIC_MEDICAL', 'SUPPORT_FAQ', 'CLINICAL_REFERENCE')),
    language TEXT NOT NULL DEFAULT 'bilingual' CHECK (language IN ('bn', 'en', 'bilingual')),
    publication_date TEXT,
    retrieval_date TEXT NOT NULL,
    license_basis TEXT NOT NULL,
    current_version_id TEXT,
    review_status TEXT NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (review_status IN ('PENDING_REVIEW', 'APPROVED', 'DEPRECATED', 'REJECTED')),
    approved_by_admin_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    approved_at_utc TEXT,
    created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_rag_sources_status_scope ON rag_sources(review_status, audience_scope, category);

CREATE TABLE IF NOT EXISTS rag_source_versions (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL REFERENCES rag_sources(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    content_sha256 TEXT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'text/markdown',
    original_filename TEXT NOT NULL DEFAULT '',
    clean_text TEXT NOT NULL,
    word_count INTEGER NOT NULL DEFAULT 0,
    chunk_count INTEGER NOT NULL DEFAULT 0,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (source_id, version_number)
);
CREATE INDEX IF NOT EXISTS idx_rag_versions_hash ON rag_source_versions(content_sha256);

CREATE TABLE IF NOT EXISTS rag_chunks (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL REFERENCES rag_sources(id) ON DELETE CASCADE,
    version_id TEXT NOT NULL REFERENCES rag_source_versions(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    section_heading TEXT NOT NULL DEFAULT '',
    page_or_section_ref TEXT NOT NULL DEFAULT '',
    language TEXT NOT NULL DEFAULT 'bilingual',
    chunk_text TEXT NOT NULL,
    chunk_sha256 TEXT NOT NULL,
    token_estimate INTEGER NOT NULL DEFAULT 0,
    vector_row_idx INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_source_active ON rag_chunks(source_id, is_active, chunk_index);

CREATE TABLE IF NOT EXISTS rag_ingestion_jobs (
    id TEXT PRIMARY KEY,
    source_id TEXT REFERENCES rag_sources(id) ON DELETE CASCADE,
    triggered_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    job_type TEXT NOT NULL CHECK (job_type IN ('SEED_CORPUS', 'ADMIN_UPLOAD', 'ADMIN_REINDEX')),
    status TEXT NOT NULL CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED')),
    embedding_model TEXT NOT NULL DEFAULT 'bge-m3',
    index_version TEXT NOT NULL DEFAULT '',
    chunks_processed INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    error_summary TEXT NOT NULL DEFAULT '',
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    completed_at_utc TEXT
);

CREATE TABLE IF NOT EXISTS ai_voice_consents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_scope TEXT NOT NULL DEFAULT 'LOCAL_ASR_TRANSCRIPTION' CHECK (consent_scope IN ('LOCAL_ASR_TRANSCRIPTION', 'LOCAL_TTS_PLAYBACK')),
    consented INTEGER NOT NULL DEFAULT 1 CHECK (consented IN (0, 1)),
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    revoked_at_utc TEXT
);
CREATE INDEX IF NOT EXISTS idx_ai_voice_consents_user ON ai_voice_consents(user_id, consent_scope, revoked_at_utc);

CREATE TABLE IF NOT EXISTS ai_asr_jobs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    language_mode TEXT NOT NULL DEFAULT 'auto' CHECK (language_mode IN ('auto', 'bn', 'en')),
    detected_language TEXT NOT NULL DEFAULT 'unknown',
    model_id TEXT NOT NULL,
    audio_format TEXT NOT NULL DEFAULT 'wav',
    duration_sec REAL NOT NULL DEFAULT 0.0,
    byte_size INTEGER NOT NULL DEFAULT 0,
    raw_transcript TEXT NOT NULL DEFAULT '',
    confirmed_transcript TEXT,
    was_edited INTEGER NOT NULL DEFAULT 0 CHECK (was_edited IN (0, 1)),
    is_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (is_confirmed IN (0, 1)),
    latency_ms INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'TRANSCRIBED' CHECK (status IN ('TRANSCRIBED', 'CONFIRMED', 'FAILED', 'MODEL_UNAVAILABLE')),
    limitation_note TEXT NOT NULL DEFAULT '',
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    confirmed_at_utc TEXT
);
CREATE INDEX IF NOT EXISTS idx_ai_asr_jobs_user ON ai_asr_jobs(user_id, created_at_utc);

CREATE TABLE IF NOT EXISTS ai_chat_sessions (
    id TEXT PRIMARY KEY,
    owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    owner_role TEXT NOT NULL CHECK (owner_role IN ('PATIENT', 'DOCTOR', 'ADMIN', 'SUPPORT')),
    patient_profile_id TEXT REFERENCES patient_profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL DEFAULT 'New Health Assistant Chat',
    language_mode TEXT NOT NULL DEFAULT 'auto' CHECK (language_mode IN ('auto', 'bn', 'en')),
    scope TEXT NOT NULL DEFAULT 'MEDICAL_INFO' CHECK (scope IN ('MEDICAL_INFO', 'SUPPORT_FAQ', 'CLINICAL_REF', 'OCR_EXPLAIN')),
    is_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0, 1)),
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_owner ON ai_chat_sessions(owner_user_id, is_deleted, updated_at_utc);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('USER', 'ASSISTANT', 'SYSTEM_NOTICE')),
    input_modality TEXT NOT NULL DEFAULT 'TEXT' CHECK (input_modality IN ('TEXT', 'VOICE', 'OCR_EXPLAIN')),
    language_detected TEXT NOT NULL DEFAULT 'en',
    content_text TEXT NOT NULL,
    grounded_status TEXT NOT NULL DEFAULT 'GROUNDED' CHECK (grounded_status IN ('GROUNDED', 'ABSTAINED', 'EMERGENCY_ESCALATION', 'SAFETY_REFUSAL', 'MODEL_UNAVAILABLE', 'USER_INPUT')),
    model_id TEXT NOT NULL DEFAULT '',
    index_version TEXT NOT NULL DEFAULT '',
    latency_ms INTEGER NOT NULL DEFAULT 0,
    safety_flags_json TEXT NOT NULL DEFAULT '[]',
    asr_job_id TEXT REFERENCES ai_asr_jobs(id) ON DELETE SET NULL,
    ocr_job_id TEXT REFERENCES ocr_jobs(id) ON DELETE SET NULL,
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session ON ai_chat_messages(session_id, created_at_utc);

CREATE TABLE IF NOT EXISTS ai_message_citations (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL REFERENCES ai_chat_messages(id) ON DELETE CASCADE,
    citation_num INTEGER NOT NULL,
    source_id TEXT NOT NULL REFERENCES rag_sources(id) ON DELETE CASCADE,
    chunk_id TEXT REFERENCES rag_chunks(id) ON DELETE SET NULL,
    source_title TEXT NOT NULL,
    publisher TEXT NOT NULL,
    page_or_section_ref TEXT NOT NULL DEFAULT '',
    source_url TEXT NOT NULL DEFAULT '',
    snippet_text TEXT NOT NULL,
    score REAL NOT NULL DEFAULT 0.0
);
CREATE INDEX IF NOT EXISTS idx_ai_citations_msg ON ai_message_citations(message_id, citation_num);

CREATE TABLE IF NOT EXISTS ai_feedback (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL REFERENCES ai_chat_messages(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating TEXT NOT NULL CHECK (rating IN ('HELPFUL', 'NOT_HELPFUL')),
    comment_text TEXT NOT NULL DEFAULT '',
    created_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (message_id, user_id)
);

CREATE TABLE IF NOT EXISTS ocr_job_artifacts (
    id TEXT PRIMARY KEY,
    ocr_job_id TEXT NOT NULL UNIQUE REFERENCES ocr_jobs(id) ON DELETE CASCADE,
    stored_file_path TEXT NOT NULL DEFAULT '',
    source_mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
    page_count INTEGER NOT NULL DEFAULT 1,
    raw_full_text TEXT NOT NULL DEFAULT '',
    corrected_full_text TEXT,
    bounding_boxes_json TEXT NOT NULL DEFAULT '[]',
    page_previews_json TEXT NOT NULL DEFAULT '[]',
    uncertain_fields_count INTEGER NOT NULL DEFAULT 0,
    review_action TEXT NOT NULL DEFAULT 'DRAFT' CHECK (review_action IN ('DRAFT', 'SAVED_DRAFT', 'VERIFIED', 'DISCARDED')),
    authorization_state TEXT NOT NULL DEFAULT 'RAW_OCR' CHECK (authorization_state IN ('RAW_OCR', 'PATIENT_CORRECTED', 'PATIENT_ACKNOWLEDGED', 'DOCTOR_VERIFIED', 'AUTHORIZED_MEDICATION_PLAN')),
    patient_acknowledged_by_user_id TEXT REFERENCES users(id),
    patient_acknowledged_at_utc TEXT,
    clinician_verified_by_user_id TEXT REFERENCES users(id),
    clinician_verified_at_utc TEXT,
    last_explained_at_utc TEXT,
    updated_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS ai_runtime_snapshots (
    id TEXT PRIMARY KEY,
    component_key TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('READY', 'LOADING', 'UNAVAILABLE', 'PROCESSING', 'FAILED')),
    model_id TEXT NOT NULL DEFAULT '',
    device_label TEXT NOT NULL DEFAULT 'cpu',
    vram_used_mb REAL DEFAULT 0.0,
    detail_json TEXT NOT NULL DEFAULT '{}',
    updated_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
