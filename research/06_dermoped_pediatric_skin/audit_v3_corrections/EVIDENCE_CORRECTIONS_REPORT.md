# DermoPed Evidence Corrections Report (Audit V3 Addendum)
**Module:** `06_DermoPed_Pediatric_Skin`  
**Location:** `06_DermoPed_Pediatric_Skin/audit_v3_corrections/`  
**Date:** November 18, 2026  
**Auditor:** Senior ML Research Auditor  

---

## 1. Resolution of Inconsistency 1: Checkpoint SHA-256 Hashes

In Audit V3, the narrative report contained mismatched hashes compared to `metric_recalculation.json`. We have forensically hashed each genuine `.pth` file directly on disk via `verify_provenance.py`:

| Experiment Checkpoint | Verified Path on Disk | File Size | Verified SHA-256 Checksum |
|---|---|---|---|
| **EXP_A (Baseline v1)** | `C:\Users\ASHIK_CSE\Downloads\Telegram Desktop\ShasthoSetu_DermoPed_Proofs\model_best.pth` | 44,789,963 bytes | `7db7f3132852261865930647da17b94ae454979e7832792709ec40950418514b` |
| **EXP_B (Controlled v2)** | `F:\Clude cccccccccccccccccccccccc\data we test\06_DermoPed_Pediatric_Skin\proofs\EXP_B\model_best.pth` | 44,790,027 bytes | `5a98479c66044e3a6ec244bad0133f0fd5a952e7123e53c567e2cdfe7ef348da` |
| **EXP_D (Regularized v3)** | `F:\Clude cccccccccccccccccccccccc\data we test\06_DermoPed_Pediatric_Skin\models\model_best.pth` | 44,787,896 bytes | `e9ef59b4bc6de88db6cdf7dd78fe775386baf428fcb3e8bd7ba5a63171f8ee67` |

These verified hashes are permanently exported in [provenance_hashes.json](file:///F:/Clude%20cccccccccccccccccccccc/data%20we%20test/06_DermoPed_Pediatric_Skin/audit_v3_corrections/provenance_hashes.json).

---

## 2. Resolution of Inconsistency 2: Patient Crop Counts

In previous narrative tables, per-patient crop counts were manually typed with errors (e.g., listing patient3 as 20 crops instead of 28).  
All crop counts have now been recalculated dynamically from `outputs/split_manifest.csv` without any manual entry:

### Validation Set (4 Patients, 92 Crops):
- `patient18` (Chickenpox): **13 crops** (Age 2, Pediatric)
- `patient20` (Chickenpox): **31 crops** (Age 3, Pediatric)
- `patient3` (Chickenpox): **28 crops** (Age 2, Pediatric)
  - *Chickenpox Validation Subtotal:* **72 crops**
- `patient71` (Pediculosis): **20 crops** (Age 1, Pediatric)
  - *Pediculosis Validation Subtotal:* **20 crops**
- **Total Validation Crops:** $72 + 20 = \mathbf{92\text{ crops}}$

### Held-out Test Set (4 Patients, 110 Crops):
- `patient2` (Chickenpox): **9 crops** (Age 15, Pediatric)
- `patient5` (Chickenpox): **40 crops** (Age 38, Adult)
- `patient8` (Chickenpox): **40 crops** (Age 1, Pediatric)
  - *Chickenpox Test Subtotal:* **89 crops**
- `patient74` (Pediculosis): **21 crops** (Age 42, Adult)
  - *Pediculosis Test Subtotal:* **21 crops**
- **Total Test Crops:** $89 + 21 = \mathbf{110\text{ crops}}$

### Training Set (14 Patients, 454 Crops):
- Chickenpox (13 Patients): `patient1` (40), `patient10` (40), `patient13` (5), `patient14` (11), `patient15` (40), `patient16` (28), `patient17` (40), `patient19` (27), `patient21` (40), `patient4` (23), `patient6` (40), `patient7` (40), `patient9` (40) = **414 crops**
- Pediculosis (1 Patient): `patient72` = **40 crops** (subsampled from 67 crops by config)
- **Total Training Crops:** $414 + 40 = \mathbf{454\text{ crops}}$

Exported directly to: [corrected_patient_splits.csv](file:///F:/Clude%20cccccccccccccccccccccc/data%20we%20test/06_DermoPed_Pediatric_Skin/audit_v3_corrections/corrected_patient_splits.csv).

---

## 3. Resolution of Inconsistency 3: Pediatric vs Unknown Demographics

Previous reports categorized `patient21` as `is_pediatric = True` despite `access_age == "unknown"`. We have replaced the binary flag with an explicit, rigorous 3-category classification:
- **Pediatric (Age $\le 18$):** **19 patients** (86.4%)
- **Adult (Age $> 18$):** **2 patients** (9.1% — `patient5` age 38, `patient74` age 42)
- **Unknown (Unverifiable Metadata):** **1 patient** (4.5% — `patient21` age "unknown")

---

## 4. Evidence Reproducibility Script
The script [verify_provenance.py](file:///F:/Clude%20cccccccccccccccccccccc/data%20we%20test/06_DermoPed_Pediatric_Skin/audit_v3_corrections/verify_provenance.py) independently regenerates all hashes, counts, and demographic labels directly from the filesystem and manifest in $< 1\text{ second}$.
