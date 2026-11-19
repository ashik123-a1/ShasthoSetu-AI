import os
import sys
import json
import time
import random
import hashlib
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

import matplotlib.pyplot as plt
import seaborn as sns

BASE_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\03_Measles_Viral_Rash"
DATA_ROOT = os.path.join(BASE_DIR, "data")
CLEAN_MANIFEST = os.path.join(DATA_ROOT, "processed", "clean_split_manifest.csv")
CONFIG_PATH = os.path.join(BASE_DIR, "configs", "config.json")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
MODELS_DIR = os.path.join(BASE_DIR, "models")
LOGS_DIR = os.path.join(BASE_DIR, "logs")
PROOFS_DIR = os.path.join(BASE_DIR, "proofs")
RUNS_DIR = os.path.join(BASE_DIR, "runs")

os.makedirs(OUTPUTS_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(LOGS_DIR, exist_ok=True)
os.makedirs(PROOFS_DIR, exist_ok=True)
os.makedirs(RUNS_DIR, exist_ok=True)

RUN_ID = f"run_01_{time.strftime('%Y%m%d_%H%M%S')}"
RUN_DIR = os.path.join(RUNS_DIR, RUN_ID)
os.makedirs(RUN_DIR, exist_ok=True)

LOG_FILE = os.path.join(LOGS_DIR, "experiment_log.txt")
RUN_LOG = os.path.join(RUN_DIR, "experiment_log.txt")

def log(msg):
    timestamp = time.strftime("[%Y-%m-%d %H:%M:%S]")
    full_msg = f"{timestamp} {msg}"
    print(full_msg)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(full_msg + "\n")
    with open(RUN_LOG, "a", encoding="utf-8") as f:
        f.write(full_msg + "\n")

def set_seed(seed=42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True

set_seed(42)

# Load config
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
        return image, label, row["filename"]

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

def train_one_model(model_name, train_loader, val_loader, test_loader, class_weights, device):
    log(f"\n{'='*30} Training {model_name} {'='*30}")
    
    if model_name.lower() == "resnet18":
        model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
        in_feat = model.fc.in_features
        model.fc = nn.Sequential(
            nn.Dropout(p=0.3),
            nn.Linear(in_feat, len(CLASSES))
        )
    elif model_name.lower() in ["mobilenet_v3_small", "mobilenetv3"]:
        model = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)
        in_feat = model.classifier[3].in_features
        model.classifier[3] = nn.Linear(in_feat, len(CLASSES))
    else:
        raise ValueError(f"Unsupported model: {model_name}")

    model = model.to(device)
    criterion = nn.CrossEntropyLoss(weight=class_weights.to(device))
    optimizer = optim.AdamW(model.parameters(), lr=config["learning_rate"], weight_decay=config["weight_decay"])
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=config["max_epochs"])

    best_val_f1 = -1.0
    best_epoch = -1
    patience = config["early_stopping_patience"]
    patience_counter = 0

    best_model_path = os.path.join(MODELS_DIR, f"{model_name.lower()}_best.pth")
    history = []

    for epoch in range(1, config["max_epochs"] + 1):
        t0 = time.time()
        model.train()
        running_loss = 0.0
        train_preds, train_trues = [], []

        for images, labels, _ in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * images.size(0)
            preds = torch.argmax(outputs, dim=1).detach().cpu().numpy()
            train_preds.extend(preds)
            train_trues.extend(labels.cpu().numpy())

        scheduler.step()
        epoch_train_loss = running_loss / len(train_loader.dataset)
        epoch_train_f1 = f1_score(train_trues, train_preds, average="macro", zero_division=0)

        # Validation
        model.eval()
        val_loss = 0.0
        val_preds, val_trues = [], []

        with torch.no_grad():
            for images, labels, _ in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)
                val_loss += loss.item() * images.size(0)
                preds = torch.argmax(outputs, dim=1).cpu().numpy()
                val_preds.extend(preds)
                val_trues.extend(labels.cpu().numpy())

        epoch_val_loss = val_loss / len(val_loader.dataset)
        epoch_val_acc = accuracy_score(val_trues, val_preds)
        epoch_val_bal_acc = balanced_accuracy_score(val_trues, val_preds)
        epoch_val_f1 = f1_score(val_trues, val_preds, average="macro", zero_division=0)
        dt = time.time() - t0

        log(f"Epoch [{epoch:02d}/{config['max_epochs']:02d}] | Train Loss: {epoch_train_loss:.4f} F1: {epoch_train_f1:.4f} | Val Loss: {epoch_val_loss:.4f} Acc: {epoch_val_acc:.4f} BalAcc: {epoch_val_bal_acc:.4f} MacroF1: {epoch_val_f1:.4f} ({dt:.2f}s)")

        history.append({
            "model": model_name,
            "epoch": epoch,
            "train_loss": epoch_train_loss,
            "train_macro_f1": epoch_train_f1,
            "val_loss": epoch_val_loss,
            "val_accuracy": epoch_val_acc,
            "val_balanced_accuracy": epoch_val_bal_acc,
            "val_macro_f1": epoch_val_f1,
            "epoch_duration_sec": dt
        })

        if epoch_val_f1 > best_val_f1:
            best_val_f1 = epoch_val_f1
            best_epoch = epoch
            patience_counter = 0
            torch.save(model.state_dict(), best_model_path)
            log(f"  -> Best model saved to: {best_model_path} (Val Macro F1: {best_val_f1:.4f})")
        else:
            patience_counter += 1
            if patience_counter >= patience:
                log(f"Early stopping triggered at epoch {epoch} (no improvement for {patience} epochs).")
                break

    # Load best weights for test evaluation
    log(f"Loading best weights from epoch {best_epoch} for held-out test evaluation...")
    model.load_state_dict(torch.load(best_model_path))
    model.eval()

    test_loss = 0.0
    test_preds, test_trues, test_filenames, test_probs = [], [], [], []

    with torch.no_grad():
        for images, labels, fnames in test_loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            loss = criterion(outputs, labels)
            test_loss += loss.item() * images.size(0)
            probs = torch.softmax(outputs, dim=1).cpu().numpy()
            preds = np.argmax(probs, axis=1)

            test_preds.extend(preds)
            test_trues.extend(labels.cpu().numpy())
            test_filenames.extend(fnames)
            test_probs.extend(probs)

    test_loss /= len(test_loader.dataset)
    test_acc = accuracy_score(test_trues, test_preds)
    test_bal_acc = balanced_accuracy_score(test_trues, test_preds)
    test_macro_f1 = f1_score(test_trues, test_preds, average="macro", zero_division=0)
    test_weighted_f1 = f1_score(test_trues, test_preds, average="weighted", zero_division=0)
    cm = confusion_matrix(test_trues, test_preds)
    clf_report = classification_report(test_trues, test_preds, target_names=CLASSES, output_dict=True)

    log(f"\n{model_name} Held-Out Test Results (N={len(test_loader.dataset)}):")
    log(f"  Accuracy:          {test_acc*100:.2f}%")
    log(f"  Balanced Accuracy: {test_bal_acc*100:.2f}%")
    log(f"  Macro F1:          {test_macro_f1*100:.2f}%")
    log(f"  Weighted F1:       {test_weighted_f1*100:.2f}%")
    log(f"  Measles Recall (Sensitivity): {clf_report['Measles']['recall']*100:.2f}% ({int(cm[CLASSES.index('Measles')][CLASSES.index('Measles')])}/{int(np.sum(cm[CLASSES.index('Measles')]))})")

    results = {
        "model_name": model_name,
        "best_epoch": int(best_epoch),
        "best_val_macro_f1": float(round(best_val_f1, 4)),
        "test_accuracy": float(round(test_acc, 4)),
        "test_balanced_accuracy": float(round(test_bal_acc, 4)),
        "test_macro_f1": float(round(test_macro_f1, 4)),
        "test_weighted_f1": float(round(test_weighted_f1, 4)),
        "test_loss": float(round(test_loss, 4)),
        "confusion_matrix": cm.tolist(),
        "classification_report": clf_report,
        "history": history,
        "test_preds": test_preds,
        "test_trues": test_trues,
        "test_filenames": test_filenames,
        "test_probs": test_probs
    }
    return results

