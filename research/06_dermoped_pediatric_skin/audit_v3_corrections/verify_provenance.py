import os, sys, json, hashlib
from pathlib import Path
import pandas as pd

ROOT = Path("F:/Clude cccccccccccccccccccccccc/data we test/06_DermoPed_Pediatric_Skin")
CORR_DIR = ROOT / "audit_v3_corrections"
CORR_DIR.mkdir(parents=True, exist_ok=True)

print("=" * 70)
print("SHASTHOSETU AI: DermoPed Audit V3 Corrections & Provenance Verification")
print("=" * 70)

# 1. Checkpoint Provenance Hashes
p_a = Path("C:/Users/ASHIK_CSE/Downloads/Telegram Desktop/ShasthoSetu_DermoPed_Proofs/model_best.pth")
p_b = ROOT / "proofs" / "EXP_B" / "model_best.pth"
p_d = ROOT / "models" / "model_best.pth"

def get_hash(p):
    if not p.exists():
        return {"exists": False, "sha256": None, "bytes": 0}
    b = p.read_bytes()
    return {
        "exists": True,
        "path": str(p),
        "bytes": len(b),
        "sha256": hashlib.sha256(b).hexdigest()
    }

hashes = {
    "EXP_A_baseline_v1": get_hash(p_a),
    "EXP_B_controlled_v2": get_hash(p_b),
    "EXP_D_regularized_v3": get_hash(p_d)
}

with open(CORR_DIR / "provenance_hashes.json", "w") as f:
    json.dump(hashes, f, indent=2)

print("\n[Checkpoint Provenance Hashes]")
for k, v in hashes.items():
    print(f"  {k}:")
    print(f"    Path:   {v['path']}")
    print(f"    Size:   {v['bytes']} bytes")
    print(f"    SHA256: {v['sha256']}")

# 2. Extract Exact Patient Split Counts Directly from split_manifest.csv
manifest = pd.read_csv(ROOT / "outputs" / "split_manifest.csv")
records = []

for pt_id, g in manifest.groupby("patient_id"):
    cls = g["label"].iloc[0]
    split = g["split"].iloc[0]
    raw_pt = g["raw_patient_folder"].iloc[0]
    exact_manifest_crops = len(g)
    
    # Read metadata.json directly
    meta_path = ROOT / "data" / "processed" / cls / raw_pt / "metadata.json"
    raw_age, sex = "unknown", "unknown"
    if meta_path.exists():
        try:
            m = json.loads(meta_path.read_text())
            raw_age = m.get("access_age", "unknown")
            sex = m.get("sex", "unknown")
        except:
            pass
            
    # Classify pediatric status strictly (Pediatric, Adult, Unknown)
    if raw_age == "unknown" or raw_age is None:
        pediatric_status = "Unknown"
    elif isinstance(raw_age, (int, float)):
        pediatric_status = "Pediatric" if raw_age <= 18 else "Adult"
    elif str(raw_age).isdigit():
        pediatric_status = "Pediatric" if int(raw_age) <= 18 else "Adult"
    else:
        pediatric_status = "Unknown"
        
    records.append({
        "split": split,
        "label": cls,
        "patient_folder": raw_pt,
        "patient_id": pt_id,
        "access_age": raw_age,
        "sex": sex,
        "pediatric_status": pediatric_status,
        "manifest_crops": exact_manifest_crops
    })

df_splits = pd.DataFrame(records).sort_values(by=["split", "label", "patient_folder"]).reset_index(drop=True)
df_splits.to_csv(CORR_DIR / "corrected_patient_splits.csv", index=False)

print("\n[Corrected Patient Split Table - Dynamically Computed]")
print(df_splits.to_string())

# Verification of Totals
split_totals = df_splits.groupby(["split", "label"])["manifest_crops"].sum().unstack(fill_value=0)
print("\n[Verified Split Crop Totals]")
print(split_totals)

pt_totals = df_splits.groupby(["split", "label"])["patient_folder"].count().unstack(fill_value=0)
print("\n[Verified Split Patient Counts]")
print(pt_totals)

print("\n[Demographic Breakdown]")
print(df_splits["pediatric_status"].value_counts())
