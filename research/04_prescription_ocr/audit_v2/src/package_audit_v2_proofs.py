import os
import zipfile
import hashlib
import json

audit_dir = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR\audit_v2"
zip_path = os.path.join(audit_dir, "AUDIT_V2_PROOFS.zip")

files_to_pack = [
    "ANNOTATION_INTEGRITY_REPORT.md",
    "SAFETY_GATE_AUDIT.md",
    "MODEL_COMPARISON.md",
    "REPRODUCIBILITY_REPORT.md",
    "MEDICINE_EXTRACTION_AUDIT.md",
    "NEXT_EXPERIMENT_PLAN.md",
    "reproduce_audit_v2.ps1",
    "corrected_annotation_manifest.csv",
    "OCR_METRICS_AUDITED.json",
    "LANGUAGE_ERROR_ANALYSIS.csv",
    "safety_gate_audit.json",
    "test_predictions_safety_audited.csv",
    "specific_stems_audit.json",
    "validation_model_comparison.json",
    "structured_medication_extractions.json"
]

print(f"Creating Audit V2 Proof Archive at: {zip_path}")
manifest = []

with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zipf:
    for fname in files_to_pack:
        fpath = os.path.join(audit_dir, fname)
        if os.path.exists(fpath):
            fsize = os.path.getsize(fpath)
            h = hashlib.sha256()
            with open(fpath, "rb") as fp:
                while chunk := fp.read(65536):
                    h.update(chunk)
            sha = h.hexdigest()
            zipf.write(fpath, arcname=fname)
            manifest.append({
                "file": fname,
                "size_bytes": fsize,
                "sha256": sha
            })
            print(f"  + Added {fname} ({fsize:,} bytes | SHA: {sha[:10]}...)")
        else:
            print(f"  ! Missing file: {fname}")

h_zip = hashlib.sha256()
with open(zip_path, "rb") as fp:
    while chunk := fp.read(65536):
        h_zip.update(chunk)
zip_sha = h_zip.hexdigest()
zip_size = os.path.getsize(zip_path)

print(f"\nAUDIT_V2_PROOFS.zip created successfully!")
print(f"Archive Size: {zip_size:,} bytes")
print(f"Archive SHA-256: {zip_sha}")

with open(os.path.join(audit_dir, "audit_v2_manifest.json"), "w", encoding="utf-8") as fp:
    json.dump({
        "zip_path": "AUDIT_V2_PROOFS.zip",
        "zip_size_bytes": zip_size,
        "zip_sha256": zip_sha,
        "packed_files": manifest
    }, fp, indent=2)
print("Saved audit_v2_manifest.json")
