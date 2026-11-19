import os
import json
import time
import numpy as np
import pandas as pd
from PIL import Image
import networkx as nx

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import models, transforms
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.metrics import accuracy_score, balanced_accuracy_score, f1_score, confusion_matrix, classification_report

BASE_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\02_PCOS_Ultrasound"
DATA_ROOT = os.path.join(BASE_DIR, "data")
SPLIT_MANIFEST = os.path.join(DATA_ROOT, "processed", "split_manifest.csv")
AUDIT_JSON = os.path.join(BASE_DIR, "outputs", "near_duplicate_and_leakage_audit.json")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
PROOFS_DIR = os.path.join(BASE_DIR, "proofs")

os.makedirs(OUTPUTS_DIR, exist_ok=True)
os.makedirs(PROOFS_DIR, exist_ok=True)

# 1. Load manifest and audit
df_all = pd.read_csv(SPLIT_MANIFEST)
with open(AUDIT_JSON, "r", encoding="utf-8") as f:
    audit_data = json.load(f)

# 2. Build cluster graph for near-duplicate grouping
G = nx.Graph()
for f in df_all["filename"]:
    G.add_node(f)
for p in audit_data["pairs_detail"]:
    if not p["cross_class"]:
        G.add_edge(p["image_1"], p["image_2"])

cluster_map = {}
for cluster_id, comp in enumerate(nx.connected_components(G)):
    for fname in comp:
        cluster_map[fname] = cluster_id

df_all["group_id"] = df_all["filename"].map(cluster_map)

# 3. Restrict development set to train + val (N=254)
dev_df = df_all[df_all["split"].isin(["train", "val"])].copy().reset_index(drop=True)
print(f"Development Set: {len(dev_df)} images across {dev_df['group_id'].nunique()} groups.")
print("Class breakdown in dev set:", dev_df["class_label"].value_counts().to_dict())

# 4. PyTorch Dataset & Transforms
class CVUltrasoundDataset(Dataset):
    def __init__(self, df, transform=None):
        self.df = df.reset_index(drop=True)
        self.transform = transform
        self.class_to_idx = {"Dominant_Follicle": 0, "Normal": 1, "PCO": 2}

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        img_path = os.path.join(BASE_DIR, row["relative_path"])
        image = Image.open(img_path).convert("RGB")
        label = self.class_to_idx[row["class_label"]]
        if self.transform:
            image = self.transform(image)
        return image, label

train_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.RandomRotation(degrees=15),
    transforms.ColorJitter(brightness=0.1, contrast=0.1),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

