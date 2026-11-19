from __future__ import annotations

import hashlib
import io
import json
import pickle
import re
import time
import unicodedata
from pathlib import Path
from typing import Any

import faiss
import httpx
import numpy as np
from bs4 import BeautifulSoup
from docx import Document as DocxDocument
from pypdf import PdfReader
from rank_bm25 import BM25Okapi

from ..config import settings
from ..core.security import new_id, utc_now_iso
from ..db.sqlite import get_db_conn, row_to_dict, rows_to_dicts
from .model_manager import record_runtime_status
from .safety_guard import sanitize_untrusted_text

SUPPORTED_RAG_EXTENSIONS = {".md", ".markdown", ".txt", ".html", ".htm", ".pdf", ".docx"}
MAX_RAG_FILE_BYTES = 12 * 1024 * 1024  # 12 MB


def tokenize_multilingual(text: str) -> list[str]:
    """Unicode-aware word + Bengali/English token splitter for BM25."""
    norm = unicodedata.normalize("NFC", (text or "").lower())
    # Match English/alphanumeric tokens OR contiguous Bengali script blocks
    tokens = re.findall(r"[a-z0-9\+\-\.]+|[\u0980-\u09FF]+", norm)
    return [t for t in tokens if len(t) >= 2 or ("\u0980" <= t[0] <= "\u09FF")]


def parse_uploaded_document(file_bytes: bytes, filename: str) -> tuple[str, str, str]:
    """Validate and extract clean text from PDF, TXT, MD, HTML, or DOCX."""
    if not file_bytes:
        raise ValueError("Uploaded knowledge document is empty.")
    if len(file_bytes) > MAX_RAG_FILE_BYTES:
        raise ValueError("Knowledge document exceeds 12 MB limit.")

    ext = Path(filename or "").suffix.lower()
    if ext not in SUPPORTED_RAG_EXTENSIONS:
        raise ValueError(f"Unsupported format '{ext}'. Supported: PDF, TXT, MD, HTML, DOCX.")

    if ext in {".md", ".markdown", ".txt"}:
        mime = "text/markdown" if ext in {".md", ".markdown"} else "text/plain"
        raw = file_bytes.decode("utf-8", errors="replace")
        clean, _ = sanitize_untrusted_text(raw, max_chars=250_000)
        return clean, mime, "single"

    if ext in {".html", ".htm"}:
        raw_html = file_bytes.decode("utf-8", errors="replace")
        soup = BeautifulSoup(raw_html, "html.parser")
        for tag in soup(["script", "style", "noscript", "iframe", "object"]):
            tag.decompose()
        lines: list[str] = []
        for el in soup.find_all(["h1", "h2", "h3", "h4", "p", "li"]):
            txt = " ".join(el.get_text(" ", strip=True).split())
            if not txt:
                continue
            if el.name in {"h1", "h2"}:
                lines.append(f"## {txt}")
            elif el.name in {"h3", "h4"}:
                lines.append(f"### {txt}")
            else:
                lines.append(txt)
        joined = "\n\n".join(lines) if lines else soup.get_text("\n", strip=True)
        clean, _ = sanitize_untrusted_text(joined, max_chars=250_000)
        return clean, "text/html", "single"

    if ext == ".pdf":
        if file_bytes[:4] != b"%PDF":
            raise ValueError("Invalid PDF magic header.")
        reader = PdfReader(io.BytesIO(file_bytes))
        pages: list[str] = []
        for idx, page in enumerate(reader.pages[:80], start=1):
            txt = (page.extract_text() or "").strip()
            if txt:
                pages.append(f"## Page {idx}\n{txt}")
        if not pages:
            raise ValueError("PDF contains no extractable text layer.")
        clean, _ = sanitize_untrusted_text("\n\n".join(pages), max_chars=250_000)
        return clean, "application/pdf", "paged"

    # DOCX
    doc = DocxDocument(io.BytesIO(file_bytes))
    blocks: list[str] = []
    for p in doc.paragraphs:
        t = p.text.strip()
        if not t:
            continue
        style_name = (p.style.name or "").lower() if p.style else ""
        if "heading 1" in style_name or "title" in style_name:
            blocks.append(f"# {t}")
        elif "heading" in style_name:
            blocks.append(f"## {t}")
        else:
            blocks.append(t)
    if not blocks:
        raise ValueError("DOCX contains no readable paragraphs.")
    clean, _ = sanitize_untrusted_text("\n\n".join(blocks), max_chars=250_000)
    return clean, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "single"


