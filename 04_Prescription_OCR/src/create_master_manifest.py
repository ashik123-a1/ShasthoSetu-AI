import os
import json
import hashlib
import pandas as pd
from PIL import Image
import numpy as np

base_dir = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR"
raw_dir = os.path.join(base_dir, "data", "raw", "extracted")
csv_path = os.path.join(raw_dir, "Prescription_Dataset(1000)", "Prescriptions_Dataset.csv")
images_dir = os.path.join(raw_dir, "images", "Prescription_ images.jpg")
processed_dir = os.path.join(base_dir, "data", "processed")
outputs_dir = os.path.join(base_dir, "outputs")

os.makedirs(processed_dir, exist_ok=True)
os.makedirs(outputs_dir, exist_ok=True)

df_raw = pd.read_csv(csv_path)

# Map disk images by stem
disk_files = sorted(os.listdir(images_dir))
stem_to_disk = {os.path.splitext(f)[0]: f for f in disk_files}

# Check raw rows
clean_rows = []
for idx, row in df_raw.iterrows():
    raw_fname = str(row.get("image_filename", "")).strip()
    if not raw_fname or raw_fname == "nan":
        continue
    
    # Handle comma typo like '0174,jpg'
    norm_fname = raw_fname.replace(",", ".")
    stem = os.path.splitext(norm_fname)[0].strip()
    
    # Specific known dataset index alignment:
    # Row 674 in CSV was labeled 0675.jpg (Acetaminophen), and row 675 was labeled 0676.jpg (Amphotericin),
    # while disk has 0674.jpeg (Amphotericin), 0675.jpeg (Acetaminophen), 0676.jpeg (Ferox).
    # If stem is duplicated in CSV, we map to actual disk stems
    en_text = str(row.get("description_english", "")).strip() if pd.notnull(row.get("description_english")) else ""
    bn_text = str(row.get("description_bangla", "")).strip() if pd.notnull(row.get("description_bangla")) else ""
    
    clean_rows.append({
        "raw_csv_idx": idx,
        "raw_filename": raw_fname,
        "stem": stem,
        "description_english": en_text,
        "description_bangla": bn_text
    })

df_clean = pd.DataFrame(clean_rows)
print(f"Total raw clean rows: {len(df_clean)}")

# Deduplicate rows with identical stem and identical text
exact_dups = df_clean[df_clean.duplicated(subset=["stem", "description_english"], keep="first")]
print(f"Exact duplicate rows in CSV: {len(exact_dups)}")
for idx, r in exact_dups.iterrows():
    print(f"  Dropping duplicate: raw_idx={r['raw_csv_idx']}, stem={r['stem']}")

df_clean = df_clean.drop_duplicates(subset=["stem", "description_english"], keep="first").copy()
print(f"Rows after dropping exact duplicates: {len(df_clean)}")

# Check remaining duplicate stems with divergent text (0185 and 0676)
stem_counts = df_clean["stem"].value_counts()
dup_stems = stem_counts[stem_counts > 1].index.tolist()
print(f"Remaining duplicate stems in CSV: {dup_stems}")

for s in dup_stems:
    sub = df_clean[df_clean["stem"] == s]
    print(f"\nDiscrepancy for stem {s}:")
    for _, r in sub.iterrows():
        print(f"  raw_idx={r['raw_csv_idx']}: {r['description_english'][:80]}...")

# Handle known alignment:
# For stem 0185: raw_idx 185 is 'Histal 4 mg' (stem 0185). raw_idx 186 is 'Diclofen 50 mg' -> matches stem 0186 on disk!
df_clean.loc[df_clean["raw_csv_idx"] == 186, "stem"] = "0186"

# For stem 0676: raw_idx 674 is 'Acetaminophen 650' (labeled 0675), raw_idx 675 is 'Liposomal Amphotericin' (labeled 0676 -> stem 0674 on disk),
# raw_idx 676 is 'Ferox capsule' (labeled 0676 -> stem 0676 on disk).
df_clean.loc[df_clean["raw_csv_idx"] == 675, "stem"] = "0674"

print("\nAfter alignment, unique stems in CSV:", df_clean["stem"].nunique())

# Match with disk images
manifest_records = []
unmatched_disk = []

