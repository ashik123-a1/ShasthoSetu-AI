# ShasthoSetu AI — End-to-End Reproducibility Checklist
**Verification Engine:** PowerShell Core 7 / Windows PowerShell on Microsoft Windows 11  
**Hardware Platform:** NVIDIA GeForce RTX 5060 Ti 16GB (Blackwell sm_120, Driver 596.36, CUDA 12.8)  
**Virtual Environment:** `_shared/venv/Scripts/python.exe` (Python 3.12, PyTorch 2.11.0+cu128)  
**Audit Date:** 2026-11-18  

---

## 1. Automated Execution Scripts Verification

Each module has a dedicated standalone PowerShell script verifying exit codes (`$LASTEXITCODE` check on every step):

| Module | Reproduction Script | Status | Execution Command |
| :--- | :--- | :---: | :--- |
| **01 PCOS Clinical** | [`01_PCOS_Clinical/reproduce.ps1`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/01_PCOS_Clinical/reproduce.ps1) | Verified | `powershell -ExecutionPolicy Bypass -File "01_PCOS_Clinical\reproduce.ps1"` |
| **02 PCOS Ultrasound** | [`02_PCOS_Ultrasound/reproduce.ps1`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/02_PCOS_Ultrasound/reproduce.ps1) | Verified | `powershell -ExecutionPolicy Bypass -File "02_PCOS_Ultrasound\reproduce.ps1"` |
| **03 Measles / Viral Rash** | [`03_Measles_Viral_Rash/proofs/reproduce.ps1`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/03_Measles_Viral_Rash/proofs/reproduce.ps1) | Verified | `powershell -ExecutionPolicy Bypass -File "03_Measles_Viral_Rash\proofs\reproduce.ps1"` |
| **04 Prescription OCR** | [`04_Prescription_OCR/reproduce.ps1`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/04_Prescription_OCR/reproduce.ps1) | Verified | `powershell -ExecutionPolicy Bypass -File "04_Prescription_OCR\reproduce.ps1"` |
| **05 Bangla Voice AI** | [`05_Bangla_Voice_AI/reproduce.ps1`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/05_Bangla_Voice_AI/reproduce.ps1) | Verified | `powershell -ExecutionPolicy Bypass -File "05_Bangla_Voice_AI\reproduce.ps1"` |
| **Master Report Generator** | [`_reports/generate_master_report.py`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/_reports/generate_master_report.py) | Verified | `& "_shared\venv\Scripts\python.exe" "_reports\generate_master_report.py"` |

---

## 2. Determinism & Random Seed Protocol

- **01_PCOS_Clinical:** `seed=42` passed to Scikit-Learn `RepeatedStratifiedKFold`, XGBoost `random_state=42`, and held-out `train_test_split`.
- **02_PCOS_Ultrasound:** `seed=42` passed to PyTorch `torch.manual_seed(42)`, `torch.cuda.manual_seed_all(42)`, and GroupShuffleSplit.
- **03_Measles_Viral_Rash:** `seed=42` applied to SHA-256 deduplicated array partitioning and PyTorch model weight initialization.
- **04_Prescription_OCR:** Deterministic stem matching algorithm; deterministic greedy beam decoding in EasyOCR.
- **05_Bangla_Voice_AI:** `seed=42` applied to speaker array shuffle; deterministic greedy decoding (`temperature=0.0`) in Whisper.

---

## 3. Data Integrity & File Checksums

All raw datasets and preprocessed split manifests are hashed and locked:
- **01 PCOS Clinical Data:** `data/raw/PCOS_data_without_infertility.xlsx`
- **02 PCOS Ultrasound Data:** `data/processed/clean_images/` (299 images, 24 near-duplicate pairs documented in `proofs/leakage_and_patient_overlap_audit.md`)
- **03 Measles Clean Data:** `data/processed/clean_dataset/` (10,384 images, 305 cross-split duplicate groups purged)
- **04 Prescription OCR Data:** `data/raw/` (997 matched images, 1,001 rows normalized in `split_manifest.csv`)
- **05 Bangla Voice AI Data:** `data/raw/extracted/dev/` (402 16kHz WAV files, 150 speakers partitioned in `split_manifest.csv`)
- **Master Proofs Package:** [`_reports/MASTER_PROOFS.zip`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/_reports/MASTER_PROOFS.zip) (98.72 MB)
