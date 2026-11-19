# 🗄️ ShasthoSetu AI — SQLite Transactional Database Architecture

**Document Reference:** `docs/UI_REFERENCE_RESEARCH/SQLITE_DATABASE_ARCHITECTURE.md`  
**DDL Companion File:** `docs/UI_REFERENCE_RESEARCH/INITIAL_SQLITE_SCHEMA.sql`  
**Task ID:** `UI-00`  
**Target Stack:** Python FastAPI + SQLAlchemy 2.0 + Alembic + SQLite 3 (WAL Mode)  
**Architectural Lineage:** Synthesized from `agrisense-fusion/server/storage/db.js` (WAL pragmas), `Finova-Finpilot/001_initial_schema.sql` (`BIGINT` minor units & RBAC), and `Land-Guard/001_initial_schema.sql` (audit events & portal sessions).

---

## 1. Engine Configuration & Reliability Invariants

To prevent silent data corruption, foreign-key orphans, or `SQLITE_BUSY` locking errors under concurrent FastAPI requests, every SQLAlchemy SQLite connection executes an explicit `connect` listener running these pragmas:

```sql
PRAGMA journal_mode = WAL;          -- Concurrent readers + serialized non-blocking writer
PRAGMA synchronous = NORMAL;        -- Safe durability without full fsync bottleneck on WAL
PRAGMA foreign_keys = ON;           -- Strict relational referential integrity (disabled by default in SQLite!)
PRAGMA busy_timeout = 5000;         -- Wait up to 5s before raising OperationalError under lock contention
PRAGMA temp_store = MEMORY;
```

### Physical Security Boundary
- The SQLite file (e.g., `services/api/data/shasthosetu.db`) MUST reside outside any publicly mounted static directory (never inside `apps/web/public` or `/static`).
- No direct client connection to `.db` is allowed; all reads/writes pass through authenticated FastAPI endpoints obeying server-side RBAC scoping.

---

## 2. Core Data Governance & Modeling Contracts

### 2.1 Zero-Float Currency (`Finova` Pattern)
All monetary values (e.g. demo doctor consultation fee `৳500`) are stored as signed `INTEGER` minor units (`amount_minor_poisha`, where `500.00 BDT = 50000`), eliminating IEEE-754 floating-point drift. Currency code is fixed/validated (`BDT`), and every simulated payment transaction enforces a unique `DEMO-*` reference generated exclusively server-side.

### 2.2 Optimistic Concurrency & Version Control
Mutable clinical and transactional records (`appointments`, `appointment_slots`, `consultation_notes`, `medication_plans`) carry an integer `version` column (`DEFAULT 1`). Updates verify `WHERE id = :id AND version = :expected_version` and increment `version + 1`, returning HTTP **`409 Conflict`** on stale client retries.

### 2.3 Atomic Concurrent Slot Reservation (`FR-AP-103`, `V2-T-007`)
To guarantee that two simultaneous patients clicking the exact same single-capacity slot yield **one success and one clean HTTP `409 Conflict`**, slot booking wraps inside `BEGIN IMMEDIATE` (acquiring an immediate SQLite write lock before reading availability):

```sql
BEGIN IMMEDIATE;
-- 1. Atomically reserve capacity ONLY if slot is OPEN and has room
UPDATE appointment_slots
   SET reserved_count = reserved_count + 1,
       state = CASE WHEN reserved_count + 1 >= capacity THEN 'BOOKED' ELSE 'OPEN' END,
       version = version + 1,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
 WHERE id = :slot_id
   AND doctor_id = :doctor_id
   AND state IN ('OPEN', 'AVAILABLE')
   AND reserved_count < capacity;
-- Check SQLite changes() == 1; if 0 -> ROLLBACK & return HTTP 409 SLOT_UNAVAILABLE!
-- 2. Insert appointment (with idempotency_key UNIQUE guard) + append-only appointment_events row
COMMIT;
```

### 2.4 Demo Payment Ledger Atomicity (`FR-PAY-104..109`, `V2-T-008..012`)
- Checkout creation accepts an explicit `idempotency_key` (`UNIQUE` index in `demo_payments`) so browser refresh or network retry returns the existing checkout rather than creating a second transaction.
- **No Real Payment Secrets:** Schema explicitly contains ZERO columns for credit card PAN, CVV, PIN, OTP, or bank credentials.
- Booking state transitions from `AWAITING_DEMO_PAYMENT` -> `CONFIRMED` ONLY inside the backend transaction handler that records `demo_payments.status = 'DEMO_PAID'`.

### 2.5 Mandatory Prescription Verification Barrier (`FR-OCR-03`, `V2-T-031`)
- `ocr_fields` tracks `raw_text`, `normalized_value`, `confidence`, `bbox_json`, `is_critical_field`, and `is_verified`.
- Backend medication service prohibits inserting an `ACTIVE` row into `medication_plans` linked to an OCR job (`source_ocr_job_id`) unless every critical medicine field (`name`, `dose`/`strength`, `frequency`) has `is_verified = 1` signed by an authorized user or doctor (`HTTP 422 UNVERIFIED_CRITICAL_FIELDS` otherwise).

