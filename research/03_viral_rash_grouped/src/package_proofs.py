import os
import json
import zipfile
import pandas as pd

BASE_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\03_Measles_Viral_Rash"
METRICS_PATH = os.path.join(BASE_DIR, "outputs", "metrics.json")
GROUPED_METRICS_PATH = os.path.join(BASE_DIR, "outputs", "grouped_metrics.json")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
PROOFS_DIR = os.path.join(BASE_DIR, "proofs")
MODELS_DIR = os.path.join(BASE_DIR, "models")

with open(METRICS_PATH, "r", encoding="utf-8") as f:
    hist_metrics = json.load(f)

with open(GROUPED_METRICS_PATH, "r", encoding="utf-8") as f:
    grouped_metrics = json.load(f)

resnet_grp = grouped_metrics["resnet18"]
mobilenet_grp = grouped_metrics["mobilenet_v3_small"]

hist_best = hist_metrics["selected_best_model"]
hist_best_data = hist_metrics["models_evaluated"][hist_best]
hist_measles = hist_metrics["measles_specific_metrics"]

# Generate model_card.md
model_card_content = f"""# Model Card: Measles & Multi-Class Viral Skin Lesion Classifier
## ShasthoSetu AI — Vision Research Module (03_Measles_Viral_Rash)
### Dual Benchmark: Corrected Group-Isolated Split (Primary) vs. Historical Image-Level Split (Contaminated Baseline)

---

### 1. Model Details & Hardware Environment
- **Active Model Checkpoint (Primary):** `models/resnet18_grouped_best.pth` (PyTorch ResNet18 trained with source-family group isolation)
- **Secondary Baseline Checkpoint:** `models/mobilenet_v3_small_grouped_best.pth`
- **Historical Benchmark Checkpoint (Contaminated):** `models/resnet18_best.pth`
- **Architecture:** Deep CNN initialized with ImageNet pretrained weights, fine-tuned with cost-sensitive Cross-Entropy loss.
- **Task:** 6-Class Differential Viral Skin Lesion Screening:
  1. `Chickenpox` (Varicella-Zoster Virus)
  2. `Cowpox` (Orthopoxvirus)
  3. `HFMD` (Hand, Foot, and Mouth Disease — Enterovirus/Coxsackie)
  4. `Healthy` (Dermatological controls)
  5. `Measles` (Morbillivirus — Primary pediatric surveillance target)
  6. `Monkeypox` (Mpox — Clade I/II Orthopoxvirus)
- **Dataset Provenance:** Multi-Class Viral Skin Lesion Dataset (MCVSLD, Mendeley Data `dfztdtfsxz/1`, DOI: `10.17632/dfztdtfsxz.1`)
- **Dataset Authors:** Kazi Rifat Ahmed, Md. Mazbaur Rashid, Suprove Chandra Sarkar, Mujahidul Islam (Daffodil International University, Bangladesh, Dec 2024)
- **License:** Creative Commons Attribution 4.0 International (`CC BY 4.0`)
- **Hardware Platform:** NVIDIA GeForce RTX 5060 Ti 16GB VRAM (CUDA 12.8 / sm_120)

---

### 2. Forensic Discovery: Historical Crop-Level Data Leakage
A critical forensic investigation of `clean_split_manifest.csv` revealed that filenames contain tokens: `[CLASS]_[CASE]_[PHOTO]_[CROP].jpg` (e.g., `HFMD_131_01.jpg` vs `HFMD_131_01_8.jpg`).
- **755 Source-Family Photographs:** All 10,384 clean unique images derive from only 755 original source-family photographs (average 13.75 crops/family).
- **100% Test Contamination in Historical Image Split:** 
  - In the historical random stratified split, **748 / 755 families (99.07%) spanned multiple splits**.
  - **1,558 / 1,558 test images (100.0%)** and **114 / 114 Measles test images (100.0%)** had counterpart crops in the training split!
  - Therefore, the historical 99.10% accuracy represented **overfitted crop memorization**, not independent clinical generalization.
- **Remediation:** Partitioned by source-family ID (`clean_grouped_split_manifest.csv`) with **0.0% source-family overlap** across Train (528 families / 7,279 images), Val (113 families / 1,544 images), and Test (114 families / 1,561 images).

---

### 3. Evaluated Performance: Dual Benchmark Comparison

| Metric | Corrected Group-Isolated (ResNet18 Winner) | Corrected Group-Isolated (MobileNetV3) | Historical Image-Level (ResNet18 - Contaminated) |
| :--- | :---: | :---: | :---: |
| **Split Methodology** | **Source-Family Grouped (0% Overlap)** | **Source-Family Grouped (0% Overlap)** | Random Stratified (100% Crop Leakage) |
| **Test Image Accuracy** | **{resnet_grp['test_accuracy']:.2f}%** | {mobilenet_grp['test_accuracy']:.2f}% | 99.10% (Memorized) |
| **Test Balanced Accuracy** | **{resnet_grp['test_balanced_accuracy']:.2f}%** | {mobilenet_grp['test_balanced_accuracy']:.2f}% | 98.92% (Memorized) |
| **Test Macro F1** | **{resnet_grp['test_macro_f1']:.2f}%** | {mobilenet_grp['test_macro_f1']:.2f}% | 99.12% (Memorized) |
| **Measles Crop Recall** | **{resnet_grp['class_recalls_percent']['Measles']:.2f}% ({resnet_grp['measles_crops_detected']})** | {mobilenet_grp['class_recalls_percent']['Measles']:.2f}% ({mobilenet_grp['measles_crops_detected']}) | 96.49% (110/114) |
| **Family-Level Majority Accuracy** | **{resnet_grp['family_level_accuracy']:.2f}% (97/114 families)** | {mobilenet_grp['family_level_accuracy']:.2f}% (98/114 families) | N/A (Families fragmented) |
| **Family-Level Macro F1** | **{resnet_grp['family_level_macro_f1']:.2f}%** | {mobilenet_grp['family_level_macro_f1']:.2f}% | N/A |
| **Measles Family Recall** | **{resnet_grp['measles_families_detected']} ({float(resnet_grp['measles_families_detected'].split('/')[0])/float(resnet_grp['measles_families_detected'].split('/')[1])*100:.1f}%)** | {mobilenet_grp['measles_families_detected']} ({float(mobilenet_grp['measles_families_detected'].split('/')[0])/float(mobilenet_grp['measles_families_detected'].split('/')[1])*100:.1f}%) | N/A |

#### Class Recalls on Unseen Patient/Source Families (ResNet18 N=1,561 crops):
- `Chickenpox`: {resnet_grp['class_recalls_percent']['Chickenpox']:.2f}%
- `Cowpox`: {resnet_grp['class_recalls_percent']['Cowpox']:.2f}%
- `HFMD`: {resnet_grp['class_recalls_percent']['HFMD']:.2f}%
- `Healthy`: {resnet_grp['class_recalls_percent']['Healthy']:.2f}%
- `Measles`: {resnet_grp['class_recalls_percent']['Measles']:.2f}% ({resnet_grp['measles_crops_detected']} detected)
- `Monkeypox`: {resnet_grp['class_recalls_percent']['Monkeypox']:.2f}%

---

### 4. Clinical Safety, Regulatory Scope & Boundaries
- **Assistive Triage Screening Only:** This pipeline serves strictly as an automated image-screening decision-support aid.
- **Definitive Diagnosis Requirement:** A medical diagnosis of measles requires physical examination (buccal Koplik spots, prodromal fever, conjunctivitis) and laboratory serology (Measles IgM or RT-PCR).
- **Module Independence:** Completely independent from `01_PCOS_Clinical` (tabular) and `02_PCOS_Ultrasound` (ovarian ultrasound).
"""

