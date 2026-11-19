"""
verify_audit_corrections.py
===========================
Reproducible Read-Only Verification Script for ShasthoSetu AI
Package: SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/correction_v2/
Execution: python verify_audit_corrections.py
"""

import os
import sys
import json
import hashlib
import zipfile
import pandas as pd

# Root data directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))

def get_sha256_and_size(filepath):
    if not os.path.exists(filepath):
        return None, 0
    h = hashlib.sha256()
    size = os.path.getsize(filepath)
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest(), size

def test_1_mcvsld_manifest_family_count():
    print("\n[TEST 1] Verifying MCVSLD Source-Family Counts in clean_grouped_split_manifest.csv...")
    manifest_path = os.path.join(ROOT_DIR, "03_Measles_Viral_Rash", "data", "processed", "clean_grouped_split_manifest.csv")
    assert os.path.exists(manifest_path), f"Manifest missing: {manifest_path}"
    
    sha, size = get_sha256_and_size(manifest_path)
    df = pd.read_csv(manifest_path)
    assert len(df) == 10384, f"Expected 10384 rows, got {len(df)}"
    assert 'grouped_split' in df.columns, "Column 'grouped_split' missing"
    assert 'family_id' in df.columns, "Column 'family_id' missing"
    
    train_fams = set(df[df['grouped_split'] == 'train']['family_id'].dropna().unique())
    val_fams = set(df[df['grouped_split'] == 'val']['family_id'].dropna().unique())
    test_fams = set(df[df['grouped_split'] == 'test']['family_id'].dropna().unique())
    all_fams = set(df['family_id'].dropna().unique())
    
    assert len(train_fams) == 528, f"Expected 528 train families, got {len(train_fams)}"
    assert len(val_fams) == 113, f"Expected 113 val families, got {len(val_fams)}"
    assert len(test_fams) == 114, f"Expected 114 test families, got {len(test_fams)}"
    assert len(all_fams) == 755, f"Expected 755 total families, got {len(all_fams)}"
    
    # Zero leakage check
    assert len(train_fams & val_fams) == 0, "Leakage detected between train and val!"
    assert len(train_fams & test_fams) == 0, "Leakage detected between train and test!"
    assert len(val_fams & test_fams) == 0, "Leakage detected between val and test!"
    
    print(f"  --> PASS: 755 total families verified (Train 528, Val 113, Test 114). Zero cross-split leakage verified.")

def test_2_majority_vote_tie_audit():
    print("\n[TEST 2] Verifying Majority-Vote Tie Audit & MSL_41_01 Misclassification...")
    tie_csv = os.path.join(ROOT_DIR, "03_Measles_Viral_Rash", "model_selection_final", "correction_v1", "MAJORITY_VOTE_TIE_AUDIT.csv")
    assert os.path.exists(tie_csv), f"Tie audit CSV missing: {tie_csv}"
    
    df_tie = pd.read_csv(tie_csv)
    assert len(df_tie) == 3, f"Expected exactly 3 tied cases, got {len(df_tie)}"
    tied_fams = set(df_tie['family_id'].tolist())
    expected_tied = {'MKP_117_01', 'MKP_41_01', 'HFMD_32_01'}
    assert tied_fams == expected_tied, f"Tied families mismatch! Expected {expected_tied}, got {tied_fams}"
    
    # Check MSL_41_01 in val predictions
    r18_val = os.path.join(ROOT_DIR, "03_Measles_Viral_Rash", "model_selection_final", "val_predictions_resnet18.csv")
    assert os.path.exists(r18_val), f"ResNet18 val predictions missing: {r18_val}"
    df_r18 = pd.read_csv(r18_val)
    msl_41 = df_r18[df_r18['family_id'] == 'MSL_41_01']
    assert len(msl_41) == 14, f"Expected 14 crops for MSL_41_01, got {len(msl_41)}"
    vc_r18 = msl_41['pred_class'].value_counts().to_dict()
    assert vc_r18.get('Monkeypox') == 8, f"Expected 8 Monkeypox votes, got {vc_r18}"
    assert vc_r18.get('Measles') == 6, f"Expected 6 Measles votes, got {vc_r18}"
    print(f"  --> PASS: Verified 3 ties (MKP_117_01, MKP_41_01, HFMD_32_01). MSL_41_01 confirmed outright miss (8 MPX vs 6 MSL), NOT a tie.")

