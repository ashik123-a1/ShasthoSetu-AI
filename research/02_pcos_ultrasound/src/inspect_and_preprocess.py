import os
import hashlib
import json
import csv
from collections import Counter
from PIL import Image

RAW_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\02_PCOS_Ultrasound\data\raw\extracted"
PROCESSED_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\02_PCOS_Ultrasound\data\processed"
OUTPUTS_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\02_PCOS_Ultrasound\outputs"

os.makedirs(PROCESSED_DIR, exist_ok=True)
os.makedirs(OUTPUTS_DIR, exist_ok=True)

def inspect_dataset():
    classes = ["Dominant_Follicle", "Normal", "PCO"]
    records = []
    hash_map = {}
    corrupted_files = []
    
    print("Inspecting ovarian ultrasound images...")
    
    for cls in classes:
        cls_dir = os.path.join(RAW_DIR, cls)
        if not os.path.exists(cls_dir):
            print(f"Warning: Directory {cls_dir} does not exist.")
            continue
            
        files = [f for f in os.listdir(cls_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        for f in files:
            path = os.path.join(cls_dir, f)
            # Calculate MD5
            with open(path, "rb") as fp:
                file_hash = hashlib.md5(fp.read()).hexdigest()
                
            # Verify image integrity
            try:
                with Image.open(path) as img:
                    width, height = img.size
                    mode = img.mode
                    format_name = img.format
            except Exception as e:
                corrupted_files.append({"file": path, "error": str(e)})
                continue
                
            is_dup = file_hash in hash_map
            if is_dup:
                dup_original = hash_map[file_hash]["filename"]
            else:
                dup_original = None
                
            rec = {
                "filename": f,
                "class_label": cls,
                "relative_path": os.path.join("data", "raw", "extracted", cls, f),
                "width": width,
                "height": height,
                "mode": mode,
                "format": format_name,
                "md5_hash": file_hash,
                "is_duplicate": is_dup,
                "duplicate_of": dup_original
            }
            records.append(rec)
            if not is_dup:
                hash_map[file_hash] = rec

    print(f"Total valid images scanned: {len(records)}")
    print(f"Corrupted files: {len(corrupted_files)}")
    
    dup_count = sum(1 for r in records if r["is_duplicate"])
    print(f"Exact duplicate images: {dup_count}")
    
    cls_counts = Counter(r["class_label"] for r in records)
    print("Class distribution:", dict(cls_counts))
    
    # Save manifest
    manifest_csv = os.path.join(PROCESSED_DIR, "dataset_manifest.csv")
    with open(manifest_csv, "w", newline="", encoding="utf-8") as fp:
        writer = csv.DictWriter(fp, fieldnames=list(records[0].keys()))
        writer.writeheader()
        writer.writerows(records)
        
    profile = {
        "dataset_name": "Ovarian Ultrasound Dataset (Saadat et al. / Borna et al. 2025)",
        "source": "https://github.com/HananSaadat/ovarian_ultrasound_dataset",
        "license": "CC BY 4.0",
        "reference_paper": "Borna et al., Frontiers in Physiology 2025, doi:10.3389/fphys.2025.1520898",
        "total_images": len(records),
        "corrupted_images": len(corrupted_files),
        "exact_duplicates": dup_count,
        "class_counts": dict(cls_counts),
        "class_percentages": {k: round(v / len(records) * 100, 2) for k, v in cls_counts.items()},
        "image_dimensions_sample": {
            "first_image_size": [records[0]["width"], records[0]["height"]],
            "modes_detected": list(set(r["mode"] for r in records))
        },
        "scientific_disclaimer": (
            "These ultrasound categories (Normal, Dominant Follicle, PCO) reflect ovarian morphological findings, "
            "which are NOT equivalent to a full clinical diagnosis of PCOS (which requires Rotterdam criteria including "
            "hyperandrogenism and ovulatory dysfunction). The small number of Normal images (N=41) poses an imbalance constraint."
        )
    }
    
    profile_json = os.path.join(OUTPUTS_DIR, "dataset_profile.json")
    with open(profile_json, "w", encoding="utf-8") as fp:
        json.dump(profile, fp, indent=2)
        
    print(f"Manifest saved to: {manifest_csv}")
    print(f"Profile saved to: {profile_json}")

if __name__ == "__main__":
    inspect_dataset()
