import json
from pathlib import Path
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from PIL import Image
from sklearn.metrics import classification_report, confusion_matrix, f1_score, accuracy_score
from torchvision import transforms
from torchvision.models import resnet18

ROOT = Path("F:/Clude cccccccccccccccccccccccc/data we test/06_DermoPed_Pediatric_Skin")
AUDIT_DIR = ROOT / "audit_v2"
AUDIT_DIR.mkdir(parents=True, exist_ok=True)

manifest = pd.read_csv(ROOT / "outputs" / "split_manifest.csv")
classes = ["chickenpox", "pediculosis"]
cls2idx = {c: i for i, c in enumerate(classes)}

eval_t = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

# Load Model
ckpt = torch.load(ROOT / "models" / "model_best.pth", map_location="cpu")
model = resnet18()
model.fc = nn.Sequential(
    nn.Dropout(p=0.5),
    nn.Linear(model.fc.in_features, len(classes))
)
model.load_state_dict(ckpt["state_dict"])
model.eval()

def run_split_eval(split_name):
    df_sub = manifest[manifest["split"] == split_name].copy().reset_index(drop=True)
    records = []
    with torch.no_grad():
        for idx, row in df_sub.iterrows():
            with Image.open(row["filepath"]) as im:
                tensor = eval_t(im.convert("RGB")).unsqueeze(0)
            logits = model(tensor)[0]
            probs = torch.softmax(logits, dim=0).numpy()
            pred_idx = int(np.argmax(probs))
            records.append({
                "filepath": row["filepath"],
                "split": split_name,
                "patient_id": row["patient_id"],
                "raw_patient_folder": row["raw_patient_folder"],
                "true_label": row["label"],
                "true_idx": cls2idx[row["label"]],
                "pred_label": classes[pred_idx],
                "pred_idx": pred_idx,
                "correct": int(pred_idx == cls2idx[row["label"]]),
                "prob_chickenpox": float(probs[0]),
                "prob_pediculosis": float(probs[1]),
                "logit_chickenpox": float(logits[0]),
                "logit_pediculosis": float(logits[1])
            })
    return pd.DataFrame(records)

df_val = run_split_eval("val")
df_test = run_split_eval("test")

# Recalculate Val Metrics
val_acc = accuracy_score(df_val["true_idx"], df_val["pred_idx"])
val_f1 = f1_score(df_val["true_idx"], df_val["pred_idx"], average="macro")
val_cm = confusion_matrix(df_val["true_idx"], df_val["pred_idx"], labels=[0, 1])

# Patient level val
val_pts = []
for pt, g in df_val.groupby("patient_id"):
    true_cls = g["true_idx"].iloc[0]
    avg_probs = [g["prob_chickenpox"].mean(), g["prob_pediculosis"].mean()]
    pred_cls = int(np.argmax(avg_probs))
    val_pts.append({"patient_id": pt, "true_idx": true_cls, "pred_idx": pred_cls, "correct": int(pred_cls == true_cls)})
df_val_pts = pd.DataFrame(val_pts)
val_pt_acc = accuracy_score(df_val_pts["true_idx"], df_val_pts["pred_idx"])
val_pt_f1 = f1_score(df_val_pts["true_idx"], df_val_pts["pred_idx"], average="macro")

# Recalculate Test Metrics
test_acc = accuracy_score(df_test["true_idx"], df_test["pred_idx"])
test_f1 = f1_score(df_test["true_idx"], df_test["pred_idx"], average="macro")
test_cm = confusion_matrix(df_test["true_idx"], df_test["pred_idx"], labels=[0, 1])

# Patient level test
test_pts = []
for pt, g in df_test.groupby("patient_id"):
    true_cls = g["true_idx"].iloc[0]
    avg_probs = [g["prob_chickenpox"].mean(), g["prob_pediculosis"].mean()]
    pred_cls = int(np.argmax(avg_probs))
    test_pts.append({"patient_id": pt, "true_idx": true_cls, "pred_idx": pred_cls, "correct": int(pred_cls == true_cls)})
df_test_pts = pd.DataFrame(test_pts)
test_pt_acc = accuracy_score(df_test_pts["true_idx"], df_test_pts["pred_idx"])
test_pt_f1 = f1_score(df_test_pts["true_idx"], df_test_pts["pred_idx"], average="macro")

