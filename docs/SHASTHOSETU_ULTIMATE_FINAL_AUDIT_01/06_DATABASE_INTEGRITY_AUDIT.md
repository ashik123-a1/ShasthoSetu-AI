# 06 — DATABASE INTEGRITY, RELIABILITY & TRANSACTIONS AUDIT

Audit of the SQLite schema, Write-Ahead Logging (WAL), and ACID transaction guarantees.

---

## 1. Schema & Concurrency Management
- **Engine:** SQLite 3 configured with `PRAGMA journal_mode=WAL;`, `PRAGMA synchronous=NORMAL;`, `PRAGMA busy_timeout=5000;`.
- **Concurrency:** Multi-reader concurrent execution with single-writer serialization managed via `BEGIN IMMEDIATE` transaction blocks.
- **Referential Integrity:** Foreign keys enforced across user memberships, appointments, prescriptions, and financial transactions.

---

## 2. Data Segregation & Synthetic Data Isolation
- Real system users and synthetic demo accounts are differentiated by the `is_synthetic` integer flag.
- Demo transactions (`platform_transactions`) and mock bank accounts (`bank_settlement_accounts`) operate in a segregated sandbox preventing synthetic operations from contaminating genuine audit trails.
- Database file paths are strictly bounded within local project storage (`services/api/shasthosetu.db`) with directory traversal protection.
