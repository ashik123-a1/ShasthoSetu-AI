"""
Programmatic RAG Metric Lock & Markdown Table Verification Script (AI-QA-METRIC-LOCK-02).

Reads ONLY frozen/primary JSON and CSV artifacts on disk (no Ollama, no model inference,
no GPU/network calls, no Playwright) and verifies:
1. Exact 20 unique MEDICAL queries and 6 separated safety probes (26 total).
2. 100% target-slug validity against RAG_CITATION_PROVENANCE_AUDIT.csv.
3. Exact per-query rank, hit_at_1/3/5, and reciprocal rank recomputation from top_5_slugs.
4. Exact equality between recomputed summary metrics (including rational Fraction MRR)
   and rag_benchmark_results.json['modes_summary'].
5. Programmatic Markdown table rendering and automated Markdown-vs-JSON consistency checks.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import sys
from fractions import Fraction
from pathlib import Path
from typing import Any

ROOT_DIR = Path(__file__).resolve().parents[3]
EVIDENCE_DIR = ROOT_DIR / "docs" / "evidence" / "AI_RAG_VOICE_OCR_01"
PRIMARY_RAG_JSON = EVIDENCE_DIR / "rag_benchmark_results.json"
PRE_FIX_RAG_JSON = EVIDENCE_DIR / "pre_fix_rag_benchmark_results.json"
PROVENANCE_CSV = ROOT_DIR / "docs" / "AI_QA_FIX_01" / "RAG_CITATION_PROVENANCE_AUDIT.csv"

LOCK_DIR = ROOT_DIR / "docs" / "AI_QA_METRIC_LOCK_02"
OUT_CSV = LOCK_DIR / "RAG_PER_QUERY_VERIFIED_METRICS.csv"
OUT_JSON = LOCK_DIR / "FINAL_RAG_METRICS.json"

EXPECTED_MEDICAL_IDS = [
    "BN-01", "BN-02", "BN-03", "BN-04", "BN-05", "BN-06",
    "EN-01", "EN-02", "EN-03", "EN-04", "EN-05", "EN-06",
    "BG-01", "BG-02", "BG-03", "BG-04",
    "MX-01", "MX-02", "MX-03", "MX-04",
]
EXPECTED_SAFETY_IDS = ["EM-01", "EM-02", "UN-01", "UN-02", "INJ-01", "INJ-02"]
MODES = ("dense", "bm25", "hybrid")


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _percentile(sorted_vals: list[float], q: float) -> float:
    if not sorted_vals:
        return 0.0
    idx = min(len(sorted_vals) - 1, int(len(sorted_vals) * q))
    return round(float(sorted_vals[idx]), 2)


def _median(sorted_vals: list[float]) -> float:
    n = len(sorted_vals)
    if n == 0:
        return 0.0
    mid = n // 2
    if n % 2 == 1:
        return round(float(sorted_vals[mid]), 2)
    return round(float((sorted_vals[mid - 1] + sorted_vals[mid]) / 2.0), 2)


def recompute_from_primary(
    primary_path: Path = PRIMARY_RAG_JSON,
    pre_fix_path: Path = PRE_FIX_RAG_JSON,
    provenance_csv: Path = PROVENANCE_CSV,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    data = json.loads(primary_path.read_text(encoding="utf-8"))
    pre_data = json.loads(pre_fix_path.read_text(encoding="utf-8")) if pre_fix_path.exists() else None

    with open(provenance_csv, "r", encoding="utf-8") as f:
        prov_rows = list(csv.DictReader(f))
    prov_slugs = {r["slug"] for r in prov_rows}

    detailed = data.get("detailed_queries", [])
    assert len(detailed) == 26, f"Expected 26 detailed queries, got {len(detailed)}"

    med_qs = [q for q in detailed if q.get("type") == "MEDICAL"]
    safety_qs = [q for q in detailed if q.get("type") != "MEDICAL"]

    med_ids = [q["id"] for q in med_qs]
    safety_ids = [q["id"] for q in safety_qs]
    assert len(med_ids) == 20 and len(set(med_ids)) == 20, f"Duplicate or missing medical IDs: {med_ids}"
    assert med_ids == EXPECTED_MEDICAL_IDS, f"Medical ID sequence mismatch: {med_ids}"
    assert len(safety_ids) == 6 and safety_ids == EXPECTED_SAFETY_IDS, f"Safety probe IDs mismatch: {safety_ids}"

    # Verify non-medical safety probes remain separated from scored retrieval metrics
    for sq in safety_qs:
        for mode in MODES:
            md = sq["modes"][mode]
            assert md.get("rank") is None, f"Safety probe {sq['id']} should have rank=None"
            assert md.get("hit_at_1") is None and md.get("hit_at_3") is None and md.get("hit_at_5") is None

    # Validate slugs against provenance CSV
    slug_checks: list[dict[str, Any]] = []
    for q in detailed:
        target = q["target"]
        if q["type"] in ("MEDICAL", "EMERGENCY"):
            assert target in prov_slugs, f"Query {q['id']} target slug '{target}' not found in {provenance_csv}"
            slug_checks.append({"id": q["id"], "type": q["type"], "target_slug": target, "in_provenance_csv": True})
        else:
            slug_checks.append({"id": q["id"], "type": q["type"], "target_slug": target, "in_provenance_csv": False})

    # Recompute exact per-query & summary metrics for MEDICAL (N=20)
    per_query_csv_rows: list[dict[str, Any]] = []
    per_query_json_rows: list[dict[str, Any]] = []

    mode_stats: dict[str, dict[str, Any]] = {}
    for mode in MODES:
        rr_exact_list: list[Fraction] = []
        ranks_list: list[int] = []
        hits1 = hits3 = hits5 = 0
        lats_20: list[float] = []
        non_rank_1: list[dict[str, Any]] = []

        for q in med_qs:
            target = q["target"]
            md = q["modes"][mode]
            top_5 = md.get("top_5_slugs") or md["top_slugs"]
            computed_rank = (top_5.index(target) + 1) if target in top_5 else 0
            stored_rank = md.get("rank")
            assert stored_rank == computed_rank, (
                f"Rank mismatch on {q['id']} [{mode}]: stored={stored_rank}, computed={computed_rank}"
            )
            c_h1 = bool(top_5 and top_5[0] == target)
            c_h3 = target in top_5[:3]
            c_h5 = target in top_5[:5]
            assert md.get("hit_at_1") == c_h1, f"hit_at_1 mismatch on {q['id']} [{mode}]"
            assert md.get("hit_at_3") == c_h3, f"hit_at_3 mismatch on {q['id']} [{mode}]"
            assert md.get("hit_at_5") == c_h5, f"hit_at_5 mismatch on {q['id']} [{mode}]"

            rr_frac = Fraction(1, computed_rank) if computed_rank > 0 else Fraction(0, 1)
            rr_exact_list.append(rr_frac)
            ranks_list.append(computed_rank)
            hits1 += int(c_h1)
            hits3 += int(c_h3)
            hits5 += int(c_h5)
            lats_20.append(float(md["latency_ms"]))
            if computed_rank != 1:
                non_rank_1.append({
                    "id": q["id"],
                    "lang": q["lang"],
                    "target_slug": target,
                    "rank": computed_rank if computed_rank > 0 else ">5",
                    "reciprocal_rank": round(float(rr_frac), 6),
                    "top_5_slugs": top_5,
                })

        n_med = len(med_qs)
        total_rr = sum(rr_exact_list, Fraction(0, 1))
        mrr_frac = total_rr / n_med
        mrr_float = round(float(mrr_frac), 6)
        r1_val = round(hits1 / n_med, 6)
        r3_val = round(hits3 / n_med, 6)
        r5_val = round(hits5 / n_med, 6)

        lats_26 = [float(q["modes"][mode]["latency_ms"]) for q in detailed]
        sorted_20 = sorted(lats_20)
        sorted_26 = sorted(lats_26)

        reported = data["modes_summary"][mode]
        assert abs(reported["recall_at_1"] - r1_val) < 1e-6, f"{mode} recall_at_1 mismatch: {reported['recall_at_1']} != {r1_val}"
        assert abs(reported["recall_at_3"] - r3_val) < 1e-6, f"{mode} recall_at_3 mismatch: {reported['recall_at_3']} != {r3_val}"
        assert abs(reported["recall_at_5"] - r5_val) < 1e-6, f"{mode} recall_at_5 mismatch: {reported['recall_at_5']} != {r5_val}"
        assert abs(reported["mrr"] - mrr_float) < 1e-6, f"{mode} mrr mismatch: {reported['mrr']} != {mrr_float}"
        assert abs(reported["avg_latency_ms"] - round(sum(lats_26) / len(lats_26), 2)) < 0.02
        assert abs(reported["p95_latency_ms"] - _percentile(sorted_26, 0.95)) < 0.02

        mode_stats[mode] = {
            "n_medical": n_med,
            "hits_at_1": hits1,
            "hits_at_3": hits3,
            "hits_at_5": hits5,
            "recall_at_1": r1_val,
            "recall_at_3": r3_val,
            "recall_at_5": r5_val,
            "recall_at_1_pct": f"{r1_val * 100:.2f}%",
            "recall_at_3_pct": f"{r3_val * 100:.2f}%",
            "recall_at_5_pct": f"{r5_val * 100:.2f}%",
            "mrr_exact_fraction": f"{mrr_frac.numerator}/{mrr_frac.denominator}",
            "mrr_numerator_over_20": f"{float(total_rr):.6f} / 20",
            "mrr": mrr_float,
            "matches_primary_json_summary": True,
            "latency_medical_20_ms": {
                "avg": round(sum(lats_20) / n_med, 2),
                "median": _median(sorted_20),
                "p95": _percentile(sorted_20, 0.95),
                "max": round(max(sorted_20), 2),
            },
            "latency_all_26_ms": {
                "avg": round(sum(lats_26) / len(lats_26), 2),
                "p95": _percentile(sorted_26, 0.95),
                "max": round(max(sorted_26), 2),
            },
            "non_rank_1_queries": non_rank_1,
        }

    # Build aligned per-query CSV and JSON rows
    for q in med_qs:
        target = q["target"]
        row_json: dict[str, Any] = {
            "id": q["id"],
            "lang": q["lang"],
            "type": q["type"],
            "query": q["query"],
            "target_slug": target,
            "target_in_provenance_csv": target in prov_slugs,
            "modes": {},
        }
        csv_row: dict[str, Any] = {
            "query_id": q["id"],
            "lang": q["lang"],
            "type": q["type"],
            "target_slug": target,
            "target_in_provenance_csv": str(target in prov_slugs),
            "query_text": q["query"],
        }
        for mode in MODES:
            md = q["modes"][mode]
            top_5 = md.get("top_5_slugs") or md["top_slugs"]
            rk = int(md["rank"])
            rr = round(float(Fraction(1, rk) if rk > 0 else Fraction(0, 1)), 6)
            row_json["modes"][mode] = {
                "rank": rk,
                "rank_label": str(rk) if rk > 0 else ">5",
                "reciprocal_rank": rr,
                "hit_at_1": bool(md["hit_at_1"]),
                "hit_at_3": bool(md["hit_at_3"]),
                "hit_at_5": bool(md["hit_at_5"]),
                "top_5_slugs": top_5,
                "latency_ms": float(md["latency_ms"]),
            }
            csv_row[f"{mode}_rank"] = rk if rk > 0 else ">5"
            csv_row[f"{mode}_rr"] = f"{rr:.6f}"
            csv_row[f"{mode}_hit_at_1"] = int(bool(md["hit_at_1"]))
            csv_row[f"{mode}_hit_at_3"] = int(bool(md["hit_at_3"]))
            csv_row[f"{mode}_hit_at_5"] = int(bool(md["hit_at_5"]))
            if mode == "bm25":
                csv_row["bm25_top_1_slug"] = top_5[0] if len(top_5) > 0 else ""
                csv_row["bm25_top_2_slug"] = top_5[1] if len(top_5) > 1 else ""
            csv_row[f"{mode}_latency_ms"] = f"{float(md['latency_ms']):.2f}"
        per_query_json_rows.append(row_json)
        per_query_csv_rows.append(csv_row)

    # Pre-fix traceability
    pre_fix_trace: dict[str, Any] = {"available": False}
    if pre_data is not None:
        pre_med = [q for q in pre_data.get("detailed_queries", []) if q.get("type") == "MEDICAL"]
        en06_pre = next((q for q in pre_med if q["id"] == "EN-06"), None)
        pre_bm25_top3 = en06_pre["modes"]["bm25"]["top_slugs"] if en06_pre else []
        en06_pre_rank = (pre_bm25_top3.index(en06_pre["target"]) + 1) if (en06_pre and en06_pre["target"] in pre_bm25_top3) else 0
        pre_fix_trace = {
            "available": True,
            "path": str(pre_fix_path.relative_to(ROOT_DIR)).replace("\\", "/"),
            "sha256": sha256_file(pre_fix_path),
            "timestamp_utc": pre_data.get("timestamp_utc"),
            "bm25_summary_reported": pre_data["modes_summary"]["bm25"],
            "en06_bm25_rank_in_pre_fix_top_slugs": en06_pre_rank,
            "en06_bm25_top_3_in_pre_fix": pre_bm25_top3,
            "truncation_note": (
                "pre_fix_rag_benchmark_results.json recorded only top_slugs[:3], truncating MX-04 (BM25 rank 4) "
                "from post-hoc list scanning, whereas modes_summary['bm25'] computed MRR=0.8542 and R@5=0.95 using full top_k=5."
            ),
        }

    # Exact root cause description
    en06_post = next(r for r in per_query_json_rows if r["id"] == "EN-06")
    root_cause = {
        "defect_id": "ISS-013",
        "contradiction_type": "Manual Markdown transcription error in AI-QA-FIX-01 report table (NOT an evaluator or JSON summary bug)",
        "primary_json_bm25_mrr": mode_stats["bm25"]["mrr"],
        "primary_json_bm25_hits_at_1": f"{mode_stats['bm25']['hits_at_1']}/20",
        "erroneous_markdown_table_bm25_mrr": 0.879167,
        "erroneous_markdown_table_bm25_hits_at_1": "17/20",
        "offending_query_id": "EN-06",
        "offending_query_target": en06_post["target_slug"],
        "primary_json_bm25_rank_for_en06": en06_post["modes"]["bm25"]["rank"],
        "primary_json_bm25_rr_for_en06": en06_post["modes"]["bm25"]["reciprocal_rank"],
        "primary_json_bm25_top_5_for_en06": en06_post["modes"]["bm25"]["top_5_slugs"],
        "erroneous_markdown_value_for_en06": "1 (1.000)",
        "mr_delta": round(0.879167 - mode_stats["bm25"]["mrr"], 6),
        "explanation": (
            "In both pre_fix_rag_benchmark_results.json and rag_benchmark_results.json, query EN-06 scored BM25 rank 2 "
            "(rank 1 was 'ultrasound-pcom-terminology-guide', rank 2 was 'bangladesh-prescription-terminology'). "
            "When CORRECTED_RAG_METRICS.md was manually transcribed during AI-QA-FIX-01, EN-06's BM25 column was mistyped as "
            "'1 (1.000)' instead of '2 (0.500)', artificially inflating visible Hits@1 from 16/20 to 17/20 (+1) and visible MRR "
            "from (16 + 1/2 + 1/3 + 1/4)/20 = 41/48 = 0.854167 to (17 + 1/3 + 1/4)/20 = 211/240 = 0.879167 (+0.025000 = +0.5/20)."
        ),
    }

    final_metrics = {
        "task_id": "AI-QA-METRIC-LOCK-02",
        "audit_status": "AI_QA_PASS_WITH_LIMITATIONS",
        "independent_owner_verified": False,
        "inputs": {
            "primary_rag_json": {
                "path": str(primary_path.relative_to(ROOT_DIR)).replace("\\", "/"),
                "bytes": primary_path.stat().st_size,
                "sha256": sha256_file(primary_path),
                "timestamp_utc": data.get("timestamp_utc"),
            },
            "pre_fix_rag_json": {
                "path": str(pre_fix_path.relative_to(ROOT_DIR)).replace("\\", "/"),
                "bytes": pre_fix_path.stat().st_size if pre_fix_path.exists() else 0,
                "sha256": sha256_file(pre_fix_path) if pre_fix_path.exists() else "",
            },
            "provenance_csv": {
                "path": str(provenance_csv.relative_to(ROOT_DIR)).replace("\\", "/"),
                "bytes": provenance_csv.stat().st_size,
                "sha256": sha256_file(provenance_csv),
                "approved_source_count": len(prov_rows),
            },
        },
        "root_cause": root_cause,
        "retrieval_dataset_integrity": {
            "total_detailed_queries": len(detailed),
            "medical_queries_n": len(med_qs),
            "unique_medical_ids_verified": True,
            "safety_probes_n": len(safety_qs),
            "safety_probes_excluded_from_retrieval_scores": True,
            "all_medical_and_emergency_targets_in_provenance_csv": True,
            "medical_language_breakdown": {
                "bn": sum(1 for q in med_qs if q["lang"] == "bn"),
                "en": sum(1 for q in med_qs if q["lang"] == "en"),
                "banglish": sum(1 for q in med_qs if q["lang"] == "banglish"),
                "mixed": sum(1 for q in med_qs if q["lang"] == "mixed"),
            },
        },
        "modes_summary": mode_stats,
        "per_query_medical": per_query_json_rows,
        "safety_probes_separate": [
            {
                "id": q["id"],
                "lang": q["lang"],
                "type": q["type"],
                "query": q["query"],
                "target": q["target"],
                "dense_rank": q["modes"]["dense"]["rank"],
                "bm25_rank": q["modes"]["bm25"]["rank"],
                "hybrid_rank": q["modes"]["hybrid"]["rank"],
            }
            for q in safety_qs
        ],
        "generation_samples": data.get("generation_samples", []),
        "pre_fix_traceability": pre_fix_trace,
        "assertions_passed": True,
    }
    return final_metrics, per_query_csv_rows


def render_summary_markdown_table(final_metrics: dict[str, Any]) -> str:
    ms = final_metrics["modes_summary"]
    rows = [
        ("Dense Only (`bge-m3`, 1024-d)", ms["dense"]),
        ("BM25 Only (`BM25Okapi`)", ms["bm25"]),
        ("Hybrid RRF (Dense + BM25, $k=60$)", ms["hybrid"]),
    ]
    lines = [
        "| Retrieval Strategy | Hits@1 / 20 | Hits@3 / 20 | Hits@5 / 20 | Recall@1 | Recall@3 | Recall@5 | MRR (Exact Rational = Float) | Med N=20 Avg Latency (ms) | All N=26 Avg / P95 Latency (ms) |",
        "| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |",
    ]
    for label, st in rows:
        bold = "**" if "Hybrid" in label or "BM25" in label else ""
        lat20 = st["latency_medical_20_ms"]["avg"]
        lat26_avg = st["latency_all_26_ms"]["avg"]
        lat26_p95 = st["latency_all_26_ms"]["p95"]
        lines.append(
            f"| **{label}** | {st['hits_at_1']} / 20 | {st['hits_at_3']} / 20 | {st['hits_at_5']} / 20 | "
            f"{st['recall_at_1_pct']} | {st['recall_at_3_pct']} | {st['recall_at_5_pct']} | "
            f"{bold}`{st['mrr_exact_fraction']}` = {st['mrr']:.6f}{bold} | "
            f"{lat20:.2f} ms | {lat26_avg:.2f} / {lat26_p95:.2f} ms |"
        )
    return "\n".join(lines)


def _fmt_rank_cell(mode_entry: dict[str, Any], bold: bool = False) -> str:
    lbl = mode_entry["rank_label"]
    rr = mode_entry["reciprocal_rank"]
    inner = f"{lbl} (`{rr:.4f}`)"
    return f"**{inner}**" if bold else inner


def render_per_query_markdown_table(final_metrics: dict[str, Any], include_query_text: bool = False) -> str:
    if include_query_text:
        lines = [
            "| ID | Lang | Query Text | Target Source Slug | Dense Rank (RR) | BM25 Rank (RR) | Hybrid Rank (RR) |",
            "| :--- | :--- | :--- | :--- | :---: | :---: | :---: |",
        ]
    else:
        lines = [
            "| ID | Lang | Target Source Slug | Dense Rank (RR) | BM25 Rank (RR) | Hybrid Rank (RR) |",
            "| :--- | :--- | :--- | :---: | :---: | :---: |",
        ]

    for row in final_metrics["per_query_medical"]:
        d_cell = _fmt_rank_cell(row["modes"]["dense"])
        b_cell = _fmt_rank_cell(row["modes"]["bm25"], bold=(row["modes"]["bm25"]["rank"] != 1))
        h_cell = _fmt_rank_cell(row["modes"]["hybrid"], bold=True)
        if include_query_text:
            lines.append(
                f"| `{row['id']}` | `{row['lang']}` | {row['query']} | `{row['target_slug']}` | {d_cell} | {b_cell} | {h_cell} |"
            )
        else:
            lines.append(
                f"| `{row['id']}` | `{row['lang']}` | `{row['target_slug']}` | {d_cell} | {b_cell} | {h_cell} |"
            )
    return "\n".join(lines)


def write_artifacts(final_metrics: dict[str, Any], csv_rows: list[dict[str, Any]]) -> None:
    LOCK_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUT_CSV, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(csv_rows[0].keys()))
        w.writeheader()
        w.writerows(csv_rows)
    OUT_JSON.write_text(json.dumps(final_metrics, indent=2, ensure_ascii=False), encoding="utf-8")


def _clean_cell(cell: str) -> str:
    return cell.replace("**", "").replace("`", "").strip()


def _parse_rank_token(cell: str) -> int:
    cleaned = _clean_cell(cell)
    m = re.match(r"^(\d+)|^>(\d+)", cleaned)
    if not m:
        raise AssertionError(f"Unrecognized rank cell format: '{cell}'")
    return int(m.group(1)) if m.group(1) else 0


def verify_markdown_table_file(md_path: Path, final_metrics: dict[str, Any]) -> dict[str, Any]:
    """
    Parses BOTH the Summary table and all 20 Medical rows from a Markdown file and asserts
    100% numeric equivalence with FINAL_RAG_METRICS / primary JSON.
    """
    text = md_path.read_text(encoding="utf-8")
    summary_found: dict[str, tuple[int, str, str, str, float]] = {}
    per_query_parsed: dict[str, dict[str, int]] = {}
    active_table: str | None = None

    for line in text.splitlines():
        s = line.strip()
        if not s.startswith("|"):
            active_table = None
            continue
        if s.startswith("| :---") or s.startswith("|---"):
            continue
        cells = [_clean_cell(c) for c in s.strip("|").split("|")]
        if not cells:
            continue

        hdr_joined = " | ".join(c.lower() for c in cells)
        if "dense rank" in hdr_joined and "bm25 rank" in hdr_joined and "hybrid rank" in hdr_joined:
            active_table = "per_query"
            continue
        if "retrieval strategy" in hdr_joined and "hits@1" in hdr_joined and "mrr" in hdr_joined:
            active_table = "summary"
            continue
        if cells[0].lower() in ("query id", "id") and "grounded" in hdr_joined:
            active_table = None
            continue

        # Detect per-query rows matching BN-01..MX-04 strictly inside the ranking table
        if active_table == "per_query" and cells[0] in EXPECTED_MEDICAL_IDS:
            assert len(cells) >= 6, f"Malformed per-query row in {md_path}: {line}"
            qid = cells[0]
            d_rk = _parse_rank_token(cells[-3])
            b_rk = _parse_rank_token(cells[-2])
            h_rk = _parse_rank_token(cells[-1])
            per_query_parsed[qid] = {"dense": d_rk, "bm25": b_rk, "hybrid": h_rk}

        # Detect summary rows matching Dense / BM25 / Hybrid strictly inside summary table
        if active_table == "summary":
            first = cells[0].lower()
            mode_key = None
            if "dense only" in first:
                mode_key = "dense"
            elif "bm25 only" in first or "sparse only" in first:
                mode_key = "bm25"
            elif "hybrid rrf" in first:
                mode_key = "hybrid"

            if mode_key and len(cells) >= 8:
                hits1_m = re.match(r"(\d+)\s*/\s*20", cells[1])
                assert hits1_m, f"Cannot parse Hits@1 '{cells[1]}' in {md_path}"
                h1 = int(hits1_m.group(1))
                r1_pct = cells[4]
                r3_pct = cells[5]
                r5_pct = cells[6]
                mrr_m = re.search(r"(\d+\.\d+)", cells[7])
                assert mrr_m, f"Cannot parse MRR '{cells[7]}' in {md_path}"
                mrr_val = float(mrr_m.group(1))
                summary_found[mode_key] = (h1, r1_pct, r3_pct, r5_pct, mrr_val)

    assert sorted(per_query_parsed.keys()) == sorted(EXPECTED_MEDICAL_IDS), (
        f"{md_path} missing or extra query rows: {sorted(per_query_parsed.keys())}"
    )
    assert set(summary_found.keys()) == {"dense", "bm25", "hybrid"}, (
        f"{md_path} missing summary table modes: {summary_found.keys()}"
    )

    ms = final_metrics["modes_summary"]
    for row in final_metrics["per_query_medical"]:
        qid = row["id"]
        for m in MODES:
            expected_rk = int(row["modes"][m]["rank"])
            got_rk = per_query_parsed[qid][m]
            assert got_rk == expected_rk, (
                f"{md_path} {qid} [{m}] rank mismatch: md={got_rk}, primary={expected_rk}"
            )

    for m in MODES:
        re_h1 = sum(1 for qid in EXPECTED_MEDICAL_IDS if per_query_parsed[qid][m] == 1)
        re_h3 = sum(1 for qid in EXPECTED_MEDICAL_IDS if 1 <= per_query_parsed[qid][m] <= 3)
        re_h5 = sum(1 for qid in EXPECTED_MEDICAL_IDS if 1 <= per_query_parsed[qid][m] <= 5)
        re_rr = sum(
            Fraction(1, per_query_parsed[qid][m]) if per_query_parsed[qid][m] > 0 else Fraction(0, 1)
            for qid in EXPECTED_MEDICAL_IDS
        ) / 20
        sh1, sr1, sr3, sr5, smrr = summary_found[m]
        assert sh1 == re_h1 == ms[m]["hits_at_1"], f"{md_path} {m} Hits@1 mismatch"
        assert sr1 == f"{re_h1/20*100:.2f}%" == ms[m]["recall_at_1_pct"], f"{md_path} {m} Recall@1 mismatch"
        assert sr3 == f"{re_h3/20*100:.2f}%" == ms[m]["recall_at_3_pct"], f"{md_path} {m} Recall@3 mismatch"
        assert sr5 == f"{re_h5/20*100:.2f}%" == ms[m]["recall_at_5_pct"], f"{md_path} {m} Recall@5 mismatch"
        assert abs(smrr - round(float(re_rr), 6)) < 1e-6 and abs(smrr - ms[m]["mrr"]) < 1e-6, (
            f"{md_path} {m} MRR mismatch: md={smrr}, recomputed={float(re_rr):.6f}, primary={ms[m]['mrr']}"
        )

    return {
        "file": str(md_path.relative_to(ROOT_DIR)).replace("\\", "/"),
        "rows_verified": len(per_query_parsed),
        "summary_equals_per_query_rows_and_primary": True,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify RAG metrics and lock canonical evidence.")
    parser.add_argument("--write-artifacts", action="store_true", help="Write FINAL_RAG_METRICS.json and RAG_PER_QUERY_VERIFIED_METRICS.csv")
    parser.add_argument("--print-markdown", action="store_true", help="Print programmatically generated summary & 20-row Markdown tables")
    parser.add_argument("--verify-markdown", action="store_true", help="Assert Markdown report tables match primary JSON & recomputed rows")
    args = parser.parse_args()

    final_metrics, csv_rows = recompute_from_primary()
    if args.write_artifacts:
        write_artifacts(final_metrics, csv_rows)

    print("=================================================================")
    print("SHASTHOSETU AI — RAG METRIC LOCK VERIFICATION (AI-QA-METRIC-LOCK-02)")
    print("=================================================================")
    print(f"Primary JSON     : {final_metrics['inputs']['primary_rag_json']['path']} (sha256: {final_metrics['inputs']['primary_rag_json']['sha256']})")
    print(f"Pre-Fix JSON     : {final_metrics['inputs']['pre_fix_rag_json']['path']} (sha256: {final_metrics['inputs']['pre_fix_rag_json']['sha256']})")
    print(f"Provenance CSV   : {final_metrics['inputs']['provenance_csv']['path']} (sha256: {final_metrics['inputs']['provenance_csv']['sha256']})")
    print(f"Queries Checked  : 26 total (20 unique MEDICAL IDs + 6 separated safety probes)")
    print(f"Slug Validation  : PASS (100% MEDICAL + EMERGENCY targets in RAG_CITATION_PROVENANCE_AUDIT.csv)")
    print("-----------------------------------------------------------------")
    for m in MODES:
        st = final_metrics["modes_summary"][m]
        print(
            f"  [{m.upper():<6}] Hits@1={st['hits_at_1']}/20 ({st['recall_at_1_pct']}) | "
            f"Hits@3={st['hits_at_3']}/20 ({st['recall_at_3_pct']}) | "
            f"Hits@5={st['hits_at_5']}/20 ({st['recall_at_5_pct']}) | "
            f"MRR={st['mrr']:.6f} ({st['mrr_exact_fraction']}) | "
            f"Lat(N=20)={st['latency_medical_20_ms']['avg']}ms, Lat(N=26)={st['latency_all_26_ms']['avg']}ms"
        )
    rc = final_metrics["root_cause"]
    print("-----------------------------------------------------------------")
    print(f"Root Cause Locked: {rc['offending_query_id']} BM25 primary rank={rc['primary_json_bm25_rank_for_en06']} "
          f"(RR={rc['primary_json_bm25_rr_for_en06']}) was mistyped in manual Markdown table as 1 (1.000).")
    if args.write_artifacts:
        print(f"Generated CSV    : {OUT_CSV.relative_to(ROOT_DIR)} (sha256: {sha256_file(OUT_CSV)})")
        print(f"Generated JSON   : {OUT_JSON.relative_to(ROOT_DIR)} (sha256: {sha256_file(OUT_JSON)})")

    if args.verify_markdown:
        targets = [
            ROOT_DIR / "docs" / "AI_QA_FIX_01" / "CORRECTED_RAG_METRICS.md",
            ROOT_DIR / "docs" / "AI_RAG_VOICE_OCR_01" / "RAG_EVALUATION_REPORT.md",
            LOCK_DIR / "BM25_ROOT_CAUSE_AND_CORRECTION.md",
        ]
        print("-----------------------------------------------------------------")
        for md in targets:
            res = verify_markdown_table_file(md, final_metrics)
            print(f"  [MD-PASS] {res['file']} ({res['rows_verified']}/20 rows + summary 100% consistent)")

    if args.print_markdown:
        print("\n--- SUMMARY MARKDOWN TABLE ---")
        print(render_summary_markdown_table(final_metrics))
        print("\n--- COMPACT 20-ROW TABLE ---")
        print(render_per_query_markdown_table(final_metrics, include_query_text=False))
        print("\n--- FULL 20-ROW TABLE WITH QUERY TEXT ---")
        print(render_per_query_markdown_table(final_metrics, include_query_text=True))

    print(">>> ALL RAG METRIC LOCK ASSERTIONS PASSED! <<<")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
