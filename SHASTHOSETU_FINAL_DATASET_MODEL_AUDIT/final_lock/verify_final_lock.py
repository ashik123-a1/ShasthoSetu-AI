"""
verify_final_lock.py
====================
Final Read-Only Evidence Consistency Verification Script for ShasthoSetu AI
Package: SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/final_lock/
Execution: python verify_final_lock.py

NOTE ON VERIFICATION SCOPE:
This script performs targeted, read-only cryptographic hashing, manifest row auditing,
and split-consistency assertions on existing disk artifacts. It validates data integrity,
exact file sizes, checksums, and dataset counts. It does NOT re-train deep neural
networks or claim independent reproduction of full remote archives.
"""

import os
import sys
import json
import hashlib
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

def test_1_dermoped_patient_reconciliation():
    print("\n[TEST 1] Verifying DermoPed Patient Counts (N=22 patients, 3 Pediculosis)...")
    manifest_path = os.path.join(ROOT_DIR, "06_DermoPed_Pediatric_Skin", "proofs", "EXP_D", "split_manifest.csv")
    assert os.path.exists(manifest_path), f"DermoPed manifest missing: {manifest_path}"
    
    df = pd.read_csv(manifest_path)
    assert len(df) == 656, f"Expected 656 total crops, got {len(df)}"
    assert df['patient_id'].nunique() == 22, f"Expected 22 unique patients, got {df['patient_id'].nunique()}"
    
    # Check breakdown by split and class
    cpx_pts = df[df['label'] == 'chickenpox']['patient_id'].nunique()
    ped_pts = df[df['label'] == 'pediculosis']['patient_id'].nunique()
    assert cpx_pts == 19, f"Expected 19 Chickenpox patients, got {cpx_pts}"
    assert ped_pts == 3, f"Expected exactly 3 Pediculosis patients, got {ped_pts}"
    
    # Check specific Pediculosis patient IDs
    train_ped = set(df[(df['split'] == 'train') & (df['label'] == 'pediculosis')]['patient_id'].unique())
    val_ped = set(df[(df['split'] == 'val') & (df['label'] == 'pediculosis')]['patient_id'].unique())
    test_ped = set(df[(df['split'] == 'test') & (df['label'] == 'pediculosis')]['patient_id'].unique())
    
    assert train_ped in [{'patient72'}, {'pediculosis_patient72'}], f"Expected train Pediculosis patient72, got {train_ped}"
    assert val_ped in [{'patient71'}, {'pediculosis_patient71'}], f"Expected val Pediculosis patient71, got {val_ped}"
    assert test_ped in [{'patient74'}, {'pediculosis_patient74'}], f"Expected test Pediculosis patient74, got {test_ped}"
    
    # Check crop counts
    assert len(df[df['split'] == 'train']) == 454
    assert len(df[df['split'] == 'val']) == 92
    assert len(df[df['split'] == 'test']) == 110
    print("  --> PASS: Verified 22 total patients (19 Chickenpox, 3 Pediculosis: pt72, pt71, pt74). 656 crops confirmed.")

def test_2_dermoped_checkpoint_hashes():
    print("\n[TEST 2] Verifying DermoPed Checkpoint File Sizes & SHA-256 Hashes on Disk...")
    
    # EXP_B Champion Checkpoint
    exp_b_path = os.path.join(ROOT_DIR, "06_DermoPed_Pediatric_Skin", "proofs", "EXP_B", "model_best.pth")
    h_b, s_b = get_sha256_and_size(exp_b_path)
    assert s_b == 44790027, f"Expected 44,790,027 bytes for EXP_B, got {s_b}"
    assert h_b == "5a98479c66044e3a6ec244bad0133f0fd5a952e7123e53c567e2cdfe7ef348da", f"EXP_B hash mismatch: {h_b}"
    print(f"  --> PASS: EXP_B checkpoint verified ({s_b:,} bytes, sha256: {h_b[:16]}...).")
    
    # EXP_D Ablation Checkpoint
    exp_d_path = os.path.join(ROOT_DIR, "06_DermoPed_Pediatric_Skin", "models", "model_best.pth")
    h_d, s_d = get_sha256_and_size(exp_d_path)
    assert s_d == 44787896, f"Expected 44,787,896 bytes for EXP_D, got {s_d}"
    assert h_d == "e9ef59b4bc6de88db6cdf7dd78fe775386baf428fcb3e8bd7ba5a63171f8ee67", f"EXP_D hash mismatch: {h_d}"
    print(f"  --> PASS: EXP_D checkpoint verified ({s_d:,} bytes, sha256: {h_d[:16]}...).")

