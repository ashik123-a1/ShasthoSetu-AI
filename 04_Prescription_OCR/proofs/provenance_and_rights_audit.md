# Provenance, Metadata & Usage Rights Audit
## ShasthoSetu AI — 04_Prescription_OCR Module

---

### 1. Dataset Provenance & Attribution
- **Dataset Title:** Image-to-Text Bilingual Dataset from Medical Prescriptions
- **Repository:** Mendeley Data (Elsevier)
- **Persistent DOI:** `https://doi.org/10.17632/tg2hm7n2bs.2`
- **Dataset Version:** Version 2 (Published January 19, 2026)
- **Contributors / Authors:**
  1. **Diya Roy Badhon** (Bangabandhu Sheikh Mujibur Rahman Digital University, Bangladesh)
  2. **Md. Arafat Islam** (Bangabandhu Sheikh Mujibur Rahman Digital University, Bangladesh)
  3. **Umme Aiman Zim** (Bangabandhu Sheikh Mujibur Rahman Digital University, Bangladesh)
  4. **Yamin Hossain** (Bangabandhu Sheikh Mujibur Rahman Digital University, Bangladesh)
  5. **Md. Milon-Ibna-Shoyab Rangon** (Bangabandhu Sheikh Mujibur Rahman Digital University, Bangladesh)
  6. **Saiful Islam** (Bangabandhu Sheikh Mujibur Rahman Digital University, Bangladesh)
  7. **Tanjim Taharat Aurpa** (Supervisor, Bangabandhu Sheikh Mujibur Rahman Digital University, Bangladesh, ORCID: 0000-0003-1471-1316)
- **Institutional Origin:** Bangabandhu Sheikh Mujibur Rahman Digital University (BDU), Kaliakair, Gazipur, Bangladesh.

---

### 2. Legal Usage Rights & Licensing Audit
- **License Classification:** Creative Commons Attribution 4.0 International (`CC BY 4.0`).
- **Permitted Uses:** Academic research, model development, commercial applications, adaptation, and sharing with appropriate attribution.
- **Verification Status:** **APPROVED & FULLY COMPLIANT**.

---

### 3. Ethical De-Identification & Clinical Privacy Audit
- **Data Collection Origin:** Real clinical prescriptions collected from hospitals, private clinics, and community pharmacies across Gazipur, Bangladesh.
- **Privacy & De-Identification:**
  - Patient names, phone numbers, addresses, and identifying hospital registration numbers were manually redacted/blacked out prior to scanning and publication.
  - Conforms to international patient privacy standards (HIPAA-equivalent de-identification for medical documents).
- **Annotation Ground Truth:**
  - Accompanied by verified bilingual annotations (`annotations.csv`) containing paired image-to-text transcriptions in both English (medication names, strengths, dosages) and Bangla (instructions, frequency, duration).

---

### 4. Assistive Clinical Scope & Diagnostic Boundary
- **Intended Use:** Assistive EHR digitization, prescription legibility enhancement, and bilingual medication parsing for rural healthcare workers.
- **Safety Restriction:** Machine-parsed prescriptions must NEVER be automatically dispensed without pharmacist verification or physician review.
- **Module Isolation:** Operates strictly independent of `01_PCOS_Clinical`, `02_PCOS_Ultrasound`, and `03_Measles_Viral_Rash`.
