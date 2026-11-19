import os
import json
import zipfile
import pandas as pd

BASE_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\05_Bangla_Voice_AI"
PROOFS_DIR = os.path.join(BASE_DIR, "proofs")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
METRICS_PATH = os.path.join(OUTPUTS_DIR, "metrics.json")
PROFILE_PATH = os.path.join(OUTPUTS_DIR, "dataset_profile.json")
SPLIT_PATH = os.path.join(OUTPUTS_DIR, "split_summary.json")
ZIP_OUT = os.path.join(PROOFS_DIR, "PROOFS.zip")

print("Packaging Bengali Voice AI Research Proofs...")

# Build PROOFS.zip including runnable source scripts
files_to_zip = [
    # Source Code & Configs
    os.path.join("configs", "config.json"),
    os.path.join("src", "inspect_and_preprocess.py"),
    os.path.join("src", "split_data.py"),
    os.path.join("src", "benchmark_voice.py"),
    os.path.join("src", "package_proofs.py"),
    "reproduce.ps1",
    # Manifests
    os.path.join("data", "processed", "voice_manifest.csv"),
    os.path.join("data", "processed", "split_manifest.csv"),
    # Outputs
    os.path.join("outputs", "dataset_profile.json"),
    os.path.join("outputs", "split_summary.json"),
    os.path.join("outputs", "metrics.json"),
    os.path.join("outputs", "clinical_voice_tests.json"),
    os.path.join("outputs", "cer_wer_distribution.png"),
    os.path.join("outputs", "voice_test_predictions_whisper_tiny.csv"),
    os.path.join("outputs", "voice_test_predictions_whisper_base.csv"),
    # Documentation & Audits
    os.path.join("proofs", "provenance_and_rights_audit.md"),
    os.path.join("proofs", "model_card.md"),
    os.path.join("proofs", "experiment_summary.md")
]

with zipfile.ZipFile(ZIP_OUT, "w", zipfile.ZIP_DEFLATED) as z:
    for rel_p in files_to_zip:
        full_p = os.path.join(BASE_DIR, rel_p)
        if os.path.exists(full_p):
            z.write(full_p, arcname=rel_p)
            print(f"  Added to PROOFS.zip: {rel_p}")
        else:
            print(f"  WARNING: File missing: {full_p}")

z_size_mb = os.path.getsize(ZIP_OUT) / (1024**2)
print(f"\nLocked proofs package: {ZIP_OUT} ({z_size_mb:.2f} MB)")
