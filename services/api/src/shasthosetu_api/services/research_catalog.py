from __future__ import annotations

import csv
from pathlib import Path
from typing import Any

from ..config import FINAL_LOCK_DIR


def _read_csv(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


_MODEL_DOSSIERS: dict[str, dict[str, Any]] = {
    "pcos-clinical": {
        "slug": "pcos-clinical",
        "module_code": "01_PCOS_Clinical",
        "title": "PCOS Clinical AI (Tabular Endocrine & Anthropometric)",
        "title_bn": "পিসিওএস ক্লিনিকাল এআই (হরমোন ও মেটাবলিক)",
        "champion_model_id": "M01-XGB-01",
        "health_service_tool_url": "/services?tool=pcos-clinical",
        "accent": "#38bdf8",
        "is_deferred": False,
        "dataset_summary": "Mendeley Clinical PCOS Tabular Cohort (vitD_donnees_2022Mai.xlsx -> pcos_clinical_cleaned.csv) with 88 true unique patient records and 20 structured clinical, anthropometric, lipid & hormone variables.",
        "class_distribution": [
            {"label": "PCOS Positive (Cohort Pool)", "count": 44, "pct": 50.0, "color": "#38bdf8"},
            {"label": "Control / Non-PCOS (Cohort Pool)", "count": 44, "pct": 50.0, "color": "#2dd4bf"},
        ],
        "preprocessing_steps": [
            "Sanitized raw Excel schema to canonical UTF-8 CSV (pcos_clinical_cleaned.csv, 11,919 bytes, SHA-256 3e38...4661).",
            "Isolated 18 patients (9 PCOS / 9 Control) cleanly prior to cross-validation.",
            "Median SimpleImputer embedded inside Scikit-Learn / XGBoost inference pipeline for safe missing-feature handling.",
        ],
        "split_breakdown": [
            {"split": "Development Pool (50-Fold Repeated Stratified CV)", "units": "70 patients", "groups": "70 unique subjects", "overlap": "0%"},
            {"split": "Isolated Held-Out Test Set", "units": "18 patients (9/9)", "groups": "18 unique subjects", "overlap": "0%"},
        ],
        "architecture_specs": {
            "primary_architecture": "Gradient Boosted Decision Trees (XGBClassifier)",
            "features_count": "20 continuous endocrine / metabolic / anthropometric columns",
            "imputation": "Embedded Median SimpleImputer inside joblib pipeline",
            "artifact_path": "01_PCOS_Clinical/models/model_best.joblib (101,887 bytes)",
        },
        "evaluation_metrics": [
            {"name": "Held-Out Test Balanced Accuracy", "value": "94.44% (17/18)", "note": "Isolated N=18 subject holdout"},
            {"name": "Held-Out Macro F1 Score", "value": "94.43%", "note": "Balanced class weighting"},
            {"name": "Repeated 5-Fold CV Balanced Acc", "value": "88.57%", "note": "50 repeats x 5 folds on N=70"},
            {"name": "Confusion Outcome (Held-Out N=18)", "value": "17 Correct / 1 Miss", "note": "Detailed TN/FP/FN per fold logged in audit_v2"},
        ],
        "leakage_audit": "Zero cross-split patient overlap verified via True Subject ID tracking in audit_v2.",
        "code_methodology": "01_PCOS_Clinical/audit_v2/src/train_audit.py compares XGBoost, Random Forest, and L2 Logistic Regression across repeated stratified folds before serializing model_best.joblib.",
        "limitations": [
            "Small cohort size (N=88 total; 18 held-out test patients) can cause metric variance across demographic shifts.",
            "Does not incorporate ovarian ultrasound morphology — kept strictly separate from M02 Ultrasound per Rotterdam guidelines.",
            "Research benchmark only; never stands alone as a clinical PCOS diagnosis.",
        ],
        "safety_boundary": "NON-DIAGNOSTIC RESEARCH PREVIEW. Final PCOS diagnosis requires formal Rotterdam criteria confirmation by an OB-GYN clinician.",
    },
    "pcos-ultrasound": {
        "slug": "pcos-ultrasound",
        "module_code": "02_PCOS_Ultrasound",
        "title": "PCOS Ovarian Ultrasound AI (Morphology Vision)",
        "title_bn": "পিসিওএস আল্ট্রাসাউন্ড এআই (PCOM মরফোলজি)",
        "champion_model_id": "M02-RESNET-01",
        "health_service_tool_url": "/services?tool=pcos-ultrasound",
        "accent": "#2dd4bf",
        "is_deferred": False,
        "dataset_summary": "Deduplicated Kaggle/Mendeley Ovarian Ultrasound Image Pool clustered by perceptual hashing (pHash/dHash Hamming <= 6) into 299 unique images across 289 pseudo-patients.",
        "class_distribution": [
            {"label": "Dominant Follicle", "count": 142, "pct": 47.49, "color": "#2dd4bf"},
            {"label": "PCO Morphology", "count": 116, "pct": 38.80, "color": "#38bdf8"},
            {"label": "Normal Morphology", "count": 41, "pct": 13.71, "color": "#818cf8"},
        ],
        "preprocessing_steps": [
            "pHash/dHash perceptual clustering to collapse duplicate frames from the same probe sweep into 289 pseudo-patient clusters.",
            "224x224 RGB tensor resize & ImageNet normalization matching torchvision ResNet18 backbone.",
            "Strict pseudo-patient isolation across 15-fold GroupKFold development & 45-image isolated test set.",
        ],
        "split_breakdown": [
            {"split": "Group CV Development Pool", "units": "254 images", "groups": "244 pseudo-patients", "overlap": "0%"},
            {"split": "Isolated Held-Out Test Set", "units": "45 images", "groups": "45 pseudo-patients", "overlap": "0%"},
        ],
        "architecture_specs": {
            "primary_architecture": "ResNet18 CNN (fine-tuned ImageNet backbone)",
            "secondary_compared": "MobileNetV3-Small CNN (80.00% test acc)",
            "classes": "3 Sonographic Classes (PCOM, Dominant Follicle, Normal)",
            "artifact_path": "02_PCOS_Ultrasound/models/resnet18_best.pth (44,792,203 bytes)",
        },
        "evaluation_metrics": [
            {"name": "Held-Out Test Accuracy", "value": "86.67% (39/45)", "note": "Isolated 45-scan holdout"},
            {"name": "Held-Out Macro F1 Score", "value": "87.70%", "note": "3-class balanced evaluation"},
            {"name": "15-Fold Group CV Accuracy", "value": "85.42%", "note": "244 pseudo-patient groups"},
            {"name": "MobileNetV3-Small Comparator", "value": "80.00% (36/45)", "note": "82.46% Macro F1"},
        ],
        "leakage_audit": "Zero pseudo-patient leakage after perceptual clustering, verified against split_manifest.csv (SHA-256 4118...1cec).",
        "code_methodology": "Perceptual deduplication + 15-fold GroupKFold CV + isolated 45-scan evaluation separating PCOM morphology from clinical PCOS syndrome.",
        "limitations": [
            "True hospital patient IDs were absent in the raw Kaggle/Mendeley source; grouping relied on pHash/dHash pseudo-patients.",
            "Ovarian PCOM morphology alone does not equal PCOS syndrome (requires hormone & menstrual history).",
            "Limited Bangladesh local ultrasound hardware variance coverage.",
        ],
        "safety_boundary": "SONOGRAPHIC MORPHOLOGY PREVIEW ONLY. Must be reviewed alongside clinical/endocrine workup by a gynecologist or radiologist.",
    },
    "viral-rash": {
        "slug": "viral-rash",
        "module_code": "03_Measles_Viral_Rash (Grouped)",
        "title": "Viral Rash Vision AI (755-Family Leak-Free MCVSLD)",
        "title_bn": "ভাইরাল র‍্যাশ ভিশন এআই (৭৫৫-ফ্যামিলি নিরীক্ষিত)",
        "champion_model_id": "M03-RESNET-GROUPED-01",
        "health_service_tool_url": "/services?tool=viral-rash",
        "accent": "#818cf8",
        "is_deferred": False,
        "dataset_summary": "MCVSLD (Monkeypox, Chickenpox, Measles, HFMD, Cowpox, Healthy) forensic re-split into 755 unique source-photo families comprising 10,384 augmented/cropped images with 0% cross-split family leakage.",
        "class_distribution": [
            {"label": "Chickenpox", "count": 100, "pct": 16.7, "color": "#38bdf8"},
            {"label": "Measles", "count": 100, "pct": 16.7, "color": "#818cf8"},
            {"label": "HFMD", "count": 100, "pct": 16.7, "color": "#2dd4bf"},
            {"label": "Cowpox", "count": 100, "pct": 16.7, "color": "#f2c879"},
            {"label": "Monkeypox", "count": 100, "pct": 16.7, "color": "#c084fc"},
            {"label": "Healthy Skin", "count": 100, "pct": 16.7, "color": "#34d399"},
        ],
        "preprocessing_steps": [
            "Forensic audit discovered random crop splits leaked 686/755 photo families between train and test (inflating legacy accuracy to 99.10%).",
            "Quarantined historical contaminated checkpoints (resnet18_best.pth 99.10%, mobilenet_v3_small_best.pth 98.20%).",
            "Enforced clean 70/15/15 grouped source-family partitioning (clean_grouped_split_manifest.csv).",
        ],
        "split_breakdown": [
            {"split": "Train Families (~70%)", "units": "7,279 crops", "groups": "528 source families", "overlap": "0%"},
            {"split": "Validation Families (~15%)", "units": "1,544 crops", "groups": "113 source families", "overlap": "0%"},
            {"split": "Test Families (~15%)", "units": "1,561 crops", "groups": "114 source families", "overlap": "0%"},
        ],
        "architecture_specs": {
            "primary_architecture": "ResNet18 Grouped CNN (224x224, 6 softmax logits)",
            "secondary_compared": "MobileNetV3-Small Grouped (81.15% Img Acc / 86.73% Family Acc)",
            "statistical_test": "Paired McNemar test p = 1.000 between ResNet18 & MobileNetV3 grouped",
            "artifact_path": "03_Measles_Viral_Rash/models/resnet18_grouped_best.pth (44,799,435 bytes)",
        },
        "evaluation_metrics": [
            {"name": "Grouped Val Image Accuracy", "value": "84.65%", "note": "113 source families / 1,544 crops"},
            {"name": "Grouped Val Family Accuracy", "value": "85.84%", "note": "Aggregated by source family"},
            {"name": "Grouped Macro F1 Score", "value": "84.22%", "note": "6-class balanced metric"},
            {"name": "Measles Sensitivity / Recall", "value": "91.94%", "note": "Critical outbreak surveillance focus"},
            {"name": "Quarantined Leaky Baseline", "value": "99.10% (INVALID)", "note": "Preserved only as contamination proof"},
        ],
        "leakage_audit": "Verified 0% intersection across all 755 source-photo families in verify_final_lock.py Test 6.",
        "code_methodology": "Root image identifier extractor groups augmented variants before Train/Val/Test assignment, ensuring unseen lesion appearances at evaluation.",
        "limitations": [
            "Non-Bangladesh primary imagery may under-represent Fitzpatrick IV-V skin tones and rural mobile camera lighting.",
            "Softmax probabilities reflect relative fit across 6 trained classes only; ignores non-viral dermatoses (eczema, bacterial impetigo, fungal tinea).",
        ],
        "safety_boundary": "RESEARCH BENCHMARK ONLY — NON-DIAGNOSTIC. Never substitute image classification for dermatologist or pediatrician clinical examination.",
    },
    "prescription-ocr": {
        "slug": "prescription-ocr",
        "module_code": "04_Prescription_OCR (Full Dataset)",
        "title": "Human-Gated Safe Prescription OCR Pipeline",
        "title_bn": "প্রেসক্রিপশন ওসিআর ও HTTP 422 মানব-যাচাই গেট",
        "champion_model_id": "M04-EASYOCR-PIPELINE-01",
        "health_service_tool_url": "/services?tool=prescription-ocr",
        "accent": "#f2c879",
        "is_deferred": False,
        "dataset_summary": "Mendeley Doctor Prescription Dataset (Gazipur, Bangladesh) totaling 1,000 handwritten/printed documents reconciled into 992 admissible rows and 8 quarantined corrupt/unannotated rows (including 0747.jpeg).",
        "class_distribution": [
            {"label": "Admissible Annotated Rx", "count": 992, "pct": 99.2, "color": "#f2c879"},
            {"label": "Quarantined / Unannotated", "count": 8, "pct": 0.8, "color": "#fb7185"},
        ],
        "preprocessing_steps": [
            "Automated manifest quarantine check filtering unreadable or mismatched annotation rows (8 excluded).",
            "PDF page rendering via pypdf text layer + fallback image rasterization for mixed Bangla/English slips.",
            "Bounding-box token extraction via EasyOCR (bn+en) with per-token confidence scoring.",
        ],
        "split_breakdown": [
            {"split": "Train Corpus", "units": "697 Rx", "groups": "696 admissible + 1 quarantined (0674)", "overlap": "0%"},
            {"split": "Validation Corpus", "units": "150 Rx", "groups": "147 admissible + 3 quarantined (0676, 0729, 0775)", "overlap": "0%"},
            {"split": "Test Corpus + Unannotated", "units": "153 Rx", "groups": "149 admissible + 3 quarantined + 0747", "overlap": "0%"},
        ],
        "architecture_specs": {
            "primary_architecture": "CRAFT Text Detector + ResNet-CTC Recognizer (EasyOCR bn+en) + pypdf",
            "safety_gate": "SQLite CHECK constraint + FastAPI HTTP 422 UNVERIFIED_OCR_FIELDS lockout",
            "smoke_test_result": "Sample 0052.jpg extracted 44 bilingual tokens",
            "artifact_path": "Pretrained EasyOCR bn+en weights + runtime FastAPI Safe-OCR Gate",
        },
        "evaluation_metrics": [
            {"name": "Corpus Admissible Integrity", "value": "99.20% (992/1,000)", "note": "Quarantine manifest audited (Test 3)"},
            {"name": "Raw Transcription CER / WER", "value": "NOT_VALIDATED", "note": "Raw freeform ground-truth CER/WER not claimed"},
            {"name": "Aggregate Test Quarantine Flag", "value": "92.11% Flagged", "note": "Routes low-confidence slips to review"},
            {"name": "Auto-Reminder Prevention Rate", "value": "100% Blocked (HTTP 422)", "note": "Zero unverified schedules allowed"},
        ],
        "leakage_audit": "Document-level prescription ID split reconciled in split_manifest.csv (SHA-256 7883...1359) + QUARANTINE_MANIFEST_VERIFIED.json.",
        "code_methodology": "Extracts candidate bilingual lines + confidence tags; enforces DB schema constraint `CHECK (status NOT IN ('VERIFIED','ACTIVE') OR verified_by_user_id IS NOT NULL)`.",
        "limitations": [
            "Standard CER/WER string error rates across freeform handwritten Bangla cursive remain marked NOT_VALIDATED.",
            "Requires mandatory human confirmation of drug name, strength, dosage, and frequency before medication scheduling.",
        ],
        "safety_boundary": "HUMAN-IN-THE-LOOP MANDATORY. Automated OCR drafts never activate medication alarms without explicit patient or clinician confirmation.",
    },
    "bangla-voice": {
        "slug": "bangla-voice",
        "module_code": "05_Bangla_Voice_AI (Phase G Deferred)",
        "title": "Bangla Clinical Voice ASR Benchmark (FLEURS)",
        "title_bn": "বাংলা ভয়েস এআই ও FLEURS অ্যাকোস্টিক বেঞ্চমার্ক",
        "champion_model_id": "M05-WHISPER-SMALL-BN-03",
        "health_service_tool_url": "/services?tool=bangla-voice",
        "accent": "#c084fc",
        "is_deferred": True,
        "dataset_summary": "Zero local training performed; reproducible benchmark across 26 Google FLEURS human Bengali clips (22 unique reference sentences across 22 unique speakers) comparing Whisper Base, Tiny & Fine-tuned Whisper-Small-BN.",
        "class_distribution": [
            {"label": "Human Bengali Audio Clips", "count": 26, "pct": 100.0, "color": "#c084fc"},
            {"label": "Unique Speakers", "count": 22, "pct": 84.6, "color": "#38bdf8"},
        ],
        "preprocessing_steps": [
            "Resampled WAV utterances to 16 kHz mono PCM for sequence-to-sequence Transformer decoding.",
            "Normalized punctuation & Bengali Unicode normalization (bnorm) to compute Norm WER and Script Integrity %.",
            "Compared OpenAI Whisper-Base (74M), Whisper-Tiny (39M), and community anuragshas/whisper-small-bn (241.7M).",
        ],
        "split_breakdown": [
            {"split": "Training Split", "units": "0 clips (Zero local training)", "groups": "Externally trained Mozilla Common Voice 11 BN", "overlap": "0%"},
            {"split": "Evaluation Benchmark (FLEURS)", "units": "26 WAV clips", "groups": "22 unique sentences / 22 speakers", "overlap": "0%"},
        ],
        "architecture_specs": {
            "primary_architecture": "anuragshas/whisper-small-bn (Seq2Seq Transformer, 241.7M params)",
            "baselines_rejected": "openai/whisper-base (117.33%-242.83% BN WER, 0% Bengali script), whisper-tiny (227.78% WER)",
            "hardware_latency": "Mean ~2.14s per clip on RTX 5060 Ti",
            "governance_status": "AI-02 DEFERRED TO PHASE G per Master SRS v2.0",
        },
        "evaluation_metrics": [
            {"name": "Bengali Unicode Script Purity", "value": "98.37%", "note": "vs 0.00% on Whisper-Base & Tiny"},
            {"name": "Corpus Normalized WER", "value": "39.09%", "note": "Raw WER 45.62% on 26 human clips"},
            {"name": "Corpus Normalized CER", "value": "13.44%", "note": "Raw CER 14.58%"},
            {"name": "Gated Vivasoft HF Model", "value": "401 Gated Access", "note": "Excluded cleanly due to HF auth lock"},
        ],
        "leakage_audit": "Zero local training performed; strictly external FLEURS evaluation.",
        "code_methodology": "Reproducible benchmark script in task_03_2 computes Raw/Normalized WER, CER, and Unicode Bengali script ratio across models.",
        "limitations": [
            "39.09% WER is too noisy for autonomous drug-name dictation or live emergency triage.",
            "No Bengali medical named-entity recognition (NER) benchmark included in FLEURS clips.",
            "Live microphone capture & RAG clinical integration remain DEFERRED to Phase G.",
        ],
        "safety_boundary": "PHASE G DEFERRED — BENCHMARK PREVIEW ONLY. Live clinical audio transcription & RAG chatbot remain locked until Phase G abstention & domain safety gates pass.",
    },
    "dermoped": {
        "slug": "dermoped",
        "module_code": "06_DermoPed_Pediatric_Skin",
        "title": "DermoPed Pediatric Skin AI (22-Patient Isolated Cohort)",
        "title_bn": "ডার্মোপিড শিশু চর্মরোগ এআই (২২-রোগী কোহর্ট)",
        "champion_model_id": "M06-EXP-B-01",
        "health_service_tool_url": "/services?tool=dermoped",
        "accent": "#34d399",
        "is_deferred": False,
        "dataset_summary": "Patient-isolated 2-class subset from DermoPed Zenodo (656 skin region crops across 22 unique children: 19 Chickenpox and strictly 3 Pediculosis patients — patient72, patient71, patient74).",
        "class_distribution": [
            {"label": "Chickenpox (19 Patients)", "count": 575, "pct": 87.65, "color": "#38bdf8"},
            {"label": "Pediculosis (3 Patients: pt72/71/74)", "count": 81, "pct": 12.35, "color": "#f2c879"},
        ],
        "preprocessing_steps": [
            "Replaced random crop mixing with strict Patient ID isolation across Train (14), Val (4), and Test (4) subjects.",
            "Forged controlled ablation experiments (EXP_A weighted baseline, EXP_B controlled Champion, EXP_D over-regularized failure).",
            "Isolated SAM segmentation masks strictly away from diagnostic ground truth per FR-SKIN-04.",
        ],
        "split_breakdown": [
            {"split": "Train Patients", "units": "454 crops (414 CPX / 40 Ped)", "groups": "14 patients (13 CPX + pt72)", "overlap": "0%"},
            {"split": "Validation Patients", "units": "92 crops (72 CPX / 20 Ped)", "groups": "4 patients (3 CPX + pt71)", "overlap": "0%"},
            {"split": "Held-Out Test Patients", "units": "110 crops (89 CPX / 21 Ped)", "groups": "4 patients (3 CPX + pt74)", "overlap": "0%"},
        ],
        "architecture_specs": {
            "primary_architecture": "ResNet18 EXP_B Controlled v2 CNN",
            "rejected_ablation": "EXP_D Frozen Backbone Dropout 0.5 (Val Pediculosis Recall 0.00% — underfit)",
            "sha256_verified": "EXP_B: 5a98479c...f348da (44,790,027 bytes)",
            "artifact_path": "06_DermoPed_Pediatric_Skin/proofs/EXP_B/model_best.pth",
        },
        "evaluation_metrics": [
            {"name": "EXP_B Test Image Accuracy", "value": "92.73% (102/110)", "note": "Dominated by Chickenpox frames"},
            {"name": "EXP_B Test Macro F1", "value": "89.65%", "note": "4 held-out patients"},
            {"name": "EXP_B Test Patient Accuracy", "value": "75.00% (3/4)", "note": "Strict patient-level vote"},
            {"name": "EXP_B Val Pediculosis Recall", "value": "15.00% (Severe Limit)", "note": "Only 1 validation Pediculosis patient (pt71)"},
        ],
        "leakage_audit": "Verified 0% patient overlap across 22 unique subjects in verify_final_lock.py Tests 1 & 2.",
        "code_methodology": "Paired with deterministic pediatric red-flag triage rules (FR-PED-01..07) that escalate chest indrawing, infant fever, or lethargy regardless of image classifier output.",
        "limitations": [
            "SEVERE COHORT IMBALANCE: Only 3 Pediculosis patients (pt72 train, pt71 val, pt74 test) exist locally; full 19 GB Zenodo repository not present.",
            "Val Pediculosis recall of 15.00% confirms binary sensitivity cannot be generalized to minority pediatric lesions.",
            "EXP_D ablation rejected (0% Pediculosis validation recall).",
        ],
        "safety_boundary": "STRICTLY RESEARCH BENCHMARK + MANDATORY CLINICIAN REVIEW. Never replace pediatric physical assessment or red-flag emergency triage.",
    },
}


def get_model_detail_dossier(slug: str) -> dict[str, Any] | None:
    dossier = _MODEL_DOSSIERS.get(slug)
    if not dossier:
        return None
    register_rows = _read_csv(FINAL_LOCK_DIR / "FINAL_RESEARCH_MODEL_REGISTER.csv")
    dataset_rows = _read_csv(FINAL_LOCK_DIR / "CORRECTED_DATASET_COUNTS.csv")
    dermoped_rows = _read_csv(FINAL_LOCK_DIR / "DERMOPED_PATIENT_CHECKPOINT_VERIFICATION.csv")

    mod_prefix = dossier["module_code"].split(" ")[0]
    related_models = [r for r in register_rows if r.get("module", "").startswith(mod_prefix)]
    related_datasets = [r for r in dataset_rows if r.get("module", "").startswith(mod_prefix)]

    out = dict(dossier)
    out["related_register_models"] = related_models
    out["related_dataset_rows"] = related_datasets
    if slug == "dermoped":
        out["dermoped_checkpoint_verification"] = dermoped_rows
    return out