recalc = {
    "validation": {
        "total_crops": len(df_val),
        "total_patients": len(df_val_pts),
        "image_accuracy": float(val_acc),
        "image_macro_f1": float(val_f1),
        "confusion_matrix": val_cm.tolist(),
        "chickenpox_recall": float(val_cm[0, 0] / val_cm[0].sum()),
        "pediculosis_recall": float(val_cm[1, 1] / val_cm[1].sum()),
        "patient_accuracy": float(val_pt_acc),
        "patient_macro_f1": float(val_pt_f1)
    },
    "test": {
        "total_crops": len(df_test),
        "total_patients": len(df_test_pts),
        "image_accuracy": float(test_acc),
        "image_macro_f1": float(test_f1),
        "confusion_matrix": test_cm.tolist(),
        "chickenpox_recall": float(test_cm[0, 0] / test_cm[0].sum()),
        "pediculosis_recall": float(test_cm[1, 1] / test_cm[1].sum()),
        "patient_accuracy": float(test_pt_acc),
        "patient_macro_f1": float(test_pt_f1)
    }
}
with open(AUDIT_DIR / "recalculated_metrics.json", "w") as f:
    json.dump(recalc, f, indent=2)
print("Recalculated Metrics:")
print(json.dumps(recalc, indent=2))

df_val.to_csv(AUDIT_DIR / "validation_error_analysis.csv", index=False)
df_test.to_csv(AUDIT_DIR / "test_prediction_audit.csv", index=False)

# Detailed breakdown of Pediculosis in val vs test
val_ped = df_val[df_val["true_label"] == "pediculosis"]
print("\n=== Pediculosis Validation Patient Predictions (patient71) ===")
print(f"Total crops: {len(val_ped)}")
print(f"Average prob_chickenpox: {val_ped['prob_chickenpox'].mean():.4f}, Average prob_pediculosis: {val_ped['prob_pediculosis'].mean():.4f}")
print(f"Min prob_chickenpox: {val_ped['prob_chickenpox'].min():.4f}, Max prob_chickenpox: {val_ped['prob_chickenpox'].max():.4f}")

test_ped = df_test[df_test["true_label"] == "pediculosis"]
print("\n=== Pediculosis Test Patient Predictions (patient74) ===")
print(f"Total crops: {len(test_ped)}")
print(f"Average prob_chickenpox: {test_ped['prob_chickenpox'].mean():.4f}, Average prob_pediculosis: {test_ped['prob_pediculosis'].mean():.4f}")
print(f"Min prob_pediculosis: {test_ped['prob_pediculosis'].min():.4f}, Max prob_pediculosis: {test_ped['prob_pediculosis'].max():.4f}")

# Comparison Table between EXP_A, EXP_B, EXP_D
comp_data = [
    {
        "Experiment": "EXP_A (Baseline v1)",
        "Backbone": "Fully Trainable",
        "Loss_Sampler": "Double-weighting / Shuffle",
        "Val_Macro_F1": "48.37%",
        "Val_Chickenpox_Recall": "91.67%",
        "Val_Pediculosis_Recall": "5.00%",
        "Test_Image_Acc": "95.45%",
        "Test_Patient_Acc": "75.00% (3/4)",
        "Device": "Colab T4 GPU"
    },
    {
        "Experiment": "EXP_B (Controlled v2)",
        "Backbone": "Fully Trainable",
        "Loss_Sampler": "WeightedRandomSampler + Unweighted Loss",
        "Val_Macro_F1": "57.76%",
        "Val_Chickenpox_Recall": "100.00%",
        "Val_Pediculosis_Recall": "15.00%",
        "Test_Image_Acc": "92.73%",
        "Test_Patient_Acc": "75.00% (3/4)",
        "Device": "Colab T4 GPU"
    },
    {
        "Experiment": "EXP_D (Regularized v3)",
        "Backbone": "Frozen (conv1..l3) + Dropout 0.5",
        "Loss_Sampler": "WeightedRandomSampler + Unweighted Loss",
        "Val_Macro_F1": "43.90%",
        "Val_Chickenpox_Recall": "100.00%",
        "Val_Pediculosis_Recall": "0.00%",
        "Test_Image_Acc": "100.00%",
        "Test_Patient_Acc": "100.00% (4/4)",
        "Device": "Local PC (CPU execution)"
    }
]
df_comp = pd.DataFrame(comp_data)
df_comp.to_csv(AUDIT_DIR / "comparison_table.csv", index=False)
print("\n=== Comparison Table ===")
print(df_comp.to_string(index=False))
