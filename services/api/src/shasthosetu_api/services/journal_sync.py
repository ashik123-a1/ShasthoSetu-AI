from __future__ import annotations

import json
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from html import unescape
from typing import Any

from ..core.security import new_id, utc_now_iso
from ..db.sqlite import get_db_conn, row_to_dict

_HEADERS = {"User-Agent": "ShasthoSetuHealthJournal/1.0 (+https://localhost)"}
_TAG_RE = re.compile(r"<[^>]+>")
_BN_RE = re.compile(r"[\u0980-\u09FF]")


def _clean_text(raw: str | None, max_len: int = 340) -> str:
    if not raw:
        return ""
    txt = _TAG_RE.sub(" ", unescape(raw))
    txt = re.sub(r"\s+", " ", txt).strip()
    return txt[: max_len - 1] + "…" if len(txt) > max_len else txt


def _infer_category(text: str, default: str = "medical-news") -> str:
    low = text.lower()
    if any(k in low for k in ("blood", "donor", "transfusion", "রক্ত")):
        return "blood-donation"
    if any(k in low for k in ("child", "pediatric", "measles", "vaccine", "infant", "শিশু", "টিকা")):
        return "child-care"
    if any(k in low for k in ("pcos", "maternal", "pregnan", "women", "cervical", "ovarian", "মা", "নারী")):
        return "womens-health"
    if any(k in low for k in ("bangladesh", "dhaka", "dengue", "ডেঙ্গু", "বাংলাদেশ")):
        return "bangladesh-health"
    return default


