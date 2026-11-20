# ShasthoSetu AI — Honest Engineering Disclosures & Known Limitations

In strict accordance with clinical AI ethics and reproducible research standards ([`FINAL_AUDIT_SIGNOFF.md`](../SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/final_lock/FINAL_AUDIT_SIGNOFF.md) & [`05_PRIVACY_AND_PUBLIC_RELEASE_RISKS.md`](HF_DATASET_PROVENANCE_AUDIT_01/05_PRIVACY_AND_PUBLIC_RELEASE_RISKS.md)), every known scope boundary is explicitly disclosed below.

---

## 1. Clinical & Regulatory Scope Boundaries
1. **Non-Diagnostic Research Prototype:** None of the 6 AI modules (`PCOS Clinical`, `PCOS Ultrasound`, `Viral Rash`, `Prescription OCR`, `Bangla Voice`, `DermoPed`) or RAG triage replies constitute a medical device, autonomous diagnosis, or prescription authority.
2. **Heuristic Privacy vs. Formal Certification:** Regex/token PII masking (`Zero-PHI` heuristics) and local SQLite WAL isolation protect evaluation workflows as software engineering safeguards — they do **not** represent formal HIPAA, GDPR, or Bangladesh Medical & Dental Council (BMDC) regulatory certification.
3. **Simulated Payments, Telemedicine & Pharmacies:** Billing receipts (`/patient/receipts/:paymentId`), doctor BMDC registration IDs (`BMDC-DEMO-*`), ePharma medicine orders, and 24/7 helplines use synthetic evaluation fixtures only.

---

## 2. Per-Module Research Constraints (Audited Truth)

| Module | Known Scientific / Engineering Limitation | Mitigation Built into ShasthoSetu AI |
| :--- | :--- | :--- |
| **01 PCOS Clinical** | Small held-out test sample ($N=18$, full cohort $N=88$); relies on clinical proxy biomarkers rather than long-term longitudinal outcomes. | Clearly labeled `Research Preview — Non-Diagnostic`; exposes full uncertainty and CV spread (`88.57% ± 8.29%`). |
| **02 PCOS Ultrasound** | Original public dataset lacked patient IDs; splits rely on perceptual hash (pHash) visual clustering ($N=299$). Imaging alone cannot diagnose PCOS without Rotterdam clinical/biochemical criteria. | Enforces B-mode grayscale image validation; blocks unrelated color photographs. |
| **03 Viral Skin Rash** | Web-scraped MCVSLD photos lack PCR clinical lab confirmation. Historical `99.10%` model suffered severe augmentation leakage across train/test splits. | **99.10% leaked baseline permanently quarantined**; deployed strict `755` source-photo family grouped model (**84.65% Val**, **85.09% Test Family**). |
| **04 Prescription OCR** | Upstream Gazipur Mendeley v2 lacks verbatim ground-truth bounding-box transcriptions; **real handwritten CER/WER is `NOT_VALIDATED`** (benchmarks cover printed `$N=4$` + read-only `0052.jpg` smoke test). | Mandatory **5-stage human verification gate (`HTTP 422`)** physically blocks automated dosage reminders until human confirmation (`SIMULATED_REVIEW_ONLY`). |
| **05 Bangla Voice AI** | Evaluated on general-domain Google FLEURS sentences (`26` clips, `39.09%` Norm WER) without medical terminology ground truth; pharmaceutical tokens can suffer phonetic distortion. | Enforces an **editable transcript confirmation step (`is_confirmed`)** before dispatching voice text to clinical chat. |
| **06 DermoPed Pediatric** | Local evaluation subset holds only `22` patients (`19` Chickenpox and **only `3` Pediculosis** patients total — `1` train, `1` val, `1` test). High variance (`92.73%` EXP_B / `100%` EXP_D on 4 test pts). | Tagged strictly as **Architectural PoC Only** with skin-chrominance guardrail rejecting non-skin uploads. |

---

## 3. Infrastructure Dependencies
- **Ollama Local Daemon:** Generative RAG replies and `1024-d` BGE-M3 dense vector queries require Ollama running locally (`127.0.0.1:11434`). When Ollama is absent, deterministic BM25 retrieval, safety refusals, portals, and CRUD operations continue working seamlessly.
- **Public Tunnel Warning:** Public tunnel URLs (`trycloudflare.com`, `ngrok`) expose an evaluation demo sandbox; never deploy with default synthetic demo passwords on live patient production environments.
