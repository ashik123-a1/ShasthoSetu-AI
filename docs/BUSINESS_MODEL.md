# ShasthoSetu AI — Business Model, Commission Architecture & Financial Treasury Engine

> **Document Version:** `1.1.0-RELEASE`  
> **Classification:** Platform Business Architecture & Simulation Governance  
> **Target Audience:** Evaluators, Academic Judges, System Architects & Health Informatics Researchers  
> **Live Website:** [https://shasthosetu.fit/](https://shasthosetu.fit/)  
> **Source Repository:** [https://github.com/ashik123-a1/ShasthoSetu-AI](https://github.com/ashik123-a1/ShasthoSetu-AI)

---

> [!IMPORTANT]
> ### ⚠️ Mandatory Disclosure: Prototype Simulation & Demonstration Sandbox
> **ShasthoSetu AI is an open-source clinical informatics research, tele-health engineering, and telemedicine platform developed for academic competition and peer evaluation.**
> 
> 1. **Synthetic Demonstration Sandbox:** All banking accounts, mobile financial service (MFS) escrow balances, masked account numbers (`1402-••••-9901`, `1509-••••-3310`), and real-time transaction alerts demonstrated within the platform are **software simulation models and demonstration sandboxes**.
> 2. **No Real Banking Settlement or Actual Revenue:** The seeded transactions, 6-month historical ledger entries, and payment flows do **NOT** represent actual commercial bank deposits, real currency movements, legal corporate escrow agreements, or live financial revenue.
> 3. **Architectural & Algorithmic Purpose:** The financial module demonstrates the **mathematical mechanics, double-entry software architecture, ACID concurrency (`BEGIN IMMEDIATE`), programmatic commission deductions (12%–20%), and Zero-PHI data segregation** required for an enterprise-grade digital health ecosystem in Bangladesh.
> 4. **Safe Evaluator Testing:** Evaluators and judges can trigger simulated transactions via the Admin Portal or test patient checkouts without transferring real fiat currency. All receipts, payment references (`TXN-...`, `DEMO-RCP-...`), and ledger records operate in a controlled demo environment.

---

## 1. Executive Summary & Market Positioning

**ShasthoSetu AI (স্বাস্থ্যসেতু এআই)** is engineered as a sustainable, multi-sided digital health platform designed to democratize high-quality clinical care across Bangladesh’s 170 million citizens. While providing offline-first Edge AI diagnostics and free bilingual triage to patients in remote and underserved upazilas, the prototype platform architecture models a **high-margin, transparent revenue engine** across four established healthcare verticals:

1. **Diagnostic Laboratory Test Referrals & Home Sample Collection** (18% Platform Commission Model)
2. **BMDC-Registered Doctor Tele-Consultations** (15% Platform Commission Model)
3. **ePharma Prescription Dispensing & Medical Supplies** (12% Platform Commission Model)
4. **Family Care Plus Comprehensive Health Subscriptions** (20% Platform Commission Model)

All simulated inflows, gateway escrow holdings, partner disbursements, and commission splits are modeled programmatically through an **audited, Zero-PHI banking and settlement ledger** monitored live within the Admin Portal.

```
+----------------------------------------------------------------------------------------------------+
|                       SHASTHOSETU PLATFORM TREASURY (SIMULATED ARCHITECTURE)                       |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|   +-----------------------+     +-----------------------+     +--------------------------------+   |
|   | Patient Telemedicine  |     | Diagnostic Lab Orders |     | ePharma & Medical Supplies     |   |
|   | (BMDC Consultations)  |     | (Home Sample Collect) |     | (Prescription Fulfillment)     |   |
|   +-----------+-----------+     +-----------+-----------+     +---------------+----------------+   |
|               |                             |                                 |                    |
|               v                             v                                 v                    |
|       [Gross Fee: 100%]             [Gross Fee: 100%]                 [Gross Order: 100%]          |
|               |                             |                                 |                    |
|       +-------+-------+             +-------+-------+                 +-------+-------+            |
|       |               |             |               |                 |               |            |
|       v               v             v               v                 v               v            |
|    [85.0%]         [15.0%]       [82.0%]         [18.0%]           [88.0%]         [12.0%]         |
|   Clinician       Platform      Accredited      Platform          Licensed        Platform         |
|     Share        Commission        Lab         Commission          Vendor        Commission        |
|                       |                             |                                 |            |
|                       +-----------------------------+---------------------------------+            |
|                                                     |                                              |
|                                                     v                                              |
|                               +-------------------------------------------+                        |
|                               |   CITY BANK PLC CORPORATE TREASURY MODEL  |                        |
|                               |   (Simulated Net Platform Comm & Reserve) |                        |
|                               +---------------------+---------------------+                        |
|                                                     |                                              |
|                                                     v                                              |
|                               +-------------------------------------------+                        |
|                               |     LIVE ADMIN TRANSACTION NOTIFICATIONS  |                        |
|                               |  (Real-Time Alert Banner, Audio & Ledger) |                        |
|                               +-------------------------------------------+                        |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. The 4 Revenue Verticals & Commission Structure

The platform implements programmatic commission deduction enforced at the transaction layer (`platform_transactions` table in SQLite with `BEGIN IMMEDIATE` ACID concurrency):

| Revenue Vertical | Description & Scope | Typical Ticket Size (BDT) | Platform Commission (%) | Partner Net Payout (%) | Primary Partner Entities (Modeled) |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Diagnostic Lab Tests** | Ultrasound, Hormone Panels, Dengue NS1, CBC, Lipid Profiles, and Home Phlebotomy | ৳ 1,200 – ৳ 3,500 | **18.0%** | **82.0%** | Popular Diagnostic Centre, Ibn Sina Diagnostic Lab, icddr,b Reference Labs |
| **Doctor Consultations** | Live WebRTC HD Audio/Video consultations with BMDC verified clinicians | ৳ 600 – ৳ 1,500 | **15.0%** | **85.0%** | BMDC-registered Specialists (Gynecologists, Pediatricians, Dermatologists, GPs) |
| **ePharma Orders** | DGDA-compliant prescription medicines, chronic disease bundles & diabetic strips | ৳ 800 – ৳ 4,000 | **12.0%** | **88.0%** | Square Pharmaceuticals, Beximco Pharma, MedTech BD, CareDiag |
| **Family Care Plans** | Monthly health subscription covering 4 family profiles with priority queue | ৳ 1,200 / month | **20.0%** | **80.0%** | ShasthoSetu Care Network Pool & 24/7 Triage Medical Officer Pool |

### Mathematical Formulation of Split

For any transaction $i$ with gross amount $G_i$ (in Poisha) and service category rate $r_i \in [0.12, 0.20]$:

$$\text{Commission}_i = \left\lfloor G_i \times r_i \right\rfloor$$

$$\text{Net Partner Payout}_i = G_i - \text{Commission}_i$$

*Example (Simulated Diagnostic Lab Test):*
- Gross Amount ($G_i$): ৳ 1,800.00 (180,000 Poisha) for an Endocrine Hormone Panel
- Platform Commission Rate ($r_i$): $18.0\%$
- **Platform Commission Retained:** ৳ 324.00 (32,400 Poisha)
- **Net Partner Lab Share Credited:** ৳ 1,476.00 (147,600 Poisha)

---

## 3. 5-Tier Banking & Gateway Escrow Architecture (Software Simulation Model)

To demonstrate enterprise financial hygiene, the platform models strict segregation between customer funds, partner payouts, and operational treasury across five dedicated bank and mobile financial service (MFS) entities:

```
[Simulated Patient Inflow]
       │
       ├──► Demo Payment MFS Escrow (01711-••••88) ───► MFS Gateway Holding Model
       ├──► Demo Payment Direct Wallet (01819-••••42) ──► Rural MFS Escrow Model
       └──► SSLCommerz Multi-Card (MID-SS-994021) ──► Visa / Mastercard Clearing Model
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
    [Platform Commission %]         [Partner Net Share %]
               │                               │
               ▼                               ▼
    City Bank PLC Treasury Model    BRAC Bank PLC Payout Model
    (A/C 1402-••••-9901)             (A/C 1509-••••-3310)
    Simulated Corporate Net Inflow  Simulated EFT / BEFTN Payouts to
                                    Doctors, Labs & Pharmacies
```

### Monitored Accounts Inventory (`bank_settlement_accounts` Table)

*Note: The following accounts are mock ledger entities within the platform database used to demonstrate multi-account balancing and automated settlement algorithms:*

1. **Demo Payment MFS Escrow Model (`DEMO-PAY-MFS-01`)**  
   - Type: `MFS_GATEWAY` | Status: `ACTIVE_ONLINE`  
   - Purpose: Direct instant checkout for patient appointments and urgent emergency tele-triage simulations.
2. **Demo Payment Direct Gateway Model (`DEMO-PAY-DIR-02`)**  
   - Type: `MFS_GATEWAY` | Status: `ACTIVE_ONLINE`  
   - Purpose: Low-fee mobile cash-in/checkout simulation catering to rural patients and upazila health complexes.
3. **SSLCommerz Card Clearing Model (`SSLCOMMERZ-CARD-03`)**  
   - Type: `CARD_CLEARING` | Status: `SETTLEMENT_READY`  
   - Purpose: Automated 3D-Secure card clearing simulation for Visa, Mastercard, and UnionPay diagnostic bookings.
4. **City Bank PLC Corporate Treasury Model (`CITYBANK-CORP-04`)**  
   - Type: `CORPORATE_BANK` | Status: `AUDITED`  
   - Purpose: Central treasury repository holding accumulated platform commission and reserve funds in the software ledger.
5. **BRAC Bank PLC Partner Payout Model (`BRACBANK-SETTLE-05`)**  
   - Type: `PAYOUT_TREASURY` | Status: `ACTIVE_ONLINE`  
   - Purpose: Disburses weekly/monthly automated electronic payouts (BEFTN/NPSB simulation) to doctors, diagnostic centers, and pharma distributors.

---

## 4. Live Admin Monitoring & Real-Time Transaction Alerts

To demonstrate financial observability, fraud detection, and transaction streaming, the **Admin Portal** features an enterprise-grade financial management center:

### A. Dedicated Transactions Tab (`/admin/transactions`)
- **Real-Time Feed:** Displays every inbound transaction across all four verticals with transaction references (`TXN-YYYYMM-XXX-XXXX`), masked payer details, beneficiary partner name, gateway method, gross amount, commission %, and status.
- **Filtering & Audit:** Filter by business vertical (`DIAGNOSTIC_TEST`, `DOCTOR_CONSULTATION`, `EPHARMA_SALE`, `HEALTH_PLAN`), status (`PAID`, `SETTLED`, `REFUNDED`), or billing month.
- **Bank Reconciliation:** One-click audit and settlement button (`Reconcile & Settle`) that reconciles pending gateway receivables into audited partner payouts within the SQLite database.

### B. Instant Transaction Notice Banner & Audio-Visual Alerts
When any transaction is recorded anywhere in the platform (or triggered via the live simulator):
1. **Database Event:** The API inserts a formal notification record into the `notifications` table (`topic = 'FINANCE_TRANSACTION'`) addressed to System Registrars.
2. **Real-Time Polling:** The Admin Portal client polls every 4 seconds. When a new transaction reference is detected:
   - A **pulsing, high-visibility green/cyan notice banner** immediately drops down at the top of the portal.
   - Shows transaction reference, gross inflow, platform commission %, and beneficiary partner share.
   - Triggers an instant toast notification: `🔔 Live Transaction Received: TXN-... (৳ 1,800.00 • Comm: +18%)`.
3. **Audit Trail:** An immutable event is logged in `audit_logs` with the executing actor, timestamps, and poisha amounts.

### C. Interactive Live Transaction Simulator
Evaluators and teachers can test the financial mechanics live in the Admin Portal with one click:
- **🔬 Lab Test (+18% Comm):** Simulates a ৳ 1,800 hormone panel booking with Popular Diagnostic Centre.
- **🩺 Doctor Call (+15% Comm):** Simulates an ৳ 800 telemedicine consultation with Dr. Farhana Rahman.
- **💊 ePharma (+12% Comm):** Simulates a ৳ 1,250 medicine order with Square & Beximco hub.
- **🛡️ Health Plan (+20% Comm):** Simulates a ৳ 1,200 monthly Family Care Plus renewal.

---

## 5. Zero-PHI Financial Compliance & Regulatory Architecture

ShasthoSetu AI strictly separates **financial and transactional records** from **confidential patient health information (PHI)** in accordance with DGHS Bangladesh, WHO Digital Health guidelines, and international HIPAA standards:

1. **Strict Table Decoupling:** `platform_transactions` stores only transaction metadata, billing month, masked payer labels (`রহিমা বেগম (pa***@shasthosetu.local)`), and beneficiary entities. It contains **zero** clinical notes, ICD-10 codes, or prescription text.
2. **Support & Admin Boundary (HTTP 403 Proof):** While Admins have full authority over treasury accounts, commission rates, and refund approvals, any attempt by an Admin or Support Desk user to view raw doctor clinical notes is cryptographically blocked with an explicit **`HTTP 403 Forbidden`** response.
3. **NBR & Bangladesh Bank Regulatory Readiness (Architectural Design):**
   - The data model incorporates fields for 15% VAT / tax withholding provisions at source.
   - Transaction validation rules model Bangladesh Bank single-day transaction velocity limits to demonstrate compliance readiness.

---

## 6. Synthetic Seeded 6-Month Demonstration Ledger (June 2026 – November 2026)

To enable thorough testing of reporting, filtering, and aggregation queries without exposing real human records, the platform database is seeded with a **synthetic 6-month historical demonstration ledger**:

```
Month         Transactions    Gross GMV (BDT)    Platform Comm (BDT)    Partner Payouts (BDT)
---------------------------------------------------------------------------------------------
Jun 2026          8           ৳ 10,700.00         ৳ 1,675.00              ৳ 9,025.00
Jul 2026          8           ৳ 11,984.00         ৳ 1,876.00              ৳ 10,108.00
Aug 2026          8           ৳ 13,268.00         ৳ 2,077.00              ৳ 11,191.00
Sep 2026          8           ৳ 14,445.00         ৳ 2,261.25              ৳ 12,183.75
Oct 2026          8           ৳ 15,836.00         ৳ 2,479.00              ৳ 13,357.00
Nov 2026 (Live)   8+          ৳ 17,655.00         ৳ 2,763.75              ৳ 14,891.25
---------------------------------------------------------------------------------------------
TOTAL (6 Months) 48+          ৳ 83,888.00         ৳ 13,132.00             ৳ 70,756.00
```

> **Evaluation Note:** The 48+ records above are synthetic test fixtures populated by `seed_demo.py` to demonstrate SQLite WAL aggregation performance across 55 tables, audit log immutability, and UI table pagination. They do **not** represent commercial fiat revenue.

### Target Unit Economic Metrics (Architectural Projection Model)
- **Target Platform Commission:** **`15.65%`** (weighted average across modeled verticals)
- **Projected Gross Margin:** **`86.4%`** on platform commission after cloud inference & gateway fees
- **Customer Acquisition Cost (CAC) Thesis:** Ultra-low due to free offline Edge AI triage and community health-ID sharing
- **Lifetime Value (LTV) Multiplier:** **`4.8×`** driven by recurring Family Health Plans and chronic disease tracking (PCOS, diabetes, child vaccine reminders).

---

## 7. How Evaluators Can Verify the Business Engine

1. **Log in as System Admin:** Navigate to [https://shasthosetu.fit/login](https://shasthosetu.fit/login) and select **"Continue as System Admin"** (`admin.demo@shasthosetu.local`).
2. **Access Live Transactions Tab:** Click **"Live Transactions & Commissions"** (`/admin/transactions`) in the left navigation sidebar.
3. **Inspect the 5 Bank Account Models:** Verify simulated balances for Demo Payment MFS, Demo Payment Direct, SSLCommerz, City Bank Corporate Treasury, and BRAC Bank Payout.
4. **Test Live Simulation:** Click any button on the **Live Transaction Simulator** (e.g. `Lab Test (+18%)` or `Doctor Fee (+15%)`).
5. **Verify Real-Time Notice:** Observe the **green animated transaction alert banner** drop down with the new transaction ID, gross inflow, and commission split, while the ledger automatically prepends the new verified record.

---

## 8. Doctor Wallet, Clinician Payout Ledger & Strict Payment Security Gate

### 8.1 Doctor Earnings & Settlement Mechanics (85% Net Clinician / 15% Platform Split)
Doctors on ShasthoSetu AI maintain an independent **Clinician Wallet & Earnings Ledger** accessible via their workspace (`/doctor/wallet` and `/doctor/dashboard`):
- **Gross Consultation Inflow (100%):** Standard telemedicine appointment fees paid by patients via Demo Payment MFS, Demo Payment Direct, or Cards (e.g. ৳ 800 or ৳ 1,000 per tele-call).
- **Platform Commission (-15%):** Automatically deducted at transaction settlement to cover WebRTC encrypted video servers, AI clinical note drafting, and payment gateway fees.
- **Net Clinician Payout (+85%):** Retained directly in the doctor's available balance for electronic disbursement.
- **Disbursement Channel:** Weekly automated BEFTN / NPSB bank transfers via **BRAC Bank PLC Partner Payout Account** (`BRACBANK-SETTLE-05`, A/C `1509-••••-3310`).
- **Reconciliation Action:** Clinicians can trigger an audited settlement reconciliation request (`POST /v1/doctor/wallet/payout-request`), converting available balance into pending disbursement with an immutable audit event (`DOCTOR_PAYOUT_SETTLEMENT_REQUESTED`).
- **Consultation Transaction History:** Displays a full tabular breakdown of every completed call (Transaction Ref, Receipt Number, Patient Name, Dhaka Timestamp, Gross Fee, -15% Commission, and +85% Net Credit).

### 8.2 Strict Zero-Guest Payment Security Policy ("No Login, No Payment")
Under Bangladesh digital health compliance and financial fraud prevention standards, **no anonymous or unauthenticated visitor can execute payments** anywhere on ShasthoSetu AI:
1. **Frontend Interception Gate (`SimulatedPaymentCheckoutModal.tsx`):**
   - When an unauthenticated user clicks to purchase an ePharma medicine, book a diagnostic lab test, or schedule a doctor video call, the modal intercepts the action before any gateway interaction.
   - Renders a prominent amber authentication gate: **`🔒 পেমেন্ট করতে সাইন-ইন আবশ্যক / Sign In Required to Proceed with Payment`**.
   - Prevents guest token creation and prompts the user with a direct **`Sign In to Pay →`** CTA routing to `/login`.
2. **Backend Authentication Enforcement (`patient.py`):**
   - `POST /v1/patient/universal-storefront-checkout` checks `get_optional_user(request)`. If unauthenticated, it immediately terminates with **`HTTP 401 Unauthorized`** (`"Authentication required. Please sign in to proceed with secure payment."`).
   - `POST /v1/patient/checkout/demo` strictly enforces **`require_role("PATIENT")`**, returning **`HTTP 401`** for unauthenticated users and **`HTTP 403`** for non-patient roles.
3. **Argon2id Session Hardening & Zero-PHI Segregation:**
   - All transactions are cryptographically linked to verified user IDs with hashed Argon2id session tokens.
   - Financial transactions contain Zero-PHI (Protected Health Information) to prevent payment gateway or accounting leakage.
