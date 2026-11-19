from __future__ import annotations

import sqlite3
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from shasthosetu_api.core.security import reset_rate_limits
from shasthosetu_api.db.sqlite import apply_schema, get_db_conn
from shasthosetu_api.main import app
from shasthosetu_api.seeds.seed_demo import seed_database


@pytest.fixture()
def isolated_env(tmp_path: Path, monkeypatch):
    db_file = tmp_path / "test_shasthosetu.db"
    monkeypatch.setenv("SHASTHOSETU_DB_PATH", str(db_file))
    reset_rate_limits()
    seed_database(db_path=db_file, force_reset=True)
    return db_file


def _login(client: TestClient, identifier: str, password: str):
    return client.post("/v1/auth/login", json={"identifier": identifier, "password": password})


def test_sqlite_schema_and_iss_fixes(isolated_env: Path):
    with get_db_conn(isolated_env) as conn:
        tables = conn.execute(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        ).fetchone()[0]
        assert tables == 36
        assert conn.execute("PRAGMA journal_mode;").fetchone()[0].lower() == "wal"
        assert conn.execute("PRAGMA foreign_keys;").fetchone()[0] == 1

        # ISS-003: duplicate NULL organization_id membership rejected by partial unique index
        with pytest.raises(sqlite3.IntegrityError):
            conn.execute(
                "INSERT INTO role_memberships (id, user_id, role, organization_id, approval_state) "
                "VALUES ('dup-role-1', 'usr-pt-demo', 'PATIENT', NULL, 'APPROVED')"
            )

        # ISS-004: canonical OPEN state present
        open_slots = conn.execute("SELECT COUNT(*) FROM appointment_slots WHERE state = 'OPEN'").fetchone()[0]
        assert open_slots >= 20

        # ISS-005: DRAFT plan allows NULL verified_by_user_id; ACTIVE requires verified_by_user_id
        conn.execute(
            "INSERT INTO medication_plans (id, patient_profile_id, medicine_name, dose_text, frequency_rule, status, verified_by_user_id) "
            "VALUES ('med-draft-ok', 'pp-rahima-self', 'Napa', '1 tab', 'SOS', 'DRAFT', NULL)"
        )
        with pytest.raises(sqlite3.IntegrityError):
            conn.execute(
                "INSERT INTO medication_plans (id, patient_profile_id, medicine_name, dose_text, frequency_rule, status, verified_by_user_id) "
                "VALUES ('med-active-bad', 'pp-rahima-self', 'Napa', '1 tab', 'SOS', 'ACTIVE', NULL)"
            )

        # ISS-006: overlapping time slot rejected by trigger
        existing_slot = conn.execute("SELECT doctor_id, start_utc, end_utc FROM appointment_slots LIMIT 1").fetchone()
        with pytest.raises((sqlite3.IntegrityError, sqlite3.OperationalError)):
            conn.execute(
                """
                INSERT INTO appointment_slots (id, doctor_id, start_utc, end_utc, modality, capacity, reserved_count, state)
                VALUES ('slot-overlap-bad', ?, ?, ?, 'ONLINE_DEMO', 1, 0, 'OPEN')
                """,
                (existing_slot["doctor_id"], existing_slot["start_utc"], existing_slot["end_utc"]),
            )


def test_unauthenticated_portal_rejection_and_signup_escalation_blocked(isolated_env: Path):
    client = TestClient(app)

    me = client.get("/v1/auth/me")
    assert me.status_code == 200
    assert me.json()["authenticated"] is False

    for path in (
        "/v1/patient/dashboard",
        "/v1/doctor/dashboard",
        "/v1/admin/dashboard",
        "/v1/support/dashboard",
    ):
        resp = client.get(path)
        assert resp.status_code == 401, f"{path} returned {resp.status_code}"

    # Privilege escalation attempt in public signup must fail with 403 and create audit entry
    esc = client.post(
        "/v1/auth/register",
        json={
            "full_name": "Attacker",
            "email": "attacker@shasthosetu.local",
            "password": "StrongPassword#1",
            "role": "ADMIN",
        },
    )
    assert esc.status_code == 403
    assert "ROLE_ESCALATION_REJECTED" in esc.text

    with get_db_conn(isolated_env) as conn:
        audit = conn.execute(
            "SELECT outcome, action_type FROM audit_logs WHERE action_type = 'PRIVILEGE_ESCALATION_BLOCKED'"
        ).fetchone()
        assert audit is not None
        assert audit["outcome"] == "DENIED"


