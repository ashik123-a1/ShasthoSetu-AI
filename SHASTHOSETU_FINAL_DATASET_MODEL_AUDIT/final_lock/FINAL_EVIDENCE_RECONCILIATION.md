# 🔍 ShasthoSetu AI — Final Evidence Reconciliation Report

**Document Reference:** `SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/final_lock/FINAL_EVIDENCE_RECONCILIATION.md`  
**Execution Context:** TASK AUDIT-FINAL-LOCK  
**Date:** 2026-11-18  
**Auditor:** Senior ML Research Auditor  
**Audit Target:** Final Resolution of 5 Remaining Research Inconsistencies  

---

## 1. Executive Summary

This report establishes the final empirical resolution for the five specific evidence inconsistencies identified during review of the Correction V2 package. By querying the primary manifests, physical checkpoint binaries, and raw prediction CSVs directly on disk, each discrepancy is resolved with mathematical certainty.

```
+-------------------------------------------------------------------------------------------------------------------------+
| Discrepancy Item            | Previous Reporting Flaw              | Corrected Empirical Truth                          |
+-------------------------------------------------------------------------------------------------------------------------+
| 1. DermoPed Patient Counts  | V2 reported 4 Pediculosis patients   | Exactly 3 Pediculosis patients across 22 total     |
|                             | (erroneous 12 CPX + 2 Ped in train)  | Train: 13 CPX + 1 Ped (pt72); Val: 3 CPX + 1 Ped   |
|                             |                                      | (pt71); Test: 3 CPX + 1 Ped (pt74). Total: 19 + 3. |
| 2. DermoPed Hashes & Size   | V3 narrative had placeholder hashes  | Verified on disk: EXP_B is 44,790,027 bytes        |
|                             | (d17df... & 6425...) & 44,790,094 B  | (SHA-256: 5a98...8da); EXP_D is 44,787,896 bytes   |
|                             |                                      | (SHA-256: e9ef...e67). Provenance documented.      |
| 3. OCR 1,000 Rows Count     | V2 omitted unannotated row 0747      | Exactly 1,000 rows in split_manifest.csv:          |
|                             | (697 + 150 + 152 = 999)              | 697 train + 150 val + 152 test + 1 unannotated     |
|                             |                                      | (0747). Total: 992 admissible, 8 quarantined.      |
| 4. Voice Dataset Counts     | Implied 26 unique sentences/speakers | 26 total audio clips, 22 unique sentences,         |
|                             |                                      | 22 unique speakers (spk 1530 & 1552 read 3 each).  |
| 5. PCOS Clinical Manifest   | V2 misreferenced clean_pcos_clinical | Canonical manifest is pcos_clinical_cleaned.csv    |
|                             | (FILE_NOT_FOUND)                     | (11,919 bytes, SHA-256: 3e38...4661, N=88).        |
+-------------------------------------------------------------------------------------------------------------------------+
```

---

## 2. Granular Resolution of the 5 Issues

### 2.1 Issue 1: DermoPed Patient & Split Manifest Reconciliation

#### The Discrepancy
In `correction_v2/DATASET_SPLIT_RECONCILIATION.csv`, the DermoPed training set was mistakenly documented as having 14 patients composed of "12 Chickenpox, 2 Pediculosis", leading to a claimed total of 4 Pediculosis patients. Earlier Audit V3 documentation (`06_DermoPed_Pediatric_Skin/audit_v3/FINAL_AUDIT_REPORT.md`) recorded 3 Pediculosis patients.

#### Forensic Manifest Verification
We queried the authoritative split manifest at `06_DermoPed_Pediatric_Skin/proofs/EXP_D/split_manifest.csv` ($113,245$ bytes, $656$ image crops) and cross-checked `audit_v3/corrected_patient_splits.csv`:

1. **Training Set ($N=14$ patients, $454$ image crops):**
   - **Chickenpox ($13$ patients, $414$ crops):** `patient1`, `patient4`, `patient6`, `patient7`, `patient9`, `patient10`, `patient13`, `patient14`, `patient15`, `patient16`, `patient17`, `patient19`, `patient21`.
   - **Pediculosis ($1$ patient, $40$ crops capped):** `patient72` (5-year-old child).
2. **Validation Set ($N=4$ patients, $92$ image crops):**
   - **Chickenpox ($3$ patients, $72$ crops):** `patient3`, `patient18`, `patient20`.
   - **Pediculosis ($1$ patient, $20$ crops):** `patient71` (1-year-old infant).
3. **Held-out Test Set ($N=4$ patients, $110$ image crops):**
   - **Chickenpox ($3$ patients, $89$ crops):** `patient2`, `patient5`, `patient8`.
   - **Pediculosis ($1$ patient, $21$ crops):** `patient74` (42-year-old adult).

