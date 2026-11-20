import os
import json
import hashlib
import pandas as pd
from PIL import Image
import easyocr

base_dir = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR"
raw_dir = os.path.join(base_dir, "data", "raw", "extracted")
csv_path = os.path.join(raw_dir, "Prescription_Dataset(1000)", "Prescriptions_Dataset.csv")
images_dir = os.path.join(raw_dir, "images", "Prescription_ images.jpg")
audit_dir = os.path.join(base_dir, "audit_v2")

df_raw = pd.read_csv(csv_path)
print(f"Raw CSV shape: {df_raw.shape}")

# Specific audit stems
target_stems = ["0174", "0185", "0186", "0674", "0675", "0676", "0747", "0729", "0775", "0756", "0757"]

disk_files = {os.path.splitext(f)[0]: f for f in os.listdir(images_dir)}

reader = easyocr.Reader(['en', 'bn'], gpu=True)

audit_results = []

for stem in target_stems:
    disk_file = disk_files.get(stem, None)
    if disk_file:
        fpath = os.path.join(images_dir, disk_file)
        fsize = os.path.getsize(fpath)
        with Image.open(fpath) as img:
            w, h = img.size
        # SHA-256
        hsh = hashlib.sha256()
        with open(fpath, "rb") as fp:
            while chunk := fp.read(65536):
                hsh.update(chunk)
        img_sha = hsh.hexdigest()
        
        # Run OCR to see literal text
        ocr_lines = reader.readtext(fpath, detail=0)
        ocr_text_preview = " | ".join(ocr_lines[:8])
    else:
        disk_file = "NOT_FOUND_ON_DISK"
        fsize, w, h = 0, 0, 0
        img_sha = "NONE"
        ocr_text_preview = "NO_IMAGE"

    # Find matches in raw CSV
    # Search for stem in image_filename
    csv_matches = df_raw[df_raw["image_filename"].astype(str).str.contains(stem, na=False)]
    
    match_details = []
    for idx, r in csv_matches.iterrows():
        match_details.append({
            "raw_row_index": idx,
            "raw_filename": str(r["image_filename"]),
            "en_preview": str(r["description_english"])[:100],
            "bn_preview": str(r["description_bangla"])[:100]
        })
        
    audit_results.append({
        "stem": stem,
        "disk_file": disk_file,
        "dimensions": f"{w}x{h}",
        "file_size": fsize,
        "sha256": img_sha,
        "ocr_text_preview": ocr_text_preview,
        "csv_match_count": len(csv_matches),
        "csv_matches": match_details
    })

# Print detailed findings
print("\n" + "="*80)
print("AUDIT FINDINGS FOR SPECIFIC TARGET STEMS")
print("="*80)

for r in audit_results:
    print(f"\nTarget Stem: {r['stem']} (Disk File: {r['disk_file']})")
    print(f"  SHA-256: {r['sha256'][:16]}... | Size: {r['file_size']} bytes | Dim: {r['dimensions']}")
    print(f"  OCR Sample: {r['ocr_text_preview'][:120]}...")
    print(f"  CSV Matches ({r['csv_match_count']}):")
    for m in r["csv_matches"]:
        print(f"    - Row {m['raw_row_index']} ('{m['raw_filename']}'): EN='{m['en_preview']}...'")

# Save audit results to JSON
with open(os.path.join(audit_dir, "specific_stems_audit.json"), "w", encoding="utf-8") as f:
    json.dump(audit_results, f, indent=2, ensure_ascii=False)
