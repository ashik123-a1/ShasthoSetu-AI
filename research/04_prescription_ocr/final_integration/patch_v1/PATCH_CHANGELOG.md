# 📝 ShasthoSetu AI — Patch V1 Changelog & Governance Summary

**Patch Identifier:** `PATCH-V1.0-OCR-SAFE-INTEGRATION`  
**Date:** 2026-11-18  
**Scope:** Defect Remediation, Canonical Split Manifest Alignment, and Complete Reproducibility Packaging  

---

## 1. Summary of Resolved Issues

| Issue ID | Category | Prior Defect / Finding | Patch V1 Resolution |
| :---: | :--- | :--- | :--- |
| **Issue A** | Manifest Consistency | Narrative Markdown tables had typos (`0174`/`0185` typed as train, `0674`/`0675` typed as val, `0756`/`0757` described as shifted to train). | **Fixed:** Dynamically generated [CANONICAL_SPLIT_AUDIT.md](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/04_Prescription_OCR/final_integration/patch_v1/CANONICAL_SPLIT_AUDIT.md) and `QUARANTINE_MANIFEST_VERIFIED.json` directly from `split_manifest.csv`. Validated that `0756`/`0757` remain in the test partition with `evaluation_admissible = False` (not moved to train). |
| **Issue B** | Reproducibility Archive | `package_final_proofs.py` was executed by `reproduce_final.ps1` but was omitted from the archive manifest list. | **Fixed:** Packaging script [src/package_patch_v1_proofs.py](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/04_Prescription_OCR/final_integration/patch_v1/src/package_patch_v1_proofs.py) is explicitly bundled inside `PATCH_V1_PROOFS.zip`. Automated extraction test added. |
| **Issue C** | Authentication Boundary | Web-form input (typed clinician name/BMDC ID) was treated as real verification, creating potential for unauthorized automation. | **Fixed:** Implemented strict `SIMULATED_REVIEW_ONLY` state in [src/safety_gate_v2.py](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/04_Prescription_OCR/final_integration/patch_v1/src/safety_gate_v2.py). Real automation, SMS dispatch, and live EHR writes are permanently disabled (`False`). |
| **Issue D** | Real End-to-End Testing | Previous loopback test only verified static HTTP asset serving. | **Fixed:** Developed and executed [tests/test_real_e2e_workflow.py](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/04_Prescription_OCR/final_integration/patch_v1/tests/test_real_e2e_workflow.py) verifying real GPU OCR inference on `0052.jpg`, uncertainty tracking, upload security, direct API bypass protection, and PII log redaction. |

---

## 2. Inventory of New & Modified Artifacts

- **Core Logic:**
  - `src/safety_gate_v2.py`: Hardened clinical safety gate enforcing `SIMULATED_REVIEW_ONLY`, zero-automation default, and upload security.
  - `src/demo_server_v2.py`: HTTP server with upload validation, API endpoints, PII-sanitized logging, and direct bypass rejection.
  - `src/generate_canonical_split_audit.py`: Generates verified manifest JSON and dynamic markdown audit.
  - `src/package_patch_v1_proofs.py`: Bundles all patch deliverables into `PATCH_V1_PROOFS.zip`.
- **Test Suites:**
  - `tests/test_real_e2e_workflow.py`: Comprehensive 6-test suite testing real GPU OCR, security, and anti-automation (6/6 passed).
  - `tests/test_proof_zip_extraction.py`: Validates ZIP extraction and dry-run execution in a clean isolated directory.
- **Documentation:**
  - `CANONICAL_SPLIT_AUDIT.md`: Dynamic reconciliation of canonical split memberships.
  - `QUARANTINE_MANIFEST_VERIFIED.json`: Machine-readable verified manifest audit.
  - `SAFETY_AUTHORIZATION_REPORT.md`: Medical authorization and simulation boundaries.
  - `REAL_E2E_TEST_RESULTS.md`: Complete test execution matrix and logs.
  - `REPRODUCIBILITY_PACKAGE_AUDIT.md`: Package audit and extraction test results.
  - `PATCH_CHANGELOG.md`: This document.
  - `reproduce_patch_v1.ps1`: Single-command master PowerShell reproduction script.