def _upsert_item(conn, *, item_type: str, language: str, category: str, title: str, title_bn: str, summary: str, summary_bn: str, source_name: str, source_url: str, video_id: str | None = None, video_embed_url: str | None = None, thumbnail_url: str | None = None, published_at: str = "", editorial_status: str = "VERIFIED_OFFICIAL_FEED", citation_meta: dict[str, Any] | None = None) -> int:
    if not title or not source_url:
        return 0
    pub = published_at or utc_now_iso()
    now = utc_now_iso()
    meta_str = json.dumps(citation_meta or {}, ensure_ascii=False)
    cur = conn.execute(
        """
        INSERT OR IGNORE INTO journal_items (
            id, item_type, language, category, title, title_bn, summary, summary_bn,
            source_name, source_url, video_id, video_embed_url, thumbnail_url,
            published_at_utc, fetched_at_utc, editorial_status, citation_meta_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            new_id("jrn"),
            item_type,
            language,
            category,
            title,
            title_bn,
            summary,
            summary_bn,
            source_name,
            source_url,
            video_id,
            video_embed_url,
            thumbnail_url,
            pub,
            now,
            editorial_status,
            meta_str,
        ),
    )
    return 1 if cur.rowcount > 0 else 0


def _fetch_bytes(url: str, timeout: int = 8) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers=_HEADERS), timeout=timeout) as resp:
        return resp.read()


def _parse_rss_feed(url: str, source_name: str, default_cat: str, limit: int = 6) -> list[dict]:
    raw = _fetch_bytes(url)
    root = ET.fromstring(raw)
    items = []
    for node in root.findall(".//item")[:limit]:
        title = _clean_text(node.findtext("title"), 220)
        link = (node.findtext("link") or "").strip()
        desc = _clean_text(node.findtext("description"), 340)
        pub = (node.findtext("pubDate") or utc_now_iso()).strip()
        if title and link:
            items.append(
                {
                    "item_type": "NEWS",
                    "language": "en",
                    "category": _infer_category(f"{title} {desc}", default_cat),
                    "title": title,
                    "title_bn": "",
                    "summary": desc or f"Official public health update published by {source_name}.",
                    "summary_bn": "",
                    "source_name": source_name,
                    "source_url": link,
                    "published_at": pub,
                }
            )
    return items


def _parse_pubmed_api(limit: int = 6) -> list[dict]:
    search_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?" + urllib.parse.urlencode(
        {
            "db": "pubmed",
            "term": "PCOS[Title/Abstract] OR telemedicine[Title] OR pediatric rash[Title/Abstract] OR Bangladesh[Title]",
            "retmax": str(limit),
            "sort": "pub+date",
            "retmode": "json",
        }
    )
    search_data = json.loads(_fetch_bytes(search_url).decode("utf-8", errors="replace"))
    pmids = (search_data.get("esearchresult") or {}).get("idlist") or []
    if not pmids:
        return []
    sum_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?" + urllib.parse.urlencode(
        {"db": "pubmed", "id": ",".join(pmids), "retmode": "json"}
    )
    sum_data = json.loads(_fetch_bytes(sum_url).decode("utf-8", errors="replace"))
    result = sum_data.get("result") or {}
    out = []
    for pmid in pmids:
        doc = result.get(pmid)
        if not isinstance(doc, dict):
            continue
        title = _clean_text(doc.get("title"), 240)
        journal = doc.get("fulljournalname") or doc.get("source") or "PubMed"
        pubdate = doc.get("pubdate") or "2026"
        authors = [a.get("name") for a in (doc.get("authors") or [])[:3] if a.get("name")]
        summary = f"Published in {journal} ({pubdate}). Authors: {', '.join(authors) if authors else 'Clinical Authors'}."
        out.append(
            {
                "item_type": "RESEARCH",
                "language": "en",
                "category": _infer_category(title, "research"),
                "title": title,
                "title_bn": "",
                "summary": summary,
                "summary_bn": "",
                "source_name": "PubMed E-utilities",
                "source_url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                "published_at": pubdate,
                "citation_meta": {"pmid": pmid, "journal": journal, "authors": authors, "pubdate": pubdate},
            }
        )
    return out


def _parse_youtube_atom(channel_id: str, source_name: str, default_lang: str, default_cat: str, limit: int = 5) -> list[dict]:
    url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
    raw = _fetch_bytes(url)
    root = ET.fromstring(raw)
    ns = {
        "atom": "http://www.w3.org/2005/Atom",
        "yt": "http://www.youtube.com/xml/schemas/2015",
        "media": "http://search.yahoo.com/mrss/",
    }
    items = []
    for entry in root.findall("atom:entry", ns)[:limit]:
        vid_el = entry.find("yt:videoId", ns)
        title_el = entry.find("atom:title", ns)
        pub_el = entry.find("atom:published", ns)
        desc_el = entry.find("media:group/media:description", ns)
        if vid_el is None or title_el is None:
            continue
        vid = (vid_el.text or "").strip()
        title = _clean_text(title_el.text, 220)
        desc = _clean_text(desc_el.text if desc_el is not None else "", 280)
        has_bn = bool(_BN_RE.search(f"{title} {desc}"))
        lang = "bn" if has_bn else default_lang
        items.append(
            {
                "item_type": "VIDEO",
                "language": lang,
                "category": _infer_category(f"{title} {desc}", default_cat),
                "title": title,
                "title_bn": title if has_bn else "",
                "summary": desc or f"Official public health video briefing from {source_name}.",
                "summary_bn": desc if has_bn else "",
                "source_name": source_name,
                "source_url": f"https://www.youtube.com/watch?v={vid}",
                "video_id": vid,
                "video_embed_url": f"https://www.youtube-nocookie.com/embed/{vid}?rel=0",
                "thumbnail_url": f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
                "published_at": (pub_el.text if pub_el is not None else utc_now_iso()).strip(),
            }
        )
    return items


def sync_journal_feeds(force: bool = False) -> dict:
    """Sync live official WHO RSS, MedlinePlus RSS, PubMed API & Bangla/English health video feeds cleanly."""
    with get_db_conn() as conn:
        if not force:
            last_ok = row_to_dict(
                conn.execute(
                    "SELECT completed_at_utc FROM journal_sync_runs WHERE status IN ('SUCCESS', 'PARTIAL') ORDER BY completed_at_utc DESC LIMIT 1"
                ).fetchone()
            )
            if last_ok and last_ok.get("completed_at_utc"):
                try:
                    dt = datetime.fromisoformat(last_ok["completed_at_utc"].replace("Z", "+00:00"))
                    if datetime.now(timezone.utc) - dt < timedelta(hours=6):
                        return {"skipped": True, "reason": "Recent SQLite cache valid (<6h).", "completed_at_utc": last_ok["completed_at_utc"]}
                except Exception:
                    pass

    started = utc_now_iso()
    run_id = new_id("jsync")
    sources_report: dict[str, str] = {}
    collected: list[dict] = []

    fetchers = [
        ("WHO News RSS", lambda: _parse_rss_feed("https://www.who.int/rss-feeds/news-english.xml", "WHO Newsroom", "medical-news", 6)),
        ("MedlinePlus RSS", lambda: _parse_rss_feed("https://medlineplus.gov/feeds/whatsnew.xml", "MedlinePlus (NIH)", "medical-news", 6)),
        ("PubMed API", lambda: _parse_pubmed_api(6)),
        ("WHO Bangladesh Videos (BN/EN)", lambda: _parse_youtube_atom("UCLvAY5BvbChXYiwUVC97SpQ", "WHO Bangladesh Official", "bilingual", "bangladesh-health", 5)),
        ("MIS DGHS Bangladesh Videos (BN)", lambda: _parse_youtube_atom("UCgs_ne2xHdbSHoPrleoW12A", "MIS DGHS Bangladesh", "bn", "bangladesh-health", 5)),
        ("UNICEF Bangladesh Videos", lambda: _parse_youtube_atom("UCguuyrfMQ7TPHqQeQzP8Umw", "UNICEF Bangladesh", "bilingual", "child-care", 5)),
        ("WHO Global Videos (EN)", lambda: _parse_youtube_atom("UC07-dOwgza1IguKA86jqxNA", "WHO Global YouTube", "en", "medical-news", 5)),
    ]

    ok_count = 0
    for name, fn in fetchers:
        try:
            batch = fn()
            collected.extend(batch)
            sources_report[name] = f"OK ({len(batch)})"
            ok_count += 1
        except Exception as exc:
            sources_report[name] = f"DEGRADED: {exc}"

    added = 0
    completed = utc_now_iso()
    status = "SUCCESS" if ok_count == len(fetchers) else ("PARTIAL" if ok_count > 0 else "FAILED")

    with get_db_conn() as conn:
        conn.execute("BEGIN IMMEDIATE;")
        try:
            for item in collected:
                added += _upsert_item(conn, **item)
            conn.execute(
                """
                INSERT INTO journal_sync_runs (id, started_at_utc, completed_at_utc, status, items_added, sources_json)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (run_id, started, completed, status, added, json.dumps(sources_report)),
            )
            conn.execute("COMMIT;")
        except Exception:
            conn.execute("ROLLBACK;")
            raise

    return {
        "run_id": run_id,
        "status": status,
        "items_fetched": len(collected),
        "items_added": added,
        "sources": sources_report,
        "completed_at_utc": completed,
    }