with open(os.path.join(PROOFS_DIR, "model_card.md"), "w", encoding="utf-8") as f:
    f.write(model_card_content)

# Generate experiment_summary.md
summary_content = f"""# Experiment Summary: Measles & Viral Skin Lesions Vision Pipeline
## ShasthoSetu AI — Vision Research Module (03_Measles_Viral_Rash)

---

### 1. Executive Summary
- **Research Goal:** Construct a leak-free deep learning screening classifier for 6 viral skin conditions on NVIDIA GeForce RTX 5060 Ti GPU.
- **Dataset:** Multi-Class Viral Skin Lesion Dataset (MCVSLD, Mendeley Data `dfztdtfsxz/1`, CC BY 4.0).
- **Clean Unique Images:** 10,384 images across 6 classes (Chickenpox: 1,011, Cowpox: 918, HFMD: 2,239, Healthy: 1,578, Measles: 761, Monkeypox: 3,877).
- **Critical Audit & Resolution:**
  - Initial SHA-256 deduplication purged 305 cross-split duplicate hashes from the author's archive.
  - Subsequent forensic analysis identified that all 10,384 images originate from 755 source-family photographs. In the historical image split, 100% of test images (1,558/1,558) shared source families with training images, producing an overfitted 99.10% accuracy.
  - Re-split into 528 Train, 113 Val, and 114 Test source families with 0% family overlap.
- **Winner Architecture:** **ResNet18** (Selected via Val Macro F1 = {resnet_grp['best_val_macro_f1']:.2f}%).

---

### 2. Key Results (Corrected Source-Family Grouped Split)
- **Held-Out Test Accuracy (Image Crops N=1,561):** **{resnet_grp['test_accuracy']:.2f}%**
- **Held-Out Test Balanced Accuracy:** **{resnet_grp['test_balanced_accuracy']:.2f}%**
- **Held-Out Test Macro F1:** **{resnet_grp['test_macro_f1']:.2f}%**
- **Per-Family Majority Vote Accuracy (N=114 families):** **{resnet_grp['family_level_accuracy']:.2f}%** (97/114 correct)
- **Per-Family Macro F1:** **{resnet_grp['family_level_macro_f1']:.2f}%**
- **Measles Detection (Unseen Families):** **{resnet_grp['class_recalls_percent']['Measles']:.2f}%** ({resnet_grp['measles_crops_detected']} crops) and **{resnet_grp['measles_families_detected']} source families**.

---

### 3. Historical vs. Corrected Dual Benchmark
- **Historical (Contaminated Image-Level):** 99.10% Accuracy, 99.12% Macro F1 (100% crop-level leakage).
- **Corrected (Group-Isolated Source-Family):** 83.34% Accuracy, 85.09% Bal Acc, 82.62% Macro F1, 85.09% Family Acc.
- **Conclusion:** Eliminating source-family leakage reveals the true un-inflated generalization capability on genuine unseen lesions.
"""

