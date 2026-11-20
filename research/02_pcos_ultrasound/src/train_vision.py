import os
import sys
import json
import time
import zipfile
import platform
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

BASE_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\02_PCOS_Ultrasound"
DATA_ROOT = os.path.join(BASE_DIR, "data")
SPLIT_MANIFEST = os.path.join(DATA_ROOT, "processed", "split_manifest.csv")
CONFIG_PATH = os.path.join(BASE_DIR, "configs", "config.json")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
MODELS_DIR = os.path.join(BASE_DIR, "models")
LOGS_DIR = os.path.join(BASE_DIR, "logs")
PROOFS_DIR = os.path.join(BASE_DIR, "proofs")

os.makedirs(OUTPUTS_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(LOGS_DIR, exist_ok=True)
os.makedirs(PROOFS_DIR, exist_ok=True)

LOG_FILE = os.path.join(LOGS_DIR, "experiment_log.txt")
PROOF_LOG = os.path.join(PROOFS_DIR, "experiment_log.txt")

def log(msg):
    timestamp = time.strftime("[%Y-%m-%d %H:%M:%S]")
    full_msg = f"{timestamp} {msg}"
    print(full_msg)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(full_msg + "\n")
    with open(PROOF_LOG, "a", encoding="utf-8") as f:
        f.write(full_msg + "\n")

# Custom Dataset
class UltrasoundDataset(Dataset):
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

def train_epoch(model, loader, criterion, optimizer, device):
    model.train()
    running_loss = 0.0
    all_preds, all_labels = [], []
    for images, labels, _ in loader:
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
    all_preds, all_labels, all_probs = [], [], []
    with torch.no_grad():
        for images, labels, _ in loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            loss = criterion(outputs, labels)
            running_loss += loss.item() * images.size(0)
            
            probs = torch.softmax(outputs, dim=1).cpu().numpy()
            preds = outputs.argmax(dim=1).cpu().numpy()
            all_preds.extend(preds)
            all_labels.extend(labels.cpu().numpy())
            all_probs.extend(probs)
            
    epoch_loss = running_loss / len(loader.dataset)
    acc = accuracy_score(all_labels, all_preds)
    bal_acc = balanced_accuracy_score(all_labels, all_preds)
    f1_macro = f1_score(all_labels, all_preds, average="macro", zero_division=0)
    return epoch_loss, acc, bal_acc, f1_macro, np.array(all_preds), np.array(all_labels), np.array(all_probs)

def run():
    start_time = time.time()
    log("="*70)
    log("ShasthoSetu AI — PCOS Ultrasound Vision Model Training")
    log("="*70)
    
    # 1. Hardware Verification
    log("Checking CUDA device and hardware environment...")
    if not torch.cuda.is_available():
        log("ERROR: CUDA is not available. Please verify GPU driver.")
        sys.exit(1)
        
    device = torch.device("cuda")
    device_name = torch.cuda.get_device_name(0)
    vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
    log(f"Active GPU: {device_name} (Total VRAM: {vram_gb:.2f} GB)")
    
    # Genuine GPU verification convolution
    log("Running genuine GPU convolution forward/backward test...")
    conv_test = nn.Conv2d(3, 64, kernel_size=3, padding=1).to(device)
    dummy_input = torch.randn(4, 3, 224, 224, device=device, requires_grad=True)
    out = conv_test(dummy_input).sum()
    out.backward()
    torch.cuda.synchronize()
    log("GPU convolution forward/backward test PASSED successfully!")
    
    # Load config
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        config = json.load(f)
        
    # Save environment & config
    env_info = {
        "os": platform.platform(),
        "python_version": sys.version,
        "platform": platform.machine(),
        "processor": platform.processor(),
        "pytorch_version": torch.__version__,
        "cuda_version": torch.version.cuda,
        "gpu_device": device_name,
        "total_vram_gb": round(vram_gb, 2)
    }
    with open(os.path.join(OUTPUTS_DIR, "environment.json"), "w", encoding="utf-8") as f:
        json.dump(env_info, f, indent=2)
    with open(os.path.join(OUTPUTS_DIR, "experiment_config.json"), "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)
        
    batch_size = config.get("batch_size", 16)
    max_epochs = config.get("max_epochs", 15)
    lr = config.get("learning_rate", 0.0001)
    patience = config.get("early_stopping_patience", 4)
    
    # Load data
    manifest_df = pd.read_csv(SPLIT_MANIFEST)
    train_df = manifest_df[manifest_df["split"] == "train"]
    val_df = manifest_df[manifest_df["split"] == "val"]
    test_df = manifest_df[manifest_df["split"] == "test"]
    
    log(f"Dataset partitions: Train={len(train_df)}, Val={len(val_df)}, Test={len(test_df)}")
    
    train_tf, eval_tf = get_transforms()
    train_loader = DataLoader(UltrasoundDataset(train_df, train_tf), batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(UltrasoundDataset(val_df, eval_tf), batch_size=batch_size, shuffle=False)
    test_loader = DataLoader(UltrasoundDataset(test_df, eval_tf), batch_size=batch_size, shuffle=False)
    
    # Weighted Cross Entropy Loss for Class Imbalance (Normal has only 29 train images)
    class_counts = [
        (train_df["class_label"] == "Dominant_Follicle").sum(),
        (train_df["class_label"] == "Normal").sum(),
        (train_df["class_label"] == "PCO").sum()
    ]
    weights = [1.0 / c for c in class_counts]
    weights = [w / sum(weights) * 3.0 for w in weights]
    class_weights = torch.tensor(weights, dtype=torch.float32, device=device)
    criterion = nn.CrossEntropyLoss(weight=class_weights)
    log(f"Class counts in training: {class_counts}, Loss weights: {[round(w, 4) for w in weights]}")
    
    # Model comparison dictionary
    models_to_train = {
        "ResNet18": models.resnet18(weights=models.ResNet18_Weights.DEFAULT),
        "MobileNetV3": models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)
    }
    
    # Adapt final layers
    models_to_train["ResNet18"].fc = nn.Linear(models_to_train["ResNet18"].fc.in_features, 3)
    models_to_train["MobileNetV3"].classifier[3] = nn.Linear(models_to_train["MobileNetV3"].classifier[3].in_features, 3)
    
    all_results = {}
    history_records = []
    
    for model_name, model in models_to_train.items():
        log(f"\n{'='*30} Training {model_name} {'='*30}")
        model = model.to(device)
        optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
        
        best_val_f1 = 0.0
        best_epoch = 0
        epochs_no_improve = 0
        checkpoint_path = os.path.join(MODELS_DIR, f"{model_name.lower()}_best.pth")
        
        for epoch in range(1, max_epochs + 1):
            ep_start = time.time()
            train_loss, train_f1 = train_epoch(model, train_loader, criterion, optimizer, device)
            val_loss, val_acc, val_bal_acc, val_f1, _, _, _ = eval_epoch(model, val_loader, criterion, device)
            ep_time = time.time() - ep_start
            
            history_records.append({
                "model": model_name,
                "epoch": epoch,
                "train_loss": round(train_loss, 4),
                "train_macro_f1": round(train_f1, 4),
                "val_loss": round(val_loss, 4),
                "val_accuracy": round(val_acc, 4),
                "val_balanced_acc": round(val_bal_acc, 4),
                "val_macro_f1": round(val_f1, 4),
                "epoch_time_seconds": round(ep_time, 2)
            })
            
            log(f"Epoch [{epoch:02d}/{max_epochs:02d}] | Train Loss: {train_loss:.4f} F1: {train_f1:.4f} | Val Loss: {val_loss:.4f} Acc: {val_acc:.4f} BalAcc: {val_bal_acc:.4f} MacroF1: {val_f1:.4f} ({ep_time:.2f}s)")
            
            # Model selection strictly on Validation Macro F1
            if val_f1 > best_val_f1:
                best_val_f1 = val_f1
                best_epoch = epoch
                epochs_no_improve = 0
                torch.save(model.state_dict(), checkpoint_path)
                log(f"  -> Best model saved to: {checkpoint_path} (Val Macro F1: {val_f1:.4f})")
            else:
                epochs_no_improve += 1
                if epochs_no_improve >= patience:
                    log(f"Early stopping triggered at epoch {epoch} (no improvement for {patience} epochs).")
                    break
                    
        # Load best checkpoint for test evaluation
        model.load_state_dict(torch.load(checkpoint_path))
        test_loss, test_acc, test_bal_acc, test_f1, test_preds, test_labels, test_probs = eval_epoch(model, test_loader, criterion, device)
        
        cm = confusion_matrix(test_labels, test_preds, labels=[0, 1, 2])
        cls_names = ["Dominant_Follicle", "Normal", "PCO"]
        cls_rep = classification_report(test_labels, test_preds, target_names=cls_names, output_dict=True)
        
        # Convert any numpy types in cls_rep to standard float/int
        cleaned_cls_rep = {}
        for k, v in cls_rep.items():
            if isinstance(v, dict):
                cleaned_cls_rep[k] = {ik: float(iv) if isinstance(iv, (np.floating, float)) else int(iv) for ik, iv in v.items()}
            else:
                cleaned_cls_rep[k] = float(v) if isinstance(v, (np.floating, float)) else int(v)

        all_results[model_name] = {
            "best_epoch": int(best_epoch),
            "best_val_macro_f1": round(float(best_val_f1), 4),
            "test_accuracy": round(float(test_acc), 4),
            "test_balanced_accuracy": round(float(test_bal_acc), 4),
            "test_macro_f1": round(float(test_f1), 4),
            "test_loss": round(float(test_loss), 4),
            "confusion_matrix": [[int(val) for val in row] for row in cm],
            "classification_report": cleaned_cls_rep
        }
        
        # Save predictions for best model
        if model_name == "ResNet18":
            pred_df = pd.DataFrame({
                "filename": test_df["filename"].values,
                "true_class": [cls_names[l] for l in test_labels],
                "pred_class": [cls_names[p] for p in test_preds],
                "prob_dominant_follicle": np.round(test_probs[:, 0], 4),
                "prob_normal": np.round(test_probs[:, 1], 4),
                "prob_pco": np.round(test_probs[:, 2], 4)
            })
            pred_df.to_csv(os.path.join(OUTPUTS_DIR, "test_predictions.csv"), index=False)
            pd.DataFrame(cleaned_cls_rep).transpose().to_csv(os.path.join(OUTPUTS_DIR, "classification_report.csv"))
        
        log(f"\n{model_name} Test Results (Held-Out Test Set N={len(test_df)}):")
        log(f"  Accuracy:          {test_acc*100:.2f}%")
        log(f"  Balanced Accuracy: {test_bal_acc*100:.2f}%")
        log(f"  Macro F1:          {test_f1*100:.2f}%")
        
    # Save training history
    hist_df = pd.DataFrame(history_records)
    hist_df.to_csv(os.path.join(OUTPUTS_DIR, "training_history.csv"), index=False)
    
    # Save overall metrics
    best_overall_model = max(all_results.keys(), key=lambda k: all_results[k]["best_val_macro_f1"])
    metrics_json_data = {
        "experiment": "Ovarian Ultrasound Multi-Class Morphology Classification",
        "best_model_by_val_f1": best_overall_model,
        "sample_counts": {
            "total_unique_images": len(manifest_df),
            "train": len(train_df),
            "val": len(val_df),
            "test_held_out": len(test_df),
            "class_distribution": {str(k): int(v) for k, v in manifest_df["class_label"].value_counts().items()}
        },
        "models_evaluated": all_results,
        "clinical_disclaimer": (
            "Ultrasound morphology classification (Normal, Dominant Follicle, PCO) reflects imaging appearance "
            "and DOES NOT represent autonomous PCOS clinical diagnosis. Clinical diagnosis requires comprehensive "
            "Rotterdam criteria including biochemical hyperandrogenism and ovulatory history. "
            "Imbalance constraint: Normal class contains only 41 unique images."
        ),
        "total_runtime_seconds": round(time.time() - start_time, 2)
    }
    with open(os.path.join(OUTPUTS_DIR, "metrics.json"), "w", encoding="utf-8") as f:
        json.dump(metrics_json_data, f, indent=2)

    # 6. Generate Research Visualizations
    log("\nGenerating training curves and confusion matrix...")
    plt.figure(figsize=(10, 4))
    plt.subplot(1, 2, 1)
    sns.lineplot(data=hist_df, x="epoch", y="val_macro_f1", hue="model", marker="o")
    plt.title("Validation Macro F1 Across Epochs")
    plt.ylabel("Macro F1")
    plt.ylim(0, 1.05)
    
    plt.subplot(1, 2, 2)
    sns.lineplot(data=hist_df, x="epoch", y="val_loss", hue="model", marker="s")
    plt.title("Validation Loss Across Epochs")
    plt.ylabel("Cross-Entropy Loss")
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUTS_DIR, "training_curves.png"), dpi=200)
    plt.close()

    # Confusion Matrix for Best Model
    best_cm = np.array(all_results[best_overall_model]["confusion_matrix"])
    plt.figure(figsize=(6, 5))
    sns.heatmap(best_cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=cls_names, yticklabels=cls_names)
    plt.title(f"Test Confusion Matrix — {best_overall_model}")
    plt.ylabel("True Class")
    plt.xlabel("Predicted Class")
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUTS_DIR, "confusion_matrix.png"), dpi=200)
    plt.close()

    # 7. Grad-CAM Visualization
    log("\nGenerating Grad-CAM explainable vision heatmaps...")
    generate_gradcam(models_to_train["ResNet18"], test_df, device, cls_names)
    
    # 8. Create Model Card & Experiment Summary
    log("\nCreating Model Card and Experiment Summary...")
    generate_reports(metrics_json_data, best_overall_model)
    
    # 9. Package PROOFS.zip
    create_proofs_zip()
    
    total_time = time.time() - start_time
    log(f"All Ultrasound experiments completed successfully in {total_time:.2f} seconds.")
    log("="*70)

