"""
ShasthoSetu AI — Automated Competition Submission Fields Verification Script
Verifies all 13 fields in submission/COMPETITION_SUBMISSION_FIELDS_CAT3.md and .json
strictly satisfy min-char rules and honest technical claim standards.
"""

from __future__ import annotations

import re
import sys
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]
FIELDS_MD = PROJECT_ROOT / "submission" / "COMPETITION_SUBMISSION_FIELDS_CAT3.md"
FIELDS_JSON = PROJECT_ROOT / "submission" / "COMPETITION_SUBMISSION_FIELDS_CAT3.json"

# Defined minimum character thresholds from competition rubric (including top-tier prompt strategy)
FIELD_THRESHOLDS: dict[str, int] = {
    "Box 01: Project Title": 10,
    "Box 02: Tagline / Elevator Pitch": 40,
    "Box 03: Prompt Strategy Text": 500,  # Top-tier threshold (>= 500 chars)
    "Box 04: Token Optimization Notes": 50,
    "Box 05: AI-DLC Process Notes": 100,
    "Box 06: Agent / Orchestration Notes": 80,
    "Box 07: Fine-Tuning / Adaptation Notes": 80,
    "Box 08: Evaluation & Quality Methods": 80,
    "Box 09: Guardrails / Safety / Privacy": 80,
    "Box 10: Tunneling Usage Notes": 80,
    "Box 11: Data Quality Measures": 80,
    "Box 12: Privacy & Compliance Notes": 80,
    "Box 13: Lineage & Observability Notes": 80,
}

# Forbidden overstated keywords that violate honest submission standards
FORBIDDEN_OVERSTATEMENTS = [
    "cloud certification",
    "fda approved",
    "dgda approved",
    "ce marked",
    "production deployed to 100 clinics",
]


def verify_submission_fields() -> bool:
    if not FIELDS_MD.exists():
        print(f"FAIL: Submission fields markdown not found at {FIELDS_MD}")
        return False
    if not FIELDS_JSON.exists():
        print(f"FAIL: Submission fields JSON not found at {FIELDS_JSON}")
        return False

    content = FIELDS_MD.read_text(encoding="utf-8")
    sections = re.findall(r"### (Box \d{2}: [^\n]+)\n[\s\S]*?```(?:\w*\n)?([\s\S]*?)```", content)

    if not sections:
        print("FAIL: Could not parse any Box sections from submission file!")
        return False

    with open(FIELDS_JSON, "r", encoding="utf-8") as f:
        json_data = json.load(f)

    all_passed = True
    print("\n" + "=" * 76)
    print(" SHASTHOSETU AI — COMPETITION SUBMISSION FIELDS AUDIT (CATEGORY 3: 13/13)")
    print("=" * 76)

    parsed_keys = set()
    for header, value in sections:
        header_clean = header.strip()
        value_clean = value.strip()
        char_count = len(value_clean)
        parsed_keys.add(header_clean)

        min_req = FIELD_THRESHOLDS.get(header_clean, 80)
        status = "PASS" if char_count >= min_req else "FAIL"
        overshoot = char_count - min_req

        # Check JSON sync
        json_entry = json_data.get(header_clean)
        sync_ok = (json_entry is not None and json_entry.get("character_count") == char_count)
        sync_status = "SYNC_OK" if sync_ok else "SYNC_MISMATCH"

        # Check honest claims
        lower_val = value_clean.lower()
        unsupported_found = [term for term in FORBIDDEN_OVERSTATEMENTS if term in lower_val]
        if unsupported_found:
            status = "WARN"
            print(f"  WARNING: Detected overstated term(s) {unsupported_found} in {header_clean}")

        print(f"[{status}] {header_clean:<40} : {char_count:>4} chars (min {min_req:>3}, +{overshoot:>3}) [{sync_status}]")

        if char_count < min_req:
            all_passed = False
        if not sync_ok:
            all_passed = False

    missing = set(FIELD_THRESHOLDS.keys()) - parsed_keys
    if missing:
        print(f"\nFAIL: Missing boxes: {missing}")
        all_passed = False

    print("=" * 76)
    if all_passed:
        print("✅ ALL 13/13 SUBMISSION BOXES STRICTLY SATISFY MIN-CHAR & SYNC AUDIT!\n")
    else:
        print("❌ SOME SUBMISSION BOXES FAILED AUDIT!\n")

    return all_passed


if __name__ == "__main__":
    success = verify_submission_fields()
    sys.exit(0 if success else 1)