### 2.6 Strict Role & PHI Access Isolation (`FR-SEC-201..203`, `FR-AUTH-109`)
- **Patient:** SQL `WHERE patient_profile_id IN (SELECT authorized_profiles_for_user(:user_id))`.
- **Doctor:** SQL `WHERE doctor_id = :current_doctor_id` (for queues/appointments); patient document history visible ONLY if an unexpired `profile_access` or encounter consent grant exists.
- **Support:** Queries ONLY `support_tickets`, `support_messages`, limited `appointments` status/time, and `demo_payments.status`/`demo_ref`. Repository layer enforces column projection excluding `medical_documents`, `consultation_notes`, and `pcos_*`/`pediatric_*` clinical tables (`V2-T-021`).
- **Admin:** Operational control (`users`, `doctor_profiles`, `doctor_verification_events`, `audit_logs`, `demo_payments`) WITHOUT default plaintext read access to `consultation_notes` (`V2-T-029`).

### 2.7 Timezone Contract
All `*_utc` timestamps persist in ISO-8601 UTC (`YYYY-MM-DDTHH:MM:SS.fffZ`), while doctor availability rules store `timezone TEXT DEFAULT 'Asia/Dhaka'` and local wall-clock slots (`09:00–17:00`) for unambiguous materialization.

---

## 3. Entity-Relationship Overview (30 Normalized Tables)

| Domain Group | Normalized Tables | Primary Constraints & Relationships |
| :--- | :--- | :--- |
| **1. Identity & RBAC (3)** | `users`, `sessions`, `role_memberships` | `users.email`/`phone` unique (`CHECK` requires >=1); role CHECK enforced on `users.primary_role` and `role_memberships.role` (`PATIENT`/`DOCTOR`/`ADMIN`/`SUPPORT` etc.); `sessions.revoked_at_utc` supports immediate logout. |
| **2. Profiles & Consents (4)** | `patient_profiles`, `profile_access`, `doctor_profiles`, `doctor_verification_events` | Dependent/caregiver grants with `expires_at_utc` & `revoked_at_utc`; Doctor approval state `CHECK IN ('PENDING','APPROVED','REJECTED','SUSPENDED')`. |
| **3. Scheduling & Bookings (6)** | `doctor_availability_rules`, `doctor_time_off`, `appointment_slots`, `appointments`, `appointment_events`, `consultation_notes` | Unique non-overlapping slot constraint `(doctor_id, start_utc)`; atomic capacity lock; immutable `appointment_events` & draft/signed `consultation_notes`. |
| **4. Demo Finance (3)** | `demo_payments`, `demo_payment_events`, `demo_receipts` | `amount_minor_poisha INTEGER`; unique `demo_ref` (`DEMO-...`); unique `idempotency_key`; mandatory `is_simulated = 1`. |
| **5. Helpdesk Support (3)** | `support_tickets`, `support_messages`, `ticket_events` | `visibility IN ('PUBLIC','INTERNAL')` separates staff notes from requester view; category includes `SAFETY_ESCALATION`. |
| **6. Care, OCR & Clinical Records (8)** | `medical_documents`, `ocr_jobs`, `ocr_fields`, `medication_plans`, `medication_events`, `pcos_cycle_entries`, `pediatric_intake_cases`, `facilities` | OCR verification gate (`ocr_fields.is_verified`); idempotent medication events (`UNIQUE(plan_id, due_utc)`); clinical rule intake preservation; synthetic fixture marker `is_synthetic`. |
| **7. Ops & Governance (3)** | `notifications`, `feature_flags`, `audit_logs` | Delivery vs read state separated; AI feature flags default fail-closed (`0`); append-only `audit_logs` (API exposes `SELECT` & `INSERT` only, zero `DELETE`/`UPDATE`). |

---

## 4. When PostgreSQL Migration Becomes Required (`Scaling Triggers`)

SQLite WAL handles hackathon demos, multi-role testing, and small regional clinics (thousands of writes/hour) effortlessly on one VM. Migrate via Alembic to **PostgreSQL 16 + `pgvector`** when any of these triggers occur:
1. **Multi-Instance Horizontal API Scaling:** Deploying $>1$ stateless FastAPI container behind a load balancer where local disk `.db` sharing isn't supported.
2. **Write Contention Threshold:** Sustained concurrent booking/telemetry writes exceeding `~100+ writes/sec` causing `SQLITE_BUSY` tail latency spikes.
3. **Production Vector RAG (`Phase G+`):** Corpus scales past `50,000+` medical chunks requiring HNSW `pgvector` indexes alongside transactional clinical data (for smaller hackathon corpora, local Chroma/FAISS or serialized SQLite/NumPy indexes work cleanly alongside SQLite).
4. **Native Row-Level Encryption / KMS Audit Compliance:** Clinic network pilot requiring PostgreSQL pgcrypto, tablespace encryption, and managed automated PITR snapshots.