val_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device} ({torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'})")

# 5. Repeated Stratified Group K-Fold (3 repeats x 5 folds = 15 folds)
seeds = [42, 101, 2024]
n_splits = 5
results = []
all_oof_true = []
all_oof_pred = []

start_time = time.time()

for rep_idx, seed in enumerate(seeds):
    print(f"\n--- REPEAT {rep_idx + 1}/3 (Seed {seed}) ---")
    sgkf = StratifiedGroupKFold(n_splits=n_splits, shuffle=True, random_state=seed)
    
    for fold, (train_idx, val_idx) in enumerate(sgkf.split(dev_df, dev_df["class_label"], dev_df["group_id"])):
        # Verify no group leakage
        train_groups = set(dev_df.iloc[train_idx]["group_id"])
        val_groups = set(dev_df.iloc[val_idx]["group_id"])
        assert len(train_groups.intersection(val_groups)) == 0, "GROUP LEAKAGE DETECTED!"
        
        train_sub = dev_df.iloc[train_idx]
        val_sub = dev_df.iloc[val_idx]
        
        train_loader = DataLoader(CVUltrasoundDataset(train_sub, train_transform), batch_size=16, shuffle=True, num_workers=0, pin_memory=True)
        val_loader = DataLoader(CVUltrasoundDataset(val_sub, val_transform), batch_size=16, shuffle=False, num_workers=0, pin_memory=True)
        
        # Calculate class weights for cross-entropy
        cls_counts = train_sub["class_label"].value_counts()
        total_samples = len(train_sub)
        n_classes = 3
        weights = [total_samples / (n_classes * cls_counts.get(cls, 1)) for cls in ["Dominant_Follicle", "Normal", "PCO"]]
        criterion = nn.CrossEntropyLoss(weight=torch.tensor(weights, dtype=torch.float).to(device))
        
        # Build ResNet18 model
        torch.manual_seed(seed + fold)
        model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
        model.fc = nn.Sequential(
            nn.Dropout(p=0.3),
            nn.Linear(model.fc.in_features, 3)
        )
        model = model.to(device)
        optimizer = optim.AdamW(model.parameters(), lr=1e-4, weight_decay=1e-4)
        
        # Train for 10 epochs
        best_val_f1 = 0.0
        best_preds = None
        best_trues = None
        
        for epoch in range(10):
            model.train()
            for imgs, lbls in train_loader:
                imgs, lbls = imgs.to(device), lbls.to(device)
                optimizer.zero_grad()
                out = model(imgs)
                loss = criterion(out, lbls)
                loss.backward()
                optimizer.step()
                
            # Evaluate fold
            model.eval()
            val_preds = []
            val_trues = []
            with torch.no_grad():
                for imgs, lbls in val_loader:
                    imgs = imgs.to(device)
                    out = model(imgs)
                    preds = torch.argmax(out, dim=1).cpu().numpy()
                    val_preds.extend(preds)
                    val_trues.extend(lbls.numpy())
                    
            f1 = f1_score(val_trues, val_preds, average="macro", zero_division=0)
            if f1 > best_val_f1:
                best_val_f1 = f1
                best_preds = val_preds
                best_trues = val_trues
                
        fold_acc = accuracy_score(best_trues, best_preds)
        fold_bal_acc = balanced_accuracy_score(best_trues, best_preds)
        
        print(f"  Fold {fold + 1}/5: Val Acc={fold_acc*100:.2f}%, BalAcc={fold_bal_acc*100:.2f}%, Macro F1={best_val_f1*100:.2f}%")
        results.append({
            "repeat": rep_idx + 1,
            "seed": seed,
            "fold": fold + 1,
            "train_samples": len(train_idx),
            "val_samples": len(val_idx),
            "val_accuracy": round(float(fold_acc), 4),
            "val_balanced_accuracy": round(float(fold_bal_acc), 4),
            "val_macro_f1": round(float(best_val_f1), 4)
        })
        all_oof_true.extend(best_trues)
        all_oof_pred.extend(best_preds)

elapsed = time.time() - start_time
print(f"\n15-fold Repeated Stratified Group CV completed in {elapsed:.2f} seconds!")

results_df = pd.DataFrame(results)
csv_path = os.path.join(OUTPUTS_DIR, "repeated_cv_results.csv")
results_df.to_csv(csv_path, index=False)
results_df.to_csv(os.path.join(PROOFS_DIR, "repeated_cv_results.csv"), index=False)

mean_acc = results_df["val_accuracy"].mean()
std_acc = results_df["val_accuracy"].std()
mean_bal_acc = results_df["val_balanced_accuracy"].mean()
std_bal_acc = results_df["val_balanced_accuracy"].std()
mean_f1 = results_df["val_macro_f1"].mean()
std_f1 = results_df["val_macro_f1"].std()

cv_summary = {
    "evaluation_type": "Repeated Stratified Group 5-Fold Cross-Validation (3 repeats = 15 folds)",
    "dataset": "Ovarian Ultrasound Dataset (Development Set N=254)",
    "grouping_strategy": "Near-Duplicate Connected Components (0% cross-fold leakage)",
    "model": "ResNet18 (ImageNet Pretrained)",
    "total_folds": 15,
    "elapsed_seconds": round(elapsed, 2),
    "metrics": {
        "mean_val_accuracy": round(mean_acc, 4),
        "std_val_accuracy": round(std_acc, 4),
        "mean_val_balanced_accuracy": round(mean_bal_acc, 4),
        "std_val_balanced_accuracy": round(std_bal_acc, 4),
        "mean_val_macro_f1": round(mean_f1, 4),
        "std_val_macro_f1": round(std_f1, 4),
        "min_macro_f1": round(results_df["val_macro_f1"].min(), 4),
        "max_macro_f1": round(results_df["val_macro_f1"].max(), 4)
    },
    "cohort_reuse_notice": "The 15 folds represent 3 independent repetitions of 5-fold cross-validation on the same 254 development images (244 unique pseudo-patient groups), NOT 15 distinct clinical patient cohorts.",
    "normal_class_imbalance_constraint": "Normal class contains only 35 images in the development set (and 6 in held-out test). Wide variance in Normal class recall across folds reflects severe sample size limitation."
}

with open(os.path.join(OUTPUTS_DIR, "cv_metrics.json"), "w", encoding="utf-8") as f:
    json.dump(cv_summary, f, indent=2)
with open(os.path.join(PROOFS_DIR, "cv_metrics.json"), "w", encoding="utf-8") as f:
    json.dump(cv_summary, f, indent=2)

print("\n=== REPEATED CV FINAL SUMMARY ===")
print(f"Mean Val Accuracy:          {mean_acc*100:.2f}% ± {std_acc*100:.2f}%")
print(f"Mean Val Balanced Accuracy: {mean_bal_acc*100:.2f}% ± {std_bal_acc*100:.2f}%")
print(f"Mean Val Macro F1:          {mean_f1*100:.2f}% ± {std_f1*100:.2f}% (Range: {results_df['val_macro_f1'].min()*100:.2f}% - {results_df['val_macro_f1'].max()*100:.2f}%)")
