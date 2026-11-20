# 04 — BACKEND & API INTEGRATION AUDIT

Comprehensive audit of FastAPI backend services, dependency injection, and request validation.

---

## 1. Endpoint Architecture & Security Middleware
- **Framework:** FastAPI with Uvicorn / Starlette ASGI engine.
- **Route Validation:** 100% of request payloads validated using Pydantic v2 schemas with strict typing, regex constraints, and length bounds.
- **Password Hashing:** Argon2id (`time_cost=2`, `memory_cost=65536`, `parallelism=2`) with constant-time verification (`verify_password_constant_time`) and dummy password hashing to prevent timing attacks.
- **Sliding-Window Rate Limiting:** Persistent SQLite sliding-window limiter (`rate_limit_buckets` table) with client IP resolution sanitizing `X-Forwarded-For` from untrusted proxies.

---

## 2. API Error Handling & Status Codes
- `HTTP 401 Unauthorized`: Returned when authentication token or session cookie is missing or invalid.
- `HTTP 403 Forbidden`: Returned for cross-patient IDOR attempts, unapproved doctor actions, support PHI access, or demo accounts in production.
- `HTTP 422 Unprocessable Content`: Returned for validation failures and specifically when attempting to activate an unverified OCR medication plan (`UNVERIFIED_OCR_FIELDS`).
- `HTTP 409 Conflict`: Returned for duplicate user registrations, concurrent appointment booking conflicts, or idempotency collisions.

---

## 3. Database Transaction Boundaries
- All state-changing operations enforce atomic SQLite transaction blocks using `BEGIN IMMEDIATE` to prevent race conditions during concurrent booking and payment simulation.
- Exception handling guarantees explicit `ROLLBACK` on database errors, preventing dangling locks or corrupted state in SQLite Write-Ahead Logging (WAL) mode.
