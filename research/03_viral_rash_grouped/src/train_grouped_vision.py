import os
import sys
import json
import time
import random
import numpy as np
import pandas as pd
from PIL import Image

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import models, transforms
from sklearn.metrics import (
    accuracy_score, balanced_accuracy_score, precision_score,
    recall_score, f1_score, confusion_matrix, classification_report
)

BASE_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\03_Measles_Viral_Rash"
GROUPED_MANIFEST = os.path.join(BASE_DIR, "data", "processed", "clean_grouped_split_manifest.csv")
CONFIG_PATH = os.path.join(BASE_DIR, "configs", "config.json")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
MODELS_DIR = os.path.join(BASE_DIR, "models")
LOGS_DIR = os.path.join(BASE_DIR, "logs")
REPORTS_V2_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\_reports\corrected_submission_v2"

os.makedirs(OUTPUTS_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(LOGS_DIR, exist_ok=True)
os.makedirs(REPORTS_V2_DIR, exist_ok=True)

LOG_FILE = os.path.join(LOGS_DIR, "grouped_experiment_log.txt")

def log(msg):
    timestamp = time.strftime("[%Y-%m-%d %H:%M:%S]")
    full_msg = f"{timestamp} {msg}"
    print(full_msg)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(full_msg + "\n")

def set_seed(seed=42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True

set_seed(42)

with open(CONFIG_PATH, "r", encoding="utf-8") as f:
    config = json.load(f)

CLASSES = config["classes"]
CLASS_TO_IDX = {c: i for i, c in enumerate(CLASSES)}
IDX_TO_CLASS = {i: c for i, c in enumerate(CLASSES)}

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

def get_transforms():
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=15),
        transforms.ColorJitter(brightness=0.1, contrast=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    eval_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    return train_transform, eval_transform

def train_epoch(model, loader, criterion, optimizer, device):
    model.train()
    running_loss = 0.0
    all_preds, all_labels = [], []
    for images, labels, _, _ in loader:
        images, labels = images.to(device), labels.to(device)
        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        running_loss += loss.item() * images.size(0)
        preds = outputs.argmax(dim=1).cpu().numpy()
        all_preds.extend(preds)
        all_labels.extend(labels.cpu().numpy())
    epoch_loss = running_loss / len(loader.dataset)
    epoch_f1 = f1_score(all_labels, all_preds, average="macro", zero_division=0)
    return epoch_loss, epoch_f1

def eval_epoch(model, loader, criterion, device):
    model.eval()
    running_loss = 0.0
    all_preds, all_labels, all_probs, all_fnames, all_fams = [], [], [], [], []
    with torch.no_grad():
        for images, labels, fnames, fams in loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            loss = criterion(outputs, labels)
            running_loss += loss.item() * images.size(0)
            probs = torch.softmax(outputs, dim=1).cpu().numpy()
            preds = outputs.argmax(dim=1).cpu().numpy()
            all_preds.extend(preds)
            all_labels.extend(labels.cpu().numpy())
            all_probs.extend(probs)
            all_fnames.extend(fnames)
            all_fams.extend(fams)
    epoch_loss = running_loss / len(loader.dataset)
    acc = accuracy_score(all_labels, all_preds)
    bal_acc = balanced_accuracy_score(all_labels, all_preds)
    f1_macro = f1_score(all_labels, all_preds, average="macro", zero_division=0)
    return epoch_loss, acc, bal_acc, f1_macro, np.array(all_preds), np.array(all_labels), np.array(all_probs), all_fnames, all_fams

def run():
    start_time = time.time()
    log("="*70)
    log("MCVSLD Group-Isolated Vision Model Training & Benchmark on RTX 5060 Ti")
    log("="*70)

    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    log(f"Active Device: {device} ({torch.cuda.get_device_name(0)})")

    df = pd.read_csv(GROUPED_MANIFEST)
    train_df = df[df["grouped_split"] == "train"].reset_index(drop=True)
    val_df = df[df["grouped_split"] == "val"].reset_index(drop=True)
    test_df = df[df["grouped_split"] == "test"].reset_index(drop=True)

    log(f"Dataset Partitions:")
    log(f"  Train: {len(train_df)} images ({train_df['family_id'].nunique()} families)")
    log(f"  Val  : {len(val_df)} images ({val_df['family_id'].nunique()} families)")
    log(f"  Test : {len(test_df)} images ({test_df['family_id'].nunique()} families)")

    # Assert zero family overlap
    tr_f = set(train_df["family_id"])
    va_f = set(val_df["family_id"])
    te_f = set(test_df["family_id"])
    assert len(tr_f.intersection(va_f)) == 0, "Train-Val overlap detected!"
    assert len(tr_f.intersection(te_f)) == 0, "Train-Test overlap detected!"
    assert len(va_f.intersection(te_f)) == 0, "Val-Test overlap detected!"
    log("Confirmed: 0.0% source-family leakage across all splits.")

    train_tf, eval_tf = get_transforms()
    train_loader = DataLoader(SkinLesionDataset(train_df, train_tf), batch_size=32, shuffle=True, num_workers=0)
    val_loader = DataLoader(SkinLesionDataset(val_df, eval_tf), batch_size=32, shuffle=False, num_workers=0)
    test_loader = DataLoader(SkinLesionDataset(test_df, eval_tf), batch_size=32, shuffle=False, num_workers=0)

    # Class weights for loss
    class_counts = train_df["class_label"].value_counts().reindex(CLASSES).values
    total_samples = len(train_df)
    class_weights = torch.tensor([total_samples / (len(CLASSES) * c) for c in class_counts], dtype=torch.float)
    log(f"Computed Class Weights: {dict(zip(CLASSES, [round(w.item(), 2) for w in class_weights]))}")

    models_to_train = ["resnet18", "mobilenet_v3_small"]
    results = {}

    for model_name in models_to_train:
        log(f"\n{'='*25} Training {model_name} (Group-Isolated) {'='*25}")
        if model_name == "resnet18":
            model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
            model.fc = nn.Sequential(nn.Dropout(0.3), nn.Linear(model.fc.in_features, len(CLASSES)))
        else:
            model = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)
            model.classifier[3] = nn.Linear(model.classifier[3].in_features, len(CLASSES))

        model = model.to(device)
        criterion = nn.CrossEntropyLoss(weight=class_weights.to(device))
        optimizer = optim.AdamW(model.parameters(), lr=1e-4, weight_decay=1e-4)
        scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=8)

        best_val_f1 = -1.0
        best_epoch = -1
        best_ckpt_path = os.path.join(MODELS_DIR, f"{model_name}_grouped_best.pth")

        for epoch in range(1, 9):
            t0 = time.time()
            tr_loss, tr_f1 = train_epoch(model, train_loader, criterion, optimizer, device)
            val_loss, val_acc, val_bal_acc, val_f1, _, _, _, _, _ = eval_epoch(model, val_loader, criterion, device)
            scheduler.step()
            ep_time = time.time() - t0

            log(f"Epoch {epoch}/8 ({ep_time:.1f}s) | Train Loss: {tr_loss:.4f}, Macro F1: {tr_f1*100:.2f}% | Val Loss: {val_loss:.4f}, Val BalAcc: {val_bal_acc*100:.2f}%, Val Macro F1: {val_f1*100:.2f}%")

            if val_f1 > best_val_f1:
                best_val_f1 = val_f1
                best_epoch = epoch
                torch.save(model.state_dict(), best_ckpt_path)
                log(f"  --> Saved new best model checkpoint (Val Macro F1: {val_f1*100:.2f}%)")

        # Load best validation model for one-time held-out test evaluation
        model.load_state_dict(torch.load(best_ckpt_path, map_location=device))
        test_loss, test_acc, test_bal_acc, test_f1, test_preds, test_labels, test_probs, test_fnames, test_fams = eval_epoch(
            model, test_loader, criterion, device
        )

        log(f"\n{model_name} Final Evaluation on Group-Held-Out Test Set (Unseen Families):")
        log(f"  Test Accuracy         : {test_acc*100:.2f}%")
        log(f"  Test Balanced Accuracy: {test_bal_acc*100:.2f}%")
        log(f"  Test Macro F1         : {test_f1*100:.2f}%")

        # Per-class recalls
        cm = confusion_matrix(test_labels, test_preds)
        class_recalls = {}
        for idx, c in enumerate(CLASSES):
            rec = cm[idx, idx] / cm[idx].sum() if cm[idx].sum() > 0 else 0.0
            class_recalls[c] = round(float(rec) * 100, 2)
            log(f"  {c:<12} Sensitivity: {class_recalls[c]:.2f}% ({cm[idx, idx]}/{cm[idx].sum()})")

        # Family-level aggregation (Majority Vote)
        test_pred_df = pd.DataFrame({
            "filename": test_fnames,
            "family_id": test_fams,
            "true_label_idx": test_labels,
            "pred_label_idx": test_preds,
            "true_class": [IDX_TO_CLASS[i] for i in test_labels],
            "pred_class": [IDX_TO_CLASS[i] for i in test_preds]
        })

        fam_records = []
        for fid, g in test_pred_df.groupby("family_id"):
            true_cls = g["true_class"].iloc[0]
            maj_pred = g["pred_class"].mode()[0]
            fam_records.append({
                "family_id": fid,
                "true_class": true_cls,
                "pred_class_majority": maj_pred,
                "is_correct": (true_cls == maj_pred),
                "image_count": len(g)
            })
        fam_res_df = pd.DataFrame(fam_records)
        fam_acc = accuracy_score(fam_res_df["true_class"], fam_res_df["pred_class_majority"])
        fam_f1 = f1_score(fam_res_df["true_class"], fam_res_df["pred_class_majority"], average="macro", zero_division=0)
        log(f"  Per-Source-Family Majority Vote Accuracy: {fam_acc*100:.2f}%")
        log(f"  Per-Source-Family Macro F1               : {fam_f1*100:.2f}%")

        measles_fams = fam_res_df[fam_res_df["true_class"] == "Measles"]
        measles_fam_acc = measles_fams["is_correct"].mean() * 100
        log(f"  Measles Family-Level Detection: {measles_fam_acc:.1f}% ({measles_fams['is_correct'].sum()}/{len(measles_fams)} unseen families)")

        results[model_name] = {
            "best_epoch": best_epoch,
            "best_val_macro_f1": round(float(best_val_f1) * 100, 2),
            "test_accuracy": round(float(test_acc) * 100, 2),
            "test_balanced_accuracy": round(float(test_bal_acc) * 100, 2),
            "test_macro_f1": round(float(test_f1) * 100, 2),
            "class_recalls_percent": class_recalls,
            "measles_crops_detected": f"{cm[CLASS_TO_IDX['Measles'], CLASS_TO_IDX['Measles']]}/{cm[CLASS_TO_IDX['Measles']].sum()}",
            "confusion_matrix": cm.tolist(),
            "family_level_accuracy": round(float(fam_acc) * 100, 2),
            "family_level_macro_f1": round(float(fam_f1) * 100, 2),
            "measles_families_detected": f"{measles_fams['is_correct'].sum()}/{len(measles_fams)}"
        }

        if model_name == "resnet18":
            test_pred_df.to_csv(os.path.join(OUTPUTS_DIR, "grouped_test_predictions_resnet18.csv"), index=False)
            fam_res_df.to_csv(os.path.join(OUTPUTS_DIR, "grouped_family_predictions_resnet18.csv"), index=False)

    # Save grouped metrics
    metrics_path = os.path.join(OUTPUTS_DIR, "grouped_metrics.json")
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    log(f"Saved grouped metrics to {metrics_path}")

    elapsed = time.time() - start_time
    log(f"Total training & evaluation elapsed: {elapsed:.1f} seconds")

if __name__ == "__main__":
    run()