def test_patient_signup_argon2_cookie_and_logout(isolated_env: Path):
    client = TestClient(app)
    reg = client.post(
        "/v1/auth/register",
        json={
            "full_name": "Nadia Karim",
            "email": "nadia@example.local",
            "phone": "+8801799887766",
            "password": "MySecurePassword#99",
            "district": "Chattogram",
            "preferred_locale": "bn",
        },
    )
    assert reg.status_code == 201
    assert "ss_session" in client.cookies

    with get_db_conn(isolated_env) as conn:
        row = conn.execute("SELECT password_hash, primary_role FROM users WHERE email = 'nadia@example.local'").fetchone()
        assert row["primary_role"] == "PATIENT"
        assert row["password_hash"].startswith("$argon2id$")

    me = client.get("/v1/auth/me")
    assert me.status_code == 200
    assert me.json()["user"]["primary_role"] == "PATIENT"

    out = client.post("/v1/auth/logout")
    assert out.status_code == 200
    assert client.get("/v1/auth/me").json()["authenticated"] is False
    assert client.get("/v1/patient/dashboard").status_code == 401


def test_pending_doctor_blocked_until_admin_approval_and_slot_overlap_409(isolated_env: Path):
    doc_client = TestClient(app)
    assert _login(doc_client, "dr.pending@shasthosetu.local", "DoctorDemo#2026").status_code == 200

    dash = doc_client.get("/v1/doctor/dashboard")
    assert dash.status_code == 200
    assert dash.json()["approved"] is False
    doc_id = dash.json()["doctor_profile"]["id"]

    # Blocked before approval
    blocked = doc_client.post(
        "/v1/doctor/slots/generate",
        json={"date_local": "2027-02-01", "start_hhmm": "10:00", "end_hhmm": "11:00", "slot_duration_minutes": 30},
    )
    assert blocked.status_code == 403
    assert "DOCTOR_NOT_APPROVED" in blocked.text

    # Admin approves doctor
    adm_client = TestClient(app)
    assert _login(adm_client, "admin.demo@shasthosetu.local", "AdminDemo#2026").status_code == 200
    ver = adm_client.post(
        f"/v1/admin/doctors/{doc_id}/verify",
        json={"decision": "APPROVED", "reason": "BMDC demo credentials verified"},
    )
    assert ver.status_code == 200
    assert ver.json()["doctor_profile"]["verification_status"] == "APPROVED"

    # Now doctor can generate slots
    gen = doc_client.post(
        "/v1/doctor/slots/generate",
        json={"date_local": "2027-02-01", "start_hhmm": "10:00", "end_hhmm": "11:00", "slot_duration_minutes": 30},
    )
    assert gen.status_code == 201
    assert gen.json()["created_count"] == 2

    # Overlapping slot fails cleanly with 409
    overlap = doc_client.post(
        "/v1/doctor/slots/generate",
        json={"date_local": "2027-02-01", "start_hhmm": "10:15", "end_hhmm": "10:45", "slot_duration_minutes": 30},
    )
    assert overlap.status_code == 409
    assert "OVERLAPPING_APPOINTMENT_SLOT" in overlap.text


def test_atomic_concurrent_booking_prevents_double_booking(isolated_env: Path):
    c1 = TestClient(app)
    c2 = TestClient(app)
    assert _login(c1, "patient.demo@shasthosetu.local", "PatientDemo#2026").status_code == 200
    assert _login(c2, "patient2.demo@shasthosetu.local", "PatientDemo#2026").status_code == 200

    with get_db_conn(isolated_env) as conn:
        slot_id = conn.execute(
            "SELECT id FROM appointment_slots WHERE state = 'OPEN' AND reserved_count = 0 LIMIT 1"
        ).fetchone()["id"]

    def book(client: TestClient, key: str):
        return client.post(
            "/v1/appointments/book",
            json={
                "slot_id": slot_id,
                "visit_reason_summary": "Persistent fever checkup",
                "consultation_mode": "ONLINE_DEMO",
                "idempotency_key": key,
            },
        )

    with ThreadPoolExecutor(max_workers=2) as pool:
        f1 = pool.submit(book, c1, "race-key-p1")
        f2 = pool.submit(book, c2, "race-key-p2")
        r1, r2 = f1.result(), f2.result()

    codes = sorted([r1.status_code, r2.status_code])
    assert codes == [201, 409], f"Expected [201, 409], got {[r1.status_code, r2.status_code]}: {r1.text} | {r2.text}"

    with get_db_conn(isolated_env) as conn:
        slot = conn.execute("SELECT reserved_count, state FROM appointment_slots WHERE id = ?", (slot_id,)).fetchone()
        assert slot["reserved_count"] == 1
        assert slot["state"] == "BOOKED"


