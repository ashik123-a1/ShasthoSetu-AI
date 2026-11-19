import os
import json
import hashlib
import pandas as pd

base_dir = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR"
raw_dir = os.path.join(base_dir, "data", "raw", "extracted")
csv_path = os.path.join(raw_dir, "Prescription_Dataset(1000)", "Prescriptions_Dataset.csv")
images_dir = os.path.join(raw_dir, "images", "Prescription_ images.jpg")
orig_split_manifest = os.path.join(base_dir, "data", "processed", "split_manifest.csv")
audit_dir = os.path.join(base_dir, "audit_v2")

df_raw = pd.read_csv(csv_path)
df_orig_split = pd.read_csv(orig_split_manifest)

# Map disk files by stem
disk_files = {os.path.splitext(f)[0]: f for f in os.listdir(images_dir)}

# Quarantine policy:
# 1. '0747': Exists on disk, missing from CSV -> QUARANTINED_NO_ANNOTATION
# 2. '0729' and '0775': Identical image hash, conflicting descriptions -> QUARANTINED_CONFLICTING_DUPLICATE_ANNOTATION
# 3. '0186': Skipped in raw CSV, duplicate 0185 row -> QUARANTINED_UNRESOLVED_ANNOTATION
# 4. '0674', '0676': 0674 skipped, 0676 duplicated in CSV -> QUARANTINED_UNRESOLVED_ANNOTATION
# 5. '0756', '0757': Identical image hash, identical descriptions -> Marked DUPLICATE_IMAGE_REDUNDANT (kept in Train)
# 6. '0174': Comma typo -> VERIFIED_MAPPED_TYPO_FIX

corrected_records = []

for idx, r in df_orig_split.iterrows():
    p_id = str(r["prescription_id"]).zfill(4)
    fname = r["filename"]
    sha = r["sha256"]
    split = r["split"]
    has_ann = r["has_annotation"]
    en_desc = r["description_english"]
    bn_desc = r["description_bangla"]
    
    # Determine quarantine status
    if p_id == "0747":
        q_status = "QUARANTINED_NO_ANNOTATION"
        admissible = False
        notes = "Disk image exists but was omitted from the Mendeley CSV."
    elif p_id in ["0729", "0775"]:
        q_status = "QUARANTINED_CONFLICTING_DUPLICATE_ANNOTATION"
        admissible = False
        notes = "Physical image SHA-256 is identical between 0729 and 0775, but CSV contains two completely conflicting narrative descriptions."
    elif p_id in ["0186"]:
        q_status = "QUARANTINED_UNRESOLVED_ANNOTATION"
        admissible = False
        notes = "Row was missing in original CSV; clerical alignment to 0185 duplicate cannot be independently guaranteed."
    elif p_id in ["0674", "0676"]:
        q_status = "QUARANTINED_UNRESOLVED_ANNOTATION"
        admissible = False
        notes = "0674 was omitted and 0676 was duplicated with conflicting text in raw CSV; excluded from official evaluation."
    elif p_id in ["0756", "0757"]:
        q_status = "VERIFIED_DUPLICATE_PAIR"
        admissible = (split in ["train"])
        notes = "Exact duplicate image SHA-256 with identical text; restricted strictly to Train partition."
    elif p_id == "0174":
        q_status = "VERIFIED_MAPPED_TYPO_FIX"
        admissible = True
        notes = "Resolved comma typo '0174,jpg' to physical image '0174.jpg'."
    elif not has_ann:
        q_status = "QUARANTINED_NO_ANNOTATION"
        admissible = False
        notes = "No ground truth annotation."
    else:
        q_status = "VERIFIED_USABLE"
        admissible = True
        notes = "Clean 1:1 image to annotation mapping."
        
    corrected_records.append({
        "prescription_id": p_id,
        "filename": fname,
        "sha256": sha,
        "split": split,
        "quarantine_status": q_status,
        "evaluation_admissible": admissible,
        "annotation_nature": "NARRATIVE_CLINICAL_TRANSLATION",
        "description_english": en_desc,
        "description_bangla": bn_desc,
        "audit_notes": notes
    })

corr_df = pd.DataFrame(corrected_records)
print(f"Total records in corrected manifest: {len(corr_df)}")
print("\nQuarantine Status Breakdown:")
print(corr_df["quarantine_status"].value_counts())
print("\nEvaluation Admissibility by Split:")
print(pd.crosstab(corr_df["split"], corr_df["evaluation_admissible"]))

out_csv = os.path.join(audit_dir, "corrected_annotation_manifest.csv")
corr_df.to_csv(out_csv, index=False)
print(f"\nSaved corrected annotation manifest to: {out_csv}")
