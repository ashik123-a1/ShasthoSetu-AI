"""
Lightweight automated metric-lock unit tests for TASK AI-QA-METRIC-LOCK-02.
Validates primary RAG JSON, FINAL_RAG_METRICS.json, RAG_PER_QUERY_VERIFIED_METRICS.csv,
pre_fix_rag_benchmark_results.json traceability, and published Markdown tables without
invoking Ollama, Voice/OCR models, GPU, or Playwright.
"""

from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT_DIR / "services" / "api" / "src"))
sys.path.insert(0, str(ROOT_DIR / "services" / "api" / "evals"))

from eval_rag import validate_rag_payload_consistency
from verify_rag_metric_lock_02 import (
    EXPECTED_MEDICAL_IDS,
    OUT_CSV,
    OUT_JSON,
    PRE_FIX_RAG_JSON,
    PRIMARY_RAG_JSON,
    PROVENANCE_CSV,
    recompute_from_primary,
    verify_markdown_table_file,
)


def test_primary_rag_json_consistency_and_eval_validator():
    payload = json.loads(PRIMARY_RAG_JSON.read_text(encoding="utf-8"))
    recomputed = validate_rag_payload_consistency(payload)

    assert payload["medical_queries_n"] == 20
    assert payload["benchmark_size"] == 26
    assert recomputed["dense"]["hits_at_1"] == 18
    assert recomputed["dense"]["mrr"] == 0.95

    assert recomputed["bm25"]["hits_at_1"] == 16
    assert recomputed["bm25"]["hits_at_3"] == 18
    assert recomputed["bm25"]["hits_at_5"] == 19
    assert recomputed["bm25"]["mrr"] == 0.854167

    assert recomputed["hybrid"]["hits_at_1"] == 19
    assert recomputed["hybrid"]["mrr"] == 0.975

    en06 = next(q for q in payload["detailed_queries"] if q["id"] == "EN-06")
    assert en06["modes"]["bm25"]["rank"] == 2
    assert en06["modes"]["bm25"]["hit_at_1"] is False
    assert en06["modes"]["bm25"]["top_5_slugs"][0] == "ultrasound-pcom-terminology-guide"
    assert en06["modes"]["bm25"]["top_5_slugs"][1] == "bangladesh-prescription-terminology"


def test_final_rag_metrics_json_and_csv_match_primary():
    recomputed_metrics, _ = recompute_from_primary()
    locked_json = json.loads(OUT_JSON.read_text(encoding="utf-8"))
    assert locked_json["assertions_passed"] is True
    assert locked_json["modes_summary"] == recomputed_metrics["modes_summary"]
    assert locked_json["root_cause"]["offending_query_id"] == "EN-06"
    assert locked_json["root_cause"]["primary_json_bm25_rank_for_en06"] == 2

    with open(PROVENANCE_CSV, "r", encoding="utf-8") as f:
        prov_slugs = {r["slug"] for r in csv.DictReader(f)}
    with open(OUT_CSV, "r", encoding="utf-8") as f:
        csv_rows = list(csv.DictReader(f))

    assert [r["query_id"] for r in csv_rows] == EXPECTED_MEDICAL_IDS
    assert all(r["target_slug"] in prov_slugs and r["target_in_provenance_csv"] == "True" for r in csv_rows)

    en06_csv = next(r for r in csv_rows if r["query_id"] == "EN-06")
    assert int(en06_csv["bm25_rank"]) == 2
    assert float(en06_csv["bm25_rr"]) == 0.5
    assert int(en06_csv["bm25_hit_at_1"]) == 0


def test_markdown_tables_match_primary_metrics():
    final_metrics, _ = recompute_from_primary()
    targets = [
        ROOT_DIR / "docs" / "AI_QA_FIX_01" / "CORRECTED_RAG_METRICS.md",
        ROOT_DIR / "docs" / "AI_RAG_VOICE_OCR_01" / "RAG_EVALUATION_REPORT.md",
        ROOT_DIR / "docs" / "AI_QA_METRIC_LOCK_02" / "BM25_ROOT_CAUSE_AND_CORRECTION.md",
    ]
    for path in targets:
        res = verify_markdown_table_file(path, final_metrics)
        assert res["rows_verified"] == 20
        assert res["summary_equals_per_query_rows_and_primary"] is True


def test_pre_fix_rag_benchmark_preserved():
    assert PRE_FIX_RAG_JSON.exists()
    pre = json.loads(PRE_FIX_RAG_JSON.read_text(encoding="utf-8"))
    assert pre["medical_queries_n"] == 20
    en06 = next(q for q in pre["detailed_queries"] if q["id"] == "EN-06")
    assert en06["target"] == "bangladesh-prescription-terminology"
    assert en06["modes"]["bm25"]["top_slugs"][1] == "bangladesh-prescription-terminology"