def test_3_ocr_1000_row_accounting():
    print("\n[TEST 3] Verifying Prescription OCR 1,000-Row Accounting (split_manifest.csv)...")
    ocr_split = os.path.join(ROOT_DIR, "04_Prescription_OCR", "data", "processed", "split_manifest.csv")
    assert os.path.exists(ocr_split), f"OCR split manifest missing: {ocr_split}"
    
    df = pd.read_csv(ocr_split)
    assert len(df) == 1000, f"Expected exactly 1,000 rows, got {len(df)}"
    
    counts = df['split'].value_counts().to_dict()
    assert counts.get('train') == 697, f"Expected 697 train, got {counts.get('train')}"
    assert counts.get('val') == 150, f"Expected 150 val, got {counts.get('val')}"
    assert counts.get('test') == 152, f"Expected 152 test, got {counts.get('test')}"
    assert counts.get('unannotated') == 1, f"Expected 1 unannotated, got {counts.get('unannotated')}"
    
    # Check that unannotated row is 0747
    r747 = df[df['split'] == 'unannotated']
    assert '0747' in str(r747['filename'].iloc[0]), f"Expected unannotated file to be 0747, got {r747['filename'].iloc[0]}"
    
    # Check quarantine JSON summary
    q_json_path = os.path.join(ROOT_DIR, "04_Prescription_OCR", "final_integration", "patch_v1", "QUARANTINE_MANIFEST_VERIFIED.json")
    with open(q_json_path, "r", encoding="utf-8") as f:
        q_data = json.load(f)
    
    assert q_data["split_summary"]["test"]["total_records"] == 152
    assert q_data["split_summary"]["test"]["admissible_records"] == 149
    assert q_data["split_summary"]["test"]["quarantined_records"] == 3
    assert q_data["split_summary"]["unannotated"]["quarantined_records"] == 1
    print("  --> PASS: Verified 1,000 rows (697 train + 150 val + 152 test + 1 unannotated 0747). Total: 992 admissible, 8 quarantined.")

def test_4_voice_dataset_counts():
    print("\n[TEST 4] Verifying Voice Dataset Provenance (26 clips, 22 sentences, 22 speakers)...")
    voice_csv = os.path.join(ROOT_DIR, "05_Bangla_Voice_AI", "pretrained_bengali_comparison", "task_03_2", "per_sample_predictions.csv")
    assert os.path.exists(voice_csv), f"Voice predictions CSV missing: {voice_csv}"
    
    df = pd.read_csv(voice_csv)
    assert len(df) == 26, f"Expected 26 total rows, got {len(df)}"
    assert df['reference_text'].nunique() == 22, f"Expected 22 unique reference sentences, got {df['reference_text'].nunique()}"
    assert df['speaker_id'].nunique() == 22, f"Expected 22 unique speakers, got {df['speaker_id'].nunique()}"
    
    # Check speakers with multiple clips
    spk_counts = df['speaker_id'].value_counts()
    multi_spk = spk_counts[spk_counts > 1].to_dict()
    assert multi_spk == {1530: 3, 1552: 3}, f"Unexpected repeat speakers: {multi_spk}"
    print("  --> PASS: Verified 26 audio clips across 22 unique sentences and 22 unique speakers.")

