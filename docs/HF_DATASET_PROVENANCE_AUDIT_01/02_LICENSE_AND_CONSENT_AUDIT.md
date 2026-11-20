# 02 — License Compatibility & Informed Consent Legal Audit
**Task ID:** `HF-DATASET-PROVENANCE-AUDIT-01`  
**Repository Target:** `ashik1236/shasthosetu-clinical-datasets`  
**Date:** November 20, 2026  
**Auditor:** Principal AI Systems Auditor & Legal/Ethics Compliance Specialist  

---

## 1. Executive Summary & Legal Invariants

A critical flaw in the previous dataset card was the application of a **single blanket license (`CC BY-NC-SA 4.0`)** across the entire repository without auditing the upstream redistribution terms of individual component datasets. 

Furthermore, claiming "Zero-PHI Verified", "BMDC Compliant", and "Ethically Approved" as verified legal certifications falsely implied that ShasthoSetu AI had obtained formal regulatory clearance from the Bangladesh Medical & Dental Council (BMDC) or hospital Institutional Review Boards (IRB).

This audit establishes:
1. **The Component License Matrix:** Exact upstream license terms and permissible derivative distribution.
2. **The Umbrella License Conflict:** Why a single CC BY-NC-SA 4.0 license cannot legally override upstream CC BY 4.0 rights or cure third-party copyright ambiguities.
3. **The Informed Consent Boundary:** What consent was verified upstream vs what ShasthoSetu AI can honestly claim.

---

## 2. Upstream vs Downstream Licensing Audit

```
+-------------------------------------------------------------------------------------------------------------------------+
| MODULE                 | UPSTREAM REPOSITORY | UPSTREAM LICENSE | REDISTRIBUTION RIGHTS      | COLLECTION LICENSE ISSUE |
+------------------------+---------------------+------------------+----------------------------+--------------------------+
| 01_PCOS_Clinical       | Mendeley Data       | CC BY 4.0        | Permitted with attribution | CC BY-NC-SA restricts    |
|                        |                     |                  |                            | commercial use beyond    |
|                        |                     |                  |                            | upstream CC BY 4.0 terms |
| 02_PCOS_Ultrasound     | Frontiers / GitHub  | CC BY 4.0        | Permitted with attribution | Same restriction conflict|
| 03_Measles_Viral_Rash  | Mendeley (MCVSLD)   | CC BY 4.0        | UNRESOLVED: Scraped images | Upstream CC BY 4.0 does  |
|                        |                     | (Publisher claim)| may infringe 3P copyright  | not protect against DMCA |
| 04_Prescription_OCR    | Mendeley Data v2    | CC BY 4.0        | Permitted with attribution | Same restriction conflict|
| 05_Bangla_Voice_AI     | Google FLEURS       | CC BY 4.0        | Permitted with attribution | Same restriction conflict|
| 06_DermoPed_Pediatric  | Zenodo Record       | CC BY 4.0        | HIGH RISK: Pediatric skin  | Open copyright license   |
|                        |                     |                  | photos require subject     | does not waive human     |
|                        |                     |                  | privacy safeguards         | subject privacy exposure |
+-------------------------------------------------------------------------------------------------------------------------+
```

### 2.1 The Umbrella License Inconsistency
- In the initial dataset card, the repository header declared: `license: cc-by-nc-sa-4.0`.
- All six upstream datasets were published under **Creative Commons Attribution 4.0 International (`CC BY 4.0`)**.
- While CC BY 4.0 permits adaptation and redistribution, applying a Non-Commercial (`-NC`) and Share-Alike (`-SA`) restriction to unmodified or lightly transformed upstream files alters the original authors' open-access grant.
- **Recommended Legal Rectification:** The dataset card must state:
  > *"Individual component datasets remain subject to their original upstream CC BY 4.0 licenses with full scholarly attribution. The compilation, benchmark harnesses, and leak-free partition manifests created by ShasthoSetu AI are distributed under CC BY-NC-SA 4.0 for non-commercial academic research."*

