# 23 — LOCAL CHANGES AWAITING OWNER GITHUB APPROVAL

Inventory of all local file modifications awaiting owner review and publish authorization.

---

## 1. Modified Files Ready for Remote Push
1. `services/api/src/shasthosetu_api/services/ml_inference.py`: Added difflib import, title casing, strength token segregation, and in-memory sample fallback.
2. `services/api/src/shasthosetu_api/services/ocr_service.py`: Integrated brand cleaning and enhanced EasyOCR parameters.
3. `services/api/src/shasthosetu_api/routers/auth.py`: Dynamic production mode check enforcing `PRODUCTION_SECURITY_GATE`.
4. `services/api/tests/conftest.py`: Enforced development environment fixture unfreezing Settings.
5. `apps/web/src/components/ai/CyberScanWorkbench.tsx`: Removed hardcoded demo login credentials and automated silent authentication.
6. `apps/web/src/test/setup.ts`: Mocked `sessionStorage` preloader bypass for headless testing.
7. `apps/web/src/test/designSystem.test.tsx`: Added unauthenticated workbench assertion and DOM cleanup.
8. `docs/BUSINESS_MODEL.md`: Added simulation sandbox disclosure banner and clinician wallet mechanics.
9. `services/api/evals/test_ocr_authorization_gate.py`: Added CSRF header attachment to test client.
10. `services/api/evals/test_demo_isolation_security.py`: Added CSRF header attachment to test client.
11. `scripts/test_cpanel_startup.py`: Added unauthenticated 401 gate verification and authenticated offline handling.
12. `.github/workflows/ci.yml`: Created active GitHub Actions workflow file.

---

## 2. Owner Review Instructions
To publish these verified local improvements to GitHub when approved:
```powershell
# Review commit log and diffs locally
cd "F:\Clude cccccccccccccccccccccccc\data we test"
git status
git log -3 --stat

# Optional: When owner explicitly authorizes push
# gh auth switch --user ASHIK311
# git push origin main
# gh auth switch --user ashik123-a1
```

**Declaration:** **NO REMOTE UPDATE HAS BEEN PERFORMED. AWAITING EXPLICIT OWNER APPROVAL.**
