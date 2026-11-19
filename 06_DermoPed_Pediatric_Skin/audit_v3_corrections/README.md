# 06_DermoPed_Pediatric_Skin — Audit V3 Corrections Index

This directory provides cryptographically verified evidence corrections for the DermoPed Tier 1 experiments (EXP_A, EXP_B, EXP_D).

## Contents
1. `verify_provenance.py`: Standalone Python script that computes SHA-256 hashes of all checkpoints and derives exact manifest patient crop counts.
2. `provenance_hashes.json`: Exact SHA-256 checksums and byte sizes for all 3 trained model checkpoints.
3. `corrected_patient_splits.csv`: Verified patient-level manifest table with exact crop counts and 3-category demographic status (`Pediatric`, `Adult`, `Unknown`).
4. `EVIDENCE_CORRECTIONS_REPORT.md`: Comprehensive audit narrative documenting how all 3 reported inconsistencies were forensicly investigated and corrected.

## Execution
Run the verification script anytime using the shared PyTorch environment:
```powershell
& "..\..\_shared\venv\Scripts\python.exe" "verify_provenance.py"
```