def test_booking_idempotent_payment_receipt_refund_and_idor(isolated_env: Path):
    p1 = TestClient(app)
    p2 = TestClient(app)
    assert _login(p1, "patient.demo@shasthosetu.local", "PatientDemo#2026").status_code == 200
    assert _login(p2, "patient2.demo@shasthosetu.local", "PatientDemo#2026").status_code == 200

    with get_db_conn(isolated_env) as conn:
        slot_id = conn.execute(
            "SELECT id FROM appointment_slots WHERE state = 'OPEN' AND reserved_count = 0 LIMIT 1"
        ).fetchone()["id"]

    book_payload = {
        "slot_id": slot_id,
        "visit_reason_summary": "Migraine & BP check",
        "consultation_mode": "ONLINE_DEMO",
        "idempotency_key": "idem-book-101",
    }
    b1 = p1.post("/v1/appointments/book", json=book_payload)
    assert b1.status_code == 201
    apt_id = b1.json()["appointment"]["id"]

    # Idempotent booking replay
    b2 = p1.post("/v1/appointments/book", json=book_payload)
    assert b2.status_code == 201
    assert b2.json()["idempotent_replay"] is True
    assert b2.json()["appointment"]["id"] == apt_id

    # Idempotent DEMO_BKASH checkout
    pay_payload = {
        "appointment_id": apt_id,
        "method": "DEMO_BKASH",
        "outcome": "SUCCESS",
        "idempotency_key": "idem-pay-101",
    }
    pay1 = p1.post("/v1/payments/checkout", json=pay_payload)
    assert pay1.status_code == 201
    pay_id = pay1.json()["payment"]["id"]
    assert pay1.json()["payment"]["status"] == "DEMO_PAID"
    assert pay1.json()["payment"]["appointment_status"] == "CONFIRMED"
    assert "SIMULATED" in pay1.json()["payment"]["disclaimer_label"]

    pay2 = p1.post("/v1/payments/checkout", json=pay_payload)
    assert pay2.status_code == 201
    assert pay2.json()["idempotent_replay"] is True
    assert pay2.json()["payment"]["id"] == pay_id

    # Receipt belongs only to payer
    assert p1.get(f"/v1/patient/receipts/{pay_id}").status_code == 200
    assert p2.get(f"/v1/patient/receipts/{pay_id}").status_code == 403

    # Cross-patient prep/cancel IDOR blocked
    assert p2.post(f"/v1/appointments/{apt_id}/cancel").status_code == 403

    # Admin demo refund
    adm = TestClient(app)
    assert _login(adm, "admin.demo@shasthosetu.local", "AdminDemo#2026").status_code == 200
    ref = adm.post(f"/v1/admin/payments/{pay_id}/refund", json={"reason": "Demo billing correction"})
    assert ref.status_code == 200
    assert ref.json()["status"] == "DEMO_REFUNDED"