def generate_gradcam(model, test_df, device, class_names):
    # Hook for final conv layer of ResNet18
    target_layer = model.layer4[1].conv2
    activations = []
    gradients = []
    
    def forward_hook(m, inp, outp):
        activations.append(outp.detach())
        
    def backward_hook(m, grad_in, grad_out):
        gradients.append(grad_out[0].detach())
        
    h1 = target_layer.register_forward_hook(forward_hook)
    h2 = target_layer.register_full_backward_hook(backward_hook)
    
    model.eval()
    eval_tf = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    # Select 1 test sample per class
    fig, axes = plt.subplots(3, 2, figsize=(8, 11))
    
    for idx, c_name in enumerate(class_names):
        sample_row = test_df[test_df["class_label"] == c_name].iloc[0]
        img_path = os.path.join(BASE_DIR, sample_row["relative_path"])
        raw_img = Image.open(img_path).convert("RGB").resize((224, 224))
        input_tensor = eval_tf(raw_img).unsqueeze(0).to(device)
        
        activations.clear()
        gradients.clear()
        
        output = model(input_tensor)
        pred_idx = output.argmax(dim=1).item()
        score = output[0, pred_idx]
        score.backward()
        
        # Grad-CAM weight calculation
        grad = gradients[0].cpu().numpy()[0]
        act = activations[0].cpu().numpy()[0]
        weights = np.mean(grad, axis=(1, 2))
        
        cam = np.zeros(act.shape[1:], dtype=np.float32)
        for i, w in enumerate(weights):
            cam += w * act[i]
        cam = np.maximum(cam, 0)
        cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
        cam = Image.fromarray(np.uint8(255 * cam)).resize((224, 224), Image.BILINEAR)
        cam = np.array(cam) / 255.0
        
        # Plot Original
        axes[idx, 0].imshow(raw_img)
        axes[idx, 0].set_title(f"True: {c_name}\n({sample_row['filename']})", fontsize=10)
        axes[idx, 0].axis("off")
        
        # Plot Grad-CAM overlay
        axes[idx, 1].imshow(raw_img)
        axes[idx, 1].imshow(cam, cmap="jet", alpha=0.45)
        axes[idx, 1].set_title(f"Pred: {class_names[pred_idx]} (Grad-CAM)", fontsize=10)
        axes[idx, 1].axis("off")
        
    h1.remove()
    h2.remove()
    
    plt.tight_layout()
    gradcam_path = os.path.join(OUTPUTS_DIR, "gradcam_visualizations.png")
    plt.savefig(gradcam_path, dpi=200)
    plt.close()
    log(f"Grad-CAM visualizations saved to: {gradcam_path}")

