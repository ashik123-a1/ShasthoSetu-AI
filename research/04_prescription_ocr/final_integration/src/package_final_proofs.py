import os
import zipfile
import hashlib
import json

base_dir = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR\final_integration"
zip_path = os.path.join(base_dir, "FINAL_INTEGRATION_PROOFS.zip")

files_to_pack = [
    "FINAL_EVALUATION_REPORT.md",
    "QUARANTINE_CONSISTENCY_REPORT.md",
    "TESTED_SAFETY_GATE_IMPLEMENTATION.md",
    "HUMAN_VERIFICATION_WORKFLOW.md",
    "OUTSTANDING_LIMITATIONS.md",
    "REPRODUCIBILITY_REPORT.md",
    "reproduce_final.ps1",
    "quarantine_audit.json",
    os.path.join("src", "safety_gate.py"),
    os.path.join("src", "demo_server.py"),
    os.path.join("src", "verify_quarantine_consistency.py"),
    os.path.join("tests", "test_safety_gate.py"),
    os.path.join("tests", "test_demo_server.py"),
    os.path.join("demo", "index.html"),
    os.path.join("demo", "styles.css"),
    os.path.join("demo", "app.js")
]

print(f"Packaging Final Integration Proof Archive at: {zip_path}")
manifest = []

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
            manifest.append({
                "file": rel_path,
                "size_bytes": fsize,
                "sha256": sha
            })
            print(f"  + Added {rel_path} ({fsize:,} bytes | SHA: {sha[:10]}...)")
        else:
            print(f"  ! Warning: Missing file: {rel_path}")

h_zip = hashlib.sha256()
with open(zip_path, "rb") as fp:
    while chunk := fp.read(65536):
        h_zip.update(chunk)
zip_sha = h_zip.hexdigest()
zip_size = os.path.getsize(zip_path)

print(f"\nFINAL_INTEGRATION_PROOFS.zip created successfully!")
print(f"Archive Size: {zip_size:,} bytes")
print(f"Archive SHA-256: {zip_sha}")

with open(os.path.join(base_dir, "proofs", "final_proofs_manifest.json"), "w", encoding="utf-8") as fp:
    json.dump({
        "zip_path": "FINAL_INTEGRATION_PROOFS.zip",
        "zip_size_bytes": zip_size,
        "zip_sha256": zip_sha,
        "packed_files": manifest
    }, fp, indent=2)
print("Saved final_proofs_manifest.json")
