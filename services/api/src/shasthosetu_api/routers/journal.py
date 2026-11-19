from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, Query

from ..db.sqlite import get_db_conn, row_to_dict, rows_to_dicts
from ..services.journal_sync import sync_journal_feeds

router = APIRouter(prefix="/v1/journal", tags=["Health Journal — Live News, PubMed & Bilingual Videos"])


@router.get("/feed")
def get_journal_feed(
    item_type: str = Query(default="ALL"),
    language: str = Query(default="ALL"),
    category: str = Query(default="ALL"),
    q: str = Query(default="", max_length=100),
    limit: int = Query(default=40, ge=1, le=100),
):
    with get_db_conn() as conn:
        has_runs = conn.execute("SELECT COUNT(*) FROM journal_sync_runs").fetchone()[0]
    if has_runs == 0:
        sync_journal_feeds(force=True)

    sql = "SELECT * FROM journal_items WHERE 1=1"
    params: list = []
    if item_type != "ALL" and item_type in ("NEWS", "VIDEO", "RESEARCH", "BLOG"):
        sql += " AND item_type = ?"
        params.append(item_type)
    if language != "ALL" and language in ("bn", "en"):
        sql += " AND (language = ? OR language = 'bilingual')"
        params.append(language)
    if category != "ALL":
        sql += " AND category = ?"
        params.append(category)
    if q.strip():
        like = f"%{q.strip().lower()}%"
        sql += " AND (lower(title) LIKE ? OR lower(title_bn) LIKE ? OR lower(summary) LIKE ? OR lower(source_name) LIKE ?)"
        params.extend([like, like, like, like])

    sql += " ORDER BY CASE item_type WHEN 'BLOG' THEN 0 ELSE 1 END, published_at_utc DESC LIMIT ?"
    params.append(limit)

    with get_db_conn() as conn:
        rows = rows_to_dicts(conn.execute(sql, params).fetchall())
        type_counts = rows_to_dicts(conn.execute("SELECT item_type, COUNT(*) AS cnt FROM journal_items GROUP BY item_type").fetchall())
        lang_counts = rows_to_dicts(conn.execute("SELECT language, COUNT(*) AS cnt FROM journal_items GROUP BY language").fetchall())
        last_sync = row_to_dict(
            conn.execute("SELECT * FROM journal_sync_runs ORDER BY completed_at_utc DESC LIMIT 1").fetchone()
        )

    for r in rows:
        try:
            r["citation_meta"] = json.loads(r.get("citation_meta_json") or "{}")
        except Exception:
            r["citation_meta"] = {}

    return {
        "items": rows,
        "counts_by_type": {r["item_type"]: r["cnt"] for r in type_counts},
        "counts_by_language": {r["language"]: r["cnt"] for r in lang_counts},
        "last_sync": last_sync,
        "editorial_notice": {
            "en": "Health Journal items aggregate verified WHO RSS, MedlinePlus, PubMed E-utilities, DGHS/UNICEF Bangladesh videos, and reviewed editorial guides for education only — not medical advice.",
            "bn": "স্বাস্থ্যবার্তা বিভাগে WHO, MedlinePlus, PubMed এবং স্বাস্থ্য অধিদপ্তর/ইউনিসেফ বাংলাদেশের অনুমোদিত ভিডিও ও শিক্ষামূলক গাইড প্রদর্শিত হয় — এটি সরাসরি চিকিৎসার বিকল্প নয়।",
        },
    }


@router.post("/sync")
def trigger_journal_sync():
    return sync_journal_feeds(force=True)
