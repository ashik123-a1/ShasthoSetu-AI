"""
ShasthoSetu AI — Automated Competition Submission Fields Verification Script
Verifies all 13 fields in submission/COMPETITION_SUBMISSION_FIELDS.md strictly satisfy min-char rules.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]
FIELDS_FILE = PROJECT_ROOT / "submission" / "COMPETITION_SUBMISSION_FIELDS.md"

# Defined minimum character thresholds from competition rubric
FIELD_THRESHOLDS: dict[str, int] = {
    "Box 01: Project Title": 10,
    "Box 02: Tagline / Elevator Pitch": 40,
    "Box 03: Prompt Strategy Text": 200,
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


def verify_submission_fields() -> bool:
    if not FIELDS_FILE.exists():
        print(f"FAIL: Submission fields file not found at {FIELDS_FILE}")
        return False

    content = FIELDS_FILE.read_text(encoding="utf-8")
    sections = re.findall(r"### (Box \d{2}: [^\n]+)\n[\s\S]*?```(?:\w*\n)?([\s\S]*?)```", content)

    if not sections:
        print("FAIL: Could not parse any Box sections from submission file!")
        return False

    all_passed = True
    print("\n" + "=" * 70)
    print(" SHASTHOSETU AI — COMPETITION SUBMISSION FIELDS VERIFICATION (13/13)")
    print("=" * 70)

    parsed_keys = set()
    for header, value in sections:
        header_clean = header.strip()
        value_clean = value.strip()
        char_count = len(value_clean)
        parsed_keys.add(header_clean)

        min_req = FIELD_THRESHOLDS.get(header_clean, 80)
        status = "PASS" if char_count >= min_req else "FAIL"
        overshoot = char_count - min_req

        print(f"[{status}] {header_clean:<40} : {char_count:>4} chars (min {min_req:>3}, +{overshoot:>3})")

        if char_count < min_req:
            all_passed = False

    missing = set(FIELD_THRESHOLDS.keys()) - parsed_keys
    if missing:
        print(f"\nFAIL: Missing boxes: {missing}")
        all_passed = False

    print("=" * 70)
    if all_passed:
        print("✅ ALL 13/13 SUBMISSION BOXES STRICTLY SATISFY MIN-CHAR THRESHOLDS!\n")
    else:
        print("❌ SOME SUBMISSION BOXES FAILED MIN-CHAR THRESHOLD AUDIT!\n")

    return all_passed


if __name__ == "__main__":
    success = verify_submission_fields()
    sys.exit(0 if success else 1)