def chunk_structured_document(
    clean_text: str,
    doc_title: str,
    language: str,
    max_words: int = 360,
    overlap_words: int = 55,
) -> list[dict[str, Any]]:
    """Structure-aware heading chunker preserving document title and section breadcrumb."""
    sections: list[tuple[str, str]] = []
    current_heading = "Overview"
    buffer: list[str] = []

    for line in (clean_text or "").splitlines():
        s = line.strip()
        if s.startswith("#"):
            if buffer:
                sections.append((current_heading, "\n".join(buffer).strip()))
                buffer = []
            current_heading = s.lstrip("#").strip() or current_heading
        else:
            if s:
                buffer.append(s)
    if buffer:
        sections.append((current_heading, "\n".join(buffer).strip()))

    if not sections:
        sections = [("Document", clean_text.strip())]

    chunks: list[dict[str, Any]] = []
    idx = 0
    for heading, body in sections:
        if not body:
            continue
        words = body.split()
        if len(words) <= max_words:
            chunk_body = f"Source: {doc_title}\nSection: {heading}\n\n{body}"
            chunks.append(
                {
                    "chunk_index": idx,
                    "section_heading": heading[:180],
                    "page_or_section_ref": heading[:120],
                    "language": language,
                    "chunk_text": chunk_body,
                    "token_estimate": max(1, int(len(chunk_body.split()) * 1.35)),
                }
            )
            idx += 1
        else:
            step = max(60, max_words - overlap_words)
            part = 1
            for start in range(0, len(words), step):
                sub = " ".join(words[start : start + max_words])
                if not sub.strip():
                    continue
                ref = f"{heading} (Part {part})"
                chunk_body = f"Source: {doc_title}\nSection: {ref}\n\n{sub}"
                chunks.append(
                    {
                        "chunk_index": idx,
                        "section_heading": heading[:180],
                        "page_or_section_ref": ref[:120],
                        "language": language,
                        "chunk_text": chunk_body,
                        "token_estimate": max(1, int(len(chunk_body.split()) * 1.35)),
                    }
                )
                idx += 1
                part += 1
                if start + max_words >= len(words):
                    break
    return chunks


