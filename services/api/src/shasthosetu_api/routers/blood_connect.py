from __future__ import annotations

import math
from datetime import date, datetime, timedelta, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

from ..core.audit import notify_user, record_audit
from ..core.dependencies import get_current_user, get_optional_user, require_role
from ..core.security import new_id, utc_now_iso
from ..db.sqlite import get_db_conn, row_to_dict, rows_to_dicts

router = APIRouter(prefix="/v1/blood", tags=["Blood Connect — Geo-Matching, Consent & Safety"])

BLOOD_GROUPS = ("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-")

# Discovery coordination reference ONLY — NEVER a clinical transfusion compatibility clearance.
_RBC_DISCOVERY_MAP: dict[str, tuple[str, ...]] = {
    "O-": ("O-",),
    "O+": ("O+", "O-"),
    "A-": ("A-", "O-"),
    "A+": ("A+", "A-", "O+", "O-"),
    "B-": ("B-", "O-"),
    "B+": ("B+", "B-", "O+", "O-"),
    "AB-": ("AB-", "A-", "B-", "O-"),
    "AB+": ("AB+", "AB-", "A+", "A-", "B+", "B-", "O+", "O-"),
}


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return round(2 * r * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a))), 2)


def _days_since(date_str: Optional[str]) -> Optional[int]:
    if not date_str:
        return None
    try:
        d = date.fromisoformat(date_str[:10])
        return max(0, (date.today() - d).days)
    except Exception:
        return None


def _sanitize_donor_public(row: dict, distance_km: Optional[float] = None) -> dict:
    days = _days_since(row.get("last_donation_date"))
    return {
        "id": row["id"],
        "display_name": row["display_name"],
        "blood_group": row["blood_group"],
        "donation_type": row["donation_type"],
        "last_donation_date": row.get("last_donation_date"),
        "days_since_last_donation": days,
        "availability_status": row["availability_status"],
        "division": row["division"],
        "district": row["district"],
        "area_name": row.get("area_name") or "",
        "lat": row["lat"],
        "lng": row["lng"],
        "distance_km": distance_km,
        "trust_score": row["trust_score"],
        "verified_donations_count": row["verified_donations_count"],
        "no_show_count": row["no_show_count"],
        "screening_policy_acknowledged": bool(row.get("screening_policy_acknowledged", 1)),
        # Strict privacy: NEVER expose raw donor phone number on discovery endpoints
        "contact_phone": None,
        "contact_privacy": "HIDDEN_UNTIL_CONSENT",
    }


def _policy_notices() -> dict:
    return {
        "eligibility_policy_en": (
            "No fixed 90-day medical cutoff rule is enforced automatically. "
            "Self-reported last donation date & donation type are informational only; final eligibility "
            "depends on local blood bank guidelines, component donated, and in-person clinical screening."
        ),
        "eligibility_policy_bn": (
            "স্বয়ংক্রিয় ৯০-দিনের কোনো স্থায়ী নিয়মকে একমাত্র মেডিকেল যোগ্যতা হিসেবে ধরা হয় না। "
            "শেষ রক্তদানের তারিখ ও ধরন কেবল তথ্যমূলক; চূড়ান্ত যোগ্যতা স্থানীয় ব্লাড ব্যাংক নীতি ও সরাসরি ক্লিনিক্যাল স্ক্রিনিংয়ে নির্ধারিত হয়।"
        ),
        "compatibility_disclaimer_en": (
            "Discovery coordination ONLY — matching blood groups do NOT certify transfusion compatibility "
            "or blood safety. Hospital blood banks must complete cross-matching & screening before transfusion."
        ),
        "compatibility_disclaimer_bn": (
            "ব্লাড গ্রুপ ম্যাচিং কেবল সমন্বয়ের জন্য — এটি ট্রান্সফিউশন কম্প্যাটিবিলিটি বা রক্তের নিরাপত্তা নিশ্চিত করে না। "
            "রক্ত সঞ্চালনের আগে হাসপাতাল/ব্লাড ব্যাংকের ক্রস-ম্যাচিং ও স্ক্রিনিং বাধ্যতামূলক।"
        ),
    }


