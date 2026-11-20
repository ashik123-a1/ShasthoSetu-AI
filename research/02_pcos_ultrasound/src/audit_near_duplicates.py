import os
import json
import itertools
import numpy as np
import pandas as pd
from PIL import Image
import imagehash

BASE_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\02_PCOS_Ultrasound"
DATA_ROOT = os.path.join(BASE_DIR, "data")
SPLIT_MANIFEST = os.path.join(DATA_ROOT, "processed", "split_manifest.csv")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
PROOFS_DIR = os.path.join(BASE_DIR, "proofs")

df = pd.read_csv(SPLIT_MANIFEST)
print(f"Loaded {len(df)} images from split manifest.")

hashes = {}
for idx, row in df.iterrows():
    img_path = os.path.join(BASE_DIR, row["relative_path"])
    with Image.open(img_path) as img:
        ph = imagehash.phash(img)
        dh = imagehash.dhash(img)
        ah = imagehash.average_hash(img)
        wh = imagehash.whash(img)
        hashes[row["filename"]] = {
            "phash": str(ph),
            "dhash": str(dh),
            "ahash": str(ah),
            "whash": str(wh),
            "phash_obj": ph,
            "dhash_obj": dh,
            "split": row["split"],
            "class_label": row["class_label"],
            "relative_path": row["relative_path"]
        }

pairs_close = []
filenames = list(hashes.keys())

for f1, f2 in itertools.combinations(filenames, 2):
    p_dist = hashes[f1]["phash_obj"] - hashes[f2]["phash_obj"]
    d_dist = hashes[f1]["dhash_obj"] - hashes[f2]["dhash_obj"]

    # Strict near duplicate threshold: p_dist <= 6 or d_dist <= 6
    if p_dist <= 6 or d_dist <= 6:
        pairs_close.append({
            "image_1": f1,
            "image_2": f2,
            "class_1": hashes[f1]["class_label"],
            "class_2": hashes[f2]["class_label"],
            "split_1": hashes[f1]["split"],
            "split_2": hashes[f2]["split"],
            "phash_hamming_distance": int(p_dist),
            "dhash_hamming_distance": int(d_dist),
            "cross_split": hashes[f1]["split"] != hashes[f2]["split"],
            "cross_class": hashes[f1]["class_label"] != hashes[f2]["class_label"]
        })

print(f"Total potential near-duplicate pairs (hamming <= 6): {len(pairs_close)}")
cross_splits = [p for p in pairs_close if p["cross_split"]]
print(f"Cross-split near-duplicate pairs: {len(cross_splits)}")

# Sort by similarity (lowest hamming distance sum)
pairs_close.sort(key=lambda x: x["phash_hamming_distance"] + x["dhash_hamming_distance"])

audit_result = {
    "total_unique_images_audited": len(df),
    "hash_algorithms": ["pHash", "dHash", "aHash", "wHash"],
    "threshold_hamming": 6,
    "total_near_duplicate_pairs": len(pairs_close),
    "total_cross_split_pairs": len(cross_splits),
    "pairs_detail": pairs_close,
    "summary_by_class": {
        "Dominant_Follicle": sum(1 for p in pairs_close if p["class_1"] == "Dominant_Follicle" and p["class_2"] == "Dominant_Follicle"),
        "Normal": sum(1 for p in pairs_close if p["class_1"] == "Normal" and p["class_2"] == "Normal"),
        "PCO": sum(1 for p in pairs_close if p["class_1"] == "PCO" and p["class_2"] == "PCO"),
        "Cross_Class": sum(1 for p in pairs_close if p["cross_class"])
    }
}

out_json = os.path.join(OUTPUTS_DIR, "near_duplicate_and_leakage_audit.json")
with open(out_json, "w", encoding="utf-8") as f:
    json.dump(audit_result, f, indent=2)

proof_json = os.path.join(PROOFS_DIR, "near_duplicate_and_leakage_audit.json")
with open(proof_json, "w", encoding="utf-8") as f:
    json.dump(audit_result, f, indent=2)

print(f"Audit saved to {out_json}")
for p in pairs_close[:10]:
    print(f"  {p['image_1']} [{p['split_1']}] vs {p['image_2']} [{p['split_2']}] | pDist: {p['phash_hamming_distance']}, dDist: {p['dhash_hamming_distance']} | Cross-split: {p['cross_split']}")
