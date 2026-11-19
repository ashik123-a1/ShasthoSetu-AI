import os
import sys
import json
import time
import math
import random
import hashlib
import shutil
import zipfile
import platform
from pathlib import Path
from datetime import datetime, timezone

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(line_buffering=True)

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import torch
import torchvision
from PIL import Image
from sklearn.metrics import classification_report, confusion_matrix, f1_score, accuracy_score
from torch import nn
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
from torchvision import transforms
from torchvision.models import resnet18, ResNet18_Weights

MODULE_ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = MODULE_ROOT / "configs" / "config.json"
DATA_ROOT = MODULE_ROOT / "data" / "processed"
OUTPUT_DIR = MODULE_ROOT / "outputs"
MODELS_DIR = MODULE_ROOT / "models"
LOGS_DIR = MODULE_ROOT / "logs"
PROOFS_DIR = MODULE_ROOT / "proofs"

for d in [OUTPUT_DIR, MODELS_DIR, LOGS_DIR, PROOFS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

with open(CONFIG_PATH, "r") as f:
    cfg = json.load(f)

SEED = cfg["training"]["seed"]
EPOCHS = cfg["training"]["epochs"]
BATCH_SIZE = cfg["training"]["batch_size"]
LR = cfg["training"]["learning_rate"]
WEIGHT_DECAY = cfg["training"]["weight_decay"]
DROPOUT_RATE = cfg["training"]["dropout"]
FREEZE_BACKBONE = cfg["training"]["freeze_backbone"]
PATIENCE = cfg["training"]["early_stopping_patience"]
MAX_CROPS = cfg["dataset"]["max_crops_per_patient"]
EXPERIMENT_MODE = cfg["training"]["experiment_mode"]
SELECTED_CLASSES = cfg["dataset"]["classes"]

random.seed(SEED); np.random.seed(SEED); torch.manual_seed(SEED)
if torch.cuda.is_available(): torch.cuda.manual_seed_all(SEED)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
if DEVICE.type == "cuda":
    try:
        _ = torch.zeros(1, device="cuda")
    except Exception as e:
        print(f"⚠️ GPU sm_120 kernel warning ({e}). Falling back gracefully to CPU for execution.")
        DEVICE = torch.device("cpu")

def parse_patient_crops():
    records = []
    for cls in SELECTED_CLASSES:
        candidates = [x for x in DATA_ROOT.glob("*") if x.is_dir() and x.name.lower() == cls.lower()]
        if not candidates:
            candidates = [x for x in DATA_ROOT.rglob("*") if x.is_dir() and x.name.lower() == cls.lower()]
        if not candidates:
            raise RuntimeError(f"Could not locate dataset folder for class {cls}. Run ingest.py first!")
        disease_dir = candidates[0]

        for pt_dir in sorted(disease_dir.iterdir()):
            if not pt_dir.is_dir(): continue
            crops_dir = None
            for sub in pt_dir.iterdir():
                if sub.is_dir() and sub.name.lower() == "crops":
                    crops_dir = sub
                    break
            if crops_dir is None: continue

            global_pid = f"{cls}_{pt_dir.name}"
            imgs = sorted([p for p in crops_dir.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg"}])
            if MAX_CROPS is not None and len(imgs) > MAX_CROPS:
                rng = random.Random(f"{SEED}:{global_pid}")
                imgs = sorted(rng.sample(imgs, MAX_CROPS))

            for p in imgs:
                records.append({
                    "filepath": str(p),
                    "label": cls,
                    "patient_id": global_pid,
                    "raw_patient_folder": pt_dir.name
                })
    df = pd.DataFrame(records)
    if df.empty:
        raise RuntimeError("No curated crop images found! Check data/processed layout.")
    return df

class CropsDataset(Dataset):
    def __init__(self, rows, transform):
        self.rows = rows.reset_index(drop=True)
        self.transform = transform
        self.class_to_idx = {name: i for i, name in enumerate(SELECTED_CLASSES)}
    def __len__(self): return len(self.rows)
    def __getitem__(self, i):
        r = self.rows.iloc[i]
        with Image.open(r.filepath) as im:
            x = self.transform(im.convert("RGB"))
        return x, self.class_to_idx[r.label], r.patient_id

def main():
    print("=" * 75)
    print(f"SHASTHOSETU AI: 06_DermoPed_Pediatric_Skin Training ({EXPERIMENT_MODE})")
    print("=" * 75)
    print(f"Device: {DEVICE} ({torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'})")

    manifest = parse_patient_crops()
    print("\nDataset Summary by Class:")
    print(manifest.groupby("label").agg(images=("filepath", "size"), patients=("patient_id", "nunique")))

    # Patient-Disjoint Stratified Split
    rng = np.random.default_rng(SEED)
    split_map = {}
    for cls in SELECTED_CLASSES:
        cls_groups = np.array(sorted(manifest.loc[manifest.label == cls, "patient_id"].unique()))
        rng.shuffle(cls_groups)
        n = len(cls_groups)
        n_test = max(1, round(0.15 * n))
        n_val = max(1, round(0.15 * n))
        for g in cls_groups[:n_test]: split_map[g] = "test"
        for g in cls_groups[n_test:n_test + n_val]: split_map[g] = "val"
        for g in cls_groups[n_test + n_val:]: split_map[g] = "train"

    manifest["split"] = manifest.patient_id.map(split_map)
    assert manifest.groupby("patient_id").split.nunique().max() == 1, "Patient leakage detected!"

    # Image SHA-256 duplicate verification
    seen_hashes = {}
    for r in manifest.itertuples(index=False):
        digest = hashlib.sha256(Path(r.filepath).read_bytes()).hexdigest()
        seen_hashes.setdefault(digest, set()).add(r.split)
    assert not any(len(splits) > 1 for splits in seen_hashes.values()), "Duplicate image crosses splits!"
    print("✅ Patient-disjoint split verified. Zero patient leakage. Zero duplicate images.")

    patient_split_counts = manifest.groupby(["label", "split"])["patient_id"].nunique().unstack(fill_value=0)
    patient_split_counts.to_csv(OUTPUT_DIR / "split_patient_counts.csv")
    manifest.to_csv(OUTPUT_DIR / "split_manifest.csv", index=False)

    # Transforms
    train_t = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.15, contrast=0.15),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    eval_t = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    train_df = manifest[manifest.split == "train"].copy()
    val_df = manifest[manifest.split == "val"].copy()
    test_df = manifest[manifest.split == "test"].copy()

    train_ds = CropsDataset(train_df, train_t)
    val_ds = CropsDataset(val_df, eval_t)
    test_ds = CropsDataset(test_df, eval_t)

    counts = train_df.label.value_counts()
    class_weights = [len(train_df) / (len(SELECTED_CLASSES) * counts[c]) for c in SELECTED_CLASSES]
    sample_weights = [class_weights[train_ds.class_to_idx[lbl]] for lbl in train_df["label"]]
    sampler = WeightedRandomSampler(weights=sample_weights, num_samples=len(sample_weights), replacement=True)

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, sampler=sampler, num_workers=0, pin_memory=DEVICE.type == "cuda")
    val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=0, pin_memory=DEVICE.type == "cuda")
    test_loader = DataLoader(test_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=0, pin_memory=DEVICE.type == "cuda")

    # Model Setup
    model = resnet18(weights=ResNet18_Weights.DEFAULT)
    if FREEZE_BACKBONE:
        for name, param in model.named_parameters():
            if not (name.startswith("layer4") or name.startswith("fc")):
                param.requires_grad = False
        print("🔒 Backbone Regularization: conv1, bn1, layer1-3 FROZEN. layer4 and FC trainable.")

    model.fc = nn.Sequential(
        nn.Dropout(p=DROPOUT_RATE),
        nn.Linear(model.fc.in_features, len(SELECTED_CLASSES))
    )
    model.to(DEVICE)

    criterion = nn.CrossEntropyLoss() # Unweighted loss because sampler is active (No double-weighting!)
    optimizer = torch.optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=LR, weight_decay=WEIGHT_DECAY)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS, eta_min=1e-6)

    def evaluate_model(loader):
        model.eval()
        ys, ps, probs, gs = [], [], [], []
        loss_sum, count = 0.0, 0
        with torch.no_grad():
            for xx, yy, grp in loader:
                xx, yy = xx.to(DEVICE), yy.to(DEVICE)
                out = model(xx)
                loss_sum += criterion(out, yy).item() * len(xx)
                count += len(xx)
                ys.extend(yy.cpu().tolist())
                ps.extend(out.argmax(1).cpu().tolist())
                probs.extend(out.softmax(1).cpu().numpy().tolist())
                gs.extend(grp)
        return {"loss": loss_sum / max(count, 1), "y": ys, "pred": ps, "probs": np.array(probs), "groups": gs}

    # Training Loop
    history = []
    best_val_f1 = -1.0
    patience_cnt = 0
    t0 = time.perf_counter()

    for epoch in range(1, EPOCHS + 1):
        t_ep0 = time.perf_counter()
        model.train()
        if FREEZE_BACKBONE:
            for module_name in ("bn1", "layer1", "layer2", "layer3"):
                for submodule in getattr(model, module_name).modules():
                    if isinstance(submodule, nn.modules.batchnorm._BatchNorm):
                        submodule.eval()

        total_loss, total, correct = 0.0, 0, 0
        for x, y, _ in train_loader:
            x, y = x.to(DEVICE), y.to(DEVICE)
            optimizer.zero_grad(set_to_none=True)
            logits = model(x)
            loss = criterion(logits, y)
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * len(x)
            total += len(x)
            correct += (logits.argmax(1) == y).sum().item()

        scheduler.step()
        ep_sec = round(time.perf_counter() - t_ep0, 2)
        val = evaluate_model(val_loader)
        val_f1 = f1_score(val["y"], val["pred"], labels=list(range(len(SELECTED_CLASSES))), average="macro", zero_division=0)
        val_acc = accuracy_score(val["y"], val["pred"])

        cm_val = confusion_matrix(val["y"], val["pred"], labels=list(range(len(SELECTED_CLASSES))))
        recalls = [cm_val[i, i] / max(cm_val[i].sum(), 1) for i in range(len(SELECTED_CLASSES))]

        row = {
            "epoch": epoch,
            "epoch_sec": ep_sec,
            "train_loss": round(total_loss / total, 4),
            "train_acc": round(correct / total, 4),
            "val_loss": round(val["loss"], 4),
            "val_acc": round(val_acc, 4),
            "val_macro_f1": round(val_f1, 4),
            "val_recalls": [round(r, 3) for r in recalls]
        }
        history.append(row)
        print(f"Epoch [{epoch:02d}/{EPOCHS:02d}] ({ep_sec}s) | TrLoss: {row['train_loss']} Acc: {row['train_acc']*100:.1f}% || ValLoss: {row['val_loss']} Acc: {row['val_acc']*100:.1f}% F1: {row['val_macro_f1']:.4f} Recalls: {recalls}")

        if val_f1 > best_val_f1:
            best_val_f1 = val_f1
            patience_cnt = 0
            torch.save({
                "experiment_mode": EXPERIMENT_MODE,
                "state_dict": model.state_dict(),
                "classes": SELECTED_CLASSES,
                "epoch": epoch,
                "best_val_f1": best_val_f1
            }, MODELS_DIR / "model_best.pth")
        else:
            patience_cnt += 1
            if patience_cnt >= PATIENCE:
                print(f"⏹️ Early stopping triggered at epoch {epoch}.")
                break

    total_time = round(time.perf_counter() - t0, 2)
    pd.DataFrame(history).to_csv(OUTPUT_DIR / "training_history.csv", index=False)

    # Test Evaluation
    ckpt = torch.load(MODELS_DIR / "model_best.pth", map_location=DEVICE)
    model.load_state_dict(ckpt["state_dict"])
    res = evaluate_model(test_loader)
    labels = list(range(len(SELECTED_CLASSES)))
    report = classification_report(res["y"], res["pred"], labels=labels, target_names=SELECTED_CLASSES, output_dict=True, zero_division=0)
    pd.DataFrame(report).transpose().to_csv(OUTPUT_DIR / "classification_report.csv")

    records_pt = []
    for grp in sorted(set(res["groups"])):
        inds = [i for i, g in enumerate(res["groups"]) if g == grp]
        true_lbl = res["y"][inds[0]]
        avg_probs = res["probs"][inds].mean(0)
        records_pt.append({"group": grp, "true": true_lbl, "pred": int(avg_probs.argmax())})
    patient_df = pd.DataFrame(records_pt)

    metrics = {
        "experiment_id": f"DERMOPED-T1-LOCAL-{EXPERIMENT_MODE}",
        "device": str(DEVICE),
        "total_training_sec": total_time,
        "best_epoch": ckpt["epoch"],
        "best_val_macro_f1": best_val_f1,
        "test_crops": len(res["y"]),
        "test_patients": len(patient_df),
        "image_accuracy": float(accuracy_score(res["y"], res["pred"])),
        "image_macro_f1": float(f1_score(res["y"], res["pred"], labels=labels, average="macro", zero_division=0)),
        "patient_accuracy": float(accuracy_score(patient_df.true, patient_df.pred)),
        "patient_macro_f1": float(f1_score(patient_df.true, patient_df.pred, labels=labels, average="macro", zero_division=0)),
        "timestamp_utc": datetime.now(timezone.utc).isoformat()
    }
    with open(OUTPUT_DIR / "metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    # Plots
    fig, axs = plt.subplots(1, 2, figsize=(14, 5))
    hdf = pd.DataFrame(history)
    axs[0].plot(hdf.epoch, hdf.train_loss, label="Train Loss", marker="o")
    axs[0].plot(hdf.epoch, hdf.val_loss, label="Val Loss", marker="s")
    axs[0].set_title("Loss Progression"); axs[0].grid(True); axs[0].legend()

    axs[1].plot(hdf.epoch, hdf.val_acc * 100, label="Val Accuracy %", marker="o", color="green")
    axs[1].plot(hdf.epoch, hdf.val_macro_f1 * 100, label="Val Macro F1 %", marker="^", color="orange")
    axs[1].set_title("Validation Generalization"); axs[1].grid(True); axs[1].legend()
    plt.tight_layout()
    fig.savefig(OUTPUT_DIR / "training_curves.png", dpi=200)

    cm = confusion_matrix(res["y"], res["pred"], labels=labels)
    fig, ax = plt.subplots(figsize=(6, 5))
    ax.imshow(cm, cmap="Blues")
    ax.set_xticks(labels); ax.set_xticklabels(SELECTED_CLASSES, rotation=45, ha="right")
    ax.set_yticks(labels); ax.set_yticklabels(SELECTED_CLASSES)
    for i in labels:
        for j in labels:
            ax.text(j, i, str(cm[i, j]), ha="center", va="center", color="black" if cm[i, j] < cm.max()/2 else "white")
    ax.set_xlabel("Predicted"); ax.set_ylabel("Actual")
    ax.set_title("Confusion Matrix (Held-out Test Crops)")
    plt.tight_layout()
    fig.savefig(OUTPUT_DIR / "confusion_matrix.png", dpi=200)

    print("\n" + "=" * 70)
    print("🏆 LOCAL RUN COMPLETE! Metrics:")
    print(json.dumps(metrics, indent=2))
    print("=" * 70)

if __name__ == "__main__":
    main()