def test_3_checkpoint_hashes_and_archives():
    print("\n[TEST 3] Verifying Checkpoint Cryptographic Hashes (Local vs Proof ZIPs)...")
    
    # 1. PCOS Clinical
    clin_local = os.path.join(ROOT_DIR, "01_PCOS_Clinical", "models", "model_best.joblib")
    clin_zip = os.path.join(ROOT_DIR, "_reports", "01_PCOS_Clinical_PROOFS.zip")
    h_local, s_local = get_sha256_and_size(clin_local)
    assert s_local == 101887, f"Expected 101887 bytes, got {s_local}"
    assert h_local == "1af755f7a45d0604ad51ded10539290676ecb993bc541d924daeb3a190d28ba6", f"Hash mismatch: {h_local}"
    with zipfile.ZipFile(clin_zip, "r") as zf:
        data = zf.read("models/model_best.joblib")
        assert len(data) == 101887
        assert hashlib.sha256(data).hexdigest() == h_local, "Archived hash does not match local!"
    print("  --> PASS: PCOS Clinical model_best.joblib matches local and archive 100%.")

    # 2. PCOS Ultrasound ResNet18
    us_local = os.path.join(ROOT_DIR, "02_PCOS_Ultrasound", "models", "resnet18_best.pth")
    us_zip = os.path.join(ROOT_DIR, "_reports", "02_PCOS_Ultrasound_PROOFS.zip")
    h_us, s_us = get_sha256_and_size(us_local)
    assert s_us == 44792203, f"Expected 44792203 bytes, got {s_us}"
    assert h_us == "e60e15e76e17fc1e50714ff958a37fc8caaeb43ce6aca6edeb658a0017e47d65", f"Hash mismatch: {h_us}"
    with zipfile.ZipFile(us_zip, "r") as zf:
        data = zf.read("models/resnet18_best.pth")
        assert len(data) == 44792203
        assert hashlib.sha256(data).hexdigest() == h_us, "Archived hash does not match local!"
    print("  --> PASS: PCOS Ultrasound resnet18_best.pth matches local and archive 100%.")

    # 3. Measles Grouped Checkpoint
    m_grp_local = os.path.join(ROOT_DIR, "03_Measles_Viral_Rash", "models", "resnet18_grouped_best.pth")
    h_mgrp, s_mgrp = get_sha256_and_size(m_grp_local)
    assert s_mgrp == 44799435, f"Expected 44799435 bytes, got {s_mgrp}"
    assert h_mgrp == "809a202a7f9e3a05c8306bedef2ba0fbe45f15bb935e435458f752be4eae0571"
    m_zip = os.path.join(ROOT_DIR, "_reports", "03_Measles_Viral_Rash_PROOFS.zip")
    with zipfile.ZipFile(m_zip, "r") as zf:
        assert "models/resnet18_grouped_best.pth" not in zf.namelist(), "Grouped weights unexpectedly found in historical ZIP!"
    print("  --> PASS: Measles resnet18_grouped_best.pth verified on disk; correctly identified as absent from historical proof ZIP.")

def test_4_prescription_ocr_reconciliation():
    print("\n[TEST 4] Verifying Prescription OCR Demonstration Image and Quarantine Counts...")
    bilingual_json = os.path.join(ROOT_DIR, "04_Prescription_OCR", "final_integration", "patch_v1", "proofs", "bilingual_ocr_results.json")
    assert os.path.exists(bilingual_json), f"Bilingual OCR JSON missing: {bilingual_json}"
    with open(bilingual_json, "r", encoding="utf-8") as f:
        b_data = json.load(f)
    assert b_data["summary"]["total_detections"] == 44, "Expected 44 detections"
    assert b_data["summary"]["medication_entity_recall_pct"] == 100.0
    
    # Check quarantine manifest
    quarantine_json = os.path.join(ROOT_DIR, "04_Prescription_OCR", "final_integration", "patch_v1", "QUARANTINE_MANIFEST_VERIFIED.json")
    with open(quarantine_json, "r", encoding="utf-8") as f:
        q_data = json.load(f)
    test_split = q_data["split_summary"]["test"]
    assert test_split["total_records"] == 152, "Expected 152 total test records"
    assert test_split["quarantined_records"] == 3, "Expected 3 quarantined test records"
    assert test_split["admissible_records"] == 149, "Expected 149 admissible test records"
    assert test_split["quarantined_prescription_ids"] == ["0186", "0756", "0757"]
    print("  --> PASS: Verified 44 tokens on 0052.jpg smoke test; verified 152 test (3 corrupt quarantined -> 149 admissible).")

def test_5_all_correction_deliverables_exist():
    print("\n[TEST 5] Verifying All 8 Deliverable Files in correction_v2/...")
    target_files = [
        "CORRECTED_FINAL_RESEARCH_AUDIT.md",
        "DATASET_SPLIT_RECONCILIATION.csv",
        "MODEL_CHECKPOINT_VERSION_HASH_AUDIT.csv",
        "CORRECTED_MODEL_INVENTORY.csv",
        "OCR_GROUND_TRUTH_AND_METRICS_CORRECTION.md",
        "REPRODUCIBILITY_EVIDENCE_MATRIX.md",
        "FINAL_PASS_FAIL_MATRIX.md",
        "AUDIT_CHANGELOG.md"
    ]
    for fname in target_files:
        p = os.path.join(SCRIPT_DIR, fname)
        assert os.path.exists(p), f"Missing deliverable: {fname}"
        size = os.path.getsize(p)
        assert size > 0, f"Empty deliverable: {fname}"
        print(f"  --> FOUND: {fname} ({size:,} bytes)")
    print("  --> PASS: All 8 required deliverables verified present and non-empty.")

if __name__ == "__main__":
    print("=================================================================")
    print("SHASTHOSETU AI — AUDIT CORRECTION SUITE VERIFICATION")
    print("=================================================================")
    try:
        test_1_mcvsld_manifest_family_count()
        test_2_majority_vote_tie_audit()
        test_3_checkpoint_hashes_and_archives()
        test_4_prescription_ocr_reconciliation()
        test_5_all_correction_deliverables_exist()
        print("\n=================================================================")
        print(">>> ALL READ-ONLY VERIFICATION TESTS PASSED SUCCESSFULLY! <<<")
        print("=================================================================")
        sys.exit(0)
    except AssertionError as e:
        print(f"\n[FAIL] Assertion Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] Unexpected Exception: {e}")
        sys.exit(2)
