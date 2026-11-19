import os
import zipfile
import hashlib
import json

base_dir = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR\final_integration\patch_v1"
proofs_dir = os.path.join(base_dir, "proofs")
os.makedirs(proofs_dir, exist_ok=True)

zip_path = os.path.join(proofs_dir, "PATCH_V1_PROOFS.zip")

files_to_pack = [
    "CANONICAL_SPLIT_AUDIT.md",
    "QUARANTINE_MANIFEST_VERIFIED.json",
    "SAFETY_AUTHORIZATION_REPORT.md",
    "REAL_E2E_TEST_RESULTS.md",
    "REPRODUCIBILITY_PACKAGE_AUDIT.md",
    "PATCH_CHANGELOG.md",
    "reproduce_patch_v1.ps1",
    os.path.join("src", "safety_gate_v2.py"),
    os.path.join("src", "demo_server_v2.py"),
    os.path.join("src", "generate_canonical_split_audit.py"),
    os.path.join("src", "evaluate_bilingual_ocr.py"),
    os.path.join("src", "package_patch_v1_proofs.py"),
    os.path.join("tests", "test_real_e2e_workflow.py"),
    os.path.join("tests", "test_bilingual_integration.py"),
    os.path.join("proofs", "BILINGUAL_PRESCRIPTION_OCR_AUDIT.md"),
    os.path.join("proofs", "bilingual_ocr_results.json"),
    os.path.join("demo", "index.html"),
    os.path.join("demo", "styles.css"),
    os.path.join("demo", "app.js")
]

print(f"Creating Patch V1 Proof Archive at: {zip_path}")
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

print(f"\nPATCH_V1_PROOFS.zip created successfully!")
print(f"Archive Size: {zip_size:,} bytes")
print(f"Archive SHA-256: {zip_sha}")

manifest_out = os.path.join(proofs_dir, "patch_v1_manifest.json")
with open(manifest_out, "w", encoding="utf-8") as fp:
    json.dump({
        "zip_path": "proofs/PATCH_V1_PROOFS.zip",
        "zip_size_bytes": zip_size,
        "zip_sha256": zip_sha,
        "packed_files": manifest
    }, fp, indent=2)
print(f"Saved manifest to {manifest_out}")
