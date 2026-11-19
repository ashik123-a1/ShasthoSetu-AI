import os
import json
import pandas as pd
from sklearn.model_selection import train_test_split

BASE_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\03_Measles_Viral_Rash"
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")
CLEAN_MANIFEST_PATH = os.path.join(PROCESSED_DIR, "clean_split_manifest.csv")
GROUPED_MANIFEST_PATH = os.path.join(PROCESSED_DIR, "clean_grouped_split_manifest.csv")
AUDIT_CSV_PATH = r"F:\Clude cccccccccccccccccccccccc\data we test\_reports\corrected_submission_v2\MCVSLD_SOURCE_FAMILY_AUDIT.csv"

print("=" * 70)
print("MCVSLD Source-Family Grouped Partition & Leakage Remediation")
print("=" * 70)

df = pd.read_csv(CLEAN_MANIFEST_PATH)
print(f"Loaded clean deduplicated manifest: {len(df)} images.")

def extract_family(fname):
    base = fname.rsplit(".", 1)[0]
    tokens = base.split("_")
    if len(tokens) >= 3:
        return "_".join(tokens[:3])
    return base

df["family_id"] = df["filename"].apply(extract_family)
unique_fams = df["family_id"].nunique()
print(f"Extracted {unique_fams} unique source-family IDs across {len(df)} images.")

# Historical clean_split leakage audit
train_hist_families = set(df[df["clean_split"] == "train"]["family_id"])
test_hist_df = df[df["clean_split"] == "test"]
hist_leak_count = test_hist_df["family_id"].isin(train_hist_families).sum()
print(f"Historical Image-Level Split Leakage: {hist_leak_count} / {len(test_hist_df)} test images ({hist_leak_count/len(test_hist_df)*100:.2f}%) shared source families with Train!")

# Build unique family table
fam_table = df[["family_id", "class_label"]].drop_duplicates().reset_index(drop=True)

# Stratified group split by class_label
train_fams, test_val_fams = train_test_split(
    fam_table, test_size=0.30, stratify=fam_table["class_label"], random_state=42
)
val_fams, test_fams = train_test_split(
    test_val_fams, test_size=0.50, stratify=test_val_fams["class_label"], random_state=42
)

train_set = set(train_fams["family_id"])
val_set = set(val_fams["family_id"])
test_set = set(test_fams["family_id"])

# Enforce strict 0% overlap assertions
assert len(train_set.intersection(val_set)) == 0, "Source-family leakage between Train and Val!"
assert len(train_set.intersection(test_set)) == 0, "Source-family leakage between Train and Test!"
assert len(val_set.intersection(test_set)) == 0, "Source-family leakage between Val and Test!"

def assign_grouped_split(fid):
    if fid in train_set:
        return "train"
    elif fid in val_set:
        return "val"
    else:
        return "test"

df["grouped_split"] = df["family_id"].apply(assign_grouped_split)

# Save grouped manifest
df.to_csv(GROUPED_MANIFEST_PATH, index=False)
print(f"Saved clean grouped manifest to: {GROUPED_MANIFEST_PATH}")

# Generate Source Family Audit CSV
audit_records = []
for fid, group in df.groupby("family_id"):
    audit_records.append({
        "family_id": fid,
        "class_label": group["class_label"].iloc[0],
        "image_count": len(group),
        "historical_clean_split_spread": "-".join(sorted(group["clean_split"].unique())),
        "historical_is_leaked_across_splits": group["clean_split"].nunique() > 1,
        "corrected_grouped_split": group["grouped_split"].iloc[0]
    })

audit_df = pd.DataFrame(audit_records)
audit_df.to_csv(AUDIT_CSV_PATH, index=False)
print(f"Saved source-family audit ledger to: {AUDIT_CSV_PATH}")

# Print summary
summary_crosstab = pd.crosstab(df["class_label"], df["grouped_split"])
print("\nCorrected Grouped Split Distribution:")
print(summary_crosstab)
print("\nUnique Families per Split:")
print(f"  Train: {len(train_set)} families ({len(df[df['grouped_split']=='train'])} images)")
print(f"  Val  : {len(val_set)} families ({len(df[df['grouped_split']=='val'])} images)")
print(f"  Test : {len(test_set)} families ({len(df[df['grouped_split']=='test'])} images)")
print(f"  Zero Family Overlap Verified: True (0.0% leakage)")