def main():
    total_pipeline_start = time.time()
    log("="*70)
    log("ShasthoSetu AI — Measles & Viral Skin Lesions Vision Pipeline")
    log("="*70)

    # Hardware check
    log("Checking CUDA device and hardware environment...")
    if not torch.cuda.is_available():
        log("CUDA is not available! Running on CPU.")
        device = torch.device("cpu")
    else:
        device = torch.device("cuda:0")
        gpu_name = torch.cuda.get_device_name(0)
        vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        log(f"Active GPU: {gpu_name} (Total VRAM: {vram_gb:.2f} GB)")

    # Data Loading
    df = pd.read_csv(CLEAN_MANIFEST)
    train_df = df[df["clean_split"] == "train"]
    val_df = df[df["clean_split"] == "val"]
    test_df = df[df["clean_split"] == "test"]
    log(f"Dataset partitions: Train={len(train_df)}, Val={len(val_df)}, Test={len(test_df)} (Total Clean Unique={len(df)})")

    train_transform, eval_transform = get_transforms()
    train_loader = DataLoader(SkinLesionDataset(train_df, train_transform), batch_size=config["batch_size"], shuffle=True, num_workers=config["num_workers"], pin_memory=True)
    val_loader = DataLoader(SkinLesionDataset(val_df, eval_transform), batch_size=config["batch_size"], shuffle=False, num_workers=config["num_workers"], pin_memory=True)
    test_loader = DataLoader(SkinLesionDataset(test_df, eval_transform), batch_size=config["batch_size"], shuffle=False, num_workers=config["num_workers"], pin_memory=True)

    # Class weights for CrossEntropyLoss
    train_counts = train_df["class_label"].value_counts()
    class_counts_list = [train_counts.get(c, 1) for c in CLASSES]
    total_train = len(train_df)
    n_classes = len(CLASSES)
    weights = [total_train / (n_classes * count) for count in class_counts_list]
    class_weights = torch.tensor(weights, dtype=torch.float)
    log(f"Class counts in training: {class_counts_list}")
    log(f"Calculated inverse class weights: {[round(w, 4) for w in weights]}")

    model_results = {}
    for m in config["models"]:
        model_results[m] = train_one_model(m, train_loader, val_loader, test_loader, class_weights, device)

    # Model Selection strictly based on Validation Macro F1
    best_model_name = max(model_results, key=lambda k: model_results[k]["best_val_macro_f1"])
    log(f"\n{'='*30} Model Selection {'='*30}")
    log(f"Model Selection strictly based on Validation Macro F1:")
    for m, res in model_results.items():
        log(f"  {m}: Val Macro F1 = {res['best_val_macro_f1']:.4f}")
    log(f"Selected Best Model: {best_model_name}")

    best_res = model_results[best_model_name]

    # Save training curves
    log("\nGenerating training curves and confusion matrix...")
    plt.figure(figsize=(12, 5))
    plt.subplot(1, 2, 1)
    for m, res in model_results.items():
        epochs = [h["epoch"] for h in res["history"]]
        losses = [h["val_loss"] for h in res["history"]]
        plt.plot(epochs, losses, marker="o", label=f"{m} Val Loss")
    plt.title("Validation Loss Curve")
    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.legend()
    plt.grid(True, alpha=0.3)

    plt.subplot(1, 2, 2)
    for m, res in model_results.items():
        epochs = [h["epoch"] for h in res["history"]]
        f1s = [h["val_macro_f1"] for h in res["history"]]
        plt.plot(epochs, f1s, marker="s", label=f"{m} Val Macro F1")
    plt.title("Validation Macro F1 Curve")
    plt.xlabel("Epoch")
    plt.ylabel("Macro F1")
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUTS_DIR, "training_curves.png"), dpi=200)
    plt.savefig(os.path.join(PROOFS_DIR, "training_curves.png"), dpi=200)
    plt.close()

    # Confusion Matrix Plot
    plt.figure(figsize=(8, 7))
    cm = np.array(best_res["confusion_matrix"])
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", xticklabels=CLASSES, yticklabels=CLASSES)
    plt.title(f"Confusion Matrix: {best_model_name} (Held-Out Test N={len(test_df)})")
    plt.xlabel("Predicted Class")
    plt.ylabel("Actual True Class")
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUTS_DIR, "confusion_matrix.png"), dpi=200)
    plt.savefig(os.path.join(PROOFS_DIR, "confusion_matrix.png"), dpi=200)
    plt.close()

    # Save test predictions
    test_pred_df = pd.DataFrame({
        "filename": best_res["test_filenames"],
        "true_label": [IDX_TO_CLASS[t] for t in best_res["test_trues"]],
        "predicted_label": [IDX_TO_CLASS[p] for p in best_res["test_preds"]],
        "is_correct": [t == p for t, p in zip(best_res["test_trues"], best_res["test_preds"])]
    })
    for idx, c in enumerate(CLASSES):
        test_pred_df[f"prob_{c}"] = [p[idx] for p in best_res["test_probs"]]
    test_pred_df.to_csv(os.path.join(OUTPUTS_DIR, "test_predictions.csv"), index=False)
    test_pred_df.to_csv(os.path.join(PROOFS_DIR, "test_predictions.csv"), index=False)

    # Classification report CSV
    clf_df = pd.DataFrame(best_res["classification_report"]).transpose()
    clf_df.to_csv(os.path.join(OUTPUTS_DIR, "classification_report.csv"))
    clf_df.to_csv(os.path.join(PROOFS_DIR, "classification_report.csv"))

    # Grad-CAM Visualizations
    log("\nGenerating Grad-CAM explainable vision heatmaps...")
    try:
        generate_gradcam(best_model_name, test_df, device)
    except Exception as e:
        log(f"Grad-CAM generation warning: {e}")

    # Save metrics.json
    total_duration = time.time() - total_pipeline_start
    final_metrics = {
        "experiment": "Measles and Viral Skin Lesions Multi-Class Classification",
        "dataset": "Multi-Class Viral Skin Lesion Dataset (MCVSLD)",
        "selected_best_model": best_model_name,
        "selection_metric": f"Validation Macro F1 ({best_res['best_val_macro_f1']:.4f})",
        "sample_counts": {
            "total_clean_unique_images": len(df),
            "train": len(train_df),
            "val": len(val_df),
            "test_held_out": len(test_df),
            "purged_cross_split_duplicates": 305
        },
        "models_evaluated": {
            m: {
                "best_epoch": res["best_epoch"],
                "best_val_macro_f1": res["best_val_macro_f1"],
                "test_accuracy": res["test_accuracy"],
                "test_balanced_accuracy": res["test_balanced_accuracy"],
                "test_macro_f1": res["test_macro_f1"],
                "test_weighted_f1": res["test_weighted_f1"],
                "test_loss": res["test_loss"],
                "confusion_matrix": res["confusion_matrix"],
                "classification_report": res["classification_report"]
            }
            for m, res in model_results.items()
        },
        "measles_specific_metrics": {
            "measles_support_in_test": int(clf_df.loc["Measles", "support"]),
            "measles_sensitivity_recall": float(clf_df.loc["Measles", "recall"]),
            "measles_precision": float(clf_df.loc["Measles", "precision"]),
            "measles_f1_score": float(clf_df.loc["Measles", "f1-score"]),
            "measles_false_negatives": int(np.sum(cm[CLASSES.index("Measles")]) - cm[CLASSES.index("Measles")][CLASSES.index("Measles")])
        },
        "total_runtime_seconds": round(total_duration, 2)
    }

    with open(os.path.join(OUTPUTS_DIR, "metrics.json"), "w", encoding="utf-8") as f:
        json.dump(final_metrics, f, indent=2)
    with open(os.path.join(PROOFS_DIR, "metrics.json"), "w", encoding="utf-8") as f:
        json.dump(final_metrics, f, indent=2)

    # Save run info
    run_info = {
        "run_id": RUN_ID,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "hardware": gpu_name if torch.cuda.is_available() else "CPU",
        "metrics": final_metrics
    }
    with open(os.path.join(RUN_DIR, "run_info.json"), "w", encoding="utf-8") as f:
        json.dump(run_info, f, indent=2)

    log(f"All Viral Rash experiments completed successfully in {total_duration:.2f} seconds.")
    log("="*70)

