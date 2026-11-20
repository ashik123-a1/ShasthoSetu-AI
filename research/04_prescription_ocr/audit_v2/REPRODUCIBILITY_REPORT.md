# 🔁 ShasthoSetu AI — Reproducibility & MLOps Verification Report (Audit V2)

**Audit Version:** 2.0.0  
**Date:** 2026-11-18  
**Verification Level:** Full Local Reproducibility (Non-Zero Exit Code Enforced)  
**Host Architecture:** Windows 10 x64 | AMD Ryzen 9 / RTX 5060 Ti 16GB VRAM  

---

## 1. Computational Environment Specifications

All experiments, recalculations, and pipeline enhancements were executed in the shared virtual environment without reinstalling packages or disturbing sibling modules (PCOS, DermoPed, Measles):

| Component | Specification | Verification Source |
| :--- | :--- | :--- |
| **Python Environment** | Python 3.12.10 (CPython x64) | `F:\...\data we test\_shared\venv\Scripts\python.exe` |
| **PyTorch Framework** | PyTorch 2.11.0+cu128 | CUDA 12.8 with native Blackwell `sm_120` support |
| **GPU Accelerator** | NVIDIA GeForce RTX 5060 Ti | 15.93 GB Total GDDR7 VRAM, Device ID: 0 |
| **OCR Engine** | EasyOCR 1.7.2 | PyTorch CRAFT Detector + ResNet-BiLSTM Recognizer |
| **Metric Engines** | `jiwer` 4.0.0 & `scipy` 1.18.1 | Levenshtein character & word distance calculations |
| **Image Processing** | OpenCV 5.1.0 & Pillow 13.0.0 | CLAHE, bilateral filtering, and image decoding |

---

## 2. Inventory of Audited Scripts & Pipelines

The complete Audit V2 implementation is organized under `04_Prescription_OCR/audit_v2/`:

| Script Path | Primary Responsibility | Input Artifacts | Output Artifacts |
| :--- | :--- | :--- | :--- |
| `src/audit_safety_gate.py` | Phase 1: Revoke automated approval; enforce 100% human review | `outputs/test_predictions.csv` | `audit_v2/test_predictions_safety_audited.csv`, `safety_gate_audit.json` |
| `src/audit_annotations_integrity.py` | Phase 2: Inspect target stems (0174, 0185, 0186, 0674-0676, 0747, 0729, 0775, 0756, 0757) | Raw images & `Prescriptions_Dataset.csv` | `audit_v2/specific_stems_audit.json` |
| `src/build_corrected_manifest.py` | Phase 2: Rebuild master manifest with quarantine flags | `split_manifest.csv` | `audit_v2/corrected_annotation_manifest.csv` |
| `src/recalculate_ocr_metrics.py` | Phase 3: Recalculate corpus CER/WER, NFC normalization & confidence correlation | `test_predictions.csv`, `corrected_annotation_manifest.csv` | `audit_v2/OCR_METRICS_AUDITED.json`, `LANGUAGE_ERROR_ANALYSIS.csv` |
| `src/evaluate_improved_baseline.py` | Phase 4: Head-to-head comparison of Baseline v1 vs Enhanced v2 on Val split | Validation split images | `audit_v2/validation_model_comparison.json` |
| `src/structured_medical_parser.py` | Phase 5: Structured clinical entity parsing with provenance and fail-safe flags | `test_predictions.csv` | `audit_v2/structured_medication_extractions.json` |

---

## 3. End-to-End Reproduction Instructions

To execute the entire Audit V2 workflow sequentially from PowerShell:

```powershell
Set-Location "F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR\audit_v2"
powershell -ExecutionPolicy Bypass -File .\reproduce_audit_v2.ps1
```

The script executes all 6 phases sequentially, halts immediately on any error (`$ErrorActionPreference = "Stop"`), and logs verification digests.
