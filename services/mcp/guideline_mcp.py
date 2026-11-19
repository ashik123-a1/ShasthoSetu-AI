"""ShasthoSetu Custom MCP Server #1: guideline-mcp

Exposes read-only clinical knowledge base search (Bangla/English/Banglish),
approved RAG source inventory, frozen 16-model audit SHA-256 register, and
prompt/emergency safety inspection over official MCP stdio / SSE / Streamable HTTP.
"""

from __future__ import annotations

import csv
import re
import sys
import unicodedata
from pathlib import Path
from typing import Any

try:
    from mcp.server import MCPServer
except ImportError:
    from mcp.server.mcpserver.server import MCPServer

_PROJECT_ROOT = str(Path(__file__).resolve().parents[2])
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

try:
    from .common import FINAL_LOCK_DIR, get_readonly_db_conn, run_mcp_server, to_pretty_json
except ImportError:
    from services.mcp.common import FINAL_LOCK_DIR, get_readonly_db_conn, run_mcp_server, to_pretty_json

from shasthosetu_api.config import settings
from shasthosetu_api.services.safety_guard import inspect_user_query

_BANGLISH_HINTS: dict[str, str] = {
    "pcos": "pcos irregular menstrual insulin ultrasound পিসিওএস মাসিক",
    "osudh": "medicine medication reminder ওষুধ",
    "oshudh": "medicine medication ওষুধ",
    "jor": "fever dengue measles জ্বর",
    "ham": "measles viral rash হাম",
    "rash": "measles chickenpox rash র‍্যাশ",
    "chulkani": "skin rash itchy চুলকানি",
    "rokto": "blood donation transfusion রক্ত",
    "daktar": "doctor consultation ডাক্তার",
    "tika": "vaccine epi immunization টিকা",
    "baccha": "pediatric child শিশু",
    "shishu": "pediatric child শিশু",
    "shashkoshto": "breathing emergency 999 শ্বাসকষ্ট",
    "ocr": "prescription verification 422 প্রেসক্রিপশন",
}


def _tokenize(text: str) -> list[str]:
    norm = unicodedata.normalize("NFC", (text or "").lower())
    return re.findall(r"[a-z0-9\+\-\.]+|[\u0980-\u09FF]+", norm)


def search_clinical_guidelines(query: str, language: str = "auto", top_k: int = 5) -> dict[str, Any]:
    """Search approved ShasthoSetu clinical RAG corpus chunks with multilingual BM25/keyword scoring."""
    clean_q = (query or "").strip()
    if not clean_q:
        return {"query": "", "matches": [], "count": 0, "policy": "Non-diagnostic evidence retrieval only."}

    safety = inspect_user_query(clean_q)
    tokens = _tokenize(clean_q)
    expanded: list[str] = list(tokens)
    for t in tokens:
        if t in _BANGLISH_HINTS:
            expanded.extend(_tokenize(_BANGLISH_HINTS[t]))
    term_set = set(expanded)

    top_k = max(1, min(int(top_k or 5), 10))
    with get_readonly_db_conn() as conn:
        rows = conn.execute(
            """
            SELECT c.id AS chunk_id,
                   c.section_heading,
                   c.page_or_section_ref,
                   c.language,
                   c.chunk_text,
                   s.id AS source_id,
                   s.title AS source_title,
                   s.publisher,
                   s.category
              FROM rag_chunks c
              JOIN rag_sources s ON s.id = c.source_id
             WHERE s.review_status = 'APPROVED' AND c.is_active = 1
            """
        ).fetchall()

    scored: list[tuple[float, dict[str, Any]]] = []
    for r in rows:
        item = dict(r)
        if language in {"bn", "en"} and item["language"] not in {language, "bilingual"}:
            lang_bonus = 0.0
        else:
            lang_bonus = 0.5
        chunk_tokens = set(_tokenize(f"{item['section_heading']} {item['source_title']} {item['chunk_text']}"))
        overlap = len(term_set & chunk_tokens)
        if overlap == 0:
            continue
        title_tokens = set(_tokenize(f"{item['section_heading']} {item['source_title']}"))
        title_boost = 1.5 * len(term_set & title_tokens)
        score = round(overlap + title_boost + lang_bonus, 3)
        scored.append(
            (
                score,
                {
                    "chunk_id": item["chunk_id"],
                    "source_id": item["source_id"],
                    "source_title": item["source_title"],
                    "publisher": item["publisher"],
                    "category": item["category"],
                    "section_heading": item["section_heading"],
                    "language": item["language"],
                    "score": score,
                    "excerpt": item["chunk_text"][:420].strip(),
                },
            )
        )

    scored.sort(key=lambda pair: pair[0], reverse=True)
    matches = [item for _, item in scored[:top_k]]
    return {
        "query": clean_q,
        "language_filter": language,
        "safety_screen": {
            "language_detected": safety.get("language_detected"),
            "emergency_detected": bool(safety.get("is_emergency")),
            "prompt_injection_detected": bool(safety.get("is_injection")),
            "flags": safety.get("flags", []),
        },
        "total_approved_chunks_scanned": len(rows),
        "count": len(matches),
        "matches": matches,
        "policy": "Grounded informational excerpts ONLY — never diagnostic or prescribing advice.",
    }