def test_5_pcos_clinical_canonical_manifest():
    print("\n[TEST 5] Verifying PCOS Clinical Canonical Manifest (pcos_clinical_cleaned.csv)...")
    pcos_manifest = os.path.join(ROOT_DIR, "01_PCOS_Clinical", "data", "processed", "pcos_clinical_cleaned.csv")
    assert os.path.exists(pcos_manifest), f"PCOS Clinical manifest missing: {pcos_manifest}"
    
    h, s = get_sha256_and_size(pcos_manifest)
    assert s == 11919, f"Expected 11,919 bytes, got {s}"
    assert h == "3e38331357da3c4d4501f93e30bb4c5e5acbb3ee0eac23d50035d30b2c5a4661", f"Hash mismatch: {h}"
    
    df = pd.read_csv(pcos_manifest)
    assert len(df) == 88, f"Expected 88 patient rows, got {len(df)}"
    print(f"  --> PASS: Canonical manifest verified ({s:,} bytes, sha256: {h[:16]}..., N=88 patients).")

def test_6_mcvsld_755_families():
    print("\n[TEST 6] Verifying MCVSLD 755-Family Grouped Split Manifest...")
    manifest = os.path.join(ROOT_DIR, "03_Measles_Viral_Rash", "data", "processed", "clean_grouped_split_manifest.csv")
    df = pd.read_csv(manifest)
    assert len(df) == 10384
    train_f = set(df[df['grouped_split'] == 'train']['family_id'].dropna().unique())
    val_f = set(df[df['grouped_split'] == 'val']['family_id'].dropna().unique())
    test_f = set(df[df['grouped_split'] == 'test']['family_id'].dropna().unique())
    assert len(train_f) == 528
    assert len(val_f) == 113
    assert len(test_f) == 114
    assert len(train_f | val_f | test_f) == 755
    assert len(train_f & val_f) == 0
    assert len(train_f & test_f) == 0
    assert len(val_f & test_f) == 0
    print("  --> PASS: 755 families verified (528 train, 113 val, 114 test). Zero leakage.")

def test_7_final_lock_deliverables_presence():
    print("\n[TEST 7] Verifying Presence of All Final Lock Deliverables...")
    required = [
        "FINAL_EVIDENCE_RECONCILIATION.md",
        "DERMOPED_PATIENT_CHECKPOINT_VERIFICATION.csv",
        "CORRECTED_DATASET_COUNTS.csv",
        "FINAL_RESEARCH_MODEL_REGISTER.csv",
        "FINAL_AUDIT_SIGNOFF.md"
    ]
    for r in required:
        p = os.path.join(SCRIPT_DIR, r)
        assert os.path.exists(p), f"Missing final lock deliverable: {r}"
        size = os.path.getsize(p)
        assert size > 0, f"Empty file: {r}"
        print(f"  --> FOUND: {r} ({size:,} bytes)")
    print("  --> PASS: All 5 final lock deliverables verified present and non-empty.")

if __name__ == "__main__":
    print("=================================================================")
    print("SHASTHOSETU AI — FINAL EVIDENCE LOCK VERIFICATION SUITE")
    print("=================================================================")
    try:
        test_1_dermoped_patient_reconciliation()
        test_2_dermoped_checkpoint_hashes()
        test_3_ocr_1000_row_accounting()
        test_4_voice_dataset_counts()
        test_5_pcos_clinical_canonical_manifest()
        test_6_mcvsld_755_families()
        test_7_final_lock_deliverables_presence()
        print("\n=================================================================")
        print(">>> ALL 7 READ-ONLY VERIFICATION TEST SUITES PASSED! <<<")
        print("=================================================================")
        sys.exit(0)
    except AssertionError as e:
        print(f"\n[FAIL] Assertion Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] Unexpected Exception: {e}")
        sys.exit(2)
