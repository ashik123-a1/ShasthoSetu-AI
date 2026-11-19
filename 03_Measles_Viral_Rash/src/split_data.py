import os
import json
import pandas as pd
from sklearn.model_selection import train_test_split

BASE_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\03_Measles_Viral_Rash"
MANIFEST_PATH = os.path.join(BASE_DIR, "data", "processed", "dataset_manifest.csv")
CLEAN_SPLIT_MANIFEST = os.path.join(BASE_DIR, "data", "processed", "clean_split_manifest.csv")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
PROOFS_DIR = os.path.join(BASE_DIR, "proofs")

df = pd.read_csv(MANIFEST_PATH)
print(f"Loaded full dataset manifest: {len(df)} images.")

# Step 1: Deduplicate on SHA-256 hash to keep 1 canonical image per unique hash
clean_df = df.drop_duplicates(subset=["sha256"]).copy().reset_index(drop=True)
print(f"Clean unique images after exact deduplication: {len(clean_df)}")

# Step 2: Stratified 70 / 15 / 15 Train / Val / Test split
# First, split into 70% Train and 30% Temp
train_df, temp_df = train_test_split(
    clean_df,
    test_size=0.30,
    random_state=42,
    stratify=clean_df["class_label"]
)

# Then split Temp 50/50 into Val (15%) and Test (15%)
val_df, test_df = train_test_split(
    temp_df,
    test_size=0.50,
    random_state=42,
    stratify=temp_df["class_label"]
)

train_df = train_df.copy()
val_df = val_df.copy()
test_df = test_df.copy()

train_df["clean_split"] = "train"
val_df["clean_split"] = "val"
test_df["clean_split"] = "test"

split_df = pd.concat([train_df, val_df, test_df], ignore_index=True)

# Verify 0% hash leakage across splits
train_hashes = set(train_df["sha256"])
val_hashes = set(val_df["sha256"])
test_hashes = set(test_df["sha256"])

assert len(train_hashes.intersection(val_hashes)) == 0, "ERROR: Leakage between Train and Val!"
assert len(train_hashes.intersection(test_hashes)) == 0, "ERROR: Leakage between Train and Test!"
assert len(val_hashes.intersection(test_hashes)) == 0, "ERROR: Leakage between Val and Test!"
print("Zero hash leakage verified across Train, Val, and Test splits!")

# Save clean split manifest
split_df.to_csv(CLEAN_SPLIT_MANIFEST, index=False)
print(f"Saved clean split manifest to {CLEAN_SPLIT_MANIFEST}")

# Summary table
summary_table = split_df.pivot_table(index="class_label", columns="clean_split", values="filename", aggfunc="count")
summary_table["TOTAL"] = summary_table.sum(axis=1)
print("\nClean Stratified Split Breakdown:")
print(summary_table)

summary_csv = os.path.join(OUTPUTS_DIR, "clean_split_summary.csv")
summary_table.to_csv(summary_csv)
summary_table.to_csv(os.path.join(PROOFS_DIR, "clean_split_summary.csv"))
print(f"Saved split summary to {summary_csv}")
