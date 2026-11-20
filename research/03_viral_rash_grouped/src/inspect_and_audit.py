import os
import sys
import time
import json
import hashlib
from collections import Counter, defaultdict
import pandas as pd
from PIL import Image

BASE_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\03_Measles_Viral_Rash"
EXTRACT_DIR = os.path.join(BASE_DIR, "data", "raw", "extracted", "Skin Lesion Dataset")
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
PROOFS_DIR = os.path.join(BASE_DIR, "proofs")
CONFIGS_DIR = os.path.join(BASE_DIR, "configs")

os.makedirs(PROCESSED_DIR, exist_ok=True)
os.makedirs(OUTPUTS_DIR, exist_ok=True)
os.makedirs(PROOFS_DIR, exist_ok=True)
os.makedirs(CONFIGS_DIR, exist_ok=True)

print("Starting deep inspection, integrity check, and duplicate audit of MCVSLD dataset...")
start_time = time.time()

records = []
corrupt_files = []
md5_map = defaultdict(list)
sha256_map = defaultdict(list)

splits = ["train", "val", "test"]
classes = ["Chickenpox", "Cowpox", "HFMD", "Healthy", "Measles", "Monkeypox"]

total_scanned = 0

for split in splits:
    split_dir = os.path.join(EXTRACT_DIR, split)
    if not os.path.exists(split_dir):
        continue
    for cls in classes:
        cls_dir = os.path.join(split_dir, cls)
        if not os.path.exists(cls_dir):
            continue
        filenames = os.listdir(cls_dir)
        for fname in filenames:
            if not fname.lower().endswith((".jpg", ".jpeg", ".png")):
                continue
            fpath = os.path.join(cls_dir, fname)
            rel_path = os.path.relpath(fpath, BASE_DIR)
            total_scanned += 1
            
            # File size and hashes
            fsize = os.path.getsize(fpath)
            
            md5_h = hashlib.md5()
            sha_h = hashlib.sha256()
            with open(fpath, "rb") as f:
                while chunk := f.read(65536):
                    md5_h.update(chunk)
                    sha_h.update(chunk)
            md5_val = md5_h.hexdigest()
            sha_val = sha_h.hexdigest()
            
            # Image integrity
            is_valid = True
            width, height, mode, fmt = 0, 0, "", ""
            try:
                with Image.open(fpath) as img:
                    img.verify()
                with Image.open(fpath) as img:
                    width, height = img.size
                    mode = img.mode
                    fmt = img.format
            except Exception as e:
                is_valid = False
                corrupt_files.append({"file": rel_path, "error": str(e)})

            item = {
                "filename": fname,
                "split": split,
                "class_label": cls,
                "relative_path": rel_path,
                "file_size_bytes": fsize,
                "width": width,
                "height": height,
                "mode": mode,
                "format": fmt,
                "is_valid": is_valid,
                "md5": md5_val,
                "sha256": sha_val
            }
            records.append(item)
            md5_map[md5_val].append(item)
            sha256_map[sha_val].append(item)

print(f"Scanned {len(records)} images in {time.time() - start_time:.2f} seconds.")
print(f"Corrupt or unreadable files found: {len(corrupt_files)}")

# Duplicate Analysis
exact_duplicate_groups = {k: v for k, v in sha256_map.items() if len(v) > 1}
print(f"Total unique file hashes: {len(sha256_map)}")
print(f"Total exact duplicate groups: {len(exact_duplicate_groups)}")

cross_split_duplicates = []
cross_class_duplicates = []

for h, group in exact_duplicate_groups.items():
    splits_in_group = set(x["split"] for x in group)
    classes_in_group = set(x["class_label"] for x in group)
    if len(splits_in_group) > 1:
        cross_split_duplicates.append(group)
    if len(classes_in_group) > 1:
        cross_class_duplicates.append(group)

print(f"Cross-split duplicate groups (leakage risk): {len(cross_split_duplicates)}")
print(f"Cross-class duplicate groups (label error risk): {len(cross_class_duplicates)}")

df = pd.DataFrame(records)
# Mark duplicates in dataframe
duplicate_hashes = set(exact_duplicate_groups.keys())
df["is_exact_duplicate"] = df["sha256"].isin(duplicate_hashes)

# Save manifests
manifest_path = os.path.join(PROCESSED_DIR, "dataset_manifest.csv")
df.to_csv(manifest_path, index=False)
print(f"Saved dataset manifest to {manifest_path}")

# Class distribution by split
dist_table = df.pivot_table(index="class_label", columns="split", values="filename", aggfunc="count", fill_value=0)
dist_table["TOTAL"] = dist_table.sum(axis=1)
print("\nClass Distribution Table:")
print(dist_table)

# Dimension stats
res_summary = {
    "min_width": int(df["width"].min()),
    "max_width": int(df["width"].max()),
    "mean_width": round(float(df["width"].mean()), 1),
    "min_height": int(df["height"].min()),
    "max_height": int(df["height"].max()),
    "mean_height": round(float(df["height"].mean()), 1),
    "modes": df["mode"].value_counts().to_dict(),
    "formats": df["format"].value_counts().to_dict()
}

profile = {
    "dataset_name": "Multi-Class Viral Skin Lesion Dataset (MCVSLD)",
    "doi": "10.17632/dfztdtfsxz.1",
    "license": "Creative Commons Attribution 4.0 International (CC BY 4.0)",
    "authors": [
        "Kazi Rifat Ahmed",
        "Md. Mazbaur Rashid",
        "Suprove Chandra Sarkar",
        "Mujahidul Islam"
    ],
    "institution": "Daffodil International University, Bangladesh",
    "publication_date": "2024-12-31",
    "total_images": len(df),
    "corrupt_images": len(corrupt_files),
    "total_unique_hashes": len(sha256_map),
    "exact_duplicate_groups": len(exact_duplicate_groups),
    "cross_split_duplicate_groups": len(cross_split_duplicates),
    "cross_class_duplicate_groups": len(cross_class_duplicates),
    "split_distribution": df["split"].value_counts().to_dict(),
    "class_distribution": df["class_label"].value_counts().to_dict(),
    "split_class_breakdown": {
        split: df[df["split"] == split]["class_label"].value_counts().to_dict()
        for split in splits
    },
    "image_resolutions": res_summary
}

with open(os.path.join(OUTPUTS_DIR, "dataset_profile.json"), "w", encoding="utf-8") as f:
    json.dump(profile, f, indent=2)
with open(os.path.join(PROOFS_DIR, "dataset_profile.json"), "w", encoding="utf-8") as f:
    json.dump(profile, f, indent=2)

print("\nAudit completed and profile saved successfully!")
