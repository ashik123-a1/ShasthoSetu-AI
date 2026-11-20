# 07 — SIX AI RESEARCH MODULES VERIFICATION

Audit of models M01 through M06, checkpoint deserialization, and frozen research hash-locks.

---

## 1. Module Verification Summary

| Module | Task | Model Architecture | Sample / Cohort Size | Checkpoint Status | Caveat & Disclosure |
|---|---|---|---|---|---|
| **M01** | PCOS Clinical | XGBoost Classifier | N=88 cohort (N=18 held-out test) | FROZEN LOCKED | `RESEARCH_PREVIEW_NON_DIAGNOSTIC` |
| **M02** | PCOS Ultrasound | ResNet18 Deep CNN | 78 clinical ultrasound scans | FROZEN LOCKED | Morphology only, not standalone Dx |
| **M03** | Viral Rash | ResNet18 Grouped | 755 patient families (zero leakage) | FROZEN LOCKED | Source-family split strictly preserved |
| **M04** | Prescription OCR | EasyOCR Bilingual | 1,000 prescriptions (992 admissible) | FROZEN LOCKED | Mandatory human clinician verification |
| **M05** | Bangla Voice AI | Whisper Small + gTTS | 26 clips / 22 speakers / FLEURS | FROZEN LOCKED | Transcript confirmation required |
| **M06** | DermoPed Skin | ResNet18 EXP_B | N=22 patients, 656 crops | FROZEN LOCKED | Small cohort limitation disclosed |

---

## 2. Model Deserialization Security
- PyTorch checkpoints loaded using `weights_only=True` where compatible.
- Checkpoint file paths restricted to local trusted model directories (`services/api/src/shasthosetu_api/models/`).
- Deserialization of arbitrary user-supplied model files is strictly prevented.
- All 7 read-only verification checks in `SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/final_lock/verify_final_lock.py` passed with 100% cryptographic hash matching.