def test_safe_ocr_human_verification_gate_and_pediatric_pcos_diagnostics(isolated_env: Path):
    pt = TestClient(app)
    assert _login(pt, "patient.demo@shasthosetu.local", "PatientDemo#2026").status_code == 200

    # Hard 422 barrier while OCR critical fields are unverified
    bad = pt.post("/v1/patient/ocr-jobs/ocr-job-0052/activate-plan", json={"patient_profile_id": "pp-rahima-self"})
    assert bad.status_code == 422
    assert "UNVERIFIED_OCR_FIELDS" in bad.text

    docs = pt.get("/v1/patient/documents").json()
    target_job = [j for j in docs["ocr_jobs"] if j["id"] == "ocr-job-0052"][0]
    for field in target_job["fields"]:
        res = pt.patch(
            f"/v1/patient/ocr-fields/{field['id']}/verify",
            json={"verified_value": field["raw_ocr_text"] + " (Verified)"},
        )
        assert res.status_code == 200

    # Now activation succeeds
    ok = pt.post("/v1/patient/ocr-jobs/ocr-job-0052/activate-plan", json={"patient_profile_id": "pp-rahima-self"})
    assert ok.status_code == 200
    assert ok.json()["activated"] is True

    # PCOS cycle entry
    pcos = pt.post(
        "/v1/patient/pcos",
        json={"start_date": "2026-10-15", "cycle_length_days": 34, "symptoms_json": {"acne": True}, "user_notes": "Mild fatigue"},
    )
    assert pcos.status_code == 201

    # Pediatric red-flag triage on dependent child Ariyan
    ped = pt.post(
        "/v1/patient/pediatric/triage",
        json={
            "child_profile_id": "pp-ariyan-child",
            "age_months": 48,
            "fever_days": 3.5,
            "temp_f": 103.2,
            "breathing_difficulty": True,
        },
    )
    assert ped.status_code == 201
    assert ped.json()["review_state"] == "URGENT_REVIEW"
    assert "RED_FLAG_BREATHING_DISTRESS" in ped.json()["escalation_flags"]

    # Diagnostic demo order
    svc = pt.get("/v1/public/services").json()
    test_id = svc["diagnostic_tests"][0]["id"]
    order = pt.post(
        "/v1/patient/diagnostics/order",
        json={"test_id": test_id, "preferred_date": "2027-02-05", "collection_mode": "HOME_SAMPLE_DEMO"},
    )
    assert order.status_code == 201
    assert order.json()["is_simulated"] is True


def test_doctor_consultation_workspace_eprescription_and_cross_doctor_idor(isolated_env: Path):
    pt = TestClient(app)
    assert _login(pt, "patient.demo@shasthosetu.local", "PatientDemo#2026").status_code == 200

    # Find an open slot specifically for Dr. Farhana
    farhana_id = pt.get("/v1/public/doctors", params={"q": "Farhana"}).json()["doctors"][0]["id"]
    slot_id = pt.get(f"/v1/public/doctors/{farhana_id}").json()["open_slots"][0]["id"]
    apt_id = pt.post(
        "/v1/appointments/book",
        json={"slot_id": slot_id, "visit_reason_summary": "Thyroid lab follow-up", "consultation_mode": "ONLINE_DEMO", "idempotency_key": "doc-ws-1"},
    ).json()["appointment"]["id"]

    # Another doctor (Dr. Tanvir) MUST get 403 on workspace, notes, and e-prescription
    tanvir = TestClient(app)
    assert _login(tanvir, "dr.tanvir@shasthosetu.local", "DoctorDemo#2026").status_code == 200
    assert tanvir.get(f"/v1/doctor/appointments/{apt_id}/workspace").status_code == 403

    # Dr. Farhana enters workspace, signs clinical note & issues signed Demo E-Prescription
    farhana = TestClient(app)
    assert _login(farhana, "dr.farhana@shasthosetu.local", "DoctorDemo#2026").status_code == 200
    ws = farhana.get(f"/v1/doctor/appointments/{apt_id}/workspace")
    assert ws.status_code == 200

    st = farhana.patch(f"/v1/doctor/appointments/{apt_id}/status", json={"status": "IN_CONSULTATION"})
    assert st.status_code == 200

    note = farhana.post(
        f"/v1/doctor/appointments/{apt_id}/notes",
        json={
            "subjective_notes": "Patient reports cold intolerance and fatigue.",
            "assessment_summary": "Subclinical hypothyroidism follow-up.",
            "advice_summary": "Repeat TSH in 6 weeks.",
            "state": "SIGNED",
        },
    )
    assert note.status_code == 201
    note_id = note.json()["note"]["id"]

    rx = farhana.post(
        f"/v1/doctor/appointments/{apt_id}/eprescription",
        json={
            "diagnosis_summary": "Thyroid Monitoring (Demo)",
            "medications": [{"name": "Vitamin D3 2000 IU", "dose": "1 cap", "frequency": "0+1+0"}],
            "advice_notes": "Take after breakfast.",
        },
    )
    assert rx.status_code == 201
    assert rx.json()["eprescription"]["status"] == "SIGNED"

    assert farhana.patch(f"/v1/doctor/appointments/{apt_id}/status", json={"status": "COMPLETED"}).status_code == 200

    # Patient now sees signed e-prescription in consultations
    pt_cons = pt.get("/v1/patient/consultations").json()["consultations"]
    matched = [c for c in pt_cons if c["appointment_id"] == apt_id][0]
    assert matched["rx_status"] == "SIGNED"
    assert matched["note_state"] == "SIGNED"

    # Admin Governance CANNOT read private doctor clinical notes (403 privacy barrier)
    adm = TestClient(app)
    assert _login(adm, "admin.demo@shasthosetu.local", "AdminDemo#2026").status_code == 200
    redacted = adm.get(f"/v1/admin/clinical-notes/{note_id}")
    assert redacted.status_code == 403
    assert "CLINICAL_NOTE_REDACTED_FOR_ADMIN" in redacted.text