def generate_gradcam(model_name, test_df, device):
    import cv2
    log("Setting up Grad-CAM hooks...")
    
    if "resnet18" in model_name.lower():
        model = models.resnet18()
        model.fc = nn.Sequential(nn.Dropout(0.3), nn.Linear(512, len(CLASSES)))
        model.load_state_dict(torch.load(os.path.join(MODELS_DIR, f"{model_name.lower()}_best.pth")))
        target_layer = model.layer4[-1].conv2
    else:
        return

    model = model.to(device)
    model.eval()

    # Pick 1 sample for each class from test set
    samples = []
    for cls in CLASSES:
        sub = test_df[test_df["class_label"] == cls]
        if len(sub) > 0:
            samples.append(sub.iloc[0])

    fig, axes = plt.subplots(len(samples), 3, figsize=(10, 3 * len(samples)))

    eval_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    for idx, row in enumerate(samples):
        img_path = os.path.join(BASE_DIR, row["relative_path"])
        orig_img = Image.open(img_path).convert("RGB").resize((224, 224))
        input_tensor = eval_transform(orig_img).unsqueeze(0).to(device)

        # Hook gradients & activations
        activations, gradients = [], []
        def f_hook(mod, inp, out): activations.append(out)
        def b_hook(mod, gin, gout): gradients.append(gout[0])
        h1 = target_layer.register_forward_hook(f_hook)
        h2 = target_layer.register_full_backward_hook(b_hook)

        output = model(input_tensor)
        target_class = CLASS_TO_IDX[row["class_label"]]
        model.zero_grad()
        output[0, target_class].backward()

        h1.remove()
        h2.remove()

        grad = gradients[0].cpu().data.numpy()[0]
        act = activations[0].cpu().data.numpy()[0]
        weights = np.mean(grad, axis=(1, 2))
        cam = np.zeros(act.shape[1:], dtype=np.float32)
        for i, w in enumerate(weights):
            cam += w * act[i]
        cam = np.maximum(cam, 0)
        cam = cv2.resize(cam, (224, 224))
        if np.max(cam) > 0:
            cam = cam / np.max(cam)

        heatmap = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_JET)
        heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
        overlay = np.float32(heatmap) / 255 + np.float32(orig_img) / 255
        overlay = overlay / np.max(overlay)

        pred_idx = torch.argmax(output, dim=1).item()
        pred_name = IDX_TO_CLASS[pred_idx]

        axes[idx, 0].imshow(orig_img)
        axes[idx, 0].set_title(f"True: {row['class_label']}")
        axes[idx, 0].axis("off")

        axes[idx, 1].imshow(cam, cmap="jet")
        axes[idx, 1].set_title("Grad-CAM Activation")
        axes[idx, 1].axis("off")

        axes[idx, 2].imshow(overlay)
        axes[idx, 2].set_title(f"Pred: {pred_name}")
        axes[idx, 2].axis("off")

    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUTS_DIR, "gradcam_visualizations.png"), dpi=200)
    plt.savefig(os.path.join(PROOFS_DIR, "gradcam_visualizations.png"), dpi=200)
    plt.close()
    log("Grad-CAM heatmaps saved to outputs/gradcam_visualizations.png")

if __name__ == "__main__":
    main()
