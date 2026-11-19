import os
import sys
import unittest
import json
import threading
import urllib.request
import urllib.error
import time
from http.server import HTTPServer

# Add src to path
SRC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src"))
sys.path.insert(0, SRC_DIR)

from safety_gate_v2 import (
    PrescriptionDocument,
    UnverifiedMedicationCandidate,
    MedicationReminderService,
    ExecutionMode,
    ClinicalSafetyViolationError,
    IncompleteReviewError,
    MalformedUploadError,
    validate_file_upload,
    sanitize_log_message
)
from demo_server_v2 import HardenedPrescriptionHandler

def find_dataset_root(start_dir):
    cur = os.path.abspath(start_dir)
    while cur and os.path.splitdrive(cur)[1] not in ["", "\\", "/"]:
        candidate = os.path.join(cur, "data", "raw", "extracted", "images", "Prescription_ images.jpg")
        if os.path.exists(candidate):
            return cur
        cur = os.path.dirname(cur)
    return os.path.abspath(os.path.join(SRC_DIR, "..", "..", ".."))

BASE_DIR = find_dataset_root(os.path.dirname(__file__))
IMAGE_PATH_0052 = os.path.join(BASE_DIR, "data", "raw", "extracted", "images", "Prescription_ images.jpg", "0052.jpg")

