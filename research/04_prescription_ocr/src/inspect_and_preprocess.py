import os
import sys
import json
import hashlib
from collections import defaultdict
import pandas as pd
from PIL import Image

BASE_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR"
EXTRACT_DIR = os.path.join(BASE_DIR, "data", "raw", "extracted")
CSV_PATH = os.path.join(EXTRACT_DIR, "Prescription_Dataset(1000)", "Prescriptions_Dataset.csv")
IMAGES_DIR = os.path.join(EXTRACT_DIR, "images", "Prescription_ images.jpg")
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
PROOFS_DIR = os.path.join(BASE_DIR, "proofs")
CONFIGS_DIR = os.path.join(BASE_DIR, "configs")

os.makedirs(PROCESSED_DIR, exist_ok=True)
os.makedirs(OUTPUTS_DIR, exist_ok=True)
os.makedirs(PROOFS_DIR, exist_ok=True)
os.makedirs(CONFIGS_DIR, exist_ok=True)

print("Starting deep inspection and preprocessing of Prescription OCR dataset...")

# Step 1: Read raw CSV annotations
df_raw = pd.read_csv(CSV_PATH)
df_raw = df_raw.dropna(subset=["image_filename"]).copy()

# Step 2: Stem-based mapping of disk files
disk_files = os.listdir(IMAGES_DIR)
stem_to_disk_file = {}
for f in disk_files:
    stem = os.path.splitext(f)[0].strip()
    stem_to_disk_file[stem] = f

print(f"Total images on disk: {len(disk_files)}")
print(f"Total annotation rows in CSV: {len(df_raw)}")

# Step 3: Group multi-line prescription annotations by normalized stem
grouped_annotations = defaultdict(lambda: {"english_lines": [], "bangla_lines": []})

for idx, row in df_raw.iterrows():
    raw_fname = str(row["image_filename"]).replace(",", ".").strip()
    stem = os.path.splitext(raw_fname)[0].strip()
    
    en = str(row["description_english"]).strip() if pd.notnull(row["description_english"]) else ""
    bn = str(row["description_bangla"]).strip() if pd.notnull(row["description_bangla"]) else ""
    
    if en and en not in grouped_annotations[stem]["english_lines"]:
        grouped_annotations[stem]["english_lines"].append(en)
    if bn and bn not in grouped_annotations[stem]["bangla_lines"]:
        grouped_annotations[stem]["bangla_lines"].append(bn)

print(f"Unique prescription stems in CSV: {len(grouped_annotations)}")

# Step 4: Verify images and construct clean manifest
records = []
corrupted = []
sha_map = defaultdict(list)

for stem, texts in grouped_annotations.items():
    if stem not in stem_to_disk_file:
        continue
    
    disk_fname = stem_to_disk_file[stem]
    fpath = os.path.join(IMAGES_DIR, disk_fname)
    rel_path = os.path.relpath(fpath, BASE_DIR)
    fsize = os.path.getsize(fpath)
    
    # Hash
    h = hashlib.sha256()
    with open(fpath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    sha_val = h.hexdigest()
    
    # Image integrity
    is_valid = True
    try:
        with Image.open(fpath) as img:
            img.verify()
        with Image.open(fpath) as img:
            w, h_dim = img.size
            mode = img.mode
            fmt = img.format
    except Exception as e:
        is_valid = False
        w, h_dim, mode, fmt = 0, 0, "", "CORRUPTED"
        corrupted.append({"file": disk_fname, "error": str(e)})

    en_text = " ".join(texts["english_lines"])
    bn_text = " ".join(texts["bangla_lines"])

    rec = {
        "stem": stem,
        "filename": disk_fname,
        "relative_path": rel_path,
        "text_english": en_text,
        "text_bangla": bn_text,
        "num_en_lines": len(texts["english_lines"]),
        "num_bn_lines": len(texts["bangla_lines"]),
        "width": w,
        "height": h_dim,
        "aspect_ratio": round(w / max(1, h_dim), 3),
        "mode": mode,
        "format": fmt,
        "file_size_bytes": fsize,
        "is_valid": is_valid,
        "sha256": sha_val
    }
    records.append(rec)
    sha_map[sha_val].append(disk_fname)

print(f"Matched and validated prescription images: {len(records)}")
print(f"Corrupted images: {len(corrupted)}")
print(f"Unique image hashes: {len(sha_map)}")

df_manifest = pd.DataFrame(records)
# Check exact duplicates
exact_dupes = {k: v for k, v in sha_map.items() if len(v) > 1}
print(f"Exact duplicate image groups on disk: {len(exact_dupes)}")
for h_val, fnames in exact_dupes.items():
    print(f"  Duplicate group: {fnames}")

df_manifest["is_exact_duplicate"] = df_manifest["sha256"].isin(set(exact_dupes.keys()))

manifest_path = os.path.join(PROCESSED_DIR, "prescription_manifest.csv")
df_manifest.to_csv(manifest_path, index=False)
print(f"Saved cleaned manifest to {manifest_path}")

# Dataset Profile
profile = {
    "dataset_name": "Image-to-Text Bilingual Dataset from Medical Prescriptions",
    "doi": "10.17632/tg2hm7n2bs.2",
    "license": "Creative Commons Attribution 4.0 International (CC BY 4.0)",
    "authors": [
        "Diya Roy Badhon", "Md. Arafat Islam", "Umme Aiman Zim",
        "Yamin Hossain", "Md. Milon-Ibna-Shoyab Rangon", "Saiful Islam", "Tanjim Taharat Aurpa"
    ],
    "institution": "Bangabandhu Sheikh Mujibur Rahman Digital University (BDU), Gazipur, Bangladesh",
    "publication_date": "2026-01-19",
    "total_matched_images": len(df_manifest),
    "unique_image_hashes": len(sha_map),
    "exact_duplicates": len(exact_dupes),
    "corrupted_images": len(corrupted),
    "text_statistics": {
        "mean_en_char_length": round(float(df_manifest["text_english"].apply(len).mean()), 1),
        "mean_bn_char_length": round(float(df_manifest["text_bangla"].apply(len).mean()), 1),
        "mean_en_word_count": round(float(df_manifest["text_english"].apply(lambda x: len(x.split())).mean()), 1),
        "mean_bn_word_count": round(float(df_manifest["text_bangla"].apply(lambda x: len(x.split())).mean()), 1),
    },
    "image_resolutions": {
        "min_width": int(df_manifest["width"].min()),
        "max_width": int(df_manifest["width"].max()),
        "mean_width": round(float(df_manifest["width"].mean()), 1),
        "min_height": int(df_manifest["height"].min()),
        "max_height": int(df_manifest["height"].max()),
        "mean_height": round(float(df_manifest["height"].mean()), 1),
        "modes": df_manifest["mode"].value_counts().to_dict(),
        "formats": df_manifest["format"].value_counts().to_dict()
    }
}

with open(os.path.join(OUTPUTS_DIR, "dataset_profile.json"), "w", encoding="utf-8") as f:
    json.dump(profile, f, indent=2)
with open(os.path.join(PROOFS_DIR, "dataset_profile.json"), "w", encoding="utf-8") as f:
    json.dump(profile, f, indent=2)

print("Dataset profile saved successfully!")