def list_approved_rag_sources() -> dict[str, Any]:
    """List admin-approved clinical knowledge sources and active chunk counts."""
    with get_readonly_db_conn() as conn:
        rows = conn.execute(
            """
            SELECT s.id, s.slug, s.title, s.title_bn, s.publisher, s.category, s.language,
                   s.review_status, s.publication_date,
                   COUNT(c.id) AS active_chunks
              FROM rag_sources s
              LEFT JOIN rag_chunks c ON c.source_id = s.id AND c.is_active = 1
             WHERE s.review_status = 'APPROVED'
             GROUP BY s.id
             ORDER BY s.title ASC
            """
        ).fetchall()
    sources = [dict(r) for r in rows]
    return {
        "approved_source_count": len(sources),
        "total_active_chunks": sum(int(s["active_chunks"]) for s in sources),
        "sources": sources,
    }


def get_frozen_model_register(module: str = "") -> dict[str, Any]:
    """Read audited model checkpoints & SHA-256 hashes from FINAL_RESEARCH_MODEL_REGISTER.csv."""
    csv_path = FINAL_LOCK_DIR / "FINAL_RESEARCH_MODEL_REGISTER.csv"
    if not csv_path.exists():
        return {"error": f"Register file not found at {csv_path}", "models": []}
    with csv_path.open("r", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    mod_filter = (module or "").strip().lower()
    if mod_filter:
        rows = [r for r in rows if mod_filter in (r.get("module") or "").lower() or mod_filter in (r.get("model_id") or "").lower()]
    return {
        "register_file": csv_path.name,
        "filter": module or "ALL",
        "count": len(rows),
        "models": [
            {
                "model_id": r.get("model_id"),
                "module": r.get("module"),
                "model_name": r.get("model_name"),
                "architecture": r.get("architecture"),
                "primary_metric": f"{r.get('primary_metric_name')}: {r.get('primary_metric_value')}",
                "audit_status": r.get("audit_status"),
                "sha256_prefix": (r.get("sha256_hash") or "")[:16],
                "scientific_classification": r.get("scientific_classification"),
            }
            for r in rows
        ],
    }


def check_clinical_safety_guard(text: str) -> dict[str, Any]:
    """Run ShasthoSetu emergency red-flag & prompt-injection detector on user text."""
    res = inspect_user_query(text or "")
    is_emergency = bool(res.get("is_emergency"))
    is_injection = bool(res.get("is_injection"))
    return {
        "input_preview": (text or "")[:160],
        "language_detected": res.get("language_detected"),
        "is_emergency": is_emergency,
        "is_prompt_injection": is_injection,
        "asks_dosage_or_rx": bool(res.get("asks_dosage_or_rx")),
        "flags": res.get("flags", []),
        "recommended_action": (
            "EMERGENCY_ESCALATION_999_OR_HOSPITAL"
            if is_emergency
            else "BLOCK_PROMPT_INJECTION"
            if is_injection
            else "ALLOW_SAFE_RAG_PIPELINE"
        ),
    }


def get_rag_status_resource() -> str:
    sources = list_approved_rag_sources()
    return to_pretty_json(
        {
            "server": "guideline-mcp",
            "ollama_chat_model": settings.ollama_chat_model,
            "ollama_embed_model": settings.ollama_embed_model,
            "approved_sources": sources["approved_source_count"],
            "active_chunks": sources["total_active_chunks"],
        }
    )


def get_final_lock_resource() -> str:
    reg = get_frozen_model_register()
    return to_pretty_json(
        {
            "server": "guideline-mcp",
            "audit_verdict": "RESEARCH_AUDIT_PASS_WITH_LIMITATIONS",
            "audited_model_count": reg["count"],
            "critical_guardrails": [
                "HTTP 422 mandatory human verification gate on OCR medication schedules",
                "N=22 strict patient-level Pediculosis limitation disclosure on DermoPed",
                "Zero diagnostic or treatment prescribing claims",
            ],
        }
    )


mcp = MCPServer(
    "guideline-mcp",
    instructions="Read-only clinical guidelines RAG search, audited model register, and safety guard server for ShasthoSetu AI.",
)


@mcp.tool(name="search_clinical_guidelines", description="Search admin-approved ShasthoSetu Bangla/English medical guideline chunks (non-diagnostic).")
def tool_search_clinical_guidelines(query: str, language: str = "auto", top_k: int = 5) -> dict[str, Any]:
    return search_clinical_guidelines(query=query, language=language, top_k=top_k)


@mcp.tool(name="list_approved_rag_sources", description="List all admin-approved clinical knowledge sources and chunk counts in the RAG corpus.")
def tool_list_approved_rag_sources() -> dict[str, Any]:
    return list_approved_rag_sources()


@mcp.tool(name="get_frozen_model_register", description="Inspect the frozen 16-checkpoint ShasthoSetu research model SHA-256 register.")
def tool_get_frozen_model_register(module: str = "") -> dict[str, Any]:
    return get_frozen_model_register(module=module)


@mcp.tool(name="check_clinical_safety_guard", description="Run Bangladesh 999 emergency triage & prompt-injection safety screen on text.")
def tool_check_clinical_safety_guard(text: str) -> dict[str, Any]:
    return check_clinical_safety_guard(text=text)


@mcp.resource("guideline://rag/status", mime_type="application/json")
def resource_rag_status() -> str:
    return get_rag_status_resource()


@mcp.resource("guideline://audit/final-lock", mime_type="application/json")
def resource_final_lock() -> str:
    return get_final_lock_resource()


if __name__ == "__main__":
    run_mcp_server(mcp, default_port=8101)
