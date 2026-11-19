import os
import json
import shutil
import hashlib

BASE_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\02_PCOS_Ultrasound"
RUNS_DIR = os.path.join(BASE_DIR, "runs")
os.makedirs(RUNS_DIR, exist_ok=True)

def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()

config_path = os.path.join(BASE_DIR, "configs", "config.json")
split_manifest_path = os.path.join(BASE_DIR, "data", "processed", "split_manifest.csv")
dataset_manifest_path = os.path.join(BASE_DIR, "data", "processed", "dataset_manifest.csv")

config_hash = sha256_file(config_path)
split_manifest_hash = sha256_file(split_manifest_path)
dataset_manifest_hash = sha256_file(dataset_manifest_path)

with open(os.path.join(BASE_DIR, "logs", "experiment_log.txt"), "r", encoding="utf-8") as f:
    full_log_lines = f.readlines()

runs_data = [
    {
        "run_id": "run_01_20261117_185545",
        "timestamp_start": "2026-11-17 18:55:45",
        "timestamp_end": "2026-11-17 18:56:16",
        "random_seed": 42,
        "config_sha256": config_hash,
        "split_manifest_sha256": split_manifest_hash,
        "dataset_manifest_sha256": dataset_manifest_hash,
        "device": "NVIDIA GeForce RTX 5060 Ti (15.93 GB VRAM)",
        "cuda_version": "12.8 / sm_120",
        "log_slice": "".join(full_log_lines[0:53]),
        "models": {
            "ResNet18": {
                "best_val_epoch": 8,
                "best_val_macro_f1": 0.7602,
                "test_accuracy": 0.8889,
                "test_balanced_accuracy": 0.8757,
                "test_macro_f1": 0.8929,
                "test_correct": "40/45",
                "early_stopping_epoch": 12
            },
            "MobileNetV3": {
                "best_val_epoch": 4,
                "best_val_macro_f1": 0.6491,
                "test_accuracy": 0.7333,
                "test_balanced_accuracy": 0.7302,
                "test_macro_f1": 0.7442,
                "test_correct": "33/45",
                "early_stopping_epoch": 8
            }
        },
        "selected_model": "ResNet18",
        "selection_metric": "Validation Macro F1 (0.7602 vs 0.6491)",
        "selection_rationale": "ResNet18 selected solely on higher validation Macro F1. Held-out test evaluated post-selection."
    },
    {
        "run_id": "run_02_20261117_185915",
        "timestamp_start": "2026-11-17 18:59:15",
        "timestamp_end": "2026-11-17 18:59:40",
        "random_seed": 42,
        "config_sha256": config_hash,
        "split_manifest_sha256": split_manifest_hash,
        "dataset_manifest_sha256": dataset_manifest_hash,
        "device": "NVIDIA GeForce RTX 5060 Ti (15.93 GB VRAM)",
        "cuda_version": "12.8 / sm_120",
        "log_slice": "".join(full_log_lines[53:110]),
        "models": {
            "ResNet18": {
                "best_val_epoch": 6,
                "best_val_macro_f1": 0.7650,
                "test_accuracy": 0.9333,
                "test_balanced_accuracy": 0.9127,
                "test_macro_f1": 0.9274,
                "test_correct": "42/45",
                "early_stopping_epoch": 10
            },
            "MobileNetV3": {
                "best_val_epoch": 2,
                "best_val_macro_f1": 0.6333,
                "test_accuracy": 0.6667,
                "test_balanced_accuracy": 0.6402,
                "test_macro_f1": 0.6594,
                "test_correct": "30/45",
                "early_stopping_epoch": 6
            }
        },
        "selected_model": "ResNet18",
        "selection_metric": "Validation Macro F1 (0.7650 vs 0.6333)",
        "selection_rationale": "ResNet18 selected based on validation performance. Note: While test accuracy reached 93.33%, selecting this run post-hoc based on test accuracy is scientifically prohibited (test selection bias)."
    },
    {
        "run_id": "run_03_20261117_190150",
        "timestamp_start": "2026-11-17 19:01:50",
        "timestamp_end": "2026-11-17 19:02:25",
        "random_seed": 42,
        "config_sha256": config_hash,
        "split_manifest_sha256": split_manifest_hash,
        "dataset_manifest_sha256": dataset_manifest_hash,
        "device": "NVIDIA GeForce RTX 5060 Ti (15.93 GB VRAM)",
        "cuda_version": "12.8 / sm_120",
        "log_slice": "".join(full_log_lines[110:]),
        "models": {
            "ResNet18": {
                "best_val_epoch": 5,
                "best_val_macro_f1": 0.7314,
                "test_accuracy": 0.8667,
                "test_balanced_accuracy": 0.8624,
                "test_macro_f1": 0.8770,
                "test_loss": 0.5443,
                "test_correct": "39/45",
                "early_stopping_epoch": 9,
                "confusion_matrix": [[17, 0, 4], [0, 5, 1], [1, 0, 17]],
                "per_class_recall": {"Dominant_Follicle": 0.8095, "Normal": 0.8333, "PCO": 0.9444}
            },
            "MobileNetV3": {
                "best_val_epoch": 11,
                "best_val_macro_f1": 0.7231,
                "test_accuracy": 0.8000,
                "test_balanced_accuracy": 0.8175,
                "test_macro_f1": 0.8246,
                "test_loss": 0.5126,
                "test_correct": "36/45",
                "early_stopping_epoch": 15,
                "confusion_matrix": [[13, 0, 8], [0, 5, 1], [0, 0, 18]],
                "per_class_recall": {"Dominant_Follicle": 0.6190, "Normal": 0.8333, "PCO": 1.0000}
            }
        },
        "selected_model": "ResNet18",
        "selection_metric": "Validation Macro F1 (0.7314 vs 0.7231)",
        "selection_rationale": "ResNet18 selected based on validation performance. This run generated the persisted weights resnet18_best.pth and mobilenetv3_best.pth in models/."
    }
]