with open(os.path.join(PROOFS_DIR, "experiment_summary.md"), "w", encoding="utf-8") as f:
    f.write(summary_content)

# Assemble PROOFS.zip
proof_zip_path = os.path.join(PROOFS_DIR, "PROOFS.zip")
files_to_pack = [
    # Models
    ("models/resnet18_grouped_best.pth", "models/resnet18_grouped_best.pth"),
    ("models/mobilenet_v3_small_grouped_best.pth", "models/mobilenet_v3_small_grouped_best.pth"),
    ("models/resnet18_best.pth", "models/resnet18_best.pth"),
    ("models/mobilenet_v3_small_best.pth", "models/mobilenet_v3_small_best.pth"),
    # Scripts
    ("configs/config.json", "configs/config.json"),
    ("reproduce.ps1", "reproduce.ps1"),
    ("src/inspect_and_audit.py", "src/inspect_and_audit.py"),
    ("src/split_data.py", "src/split_data.py"),
    ("src/train_vision.py", "src/train_vision.py"),
    ("src/split_grouped_data.py", "src/split_grouped_data.py"),
    ("src/train_grouped_vision.py", "src/train_grouped_vision.py"),
    ("src/package_proofs.py", "src/package_proofs.py"),
    # Manifests
    ("data/processed/clean_grouped_split_manifest.csv", "data/processed/clean_grouped_split_manifest.csv"),
    ("data/processed/clean_split_manifest.csv", "data/processed/clean_split_manifest.csv"),
    ("data/processed/dataset_manifest.csv", "data/processed/dataset_manifest.csv"),
    # Outputs & Metrics
    ("outputs/grouped_metrics.json", "outputs/grouped_metrics.json"),
    ("outputs/metrics.json", "outputs/metrics.json"),
    ("outputs/grouped_test_predictions_resnet18.csv", "outputs/grouped_test_predictions_resnet18.csv"),
    ("outputs/grouped_family_predictions_resnet18.csv", "outputs/grouped_family_predictions_resnet18.csv"),
    ("outputs/dataset_profile.json", "outputs/dataset_profile.json"),
    ("outputs/clean_split_summary.csv", "outputs/clean_split_summary.csv"),
    ("outputs/classification_report.csv", "outputs/classification_report.csv"),
    ("outputs/test_predictions.csv", "outputs/test_predictions.csv"),
    ("outputs/confusion_matrix.png", "outputs/confusion_matrix.png"),
    ("outputs/training_curves.png", "outputs/training_curves.png"),
    ("outputs/gradcam_visualizations.png", "outputs/gradcam_visualizations.png"),
    # Proof documents
    ("proofs/model_card.md", "model_card.md"),
    ("proofs/experiment_summary.md", "experiment_summary.md"),
    ("proofs/dataset_audit_report.md", "dataset_audit_report.md"),
    ("proofs/provenance_and_rights_audit.md", "provenance_and_rights_audit.md"),
    ("logs/experiment_log.txt", "logs/experiment_log.txt")
]

print(f"Packaging PROOFS.zip at {proof_zip_path}...")
with zipfile.ZipFile(proof_zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
    for rel_src, arcname in files_to_pack:
        full_src = os.path.join(BASE_DIR, rel_src)
        if os.path.exists(full_src):
            zf.write(full_src, arcname)
            print(f"  Added {arcname} ({os.path.getsize(full_src)} bytes)")
        else:
            print(f"  WARNING: Missing {full_src}")

print(f"PROOFS.zip created successfully: {os.path.getsize(proof_zip_path)} bytes.")