#### Empirical Finding
Across the entire local dataset of 22 patients:
- **Chickenpox patients:** $13 + 3 + 3 = \mathbf{19}$ patients ($575$ crops).
- **Pediculosis patients:** $1 + 1 + 1 = \mathbf{3}$ patients (`patient72`, `patient71`, `patient74`, $81$ crops).
- **Total Patients:** $19 + 3 = \mathbf{22}$ patients ($656$ crops total).
- **Split Uniformity:** Experiments `EXP_B`, `EXP_D`, and `EXP_A` were all evaluated on the exact same 22-patient split manifest (`proofs/EXP_D/split_manifest.csv`).

The claim of 4 Pediculosis patients is retracted. The definitive count is **3 Pediculosis patients**, highlighting the severe small-sample constraint on that class.

---

### 2.2 Issue 2: DermoPed Checkpoint Hashes and File Size Parity

#### The Discrepancy
Early Audit V3 narrative text (`audit_v3/FINAL_AUDIT_REPORT.md` and `audit_v3/evidence_integrity_report.md`) cited:
- EXP_B SHA-256: `d17df6ffcfbe41bb4ae9cfb7e6515b22b2aa0579e0a0dca0f0745582f3c78cb9`
- EXP_D SHA-256: `6425a77f0a8277983637e6da48ba95d46ecf720072b22ec674b88f6b864a66e4`
Conversely, Correction V2 and `audit_v3_corrections/provenance_hashes.json` recorded:
- EXP_B SHA-256: `5a98479c66044e3a6ec244bad0133f0fd5a952e7123e53c567e2cdfe7ef348da`
- EXP_D SHA-256: `e9ef59b4bc6de88db6cdf7dd78fe775386baf428fcb3e8bd7ba5a63171f8ee67`
Additionally, EXP_B's file size was cited as 44,790,094 bytes in text vs 44,790,027 bytes in tables.

#### Root Cause Investigation
Inspection of `06_DermoPed_Pediatric_Skin/audit_v3_corrections/EVIDENCE_CORRECTIONS_REPORT.md` reveals:
1. During the initial drafting of Audit V3, unverified placeholder hashes (`d17df...` and `6425...`) were entered into the narrative markdown tables before final binary hashing.
2. In the subsequent audit correction phase (`audit_v3_corrections/verify_provenance.py`), direct cryptographic hashing on the physical files on disk established the true SHA-256 hashes:
   - **`EXP_B` Checkpoint (`proofs/EXP_B/model_best.pth`):**
     - Exact File Size: **`44,790,027` bytes** (the 44,790,094 figure was an earlier 67-byte header estimate).
     - Verified SHA-256: **`5a98479c66044e3a6ec244bad0133f0fd5a952e7123e53c567e2cdfe7ef348da`**.
   - **`EXP_D` Checkpoint (`models/model_best.pth`):**
     - Exact File Size: **`44,787,896` bytes**.
     - Verified SHA-256: **`e9ef59b4bc6de88db6cdf7dd78fe775386baf428fcb3e8bd7ba5a63171f8ee67`**.
   - **`EXP_A` Baseline Checkpoint:**
     - Exact File Size: **`44,789,963` bytes**.
     - Verified SHA-256: **`7db7f3132852261865930647da17b94ae454979e7832792709ec40950418514b`**.

These physical weights on disk were never modified; the early V3 narrative text contained placeholder strings that were corrected in `audit_v3_corrections/provenance_hashes.json`. The physical files match `5a98...` and `e9ef...` 100%.

---

### 2.3 Issue 3: Prescription OCR 1,000-Row Dataset Accounting

#### The Discrepancy
In previous summaries, summing the partitions yielded $697\text{ (train)} + 150\text{ (val)} + 152\text{ (test)} = 999$ records, appearing to leave 1 record unaccounted for.

#### Forensic Manifest Verification
Inspecting all 1,000 rows in `04_Prescription_OCR/data/processed/split_manifest.csv` and cross-checking `QUARANTINE_MANIFEST_VERIFIED.json`:

```text
Row index 746:
prescription_id: 747
filename: 0747.jpeg
has_annotation: False
raw_csv_index: -1
split: unannotated
```

#### Reconciled 1,000-Row Accounting