for stem, disk_f in stem_to_disk.items():
    fpath = os.path.join(images_dir, disk_f)
    fsize = os.path.getsize(fpath)
    
    # Compute SHA-256
    h = hashlib.sha256()
    with open(fpath, "rb") as fp:
        while chunk := fp.read(65536):
            h.update(chunk)
    sha = h.hexdigest()
    
    # Image properties
    with Image.open(fpath) as img:
        w, h_dim = img.size
        mode = img.mode
        fmt = img.format
        
    ann_row = df_clean[df_clean["stem"] == stem]
    if len(ann_row) > 0:
        row_data = ann_row.iloc[0]
        manifest_records.append({
            "prescription_id": stem,
            "filename": disk_f,
            "relative_path": os.path.relpath(fpath, base_dir),
            "sha256": sha,
            "width": w,
            "height": h_dim,
            "file_size_bytes": fsize,
            "description_english": row_data["description_english"],
            "description_bangla": row_data["description_bangla"],
            "has_annotation": True,
            "raw_csv_index": int(row_data["raw_csv_idx"])
        })
    else:
        manifest_records.append({
            "prescription_id": stem,
            "filename": disk_f,
            "relative_path": os.path.relpath(fpath, base_dir),
            "sha256": sha,
            "width": w,
            "height": h_dim,
            "file_size_bytes": fsize,
            "description_english": "",
            "description_bangla": "",
            "has_annotation": False,
            "raw_csv_index": -1
        })
        unmatched_disk.append(stem)

manifest_df = pd.DataFrame(manifest_records)
print(f"\nTotal manifest records: {len(manifest_df)}")
print(f"Records with annotations: {manifest_df['has_annotation'].sum()}")
print(f"Records missing annotations (unmatched disk images): {len(unmatched_disk)} ({unmatched_disk})")

# Stratified / Leakage-free train / val / test split on annotated records
annotated_df = manifest_df[manifest_df["has_annotation"]].copy()

# Group by image hash to prevent duplicate image leakage
hash_groups = annotated_df.groupby("sha256")["prescription_id"].apply(list).to_dict()
unique_hashes = list(hash_groups.keys())
print(f"Unique image hashes among annotated: {len(unique_hashes)}")

# Seed for reproducible split
np.random.seed(42)
shuffled_hashes = np.random.permutation(unique_hashes)

n_total = len(shuffled_hashes)
n_train = int(n_total * 0.70)
n_val = int(n_total * 0.15)
n_test = n_total - n_train - n_val

train_hashes = set(shuffled_hashes[:n_train])
val_hashes = set(shuffled_hashes[n_train:n_train + n_val])
test_hashes = set(shuffled_hashes[n_train + n_val:])

def assign_split(row):
    if not row["has_annotation"]:
        return "unannotated"
    if row["sha256"] in train_hashes:
        return "train"
    elif row["sha256"] in val_hashes:
        return "val"
    elif row["sha256"] in test_hashes:
        return "test"
    return "unknown"

manifest_df["split"] = manifest_df.apply(assign_split, axis=1)
print("\nSplit Distribution (images):")
print(manifest_df["split"].value_counts())

# Check for duplicate image leakage across splits
dup_hashes = manifest_df[manifest_df["has_annotation"]].groupby("sha256")["split"].nunique()
leaked = dup_hashes[dup_hashes > 1]
print(f"Hashes appearing in multiple splits (leakage count): {len(leaked)}")
assert len(leaked) == 0, "DATA LEAKAGE DETECTED ACROSS SPLITS!"

# Save master split manifest
manifest_path = os.path.join(processed_dir, "split_manifest.csv")
manifest_df.to_csv(manifest_path, index=False)
print(f"Saved master split manifest to {manifest_path}")

# Text length statistics
annotated_df = manifest_df[manifest_df["has_annotation"]].copy()
annotated_df["en_len"] = annotated_df["description_english"].str.len()
annotated_df["bn_len"] = annotated_df["description_bangla"].str.len()
annotated_df["en_word_count"] = annotated_df["description_english"].str.split().apply(len)
annotated_df["bn_word_count"] = annotated_df["description_bangla"].str.split().apply(len)

stats = {
    "total_images_on_disk": len(manifest_df),
    "total_annotated_images": int(annotated_df["has_annotation"].sum()),
    "total_unannotated_images": int((~manifest_df["has_annotation"]).sum()),
    "unannotated_prescription_ids": unmatched_disk,
    "split_counts": manifest_df["split"].value_counts().to_dict(),
    "english_text": {
        "mean_chars": float(annotated_df["en_len"].mean()),
        "min_chars": int(annotated_df["en_len"].min()),
        "max_chars": int(annotated_df["en_len"].max()),
        "mean_words": float(annotated_df["en_word_count"].mean()),
        "min_words": int(annotated_df["en_word_count"].min()),
        "max_words": int(annotated_df["en_word_count"].max())
    },
    "bangla_text": {
        "mean_chars": float(annotated_df["bn_len"].mean()),
        "min_chars": int(annotated_df["bn_len"].min()),
        "max_chars": int(annotated_df["bn_len"].max()),
        "mean_words": float(annotated_df["bn_word_count"].mean()),
        "min_words": int(annotated_df["bn_word_count"].min()),
        "max_words": int(annotated_df["bn_word_count"].max())
    }
}

with open(os.path.join(processed_dir, "dataset_stats.json"), "w", encoding="utf-8") as fp:
    json.dump(stats, fp, indent=2, ensure_ascii=False)

print("\n--- Dataset Stats Summary ---")
print(json.dumps(stats, indent=2, ensure_ascii=False))
