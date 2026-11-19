import os
import sys
import json
import time
import hashlib
import numpy as np
import pandas as pd
from PIL import Image

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import models, transforms
from sklearn.metrics import (
    accuracy_score, balanced_accuracy_score, precision_score,
    recall_score, f1_score, confusion_matrix, classification_report
)

BASE_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\03_Measles_Viral_Rash"
MANIFEST_PATH = os.path.join(BASE_DIR, "data", "processed", "clean_grouped_split_manifest.csv")
CONFIG_PATH = os.path.join(BASE_DIR, "configs", "config.json")
MODELS_DIR = os.path.join(BASE_DIR, "models")
OUTPUT_DIR = os.path.join(BASE_DIR, "model_selection_final")
os.makedirs(OUTPUT_DIR, exist_ok=True)

with open(CONFIG_PATH, "r", encoding="utf-8") as f:
    config = json.load(f)

CLASSES = config["classes"]
CLASS_TO_IDX = {c: i for i, c in enumerate(CLASSES)}
IDX_TO_CLASS = {i: c for i, c in enumerate(CLASSES)}

def compute_sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

class SkinLesionDataset(Dataset):
    def __init__(self, df, transform=None):
        self.df = df.reset_index(drop=True)
        self.transform = transform

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        img_path = os.path.join(BASE_DIR, row["relative_path"])
        image = Image.open(img_path).convert("RGB")
        label = CLASS_TO_IDX[row["class_label"]]
        if self.transform:
            image = self.transform(image)
        return image, label, row["filename"], row["family_id"]

eval_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

def evaluate_model(model, loader, device):
    model.eval()
    all_preds = []
    all_labels = []
    all_probs = []
    all_fnames = []
    all_fams = []

    with torch.no_grad():
        for images, labels, fnames, fams in loader:
            images = images.to(device)
            outputs = model(images)
            probs = torch.softmax(outputs, dim=1).cpu().numpy()
            preds = outputs.argmax(dim=1).cpu().numpy()

            all_preds.extend(preds)
            all_labels.extend(labels.numpy())
            all_probs.extend(probs)
            all_fnames.extend(fnames)
            all_fams.extend(fams)

    all_preds = np.array(all_preds)
    all_labels = np.array(all_labels)
    all_probs = np.array(all_probs)

    # Crop/Image-level metrics
    acc = accuracy_score(all_labels, all_preds)
    bal_acc = balanced_accuracy_score(all_labels, all_preds)
    f1_macro = f1_score(all_labels, all_preds, average="macro", zero_division=0)
    f1_weighted = f1_score(all_labels, all_preds, average="weighted", zero_division=0)
    cm = confusion_matrix(all_labels, all_preds)

    class_recalls = {}
    class_precisions = {}
    class_f1s = {}
    class_support = {}
    class_detected = {}

    for idx, c in enumerate(CLASSES):
        total_in_class = int(cm[idx].sum())
        correct_in_class = int(cm[idx, idx])
        class_support[c] = total_in_class
        class_detected[c] = correct_in_class
        class_recalls[c] = round((correct_in_class / total_in_class * 100), 2) if total_in_class > 0 else 0.0

    # Family-level Majority Vote
    pred_df = pd.DataFrame({
        "filename": all_fnames,
        "family_id": all_fams,
        "true_label_idx": all_labels,
        "pred_label_idx": all_preds,
        "true_class": [IDX_TO_CLASS[i] for i in all_labels],
        "pred_class": [IDX_TO_CLASS[i] for i in all_preds]
    })

    fam_records = []
    for fid, g in pred_df.groupby("family_id"):
        true_cls = g["true_class"].iloc[0]
        maj_pred = g["pred_class"].mode()[0]
        fam_records.append({
            "family_id": fid,
            "true_class": true_cls,
            "pred_class_majority": maj_pred,
            "is_correct": (true_cls == maj_pred),
            "image_count": len(g)
        })

    fam_df = pd.DataFrame(fam_records)
    fam_acc = accuracy_score(fam_df["true_class"], fam_df["pred_class_majority"])
    fam_bal_acc = balanced_accuracy_score(fam_df["true_class"], fam_df["pred_class_majority"])
    fam_f1_macro = f1_score(fam_df["true_class"], fam_df["pred_class_majority"], average="macro", zero_division=0)
    fam_cm = confusion_matrix(fam_df["true_class"], fam_df["pred_class_majority"], labels=CLASSES)

    fam_recalls = {}
    fam_support = {}
    fam_detected = {}
    for idx, c in enumerate(CLASSES):
        total_fams = int((fam_df["true_class"] == c).sum())
        corr_fams = int(((fam_df["true_class"] == c) & (fam_df["pred_class_majority"] == c)).sum())
        fam_support[c] = total_fams
        fam_detected[c] = corr_fams
        fam_recalls[c] = round((corr_fams / total_fams * 100), 2) if total_fams > 0 else 0.0

    return {
        "image_level": {
            "accuracy": round(acc * 100, 2),
            "balanced_accuracy": round(bal_acc * 100, 2),
            "macro_f1": round(f1_macro * 100, 2),
            "weighted_f1": round(f1_weighted * 100, 2),
            "class_recalls_percent": class_recalls,
            "class_support": class_support,
            "class_detected": class_detected,
            "measles_recall_percent": class_recalls["Measles"],
            "measles_detected_ratio": f"{class_detected['Measles']}/{class_support['Measles']}",
            "confusion_matrix": cm.tolist()
        },
        "family_level": {
            "accuracy": round(fam_acc * 100, 2),
            "balanced_accuracy": round(fam_bal_acc * 100, 2),
            "macro_f1": round(fam_f1_macro * 100, 2),
            "family_recalls_percent": fam_recalls,
            "family_support": fam_support,
            "family_detected": fam_detected,
            "measles_family_recall_percent": fam_recalls["Measles"],
            "measles_family_detected_ratio": f"{fam_detected['Measles']}/{fam_support['Measles']}",
            "confusion_matrix": fam_cm.tolist()
        },
        "pred_df": pred_df,
        "fam_df": fam_df
    }

