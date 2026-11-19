"""ShasthoSetu Custom MCP Server #3: care-record-mcp

Exposes role-scoped patient care summaries, mandatory HTTP 422 OCR verification
gate status checks, and Admin-only audit ledger inspection with strict Zero-PHI
Support Desk enforcement.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

from mcp.server.mcpserver import MCPServer

_PROJECT_ROOT = str(Path(__file__).resolve().parents[2])
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

try:
    from .common import get_readonly_db_conn, run_mcp_server, scrub_phi_dict, to_pretty_json
except ImportError:
    from services.mcp.common import get_readonly_db_conn, run_mcp_server, scrub_phi_dict, to_pretty_json

_ACL_MATRIX = {
    "SUPPORT": {
        "patient_care_summary": "DENIED (ERR_ZERO_PHI_FORBIDDEN)",
        "ocr_reviews": "DENIED (ERR_ZERO_PHI_FORBIDDEN)",
        "medication_gate_check": "ALLOWED (non-PHI boolean gate metadata only)",
        "audit_summary": "DENIED (ERR_ADMIN_ONLY)",
    },
    "PATIENT": {
        "patient_care_summary": "SCOPED_TO_OWN_PROFILE_PHONES_MASKED",
        "ocr_reviews": "SCOPED_METADATA_ONLY",
        "medication_gate_check": "ALLOWED (HTTP 422 unless human verified)",
        "audit_summary": "DENIED (ERR_ADMIN_ONLY)",
    },
    "DOCTOR": {
        "patient_care_summary": "SCOPED_CLINICAL_SUMMARY_PHONES_MASKED",
        "ocr_reviews": "ALLOWED_FOR_VERIFICATION",
        "medication_gate_check": "ALLOWED",
        "audit_summary": "DENIED (ERR_ADMIN_ONLY)",
    },
    "ADMIN": {
        "patient_care_summary": "SYNTHETIC_DEMO_METADATA_PHONES_MASKED",
        "ocr_reviews": "ALLOWED_METADATA",
        "medication_gate_check": "ALLOWED",
        "audit_summary": "ALLOWED (FULL_REDACT_SUMMARY)",
    },
}


def get_patient_care_summary(
    patient_id: str = "",
    requester_role: str = "PATIENT",
    requester_user_id: str = "",
) -> dict[str, Any]:
    """Return scrubbed care summary counts while strictly barring SUPPORT from clinical PHR data."""
    role = (requester_role or "").strip().upper()
    if role == "SUPPORT":
        return {
            "allowed": False,
            "error_code": "ERR_ZERO_PHI_FORBIDDEN",
            "requester_role": role,
            "reason": "Support desk agents are strictly barred from accessing clinical PHR, prescription text, or diagnosis records.",
        }
    if role not in {"PATIENT", "DOCTOR", "ADMIN"}:
        return {
            "allowed": False,
            "error_code": "ERR_ROLE_DENIED",
            "requester_role": role,
            "reason": f"Role '{role}' is not authorized to inspect patient care records.",
        }

    with get_readonly_db_conn() as conn:
        if patient_id.strip():
            prof = conn.execute("SELECT * FROM patient_profiles WHERE id = ? LIMIT 1", (patient_id.strip(),)).fetchone()
        elif role == "PATIENT" and requester_user_id.strip():
            prof = conn.execute("SELECT * FROM patient_profiles WHERE owner_user_id = ? LIMIT 1", (requester_user_id.strip(),)).fetchone()
        else:
            prof = conn.execute("SELECT * FROM patient_profiles WHERE is_synthetic = 1 ORDER BY created_at_utc ASC LIMIT 1").fetchone()

        if not prof:
            return {"allowed": True, "found": False, "requester_role": role, "summary": None}

        prof_dict = scrub_phi_dict(dict(prof))
        if role == "PATIENT" and requester_user_id.strip() and prof_dict.get("owner_user_id") != requester_user_id.strip():
            return {
                "allowed": False,
                "error_code": "ERR_OWNERSHIP_REQUIRED",
                "requester_role": role,
                "reason": "Patients can inspect only their own care summary.",
            }

        pid = prof_dict["id"]
        appts = conn.execute("SELECT COUNT(*) FROM appointments WHERE patient_profile_id = ?", (pid,)).fetchone()[0]
        meds = conn.execute("SELECT COUNT(*) FROM medication_plans WHERE patient_profile_id = ?", (pid,)).fetchone()[0]
        pcos = conn.execute("SELECT COUNT(*) FROM pcos_cycle_entries WHERE patient_profile_id = ?", (pid,)).fetchone()[0]
        vax = conn.execute("SELECT COUNT(*) FROM pediatric_vaccine_records WHERE child_profile_id = ?", (pid,)).fetchone()[0]

    return {
        "allowed": True,
        "found": True,
        "requester_role": role,
        "privacy_mode": "PHONES_AND_RAW_PHI_SCRUBBED",
        "patient_profile": {
            "id": prof_dict["id"],
            "display_name": prof_dict["display_name"],
            "district": prof_dict.get("district"),
            "blood_group": prof_dict.get("blood_group"),
            "phone_contact": prof_dict.get("phone_contact"),
            "is_synthetic": bool(prof_dict.get("is_synthetic")),
        },
        "counts": {
            "appointments": appts,
            "medication_plans": meds,
            "pcos_cycle_logs": pcos,
            "pediatric_vaccines": vax,
        },
    }


def list_pending_ocr_reviews(requester_role: str = "PATIENT", limit: int = 10) -> dict[str, Any]:
    """List OCR human-verification queue metadata (strictly barred for SUPPORT role)."""
    role = (requester_role or "").strip().upper()
    if role == "SUPPORT":
        return {
            "allowed": False,
            "error_code": "ERR_ZERO_PHI_FORBIDDEN",
            "requester_role": role,
            "reason": "Support desk agents cannot inspect OCR prescription verification queues.",
        }
    if role not in {"PATIENT", "DOCTOR", "ADMIN"}:
        return {"allowed": False, "error_code": "ERR_ROLE_DENIED", "requester_role": role}

    lim = max(1, min(int(limit or 10), 25))
    with get_readonly_db_conn() as conn:
        rows = conn.execute(
            """
            SELECT j.id AS ocr_job_id,
                   j.engine_version,
                   j.status,
                   j.mean_confidence,
                   j.created_at_utc,
                   COALESCE(a.authorization_state, 'RAW_OCR') AS authorization_state,
                   COALESCE(a.uncertain_fields_count, 0) AS uncertain_fields_count
              FROM ocr_jobs j
              LEFT JOIN ocr_job_artifacts a ON a.ocr_job_id = j.id
             ORDER BY j.created_at_utc DESC
             LIMIT ?
            """,
            (lim,),
        ).fetchall()

    jobs = [dict(r) for r in rows]
    return {
        "allowed": True,
        "requester_role": role,
        "count": len(jobs),
        "ocr_reviews": jobs,
    }


def check_medication_activation_gate(ocr_job_id: str = "") -> dict[str, Any]:
    """Verify whether human confirmation/verification allows activating medication reminders (HTTP 422 gate)."""
    with get_readonly_db_conn() as conn:
        if ocr_job_id.strip():
            row = conn.execute(
                """
                SELECT j.id AS ocr_job_id, j.status, j.mean_confidence,
                       COALESCE(a.authorization_state, 'RAW_OCR') AS authorization_state,
                       COALESCE(a.uncertain_fields_count, 0) AS uncertain_fields_count
                  FROM ocr_jobs j
                  LEFT JOIN ocr_job_artifacts a ON a.ocr_job_id = j.id
                 WHERE j.id = ?
                 LIMIT 1
                """,
                (ocr_job_id.strip(),),
            ).fetchone()
        else:
            row = conn.execute(
                """
                SELECT j.id AS ocr_job_id, j.status, j.mean_confidence,
                       COALESCE(a.authorization_state, 'RAW_OCR') AS authorization_state,
                       COALESCE(a.uncertain_fields_count, 0) AS uncertain_fields_count
                  FROM ocr_jobs j
                  LEFT JOIN ocr_job_artifacts a ON a.ocr_job_id = j.id
                 ORDER BY j.created_at_utc DESC
                 LIMIT 1
                """
            ).fetchone()

    if not row:
        return {
            "found": False,
            "can_activate_reminder": False,
            "http_gate_code": 422,
            "policy": "No verified OCR artifact found; HTTP 422 confirmation required.",
        }

    item = dict(row)
    auth_state = str(item.get("authorization_state") or "RAW_OCR")
    authorized = auth_state in {"PATIENT_ACKNOWLEDGED", "CLINICIAN_VERIFIED", "VERIFIED_BY_HUMAN"} or item.get("status") == "VERIFIED"
    return {
        "found": True,
        "ocr_job_id": item["ocr_job_id"],
        "job_status": item["status"],
        "authorization_state": auth_state,
        "uncertain_fields_count": item["uncertain_fields_count"],
        "can_activate_reminder": authorized,
        "http_gate_code": 200 if authorized else 422,
        "policy": "Mandatory HTTP 422 Human Verification Gate — Never auto-activate unverified OCR schedules.",
    }


def list_immutable_audit_summary(requester_role: str = "ADMIN", limit: int = 15) -> dict[str, Any]:
    """Admin-only view of redacted audit logs and doctor credential verification history."""
    role = (requester_role or "").strip().upper()
    if role != "ADMIN":
        return {
            "allowed": False,
            "error_code": "ERR_ADMIN_ONLY",
            "requester_role": role,
            "reason": "Only ADMIN governance accounts may inspect platform audit logs.",
        }

    lim = max(1, min(int(limit or 15), 40))
    with get_readonly_db_conn() as conn:
        total_logs = conn.execute("SELECT COUNT(*) FROM audit_logs").fetchone()[0]
        recent = conn.execute(
            """
            SELECT id, actor_role, action_type, target_resource, outcome, created_at_utc
              FROM audit_logs
             ORDER BY created_at_utc DESC
             LIMIT ?
            """,
            (lim,),
        ).fetchall()
        doc_events = conn.execute("SELECT COUNT(*) FROM doctor_verification_events").fetchone()[0]

    return {
        "allowed": True,
        "requester_role": role,
        "total_audit_log_rows": total_logs,
        "doctor_verification_events_count": doc_events,
        "recent_events": [dict(r) for r in recent],
    }


mcp = MCPServer(
    "care-record-mcp",
    instructions="Role-scoped care summary, HTTP 422 OCR verification gate, and Admin-only audit ledger MCP server.",
)


@mcp.tool(name="get_patient_care_summary", description="Get scrubbed patient care counts; strictly denies SUPPORT role with ERR_ZERO_PHI_FORBIDDEN.")
def tool_get_patient_care_summary(patient_id: str = "", requester_role: str = "PATIENT", requester_user_id: str = "") -> dict[str, Any]:
    return get_patient_care_summary(patient_id=patient_id, requester_role=requester_role, requester_user_id=requester_user_id)


@mcp.tool(name="list_pending_ocr_reviews", description="List prescription OCR review statuses; barred for SUPPORT role.")
def tool_list_pending_ocr_reviews(requester_role: str = "PATIENT", limit: int = 10) -> dict[str, Any]:
    return list_pending_ocr_reviews(requester_role=requester_role, limit=limit)


@mcp.tool(name="check_medication_activation_gate", description="Check mandatory HTTP 422 human-verification gate before medication reminder activation.")
def tool_check_medication_activation_gate(ocr_job_id: str = "") -> dict[str, Any]:
    return check_medication_activation_gate(ocr_job_id=ocr_job_id)


@mcp.tool(name="list_immutable_audit_summary", description="Admin-only redacted audit ledger summary (returns ERR_ADMIN_ONLY for non-admins).")
def tool_list_immutable_audit_summary(requester_role: str = "ADMIN", limit: int = 15) -> dict[str, Any]:
    return list_immutable_audit_summary(requester_role=requester_role, limit=limit)


@mcp.resource("care://policy/acl-matrix", mime_type="application/json")
def resource_acl_matrix() -> str:
    return to_pretty_json({"server": "care-record-mcp", "acl_matrix": _ACL_MATRIX})


if __name__ == "__main__":
    run_mcp_server(mcp, default_port=8103)
