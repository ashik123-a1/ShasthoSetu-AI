import os
import json
import hashlib
import pandas as pd
from PIL import Image

base = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR"
extract_dir = os.path.join(base, "data", "raw", "extracted")
csv_path = os.path.join(extract_dir, "Prescription_Dataset(1000)", "Prescriptions_Dataset.csv")
images_dir = os.path.join(extract_dir, "images", "Prescription_ images.jpg")

disk_files = sorted(os.listdir(images_dir))
print(f"Total files on disk: {len(disk_files)}")

# 1. Audit all 1000 disk images
img_records = []
for f in disk_files:
    fpath = os.path.join(images_dir, f)
    fsize = os.path.getsize(fpath)
    stem, ext = os.path.splitext(f)
    
    # SHA-256
    h = hashlib.sha256()
    with open(fpath, "rb") as fp:
        while chunk := fp.read(65536):
            h.update(chunk)
    sha256 = h.hexdigest()
    
    try:
        with Image.open(fpath) as img:
            w, h_dim = img.size
            mode = img.mode
            fmt = img.format
            corrupt = False
    except Exception as e:
        w, h_dim, mode, fmt = 0, 0, "UNKNOWN", "CORRUPT"
        corrupt = True
        
    img_records.append({
        "disk_filename": f,
        "stem": stem,
        "extension": ext.lower(),
        "file_size_bytes": fsize,
        "width": w,
        "height": h_dim,
        "mode": mode,
        "format": fmt,
        "is_corrupt": corrupt,
        "sha256": sha256
    })

img_df = pd.DataFrame(img_records)
print("\n--- Image Audit Summary ---")
print(f"Total images: {len(img_df)}")
print(f"Corrupt images: {img_df['is_corrupt'].sum()}")
print(f"File extensions: {img_df['extension'].value_counts().to_dict()}")
print(f"Color modes: {img_df['mode'].value_counts().to_dict()}")
print(f"Formats: {img_df['format'].value_counts().to_dict()}")
print(f"Min size: {img_df['file_size_bytes'].min()} bytes, Max size: {img_df['file_size_bytes'].max()} bytes, Mean size: {img_df['file_size_bytes'].mean():.1f} bytes")
print(f"Width min/max/median: {img_df['width'].min()}/{img_df['width'].max()}/{img_df['width'].median()}")
print(f"Height min/max/median: {img_df['height'].min()}/{img_df['height'].max()}/{img_df['height'].median()}")
print(f"Unique SHA-256 hashes among 1000 disk images: {img_df['sha256'].nunique()}")

dup_hashes = img_df[img_df['sha256'].duplicated(keep=False)]
if len(dup_hashes) > 0:
    print(f"\nDuplicate image files detected ({len(dup_hashes)} rows):")
    print(dup_hashes[["disk_filename", "sha256", "file_size_bytes"]])
else:
    print("\nNo exact duplicate images on disk (all 1000 images have distinct SHA-256).")

img_df.to_csv(os.path.join(base, "data", "processed", "image_audit.csv"), index=False)
print("Saved image_audit.csv")
