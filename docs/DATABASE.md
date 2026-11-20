# ShasthoSetu AI — Database Architecture (`55 SQLite Tables · WAL Mode`)

ShasthoSetu AI uses an **offline-first local SQLite engine** designed for atomic clinical scheduling, strict RBAC isolation, and zero-dependency portability (`services/api/src/shasthosetu_api/db/schema.sql`).

---

## 1. Engine Guarantees (`sqlite.py`)

Every SQLite connection configures four mandatory safety pragmas:
```sql
PRAGMA journal_mode = WAL;     -- Concurrent readers + fast crash-safe writes
PRAGMA synchronous = NORMAL;   -- Balanced durability & SSD throughput
PRAGMA foreign_keys = ON;      -- Strict referential integrity across all 55 tables
PRAGMA busy_timeout = 5000;    -- Prevents lock contention errors under concurrency
```

**Atomic Booking Lock (`begin_immediate`):** Appointment slot claims and payment state transitions wrap inside explicit `BEGIN IMMEDIATE` transactions, preventing double-booking race conditions (`HTTP 409 Conflict`).

---

## 2. Complete Table Inventory (54 Schema Tables + 1 Runtime Security Table = 55)

| Functional Domain | Table Count | Tables (`schema.sql` & `agents_and_automation.py`) |
| :--- | :---: | :--- |
| **Auth, RBAC & Profiles** | `7` | `users`, `sessions`, `role_memberships`, `patient_profiles`, `profile_access`, `doctor_profiles`, `doctor_verification_events` |
| **Scheduling, Consultations & e-Rx** | `8` | `specialties`, `doctor_availability_rules`, `doctor_time_off`, `appointment_slots`, `appointments`, `appointment_events`, `consultation_notes`, `eprescriptions` |
| **Simulated Billing & Support Desk** | `6` | `demo_payments`, `demo_payment_events`, `demo_receipts`, `support_tickets`, `support_messages`, `ticket_events` |
| **Safe-OCR, Medication & Longitudinal Care** | `8` | `medical_documents`, `ocr_jobs`, `ocr_fields`, `ocr_job_artifacts`, `medication_plans`, `medication_events`, `pcos_cycle_entries`, `pediatric_intake_cases`, `pediatric_vaccine_records` *(9 total)* |
| **Healthcare Directory & Governance** | `8` | `facilities`, `diagnostic_tests`, `diagnostic_demo_orders`, `healthcare_plans`, `notifications`, `feature_flags`, `audit_logs`, `ai_inference_drafts` |
| **8-Division Emergency Blood Connect** | `3` | `blood_donors`, `blood_requests`, `blood_match_logs` |
| **Health Journal & RAG Knowledge Base** | `6` | `journal_items`, `journal_sync_runs`, `rag_sources`, `rag_source_versions`, `rag_chunks`, `rag_ingestion_jobs` |
| **Voice ASR, Chat & Automation Replay Guard** | `7` | `ai_voice_consents`, `ai_asr_jobs`, `ai_chat_sessions`, `ai_chat_messages`, `ai_message_citations`, `ai_feedback`, `ai_runtime_snapshots`, `webhook_replay_nonces` *(8 total — last created in `agents_and_automation.py`)* |

---

## 3. Seeding, Reset & Alembic Migrations

- **Auto-Seeding on Launch:** Running `.\start.bat` or `.\start_shasthosetu.ps1` automatically initializes `services/api/data/shasthosetu.db` if absent.
- **Manual Seed / Clean Reset:**
  ```powershell
  $env:PYTHONPATH = "services/api/src;."
  python -m shasthosetu_api.seeds.seed_demo
  # Or with Windows launcher reset flag:
  .\start_shasthosetu.ps1 -ResetDemoDb
  ```
- **Schema Migrations:** Managed under [`services/api/migrations/`](../services/api/migrations) and `alembic.ini`.
