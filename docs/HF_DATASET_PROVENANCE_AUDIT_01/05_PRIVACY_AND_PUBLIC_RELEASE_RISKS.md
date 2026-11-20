# 05 — Privacy, Ethical & Public Release Risk Assessment
**Task ID:** `HF-DATASET-PROVENANCE-AUDIT-01`  
**Repository Target:** `ashik1236/shasthosetu-clinical-datasets`  
**Date:** November 20, 2026  
**Auditor:** Lead Clinical AI Safety Officer & Data Privacy Auditor  

---

## 1. Risk Matrix Overview

Hosting healthcare datasets on a public repository platform (Hugging Face) exposes researchers and repository owners to distinct privacy, ethical, regulatory, and legal liabilities. 

```
+--------------------------------------------------------------------------------------------------------------------+
| RISK VECTOR | COMPONENT / ARTIFACT           | SEVERITY | NATURE OF EXPOSURE              | MITIGATION REQUIREMENT |
+-------------+--------------------------------+----------+---------------------------------+------------------------+
| Vector 1    | 06_dermoped_pediatric_crops    | CRITICAL | Pediatric patient body/lesion   | Restrict / Gate access;|
|             | (24,249 files, 1.75 GB)        |          | photos redistributed publicly    | withhold raw images    |
| Vector 2    | 04_prescription_ocr            | HIGH     | Real clinic prescription slips  | Disclose publisher     |
|             | (1,000 images, Gazipur)        |          | (Handwriting, signatures, Rx)   | heuristic masking only |
| Vector 3    | 03_viral_rash_grouped          | MODERATE | Web-scraped images from Google  | Add copyright disclaimer|
|             | (11,329 files, MCVSLD)         |          | & health sites (Unclear 3P IP)  | & takedown notice link |
| Vector 4    | Regulatory Compliance Claims   | HIGH     | Uncertified "Zero-PHI Verified" | Demote to "Heuristic   |
|             | ("BMDC Compliant", "Certified")|          | and "BMDC Certified" claims     | Scrubbing Protocol"    |
+--------------------------------------------------------------------------------------------------------------------+
```

---

## 2. In-Depth Risk Vector Analysis

### 2.1 Vector 1: Pediatric Patient Imagery (`06_dermoped_pediatric_crops`)
- **Nature of Exposure:** The repository hosts 24,249 files totaling 1.75 GB under `06_dermoped_pediatric_crops/`. This includes high-resolution photographic crops of skin lesions on infants and young children diagnosed with Chickenpox and Pediculosis.
- **Legal & Ethical Constraints:**
  - Minors cannot provide legal consent; parental/guardian consent is strictly non-transferable to unauthorized third-party public mirrors without specific institutional data transfer agreements (DTA).
  - GDPR Article 8 and international pediatric bioethics principles mandate heightened protections for sensitive health data belonging to children.
  - The IRCCS Bologna hospital authors published their dataset on Zenodo under specific terms. Re-distributing thousands of cropped photographs on a public commercial hub like Hugging Face without formal institutional clearance creates severe institutional exposure.
- **Actionable Recommendation:**
  1. **Immediate Step:** Set the Hugging Face repository to **Gated Access** (requiring users to agree to research-only terms before downloading).
  2. **Alternative Safe Step:** Remove the raw image folders (`raw/`, `crops/`) from public Hugging Face distribution, keeping only metadata manifests, hash registers, and model checkpoints, while providing an automated Python script that downloads the raw archives directly from the official Zenodo DOI (`10.5281/zenodo.20829589`).

### 2.2 Vector 2: Handwritten Prescriptions (`04_prescription_ocr`)
- **Nature of Exposure:** 1,000 photographic captures of real doctor prescriptions from Gazipur and Dhaka healthcare facilities.
- **Privacy Assessment:**
  - The original Mendeley authors obscured patient names and phone numbers with black marker.
  - However, doctor signatures, clinic letterheads, pharmacy stamps, and unique combinations of diagnoses, dates, and dosages remain legible. In small community clinics, a unique combination of rare medications and dates can permit re-identification.
- **Actionable Recommendation:**
  - Clearly disclose on Hugging Face that de-identification was performed heuristically by upstream dataset authors.
  - Include an explicit Notice and Takedown procedure: *"Any individual or healthcare provider who identifies a record eligible for redaction may request immediate permanent removal by contacting the repository maintainer."*

### 2.3 Vector 3: Web-Scraped Dermatological Lesions (`03_viral_rash_grouped`)
- **Nature of Exposure:** 10,384 image crops compiled by AUST researchers via Google Image Search queries.
- **Copyright Assessment:** The authors do not own the underlying copyrights for web-scraped images. Rehosting them on Hugging Face exposes the repository to DMCA takedown requests from copyright holders.
- **Actionable Recommendation:** Include standard educational/research fair use notices: *"These images are indexed strictly for non-commercial academic benchmarking under fair-use research principles. Original copyrights reside with their respective clinical publishers."*

### 2.4 Vector 4: Regulatory and Certification Terminology
- **Nature of Exposure:** Badges and text claiming "Zero-PHI Scrubbed Verified" and "BMDC Compliant".
- **Liability Assessment:** If a regulatory body (such as the Bangladesh Medical & Dental Council) or hospital audit committee inspects the repository, claiming official compliance or certification without an official registration certificate constitutes regulatory misrepresentation.
- **Actionable Recommendation:**
  - Change all badge titles and text from **"Certified"** to **"Heuristic Rule-Based Masking"** and **"Designed in Technical Alignment with BMDC Non-Prescribing Safety Guidelines"**.

---

## 3. Mandatory Public Disclaimers to Include in Dataset Card

```markdown
### ⚠️ Mandatory Medical & Ethical Disclaimers

1. **Non-Diagnostic Research Release**: This collection is released strictly for computer vision, natural language processing, and clinical AI benchmarking. It does NOT constitute a certified medical device, diagnostic system, or automated prescribing tool.
2. **Third-Party Provenance**: All clinical datasets were gathered from peer-reviewed publications, open-access academic repositories (Mendeley Data, Zenodo), and public research benchmarks (Google FLEURS). ShasthoSetu AI claims no primary ownership of original patient data.
3. **No Clinical Certification**: Mention of BMDC guidelines or Zero-PHI standards reflects engineering safety heuristics designed to prevent unauthorized prescription generation and mask identifiable data. It does NOT imply formal certification or endorsement by regulatory authorities.
4. **Takedown Policy**: If you believe any image or text record infringes copyright or personal privacy, please submit a removal request via Hugging Face community discussions for immediate remediation.
```
