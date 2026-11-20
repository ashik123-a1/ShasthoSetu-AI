import os
import json
import pandas as pd
from sklearn.model_selection import train_test_split

BASE_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR"
MANIFEST_PATH = os.path.join(BASE_DIR, "data", "processed", "prescription_manifest.csv")
SPLIT_MANIFEST_PATH = os.path.join(BASE_DIR, "data", "processed", "split_manifest.csv")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
PROOFS_DIR = os.path.join(BASE_DIR, "proofs")

df = pd.read_csv(MANIFEST_PATH)
print(f"Loaded prescription manifest: {len(df)} images.")

# Step 1: Exact deduplication (keep 1 canonical image per unique sha256 hash)
clean_df = df.drop_duplicates(subset=["sha256"]).copy().reset_index(drop=True)
print(f"Clean unique images after exact deduplication: {len(clean_df)}")

# Step 2: Split 70% Train, 15% Val, 15% Test with random_state=42
train_df, temp_df = train_test_split(
    clean_df,
    test_size=0.30,
    random_state=42
)

val_df, test_df = train_test_split(
    temp_df,
    test_size=0.50,
    random_state=42
)

train_df = train_df.copy()
val_df = val_df.copy()
test_df = test_df.copy()

train_df["split"] = "train"
val_df["split"] = "val"
test_df["split"] = "test"

split_df = pd.concat([train_df, val_df, test_df], ignore_index=True)

# Verify 0% hash leakage
train_hashes = set(train_df["sha256"])
val_hashes = set(val_df["sha256"])
test_hashes = set(test_df["sha256"])

assert len(train_hashes.intersection(val_hashes)) == 0, "ERROR: Leakage between Train and Val!"
assert len(train_hashes.intersection(test_hashes)) == 0, "ERROR: Leakage between Train and Test!"
assert len(val_hashes.intersection(test_hashes)) == 0, "ERROR: Leakage between Val and Test!"
print("Zero hash leakage verified across Train, Val, and Test splits!")

split_df.to_csv(SPLIT_MANIFEST_PATH, index=False)
print(f"Saved split manifest to {SPLIT_MANIFEST_PATH}")

summary = {
    "total_clean_unique_images": len(clean_df),
    "train_samples": len(train_df),
    "val_samples": len(val_df),
    "test_samples": len(test_df),
    "split_ratios": {"train": 0.70, "val": 0.15, "test": 0.15},
    "random_seed": 42
}

with open(os.path.join(OUTPUTS_DIR, "split_summary.json"), "w", encoding="utf-8") as f:
    json.dump(summary, f, indent=2)
with open(os.path.join(PROOFS_DIR, "split_summary.json"), "w", encoding="utf-8") as f:
    json.dump(summary, f, indent=2)

print("\nSplit Summary:")
print(f"  Train: {len(train_df)} (70%)")
print(f"  Val:   {len(val_df)} (15%)")
print(f"  Test:  {len(test_df)} (15%)")
