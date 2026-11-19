"""
Reproducible Audit & Reconciliation Script for TASK AI-QA-FIX-01.
Computes exact metrics directly from primary JSON/CSV/SQLite/WAV/Markdown files:
1. RAG pre-fix & post-fix query-level Recall@1/3/5 and MRR.
2. RAG 14-source & 35-chunk provenance + disk-vs-DB SHA-256 verification -> RAG_CITATION_PROVENANCE_AUDIT.csv.
3. OCR pre-fix entity matching (from pre_fix_ocr_benchmark_results.json) + post-fix entity matching.
4. Voice corpus (micro) and sample-average (macro) raw & normalized WER/CER across all 3 cohorts + SHA-256 audio hashes + frozen 26-clip FLEURS reconciliation.
"""

from __future__ import annotations

import csv
import hashlib
import json
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

import jiwer

ROOT_DIR = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT_DIR / "services" / "api" / "src"))
sys.path.insert(0, str(ROOT_DIR / "services" / "api" / "evals"))

from eval_ocr import match_medicine_entities
from shasthosetu_api.db.sqlite import get_db_conn

EVIDENCE_DIR = ROOT_DIR / "docs" / "evidence" / "AI_RAG_VOICE_OCR_01"
QA_DIR = ROOT_DIR / "docs" / "AI_QA_FIX_01"
QA_DIR.mkdir(parents=True, exist_ok=True)


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _norm_voice_text(s: str) -> str:
    t = unicodedata.normalize("NFC", s or "").lower()
    t = re.sub(r"[,\.\?!;:'\"।\-\u2014\(\)\[\]\{\}]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def recompute_rag_from_json(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    med_qs = [q for q in data.get("detailed_queries", []) if q.get("type") == "MEDICAL"]
    res = {}
    for mode in ("dense", "bm25", "hybrid"):
        r1s, r3s, r5s, mrrs, ranks = [], [], [], [], []
        per_q = []
        for q in med_qs:
            target = q["target"]
            top_list = q["modes"][mode].get("top_5_slugs") or q["modes"][mode]["top_slugs"]
            r1 = 1.0 if (top_list and top_list[0] == target) else 0.0
            r3 = 1.0 if target in top_list[:3] else 0.0
            r5 = 1.0 if target in top_list[:5] else 0.0
            rank = (top_list.index(target) + 1) if target in top_list else 0
            rr = (1.0 / rank) if rank > 0 else 0.0
            r1s.append(r1)
            r3s.append(r3)
            r5s.append(r5)
            mrrs.append(rr)
            rank_label = rank or (">5" if len(top_list) >= 5 else f">{len(top_list)}")
            ranks.append({"id": q["id"], "lang": q["lang"], "target": target, "rank": rank_label, "rr": round(rr, 6), "top_3": top_list[:3]})
        n = len(med_qs)
        res[mode] = {
            "n_medical": n,
            "hits_at_1": int(sum(r1s)),
            "hits_at_3": int(sum(r3s)),
            "recall_at_1": round(sum(r1s) / n, 6) if n else 0.0,
            "recall_at_3": round(sum(r3s) / n, 6) if n else 0.0,
            "recall_at_5": round(sum(r5s) / n, 6) if n else 0.0,
            "mrr": round(sum(mrrs) / n, 6) if n else 0.0,
            "reported_summary": data.get("modes_summary", {}).get(mode, {}),
            "per_query": ranks,
        }
    return {
        "timestamp_utc": data.get("timestamp_utc"),
        "modes": res,
        "generation_samples": data.get("generation_samples", []),
    }


def audit_rag_provenance() -> dict:
    corpus_dir = ROOT_DIR / "services" / "api" / "data" / "rag_corpus"
    manifest = json.loads((corpus_dir / "corpus_manifest.json").read_text(encoding="utf-8"))
    reg_rows = list(csv.DictReader((ROOT_DIR / "docs" / "AI_RAG_VOICE_OCR_01" / "RAG_KNOWLEDGE_SOURCE_REGISTER.csv").open("r", encoding="utf-8")))
    chunk_map = json.loads((ROOT_DIR / "services" / "api" / "data" / "rag_index" / "chunk_map.json").read_text(encoding="utf-8"))
    cm_counts = Counter(c["slug"] for c in chunk_map)

    with get_db_conn() as conn:
        db_sources = {
            r["slug"]: dict(r)
            for r in conn.execute(
                """
                SELECT s.id, s.slug, s.title, s.publisher, s.source_url, s.audience_scope,
                       s.review_status, v.content_sha256, v.clean_text, v.chunk_count
                  FROM rag_sources s
                  JOIN rag_source_versions v ON v.id = s.current_version_id
                """
            ).fetchall()
        }
        db_chunks_active = conn.execute("SELECT COUNT(*) FROM rag_chunks WHERE is_active = 1").fetchone()[0]
        db_sources_count = conn.execute("SELECT COUNT(*) FROM rag_sources").fetchone()[0]

    audit_rows = []
    manifest_by_slug = {m["slug"]: m for m in manifest}
    for r in reg_rows:
        slug = r["slug"]
        m = manifest_by_slug.get(slug, {})
        fname = m.get("filename", "")
        fpath = corpus_dir / fname
        disk_text = fpath.read_text(encoding="utf-8") if fpath.exists() else ""
        disk_raw_sha256 = hashlib.sha256(fpath.read_bytes()).hexdigest() if fpath.exists() else ""
        db_s = db_sources.get(slug, {})
        db_clean_sha256 = hashlib.sha256((db_s.get("clean_text") or "").encode("utf-8")).hexdigest() if db_s else ""
        url = r["source_url"]
        scope = r["audience_scope"]
        if url.startswith("https://shasthosetu.local") or scope in ("SUPPORT_FAQ", "CLINICAL_REFERENCE"):
            origin_type = "FIRST_PARTY_PLATFORM_DOC"
            url_type = "INTERNAL_PLACEHOLDER_URI (not public web URL)"
            pub_note = f"{r['publisher']} (100% first-party ShasthoSetu document)"
        else:
            origin_type = "FIRST_PARTY_SYNTHESIZED_SUMMARY"
            url_type = "EXTERNAL_UPSTREAM_GUIDANCE_URL"
            pub_note = f"{r['publisher']} — ShasthoSetu bilingual summary referencing official guidance (NOT verbatim upstream publication)"

        db_c = int(db_s.get("chunk_count") or 0)
        cm_c = int(cm_counts.get(slug, 0))
        reg_c = int(r["chunk_count"])
        raw_hash_ok = (r["sha256_hash"] == disk_raw_sha256)
        db_clean_hash_ok = (db_s.get("content_sha256") == db_clean_sha256)
        counts_ok = (db_c == cm_c == reg_c)
        parity_ok = raw_hash_ok and db_clean_hash_ok and counts_ok

        audit_rows.append({
            "slug": slug,
            "filename": fname,
            "title": r["title"],
            "audience_scope": scope,
            "source_origin_type": origin_type,
            "publisher_attribution": pub_note,
            "source_url": url,
            "url_type": url_type,
            "review_status": db_s.get("review_status", "MISSING"),
            "chunk_count_register": reg_c,
            "chunk_count_db": db_c,
            "chunk_count_index": cm_c,
            "disk_raw_sha256": disk_raw_sha256,
            "register_sha256": r["sha256_hash"],
            "db_clean_sha256": db_s.get("content_sha256", ""),
            "parity_verified": str(parity_ok),
            "nonempty_content_chars": len(disk_text),
            "notes": (
                "Raw disk file SHA-256 matches register CSV; DB content_sha256 matches stored clean_text; chunk counts match across register/DB/index."
                if parity_ok
                else f"Mismatch detected (raw={raw_hash_ok}, clean={db_clean_hash_ok}, counts={counts_ok})"
            ),
        })

    out_csv = QA_DIR / "RAG_CITATION_PROVENANCE_AUDIT.csv"
    with open(out_csv, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(audit_rows[0].keys()))
        w.writeheader()
        w.writerows(audit_rows)

    return {
        "sources_in_register": len(reg_rows),
        "sources_in_db": db_sources_count,
        "chunks_in_db_active": db_chunks_active,
        "chunks_in_chunk_map": len(chunk_map),
        "all_hashes_and_counts_match": all(row["parity_verified"] == "True" for row in audit_rows),
        "first_party_synthesized_medical": sum(1 for row in audit_rows if row["source_origin_type"] == "FIRST_PARTY_SYNTHESIZED_SUMMARY"),
        "first_party_platform_docs": sum(1 for row in audit_rows if row["source_origin_type"] == "FIRST_PARTY_PLATFORM_DOC"),
        "csv_path": str(out_csv.relative_to(ROOT_DIR)),
    }


def reconcile_ocr() -> dict:
    pre_path = EVIDENCE_DIR / "pre_fix_ocr_benchmark_results.json"
    post_path = EVIDENCE_DIR / "ocr_benchmark_results.json"
    out = {}
    for label, p in (("pre_fix", pre_path), ("post_fix", post_path)):
        if not p.exists():
            continue
        data = json.loads(p.read_text(encoding="utf-8"))
        tot_tp = tot_fp = tot_fn = 0
        per_sample = []
        for sm in data["samples"]:
            em = match_medicine_entities(sm["expected_medicines"], sm["detected_candidates"])
            tot_tp += em["tp"]
            tot_fp += em["fp"]
            tot_fn += em["fn"]
            per_sample.append({
                "id": sm["id"],
                "script": sm["script"],
                "condition": sm["condition"],
                "cer": sm["cer"],
                "wer": sm["wer"],
                "expected_medicines": sm["expected_medicines"],
                "detected_candidates": sm["detected_candidates"],
                **em,
            })
        prec = tot_tp / (tot_tp + tot_fp) if (tot_tp + tot_fp) > 0 else 0.0
        rec = tot_tp / (tot_tp + tot_fn) if (tot_tp + tot_fn) > 0 else 0.0
        f1 = (2 * prec * rec / (prec + rec)) if (prec + rec) > 0 else 0.0
        out[label] = {
            "mean_cer": data["mean_cer"],
            "mean_wer": data["mean_wer"],
            "tp": tot_tp,
            "fp": tot_fp,
            "fn": tot_fn,
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1": round(f1, 4),
            "samples": per_sample,
            "smoke_0052": data.get("read_only_smoke_0052"),
        }
    return out


def reconcile_voice() -> dict:
    voice_dir = ROOT_DIR / "05_Bangla_Voice_AI" / "data" / "bilingual_test"
    manifest = list(csv.DictReader((voice_dir / "bilingual_voice_manifest.csv").open("r", encoding="utf-8")))
    audio_hashes = []
    for row in manifest:
        fp = voice_dir / row["audio_file"]
        audio_hashes.append({
            "sample_id": row["sample_id"],
            "cohort": row["cohort"],
            "audio_file": row["audio_file"],
            "duration_seconds": row["duration_seconds"],
            "byte_size": fp.stat().st_size if fp.exists() else 0,
            "sha256": _sha256_file(fp) if fp.exists() else "",
            "reference_text": row["reference_text"],
        })

    vdata = json.loads((EVIDENCE_DIR / "voice_benchmark_results.json").read_text(encoding="utf-8"))
    detailed = vdata["detailed_samples"]

    # Group by (cohort, model) and calculate BOTH sample-average (macro) and corpus (micro), BOTH raw and normalized
    grouped: dict[tuple[str, str], list[dict]] = {}
    for s in detailed:
        grouped.setdefault((s["cohort"], s["model"]), []).append(s)

    recalculated = {}
    for (cohort, model), rows in grouped.items():
        refs_raw = [r["ref_text"].strip() for r in rows]
        hyps_raw = [r["hyp_text"].strip() for r in rows]
        refs_norm = [_norm_voice_text(x) for x in refs_raw]
        hyps_norm = [_norm_voice_text(x) for x in hyps_raw]

        sample_wers_raw = [jiwer.wer(ref, hyp) if hyp else 1.0 for ref, hyp in zip(refs_raw, hyps_raw)]
        sample_cers_raw = [jiwer.cer(ref, hyp) if hyp else 1.0 for ref, hyp in zip(refs_raw, hyps_raw)]
        sample_wers_norm = [jiwer.wer(ref, hyp) if hyp else 1.0 for ref, hyp in zip(refs_norm, hyps_norm)]
        sample_cers_norm = [jiwer.cer(ref, hyp) if hyp else 1.0 for ref, hyp in zip(refs_norm, hyps_norm)]

        corpus_wer_raw = jiwer.wer(refs_raw, hyps_raw)
        corpus_cer_raw = jiwer.cer(refs_raw, hyps_raw)
        corpus_wer_norm = jiwer.wer(refs_norm, hyps_norm)
        corpus_cer_norm = jiwer.cer(refs_norm, hyps_norm)

        recalculated.setdefault(cohort, {})[model] = {
            "n": len(rows),
            "sample_avg_wer_raw": round(sum(sample_wers_raw) / len(sample_wers_raw), 4),
            "sample_avg_cer_raw": round(sum(sample_cers_raw) / len(sample_cers_raw), 4),
            "corpus_wer_raw": round(corpus_wer_raw, 4),
            "corpus_cer_raw": round(corpus_cer_raw, 4),
            "sample_avg_wer_norm": round(sum(sample_wers_norm) / len(sample_wers_norm), 4),
            "sample_avg_cer_norm": round(sum(sample_cers_norm) / len(sample_cers_norm), 4),
            "corpus_wer_norm": round(corpus_wer_norm, 4),
            "corpus_cer_norm": round(corpus_cer_norm, 4),
            "mean_bn_ratio": round(sum(r["bn_ratio"] for r in rows) / len(rows), 4),
            "avg_latency_ms": round(sum(r["latency_ms"] for r in rows) / len(rows), 2),
        }

    # Cross-check frozen 26-clip audit CSV (task_03_2/per_sample_predictions.csv)
    frozen_csv = ROOT_DIR / "05_Bangla_Voice_AI" / "pretrained_bengali_comparison" / "task_03_2" / "per_sample_predictions.csv"
    frozen_rows = list(csv.DictReader(frozen_csv.open("r", encoding="utf-8")))
    smoke6 = [r for r in frozen_rows if r["cohort"] == "Smoke_Test_6"]
    ext20 = [r for r in frozen_rows if r["cohort"] == "Extended_FLEURS_20"]

    bn_all_refs_raw = [r["reference_text"] for r in frozen_rows]
    bn_all_hyps_raw = [r["whisper_small_bn_pred_raw"] for r in frozen_rows]
    bn_all_refs_norm = [_norm_voice_text(x) for x in bn_all_refs_raw]
    bn_all_hyps_norm = [_norm_voice_text(x) for x in bn_all_hyps_raw]

    frozen_summary = {
        "total_clips": len(frozen_rows),
        "unique_sentences": len({r["sentence_id"] for r in frozen_rows}),
        "smoke_6_unique_sentences": len({r["sentence_id"] for r in smoke6}),
        "smoke_6_exact_match_with_new_fleurs": all(
            any(a["reference_text"] == s["reference_text"] and a["audio_file"] == s["audio_file"] for a in audio_hashes)
            for s in smoke6
        ),
        "smoke_6_whisper_bn_sample_avg_raw_wer": round(sum(float(r["whisper_small_bn_raw_wer"]) for r in smoke6) / len(smoke6) / 100.0, 4),
        "ext_20_whisper_bn_sample_avg_raw_wer": round(sum(float(r["whisper_small_bn_raw_wer"]) for r in ext20) / len(ext20) / 100.0, 4),
        "all_26_whisper_bn_sample_avg_raw_wer": round(sum(float(r["whisper_small_bn_raw_wer"]) for r in frozen_rows) / len(frozen_rows) / 100.0, 4),
        "all_26_whisper_bn_corpus_raw_wer": round(jiwer.wer(bn_all_refs_raw, bn_all_hyps_raw), 4),
        "all_26_whisper_bn_corpus_norm_wer": round(jiwer.wer(bn_all_refs_norm, bn_all_hyps_norm), 4),
        "all_26_whisper_bn_sample_avg_norm_wer": round(sum(float(r["whisper_small_bn_norm_wer"]) for r in frozen_rows) / len(frozen_rows) / 100.0, 4),
    }

    return {
        "audio_files_manifest": audio_hashes,
        "cohort_recalculation": recalculated,
        "frozen_26_clip_audit": frozen_summary,
        "raw_samples_by_model": detailed,
    }


def main():
    pre_rag = recompute_rag_from_json(EVIDENCE_DIR / "pre_fix_rag_benchmark_results.json") if (EVIDENCE_DIR / "pre_fix_rag_benchmark_results.json").exists() else None
    post_rag = recompute_rag_from_json(EVIDENCE_DIR / "rag_benchmark_results.json")
    prov = audit_rag_provenance()
    ocr = reconcile_ocr()
    voice = reconcile_voice()

    out = {
        "rag_pre_fix": pre_rag,
        "rag_post_fix": post_rag,
        "rag_provenance_summary": prov,
        "ocr_reconciliation": ocr,
        "voice_reconciliation": voice,
    }
    out_path = EVIDENCE_DIR / "qa_fix_01_reconciliation.json"
    out_path.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote reconciliation summary -> {out_path}")
    print("RAG provenance:", json.dumps(prov, indent=2))
    print("RAG post-fix hybrid:", {k: v for k, v in post_rag["modes"]["hybrid"].items() if k != "per_query"})
    print("OCR pre vs post:", {k: {m: val[m] for m in ("tp", "fp", "fn", "precision", "recall", "f1", "mean_cer", "mean_wer")} for k, val in ocr.items()})
    print("Voice frozen 26-clip audit:", voice["frozen_26_clip_audit"])


if __name__ == "__main__":
    main()