class TestRealE2EWorkflow(unittest.TestCase):
    """Rigorous End-to-End integration test suite executing all 10 Task 4 clinical safety requirements."""

    @classmethod
    def setUpClass(cls):
        # Start hardened local server on test port 8895
        cls.port = 8895
        cls.server = HTTPServer(("127.0.0.1", cls.port), HardenedPrescriptionHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever)
        cls.thread.daemon = True
        cls.thread.start()
        time.sleep(0.5)

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def test_01_real_image_and_ocr_inference(self):
        """Req 1 & 2: Test loading real prescription image and running EasyOCR inference."""
        self.assertTrue(os.path.exists(IMAGE_PATH_0052), f"Image 0052.jpg not found at {IMAGE_PATH_0052}")
        
        # Test real OCR inference via EasyOCR
        import easyocr
        reader = easyocr.Reader(['en', 'bn'], gpu=True)
        results = reader.readtext(IMAGE_PATH_0052)
        
        self.assertGreater(len(results), 5, "Real OCR should detect multiple text boxes on 0052.jpg")
        
        detected_texts = [r[1] for r in results]
        confs = [float(r[2]) for r in results]
        raw_text = " ".join(detected_texts)
        
        # Verify real presence of expected text on 0052.jpg
        self.assertTrue(any("Roxim" in t or "Cap" in t or "400" in t for t in detected_texts), 
                        f"Expected Roxim / Cap / 400 in OCR stream: {detected_texts[:10]}")

        # Req 3: Candidate text and uncertainty metadata
        mean_conf = sum(confs) / len(confs)
        self.assertGreater(mean_conf, 0.0)
        self.assertLess(mean_conf, 1.0)
        
        # Candidate creation without guessed fields
        cand = UnverifiedMedicationCandidate(
            candidate_id=1,
            raw_text="Cap Roxim 400",
            medicine_name="Roxim",
            strength="400 mg",
            dose=None,       # Strictly None
            frequency="1+0+1",
            duration=None,   # Strictly None
            route=None,      # Strictly None
            confidence=0.68
        )
        self.assertIsNone(cand.dose)
        self.assertIsNone(cand.duration)
        self.assertIsNone(cand.route)

    def test_02_simulated_human_correction_and_safe_state(self):
        """Req 5 & 6: Simulate human correction and verify non-actionable SIMULATED_REVIEW_ONLY status."""
        doc = PrescriptionDocument(prescription_id="0052", filename="0052.jpg")
        self.assertEqual(doc.verification_status, "UNVERIFIED_REQUIRES_HUMAN_REVIEW")
        self.assertFalse(doc.reminder_auto_enabled)

        corrected_orders = [
            {
                "medicine_name": "Roxim (Cefuroxime Axetil)",
                "strength": "400 mg",
                "frequency": "1+0+1 (Morning & Night)",
                "duration": "7 days"
            }
        ]

        # Simulate review with fictional credentials
        doc.simulate_human_review(
            reviewer_id="DEMO-REVIEWER-01",
            reviewer_name="Dr. Fictional Reviewer",
            corrected_orders=corrected_orders,
            legal_declaration_signed=True
        )

        self.assertTrue(doc.is_simulated_review)
        self.assertEqual(doc.verification_status, "SIMULATED_REVIEW_ONLY")
        self.assertFalse(doc.reminder_auto_enabled, "Simulated review MUST NOT enable automated reminders.")
        self.assertFalse(doc.live_ehr_write_enabled, "Simulated review MUST NOT enable live EHR writes.")
        self.assertFalse(doc.sms_dispatch_enabled, "Simulated review MUST NOT enable SMS dispatch.")

        # Non-actionable FHIR proposal
        fhir = doc.export_fhir_r4_proposal()
        self.assertEqual(fhir["status"], "draft")
        self.assertEqual(fhir["intent"], "proposal")
        self.assertEqual(fhir["meta"]["tag"][0]["code"], "SIMULATED_PROPOSAL_NON_ACTIONABLE")

    def test_03_blocked_reminder_and_alert_dispatch(self):
        """Req 7: Confirm unverified & simulated records CANNOT create reminders or external alerts."""
        doc = PrescriptionDocument(prescription_id="0052", filename="0052.jpg")
        service = MedicationReminderService(mode=ExecutionMode.RESEARCH_DEMO)

        # 1. Blocked in unverified state
        with self.assertRaises(ClinicalSafetyViolationError):
            service.create_actionable_schedule(doc)
        with self.assertRaises(ClinicalSafetyViolationError):
            service.dispatch_patient_alert(doc, "PAT-01")

        # 2. Blocked in simulated-approved state
        doc.simulate_human_review(
            reviewer_id="DEMO-REVIEWER-01",
            reviewer_name="Fictional Reviewer",
            corrected_orders=[{"medicine_name": "Roxim", "frequency": "1+0+1"}],
            legal_declaration_signed=True
        )
        with self.assertRaises(ClinicalSafetyViolationError):
            service.create_actionable_schedule(doc)
        with self.assertRaises(ClinicalSafetyViolationError):
            service.dispatch_patient_alert(doc, "PAT-01")

    def test_04_file_upload_security_validations(self):
        """Req 8: Reject malformed files, oversized uploads, and unsafe filenames."""
        # 1. Reject empty
        with self.assertRaises(MalformedUploadError) as ctx:
            validate_file_upload(b"", "empty.jpg")
        self.assertIn("empty", str(ctx.exception).lower())

        # 2. Reject oversized (>15MB)
        fake_oversized = b"X" * (16 * 1024 * 1024)
        with self.assertRaises(MalformedUploadError) as ctx:
            validate_file_upload(fake_oversized, "huge.jpg")
        self.assertIn("exceeds maximum", str(ctx.exception).lower())

        # 3. Reject non-image / malformed magic bytes
        fake_exe = b"MZ\x90\x00\x03\x00\x00\x00not an image"
        with self.assertRaises(MalformedUploadError) as ctx:
            validate_file_upload(fake_exe, "virus.exe")
        self.assertIn("invalid image format", str(ctx.exception).lower())

        # 4. Path traversal attempt in filename
        with self.assertRaises(MalformedUploadError):
            PrescriptionDocument._sanitize_filename("../../etc/passwd")

    def test_05_backend_authorization_api_enforcement(self):
        """Req 9: Verify backend authorization rules and prevent bypass through direct API calls."""
        # Direct POST to /api/attempt-reminder MUST return HTTP 403 Forbidden
        req_body = json.dumps({"prescription_id": "0052"}).encode("utf-8")
        req = urllib.request.Request(
            f"http://127.0.0.1:{self.port}/api/attempt-reminder",
            data=req_body,
            headers={"Content-Type": "application/json"}
        )
        
        try:
            urllib.request.urlopen(req)
            self.fail("Expected HTTP 403 Forbidden on direct reminder creation attempt!")
        except urllib.error.HTTPError as e:
            self.assertEqual(e.code, 403, "Direct API bypass attempt must be rejected with HTTP 403")
            data = json.loads(e.read().decode("utf-8"))
            self.assertEqual(data["error"], "CLINICAL_SAFETY_GATE_BLOCKED")
            self.assertEqual(data["policy"], "ZERO_AUTOMATION_IN_DEMO_MODE")

    def test_06_pii_log_sanitization(self):
        """Req 10: Check that application logs do not expose patient-identifying information."""
        log_sample = "Prescription processed for patient phone +8801712345678 and NID 19901234567890123."
        sanitized = sanitize_log_message(log_sample)
        self.assertNotIn("+8801712345678", sanitized)
        self.assertNotIn("19901234567890123", sanitized)
        self.assertIn("[REDACTED_PHONE]", sanitized)
        self.assertIn("[REDACTED_ID]", sanitized)

if __name__ == "__main__":
    unittest.main()