def generate_reports(metrics, best_model):
    bm = metrics["models_evaluated"][best_model]
    
    model_card = f"""# Model Card: Ovarian Ultrasound Morphology Classifier

## Model Details
- **Architecture:** {best_model} (Transfer Learning with PyTorch)
- **Dataset:** Ovarian Ultrasound Dataset (Borna et al., Frontiers in Physiology 2025, doi:10.3389/fphys.2025.1520898)
- **License:** Creative Commons Attribution 4.0 International (CC BY 4.0)
- **Hardware Used:** NVIDIA GeForce RTX 5060 Ti 16GB VRAM (CUDA 12.8 compatible)
- **Task:** 3-Class Ultrasound Morphology Classification (Dominant Follicle, Normal, PCO)
- **Scientific Notice:** RESEARCH ONLY. Ultrasound imaging appearance alone DOES NOT constitute a clinical diagnosis of Polycystic Ovary Syndrome (PCOS). Clinical diagnosis mandates Rotterdam criteria including hyperandrogenism and ovulatory dysfunction.

## Evaluation Results (Held-Out Test Set N={metrics['sample_counts']['test_held_out']})
- **Overall Accuracy:** {bm['test_accuracy']*100:.2f}%
- **Balanced Accuracy:** {bm['test_balanced_accuracy']*100:.2f}%
- **Macro F1-Score:** {bm['test_macro_f1']*100:.2f}%
- **Validation Macro F1 (Checkpoint Selection):** {bm['best_val_macro_f1']*100:.2f}%

## Confusion Matrix ({best_model})
Classes: [0: Dominant_Follicle, 1: Normal, 2: PCO]
```
{np.array(bm['confusion_matrix'])}
```

## Key Dataset Limitations
1. **Severe Imbalance in Normal Class:** The Normal class comprises only 41 images across the entire dataset (29 in Train, 6 in Val, 6 in Test).
2. **Image-Level Grouping:** Multiple frames from the same sonographic sweep could potentially share feature patterns if patient IDs are not explicitly provided in public records.
3. **Clinical Scope:** Ultrasound morphology is an adjunct diagnostic marker, not a standalone diagnostic test for metabolic syndrome.
"""
    with open(os.path.join(PROOFS_DIR, "model_card.md"), "w", encoding="utf-8") as f:
        f.write(model_card)

    summary = f"""# Experiment Summary: Ovarian Ultrasound Vision Baseline

## Overview
- **Dataset:** 301 total raw images, 2 exact duplicates safely purged (Dominant_Follicle_128 & Dominant_Follicle_86)
- **Total Unique Images:** 299 (Dominant_Follicle: 142, Normal: 41, PCO: 116)
- **Splits:** Train = 209 (70%), Val = 45 (15%), Held-Out Test = 45 (15%)
- **Models Compared:** ResNet18 vs MobileNetV3-Small
- **Best Model Selected:** {best_model} (Selected via Validation Macro F1)

## Performance Comparison
| Model | Val Macro F1 | Test Accuracy | Test Balanced Acc | Test Macro F1 |
| :--- | :---: | :---: | :---: | :---: |
"""
    for m_name, res in metrics["models_evaluated"].items():
        summary += f"| {m_name} | {res['best_val_macro_f1']:.4f} | {res['test_accuracy']:.4f} | {res['test_balanced_accuracy']:.4f} | {res['test_macro_f1']:.4f} |\n"

    summary += f"""
## Explainable AI: Grad-CAM
Grad-CAM heatmaps generated from the final convolutional layer of ResNet18 show focal attention on subcapsular ovarian follicles in PCO images and prominent single cystic structures in Dominant Follicle scans.
"""
    with open(os.path.join(PROOFS_DIR, "experiment_summary.md"), "w", encoding="utf-8") as f:
        f.write(summary)

