import os
import json
import pandas as pd

base_dir = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR"
split_manifest_path = os.path.join(base_dir, "data", "processed", "split_manifest.csv")
audit_manifest_path = os.path.join(base_dir, "audit_v2", "corrected_annotation_manifest.csv")

df_split = pd.read_csv(split_manifest_path)
df_audit = pd.read_csv(audit_manifest_path)

target_stems = ["0174", "0185", "0186", "0674", "0675", "0676", "0747", "0729", "0775", "0756", "0757"]

print("=== CHECKING ORIGINAL split_manifest.csv ===")
for s in target_stems:
    row = df_split[df_split["prescription_id"].astype(str).str.zfill(4) == s]
    if len(row) > 0:
        r = row.iloc[0]
        print(f"ID {s}: split={r['split']}, filename={r['filename']}, sha256={r['sha256'][:16]}..., has_ann={r['has_annotation']}")
    else:
        print(f"ID {s}: NOT FOUND in split_manifest.csv")

print("\n=== CHECKING audit_v2 corrected_annotation_manifest.csv ===")
for s in target_stems:
    row = df_audit[df_audit["prescription_id"].astype(str).str.zfill(4) == s]
    if len(row) > 0:
        r = row.iloc[0]
        print(f"ID {s}: split={r['split']}, admissible={r['evaluation_admissible']}, q_status={r['quarantine_status']}")
    else:
        print(f"ID {s}: NOT FOUND in corrected_annotation_manifest.csv")

print("\n=== SPLIT SUMMARY in split_manifest.csv ===")
print(df_split["split"].value_counts())

print("\n=== SPLIT SUMMARY in corrected_annotation_manifest.csv ===")
print(pd.crosstab(df_audit["split"], df_audit["evaluation_admissible"]))
