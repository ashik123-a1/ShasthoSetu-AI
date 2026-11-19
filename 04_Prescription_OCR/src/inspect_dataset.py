import os
import json
import hashlib
import pandas as pd
from PIL import Image

BASE_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR"
EXTRACT_DIR = os.path.join(BASE_DIR, "data", "raw", "extracted")
CSV_PATH = os.path.join(EXTRACT_DIR, "Prescription_Dataset(1000)", "Prescriptions_Dataset.csv")
IMAGES_DIR = os.path.join(EXTRACT_DIR, "images", "Prescription_ images.jpg")
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
PROOFS_DIR = os.path.join(BASE_DIR, "proofs")

os.makedirs(PROCESSED_DIR, exist_ok=True)
os.makedirs(OUTPUTS_DIR, exist_ok=True)
os.makedirs(PROOFS_DIR, exist_ok=True)

df_raw = pd.read_csv(CSV_PATH)
print("Raw CSV shape:", df_raw.shape)
print("Raw CSV columns:", df_raw.columns.tolist())

# Clean dataframe: keep primary columns
clean_df = df_raw[["image_filename", "description_english", "description_bangla"]].copy()
clean_df = clean_df.dropna(subset=["image_filename"]).copy()
# Format filename: ensure e.g. '0001.jpg'
clean_df["image_filename"] = clean_df["image_filename"].astype(str).str.strip()

print(f"Rows with image_filename: {len(clean_df)}")
print(f"Non-null English: {clean_df['description_english'].notnull().sum()}")
print(f"Non-null Bangla: {clean_df['description_bangla'].notnull().sum()}")

# Check image existence on disk
disk_images = set(os.listdir(IMAGES_DIR))
print(f"Total images found on disk in images/: {len(disk_images)}")

matched = []
missing = []
image_stats = []

for idx, row in clean_df.iterrows():
    fname = row["image_filename"]
    # Check if filename exists or needs '.jpg'
    target_name = fname if fname in disk_images else (f"{fname}.jpg" if f"{fname}.jpg" in disk_images else None)
    
    if target_name:
        fpath = os.path.join(IMAGES_DIR, target_name)
        fsize = os.path.getsize(fpath)
        try:
            with Image.open(fpath) as img:
                w, h = img.size
                m = img.mode
                fmt = img.format
        except Exception as e:
            w, h, m, fmt = 0, 0, "", "ERROR"
            
        matched.append({
            "image_filename": target_name,
            "relative_path": os.path.relpath(fpath, BASE_DIR),
            "description_english": str(row["description_english"]) if pd.notnull(row["description_english"]) else "",
            "description_bangla": str(row["description_bangla"]) if pd.notnull(row["description_bangla"]) else "",
            "width": w,
            "height": h,
            "mode": m,
            "format": fmt,
            "file_size_bytes": fsize
        })
    else:
        missing.append(fname)

print(f"Matched images with annotations: {len(matched)}")
print(f"Unmatched/missing images: {len(missing)}")

manifest_df = pd.DataFrame(matched)
# Check exact duplicate images by hash
sha_list = []
for idx, r in manifest_df.iterrows():
    fpath = os.path.join(BASE_DIR, r["relative_path"])
    h = hashlib.sha256()
    with open(fpath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    sha_list.append(h.hexdigest())

manifest_df["sha256"] = sha_list
print(f"Unique image hashes: {manifest_df['sha256'].nunique()}")

# Save cleaned manifest
clean_manifest_path = os.path.join(PROCESSED_DIR, "prescription_manifest.csv")
manifest_df.to_csv(clean_manifest_path, index=False)
print(f"Saved cleaned manifest to {clean_manifest_path}")

# Display samples
print("\nSample Annotations:")
for idx, r in manifest_df.head(3).iterrows():
    print(f"\nImage: {r['image_filename']} ({r['width']}x{r['height']})")
    print(f"  English: {r['description_english'][:100]}...")
    print(f"  Bangla:  {r['description_bangla'][:100]}...")
