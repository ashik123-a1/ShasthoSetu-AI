import os
import zipfile
import hashlib
import json

base_dir = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR"
proofs_dir = os.path.join(base_dir, "proofs")
os.makedirs(proofs_dir, exist_ok=True)

zip_path = os.path.join(proofs_dir, "PROOFS.zip")

files_to_pack = [
    # Documentation & Audits
    "DATASET_AUDIT.md",
    "OCR_BASELINE_REPORT.md",
    "model_card.md",
    "experiment_summary.md",
    "reproduce.ps1",
    os.path.join("proofs", "provenance_and_rights_audit.md"),
    # Runnable Source Code & Configs
    os.path.join("configs", "config.json"),
    os.path.join("src", "inspect_and_preprocess.py"),
    os.path.join("src", "create_master_manifest.py"),
    os.path.join("src", "benchmark_ocr.py"),
    os.path.join("src", "run_test_benchmark.py"),
    os.path.join("src", "package_proofs.py"),
    # Outputs & Data Manifests
    os.path.join("outputs", "metrics.json"),
    os.path.join("outputs", "environment.json"),
    os.path.join("outputs", "test_predictions.csv"),
    os.path.join("data", "processed", "split_manifest.csv")
]

print(f"Creating comprehensive proof archive at: {zip_path}")
manifest_records = []

with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zipf:
    for rel_path in files_to_pack:
        full_path = os.path.join(base_dir, rel_path)
        if os.path.exists(full_path):
            fsize = os.path.getsize(full_path)
            h = hashlib.sha256()
            with open(full_path, "rb") as fp:
                while chunk := fp.read(65536):
                    h.update(chunk)
            sha = h.hexdigest()
            zipf.write(full_path, arcname=rel_path)
            manifest_records.append({
                "file": rel_path,
                "size_bytes": fsize,
                "sha256": sha
            })
            print(f"  + Added {rel_path} ({fsize:,} bytes)")
        else:
            print(f"  ! Warning: File not found: {rel_path}")

zip_size = os.path.getsize(zip_path)
print(f"\nPROOFS.zip updated successfully ({zip_size:,} bytes)")
