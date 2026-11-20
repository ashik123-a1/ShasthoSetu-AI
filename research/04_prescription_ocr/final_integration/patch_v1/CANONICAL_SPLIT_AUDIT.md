# 📋 ShasthoSetu AI — Canonical Split & Quarantine Audit (Patch V1)

**Audit Version:** Patch V1.0  
**Date:** 2026-11-18  
**Single Source of Truth:** `data/processed/split_manifest.csv` and `audit_v2/corrected_annotation_manifest.csv`  

---

## 1. Executive Summary: Manifest Reconciliation

This audit resolves the clerical discrepancies identified between earlier narrative text tables and `quarantine_audit.json`. All memberships are dynamically queried from `split_manifest.csv` without hardcoded assumptions.

### Core Verification Guarantees:
1. **Single Source of Truth Enforced:** Memberships are strictly anchored to `split_manifest.csv`.
2. **Zero Split Shifting:** Quarantined test samples (`0186`, `0756`, `0757`) are **NOT moved to training**. They remain in the `test` partition with `evaluation_admissible = False`.
3. **Zero Cross-Split Hash Leakage:** All 998 unique SHA-256 hashes reside strictly within their designated partitions (0 leaked hashes across splits).

---

## 2. Canonical Split & Admissibility Table

| Split | Total Allocations | Admissible for Evaluation | Quarantined / Inadmissible | Quarantined Prescription IDs |
| :--- | :---: | :---: | :---: | :--- |
| **Train** | 697 | 696 | 1 | `0674` |
| **Val** | 150 | 147 | 3 | `0676`, `0729`, `0775` |
| **Test** | 152 | 149 | 3 | `0186`, `0756`, `0757` |
| **Unannotated** | 1 | 0 | 1 | `0747` |

---

## 3. Dynamic Audit of Target Prescription Identifiers

The table below reflects the canonical partition for each target stem directly from `split_manifest.csv`:

| Prescription ID | Disk Filename | SHA-256 Digest | Canonical Split | Quarantine Status | Admissible? | Audit Rationale & Clinical Status |
| :---: | :--- | :--- | :---: | :--- | :---: | :--- |
| `0174` | `0174.jpg` | `5a74323681...` | **Val** | `VERIFIED_MAPPED_TYPO_FIX` | **Yes** | Resolved comma typo '0174,jpg' to physical image '0174.jpg'. |
| `0185` | `0185.jpg` | `d4cb9a0396...` | **Val** | `VERIFIED_USABLE` | **Yes** | Clean 1:1 image to annotation mapping. |
| `0186` | `0186.jpg` | `0e9bb7f1a3...` | **Test** | `QUARANTINED_UNRESOLVED_ANNOTATION` | **No (Quarantined)** | Row was missing in original CSV; clerical alignment to 0185 duplicate cannot be independently guaranteed. |
| `0674` | `0674.jpeg` | `364969a300...` | **Train** | `QUARANTINED_UNRESOLVED_ANNOTATION` | **No (Quarantined)** | 0674 was omitted and 0676 was duplicated with conflicting text in raw CSV; excluded from official evaluation. |
| `0675` | `0675.jpeg` | `20f9e8912c...` | **Train** | `VERIFIED_USABLE` | **Yes** | Clean 1:1 image to annotation mapping. |
| `0676` | `0676.jpeg` | `cb7f76fa6f...` | **Val** | `QUARANTINED_UNRESOLVED_ANNOTATION` | **No (Quarantined)** | 0674 was omitted and 0676 was duplicated with conflicting text in raw CSV; excluded from official evaluation. |
| `0747` | `0747.jpeg` | `91acc19806...` | **Unannotated** | `QUARANTINED_NO_ANNOTATION` | **No (Quarantined)** | Disk image exists but was omitted from the Mendeley CSV. |
| `0729` | `0729.jpeg` | `355bd02d18...` | **Val** | `QUARANTINED_CONFLICTING_DUPLICATE_ANNOTATION` | **No (Quarantined)** | Physical image SHA-256 is identical between 0729 and 0775, but CSV contains two completely conflicting narrative descriptions. |
| `0775` | `0775.jpeg` | `355bd02d18...` | **Val** | `QUARANTINED_CONFLICTING_DUPLICATE_ANNOTATION` | **No (Quarantined)** | Physical image SHA-256 is identical between 0729 and 0775, but CSV contains two completely conflicting narrative descriptions. |
| `0756` | `0756.jpeg` | `225b69977f...` | **Test** | `VERIFIED_DUPLICATE_PAIR` | **No (Quarantined)** | Exact duplicate image SHA-256 with identical text; restricted strictly to Train partition. |
| `0757` | `0757.jpeg` | `225b69977f...` | **Test** | `VERIFIED_DUPLICATE_PAIR` | **No (Quarantined)** | Exact duplicate image SHA-256 with identical text; restricted strictly to Train partition. |

---

## 4. Duplicate Image Analysis & Cross-Split Leakage Audit

Auditing all 1,000 on-disk images by SHA-256 revealed exactly 998 unique digests with 2 identical image pairs:

### Pair 1: `0729.jpeg` and `0775.jpeg`
- **SHA-256:** `355bd02d18ef0ae8...` (34,366 bytes)
- **Canonical Split:** Both reside strictly in **`val`**.
- **Quarantine Status:** `QUARANTINED_CONFLICTING_DUPLICATE_ANNOTATION` (Admissible: `False`).
- **Reason:** Identical image file, but raw CSV contains two conflicting descriptions (`Jaundice for 1 month` vs `Needs admission`). Both excluded from validation benchmarks.

### Pair 2: `0756.jpeg` and `0757.jpeg`
- **SHA-256:** `225b69977fd76244...` (29,637 bytes)
- **Canonical Split:** Both reside strictly in **`test`**.
- **Quarantine Status:** `VERIFIED_DUPLICATE_PAIR` (Admissible: `False`).
- **Reason:** Identical image file with identical Diutrol Plus text. To ensure zero evaluation redundancy, both are excluded from the test benchmark (reducing test evaluation from 152 to 149). **They were NOT shifted into training.**

### Cross-Split Hash Leakage:
- Total cross-split leaked hashes: **`0` (Zero)**.

---

## 5. Remaining Near-Duplicate & Writer-Level Risks

While exact bitwise duplicate leakage is strictly 0.00%, clinical document AI must acknowledge remaining writer-level risks:
1. **Same-Physician Handwriting Clusters:** Multiple prescriptions were gathered from the same outpatient departments (e.g. Shaheed Suhrawardy Hospital OPD, Gazipur clinics). A physician's recurring handwriting style may appear across both train and validation sets.
2. **Stationery Header Repetition:** Printed hospital pad templates (e.g. *'বাংলাদেশ ফরম নং ৭৬৯'*) recur across partitions. EasyOCR detects these printed tokens with high confidence, which does not reflect handwriting recognition generalization.
3. **Clinical Recommendation:** Future iterations should partition data by **Physician / Hospital Ward ID** rather than random image sampling once hospital metadata is de-anonymized.