for r in runs_data:
    r_dir = os.path.join(RUNS_DIR, r["run_id"])
    os.makedirs(r_dir, exist_ok=True)
    
    with open(os.path.join(r_dir, "run_info.json"), "w", encoding="utf-8") as f:
        json.dump(r, f, indent=2)
    with open(os.path.join(r_dir, "experiment_log.txt"), "w", encoding="utf-8") as f:
        f.write(r["log_slice"])

# For run_03, also link/copy the checkpoint and output files
r3_dir = os.path.join(RUNS_DIR, "run_03_20261117_190150")
shutil.copy2(os.path.join(BASE_DIR, "models", "resnet18_best.pth"), os.path.join(r3_dir, "resnet18_best.pth"))
shutil.copy2(os.path.join(BASE_DIR, "models", "mobilenetv3_best.pth"), os.path.join(r3_dir, "mobilenetv3_best.pth"))
shutil.copy2(os.path.join(BASE_DIR, "outputs", "confusion_matrix.png"), os.path.join(r3_dir, "confusion_matrix.png"))
shutil.copy2(os.path.join(BASE_DIR, "outputs", "training_curves.png"), os.path.join(r3_dir, "training_curves.png"))

# Create consolidated runs comparison
consolidated_comparison = {
    "dataset": "Ovarian Ultrasound Multi-Class Morphology Classification (Borna et al. 2025)",
    "hardware": "NVIDIA GeForce RTX 5060 Ti (16 GB VRAM)",
    "total_unique_images": 299,
    "runs_evaluated": [
        {
            "run_id": "run_01_20261117_185545",
            "model_selected": "ResNet18",
            "val_macro_f1": 0.7602,
            "test_accuracy": 0.8889,
            "test_balanced_accuracy": 0.8757,
            "test_macro_f1": 0.8929,
            "test_correct": "40/45"
        },
        {
            "run_id": "run_02_20261117_185915",
            "model_selected": "ResNet18",
            "val_macro_f1": 0.7650,
            "test_accuracy": 0.9333,
            "test_balanced_accuracy": 0.9127,
            "test_macro_f1": 0.9274,
            "test_correct": "42/45"
        },
        {
            "run_id": "run_03_20261117_190150 (persisted checkpoint)",
            "model_selected": "ResNet18",
            "val_macro_f1": 0.7314,
            "test_accuracy": 0.8667,
            "test_balanced_accuracy": 0.8624,
            "test_macro_f1": 0.8770,
            "test_correct": "39/45"
        }
    ],
    "held_out_test_aggregate": {
        "test_sample_size": 45,
        "mean_test_accuracy": 0.8963,
        "std_test_accuracy": 0.0339,
        "min_test_accuracy": 0.8667,
        "max_test_accuracy": 0.9333,
        "mean_test_macro_f1": 0.8991,
        "std_test_macro_f1": 0.0257
    },
    "repeated_stratified_group_cv": {
        "folds": 15,
        "groups": 246,
        "mean_val_balanced_accuracy": 0.8453,
        "std_val_balanced_accuracy": 0.0733,
        "mean_val_macro_f1": 0.8542,
        "std_val_macro_f1": 0.0653
    },
    "key_scientific_conclusions": [
        "In all 3 runs, ResNet18 consistently outperformed MobileNetV3 on validation Macro F1 (73.14%-76.50% vs 63.33%-72.31%).",
        "Held-out test accuracy ranges from 86.67% to 93.33% across runs due to small test set size (N=45, where 1 image = 2.22%).",
        "Selecting the 93.33% run post-hoc based on test accuracy is invalid (test-set selection bias). Run 3 (86.67% Acc, 87.70% Macro F1) is preserved as the active checkpoint.",
        "Repeated 15-fold Stratified Group Cross-Validation on development data (N=254) yields Mean Balanced Accuracy of 84.53% ± 7.33% and Mean Macro F1 of 85.42% ± 6.53% with zero group leakage.",
        "Normal class is severely constrained (41 total images, only 6 in test), leading to wide confidence intervals."
    ]
}

with open(os.path.join(BASE_DIR, "outputs", "runs_comparison.json"), "w", encoding="utf-8") as f:
    json.dump(consolidated_comparison, f, indent=2)
with open(os.path.join(BASE_DIR, "proofs", "runs_comparison.json"), "w", encoding="utf-8") as f:
    json.dump(consolidated_comparison, f, indent=2)

print("Preserved all 3 runs separately under runs/ and created consolidated comparison.")
