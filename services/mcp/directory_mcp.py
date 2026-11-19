"""ShasthoSetu Custom MCP Server #2: directory-mcp

Exposes read-only, Zero-PHI public directory queries over verified doctors,
8 clinical department counts, diagnostics/facilities, and privacy-masked
Blood Connect emergency coordination.
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
    from .common import get_readonly_db_conn, run_mcp_server, to_pretty_json
except ImportError:
    from services.mcp.common import get_readonly_db_conn, run_mcp_server, to_pretty_json


def find_approved_doctors(
    specialty: str = "",
    district: str = "",
    online_only: bool = False,
    limit: int = 10,
) -> dict[str, Any]:
    """Query verified demo clinicians with open slot counts (read-only public directory)."""
    lim = max(1, min(int(limit or 10), 50))
    sql = """
        SELECT d.id,
               d.doctor_code,
               d.display_name,
               d.display_name_bn,
               d.degrees,
               d.specialty,
               d.district,
               d.experience_years,
               d.languages_csv,
               d.is_online_now,
               d.consultation_fee_minor_poisha,
               d.rating,
               d.reviews_count,
               d.avatar_url,
               (SELECT COUNT(*) FROM appointment_slots s
                 WHERE s.doctor_id = d.id AND s.state = 'OPEN' AND s.reserved_count < s.capacity) AS open_slots_count
          FROM doctor_profiles d
         WHERE d.verification_status = 'APPROVED' AND d.is_active = 1
    """
    params: list[Any] = []
    if specialty.strip():
        sql += " AND lower(d.specialty) LIKE ?"
        params.append(f"%{specialty.strip().lower()}%")
    if district.strip():
        sql += " AND lower(d.district) LIKE ?"
        params.append(f"%{district.strip().lower()}%")
    if online_only:
        sql += " AND d.is_online_now = 1"
    sql += " ORDER BY d.is_online_now DESC, d.rating DESC, d.experience_years DESC LIMIT ?"
    params.append(lim)

    with get_readonly_db_conn() as conn:
        rows = [dict(r) for r in conn.execute(sql, params).fetchall()]

    for r in rows:
        r["consultation_fee_bdt"] = round(int(r.get("consultation_fee_minor_poisha") or 0) / 100)
        r["is_online_now"] = bool(r.get("is_online_now"))
    return {
        "filters": {"specialty": specialty or "ALL", "district": district or "ALL", "online_only": bool(online_only)},
        "count": len(rows),
        "doctors": rows,
    }


def get_department_counts() -> dict[str, Any]:
    """Return approved doctor counts grouped across ShasthoSetu clinical departments."""
    with get_readonly_db_conn() as conn:
        rows = conn.execute(
            """
            SELECT specialty,
                   COUNT(*) AS doctor_count,
                   SUM(CASE WHEN is_online_now = 1 THEN 1 ELSE 0 END) AS online_count
              FROM doctor_profiles
             WHERE verification_status = 'APPROVED' AND is_active = 1
             GROUP BY specialty
             ORDER BY doctor_count DESC, specialty ASC
            """
        ).fetchall()
    depts = [dict(r) for r in rows]
    return {
        "department_count": len(depts),
        "total_approved_doctors": sum(int(d["doctor_count"]) for d in depts),
        "departments": depts,
    }


def search_facilities_and_diagnostics(district: str = "", query: str = "") -> dict[str, Any]:
    """Search Bangladesh hospitals/clinics/pharmacies and diagnostic test catalog."""
    dist = district.strip().lower()
    q = query.strip().lower()
    with get_readonly_db_conn() as conn:
        fac_sql = "SELECT id, name, facility_type, district, address, latitude, longitude, source_name FROM facilities WHERE 1=1"
        fac_params: list[Any] = []
        if dist:
            fac_sql += " AND lower(district) LIKE ?"
            fac_params.append(f"%{dist}%")
        if q:
            fac_sql += " AND (lower(name) LIKE ? OR lower(facility_type) LIKE ?)"
            fac_params.extend([f"%{q}%", f"%{q}%"])
        facilities = [dict(r) for r in conn.execute(fac_sql + " ORDER BY district ASC LIMIT 20", fac_params).fetchall()]

        diag_sql = """
            SELECT id, code, name_bn, name_en, category, sample_type, fee_minor_poisha, turnaround_hours
              FROM diagnostic_tests
             WHERE is_active = 1
        """
        diag_params: list[Any] = []
        if q:
            diag_sql += " AND (lower(name_en) LIKE ? OR lower(name_bn) LIKE ? OR lower(category) LIKE ?)"
            diag_params.extend([f"%{q}%", f"%{q}%", f"%{q}%"])
        diagnostics = [dict(r) for r in conn.execute(diag_sql + " ORDER BY name_en ASC LIMIT 20", diag_params).fetchall()]

    for d in diagnostics:
        d["fee_bdt"] = round(int(d.get("fee_minor_poisha") or 0) / 100)
    return {
        "facilities_count": len(facilities),
        "diagnostics_count": len(diagnostics),
        "facilities": facilities,
        "diagnostic_tests": diagnostics,
    }


def find_blood_requests_safe(blood_group: str = "", division: str = "") -> dict[str, Any]:
    """List emergency Blood Connect requests and donor counts with Zero-PHI phone hiding."""
    bg = blood_group.strip().upper()
    div = division.strip().lower()
    with get_readonly_db_conn() as conn:
        req_sql = """
            SELECT id, patient_ref_label, blood_group, units_required, units_fulfilled,
                   urgency_level, hospital_name, hospital_verified, division, district, status, created_at_utc
              FROM blood_requests
             WHERE 1=1
        """
        params: list[Any] = []
        if bg:
            req_sql += " AND upper(blood_group) = ?"
            params.append(bg)
        if div:
            req_sql += " AND lower(division) LIKE ?"
            params.append(f"%{div}%")
        requests = [dict(r) for r in conn.execute(req_sql + " ORDER BY created_at_utc DESC LIMIT 20", params).fetchall()]

        donor_sql = "SELECT blood_group, division, COUNT(*) AS ready_donors FROM blood_donors WHERE availability_status = 'AVAILABLE'"
        d_params: list[Any] = []
        if bg:
            donor_sql += " AND upper(blood_group) = ?"
            d_params.append(bg)
        if div:
            donor_sql += " AND lower(division) LIKE ?"
            d_params.append(f"%{div}%")
        donor_summary = [dict(r) for r in conn.execute(donor_sql + " GROUP BY blood_group, division ORDER BY ready_donors DESC", d_params).fetchall()]

    for req in requests:
        req["contact_phone_policy"] = "HIDDEN_UNTIL_CONSENT"
        req["hospital_verified"] = bool(req.get("hospital_verified"))

    return {
        "privacy_gate": "ZERO_PHI_PHONE_MASKING_ENFORCED",
        "clinical_notice": "Discovery coordination ONLY — certified hospital cross-matching mandatory prior to transfusion.",
        "request_count": len(requests),
        "blood_requests": requests,
        "available_donor_buckets": donor_summary,
    }


def get_directory_overview_resource() -> str:
    with get_readonly_db_conn() as conn:
        approved_doctors = conn.execute("SELECT COUNT(*) FROM doctor_profiles WHERE verification_status = 'APPROVED' AND is_active = 1").fetchone()[0]
        open_slots = conn.execute("SELECT COUNT(*) FROM appointment_slots WHERE state = 'OPEN' AND reserved_count < capacity").fetchone()[0]
        tests = conn.execute("SELECT COUNT(*) FROM diagnostic_tests WHERE is_active = 1").fetchone()[0]
        facilities = conn.execute("SELECT COUNT(*) FROM facilities").fetchone()[0]
        blood_reqs = conn.execute("SELECT COUNT(*) FROM blood_requests").fetchone()[0]
    return to_pretty_json(
        {
            "server": "directory-mcp",
            "approved_doctors": approved_doctors,
            "open_slots": open_slots,
            "diagnostic_tests": tests,
            "facilities": facilities,
            "blood_requests": blood_reqs,
        }
    )


mcp = MCPServer(
    "directory-mcp",
    instructions="Public Zero-PHI doctor directory, diagnostic test, facility, and privacy-masked Blood Connect server.",
)


@mcp.tool(name="find_approved_doctors", description="Find approved ShasthoSetu doctors by specialty, district, or online availability.")
def tool_find_approved_doctors(specialty: str = "", district: str = "", online_only: bool = False, limit: int = 10) -> dict[str, Any]:
    return find_approved_doctors(specialty=specialty, district=district, online_only=online_only, limit=limit)


@mcp.tool(name="get_department_counts", description="Get live approved and online doctor counts grouped by clinical department.")
def tool_get_department_counts() -> dict[str, Any]:
    return get_department_counts()


@mcp.tool(name="search_facilities_and_diagnostics", description="Search Bangladesh hospitals/facilities and diagnostic test prices.")
def tool_search_facilities_and_diagnostics(district: str = "", query: str = "") -> dict[str, Any]:
    return search_facilities_and_diagnostics(district=district, query=query)


@mcp.tool(name="find_blood_requests_safe", description="List active Blood Connect requests and donor counts without exposing raw phone numbers.")
def tool_find_blood_requests_safe(blood_group: str = "", division: str = "") -> dict[str, Any]:
    return find_blood_requests_safe(blood_group=blood_group, division=division)


@mcp.resource("directory://overview", mime_type="application/json")
def resource_directory_overview() -> str:
    return get_directory_overview_resource()


if __name__ == "__main__":
    run_mcp_server(mcp, default_port=8102)
