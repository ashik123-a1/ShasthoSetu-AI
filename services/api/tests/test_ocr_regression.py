from __future__ import annotations

import io
import json
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from shasthosetu_api.main import app
from shasthosetu_api.services.ml_inference import (
    _DUR_RE,
    _FREQ_RE,
    _HEADER_RE,
    _KNOWN_BRANDS_RE,
    _MED_PREFIX_RE,
    _STRENGTH_RE,
    _cluster_boxes_into_lines,
    _extract_candidates_from_clustered_lines,
    get_curated_sample_image,
)
from shasthosetu_api.services.ocr_service import (
    _cluster_reading_lines,
    extract_structured_medicine_candidates,
)


class TestOcrSpatialClusteringAndExtraction:
    """Automated regression suite verifying spatial row clustering, table multi-column

    extraction, brand recognition, and Zero-Trust verification gating.
    """

    def test_spatial_clustering_row_grouping_and_reading_order(self):
        """Verifies that bounding boxes on the same horizontal line are clustered together

        and sorted strictly left-to-right (reading order), even when given out of order.
        """
        boxes = [
            # Line 2 (Y ~ 200) - disordered
            {"text": "1+0+1", "confidence": 0.88, "x_min": 350.0, "x_pct": 35.0, "y_center": 202.0, "y_pct": 20.0, "height": 22.0},
            {"text": "Tab. Maxpro", "confidence": 0.95, "x_min": 60.0, "x_pct": 6.0, "y_center": 198.0, "y_pct": 19.8, "height": 24.0},
            {"text": "20 mg", "confidence": 0.92, "x_min": 210.0, "x_pct": 21.0, "y_center": 200.0, "y_pct": 20.0, "height": 22.0},
            {"text": "14 days", "confidence": 0.85, "x_min": 480.0, "x_pct": 48.0, "y_center": 204.0, "y_pct": 20.4, "height": 20.0},
            # Line 1 (Y ~ 100) - disordered
            {"text": "HOSPITAL", "confidence": 0.99, "x_min": 250.0, "x_pct": 25.0, "y_center": 100.0, "y_pct": 10.0, "height": 25.0},
            {"text": "DHAKA", "confidence": 0.99, "x_min": 80.0, "x_pct": 8.0, "y_center": 98.0, "y_pct": 9.8, "height": 25.0},
        ]

        lines = _cluster_boxes_into_lines(boxes)
        assert len(lines) == 2, f"Expected 2 clustered lines, got {len(lines)}"

        # Line 1 should be header line sorted left to right
        line1_text = " ".join(b["text"] for b in lines[0])
        assert line1_text == "DHAKA HOSPITAL"

        # Line 2 should be medicine row sorted left to right
        line2_text = " ".join(b["text"] for b in lines[1])
        assert line2_text == "Tab. Maxpro 20 mg 1+0+1 14 days"

    def test_header_suppression_blocks_false_medicine_candidates(self):
        """Ensures table headers and administrative labels are discarded and not parsed as medicines."""
        header_boxes = [
            [{"text": "Medicine Name", "confidence": 0.9}],
            [{"text": "Dosage & Strength", "confidence": 0.88}],
            [{"text": "বহির্বিভাগীয় টিকিট", "confidence": 0.92}],
            [{"text": "Duration / Timing", "confidence": 0.85}],
        ]
        candidates = _extract_candidates_from_clustered_lines(header_boxes, mean_conf=0.9)
        assert len(candidates) == 0, f"Headers should not yield candidates, got: {candidates}"

    def test_multi_column_table_row_extraction_and_unverified_default(self):
        """Verifies multi-column table tokens are correctly mapped into structured fields

        and always flagged with is_verified=False (Zero-Trust clinical requirement).
        """
        table_row = [
            {"text": "1.", "confidence": 0.95, "x_min": 20.0, "y_center": 150.0, "height": 20.0},
            {"text": "TAB_ Zoclar", "confidence": 0.93, "x_min": 60.0, "y_center": 150.0, "height": 20.0},
            {"text": "500 mg", "confidence": 0.90, "x_min": 180.0, "y_center": 150.0, "height": 20.0},
            {"text": "1+0+1", "confidence": 0.87, "x_min": 270.0, "y_center": 150.0, "height": 20.0},
            {"text": "7 days", "confidence": 0.89, "x_min": 360.0, "y_center": 150.0, "height": 20.0},
        ]

        candidates = _extract_candidates_from_clustered_lines([table_row], mean_conf=0.9)
        assert len(candidates) == 1
        cand = candidates[0]
        # TAB_ should be normalized to TAB.
        assert "TAB. Zoclar" in cand["medicine_name"]
        assert cand["strength"] == "500 mg"
        assert cand["frequency"] == "1+0+1"
        assert cand["duration"] == "7 days"
        assert cand["is_verified"] is False
        assert cand["needs_verification"] is True

    def test_known_brand_recognition_and_prefix_normalization(self):
        """Verifies known Bangladeshi brand names and Latin formulation prefix normalization."""
        lines = [
            [
                {"text": "Tab", "confidence": 0.91, "x_min": 30.0, "y_center": 100.0, "height": 20.0},
                {"text": "Napa", "confidence": 0.95, "x_min": 70.0, "y_center": 100.0, "height": 20.0},
                {"text": "500mg", "confidence": 0.92, "x_min": 130.0, "y_center": 100.0, "height": 20.0},
                {"text": "1+1+1", "confidence": 0.89, "x_min": 210.0, "y_center": 100.0, "height": 20.0},
                {"text": "3 days", "confidence": 0.86, "x_min": 290.0, "y_center": 100.0, "height": 20.0},
            ],
            [
                {"text": "Cap.", "confidence": 0.92, "x_min": 30.0, "y_center": 140.0, "height": 20.0},
                {"text": "Sergel", "confidence": 0.94, "x_min": 80.0, "y_center": 140.0, "height": 20.0},
                {"text": "20 mg", "confidence": 0.90, "x_min": 150.0, "y_center": 140.0, "height": 20.0},
                {"text": "1+0+1", "confidence": 0.88, "x_min": 230.0, "y_center": 140.0, "height": 20.0},
                {"text": "খাওয়ার আগে", "confidence": 0.85, "x_min": 300.0, "y_center": 140.0, "height": 20.0},
                {"text": "14 days", "confidence": 0.87, "x_min": 400.0, "y_center": 140.0, "height": 20.0},
            ],
        ]

        candidates = _extract_candidates_from_clustered_lines(lines, mean_conf=0.9)
        assert len(candidates) == 2
        # Napa check
        assert "Napa" in candidates[0]["medicine_name"]
        assert candidates[0]["strength"] == "500 mg"
        assert candidates[0]["frequency"] == "1+1+1"
        assert candidates[0]["is_verified"] is False

        # Sergel check
        assert "Sergel" in candidates[1]["medicine_name"]
        assert candidates[1]["strength"] == "20 mg"
        assert "1+0+1" in candidates[1]["frequency"]
        assert candidates[1]["is_verified"] is False

    def test_secondary_generic_composition_subline_binding(self):
        """Tests that a secondary generic line directly underneath a brand medicine binds properly to it."""
        lines = [
            # Line 1: Primary Brand Line
            [
                {"text": "Tab. Vomilast 10/SR", "confidence": 0.92, "x_min": 40.0, "y_center": 110.0, "height": 20.0},
                {"text": "0+0+1", "confidence": 0.88, "x_min": 240.0, "y_center": 110.0, "height": 20.0},
                {"text": "10 days", "confidence": 0.85, "x_min": 320.0, "y_center": 110.0, "height": 20.0},
            ],
            # Line 2: Generic composition subline
            [
                {"text": "Doxylamine Succinate + Pyridoxine Hcl 10mg+10mg", "confidence": 0.90, "x_min": 60.0, "y_center": 135.0, "height": 18.0},
            ],
        ]

        candidates = _extract_candidates_from_clustered_lines(lines, mean_conf=0.89)
        assert len(candidates) == 1
        cand = candidates[0]
        assert "Vomilast" in cand["medicine_name"]
        # Generic subline should enrich strength if not already resolved or provided in subline
        assert "10mg" in cand["strength"] or "10/SR" in cand["medicine_name"]
        assert cand["frequency"] == "0+0+1"
        assert cand["duration"] == "10 days"

    def test_bengali_medicine_and_dosage_regex(self):
        """Verifies Bengali script medicine forms, frequency, duration, and instructions."""
        bn_text = "১) ট্যাবলেট প্যারাসিটামল ৫০০ মি.গ্রা ১+১+১ ৩ দিন খাওয়ার পর"
        assert _MED_PREFIX_RE.search(bn_text) is not None
        assert _STRENGTH_RE.search(bn_text) is not None
        assert _FREQ_RE.search(bn_text) is not None
        assert _DUR_RE.search(bn_text) is not None

    def test_ocr_service_extract_structured_medicine_candidates(self):
        """Verifies extract_structured_medicine_candidates in ocr_service.py."""
        raw_lines = [
            "DHAKA MEDICAL COLLEGE HOSPITAL",
            "OUTPATIENT PRESCRIPTION",
            "1. Tab. Napa Extra 500mg+65mg 1+1+1 5 days",
            "2. Cap. Maxpro 20 mg 1+0+1 14 days before meal",
            "3. Syp. Tofen 100 ml 1 tsf bid 7 days",
        ]
        candidates = extract_structured_medicine_candidates(raw_lines, mean_conf=0.91)
        assert len(candidates) >= 2
        for cand in candidates:
            assert "medicine_name" in cand
            assert "strength" in cand
            assert "frequency" in cand
            assert "duration" in cand
            assert cand["is_verified"] is False
            assert cand["needs_verification"] is True

    def test_sample_realistic_rx_image_loader(self):
        """Ensures the curated realistic prescription image exists and can be loaded."""
        data, fname, mime = get_curated_sample_image("prescription-ocr")
        assert len(data) > 1000
        assert fname.endswith((".png", ".jpg", ".jpeg"))
        assert "image/" in mime

        # Verify it decodes into a valid image
        img = Image.open(io.BytesIO(data))
        assert img.width > 100
        assert img.height > 100

    def test_ocr_gate_unverified_activation_returns_422(self, tmp_path: Path, monkeypatch):
        """Full-stack integration test: verifies that unverified OCR results cannot be
        activated into a patient health plan without explicit human verification (HTTP 422 gate).
        """
        db_file = tmp_path / "test_ocr_gate.db"
        monkeypatch.setenv("SHASTHOSETU_DB_PATH", str(db_file))
        from shasthosetu_api.core.security import reset_rate_limits
        from shasthosetu_api.seeds.seed_demo import seed_database
        reset_rate_limits()
        seed_database(db_path=db_file, force_reset=True)

        client = TestClient(app)

        # 1. Login as patient demo
        login_resp = client.post(
            "/v1/auth/login",
            json={"identifier": "patient.demo@shasthosetu.local", "password": "PatientDemo#2026"},
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"

        # 2. Hard 422 barrier while OCR critical fields are unverified
        bad = client.post(
            "/v1/patient/ocr-jobs/ocr-job-0052/activate-plan",
            json={"patient_profile_id": "pp-rahima-self"},
        )
        assert bad.status_code == 422
        assert "UNVERIFIED_OCR_FIELDS" in bad.text or "unverified" in bad.text.lower()

        # 3. Retrieve fields and verify them
        docs = client.get("/v1/patient/documents").json()
        target_job = [j for j in docs["ocr_jobs"] if j["id"] == "ocr-job-0052"][0]
        for field in target_job["fields"]:
            res = client.patch(
                f"/v1/patient/ocr-fields/{field['id']}/verify",
                json={"verified_value": field["raw_ocr_text"] + " (Verified)"},
            )
            assert res.status_code == 200

        # 4. Activation succeeds now that all fields are verified
        ok = client.post(
            "/v1/patient/ocr-jobs/ocr-job-0052/activate-plan",
            json={"patient_profile_id": "pp-rahima-self"},
        )
        assert ok.status_code == 200
        assert ok.json()["activated"] is True

