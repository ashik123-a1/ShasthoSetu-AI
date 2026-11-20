# 22 — REMAINING EXTERNAL OR OWNER BLOCKERS

Documented list of unavoidable external dependencies and owner-controlled boundaries.

---

## 1. Owner-Controlled Approvals
1. **Remote GitHub Synchronization:** In accordance with the absolute owner control rule, all 12 code fixes and audit deliverables remain purely local. Remote push (`git push origin main`) awaits explicit owner instruction.
2. **External Cloud Deployment:** Live hosting deployment (cPanel, Railway, Render, Vercel) remains owner-controlled.
3. **Competition Submission:** Categories 1 and 2 remain strictly owner-managed.

---

## 2. External System Realities
1. **Live Fiat Banking:** Bank settlements are intentionally simulated test models; actual fiat disbursement requires commercial MFS merchant accounts and Bangladesh Bank regulatory approvals.
2. **TURN Server Infrastructure:** Two-device WebRTC across enterprise symmetric NAT firewalls requires external TURN credentials; local mesh signaling operates deterministically.
