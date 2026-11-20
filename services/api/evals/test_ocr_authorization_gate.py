"""
ShasthoSetu AI — Targeted OCR Human/Clinician Authorization Security Gate Test Suite
Task ID: PROJECT-FINAL-DEMO-GATE-03 (Task 3)

Validates:
1. Patient acknowledgement only verifies transcription/field correctness.
2. Patient verification does NOT create clinician authorization (authorization_state != DOCTOR_VERIFIED).
3. Patient-edited medication dosages CANNOT activate a clinician-authorized medication plan (HTTP 403).
4. CLINICIAN_VERIFY requires real approved doctor authorization (HTTP 403 for non-doctors).
5. Unapproved/pending doctors cannot clinically verify (HTTP 403).
6. Cross-patient OCR job IDs cannot be accessed or modified (HTTP 403).
7. Unverified critical fields block medication plan activation (HTTP 422).
8. Real approved doctor can clinically verify when consented appointment exists.
"""

import sys
import json
from pathlib import Path

workspace_root = Path(__file__).resolve().parents[3]
api_src = workspace_root / "services" / "api" / "src"
for p in [str(workspace_root), str(api_src)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from fastapi.testclient import TestClient
from shasthosetu_api.main import app
from shasthosetu_api.db.sqlite import get_db_conn
from shasthosetu_api.core.security import new_id, utc_now_iso

DEMO_PASSWORDS = {
    "patient.demo@shasthosetu.local": "PatientDemo#2026",
    "patient2.demo@shasthosetu.local": "PatientDemo#2026",
    "dr.farhana@shasthosetu.local": "DoctorDemo#2026",
    "dr.tanvir@shasthosetu.local": "DoctorDemo#2026",
    "dr.pending@shasthosetu.local": "DoctorDemo#2026",
    "admin.demo@shasthosetu.local": "AdminDemo#2026",
    "support.demo@shasthosetu.local": "SupportDemo#2026",
}

def create_user_client(identifier: str) -> tuple[TestClient, dict]:
    c = TestClient(app)
    pwd = DEMO_PASSWORDS.get(identifier, "PatientDemo#2026")
    resp = c.post("/v1/auth/login", json={"identifier": identifier, "password": pwd})
    if resp.status_code != 200:
        raise RuntimeError(f"Login failed for {identifier}: {resp.status_code} {resp.text}")
    data = resp.json()
    if "csrf_token" in data:
        c.headers["x-csrf-token"] = data["csrf_token"]
    return c, data["user"]

def run_ocr_authorization_tests():
    print("=" * 65)
    print("SHASTHOSETU AI — OCR CLINICAL AUTHORIZATION & ISOLATION GATES")
    print("=" * 65)

    # 1. Log in users with individual session cookies
    c_p1, patient1 = create_user_client("patient.demo@shasthosetu.local")
    c_p2, patient2 = create_user_client("patient2.demo@shasthosetu.local")
    c_doc, approved_doc = create_user_client("dr.farhana@shasthosetu.local")
    c_pending, pending_doc = create_user_client("dr.pending@shasthosetu.local")
    c_support, support_user = create_user_client("support.demo@shasthosetu.local")

    # Set up synthetic OCR job for patient 1
    job_id = f"ocr-test-auth-{new_id('')[:8]}"
    doc_id = f"mdoc-test-{new_id('')[:8]}"
    now = utc_now_iso()

    with get_db_conn() as conn:
        p1_profile = conn.execute("SELECT id FROM patient_profiles WHERE owner_user_id = ?", (patient1["id"],)).fetchone()["id"]
        p2_profile = conn.execute("SELECT id FROM patient_profiles WHERE owner_user_id = ?", (patient2["id"],)).fetchone()["id"]
        approved_doc_profile = conn.execute("SELECT id FROM doctor_profiles WHERE user_id = ?", (approved_doc["id"],)).fetchone()["id"]

        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            """
            INSERT INTO medical_documents (id, patient_profile_id, uploaded_by_user_id, doc_type, original_filename, storage_object_key, mime_type, byte_size, sha256_hash, is_synthetic, created_at_utc)
            VALUES (?, ?, ?, 'PRESCRIPTION', 'Synthetic Test Rx.png', ?, 'image/png', 1024, 'test-sha256', 1, ?)
            """,
            (doc_id, p1_profile, patient1["id"], f"vault/synth/test-{doc_id}.png", now),
        )
        conn.execute(
            """
            INSERT INTO ocr_jobs (id, document_id, engine_version, status, mean_confidence, elapsed_ms, created_at_utc)
            VALUES (?, ?, 'EasyOCR-Bilingual-v2', 'NEEDS_REVIEW', 0.92, 120, ?)
            """,
            (job_id, doc_id, now),
        )
        conn.execute(
            """
            INSERT INTO ocr_job_artifacts (id, ocr_job_id, raw_full_text, review_action, authorization_state, updated_at_utc)
            VALUES (?, ?, 'Tab Paracetamol 500mg 1+0+1 5 days', 'DRAFT', 'RAW_OCR', ?)
            """,
            (new_id("ocra"), job_id, now),
        )
        f1_id = new_id("ocrf")
        f2_id = new_id("ocrf")
        conn.execute(
            """
            INSERT INTO ocr_fields (id, ocr_job_id, group_index, field_type, raw_ocr_text, confidence, is_critical, is_verified, updated_at_utc)
            VALUES (?, ?, 0, 'MEDICINE_NAME', 'Paracetamol', 0.95, 1, 0, ?)
            """,
            (f1_id, job_id, now),
        )
        conn.execute(
            """
            INSERT INTO ocr_fields (id, ocr_job_id, group_index, field_type, raw_ocr_text, confidence, is_critical, is_verified, updated_at_utc)
            VALUES (?, ?, 0, 'DOSE', '500mg', 0.90, 1, 0, ?)
            """,
            (f2_id, job_id, now),
        )
        conn.execute("COMMIT;")

    tests_run = []

    # TEST 1: Cross-Patient Isolation: Patient 2 cannot access Patient 1's OCR job
    r = c_p2.get(f"/v1/ai/ocr/{job_id}")
    assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"
    assert "belongs to another patient" in r.text
    print("[PASS] Test 1: Cross-patient isolation enforced (Patient 2 blocked from Patient 1 OCR job: HTTP 403)")
    tests_run.append("cross_patient_blocked_403")

    # TEST 2: Support Agent cannot access private OCR job
    r = c_support.get(f"/v1/ai/ocr/{job_id}")
    assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"
    print("[PASS] Test 2: Support Zero-PHI enforced (Support blocked from reading OCR job: HTTP 403)")
    tests_run.append("support_ocr_phi_blocked_403")

    # TEST 3: Patient verifies fields -> Transcription verified, BUT authorization_state is NOT DOCTOR_VERIFIED
    r = c_p1.post(
        f"/v1/ai/ocr/{job_id}/verify",
        json={
            "action": "VERIFY",
            "verified_fields": {f1_id: "Paracetamol", f2_id: "500mg"}
        }
    )
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    res = r.json()
    assert res["status"] == "VERIFIED"
    assert res["authorization_state"] == "PATIENT_ACKNOWLEDGED"
    assert res["clinician_verified"] is False
    assert res["clinician_authorized_rx"] is False
    assert res["reminder_auto_enabled"] is False
    print("[PASS] Test 3: Patient verification records transcription ONLY (authorization_state=PATIENT_ACKNOWLEDGED, clinician_verified=False)")
    tests_run.append("patient_verify_not_clinician_authorized")

    # TEST 4: Patient attempts CLINICIAN_VERIFY directly -> Denied with HTTP 403
    r = c_p1.post(
        f"/v1/ai/ocr/{job_id}/verify",
        json={"action": "CLINICIAN_VERIFY"}
    )
    assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"
    assert "CLINICIAN_AUTHORIZATION_REQUIRED" in r.text
    print("[PASS] Test 4: Patient calling CLINICIAN_VERIFY denied with HTTP 403 (CLINICIAN_AUTHORIZATION_REQUIRED)")
    tests_run.append("patient_clinician_verify_denied_403")

    # TEST 5: Patient attempts to activate CLINICIAN_AUTHORIZED_PLAN -> Denied with HTTP 403
    r = c_p1.post(
        f"/v1/patient/ocr-jobs/{job_id}/activate-plan",
        json={
            "patient_profile_id": p1_profile,
            "activation_mode": "CLINICIAN_AUTHORIZED_PLAN"
        }
    )
    assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"
    assert "CLINICIAN_VERIFICATION_REQUIRED" in r.text
    print("[PASS] Test 5: Patient activating CLINICIAN_AUTHORIZED_PLAN blocked with HTTP 403 (Clinician verification required)")
    tests_run.append("patient_cannot_activate_clinician_plan_403")

    # TEST 6: Pending (unapproved) doctor attempts to access or verify OCR job -> Denied with HTTP 403
    r = c_pending.post(
        f"/v1/ai/ocr/{job_id}/verify",
        json={"action": "CLINICIAN_VERIFY"}
    )
    assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"
    assert "DOCTOR_NOT_APPROVED" in r.text
    print("[PASS] Test 6: Pending doctor blocked from clinical verification (DOCTOR_NOT_APPROVED: HTTP 403)")
    tests_run.append("pending_doctor_blocked_403")

    # TEST 7: Approved doctor without consented appointment -> Denied with HTTP 403
    c_unconsented_doc, _ = create_user_client("dr.tanvir@shasthosetu.local")
    r = c_unconsented_doc.post(
        f"/v1/ai/ocr/{job_id}/verify",
        json={"action": "CLINICIAN_VERIFY"}
    )
    assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"
    assert "patient has not shared records" in r.text
    print("[PASS] Test 7: Approved doctor without appointment consent blocked from private OCR job: HTTP 403")
    tests_run.append("unconsented_doctor_blocked_403")

    # TEST 8: Consented Approved Doctor -> CLINICIAN_VERIFY succeeds and sets DOCTOR_VERIFIED
    r = c_doc.post(
        f"/v1/ai/ocr/{job_id}/verify",
        json={"action": "CLINICIAN_VERIFY"}
    )
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    res = r.json()
    assert res["status"] == "VERIFIED"
    assert res["authorization_state"] == "DOCTOR_VERIFIED"
    assert res["clinician_verified"] is True
    assert res["clinician_authorized_rx"] is True
    print("[PASS] Test 8: Consented approved doctor CLINICIAN_VERIFY succeeds (authorization_state=DOCTOR_VERIFIED, clinician_verified=True)")
    tests_run.append("consented_doctor_clinician_verify_200")

    # TEST 9: Now that clinician verification has occurred, patient can activate CLINICIAN_AUTHORIZED_PLAN
    r = c_p1.post(
        f"/v1/patient/ocr-jobs/{job_id}/activate-plan",
        json={
            "patient_profile_id": p1_profile,
            "activation_mode": "CLINICIAN_AUTHORIZED_PLAN"
        }
    )
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    plan_data = r.json()
    assert plan_data["plan_status"] == "ACTIVE"
    assert plan_data["clinician_authorized"] is True
    print("[PASS] Test 9: Clinician-authorized plan successfully activated after doctor approval (status=ACTIVE, clinician_authorized=True)")
    tests_run.append("clinician_authorized_plan_activated_201")

    # TEST 10: Critical unverified field blocks plan activation (HTTP 422)
    job_unver = f"ocr-test-unver-{new_id('')[:8]}"
    doc_unver = f"mdoc-unver-{new_id('')[:8]}"
    with get_db_conn() as conn:
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            "INSERT INTO medical_documents (id, patient_profile_id, uploaded_by_user_id, doc_type, original_filename, storage_object_key, mime_type, byte_size, sha256_hash, is_synthetic, created_at_utc) VALUES (?, ?, ?, 'PRESCRIPTION', 'Unverified.png', ?, 'image/png', 1024, 'test-unver', 1, ?)",
            (doc_unver, p1_profile, patient1["id"], f"vault/synth/test-{doc_unver}.png", now),
        )
        conn.execute(
            "INSERT INTO ocr_jobs (id, document_id, engine_version, status, mean_confidence, elapsed_ms, created_at_utc) VALUES (?, ?, 'EasyOCR', 'NEEDS_REVIEW', 0.6, 100, ?)",
            (job_unver, doc_unver, now),
        )
        conn.execute(
            "INSERT INTO ocr_fields (id, ocr_job_id, group_index, field_type, raw_ocr_text, confidence, is_critical, is_verified, updated_at_utc) VALUES (?, ?, 0, 'MEDICINE_NAME', 'Uncertain Med', 0.4, 1, 0, ?)",
            (new_id("ocrf"), job_unver, now),
        )
        conn.execute("COMMIT;")

    r = c_p1.post(
        f"/v1/patient/ocr-jobs/{job_unver}/activate-plan",
        json={
            "patient_profile_id": p1_profile,
            "activation_mode": "PATIENT_REMINDER_DRAFT"
        }
    )
    assert r.status_code == 422, f"Expected 422, got {r.status_code}: {r.text}"
    assert "UNVERIFIED_OCR_FIELDS" in r.text
    print("[PASS] Test 10: Unverified critical OCR fields strictly block plan activation (HTTP 422 UNVERIFIED_OCR_FIELDS)")
    tests_run.append("unverified_critical_field_blocked_422")

    print("-" * 65)
    print(f"SUMMARY: {len(tests_run)} / {len(tests_run)} OCR Authorization & Isolation Tests PASSED (100%)")
    print("=" * 65)
    return tests_run

if __name__ == "__main__":
    run_ocr_authorization_tests()
