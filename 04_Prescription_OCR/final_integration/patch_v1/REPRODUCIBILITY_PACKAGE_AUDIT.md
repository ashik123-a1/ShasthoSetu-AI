# 📦 ShasthoSetu AI — Reproducibility Package Audit & Extraction Verification (Patch V1)

**Audit Version:** Patch V1.0  
**Date:** 2026-11-18  
**Verification Level:** Full Local Reproducibility & Clean-Room Extraction Testing  
**Archive Under Audit:** `final_integration/patch_v1/proofs/PATCH_V1_PROOFS.zip`  

---

## 1. Executive Summary & Defect Remediation

In the previous integration package (`FINAL_INTEGRATION_PROOFS.zip`), the reproduction script executed `src/package_final_proofs.py`, but that packaging script had been omitted from the archive manifest list.

**Patch V1 Remediation:**
1. The packaging script [src/package_patch_v1_proofs.py](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/04_Prescription_OCR/final_integration/patch_v1/src/package_patch_v1_proofs.py) is explicitly bundled inside `PATCH_V1_PROOFS.zip`.
2. A clean-room extraction test was executed via `tests/test_proof_zip_extraction.py`:
   - Extracted archive into an isolated temporary folder.
   - Executed test suites directly on the extracted files.
   - Verified that all subprocesses returned exit code `0` (Zero errors).

---

## 2. Complete Inventory of Bundled Deliverables

| Relative Path in Archive | Category | Primary Function |
| :--- | :--- | :--- |
| `CANONICAL_SPLIT_AUDIT.md` | Audit | Dynamic reconciliation of split memberships from `split_manifest.csv` |
| `QUARANTINE_MANIFEST_VERIFIED.json` | Data / JSON | Canonical split and quarantine counts |
| `SAFETY_AUTHORIZATION_REPORT.md` | Governance | Enforces `SIMULATED_REVIEW_ONLY` and disallows false authentication |
| `REAL_E2E_TEST_RESULTS.md` | Testing | Matrix of 6 real end-to-end tests (real GPU OCR, upload security, anti-automation) |
| `REPRODUCIBILITY_PACKAGE_AUDIT.md` | Audit | This clean-room extraction verification report |
| `PATCH_CHANGELOG.md` | Governance | Change log of all Patch V1 fixes |
| `reproduce_patch_v1.ps1` | Automation | Master PowerShell reproduction script with exit code checks |
| `src/safety_gate_v2.py` | Python Code | Backend runtime safety gate enforcing zero-automation in demo mode |
| `src/demo_server_v2.py` | Python Code | Hardened HTTP server with upload validation & PII sanitization |
| `src/generate_canonical_split_audit.py` | Python Code | Generates canonical audit JSON and dynamic markdown |
| `src/package_patch_v1_proofs.py` | Python Code | Proof archive packaging script (now bundled) |
| `tests/test_real_e2e_workflow.py` | Test Code | Automated end-to-end integration test suite |
| `demo/index.html` | Frontend UI | Side-by-side clinical portal with simulation disclaimer |
| `demo/styles.css` | Frontend UI | Styling with uncertainty color-coding |
| `demo/app.js` | Frontend UI | Dynamic OCR stream rendering & non-actionable FHIR draft generation |

---

## 3. Clean-Room Extraction Test Results

Execution of `tests/test_proof_zip_extraction.py`:

```
=== TESTING ZIP PACKAGE REPRODUCIBILITY ===
Archive: F:\...\patch_v1\proofs\PATCH_V1_PROOFS.zip

[1/3] Extracting archive to temporary directory: temp_extracted_verification...
Successfully extracted 15 files.
Verified: Packaging script 'src\package_patch_v1_proofs.py' is present in archive.

[2/3] Executing automated tests directly on extracted codebase...
Subprocess Exit Code: 0
Test Output: Ran 6 tests in 5.19s ... OK!
Extracted test suite PASSED completely!

[3/3] Cleaning up temporary directory...
Cleanup complete. Full package reproducibility verified!
```

---

## 4. Master Reproduction Instructions

To reproduce the canonical split reconciliation, run the test suite, package the archive, and verify clean-room extraction in a single command:

```powershell
Set-Location "F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR\final_integration\patch_v1"
powershell -ExecutionPolicy Bypass -File .\reproduce_patch_v1.ps1
```
