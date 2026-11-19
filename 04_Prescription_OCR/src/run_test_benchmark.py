import os
import sys
import time
import json
import re
import hashlib
import pandas as pd
import numpy as np
import torch
import easyocr
import jiwer
from PIL import Image

base_dir = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR"
manifest_path = os.path.join(base_dir, "data", "processed", "split_manifest.csv")
outputs_dir = os.path.join(base_dir, "outputs")
os.makedirs(outputs_dir, exist_ok=True)

df_manifest = pd.read_csv(manifest_path)
test_df = df_manifest[df_manifest["split"] == "test"].copy()
print(f"Total test prescriptions to evaluate: {len(test_df)}")

# Check GPU
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device} ({torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'})")

print("Initializing Bilingual EasyOCR (English + Bengali)...")
reader = easyocr.Reader(['en', 'bn'], gpu=(device == "cuda"))
print("Initialized successfully!")

def normalize_text(text):
    if not isinstance(text, str):
        return ""
    # Lowercase, clean extra whitespace
    t = re.sub(r'\s+', ' ', text.strip().lower())
    return t

def extract_entities_en(text):
    if not text:
        return {"medicines": [], "strengths": [], "frequencies": [], "durations": []}
    med_pattern = r'\b([A-Za-z0-9\+\-\/\s]{2,25}?)\s+(?:tablet|capsule|syrup|injection|drops|ointment|tab|cap|inj|powder|mouthwash)\b'
    meds = re.findall(med_pattern, text, re.IGNORECASE)
    cleaned_meds = []
    for m in meds:
        clean_m = m.strip().split()[-1] if len(m.strip().split()) > 2 else m.strip()
        if len(clean_m) >= 3 and clean_m.lower() not in ["one", "two", "three", "take", "the", "this"]:
            cleaned_meds.append(clean_m)
            
    strength_pattern = r'\b\d+(?:\.\d+)?\s*(?:mg|ml|gm|mcg|iu|%)\b'
    strengths = re.findall(strength_pattern, text, re.IGNORECASE)
    
    freq_pattern = r'\b(?:once|twice|three times|four times|\d+ times|daily|at night|in the morning|afternoon|every \d+ hours|1\s*-\s*0\s*-\s*1|1\s*\+\s*0\s*\+\s*1)\b'
    freqs = re.findall(freq_pattern, text, re.IGNORECASE)
    
    dur_pattern = r'\b(?:\d+\s*(?:days|weeks|months|years))\b'
    durations = re.findall(dur_pattern, text, re.IGNORECASE)
    
    return {
        "medicines": sorted(list(set(cleaned_meds))),
        "strengths": sorted(list(set([s.strip().lower() for s in strengths]))),
        "frequencies": sorted(list(set([f.strip().lower() for f in freqs]))),
        "durations": sorted(list(set([d.strip().lower() for d in durations])))
    }

predictions = []
error_records = []

start_total = time.time()
print("\nStarting inference on test split...")

for i, (_, row) in enumerate(test_df.iterrows()):
    p_id = row["prescription_id"]
    rel_path = row["relative_path"]
    full_path = os.path.join(base_dir, rel_path)
    gt_en = str(row["description_english"]) if pd.notnull(row["description_english"]) else ""
    gt_bn = str(row["description_bangla"]) if pd.notnull(row["description_bangla"]) else ""
    
    t0 = time.time()
    try:
        results = reader.readtext(full_path)
        inference_time_s = time.time() - t0
        
        detected_texts = [r[1] for r in results]
        confidences = [float(r[2]) for r in results]
        boxes = [r[0] for r in results]
        
        ocr_raw_text = " ".join(detected_texts).strip()
        mean_conf = float(np.mean(confidences)) if len(confidences) > 0 else 0.0
        min_conf = float(np.min(confidences)) if len(confidences) > 0 else 0.0
        max_conf = float(np.max(confidences)) if len(confidences) > 0 else 0.0
        num_boxes = len(results)
    except Exception as e:
        inference_time_s = time.time() - t0
        ocr_raw_text = ""
        mean_conf, min_conf, max_conf, num_boxes = 0.0, 0.0, 0.0, 0
        error_records.append({
            "prescription_id": p_id,
            "filename": row["filename"],
            "error_type": "INFERENCE_FAILURE",
            "details": str(e)
        })

    # Normalized comparison
    norm_gt_en = normalize_text(gt_en)
    norm_ocr = normalize_text(ocr_raw_text)
    
    # Calculate CER & WER against English narrative
    if norm_gt_en and norm_ocr:
        try:
            cer_en = float(jiwer.cer(norm_gt_en, norm_ocr))
            wer_en = float(jiwer.wer(norm_gt_en, norm_ocr))
        except Exception:
            cer_en, wer_en = 1.0, 1.0
    else:
        cer_en, wer_en = 1.0, 1.0
        
    # Entity extraction
    gt_entities = extract_entities_en(gt_en)
    ocr_entities = extract_entities_en(ocr_raw_text)
    
    # Check medicine recall (does OCR text contain GT medicines?)
    gt_meds = gt_entities["medicines"]
    matched_meds = [m for m in gt_meds if m.lower() in norm_ocr]
    med_recall = len(matched_meds) / len(gt_meds) if len(gt_meds) > 0 else 0.0
    
    # Check strength recall
    gt_strengths = gt_entities["strengths"]
    matched_strengths = [s for s in gt_strengths if s.lower() in norm_ocr]
    strength_recall = len(matched_strengths) / len(gt_strengths) if len(gt_strengths) > 0 else 0.0

    # Clinical Safety Assessment
    # Rule 1: Minimum confidence threshold (0.60)
    # Rule 2: Non-empty OCR
    # Rule 3: Medicine match confidence
    if num_boxes == 0 or not ocr_raw_text:
        safety_status = "CRITICAL_REJECT_EMPTY"
        auto_reminder_permitted = False
        rejection_reason = "No text detected in prescription image."
    elif mean_conf < 0.55:
        safety_status = "UNVERIFIED_REQUIRES_HUMAN_REVIEW"
        auto_reminder_permitted = False
        rejection_reason = f"Mean OCR confidence ({mean_conf:.2f}) below safe clinical threshold (0.55)."
    elif len(gt_meds) > 0 and len(matched_meds) == 0:
        safety_status = "UNVERIFIED_REQUIRES_HUMAN_REVIEW"
        auto_reminder_permitted = False
        rejection_reason = "No confirmed medication entities resolved from detected handwriting."
    else:
        safety_status = "VERIFIED_MEDICATION_DETECTED"
        auto_reminder_permitted = True
        rejection_reason = "Passed clinical verification checks."
        
    pred_record = {
        "prescription_id": p_id,
        "filename": row["filename"],
        "num_text_boxes": num_boxes,
        "mean_confidence": round(mean_conf, 4),
        "min_confidence": round(min_conf, 4),
        "max_confidence": round(max_conf, 4),
        "ocr_raw_text": ocr_raw_text,
        "gt_english": gt_en,
        "gt_bangla": gt_bn,
        "gt_medicines": "; ".join(gt_meds),
        "ocr_detected_medicines": "; ".join(ocr_entities["medicines"]),
        "matched_medicines": "; ".join(matched_meds),
        "medicine_recall": round(med_recall, 4),
        "gt_strengths": "; ".join(gt_strengths),
        "matched_strengths": "; ".join(matched_strengths),
        "strength_recall": round(strength_recall, 4),
        "cer_english": round(cer_en, 4),
        "wer_english": round(wer_en, 4),
        "inference_time_seconds": round(inference_time_s, 3),
        "safety_status": safety_status,
        "auto_reminder_permitted": auto_reminder_permitted,
        "clinical_rejection_reason": rejection_reason
    }
    predictions.append(pred_record)
    
    if safety_status != "VERIFIED_MEDICATION_DETECTED":
        error_records.append({
            "prescription_id": p_id,
            "filename": row["filename"],
            "error_type": safety_status,
            "mean_confidence": round(mean_conf, 4),
            "gt_medicines": "; ".join(gt_meds),
            "matched_medicines": "; ".join(matched_meds),
            "reason": rejection_reason,
            "ocr_sample": ocr_raw_text[:120]
        })
        
    if (i + 1) % 15 == 0 or (i + 1) == len(test_df):
        elapsed = time.time() - start_total
        avg_t = elapsed / (i + 1)
        print(f"[{i+1}/{len(test_df)}] p_id={p_id} | conf={mean_conf:.2f} | boxes={num_boxes} | recall={med_recall:.2f} | avg_time={avg_t:.2f}s/img")

# Save outputs
pred_df = pd.DataFrame(predictions)
pred_csv_path = os.path.join(outputs_dir, "test_predictions.csv")
pred_df.to_csv(pred_csv_path, index=False)
print(f"\nSaved test predictions to {pred_csv_path}")

error_df = pd.DataFrame(error_records)
error_csv_path = os.path.join(outputs_dir, "error_analysis.csv")
error_df.to_csv(error_csv_path, index=False)
print(f"Saved error analysis ({len(error_df)} records) to {error_csv_path}")

# Aggregate metrics
total_time = time.time() - start_total
metrics = {
    "module": "04_Prescription_OCR",
    "dataset": "Image-to-Text Bilingual Dataset from Medical Prescriptions (Mendeley Data v2)",
    "split": "test",
    "total_test_samples": len(test_df),
    "total_inference_time_seconds": round(total_time, 2),
    "mean_inference_time_per_image_seconds": round(float(pred_df["inference_time_seconds"].mean()), 3),
    "ocr_detection_summary": {
        "mean_boxes_per_image": round(float(pred_df["num_text_boxes"].mean()), 2),
        "min_boxes": int(pred_df["num_text_boxes"].min()),
        "max_boxes": int(pred_df["num_text_boxes"].max()),
        "mean_confidence": round(float(pred_df["mean_confidence"].mean()), 4),
        "min_mean_confidence": round(float(pred_df["mean_confidence"].min()), 4),
        "max_mean_confidence": round(float(pred_df["mean_confidence"].max()), 4)
    },
    "text_error_rates": {
        "mean_character_error_rate_cer": round(float(pred_df["cer_english"].mean()), 4),
        "median_cer": round(float(pred_df["cer_english"].median()), 4),
        "mean_word_error_rate_wer": round(float(pred_df["wer_english"].mean()), 4),
        "median_wer": round(float(pred_df["wer_english"].median()), 4)
    },
    "clinical_entity_recall": {
        "mean_medicine_recall": round(float(pred_df["medicine_recall"].mean()), 4),
        "mean_strength_recall": round(float(pred_df["strength_recall"].mean()), 4),
        "prescriptions_with_perfect_med_recall": int((pred_df["medicine_recall"] == 1.0).sum()),
        "prescriptions_with_partial_med_recall": int(((pred_df["medicine_recall"] > 0) & (pred_df["medicine_recall"] < 1.0)).sum()),
        "prescriptions_with_zero_med_recall": int((pred_df["medicine_recall"] == 0.0).sum())
    },
    "clinical_safety_gate_summary": {
        "verified_medication_detected": int((pred_df["safety_status"] == "VERIFIED_MEDICATION_DETECTED").sum()),
        "unverified_requires_human_review": int((pred_df["safety_status"] == "UNVERIFIED_REQUIRES_HUMAN_REVIEW").sum()),
        "critical_reject_empty": int((pred_df["safety_status"] == "CRITICAL_REJECT_EMPTY").sum()),
        "automated_reminder_permitted_count": int(pred_df["auto_reminder_permitted"].sum()),
        "automated_reminder_permitted_percent": round(float(pred_df["auto_reminder_permitted"].mean() * 100), 2),
        "human_review_required_count": int((~pred_df["auto_reminder_permitted"]).sum()),
        "human_review_required_percent": round(float((~pred_df["auto_reminder_permitted"]).mean() * 100), 2)
    }
}

metrics_path = os.path.join(outputs_dir, "metrics.json")
with open(metrics_path, "w", encoding="utf-8") as fp:
    json.dump(metrics, fp, indent=2)
print(f"Saved aggregate metrics to {metrics_path}")

print("\n--- FINAL BENCHMARK SUMMARY ---")
print(json.dumps(metrics, indent=2))
