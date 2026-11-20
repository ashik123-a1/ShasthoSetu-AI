# 12 — SIMULATED PAYMENTS, FINANCIAL DASHBOARDS & SUPPORT AUDIT

Audit of the financial simulation engine, commission splits, and customer support portal.

---

## 1. Simulated Payment Mechanics & Integer Arithmetic
- **Currency Storage:** Integer poisha (৳ 1.00 = 100 poisha) to prevent floating-point rounding errors.
- **Dynamic Platform Commission Splits:**
  - **Doctor Consultation:** 15% Platform Commission / 85% Net Clinician Payout.
  - **Diagnostic Lab Test:** 18% Platform Commission / 82% Diagnostic Partner Net.
  - **ePharma Medication:** 12% Platform Commission / 88% Pharmacy Partner Net.
- **Verification Equality:** `Gross Amount = Commission Cut + Partner Net Payout` enforced across all transactions.

---

## 2. Five Bank Settlement Account Models
1. `DEMO-PAY-MFS-01`: Demo Payment MFS Escrow Model (`01711-••••88`).
2. `DEMO-PAY-DIR-02`: Demo Payment Direct Gateway Model (`01819-••••42`).
3. `SSLCOMMERZ-CARD-03`: SSLCommerz Card Clearing Model (`MID-SS-994021`).
4. `CITYBANK-CORP-04`: City Bank PLC Corporate Treasury Model (`1102-••••-0091`).
5. `BRACBANK-SETTLE-05`: BRAC Bank Partner Payout Model (`1509-••••-3310`).
- **Disclosure:** Explicitly documented in `docs/BUSINESS_MODEL.md` as synthetic simulation entities.

---

## 3. Doctor Wallet & Support Zero-PHI
- Doctors can view real-time available balance and submit audited BEFTN payout reconciliation requests.
- Support portal enforces strict Zero-PHI barriers; attempting to read patient clinical records returns `HTTP 403 PHI_ACCESS_DENIED`.
