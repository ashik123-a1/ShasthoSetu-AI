import datetime
from typing import List, Dict, Optional, Any

class ClinicalSafetyViolationError(Exception):
    """Raised when an automated medication reminder or dispatch is attempted on an unverified prescription."""
    pass

class UnverifiedPrescriptionError(Exception):
    """Raised when an actionable medical order is generated from an unverified AI draft."""
    pass

class IncompleteVerificationError(Exception):
    """Raised when human verification is attempted without certifying required clinical fields."""
    pass


class UnverifiedMedicationCandidate:
    """Represents a provisional medication candidate extracted by OCR.
    
    CRITICAL MEDICAL SAFETY RULE:
    Never infer missing dose, frequency, duration, or route. 
    Unresolved fields must remain None / UNSPECIFIED.
    """
    def __init__(
        self,
        candidate_id: int,
        raw_text: str,
        medicine_name: Optional[str] = None,
        strength: Optional[str] = None,
        dose: Optional[str] = None,
        frequency: Optional[str] = None,
        duration: Optional[str] = None,
        route: Optional[str] = None,
        confidence: float = 0.0,
        extraction_provenance: str = "OCR_REGEX_CANDIDATE"
    ):
        self.candidate_id = candidate_id
        self.raw_text = raw_text
        self.medicine_name = medicine_name
        self.strength = strength
        self.dose = dose          # MUST remain None if not explicitly read
        self.frequency = frequency # MUST remain None if not explicitly read
        self.duration = duration   # MUST remain None if not explicitly read
        self.route = route        # MUST remain None if not explicitly read
        self.confidence = float(confidence)
        self.extraction_provenance = extraction_provenance
        self.verification_status = "UNVERIFIED_CANDIDATE"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "candidate_id": self.candidate_id,
            "raw_text": self.raw_text,
            "medicine_name": self.medicine_name,
            "strength": self.strength,
            "dose": self.dose,
            "frequency": self.frequency,
            "duration": self.duration,
            "route": self.route,
            "confidence": self.confidence,
            "extraction_provenance": self.extraction_provenance,
            "verification_status": self.verification_status
        }


class PrescriptionDocument:
    """Represents an ingested prescription document in the ShasthoSetu AI clinical pipeline."""
    def __init__(
        self,
        prescription_id: str,
        filename: str,
        ocr_raw_text: str = "",
        mean_confidence: float = 0.0,
        candidates: Optional[List[UnverifiedMedicationCandidate]] = None
    ):
        self.prescription_id = str(prescription_id)
        self.filename = filename
        self.ocr_raw_text = ocr_raw_text
        self.mean_confidence = float(mean_confidence)
        self.candidates: List[UnverifiedMedicationCandidate] = candidates or []
        
        # Hard-locked medical safety defaults
        self.reminder_auto_enabled: bool = False
        self.verification_status: str = "UNVERIFIED_REQUIRES_HUMAN_REVIEW"
        self.verified_by: Optional[str] = None
        self.verified_at: Optional[str] = None
        self.verified_orders: List[Dict[str, Any]] = []
        self.clinical_notes: str = ""

    def is_human_verified(self) -> bool:
        """Strict boolean check for human clinical sign-off."""
        return (
            self.verification_status == "VERIFIED_BY_HUMAN" and 
            self.verified_by is not None and 
            len(self.verified_orders) > 0
        )

    def verify_by_clinician(
        self,
        clinician_id: str,
        clinician_name: str,
        verified_orders: List[Dict[str, Any]],
        clinical_notes: str = ""
    ) -> None:
        """Explicit human verification method.
        
        Requires qualified reviewer ID and verified clinical fields for every order.
        """
        if not clinician_id or not clinician_id.strip():
            raise IncompleteVerificationError("Clinician ID is required for legal and clinical sign-off.")
        
        if not verified_orders or len(verified_orders) == 0:
            raise IncompleteVerificationError("At least one verified medication order must be confirmed.")

        # Validate that each order has required clinical fields
        for idx, order in enumerate(verified_orders):
            if not order.get("medicine_name"):
                raise IncompleteVerificationError(f"Order #{idx+1} missing certified medicine_name.")
            if not order.get("frequency"):
                raise IncompleteVerificationError(f"Order #{idx+1} missing certified dosage frequency.")

        self.verification_status = "VERIFIED_BY_HUMAN"
        self.verified_by = f"{clinician_name} (ID: {clinician_id})"
        self.verified_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
        self.verified_orders = verified_orders
        self.clinical_notes = clinical_notes
        self.reminder_auto_enabled = True

    def export_fhir_r4(self, organization_id: str = "ShasthoSetu-Gazipur-Hub") -> Dict[str, Any]:
        """Exports a FHIR R4 MedicationRequest conforming to Bangladesh Core FHIR IG v0.4.7 principles.
        
        CRITICAL SAFETY RULE:
        If unverified, status is ALWAYS 'draft' and intent is ALWAYS 'proposal'.
        Never output 'active' or 'order' without human clinical sign-off.
        """
        is_verified = self.is_human_verified()
        
        status = "active" if is_verified else "draft"
        intent = "order" if is_verified else "proposal"
        
        medication_items = []
        orders_to_export = self.verified_orders if is_verified else [c.to_dict() for c in self.candidates]
        
        for order in orders_to_export:
            med_name = order.get("medicine_name") or "Unresolved Medication Candidate"
            strength = order.get("strength") or "Unspecified Strength"
            freq = order.get("frequency") or "Unspecified Frequency"
            
            medication_items.append({
                "medicationCodeableConcept": {
                    "text": f"{med_name} {strength}".strip(),
                    "coding": [
                        {
                            "system": "http://dghs.gov.bd/fhir/core/CodeSystem/dgda-drug-directory",
                            "display": med_name
                        }
                    ]
                },
                "dosageInstruction": [
                    {
                        "text": freq,
                        "timing": {
                            "code": {
                                "text": freq
                            }
                        }
                    }
                ]
            })

        fhir_resource = {
            "resourceType": "MedicationRequest",
            "id": f"prescription-{self.prescription_id}",
            "meta": {
                "profile": [
                    "http://dghs.gov.bd/fhir/core/StructureDefinition/bd-medicationrequest"
                ],
                "lastUpdated": datetime.datetime.now(datetime.timezone.utc).isoformat()
            },
            "status": status,
            "intent": intent,
            "category": [
                {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/medicationrequest-category",
                            "code": "outpatient",
                            "display": "Outpatient"
                        }
                    ]
                }
            ],
            "subject": {
                "reference": "Patient/anonymous-deidentified",
                "display": "De-identified Ambulatory Patient"
            },
            "authoredOn": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d"),
            "requester": {
                "reference": f"Practitioner/{self.verified_by or 'AI-Draft-System'}",
                "display": self.verified_by or "ShasthoSetu OCR Draft System (Unverified)"
            },
            "note": [
                {
                    "text": (
                        "Verified by clinical practitioner." 
                        if is_verified 
                        else "AI-generated proposal draft. Actionable medication scheduling blocked pending human clinical review."
                    )
                }
            ],
            "dosageInstructions": medication_items
        }
        return fhir_resource


