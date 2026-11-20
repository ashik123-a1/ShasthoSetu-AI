import os
import json
import pandas as pd

base_dir = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR"
outputs_dir = os.path.join(base_dir, "outputs")

pred_df = pd.read_csv(os.path.join(outputs_dir, "test_predictions.csv"))
error_df = pd.read_csv(os.path.join(outputs_dir, "error_analysis.csv"))

print(f"Total test predictions: {len(pred_df)}")
print(f"Total flagged errors: {len(error_df)}")

# Breakdown of failure reasons
print("\nRejection Reason Breakdown:")
print(pred_df["clinical_rejection_reason"].value_counts())

# Confident predictions analysis
verified_df = pred_df[pred_df["safety_status"] == "VERIFIED_MEDICATION_DETECTED"]
print(f"\nVerified Cases (N={len(verified_df)}):")
for _, r in verified_df.head(5).iterrows():
    print(f"\nPrescription {r['prescription_id']} (mean conf: {r['mean_confidence']:.2f}):")
    print(f"  GT Medicines: {r['gt_medicines']}")
    print(f"  Matched Medicines: {r['matched_medicines']}")
    print(f"  OCR sample: {str(r['ocr_raw_text'])[:120]}...")

# Top error samples
print(f"\nUnverified / High-Risk Samples (N={len(error_df)}):")
for _, r in error_df.head(5).iterrows():
    print(f"\nPrescription {r['prescription_id']} (conf: {r['mean_confidence']:.2f}):")
    print(f"  Reason: {r['reason']}")
    print(f"  GT Medicines: {r['gt_medicines']}")
    print(f"  OCR sample: {str(r['ocr_sample'])[:120]}...")

# Character analysis: presence of Bengali vs English in OCR outputs
has_bengali = pred_df["ocr_raw_text"].apply(lambda t: any('\u0980' <= c <= '\u09FF' for c in str(t)))
has_english = pred_df["ocr_raw_text"].apply(lambda t: any('a' <= c.lower() <= 'z' for c in str(t)))

print("\nOCR Language Breakdown across 152 test prescriptions:")
print(f"Prescriptions with detected English chars: {has_english.sum()} ({has_english.mean()*100:.1f}%)")
print(f"Prescriptions with detected Bengali chars: {has_bengali.sum()} ({has_bengali.mean()*100:.1f}%)")
print(f"Prescriptions with both English and Bengali: {(has_english & has_bengali).sum()} ({(has_english & has_bengali).mean()*100:.1f}%)")
