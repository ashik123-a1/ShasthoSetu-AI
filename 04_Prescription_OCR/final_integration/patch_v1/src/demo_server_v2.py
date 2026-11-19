import os
import sys
import json
import http.server
import socketserver
import urllib.parse
import traceback

sys.path.insert(0, os.path.dirname(__file__))
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

def find_dataset_root(start_dir):
    cur = os.path.abspath(start_dir)
    while cur and os.path.splitdrive(cur)[1] not in ["", "\\", "/"]:
        candidate = os.path.join(cur, "data", "raw", "extracted", "images", "Prescription_ images.jpg")
        if os.path.exists(candidate):
            return cur
        cur = os.path.dirname(cur)
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))

BASE_DIR = find_dataset_root(os.path.dirname(__file__))
DEMO_DIR = os.path.join(os.path.dirname(__file__), "..", "demo")
IMAGES_DIR = os.path.join(BASE_DIR, "data", "raw", "extracted", "images", "Prescription_ images.jpg")

PORT = 8085

# In-memory session store for research demo
DEMO_DOCUMENTS = {}
REMINDER_SERVICE = MedicationReminderService(mode=ExecutionMode.RESEARCH_DEMO)

class HardenedPrescriptionHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        # Sanitize all log output against PII before writing
        raw = format % args
        sanitized = sanitize_log_message(raw)
        sys.stderr.write(f"[{self.log_date_time_string()}] {sanitized}\n")

    def _send_json_response(self, status_code: int, data: dict):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        content_len = int(self.headers.get("Content-Length", 0))
        
        # Check upload size limit (max 15MB)
        if content_len > 15 * 1024 * 1024:
            self._send_json_response(413, {
                "error": "PAYLOAD_TOO_LARGE",
                "message": "File exceeds maximum permitted size of 15 MB."
            })
            return

        body = self.rfile.read(content_len) if content_len > 0 else b""

        # Route 1: /api/upload
        if parsed.path == "/api/upload":
            try:
                # Expect multipart or raw binary with X-Filename header
                fname = self.headers.get("X-Filename", "uploaded_prescription.jpg")
                validate_file_upload(body, fname, max_size_mb=15.0)
                
                # Mock / Real ingestion
                doc_id = f"UPL-{len(DEMO_DOCUMENTS)+1:04d}"
                doc = PrescriptionDocument(
                    prescription_id=doc_id,
                    filename=fname,
                    ocr_raw_text="[Uploaded document pending OCR inference]",
                    mean_confidence=0.0
                )
                DEMO_DOCUMENTS[doc_id] = doc
                self._send_json_response(200, {
                    "status": "UPLOAD_ACCEPTED",
                    "prescription_id": doc_id,
                    "filename": doc.filename,
                    "verification_status": doc.verification_status,
                    "reminder_auto_enabled": doc.reminder_auto_enabled
                })
            except MalformedUploadError as e:
                self._send_json_response(400, {"error": "MALFORMED_UPLOAD", "message": str(e)})
            except Exception as e:
                self._send_json_response(500, {"error": "SERVER_ERROR", "message": str(e)})
            return

        # Route 2: /api/simulate-review
        if parsed.path == "/api/simulate-review":
            try:
                data = json.loads(body.decode("utf-8"))
                p_id = data.get("prescription_id")
                doc = DEMO_DOCUMENTS.get(p_id)
                if not doc:
                    # Create on the fly for demo sample IDs
                    doc = PrescriptionDocument(prescription_id=p_id, filename=f"{p_id}.jpg")
                    DEMO_DOCUMENTS[p_id] = doc

                reviewer_id = data.get("reviewer_id", "DEMO-REVIEWER-01")
                reviewer_name = data.get("reviewer_name", "Fictional Demo Reviewer")
                corrected_orders = data.get("orders", [])
                confirmed = bool(data.get("legal_declaration_signed", False))

                doc.simulate_human_review(
                    reviewer_id=reviewer_id,
                    reviewer_name=reviewer_name,
                    corrected_orders=corrected_orders,
                    legal_declaration_signed=confirmed
                )

                fhir_proposal = doc.export_fhir_r4_proposal()
                self._send_json_response(200, {
                    "status": "SIMULATION_SUCCESS",
                    "prescription_id": doc.prescription_id,
                    "verification_status": doc.verification_status,
                    "reminder_auto_enabled": doc.reminder_auto_enabled,
                    "live_ehr_write_enabled": doc.live_ehr_write_enabled,
                    "audit_notice": "SIMULATED_REVIEW_ONLY. Automation permanently locked.",
                    "fhir_proposal": fhir_proposal
                })
            except IncompleteReviewError as e:
                self._send_json_response(400, {"error": "INCOMPLETE_REVIEW", "message": str(e)})
            except Exception as e:
                self._send_json_response(500, {"error": "SERVER_ERROR", "message": str(e)})
            return

        # Route 3: /api/attempt-reminder (Demonstrates backend security lock)
        if parsed.path == "/api/attempt-reminder":
            try:
                data = json.loads(body.decode("utf-8"))
                p_id = data.get("prescription_id")
                doc = DEMO_DOCUMENTS.get(p_id) or PrescriptionDocument(prescription_id=p_id, filename=f"{p_id}.jpg")
                # Attempt to dispatch
                REMINDER_SERVICE.create_actionable_schedule(doc)
            except ClinicalSafetyViolationError as e:
                # Expected safe rejection
                self._send_json_response(403, {
                    "error": "CLINICAL_SAFETY_GATE_BLOCKED",
                    "message": str(e),
                    "policy": "ZERO_AUTOMATION_IN_DEMO_MODE"
                })
            return

        self._send_json_response(404, {"error": "NOT_FOUND", "path": parsed.path})

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        clean_path = parsed.path
        
        # Route /images/<filename>
        if clean_path.startswith("/images/"):
            img_name = os.path.basename(clean_path[len("/images/"):])
            full_img_path = os.path.join(IMAGES_DIR, img_name)
            if os.path.exists(full_img_path):
                self.send_response(200)
                self.send_header("Content-Type", "image/jpeg")
                self.send_header("Content-Length", str(os.path.getsize(full_img_path)))
                self.end_headers()
                with open(full_img_path, "rb") as f:
                    self.wfile.write(f.read())
                return
            else:
                self._send_json_response(404, {"error": "IMAGE_NOT_FOUND", "filename": img_name})
                return

        # Serve static demo files
        if clean_path in ["", "/"]:
            clean_path = "/index.html"
            
        req_file = clean_path.lstrip("/")
        candidate = os.path.join(DEMO_DIR, req_file)
        if os.path.exists(candidate) and os.path.isfile(candidate):
            ext = os.path.splitext(candidate)[1].lower()
            mime = "text/html" if ext == ".html" else ("text/css" if ext == ".css" else ("application/javascript" if ext == ".js" else "text/plain"))
            self.send_response(200)
            self.send_header("Content-Type", f"{mime}; charset=utf-8")
            self.send_header("Content-Length", str(os.path.getsize(candidate)))
            self.end_headers()
            with open(candidate, "rb") as f:
                self.wfile.write(f.read())
            return

        self._send_json_response(404, {"error": "NOT_FOUND", "path": clean_path})

def run_server(port=PORT):
    print(f"Starting ShasthoSetu AI Hardened Demo Server on http://localhost:{port}")
    with socketserver.TCPServer(("", port), HardenedPrescriptionHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")

if __name__ == "__main__":
    p = int(sys.argv[1]) if len(sys.argv) > 1 else PORT
    run_server(p)