class MedicationReminderService:
    """Backend service that manages medication reminder scheduling and dispatch.
    
    Enforces the zero-unverified-automation hard-lock at runtime.
    """
    def __init__(self):
        self.dispatched_reminders: List[Dict[str, Any]] = []

    def create_reminder_schedule(self, prescription: PrescriptionDocument) -> Dict[str, Any]:
        """Creates an actionable reminder schedule.
        
        RAISES ClinicalSafetyViolationError if prescription is not human verified!
        """
        if not prescription.is_human_verified():
            raise ClinicalSafetyViolationError(
                f"CANNOT CREATE ACTIONABLE SCHEDULE: Prescription {prescription.prescription_id} is in status "
                f"'{prescription.verification_status}'. Medical safety gate mandates explicit clinician verification."
            )

        schedule = {
            "schedule_id": f"SCHED-{prescription.prescription_id}",
            "prescription_id": prescription.prescription_id,
            "verified_by": prescription.verified_by,
            "verified_at": prescription.verified_at,
            "active_reminders": []
        }

        for order in prescription.verified_orders:
            schedule["active_reminders"].append({
                "medicine": order.get("medicine_name"),
                "strength": order.get("strength"),
                "frequency": order.get("frequency"),
                "duration": order.get("duration"),
                "status": "ACTIVE_CONFIRMED"
            })

        return schedule

    def dispatch_patient_alert(self, prescription: PrescriptionDocument, patient_id: str) -> Dict[str, Any]:
        """Dispatches an SMS / Push alarm to a patient.
        
        RAISES ClinicalSafetyViolationError if prescription is not human verified!
        """
        if not prescription.is_human_verified():
            raise ClinicalSafetyViolationError(
                f"DISPATCH BLOCKED: Attempted to send automated patient alert for unverified prescription {prescription.prescription_id}. "
                f"Status: {prescription.verification_status}. Automated dispatch forbidden."
            )

        alert_record = {
            "dispatch_id": f"ALERT-{prescription.prescription_id}-{len(self.dispatched_reminders)+1}",
            "patient_id": patient_id,
            "prescription_id": prescription.prescription_id,
            "dispatched_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "status": "SENT"
        }
        self.dispatched_reminders.append(alert_record)
        return alert_record