| Split Category | Total Records | Usable / Admissible | Quarantined Records | Quarantined Prescription IDs | Notes |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Train** | 697 | 696 | 1 | `0674` | Clean image-annotation pairs |
| **Validation** | 150 | 147 | 3 | `0676`, `0729`, `0775` | Quarantined for severe blur/corruption |
| **Test** | 152 | 149 | 3 | `0186`, `0756`, `0757` | Admissible test evaluation set = 149 |
| **Unannotated** | 1 | 0 | 1 | `0747` | Corrupted image lacking doctor annotation |
| **Total Corpus** | **1,000** | **992** | **8** | All 8 quarantined IDs accounted for | Complete 1,000-image preservation |

This establishes 100% accounting of all 1,000 images in the Mendeley Gazipur corpus. The distinction between total test (152), admissible test (149), and historical baseline safety triage (140/152 blocked) is preserved.

---

### 2.4 Issue 4: Voice AI Dataset Provenance & Counting

#### The Discrepancy
The register previously documented 26 audio clips without differentiating unique sentences from repeat speakers.

#### Forensic Execution Verification
We inspected `05_Bangla_Voice_AI/pretrained_bengali_comparison/task_03_2/per_sample_predictions.csv`:
- Total Rows: **26 audio clips** ($26\text{ .wav files}$).
- Unique `reference_text` strings: **22 unique sentences**.
- Unique `speaker_id`s: **22 unique speakers**.
- **Speaker Distribution:**
  - Speaker `1530`: 3 audio clips (`1530_319.wav`, `1530_320.wav`, `1530_321.wav`).
  - Speaker `1552`: 3 audio clips (`1552_322.wav`, `1552_323.wav`, `1552_324.wav`).
  - Remaining 20 speakers: 1 audio clip each.
  - Total: $3 + 3 + 20 = 26$ audio clips.

The register is corrected to explicitly specify: **26 total audio clips across 22 unique reference sentences and 22 unique speakers**.

---

### 2.5 Issue 5: PCOS Clinical Canonical Manifest & Verification Scope

#### The Discrepancy
In `correction_v2/DATASET_SPLIT_RECONCILIATION.csv`, the manifest path was recorded as `01_PCOS_Clinical/data/processed/clean_pcos_clinical.csv`, which returned `FILE_NOT_FOUND` because the filename had inverted wording. Additionally, the verification script description over-generalized its test scope.

#### Forensic Path & Binary Verification
The canonical processed file on disk is:
- **Canonical Path:** `01_PCOS_Clinical/data/processed/pcos_clinical_cleaned.csv`
- **File Size:** **`11,919` bytes**
- **SHA-256 Checksum:** **`3e38331357da3c4d4501f93e30bb4c5e5acbb3ee0eac23d50035d30b2c5a4661`**
- **Row Count:** Exactly 88 rows (88 clinical patient records).
- **Raw Origin:** `01_PCOS_Clinical/data/raw/vitD_donnees_2022Mai.xlsx` ($21,290$ bytes, SHA-256: `15c836407feac3f09430fe4dbd09ef00bf026c61d8b4265e9e3c8c9cf3dabc3f`).

#### Verification Script Scope Clarification
The read-only verification script is explicitly designated as a **targeted cryptographic and dataset consistency test suite**. It validates file presence, byte sizes, SHA-256 checksums, and manifest counts. It does not perform full end-to-end retraining of deep learning models, avoiding over-claims of reproduction.

---

## 3. Summary of Deliverables in `final_lock/`

All finalized deliverables are generated in `SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/final_lock/`:

1. [FINAL_EVIDENCE_RECONCILIATION.md](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/final_lock/FINAL_EVIDENCE_RECONCILIATION.md) — This comprehensive reconciliation document.
2. [DERMOPED_PATIENT_CHECKPOINT_VERIFICATION.csv](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/final_lock/DERMOPED_PATIENT_CHECKPOINT_VERIFICATION.csv) — Exact patient breakdowns (19 CPX, 3 Pediculosis) and checkpoint hashes for EXP_B, EXP_D, EXP_A.
3. [CORRECTED_DATASET_COUNTS.csv](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/final_lock/CORRECTED_DATASET_COUNTS.csv) — Authoritative unit counts, grouping levels, and leakage audits across all 6 modules.
4. [FINAL_RESEARCH_MODEL_REGISTER.csv](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/final_lock/FINAL_RESEARCH_MODEL_REGISTER.csv) — Complete 16-model inventory with corrected paths, hashes, and data descriptors.
5. [FINAL_AUDIT_SIGNOFF.md](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/final_lock/FINAL_AUDIT_SIGNOFF.md) — Formal audit freeze statement authorizing progression to application development.
6. [verify_final_lock.py](file:///F:/Clude%20cccccccccccccccccccc/data%20we%20test/SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/final_lock/verify_final_lock.py) — Read-only Python verification script containing 7 automated assertion suites.
