# Provenance, Metadata & Usage Rights Audit
## ShasthoSetu AI — 03_Measles_Viral_Rash Module

---

### 1. Dataset Provenance & Attribution
- **Dataset Title:** Multi-Class Viral Skin Lesion Dataset (MCVSLD)
- **Repository:** Mendeley Data (Elsevier)
- **Persistent DOI:** `https://doi.org/10.17632/dfztdtfsxz.1`
- **Dataset Version:** Version 1 (Published December 31, 2024)
- **Contributors / Authors:**
  1. **Kazi Rifat Ahmed** (Daffodil International University, Bangladesh)
  2. **Md. Mazbaur Rashid** (Daffodil International University, Bangladesh, ORCID: 0009-0003-5793-1201)
  3. **Suprove Chandra Sarkar** (Daffodil International University, Bangladesh, ORCID: 0009-0006-2635-6736)
  4. **Mujahidul Islam** (Daffodil International University, Bangladesh, ORCID: 0009-0001-9723-8431)
- **Institutional Origin:** Department of Computer Science & Engineering, Daffodil International University, Dhaka, Bangladesh.

---

### 2. Legal Usage Rights & Licensing Audit
- **License Classification:** Creative Commons Attribution 4.0 International (`CC BY 4.0`).
- **Permissions Granted:**
  - **Share:** Copy and redistribute the material in any medium or format.
  - **Adapt:** Remix, transform, and build upon the material for any purpose, including commercial applications.
- **Requirements:** Appropriate credit must be given, a link to the license provided, and an indication of whether modifications were made.
- **Verification Status:** **APPROVED & FULLY COMPLIANT**. The dataset is released under an open scientific license permitting machine learning research, model training, benchmarking, and documentation.

---

### 3. Image Acquisition Methodology & Provenance Details
- **Source Methodology:** Compilation of clinical skin condition images gathered from authenticated medical sources, scientific publications, and online dermatology databases via systematic search.
- **Disease Coverage (6 Classes):**
  1. Hand, Foot, and Mouth Disease (HFMD) — Coxsackievirus / Enterovirus
  2. Monkeypox (Mpox) — Orthopoxvirus
  3. Measles (Rubeola) — Morbillivirus
  4. Chickenpox (Varicella) — Varicella-Zoster Virus (VZV)
  5. Cowpox — Orthopoxvirus
  6. Healthy Skin Controls
- **File Format:** High-resolution RGB images in JPEG format.

---

### 4. Clinical Safety, Regulatory Scope & Ethical Boundaries
1. **Assistive Research Classifier Only:**
   - This machine learning pipeline is designed strictly as an experimental assistive triage system for differential screening of viral skin eruptions.
   - It is **NOT an autonomous medical diagnostic device** and has not been cleared by DGDA (Bangladesh) or the US FDA.
2. **Clinical Limitations of 2D Vision for Exanthems:**
   - Differentiating measles from rubella, chickenpox, or enteroviral rashes requires holistic clinical evaluation:
     - Prodromal symptoms (high fever, cough, coryza, conjunctivitis — the "3 Cs").
     - Enanthem inspection (Koplik spots on buccal mucosa).
     - Rash progression pattern (cephalocaudal: starting behind hairline/ears and spreading downward).
     - Patient vaccination history (MMR vaccine records).
   - An isolated image of macular erythema or papules cannot determine viral etiology with medical certainty without serology (Measles IgM) or RT-PCR.
3. **Module Isolation:**
   - Modules `01_PCOS_Clinical` (tabular clinical endocrine), `02_PCOS_Ultrasound` (gynecological imaging), and `03_Measles_Viral_Rash` (pediatric/infectious dermatological vision) operate in strict architectural isolation.
