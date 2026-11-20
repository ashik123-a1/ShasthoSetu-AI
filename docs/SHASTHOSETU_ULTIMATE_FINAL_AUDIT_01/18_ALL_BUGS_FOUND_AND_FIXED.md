# 18 — ALL DISCOVERED ISSUES AND APPLIED FIXES

Comprehensive catalog of all 12 issues discovered, root-cause analyzed, and resolved locally.

---

### Finding 01: Misplaced GitHub Actions Workflow
- **Severity:** HIGH | **Component:** `.github/ci.yml`
- **Root Cause:** Workflow was placed in `.github/` root instead of `.github/workflows/`.
- **Fix:** Moved to `.github/workflows/ci.yml`. Verified active registration ID `425086746` and successful execution on GitHub Actions.

### Finding 02: Hardcoded Demo Auto-Login in CyberScanWorkbench
- **Severity:** HIGH | **Component:** `CyberScanWorkbench.tsx`
- **Root Cause:** Silent auto-login triggered for unauthenticated visitors.
- **Fix:** Removed credentials and silent login; added explicit authentication requirement guard and user warning.

### Finding 03: Missing OCR Automated Regression Suite
- **Severity:** MEDIUM | **Component:** `services/api/tests/test_ocr_regression.py`
- **Root Cause:** New spatial row clustering and table extraction lacked automated regression tests.
- **Fix:** Created 9 automated regression test cases verifying spatial grouping, header filtering, and verification gates.

### Finding 04: Bengali Unicode Regex Word Boundary Mismatch
- **Severity:** MEDIUM | **Component:** `ml_inference.py` & `ocr_service.py`
- **Root Cause:** ASCII word boundary `\b` failed to match Bengali combining vowel marks.
- **Fix:** Replaced `\b` with `(?:\b|\s|$)` in `_STRENGTH_RE` and `_HEADER_RE`.

### Finding 05: Missing Curated Sample File on Clean CI Runner
- **Severity:** LOW | **Component:** `ml_inference.py`
- **Root Cause:** Sample prescription images are gitignored, throwing FileNotFoundError on CI runners.
- **Fix:** Added synthetic in-memory PIL image fallback in `get_curated_sample_image()`.

### Finding 06: Particle Preloader Overlay Blocking Headless Vitest
- **Severity:** MEDIUM | **Component:** `setup.ts` & `designSystem.test.tsx`
- **Root Cause:** Unmocked `sessionStorage` in jsdom left intro preloader active, blocking DOM interactions.
- **Fix:** Mocked `sessionStorage` setting `ss-preloader-seen-v1 = '1'` and added `cleanup()` in test 7.

### Finding 07: Frozen Settings Dataclass in Pytest Fixture
- **Severity:** LOW | **Component:** `conftest.py`
- **Root Cause:** `Settings` is a frozen dataclass; direct property assignment threw FrozenInstanceError.
- **Fix:** Injected development environment using `dataclasses.replace(config.settings, env='development')`.

### Finding 08: Missing difflib Import in ml_inference.py
- **Severity:** HIGH | **Component:** `ml_inference.py`
- **Root Cause:** `_clean_brand_name` used `difflib.SequenceMatcher` without top-level import.
- **Fix:** Added `import difflib` at the top of `ml_inference.py`.

### Finding 09: Brand All-Caps Casing & Strength Token Contamination
- **Severity:** MEDIUM | **Component:** `ml_inference.py`
- **Root Cause:** Brand dictionary returned uppercase strings and multi-column parsing didn't separate strength tokens.
- **Fix:** Normalized brand output to Title Case and segregated `strength_tokens` during line tokenization.

### Finding 10: Dynamic Production Environment Check in Login Gate
- **Severity:** HIGH | **Component:** `auth.py`
- **Root Cause:** `auth.py` evaluated `settings.env` at module import time, bypassing dynamic test isolation.
- **Fix:** Evaluated `os.getenv('SHASTHOSETU_ENV', settings.env).lower()` dynamically in `auth.py`.

### Finding 11: Missing CSRF Header in Eval Test Clients
- **Severity:** LOW | **Component:** `test_ocr_authorization_gate.py`
- **Root Cause:** Test client did not forward the session CSRF token on POST requests.
- **Fix:** Updated test client setup to automatically attach `x-csrf-token` header from login response.

### Finding 12: Unauthenticated AI Inference Expectation in CPanel Test
- **Severity:** LOW | **Component:** `scripts/test_cpanel_startup.py`
- **Root Cause:** Script expected 200 on unauthenticated inference request after security hardening.
- **Fix:** Updated script to assert 401 on unauthenticated attempt and verify 200 OFFLINE handling after login.