### 2.2 Third-Party Copyright Exposure in MCVSLD (`03_viral_rash_grouped`)
- The MCVSLD authors compiled 10,384 image crops using web scraping and search engines.
- Even though the authors uploaded the archive to Mendeley under a CC BY 4.0 label, **a publisher cannot legally license images they do not own**. If any of the original photographs belong to medical textbook publishers, dermatological clinical societies (e.g., DermNet NZ), or private photographers, those third parties retain underlying copyright.
- **Risk Assessment:** Rehosting raw web-scraped images on Hugging Face carries a non-zero risk of DMCA copyright takedown notices.

### 2.3 Pediatric Privacy Exposure in DermoPed (`06_dermoped_pediatric_crops`)
- DermoPed consists of **24,249 files (1.75 GB)** on Hugging Face, including high-resolution lesion crops, segmentation masks, and challenging crops from pediatric hospital patients.
- While the IRCCS Bologna hospital authors stated in *Nature Scientific Data* that parental consent was obtained for their clinical trial, **that consent does not automatically extend to third-party secondary hosting on public commercial platforms like Hugging Face**.
- Children and minors receive heightened legal protection under international privacy frameworks (GDPR Article 8, UN Convention on the Rights of the Child).
- **Critical Audit Verdict:** Redistributing 24,000+ pediatric patient images on an open, public Hugging Face repository creates significant ethical and institutional liability.

---

## 3. Informed Consent & Institutional Governance Audit

| Dataset Module | Upstream Consent Status | ShasthoSetu Direct Consent | Legal & Ethical Assessment |
|---|---|---|---|
| **01_PCOS_Clinical** | Reported by Sfax Hospital (IRB sign-off stated in publication) | **None** (Secondary user of public CSV) | Low Risk: Completely de-identified tabular numeric values. |
| **02_PCOS_Ultrasound** | Reported by Fatemieh Hospital / Tarbiat Modares (Ethical approval stated) | **None** (Secondary user of public PNGs) | Low Risk: Anonymized grayscale B-mode scans; zero biometric identifiers. |
| **03_Measles_Viral_Rash** | **None reported** (Collected from public internet searches) | **None** | Moderate Risk: Web photos of skin lesions; some may show facial contours. |
| **04_Prescription_OCR** | Manual masking by authors (No formal IRB document referenced) | **None** | Moderate Risk: Handwritten clinic prescription slips; names and numbers blacked out. |
| **05_Bangla_Voice_AI** | Google FLEURS open contributor agreement (CC BY 4.0) | **None** | Zero Risk: Public benchmark speech recordings. |
| **06_DermoPed_Pediatric** | Reported by IRCCS Bologna (Parental consent for original study) | **None** | **HIGH RISK: Pediatric patient photographs redistributed on public hub.** |

---

## 4. De-Certification of Unsupported Compliance Claims

To maintain total scientific honesty, the following terms previously used in drafts must be formally modified:

1. **"Zero-PHI Verified Certification" ➔ REPLACED WITH: "Heuristic Zero-PHI Rule-Based Scrubbing".**  
   *Reasoning:* No certified medical privacy auditor or regulatory body has evaluated or certified the pipeline. It is an internal regular-expression and visual masking pipeline.
2. **"BMDC Compliant" ➔ REPLACED WITH: "Designed in Technical Alignment with BMDC Telemedicine Guidelines".**  
   *Reasoning:* The Bangladesh Medical & Dental Council (BMDC) does not issue software certifications. Claiming "BMDC Compliant" is legally misleading.
3. **"Ethically Approved / Institutional Sign-off" ➔ REPLACED WITH: "Upstream Publisher-Reported Ethical Clearance".**  
   *Reasoning:* ShasthoSetu AI did not submit an IRB protocol to Sfax, Gazipur, or Bologna hospitals.

---

## 5. Audit Conclusion & Redistribution Recommendation

- **Documentation Status:** `DOCUMENTATION_COMPLETE`
- **Data Redistribution Rights Status:** `PROVISIONAL — RESTRICTION RECOMMENDED`
- **Specific Action Recommended:**
  1. Update the dataset card with explicit per-component attribution and licensing disclaimers.
  2. Change repository visibility to **Gated** or remove raw pediatric images (`06_dermoped_pediatric_crops/raw/`) from public distribution, directing researchers to obtain the raw archive directly from Zenodo under Record `10.5281/zenodo.20829589`.
