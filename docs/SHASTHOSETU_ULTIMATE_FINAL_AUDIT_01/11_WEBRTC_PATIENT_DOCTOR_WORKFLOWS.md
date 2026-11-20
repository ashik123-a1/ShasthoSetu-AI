# 11 — WEBRTC TELEMEDICINE & CLINICIAN WORKFLOWS AUDIT

Audit of the real-time video consultation engine, durable SQLite WAL signaling, and e-prescriptions.

---

## 1. Durable WebRTC Signaling Architecture
- **Problem Solved:** Traditional in-memory WebRTC signaling crashes or drops active calls when multiple backend workers run or when workers restart.
- **Implementation:** Durable signaling backed by SQLite WAL database tables:
  - `consultation_rooms`: Room creation, appointment linkage, and clinical intake data.
  - `consultation_peers`: Participant tracking, roles (PATIENT/DOCTOR), and last-seen timestamps.
  - `consultation_signals`: Ordered queue of SDP offers, answers, and ICE candidates with replay protection.
  - `consultation_messages`: In-call text chat messages stored with ISO UTC timestamps.

---

## 2. Clinician Consultation Desk & e-Prescriptions
- **Intake Review:** Doctor can review patient pre-call symptoms and medical history prior to admitting to call.
- **Prescription Authoring:** In-call interactive e-prescription editor supporting dosage, frequency, and instructions.
- **Post-Call Finalization:** Emits immutable audit event `CONSULTATION_COMPLETED` and updates appointment status to `COMPLETED`.