def measure_latency(model, device, num_warmup=20, num_runs=200):
    dummy_input = torch.randn(1, 3, 224, 224).to(device)
    model.eval()
    with torch.no_grad():
        for _ in range(num_warmup):
            _ = model(dummy_input)
        if device.type == "cuda":
            torch.cuda.synchronize()
        start = time.time()
        for _ in range(num_runs):
            _ = model(dummy_input)
        if device.type == "cuda":
            torch.cuda.synchronize()
        total_time = time.time() - start
    return round((total_time / num_runs) * 1000, 2)

def main():
    print("="*70)
    print("Independent Verification of Grouped Models on Validation Set")
    print("="*70)

    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device} ({torch.cuda.get_device_name(0)})")

    df = pd.read_csv(MANIFEST_PATH)
    val_df = df[df["grouped_split"] == "val"].reset_index(drop=True)
    test_df = df[df["grouped_split"] == "test"].reset_index(drop=True)

    print(f"Validation Cohort: {len(val_df)} images across {val_df['family_id'].nunique()} source families")
    print(f"Test Cohort      : {len(test_df)} images across {test_df['family_id'].nunique()} source families")

    # Confirm exactly identical validation families
    val_fams = sorted(val_df["family_id"].unique())
    print(f"Validation Measles Families Count: {val_df[val_df['class_label'] == 'Measles']['family_id'].nunique()}")
    print(f"Validation Measles Crops Count   : {len(val_df[val_df['class_label'] == 'Measles'])}")

    val_loader = DataLoader(SkinLesionDataset(val_df, eval_transform), batch_size=32, shuffle=False, num_workers=0)
    test_loader = DataLoader(SkinLesionDataset(test_df, eval_transform), batch_size=32, shuffle=False, num_workers=0)

    models_info = {
        "resnet18": {
            "path": os.path.join(MODELS_DIR, "resnet18_grouped_best.pth"),
            "arch": "ResNet18",
            "constructor": lambda: models.resnet18(weights=None)
        },
        "mobilenet_v3_small": {
            "path": os.path.join(MODELS_DIR, "mobilenet_v3_small_grouped_best.pth"),
            "arch": "MobileNetV3-Small",
            "constructor": lambda: models.mobilenet_v3_small(weights=None)
        }
    }

    verified_results = {
        "metadata": {
            "verification_timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "device": str(device),
            "gpu_name": torch.cuda.get_device_name(0),
            "classes": CLASSES,
            "validation_sample_count": len(val_df),
            "validation_family_count": len(val_fams),
            "test_sample_count": len(test_df),
            "test_family_count": test_df["family_id"].nunique()
        },
        "checkpoints": {},
        "validation_evaluation": {},
        "test_evaluation_historical_reference": {}
    }

    for model_name, info in models_info.items():
        ckpt_path = info["path"]
        ckpt_sha256 = compute_sha256(ckpt_path)
        ckpt_size_bytes = os.path.getsize(ckpt_path)
        print(f"\nProcessing {model_name}...")
        print(f"  Checkpoint: {ckpt_path}")
        print(f"  SHA-256   : {ckpt_sha256}")
        print(f"  File Size : {ckpt_size_bytes / (1024*1024):.2f} MB")

        # Instantiate architecture
        if model_name == "resnet18":
            m = info["constructor"]()
            m.fc = nn.Sequential(nn.Dropout(0.3), nn.Linear(m.fc.in_features, len(CLASSES)))
        else:
            m = info["constructor"]()
            m.classifier[3] = nn.Linear(m.classifier[3].in_features, len(CLASSES))

        # Load weights
        m.load_state_dict(torch.load(ckpt_path, map_location=device))
        m = m.to(device)

        # Count parameters
        num_params = sum(p.numel() for p in m.parameters())
        num_trainable = sum(p.numel() for p in m.parameters() if p.requires_grad)

        # Measure latency
        lat_ms = measure_latency(m, device)

        verified_results["checkpoints"][model_name] = {
            "architecture": info["arch"],
            "checkpoint_file": os.path.basename(ckpt_path),
            "sha256": ckpt_sha256,
            "size_mb": round(ckpt_size_bytes / (1024*1024), 2),
            "total_parameters": num_params,
            "trainable_parameters": num_trainable,
            "inference_latency_ms": lat_ms
        }

        # Evaluate on VALIDATION set
        print("  Evaluating on VALIDATION split (N=1,544)...")
        val_res = evaluate_model(m, val_loader, device)

        # Save validation predictions
        val_pred_csv = os.path.join(OUTPUT_DIR, f"val_predictions_{model_name}.csv")
        val_res["pred_df"].to_csv(val_pred_csv, index=False)
        val_fam_csv = os.path.join(OUTPUT_DIR, f"val_family_predictions_{model_name}.csv")
        val_res["fam_df"].to_csv(val_fam_csv, index=False)

        verified_results["validation_evaluation"][model_name] = {
            "image_level": val_res["image_level"],
            "family_level": val_res["family_level"]
        }

        print(f"  [VALIDATION] Image Accuracy    : {val_res['image_level']['accuracy']}%")
        print(f"  [VALIDATION] Image BalAcc      : {val_res['image_level']['balanced_accuracy']}%")
        print(f"  [VALIDATION] Image Macro F1    : {val_res['image_level']['macro_f1']}%")
        print(f"  [VALIDATION] Measles Recall    : {val_res['image_level']['measles_recall_percent']}% ({val_res['image_level']['measles_detected_ratio']})")
        print(f"  [VALIDATION] Family Accuracy   : {val_res['family_level']['accuracy']}%")
        print(f"  [VALIDATION] Family Macro F1   : {val_res['family_level']['macro_f1']}%")
        print(f"  [VALIDATION] Measles Fam Recall: {val_res['family_level']['measles_family_recall_percent']}% ({val_res['family_level']['measles_family_detected_ratio']})")

        # Evaluate on TEST set (Historical Reference Only)
        print("  Evaluating on TEST split (Historical Reference Only, N=1,561)...")
        test_res = evaluate_model(m, test_loader, device)
        verified_results["test_evaluation_historical_reference"][model_name] = {
            "image_level": test_res["image_level"],
            "family_level": test_res["family_level"]
        }

    # Save complete JSON
    out_json = os.path.join(OUTPUT_DIR, "VALIDATION_METRICS_VERIFIED.json")
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(verified_results, f, indent=2)
    print(f"\nSaved verified validation metrics to {out_json}")

if __name__ == "__main__":
    main()
