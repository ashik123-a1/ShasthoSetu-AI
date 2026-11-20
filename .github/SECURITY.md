# ShasthoSetu AI — Security Policy & Audit Controls

## Implemented Security Controls (2026-11-20)

1. **Strict Explicit CORS Allowlist (`main.py`):** Wildcard `allow_origin_regex` removed; credentialed requests are restricted strictly to configured `SHASTHOSETU_CORS_ORIGINS`.
2. **Per-Session CSRF Protection (`core/dependencies.py`, `routers/auth.py`, `apps/web/src/lib/apiClient.ts`):** Every cookie-authenticated state-changing request (`POST`, `PUT`, `PATCH`, `DELETE`) requires a valid `X-CSRF-Token` header verified via constant-time `secrets.compare_digest`.
3. **Authenticated, Rate-Limited & Size-Bounded ML Endpoints (`routers/ai_inference.py`):** `/v1/ai/infer/*` endpoints require `get_current_user`, per-user rate limiting, and 64 KB chunked upload streaming capped at `10 MB` (`HTTP 413`).
4. **Persistent Multi-Worker Rate Limiting (`core/security.py`, `db/schema.sql`):** Scoped by `prefix + client_ip + sha256(identifier)` and persisted in SQLite (`rate_limit_buckets`) across restarts and workers.
5. **No URL Query Token Leakage (`core/dependencies.py`):** `?token=` query parameter support removed from `extract_raw_token`.
6. **Strict Doctor OCR Patient Binding (`routers/ai_ocr.py`):** Removed demo patient fallback on doctor prescription upload; explicit `patient_profile_id` with appointment consent is required (`HTTP 422`).
7. **Safe Model Deserialization (`services/ml_inference.py`, `services/rag_engine.py`):** PyTorch checkpoints use `torch.load(..., weights_only=True)` with project-root path validation; `pickle.load` removed from `rag_engine.py` in favor of safe JSON corpus reconstruction.
8. **Constant-Time Login & Anti-Enumeration (`core/security.py`, `routers/auth.py`):** Dummy Argon2id verification runs when an identifier is not found; registration conflicts return generic `409` messages inside `BEGIN IMMEDIATE` transactions.
9. **Production Demo Account Gate (`main.py`, `seeds/seed_demo.py`, `config.py`):** Synthetic demo seeding is disabled when `SHASTHOSETU_ENV=production`, and `SHASTHOSETU_SHOW_DEMO_CREDENTIALS` defaults to `false`.
10. **PII-Redacted Immutable Audit Logs (`core/audit.py`):** Emails, phone numbers, and personal identifiers are automatically masked and SHA-256 hashed before storage in `audit_logs`.
11. **Zero-PHI Support Transaction-Only (`TNX Only`) Isolation (`routers/support.py`):** Support Desk can inspect payment transaction references (`TXN-...`, `DEMO-RCP-...`), gateway codes, and BDT amounts via `/v1/support/transactions` while clinical item titles, medicine SKUs, lab panel names, and consultation notes are permanently excluded.
