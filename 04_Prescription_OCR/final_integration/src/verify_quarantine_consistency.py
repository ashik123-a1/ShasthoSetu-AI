import os
import json
import pandas as pd

base_dir = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR"
corr_manifest_path = os.path.join(base_dir, "audit_v2", "corrected_annotation_manifest.csv")
final_dir = os.path.join(base_dir, "final_integration")

df = pd.read_csv(corr_manifest_path)
print(f"Total rows in manifest: {len(df)}")

# Check target stems
target_stems = ["0174", "0185", "0186", "0674", "0675", "0676", "0747", "0729", "0775", "0756", "0757"]

stem_records = []
for s in target_stems:
    # prescription_id might be stored as int or str with/without leading zeros
    row = df[df["prescription_id"].astype(str).str.zfill(4) == s]
    if len(row) > 0:
        r = row.iloc[0]
        stem_records.append({
            "prescription_id": s,
            "filename": r["filename"],
            "sha256": r["sha256"],
            "split": r["split"],
            "quarantine_status": r["quarantine_status"],
            "evaluation_admissible": bool(r["evaluation_admissible"]),
            "audit_notes": r["audit_notes"]
        })
    else:
        print(f"WARNING: Stem {s} not found in manifest!")

# Check Test Split composition
test_df = df[df["split"] == "test"]
admissible_test = test_df[test_df["evaluation_admissible"]]
quarantined_test = test_df[~test_df["evaluation_admissible"]]

print(f"\n--- Test Split Verification ---")
print(f"Total test partition samples: {len(test_df)}")
print(f"Admissible test samples: {len(admissible_test)}")
print(f"Quarantined test samples: {len(quarantined_test)}")

quarantined_test_list = []
for _, r in quarantined_test.iterrows():
    p_id = str(r["prescription_id"]).zfill(4)
    quarantined_test_list.append({
        "prescription_id": p_id,
        "filename": r["filename"],
        "quarantine_status": r["quarantine_status"],
        "reason": r["audit_notes"]
    })
    print(f"  - Quarantined Test ID {p_id} ({r['filename']}): {r['quarantine_status']} | {r['audit_notes']}")

# Verify cross-split hash leakage
hash_splits = df[df["evaluation_admissible"]].groupby("sha256")["split"].nunique()
leaked_hashes = hash_splits[hash_splits > 1]
print(f"\nCross-Split Hash Leakage Count among admissible samples: {len(leaked_hashes)}")
assert len(leaked_hashes) == 0, "CRITICAL ERROR: Data leakage detected across splits!"

audit_summary = {
    "total_corpus_images": len(df),
    "target_stems_audited": stem_records,
    "split_breakdown": {
        "train": {
            "total": int((df["split"] == "train").sum()),
            "admissible": int(((df["split"] == "train") & df["evaluation_admissible"]).sum()),
            "quarantined": int(((df["split"] == "train") & (~df["evaluation_admissible"])).sum())
        },
        "validation": {
            "total": int((df["split"] == "val").sum()),
            "admissible": int(((df["split"] == "val") & df["evaluation_admissible"]).sum()),
            "quarantined": int(((df["split"] == "val") & (~df["evaluation_admissible"])).sum())
        },
        "test": {
            "total": int((df["split"] == "test").sum()),
            "admissible": int(((df["split"] == "test") & df["evaluation_admissible"]).sum()),
            "quarantined": int(((df["split"] == "test") & (~df["evaluation_admissible"])).sum()),
            "quarantined_samples": quarantined_test_list
        },
        "unannotated": {
            "total": int((df["split"] == "unannotated").sum()),
            "admissible": 0,
            "quarantined": int((df["split"] == "unannotated").sum())
        }
    },
    "zero_leakage_verified": True
}

out_path = os.path.join(final_dir, "quarantine_audit.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(audit_summary, f, indent=2)

print(f"\nSaved quarantine audit JSON to: {out_path}")