class DonorRegisterPayload(BaseModel):
    display_name: str = Field(..., min_length=2, max_length=120)
    blood_group: Literal["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
    donation_type: Literal["WHOLE_BLOOD", "PLATELETS", "PLASMA"] = "WHOLE_BLOOD"
    last_donation_date: Optional[str] = Field(default=None, max_length=20)
    availability_status: Literal["AVAILABLE", "PAUSED", "RECENTLY_DONATED"] = "AVAILABLE"
    division: str = Field(..., min_length=2, max_length=60)
    district: str = Field(..., min_length=2, max_length=60)
    area_name: str = Field(default="", max_length=120)
    lat: float = Field(..., ge=20.0, le=27.0)
    lng: float = Field(..., ge=88.0, le=93.0)
    contact_phone: str = Field(..., min_length=6, max_length=32)
    screening_policy_acknowledged: bool = True


class CreateBloodRequestPayload(BaseModel):
    patient_ref_label: str = Field(..., min_length=2, max_length=100)
    blood_group: Literal["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
    units_required: int = Field(default=1, ge=1, le=10)
    urgency_level: Literal["EMERGENCY", "URGENT", "SCHEDULED"] = "URGENT"
    hospital_name: str = Field(..., min_length=2, max_length=160)
    division: str = Field(..., min_length=2, max_length=60)
    district: str = Field(..., min_length=2, max_length=60)
    lat: float = Field(..., ge=20.0, le=27.0)
    lng: float = Field(..., ge=88.0, le=93.0)
    search_radius_km: Literal[5.0, 10.0, 20.0, 50.0] = 5.0
    needed_by_utc: Optional[str] = Field(default=None, max_length=40)
    notes: str = Field(default="", max_length=600)
    auto_notify_nearby: bool = True


class NotifyDonorsPayload(BaseModel):
    donor_ids: list[str] = Field(..., min_length=1, max_length=10)


class RespondMatchPayload(BaseModel):
    decision: Literal["ACCEPTED", "DECLINED"]
    consent_phone_shared: bool = False


class ConfirmMatchPayload(BaseModel):
    action: Literal["CONFIRM_COMPLETED", "MARK_NO_SHOW"] = "CONFIRM_COMPLETED"
    feedback_rating: Optional[int] = Field(default=None, ge=1, le=5)
    feedback_note: str = Field(default="", max_length=400)


@router.get("/overview")
def blood_overview():
    with get_db_conn() as conn:
        total_donors = conn.execute("SELECT COUNT(*) FROM blood_donors").fetchone()[0]
        available_donors = conn.execute(
            "SELECT COUNT(*) FROM blood_donors WHERE availability_status = 'AVAILABLE'"
        ).fetchone()[0]
        open_requests = conn.execute(
            "SELECT COUNT(*) FROM blood_requests WHERE status IN ('OPEN', 'MATCHED')"
        ).fetchone()[0]
        verified_emergencies = conn.execute(
            "SELECT COUNT(*) FROM blood_requests WHERE status IN ('OPEN', 'MATCHED') AND hospital_verified = 1 AND urgency_level = 'EMERGENCY'"
        ).fetchone()[0]
        confirmed_donations = conn.execute(
            "SELECT COUNT(*) FROM blood_match_logs WHERE response_status = 'COMPLETED'"
        ).fetchone()[0]

        by_group = rows_to_dicts(
            conn.execute(
                """
                SELECT blood_group,
                       COUNT(*) AS total,
                       SUM(CASE WHEN availability_status = 'AVAILABLE' THEN 1 ELSE 0 END) AS available
                  FROM blood_donors
                 GROUP BY blood_group
                 ORDER BY available DESC, blood_group ASC
                """
            ).fetchall()
        )
        by_division = rows_to_dicts(
            conn.execute(
                """
                SELECT division,
                       COUNT(*) AS donors_total,
                       SUM(CASE WHEN availability_status = 'AVAILABLE' THEN 1 ELSE 0 END) AS donors_available,
                       (SELECT COUNT(*) FROM blood_requests r WHERE r.division = blood_donors.division AND r.status IN ('OPEN', 'MATCHED')) AS active_requests
                  FROM blood_donors
                 GROUP BY division
                 ORDER BY donors_available DESC
                """
            ).fetchall()
        )

    return {
        "stats": {
            "total_donors": total_donors,
            "available_donors": available_donors,
            "open_requests": open_requests,
            "verified_emergencies": verified_emergencies,
            "confirmed_donations": confirmed_donations,
            "divisions_covered": len(by_division),
        },
        "by_blood_group": by_group,
        "by_division": by_division,
        "policies": _policy_notices(),
    }


@router.get("/donors/nearby")
def list_nearby_donors(
    blood_group: Optional[str] = Query(default=None),
    include_compatible: bool = Query(default=False),
    division: Optional[str] = Query(default=None),
    lat: float = Query(default=23.7259, ge=20.0, le=27.0),
    lng: float = Query(default=90.3976, ge=88.0, le=93.0),
    radius_km: str = Query(default="20"),
    available_only: bool = Query(default=True),
):
    allowed_groups: list[str] = []
    if blood_group and blood_group in BLOOD_GROUPS:
        allowed_groups = list(_RBC_DISCOVERY_MAP[blood_group]) if include_compatible else [blood_group]

    sql = "SELECT * FROM blood_donors WHERE 1=1"
    params: list = []
    if available_only:
        sql += " AND availability_status = 'AVAILABLE'"
    if allowed_groups:
        placeholders = ",".join("?" for _ in allowed_groups)
        sql += f" AND blood_group IN ({placeholders})"
        params.extend(allowed_groups)
    if division and division.upper() != "ALL":
        sql += " AND lower(division) = lower(?)"
        params.append(division.strip())

    radius_limit: Optional[float] = None
    if radius_km != "all":
        try:
            radius_limit = max(1.0, min(500.0, float(radius_km)))
        except ValueError:
            radius_limit = 20.0

    with get_db_conn() as conn:
        rows = rows_to_dicts(conn.execute(sql, params).fetchall())

    matched = []
    for row in rows:
        dist = _haversine_km(lat, lng, float(row["lat"]), float(row["lng"]))
        if radius_limit is not None and dist > radius_limit:
            continue
        matched.append(_sanitize_donor_public(row, distance_km=dist))

    matched.sort(key=lambda d: (0 if d["availability_status"] == "AVAILABLE" else 1, d["distance_km"] or 0.0, -d["trust_score"]))
    return {
        "center": {"lat": lat, "lng": lng},
        "radius_km": radius_km,
        "count": len(matched),
        "donors": matched,
        "policies": _policy_notices(),
    }


@router.get("/requests")
def list_blood_requests(
    request: Request,
    blood_group: Optional[str] = Query(default=None),
    urgency: Optional[str] = Query(default=None),
    division: Optional[str] = Query(default=None),
    status_filter: str = Query(default="ACTIVE"),
    hospital_verified: Optional[bool] = Query(default=None),
):
    caller = get_optional_user(request)
    caller_id = caller["id"] if caller else None

    sql = "SELECT * FROM blood_requests WHERE 1=1"
    params: list = []
    if status_filter == "ACTIVE":
        sql += " AND status IN ('OPEN', 'MATCHED')"
    elif status_filter in ("OPEN", "MATCHED", "FULFILLED", "CANCELLED"):
        sql += " AND status = ?"
        params.append(status_filter)

    if blood_group and blood_group in BLOOD_GROUPS:
        sql += " AND blood_group = ?"
        params.append(blood_group)
    if urgency in ("EMERGENCY", "URGENT", "SCHEDULED"):
        sql += " AND urgency_level = ?"
        params.append(urgency)
    if division and division.upper() != "ALL":
        sql += " AND lower(division) = lower(?)"
        params.append(division.strip())
    if hospital_verified is True:
        sql += " AND hospital_verified = 1"

    sql += """
        ORDER BY hospital_verified DESC,
                 CASE urgency_level WHEN 'EMERGENCY' THEN 0 WHEN 'URGENT' THEN 1 ELSE 2 END,
                 created_at_utc DESC
    """

    with get_db_conn() as conn:
        reqs = rows_to_dicts(conn.execute(sql, params).fetchall())
        caller_donor = (
            row_to_dict(conn.execute("SELECT id FROM blood_donors WHERE user_id = ?", (caller_id,)).fetchone())
            if caller_id
            else None
        )
        caller_donor_id = caller_donor["id"] if caller_donor else None

        enriched = []
        for req in reqs:
            matches = rows_to_dicts(
                conn.execute(
                    """
                    SELECT m.*, d.display_name AS donor_name, d.blood_group AS donor_blood_group,
                           d.district AS donor_district, d.area_name AS donor_area,
                           d.trust_score AS donor_trust_score, d.verified_donations_count,
                           d.contact_phone AS donor_phone_raw, d.user_id AS donor_user_id
                      FROM blood_match_logs m
                      JOIN blood_donors d ON d.id = m.donor_id
                     WHERE m.request_id = ?
                     ORDER BY m.responded_at_utc DESC, m.notified_at_utc DESC
                    """,
                    (req["id"],),
                ).fetchall()
            )
            is_requester = caller_id is not None and req["requester_user_id"] == caller_id
            is_admin = caller is not None and caller.get("primary_role") == "ADMIN"
            req_open = req["status"] in ("OPEN", "MATCHED")

            safe_matches = []
            for m in matches:
                is_donor = caller_donor_id is not None and m["donor_id"] == caller_donor_id
                can_view_phone = (
                    req_open
                    and m["response_status"] == "ACCEPTED"
                    and m["consent_phone_shared"] == 1
                    and (is_requester or is_donor or is_admin)
                )
                phone_state = (
                    "UNLOCKED_BY_CONSENT"
                    if can_view_phone
                    else ("ACCESS_REVOKED_CLOSED" if not req_open and m["consent_phone_shared"] == 1 else "HIDDEN_UNTIL_CONSENT")
                )
                safe_matches.append(
                    {
                        "id": m["id"],
                        "request_id": m["request_id"],
                        "donor_id": m["donor_id"],
                        "donor_name": m["donor_name"],
                        "donor_blood_group": m["donor_blood_group"],
                        "donor_district": m["donor_district"],
                        "donor_area": m["donor_area"],
                        "donor_trust_score": m["donor_trust_score"],
                        "verified_donations_count": m["verified_donations_count"],
                        "response_status": m["response_status"],
                        "consent_phone_shared": bool(m["consent_phone_shared"]),
                        "requester_confirmed": bool(m["requester_confirmed"]),
                        "donor_confirmed": bool(m["donor_confirmed"]),
                        "feedback_rating": m.get("feedback_rating"),
                        "feedback_note": m.get("feedback_note") or "",
                        "notified_at_utc": m["notified_at_utc"],
                        "responded_at_utc": m.get("responded_at_utc"),
                        "completed_at_utc": m.get("completed_at_utc"),
                        "contact_phone": m["donor_phone_raw"] if can_view_phone else None,
                        "contact_privacy": phone_state,
                    }
                )

            req_item = dict(req)
            req_item["hospital_verified"] = bool(req["hospital_verified"])
            req_item["is_owner"] = is_requester
            req_item["matches_count"] = len(safe_matches)
            req_item["accepted_count"] = sum(1 for x in safe_matches if x["response_status"] in ("ACCEPTED", "COMPLETED"))
            req_item["matches"] = safe_matches if (is_requester or is_admin) else [x for x in safe_matches if caller_donor_id and x["donor_id"] == caller_donor_id]
            enriched.append(req_item)

    return {"requests": enriched, "policies": _policy_notices()}


@router.get("/my-profile")
def get_my_blood_profile(user: dict = Depends(get_current_user)):
    with get_db_conn() as conn:
        donor = row_to_dict(conn.execute("SELECT * FROM blood_donors WHERE user_id = ?", (user["id"],)).fetchone())
        my_requests = rows_to_dicts(
            conn.execute("SELECT * FROM blood_requests WHERE requester_user_id = ? ORDER BY created_at_utc DESC", (user["id"],)).fetchall()
        )
        incoming_matches = []
        if donor:
            incoming_matches = rows_to_dicts(
                conn.execute(
                    """
                    SELECT m.*, r.patient_ref_label, r.blood_group, r.units_required, r.urgency_level,
                           r.hospital_name, r.hospital_verified, r.division, r.district, r.status AS request_status,
                           r.lat, r.lng, r.notes
                      FROM blood_match_logs m
                      JOIN blood_requests r ON r.id = m.request_id
                     WHERE m.donor_id = ?
                     ORDER BY m.notified_at_utc DESC
                    """,
                    (donor["id"],),
                ).fetchall()
            )
    if donor:
        donor["days_since_last_donation"] = _days_since(donor.get("last_donation_date"))
        donor["screening_policy_acknowledged"] = bool(donor.get("screening_policy_acknowledged", 1))
    return {"donor_profile": donor, "my_requests": my_requests, "incoming_matches": incoming_matches}


@router.post("/donors/register")
def register_or_update_donor(payload: DonorRegisterPayload, user: dict = Depends(get_current_user)):
    now = utc_now_iso()
    with get_db_conn() as conn:
        existing = row_to_dict(conn.execute("SELECT id FROM blood_donors WHERE user_id = ?", (user["id"],)).fetchone())
        conn.execute("BEGIN IMMEDIATE;")
        try:
            if existing:
                donor_id = existing["id"]
                conn.execute(
                    """
                    UPDATE blood_donors
                       SET display_name = ?, blood_group = ?, donation_type = ?, last_donation_date = ?,
                           availability_status = ?, division = ?, district = ?, area_name = ?,
                           lat = ?, lng = ?, contact_phone = ?, screening_policy_acknowledged = ?, updated_at_utc = ?
                     WHERE id = ?
                    """,
                    (
                        payload.display_name.strip(),
                        payload.blood_group,
                        payload.donation_type,
                        payload.last_donation_date,
                        payload.availability_status,
                        payload.division.strip(),
                        payload.district.strip(),
                        payload.area_name.strip(),
                        payload.lat,
                        payload.lng,
                        payload.contact_phone.strip(),
                        1 if payload.screening_policy_acknowledged else 0,
                        now,
                        donor_id,
                    ),
                )
            else:
                donor_id = new_id("bdon")
                conn.execute(
                    """
                    INSERT INTO blood_donors (
                        id, user_id, display_name, blood_group, donation_type, last_donation_date,
                        availability_status, division, district, area_name, lat, lng, contact_phone,
                        trust_score, verified_donations_count, no_show_count, screening_policy_acknowledged,
                        is_synthetic, created_at_utc, updated_at_utc
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 4.8, 0, 0, ?, 0, ?, ?)
                    """,
                    (
                        donor_id,
                        user["id"],
                        payload.display_name.strip(),
                        payload.blood_group,
                        payload.donation_type,
                        payload.last_donation_date,
                        payload.availability_status,
                        payload.division.strip(),
                        payload.district.strip(),
                        payload.area_name.strip(),
                        payload.lat,
                        payload.lng,
                        payload.contact_phone.strip(),
                        1 if payload.screening_policy_acknowledged else 0,
                        now,
                        now,
                    ),
                )
            record_audit(
                conn,
                actor_user_id=user["id"],
                actor_role=user["primary_role"],
                action_type="BLOOD_DONOR_PROFILE_SAVED",
                target_resource="blood_donors",
                target_id=donor_id,
                details={"blood_group": payload.blood_group, "availability": payload.availability_status},
            )
            conn.execute("COMMIT;")
        except Exception:
            conn.execute("ROLLBACK;")
            raise
    return {"ok": True, "donor_id": donor_id, "contact_privacy": "MASKED_UNTIL_CONSENT"}


@router.post("/requests", status_code=201)
def create_blood_request(payload: CreateBloodRequestPayload, user: dict = Depends(get_current_user)):
    now = utc_now_iso()
    one_hr_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%S.000Z")

    with get_db_conn() as conn:
        recent_count = conn.execute(
            "SELECT COUNT(*) FROM blood_requests WHERE requester_user_id = ? AND created_at_utc >= ?",
            (user["id"], one_hr_ago),
        ).fetchone()[0]
        if recent_count >= 5:
            raise HTTPException(
                status_code=429,
                detail="RATE_LIMIT_EXCEEDED: Maximum 5 blood requests per hour to prevent donor alert fatigue.",
            )

        hospital_verified = 1 if user.get("primary_role") in ("DOCTOR", "ADMIN") else 0
        req_id = new_id("breq")

        conn.execute("BEGIN IMMEDIATE;")
        try:
            conn.execute(
                """
                INSERT INTO blood_requests (
                    id, requester_user_id, patient_ref_label, blood_group, units_required, units_fulfilled,
                    urgency_level, hospital_name, hospital_verified, division, district, lat, lng,
                    search_radius_km, needed_by_utc, notes, status, is_synthetic, created_at_utc, updated_at_utc
                ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', 0, ?, ?)
                """,
                (
                    req_id,
                    user["id"],
                    payload.patient_ref_label.strip(),
                    payload.blood_group,
                    payload.units_required,
                    payload.urgency_level,
                    payload.hospital_name.strip(),
                    hospital_verified,
                    payload.division.strip(),
                    payload.district.strip(),
                    payload.lat,
                    payload.lng,
                    payload.search_radius_km,
                    payload.needed_by_utc,
                    payload.notes.strip(),
                    now,
                    now,
                ),
            )

            notified_count = 0
            if payload.auto_notify_nearby:
                cand_rows = rows_to_dicts(
                    conn.execute(
                        "SELECT * FROM blood_donors WHERE availability_status = 'AVAILABLE' AND blood_group = ? AND (user_id IS NULL OR user_id != ?)",
                        (payload.blood_group, user["id"]),
                    ).fetchall()
                )
                within_radius = [
                    (d, _haversine_km(payload.lat, payload.lng, float(d["lat"]), float(d["lng"])))
                    for d in cand_rows
                ]
                within_radius = [x for x in within_radius if x[1] <= payload.search_radius_km]
                within_radius.sort(key=lambda x: (x[1], -x[0]["trust_score"]))
                for donor, dist in within_radius[:10]:  # Anti-spam cap: max 10 donors pinged
                    conn.execute(
                        """
                        INSERT OR IGNORE INTO blood_match_logs (id, request_id, donor_id, notified_at_utc, response_status)
                        VALUES (?, ?, ?, ?, 'NOTIFIED')
                        """,
                        (new_id("bmat"), req_id, donor["id"], now),
                    )
                    notified_count += 1
                    if donor.get("user_id"):
                        notify_user(
                            conn,
                            recipient_user_id=donor["user_id"],
                            topic=f"BLOOD_{payload.urgency_level}",
                            entity_type="blood_request",
                            entity_id=req_id,
                            title_bn=f"{payload.blood_group} রক্তের {payload.urgency_level} অনুরোধ ({payload.hospital_name}, {dist} কিমি দূরে)",
                            title_en=f"{payload.blood_group} {payload.urgency_level} blood request at {payload.hospital_name} ({dist} km)",
                        )

            record_audit(
                conn,
                actor_user_id=user["id"],
                actor_role=user["primary_role"],
                action_type="BLOOD_REQUEST_CREATED",
                target_resource="blood_requests",
                target_id=req_id,
                details={"blood_group": payload.blood_group, "radius_km": payload.search_radius_km, "notified": notified_count},
            )
            conn.execute("COMMIT;")
        except Exception:
            conn.execute("ROLLBACK;")
            raise

    return {"ok": True, "request_id": req_id, "notified_donors_count": notified_count, "hospital_verified": bool(hospital_verified)}


@router.post("/requests/{request_id}/notify-donors")
def notify_selected_donors(request_id: str, payload: NotifyDonorsPayload, user: dict = Depends(get_current_user)):
    now = utc_now_iso()
    with get_db_conn() as conn:
        req = row_to_dict(conn.execute("SELECT * FROM blood_requests WHERE id = ?", (request_id,)).fetchone())
        if not req:
            raise HTTPException(status_code=404, detail="Blood request not found.")
        if req["requester_user_id"] != user["id"] and user.get("primary_role") != "ADMIN":
            raise HTTPException(status_code=403, detail="Only request owner or Admin may dispatch donor pings.")
        existing_cnt = conn.execute("SELECT COUNT(*) FROM blood_match_logs WHERE request_id = ?", (request_id,)).fetchone()[0]
        if existing_cnt + len(payload.donor_ids) > 10:
            raise HTTPException(status_code=429, detail="ANTI_SPAM_CAP: Maximum 10 donor notifications permitted per request.")

        added = 0
        conn.execute("BEGIN IMMEDIATE;")
        try:
            for did in payload.donor_ids:
                donor = row_to_dict(conn.execute("SELECT id, user_id FROM blood_donors WHERE id = ?", (did,)).fetchone())
                if not donor:
                    continue
                cur = conn.execute(
                    "INSERT OR IGNORE INTO blood_match_logs (id, request_id, donor_id, notified_at_utc, response_status) VALUES (?, ?, ?, ?, 'NOTIFIED')",
                    (new_id("bmat"), request_id, did, now),
                )
                if cur.rowcount > 0:
                    added += 1
                    if donor.get("user_id"):
                        notify_user(
                            conn,
                            recipient_user_id=donor["user_id"],
                            topic=f"BLOOD_{req['urgency_level']}",
                            entity_type="blood_request",
                            entity_id=request_id,
                            title_bn=f"{req['blood_group']} রক্তের সরাসরি অনুরোধ — {req['hospital_name']}",
                            title_en=f"Direct {req['blood_group']} donor request for {req['hospital_name']}",
                        )
            conn.execute("COMMIT;")
        except Exception:
            conn.execute("ROLLBACK;")
            raise
    return {"ok": True, "newly_notified": added}


@router.post("/requests/{request_id}/respond")
def respond_to_blood_request(request_id: str, payload: RespondMatchPayload, user: dict = Depends(get_current_user)):
    if payload.decision == "ACCEPTED" and not payload.consent_phone_shared:
        raise HTTPException(
            status_code=422,
            detail="CONSENT_REQUIRED: Donor must explicitly consent before unlocking contact info.",
        )

    now = utc_now_iso()
    with get_db_conn() as conn:
        req = row_to_dict(conn.execute("SELECT * FROM blood_requests WHERE id = ?", (request_id,)).fetchone())
        if not req:
            raise HTTPException(status_code=404, detail="Blood request not found.")
        if req["status"] in ("FULFILLED", "CANCELLED"):
            raise HTTPException(status_code=409, detail="Request is already closed.")

        donor = row_to_dict(conn.execute("SELECT * FROM blood_donors WHERE user_id = ?", (user["id"],)).fetchone())
        if not donor:
            raise HTTPException(
                status_code=412,
                detail="DONOR_PROFILE_REQUIRED: Register your donor profile in Blood Connect before responding.",
            )

        conn.execute("BEGIN IMMEDIATE;")
        try:
            existing_match = row_to_dict(
                conn.execute("SELECT id FROM blood_match_logs WHERE request_id = ? AND donor_id = ?", (request_id, donor["id"])).fetchone()
            )
            consent_int = 1 if (payload.decision == "ACCEPTED" and payload.consent_phone_shared) else 0
            if existing_match:
                match_id = existing_match["id"]
                conn.execute(
                    """
                    UPDATE blood_match_logs
                       SET response_status = ?, consent_phone_shared = ?, responded_at_utc = ?
                     WHERE id = ?
                    """,
                    (payload.decision, consent_int, now, match_id),
                )
            else:
                match_id = new_id("bmat")
                conn.execute(
                    """
                    INSERT INTO blood_match_logs (
                        id, request_id, donor_id, notified_at_utc, response_status, consent_phone_shared, responded_at_utc
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (match_id, request_id, donor["id"], now, payload.decision, consent_int, now),
                )

            if payload.decision == "ACCEPTED":
                conn.execute("UPDATE blood_requests SET status = 'MATCHED', updated_at_utc = ? WHERE id = ? AND status = 'OPEN'", (now, request_id))
                notify_user(
                    conn,
                    recipient_user_id=req["requester_user_id"],
                    topic="BLOOD_DONOR_ACCEPTED",
                    entity_type="blood_request",
                    entity_id=request_id,
                    title_bn=f"{donor['display_name']} ({donor['blood_group']}) আপনার রক্তের অনুরোধ গ্রহণ ও নম্বর শেয়ার করেছেন",
                    title_en=f"{donor['display_name']} ({donor['blood_group']}) accepted and consented to share contact info",
                )

            record_audit(
                conn,
                actor_user_id=user["id"],
                actor_role=user["primary_role"],
                action_type=f"BLOOD_REQUEST_{payload.decision}",
                target_resource="blood_match_logs",
                target_id=match_id,
                details={"request_id": request_id, "consent_phone_shared": bool(consent_int)},
            )
            conn.execute("COMMIT;")
        except Exception:
            conn.execute("ROLLBACK;")
            raise

    return {
        "ok": True,
        "match_id": match_id,
        "response_status": payload.decision,
        "contact_privacy": "UNLOCKED_BY_CONSENT" if payload.decision == "ACCEPTED" else "HIDDEN_UNTIL_CONSENT",
    }


@router.post("/matches/{match_id}/confirm")
def confirm_donation_or_feedback(match_id: str, payload: ConfirmMatchPayload, user: dict = Depends(get_current_user)):
    now = utc_now_iso()
    today_str = date.today().isoformat()

    with get_db_conn() as conn:
        match = row_to_dict(conn.execute("SELECT * FROM blood_match_logs WHERE id = ?", (match_id,)).fetchone())
        if not match:
            raise HTTPException(status_code=404, detail="Match record not found.")
        req = row_to_dict(conn.execute("SELECT * FROM blood_requests WHERE id = ?", (match["request_id"],)).fetchone())
        donor = row_to_dict(conn.execute("SELECT * FROM blood_donors WHERE id = ?", (match["donor_id"],)).fetchone())
        if not req or not donor:
            raise HTTPException(status_code=404, detail="Linked request or donor not found.")

        is_req = req["requester_user_id"] == user["id"]
        is_don = donor.get("user_id") == user["id"]
        is_adm = user.get("primary_role") == "ADMIN"
        if not (is_req or is_don or is_adm):
            raise HTTPException(status_code=403, detail="Not authorized to confirm this blood match.")

        conn.execute("BEGIN IMMEDIATE;")
        try:
            if payload.action == "MARK_NO_SHOW":
                if not (is_req or is_adm):
                    raise HTTPException(status_code=403, detail="Only requester or Admin can report a donor no-show.")
                new_no_show = int(donor["no_show_count"]) + 1
                new_trust = max(1.0, round(float(donor["trust_score"]) - 0.35, 2))
                conn.execute(
                    "UPDATE blood_match_logs SET response_status = 'NO_SHOW', consent_phone_shared = 0, feedback_note = ?, completed_at_utc = ? WHERE id = ?",
                    (payload.feedback_note.strip() or "No-show reported", now, match_id),
                )
                conn.execute(
                    "UPDATE blood_donors SET no_show_count = ?, trust_score = ?, updated_at_utc = ? WHERE id = ?",
                    (new_no_show, new_trust, now, donor["id"]),
                )
                req_final_status = req["status"]
            else:
                req_conf = 1 if (match["requester_confirmed"] or is_req or is_adm) else 0
                don_conf = 1 if (match["donor_confirmed"] or is_don or is_adm) else 0
                was_completed = match["response_status"] == "COMPLETED"

                conn.execute(
                    """
                    UPDATE blood_match_logs
                       SET response_status = 'COMPLETED',
                           requester_confirmed = ?,
                           donor_confirmed = ?,
                           feedback_rating = COALESCE(?, feedback_rating),
                           feedback_note = CASE WHEN ? != '' THEN ? ELSE feedback_note END,
                           completed_at_utc = COALESCE(completed_at_utc, ?)
                     WHERE id = ?
                    """,
                    (
                        req_conf,
                        don_conf,
                        payload.feedback_rating,
                        payload.feedback_note.strip(),
                        payload.feedback_note.strip(),
                        now,
                        match_id,
                    ),
                )

                new_units = int(req["units_fulfilled"]) + (0 if was_completed else 1)
                req_final_status = "FULFILLED" if new_units >= int(req["units_required"]) else "MATCHED"
                conn.execute(
                    "UPDATE blood_requests SET units_fulfilled = ?, status = ?, updated_at_utc = ? WHERE id = ?",
                    (new_units, req_final_status, now, req["id"]),
                )

                if not was_completed:
                    rating_val = float(payload.feedback_rating) if payload.feedback_rating else 5.0
                    prev_count = int(donor["verified_donations_count"])
                    updated_trust = round(((float(donor["trust_score"]) * (prev_count + 1)) + rating_val) / (prev_count + 2), 2)
                    conn.execute(
                        """
                        UPDATE blood_donors
                           SET verified_donations_count = verified_donations_count + 1,
                               trust_score = ?,
                               last_donation_date = ?,
                               availability_status = 'RECENTLY_DONATED',
                               updated_at_utc = ?
                         WHERE id = ?
                        """,
                        (min(5.0, updated_trust), today_str, now, donor["id"]),
                    )

            record_audit(
                conn,
                actor_user_id=user["id"],
                actor_role=user["primary_role"],
                action_type=f"BLOOD_MATCH_{payload.action}",
                target_resource="blood_match_logs",
                target_id=match_id,
                details={"request_status": req_final_status},
            )
            conn.execute("COMMIT;")
        except HTTPException:
            conn.execute("ROLLBACK;")
            raise
        except Exception:
            conn.execute("ROLLBACK;")
            raise

    return {"ok": True, "match_id": match_id, "request_status": req_final_status, "contact_revoked_if_closed": req_final_status == "FULFILLED"}


@router.patch("/requests/{request_id}/close")
def close_blood_request(request_id: str, user: dict = Depends(get_current_user)):
    now = utc_now_iso()
    with get_db_conn() as conn:
        req = row_to_dict(conn.execute("SELECT * FROM blood_requests WHERE id = ?", (request_id,)).fetchone())
        if not req:
            raise HTTPException(status_code=404, detail="Blood request not found.")
        if req["requester_user_id"] != user["id"] and user.get("primary_role") != "ADMIN":
            raise HTTPException(status_code=403, detail="Only request owner or Admin can close this request.")
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute("UPDATE blood_requests SET status = 'CANCELLED', updated_at_utc = ? WHERE id = ?", (now, request_id))
        record_audit(conn, actor_user_id=user["id"], actor_role=user["primary_role"], action_type="BLOOD_REQUEST_CLOSED", target_resource="blood_requests", target_id=request_id)
        conn.execute("COMMIT;")
    return {"ok": True, "status": "CANCELLED", "contact_privacy": "ACCESS_REVOKED_CLOSED"}


@router.patch("/requests/{request_id}/verify-emergency")
def verify_emergency_request(request_id: str, user: dict = Depends(require_role("DOCTOR", "ADMIN"))):
    now = utc_now_iso()
    with get_db_conn() as conn:
        req = row_to_dict(conn.execute("SELECT * FROM blood_requests WHERE id = ?", (request_id,)).fetchone())
        if not req:
            raise HTTPException(status_code=404, detail="Blood request not found.")
        new_flag = 0 if req["hospital_verified"] else 1
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute("UPDATE blood_requests SET hospital_verified = ?, updated_at_utc = ? WHERE id = ?", (new_flag, now, request_id))
        record_audit(conn, actor_user_id=user["id"], actor_role=user["primary_role"], action_type="BLOOD_REQUEST_HOSPITAL_VERIFY", target_resource="blood_requests", target_id=request_id, details={"verified": bool(new_flag)})
        conn.execute("COMMIT;")
    return {"ok": True, "hospital_verified": bool(new_flag)}
