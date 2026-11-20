import sys
import os
import unittest

# Ensure src is importable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src")))

from safety_gate import (
    PrescriptionDocument,
    UnverifiedMedicationCandidate,
    MedicationReminderService,
    ClinicalSafetyViolationError,
    UnverifiedPrescriptionError,
    IncompleteVerificationError
)

class TestMedicationSafetyGate(unittest.TestCase):
    """Rigorous unit and integration tests enforcing medical safety guardrails."""

    def setUp(self):
        self.service = MedicationReminderService()
        self.candidate = UnverifiedMedicationCandidate(
            candidate_id=1,
            raw_text="Cap Roxim 400 1+0+1",
            medicine_name="Roxim",
            strength="400 mg",
            dose=None,       # Rule: Must not infer
            frequency="1+0+1",
            duration=None,   # Rule: Must not infer
            route=None,      # Rule: Must not infer
            confidence=0.57
        )
        self.prescription = PrescriptionDocument(
            prescription_id="0052",
            filename="0052.jpg",
            ocr_raw_text="Cap Roxim 400 1+0+1",
            mean_confidence=0.57,
            candidates=[self.candidate]
        )

    def test_default_safety_state(self):
        """Test that every ingested prescription defaults to unverified and disabled reminders."""
        self.assertFalse(self.prescription.reminder_auto_enabled)
        self.assertEqual(self.prescription.verification_status, "UNVERIFIED_REQUIRES_HUMAN_REVIEW")
        self.assertFalse(self.prescription.is_human_verified())
        self.assertIsNone(self.prescription.verified_by)
        self.assertEqual(len(self.prescription.verified_orders), 0)

    def test_no_inferred_missing_fields(self):
        """Test that unextracted clinical fields are strictly None, never guessed defaults."""
        cand = self.prescription.candidates[0]
        self.assertIsNone(cand.dose, "Dose must not be inferred as '1 unit' without text evidence.")
        self.assertIsNone(cand.duration, "Duration must not be inferred as default days.")
        self.assertIsNone(cand.route, "Route must not be inferred as 'Oral' without text evidence.")

    def test_blocked_reminder_schedule_creation(self):
        """Test that creating an actionable schedule on an unverified prescription raises ClinicalSafetyViolationError."""
        with self.assertRaises(ClinicalSafetyViolationError) as ctx:
            self.service.create_reminder_schedule(self.prescription)
        self.assertIn("CANNOT CREATE ACTIONABLE SCHEDULE", str(ctx.exception))
        self.assertIn("UNVERIFIED_REQUIRES_HUMAN_REVIEW", str(ctx.exception))

    def test_blocked_patient_alert_dispatch(self):
        """Test that dispatching an automated patient alert on an unverified prescription raises ClinicalSafetyViolationError."""
        with self.assertRaises(ClinicalSafetyViolationError) as ctx:
            self.service.dispatch_patient_alert(self.prescription, patient_id="PAT-9901")
        self.assertIn("DISPATCH BLOCKED", str(ctx.exception))
        self.assertEqual(len(self.service.dispatched_reminders), 0)

    def test_fhir_export_unverified_is_draft_proposal(self):
        """Test that unverified prescription FHIR export generates 'draft' status and 'proposal' intent."""
        fhir = self.prescription.export_fhir_r4()
        self.assertEqual(fhir["resourceType"], "MedicationRequest")
        self.assertEqual(fhir["status"], "draft", "Unverified prescription must have status 'draft'.")
        self.assertEqual(fhir["intent"], "proposal", "Unverified prescription must have intent 'proposal'.")
        self.assertIn("AI-generated proposal draft", fhir["note"][0]["text"])

    def test_incomplete_human_verification_rejected(self):
        """Test that human verification without clinician ID or missing fields is strictly rejected."""
        # Empty clinician ID
        with self.assertRaises(IncompleteVerificationError):
            self.prescription.verify_by_clinician(
                clinician_id="",
                clinician_name="Dr. Rahman",
                verified_orders=[{"medicine_name": "Roxim", "frequency": "1+0+1"}]
            )
            
        # Empty orders
        with self.assertRaises(IncompleteVerificationError):
            self.prescription.verify_by_clinician(
                clinician_id="BMDC-A-12345",
                clinician_name="Dr. Rahman",
                verified_orders=[]
            )

        # Missing medicine_name in order
        with self.assertRaises(IncompleteVerificationError):
            self.prescription.verify_by_clinician(
                clinician_id="BMDC-A-12345",
                clinician_name="Dr. Rahman",
                verified_orders=[{"medicine_name": "", "frequency": "1+0+1"}]
            )

    def test_successful_human_verification_transition(self):
        """Test that explicit human verification unlocks actionable reminders and active FHIR order."""
        verified_orders = [
            {
                "medicine_name": "Roxim (Cefuroxime Axetil)",
                "strength": "400 mg",
                "dose": "1 capsule",
                "frequency": "1+0+1 (Twice Daily after meals)",
                "duration": "7 days",
                "route": "Oral"
            }
        ]
        
        self.prescription.verify_by_clinician(
            clinician_id="BMDC-A-87654",
            clinician_name="Dr. Nusrat Jahan, MBBS",
            verified_orders=verified_orders,
            clinical_notes="Verified against prescription pad 0052.jpg. Dosage confirmed."
        )

        self.assertTrue(self.prescription.is_human_verified())
        self.assertTrue(self.prescription.reminder_auto_enabled)
        self.assertEqual(self.prescription.verification_status, "VERIFIED_BY_HUMAN")
        self.assertIn("Dr. Nusrat Jahan", self.prescription.verified_by)

        # Actionable schedule creation now succeeds
        schedule = self.service.create_reminder_schedule(self.prescription)
        self.assertEqual(schedule["prescription_id"], "0052")
        self.assertEqual(len(schedule["active_reminders"]), 1)
        self.assertEqual(schedule["active_reminders"][0]["medicine"], "Roxim (Cefuroxime Axetil)")

        # Patient alert dispatch now succeeds
        alert = self.service.dispatch_patient_alert(self.prescription, patient_id="PAT-1002")
        self.assertEqual(alert["status"], "SENT")
        self.assertEqual(len(self.service.dispatched_reminders), 1)

        # FHIR resource transitions to 'active' order
        fhir = self.prescription.export_fhir_r4()
        self.assertEqual(fhir["status"], "active")
        self.assertEqual(fhir["intent"], "order")
        self.assertIn("Verified by clinical practitioner", fhir["note"][0]["text"])

if __name__ == "__main__":
    unittest.main()