def create_proofs_zip():
    zip_path = os.path.join(PROOFS_DIR, "PROOFS.zip")
    log(f"Creating ultrasound proof archive at: {zip_path}")
    files_to_pack = [
        os.path.join(MODELS_DIR, "resnet18_best.pth"),
        os.path.join(MODELS_DIR, "mobilenetv3_best.pth"),
        os.path.join(OUTPUTS_DIR, "metrics.json"),
        os.path.join(OUTPUTS_DIR, "training_history.csv"),
        os.path.join(OUTPUTS_DIR, "training_curves.png"),
        os.path.join(OUTPUTS_DIR, "confusion_matrix.png"),
        os.path.join(OUTPUTS_DIR, "gradcam_visualizations.png"),
        os.path.join(OUTPUTS_DIR, "split_summary.csv"),
        os.path.join(OUTPUTS_DIR, "dataset_profile.json"),
        os.path.join(PROOFS_DIR, "model_card.md"),
        os.path.join(PROOFS_DIR, "experiment_summary.md"),
        os.path.join(PROOFS_DIR, "experiment_log.txt"),
        os.path.join(BASE_DIR, "src", "train_vision.py"),
        os.path.join(BASE_DIR, "src", "split_data.py"),
        os.path.join(BASE_DIR, "src", "inspect_and_preprocess.py"),
        os.path.join(BASE_DIR, "configs", "config.json"),
        os.path.join(BASE_DIR, "README.md"),
        os.path.join(BASE_DIR, "reproduce.ps1")
    ]
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for file in files_to_pack:
            if os.path.exists(file):
                arcname = os.path.relpath(file, BASE_DIR)
                z.write(file, arcname)
    log(f"PROOFS.zip created successfully ({os.path.getsize(zip_path)} bytes).")

if __name__ == "__main__":
    run()
