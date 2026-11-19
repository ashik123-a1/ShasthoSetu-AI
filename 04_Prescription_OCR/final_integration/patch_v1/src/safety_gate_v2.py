import os
import re
import datetime
from typing import List, Dict, Optional, Any
from enum import Enum

class ExecutionMode(str, Enum):
    RESEARCH_DEMO = "RESEARCH_DEMO"
    CLINICAL_SIMULATION = "CLINICAL_SIMULATION"
    PRODUCTION_LOCKED = "PRODUCTION_LOCKED"

class ClinicalSafetyViolationError(Exception):
    """Raised when an automated reminder, SMS dispatch, or live EHR write is attempted."""
    pass

class UnauthorizedClinicalActionError(Exception):
    """Raised when an unauthenticated demo user attempts to enact binding clinical approvals."""
    pass

class IncompleteReviewError(Exception):
    """Raised when simulation review lacks required clinical parameters."""
    pass

class MalformedUploadError(Exception):
    """Raised when an uploaded file is invalid, corrupted, or violates security constraints."""
    pass


class UnverifiedMedicationCandidate:
    """Represents a provisional candidate extracted by OCR.
    
    STRICT SAFETY RULE:
    Never infer missing dose, frequency, duration, or route. 
    Missing parameters remain strictly None / UNSPECIFIED.
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
        self.dose = dose          # Strictly None if missing
        self.frequency = frequency # Strictly None if missing
        self.duration = duration   # Strictly None if missing
        self.route = route        # Strictly None if missing
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
    """Represents a prescription document in ShasthoSetu AI."""
    def __init__(
        self,
        prescription_id: str,
        filename: str,
        ocr_raw_text: str = "",
        mean_confidence: float = 0.0,
        candidates: Optional[List[UnverifiedMedicationCandidate]] = None,
        mode: ExecutionMode = ExecutionMode.RESEARCH_DEMO
    ):
        self.prescription_id = str(prescription_id)
        self.filename = self._sanitize_filename(filename)
        self.ocr_raw_text = ocr_raw_text
        self.mean_confidence = float(mean_confidence)
        self.candidates: List[UnverifiedMedicationCandidate] = candidates or []
        self.mode = mode
        
        # Hard-locked safety defaults
        self.verification_status = "UNVERIFIED_REQUIRES_HUMAN_REVIEW"
        self.reminder_auto_enabled: bool = False
        self.live_ehr_write_enabled: bool = False
        self.sms_dispatch_enabled: bool = False
        
        # Simulation review audit fields
        self.is_simulated_review: bool = False
        self.simulated_reviewer_id: Optional[str] = None
        self.simulated_reviewer_name: Optional[str] = None
        self.simulated_at: Optional[str] = None
        self.simulated_orders: List[Dict[str, Any]] = []
        self.audit_trail: List[Dict[str, str]] = []
        self._record_audit("INGESTION", f"Document ingested in {mode.value} mode. Verification status set to UNVERIFIED_REQUIRES_HUMAN_REVIEW.")

    @staticmethod
    def _sanitize_filename(fname: str) -> str:
        """Sanitizes filename against path traversal and unsafe characters."""
        if ".." in fname or "/" in fname or "\\" in fname:
            raise MalformedUploadError(f"Path traversal characters detected in filename: {fname}")
        clean = os.path.basename(fname).strip()
        if not clean or clean.startswith("."):
            raise MalformedUploadError(f"Unsafe or empty filename rejected: {fname}")
        return clean

    def _record_audit(self, action: str, details: str):
        self.audit_trail.append({
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "action": action,
            "details": details
        })

    def simulate_human_review(
        self,
        reviewer_id: str,
        reviewer_name: str,
        corrected_orders: List[Dict[str, Any]],
        legal_declaration_signed: bool
    ) -> None:
        """Simulates human review in research-demo mode.
        
        CRITICAL MEDICAL SAFETY ENFORCEMENT:
        In research-demo mode, human review is strictly SIMULATED.
        It updates review fields for UI demonstration, but CANNOT activate real medication
        reminders, cannot trigger SMS dispatch, and cannot execute live EHR writes.
        """
        if not reviewer_id or not reviewer_id.strip():
            raise IncompleteReviewError("Reviewer ID is required for simulation tracking.")
        if not reviewer_name or not reviewer_name.strip():
            raise IncompleteReviewError("Reviewer Name is required for simulation tracking.")
        if not legal_declaration_signed:
            raise IncompleteReviewError("Declaration confirmation must be certified.")
        if not corrected_orders:
            raise IncompleteReviewError("At least one candidate medication order must be confirmed.")

        for idx, o in enumerate(corrected_orders):
            if not o.get("medicine_name"):
                raise IncompleteReviewError(f"Candidate #{idx+1} lacks confirmed medicine name.")
            if not o.get("frequency"):
                raise IncompleteReviewError(f"Candidate #{idx+1} lacks confirmed frequency schedule.")

        # Label status as SIMULATED_REVIEW_ONLY
        self.is_simulated_review = True
        self.verification_status = "SIMULATED_REVIEW_ONLY"
        self.simulated_reviewer_id = reviewer_id.strip()
        self.simulated_reviewer_name = reviewer_name.strip()
        self.simulated_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
        self.simulated_orders = corrected_orders
        
        # Hard safety guarantee: Automation remains strictly FALSE
        self.reminder_auto_enabled = False
        self.live_ehr_write_enabled = False
        self.sms_dispatch_enabled = False
        
        self._record_audit(
            "SIMULATED_REVIEW", 
            f"Review simulated by {reviewer_name} ({reviewer_id}). Status: SIMULATED_REVIEW_ONLY. Automation remains DISABLED."
        )

    def export_fhir_r4_proposal(self) -> Dict[str, Any]:
        """Exports a non-actionable FHIR R4 MedicationRequest draft proposal.
        
        Conforms strictly to draft/proposal workflow:
        - status: ALWAYS 'draft'
        - intent: ALWAYS 'proposal'
        - Never 'active' or 'order' in research-demo mode.
        """
        orders_to_render = self.simulated_orders if self.is_simulated_review else [c.to_dict() for c in self.candidates]
        dosage_items = []
        for o in orders_to_render:
            m_name = o.get("medicine_name") or "Unresolved Candidate"
            s_val = o.get("strength") or "Unspecified Strength"
            f_val = o.get("frequency") or "Unspecified Frequency"
            d_val = o.get("duration") or "Unspecified Duration"
            dosage_items.append({
                "text": f"{m_name} {s_val} — {f_val} ({d_val})",
                "timing": {"code": {"text": f_val}}
            })

        return {
            "resourceType": "MedicationRequest",
            "id": f"proposal-prescription-{self.prescription_id}",
            "meta": {
                "profile": ["http://dghs.gov.bd/fhir/core/StructureDefinition/bd-medicationrequest"],
                "tag": [
                    {
                        "system": "http://shasthosetu.ai/fhir/security-tags",
                        "code": "SIMULATED_PROPOSAL_NON_ACTIONABLE",
                        "display": "Research Demo Proposal - Not a Legal Medication Order"
                    }
                ],
                "lastUpdated": datetime.datetime.now(datetime.timezone.utc).isoformat()
            },
            "status": "draft",
            "intent": "proposal",
            "category": [{
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/medicationrequest-category",
                    "code": "outpatient",
                    "display": "Outpatient"
                }]
            }],
            "authoredOn": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d"),
            "requester": {
                "display": f"Fictional Demo Reviewer: {self.simulated_reviewer_name or 'Unassigned'}"
            },
            "note": [{
                "text": "RESEARCH DEMO ONLY: AI-assisted candidate transcription. Unverified for clinical dispensing."
            }],
            "dosageInstruction": dosage_items
        }


class MedicationReminderService:
    """Backend service for reminder scheduling.
    
    Hard-locks safety: In research demo mode, dispatching real reminders is IMPOSSIBLE.
    """
    def __init__(self, mode: ExecutionMode = ExecutionMode.RESEARCH_DEMO):
        self.mode = mode
        self.dispatched_count = 0

    def create_actionable_schedule(self, prescription: PrescriptionDocument) -> Dict[str, Any]:
        """Attempting to create actionable schedule in research demo mode raises error."""
        if self.mode == ExecutionMode.RESEARCH_DEMO:
            raise ClinicalSafetyViolationError(
                f"ACTIONABLE SCHEDULE FORBIDDEN: System is in {self.mode.value} mode. "
                f"Prescription {prescription.prescription_id} is in status '{prescription.verification_status}'. "
                "Simulated reviews cannot generate active clinical reminders."
            )
        raise ClinicalSafetyViolationError("Production scheduler is permanently locked.")

    def dispatch_patient_alert(self, prescription: PrescriptionDocument, patient_id: str) -> Dict[str, Any]:
        """Attempting to send real SMS / push alarm in demo mode raises error."""
        raise ClinicalSafetyViolationError(
            f"DISPATCH BLOCKED: Automated reminders are permanently disabled in {self.mode.value} mode. "
            f"Prescription: {prescription.prescription_id}. Zero automated external notifications permitted."
        )


def validate_file_upload(file_bytes: bytes, filename: str, max_size_mb: float = 15.0) -> None:
    """Validates file upload security:
    - Maximum size constraint (15 MB)
    - Safe filename check
    - Magic byte check for valid JPEG/PNG image formats
    """
    if not file_bytes or len(file_bytes) == 0:
        raise MalformedUploadError("Upload payload is empty (0 bytes).")
        
    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > max_size_mb:
        raise MalformedUploadError(f"Upload size ({size_mb:.2f} MB) exceeds maximum allowed limit ({max_size_mb} MB).")
        
    PrescriptionDocument._sanitize_filename(filename)
    
    # Magic bytes check
    is_jpeg = file_bytes.startswith(b'\xff\xd8\xff')
    is_png = file_bytes.startswith(b'\x89PNG\r\n\x1a\n')
    if not (is_jpeg or is_png):
        raise MalformedUploadError("Invalid image format: Must be standard JPEG or PNG.")


def sanitize_log_message(msg: str) -> str:
    """Strips potential PII (phone numbers, national IDs) from application logs."""
    # Mask Bangladeshi phone numbers (+8801XXXXXXXXX or 01XXXXXXXXX)
    sanitized = re.sub(r'(\+?8801|01)[3-9]\d{8}', '[REDACTED_PHONE]', msg)
    # Mask 10-17 digit NID numbers
    sanitized = re.sub(r'\b\d{10,17}\b', '[REDACTED_ID]', sanitized)
    return sanitized