def embed_texts_ollama(texts: list[str], batch_size: int = 16) -> np.ndarray:
    """Compute L2-normalized multilingual embeddings via Ollama /api/embed (bge-m3)."""
    if not texts:
        return np.zeros((0, 1024), dtype=np.float32)

    all_vecs: list[list[float]] = []
    record_runtime_status("ollama_embed", "PROCESSING", settings.ollama_embed_model, "ollama")
    try:
        with httpx.Client(timeout=settings.ai_request_timeout_sec) as client:
            for start in range(0, len(texts), batch_size):
                batch = texts[start : start + batch_size]
                resp = client.post(
                    f"{settings.ollama_base_url}/api/embed",
                    json={
                        "model": settings.ollama_embed_model,
                        "input": batch,
                        "keep_alive": "2m",
                    },
                )
                resp.raise_for_status()
                payload = resp.json()
                embs = payload.get("embeddings") or []
                if len(embs) != len(batch):
                    raise RuntimeError(f"Expected {len(batch)} embeddings, got {len(embs)}")
                all_vecs.extend(embs)
        mat = np.array(all_vecs, dtype=np.float32)
        norms = np.linalg.norm(mat, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        mat = mat / norms
        record_runtime_status("ollama_embed", "READY", settings.ollama_embed_model, "ollama", {"dim": int(mat.shape[1])})
        return mat
    except Exception as exc:
        record_runtime_status("ollama_embed", "FAILED", settings.ollama_embed_model, "ollama", {"error": str(exc)})
        raise RuntimeError(f"Ollama embedding failed ({settings.ollama_embed_model}): {exc}") from exc


def rebuild_rag_indexes(triggered_by_user_id: str | None = None, job_type: str = "ADMIN_REINDEX") -> dict[str, Any]:
    """Rebuild FAISS dense index + BM25 lexical index exclusively from APPROVED sources."""
    t0 = time.perf_counter()
    job_id = new_id("ragjob")
    idx_dir = settings.rag_index_dir
    idx_dir.mkdir(parents=True, exist_ok=True)
    index_version = f"idx-{int(time.time())}"

    with get_db_conn() as conn:
        conn.execute("BEGIN IMMEDIATE;")
        conn.execute(
            """
            INSERT INTO rag_ingestion_jobs (id, source_id, triggered_by_user_id, job_type, status, embedding_model, index_version)
            VALUES (?, NULL, ?, ?, 'RUNNING', ?, ?)
            """,
            (job_id, triggered_by_user_id, job_type, settings.ollama_embed_model, index_version),
        )
        conn.execute("COMMIT;")

        chunks = rows_to_dicts(
            conn.execute(
                """
                SELECT c.*, s.slug, s.title, s.title_bn, s.publisher, s.source_url,
                       s.category, s.audience_scope, s.review_status, v.version_number
                  FROM rag_chunks c
                  JOIN rag_sources s ON s.id = c.source_id
                  JOIN rag_source_versions v ON v.id = c.version_id
                 WHERE s.review_status = 'APPROVED'
                   AND s.current_version_id = c.version_id
                   AND c.is_active = 1
                 ORDER BY s.id ASC, c.chunk_index ASC
                """
            ).fetchall()
        )

    if not chunks:
        return {"job_id": job_id, "status": "COMPLETED", "chunks_indexed": 0, "dense_ready": False}

    texts = [c["chunk_text"] for c in chunks]
    bm25_corpus = [tokenize_multilingual(f"{c['title']} {c['title_bn']} {c['section_heading']} {c['chunk_text']}") for c in chunks]
    bm25 = BM25Okapi(bm25_corpus)
    with open(idx_dir / "bm25_index.pkl", "wb") as f:
        pickle.dump(bm25, f)

    dense_ready = False
    dense_error = ""
    dim = 0
    try:
        mat = embed_texts_ollama(texts)
        dim = int(mat.shape[1])
        faiss_index = faiss.IndexFlatIP(dim)
        faiss_index.add(mat)
        faiss.write_index(faiss_index, str(idx_dir / "faiss_bge_m3.index"))
        dense_ready = True
    except Exception as exc:
        dense_error = str(exc)

    chunk_map = []
    with get_db_conn() as conn:
        conn.execute("BEGIN IMMEDIATE;")
        for row_idx, c in enumerate(chunks):
            conn.execute("UPDATE rag_chunks SET vector_row_idx = ? WHERE id = ?", (row_idx, c["id"]))
            chunk_map.append(
                {
                    "row_idx": row_idx,
                    "chunk_id": c["id"],
                    "source_id": c["source_id"],
                    "version_id": c["version_id"],
                    "version_number": c["version_number"],
                    "slug": c["slug"],
                    "title": c["title"],
                    "title_bn": c["title_bn"],
                    "publisher": c["publisher"],
                    "source_url": c["source_url"],
                    "category": c["category"],
                    "audience_scope": c["audience_scope"],
                    "section_heading": c["section_heading"],
                    "page_or_section_ref": c["page_or_section_ref"],
                    "language": c["language"],
                    "chunk_text": c["chunk_text"],
                }
            )
        elapsed_ms = int((time.perf_counter() - t0) * 1000)
        status = "COMPLETED"
        conn.execute(
            """
            UPDATE rag_ingestion_jobs
               SET status = ?, chunks_processed = ?, duration_ms = ?, error_summary = ?, completed_at_utc = ?
             WHERE id = ?
            """,
            (status, len(chunks), elapsed_ms, dense_error[:400], utc_now_iso(), job_id),
        )
        conn.execute("COMMIT;")

    (idx_dir / "chunk_map.json").write_text(json.dumps(chunk_map, ensure_ascii=False, indent=2), encoding="utf-8")
    meta = {
        "index_version": index_version,
        "built_at_utc": utc_now_iso(),
        "chunk_count": len(chunks),
        "source_count": len({c["source_id"] for c in chunks}),
        "dense_ready": dense_ready,
        "bm25_ready": True,
        "embedding_model": settings.ollama_embed_model if dense_ready else "unavailable",
        "embedding_dim": dim,
        "dense_error": dense_error,
        "duration_ms": elapsed_ms,
    }
    (idx_dir / "index_meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return meta


def upsert_rag_source_document(
    *,
    slug: str,
    title: str,
    title_bn: str,
    publisher: str,
    source_url: str,
    category: str,
    audience_scope: str,
    language: str,
    publication_date: str | None,
    retrieval_date: str,
    license_basis: str,
    clean_text: str,
    mime_type: str,
    original_filename: str,
    local_file_ref: str = "",
    review_status: str = "PENDING_REVIEW",
    actor_user_id: str | None = None,
) -> dict[str, Any]:
    """Insert or create a deduplicated new version of a RAG document in SQLite."""
    sha = hashlib.sha256(clean_text.encode("utf-8")).hexdigest()
    chunks = chunk_structured_document(clean_text, title, language)
    word_count = len(clean_text.split())
    now = utc_now_iso()

    with get_db_conn() as conn:
        existing = row_to_dict(conn.execute("SELECT * FROM rag_sources WHERE slug = ?", (slug,)).fetchone())
        if existing:
            cur_ver = row_to_dict(
                conn.execute(
                    "SELECT * FROM rag_source_versions WHERE id = ?",
                    (existing["current_version_id"],),
                ).fetchone()
            )
            if cur_ver and cur_ver["content_sha256"] == sha:
                return {"source_id": existing["id"], "version_id": cur_ver["id"], "deduplicated": True, "chunk_count": cur_ver["chunk_count"]}

            max_ver = conn.execute(
                "SELECT COALESCE(MAX(version_number), 0) FROM rag_source_versions WHERE source_id = ?",
                (existing["id"],),
            ).fetchone()[0]
            ver_num = int(max_ver) + 1
            src_id = existing["id"]
        else:
            src_id = new_id("rsrc")
            ver_num = 1

        ver_id = new_id("rver")
        conn.execute("BEGIN IMMEDIATE;")
        try:
            if not existing:
                conn.execute(
                    """
                    INSERT INTO rag_sources (
                        id, slug, title, title_bn, publisher, source_url, local_file_ref,
                        category, audience_scope, language, publication_date, retrieval_date,
                        license_basis, current_version_id, review_status, approved_by_admin_id,
                        approved_at_utc, created_by_user_id, created_at_utc, updated_at_utc
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        src_id, slug, title, title_bn, publisher, source_url, local_file_ref,
                        category, audience_scope, language, publication_date, retrieval_date,
                        license_basis, ver_id, review_status,
                        actor_user_id if review_status == "APPROVED" else None,
                        now if review_status == "APPROVED" else None,
                        actor_user_id, now, now,
                    ),
                )
            else:
                conn.execute("UPDATE rag_chunks SET is_active = 0 WHERE source_id = ?", (src_id,))

            conn.execute(
                """
                INSERT INTO rag_source_versions (
                    id, source_id, version_number, content_sha256, mime_type,
                    original_filename, clean_text, word_count, chunk_count, metadata_json, created_at_utc
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    ver_id, src_id, ver_num, sha, mime_type, original_filename, clean_text,
                    word_count, len(chunks),
                    json.dumps({"sections": [c["section_heading"] for c in chunks]}, ensure_ascii=False),
                    now,
                ),
            )
            if existing:
                conn.execute(
                    """
                    UPDATE rag_sources
                       SET current_version_id = ?, title = ?, title_bn = ?, publisher = ?,
                           source_url = ?, category = ?, audience_scope = ?, language = ?,
                           review_status = ?, updated_at_utc = ?
                     WHERE id = ?
                    """,
                    (ver_id, title, title_bn, publisher, source_url, category, audience_scope, language, review_status, now, src_id),
                )

            for ch in chunks:
                ch_sha = hashlib.sha256(ch["chunk_text"].encode("utf-8")).hexdigest()
                conn.execute(
                    """
                    INSERT INTO rag_chunks (
                        id, source_id, version_id, chunk_index, section_heading, page_or_section_ref,
                        language, chunk_text, chunk_sha256, token_estimate, is_active, created_at_utc
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
                    """,
                    (
                        new_id("rchk"), src_id, ver_id, ch["chunk_index"], ch["section_heading"],
                        ch["page_or_section_ref"], ch["language"], ch["chunk_text"], ch_sha,
                        ch["token_estimate"], now,
                    ),
                )
            conn.execute("COMMIT;")
        except Exception:
            conn.execute("ROLLBACK;")
            raise
    return {"source_id": src_id, "version_id": ver_id, "version_number": ver_num, "deduplicated": False, "chunk_count": len(chunks), "sha256": sha}


def seed_curated_corpus(force_reindex: bool = False) -> dict[str, Any]:
    """Load the 14 curated reference documents from services/api/data/rag_corpus and build local indexes."""
    corpus_dir = settings.rag_corpus_dir
    manifest_path = corpus_dir / "corpus_manifest.json"
    if not manifest_path.exists():
        raise FileNotFoundError(f"RAG corpus manifest missing: {manifest_path}")

    entries = json.loads(manifest_path.read_text(encoding="utf-8"))
    added_or_updated = 0
    for item in entries:
        fpath = corpus_dir / item["filename"]
        if not fpath.exists():
            continue
        raw = fpath.read_text(encoding="utf-8")
        clean, _ = sanitize_untrusted_text(raw, max_chars=250_000)
        res = upsert_rag_source_document(
            slug=item["slug"],
            title=item["title"],
            title_bn=item.get("title_bn", ""),
            publisher=item["publisher"],
            source_url=item.get("source_url", ""),
            category=item["category"],
            audience_scope=item.get("audience_scope", "PUBLIC_MEDICAL"),
            language=item.get("language", "bilingual"),
            publication_date=item.get("publication_date"),
            retrieval_date=item.get("retrieval_date", "2026-11-19"),
            license_basis=item.get("license_basis", "Public educational summary"),
            clean_text=clean,
            mime_type="text/markdown",
            original_filename=item["filename"],
            local_file_ref=f"services/api/data/rag_corpus/{item['filename']}",
            review_status=item.get("review_status", "APPROVED"),
            actor_user_id="usr-ad-demo",
        )
        if not res.get("deduplicated"):
            added_or_updated += 1

    idx_meta_path = settings.rag_index_dir / "index_meta.json"
    need_rebuild = force_reindex or added_or_updated > 0 or not idx_meta_path.exists()
    if not need_rebuild and idx_meta_path.exists():
        try:
            existing_meta = json.loads(idx_meta_path.read_text(encoding="utf-8"))
            if not existing_meta.get("dense_ready"):
                need_rebuild = True
        except Exception:
            need_rebuild = True

    if need_rebuild:
        meta = rebuild_rag_indexes(triggered_by_user_id="usr-ad-demo", job_type="SEED_CORPUS")
    else:
        meta = json.loads(idx_meta_path.read_text(encoding="utf-8"))

    return {"corpus_entries": len(entries), "updated": added_or_updated, "index": meta}