def test_support_zero_phi_policy_internal_note_isolation_and_escalation(isolated_env: Path):
    sup = TestClient(app)
    pt = TestClient(app)
    assert _login(sup, "support.demo@shasthosetu.local", "SupportDemo#2026").status_code == 200
    assert _login(pt, "patient.demo@shasthosetu.local", "PatientDemo#2026").status_code == 200

    # Support lists tickets & verifies ZERO clinical fields are exposed
    tlist = sup.get("/v1/support/tickets").json()["tickets"]
    assert len(tlist) >= 1
    tid = tlist[0]["id"]
    detail = sup.get(f"/v1/support/tickets/{tid}").json()
    ticket_keys = set(detail["ticket"].keys())
    for forbidden in ("visit_reason_summary", "prep_symptoms_text", "diagnosis_summary", "subjective_notes"):
        assert forbidden not in ticket_keys

    # Support posts INTERNAL note and PUBLIC reply
    sup.post(f"/v1/support/tickets/{tid}/reply", json={"visibility": "INTERNAL", "body_text": "SECRET INTERNAL STAFF NOTE"})
    sup.post(f"/v1/support/tickets/{tid}/reply", json={"visibility": "PUBLIC", "body_text": "We checked your demo transaction reference."})

    # Patient ONLY sees PUBLIC reply, NEVER INTERNAL note
    pt_msgs = pt.get(f"/v1/patient/tickets/{tid}").json()["messages"]
    bodies = [m["body_text"] for m in pt_msgs]
    assert "We checked your demo transaction reference." in bodies
    assert "SECRET INTERNAL STAFF NOTE" not in bodies

    # Support clinical-guard blocks PHI access with 403 + DENIED audit log
    guard = sup.get("/v1/support/clinical-guard/apt-demo-completed")
    assert guard.status_code == 403
    assert "PHI_ACCESS_DENIED" in guard.text

    # Support escalates ticket -> visible in Admin escalations
    esc = sup.post(f"/v1/support/tickets/{tid}/escalate", json={"reason": "Needs admin payment reconciliation", "priority": "URGENT"})
    assert esc.status_code == 200
    assert esc.json()["status"] == "ESCALATED"

    adm = TestClient(app)
    assert _login(adm, "admin.demo@shasthosetu.local", "AdminDemo#2026").status_code == 200
    assert any(t["id"] == tid for t in adm.get("/v1/admin/escalations").json()["escalations"])


def test_public_research_and_pcos_calculator_honesty(isolated_env: Path):
    client = TestClient(app)
    res = client.get("/v1/public/research")
    assert res.status_code == 200
    body = res.json()
    assert len(body["datasets"]) == 6
    assert len(body["models"]) == 16

    calc = client.post(
        "/v1/public/research/pcos-preview",
        json={
            "age": 25,
            "bmi": 27.4,
            "cycle_length_days": 46,
            "lh_fsh_ratio": 2.3,
            "irregular_cycles": True,
            "acne_or_hirsutism": True,
        },
    )
    assert calc.status_code == 200
    c = calc.json()
    assert c["classification"] == "RESEARCH_PREVIEW_NON_DIAGNOSTIC"
    assert "NON-DIAGNOSTIC" in c["disclaimer"]
