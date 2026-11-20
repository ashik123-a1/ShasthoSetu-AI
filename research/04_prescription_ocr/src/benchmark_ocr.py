import os
import sys
import json
import time
import re
import numpy as np
import pandas as pd
from PIL import Image
import torch
import easyocr
import jiwer
from rapidfuzz.distance import Levenshtein
import matplotlib.pyplot as plt
import seaborn as sns

BASE_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR"
SPLIT_MANIFEST = os.path.join(BASE_DIR, "data", "processed", "split_manifest.csv")
CONFIG_PATH = os.path.join(BASE_DIR, "configs", "config.json")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
MODELS_DIR = os.path.join(BASE_DIR, "models")
LOGS_DIR = os.path.join(BASE_DIR, "logs")
PROOFS_DIR = os.path.join(BASE_DIR, "proofs")
RUNS_DIR = os.path.join(BASE_DIR, "runs")

os.makedirs(OUTPUTS_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(LOGS_DIR, exist_ok=True)
os.makedirs(PROOFS_DIR, exist_ok=True)
os.makedirs(RUNS_DIR, exist_ok=True)

RUN_ID = f"run_01_{time.strftime('%Y%m%d_%H%M%S')}"
RUN_DIR = os.path.join(RUNS_DIR, RUN_ID)
os.makedirs(RUN_DIR, exist_ok=True)

LOG_FILE = os.path.join(LOGS_DIR, "experiment_log.txt")
RUN_LOG = os.path.join(RUN_DIR, "experiment_log.txt")

def log(msg):
    timestamp = time.strftime("[%Y-%m-%d %H:%M:%S]")
    full_msg = f"{timestamp} {msg}"
    print(full_msg)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(full_msg + "\n")
    with open(RUN_LOG, "a", encoding="utf-8") as f:
        f.write(full_msg + "\n")

def clean_text_for_eval(text):
    if not isinstance(text, str):
        return ""
    # Normalize whitespaces
    t = re.sub(r"\s+", " ", text).strip().lower()
    return t

def extract_drug_keywords(text):
    # Medical terms, dosage forms, units
    words = re.findall(r"[a-zA-Z\u0980-\u09FF]+|\d+", str(text).lower())
    keywords = [w for w in words if len(w) > 2]
    return set(keywords)

def main():
    start_time = time.time()
    log("="*70)
    log("ShasthoSetu AI — Bilingual Doctor's Prescription OCR Benchmark")
    log("="*70)

    # Hardware check
    use_gpu = torch.cuda.is_available()
    gpu_name = torch.cuda.get_device_name(0) if use_gpu else "CPU"
    log(f"Device: {gpu_name} (GPU Acceleration: {use_gpu})")

    # Load split manifest
    df_all = pd.read_csv(SPLIT_MANIFEST)
    test_df = df_all[df_all["split"] == "test"].copy().reset_index(drop=True)
    log(f"Total test prescriptions to benchmark: {len(test_df)}")

    # Initialize EasyOCR Bilingual Engine
    log("Initializing EasyOCR Bilingual Reader (['bn', 'en']) on GPU...")
    reader = easyocr.Reader(["bn", "en"], gpu=use_gpu)
    log("EasyOCR engine successfully initialized.")

    results = []
    total_samples = len(test_df)
    last_print = time.time()

    for idx, row in test_df.iterrows():
        img_path = os.path.join(BASE_DIR, row["relative_path"])
        gt_en = str(row["text_english"]).strip()
        gt_bn = str(row["text_bangla"]).strip()
        gt_full = f"{gt_en} {gt_bn}".strip()

        t_img_start = time.time()
        # Perform OCR recognition
        try:
            ocr_out = reader.readtext(img_path, detail=0, paragraph=True)
            ocr_text = " ".join(ocr_out).strip()
        except Exception as e:
            ocr_text = ""
            log(f"Error reading {row['filename']}: {e}")
        t_img = time.time() - t_img_start

        # Cleaned texts
        gt_clean = clean_text_for_eval(gt_full)
        ocr_clean = clean_text_for_eval(ocr_text)

        # CER & WER
        if len(gt_clean) > 0 and len(ocr_clean) > 0:
            c_err = jiwer.cer(gt_clean, ocr_clean)
            w_err = jiwer.wer(gt_clean, ocr_clean)
        elif len(gt_clean) > 0 and len(ocr_clean) == 0:
            c_err = 1.0
            w_err = 1.0
        else:
            c_err = 0.0
            w_err = 0.0

        # Normalized Levenshtein similarity [0, 1]
        sim = Levenshtein.normalized_similarity(gt_clean, ocr_clean)

        # Keyword / Medication Token Recall
        gt_tokens = extract_drug_keywords(gt_full)
        ocr_tokens = extract_drug_keywords(ocr_text)
        if len(gt_tokens) > 0:
            token_recall = len(gt_tokens.intersection(ocr_tokens)) / len(gt_tokens)
            token_precision = len(gt_tokens.intersection(ocr_tokens)) / max(1, len(ocr_tokens))
        else:
            token_recall, token_precision = 0.0, 0.0

        res_item = {
            "filename": row["filename"],
            "relative_path": row["relative_path"],
            "width": row["width"],
            "height": row["height"],
            "ground_truth_english": gt_en,
            "ground_truth_bangla": gt_bn,
            "ground_truth_combined": gt_full,
            "ocr_extracted_text": ocr_text,
            "inference_time_sec": round(t_img, 3),
            "cer": round(float(c_err), 4),
            "wer": round(float(w_err), 4),
            "levenshtein_similarity": round(float(sim), 4),
            "medication_token_recall": round(float(token_recall), 4),
            "medication_token_precision": round(float(token_precision), 4)
        }
        results.append(res_item)

        if (idx + 1) % 25 == 0 or (idx + 1) == total_samples:
            now = time.time()
            elapsed_loop = now - start_time
            rate = (idx + 1) / max(0.1, elapsed_loop)
            log(f"  Processed {idx + 1}/{total_samples} ({(idx + 1)/total_samples*100:.1f}%) | Speed: {rate:.2f} img/s | Avg CER so far: {np.mean([r['cer'] for r in results])*100:.2f}%")

    eval_df = pd.DataFrame(results)
    eval_csv_path = os.path.join(OUTPUTS_DIR, "ocr_test_predictions.csv")
    eval_df.to_csv(eval_csv_path, index=False)
    eval_df.to_csv(os.path.join(PROOFS_DIR, "ocr_test_predictions.csv"), index=False)

    mean_cer = eval_df["cer"].mean()
    median_cer = eval_df["cer"].median()
    mean_wer = eval_df["wer"].mean()
    median_wer = eval_df["wer"].median()
    mean_sim = eval_df["levenshtein_similarity"].mean()
    mean_recall = eval_df["medication_token_recall"].mean()
    mean_inf_time = eval_df["inference_time_sec"].mean()

    log("\n" + "="*30 + " Final Benchmark Metrics " + "="*30)
    log(f"Test Prescriptions Evaluated: {len(eval_df)}")
    log(f"Mean Character Error Rate (CER):       {mean_cer*100:.2f}% (Median: {median_cer*100:.2f}%)")
    log(f"Mean Word Error Rate (WER):            {mean_wer*100:.2f}% (Median: {median_wer*100:.2f}%)")
    log(f"Mean Levenshtein String Similarity:    {mean_sim*100:.2f}%")
    log(f"Mean Medication Token Recall:          {mean_recall*100:.2f}%")
    log(f"Mean Inference Speed per Prescription: {mean_inf_time:.3f} seconds ({1/mean_inf_time:.2f} pages/s)")

    # Plots
    plt.figure(figsize=(12, 5))
    plt.subplot(1, 2, 1)
    sns.histplot(eval_df["cer"], bins=20, kde=True, color="purple")
    plt.axvline(mean_cer, color="red", linestyle="--", label=f"Mean CER: {mean_cer*100:.1f}%")
    plt.title("Character Error Rate (CER) Distribution")
    plt.xlabel("CER")
    plt.ylabel("Count")
    plt.legend()

    plt.subplot(1, 2, 2)
    sns.histplot(eval_df["medication_token_recall"], bins=20, kde=True, color="teal")
    plt.axvline(mean_recall, color="red", linestyle="--", label=f"Mean Recall: {mean_recall*100:.1f}%")
    plt.title("Medication Token Recall Distribution")
    plt.xlabel("Token Recall")
    plt.ylabel("Count")
    plt.legend()
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUTS_DIR, "cer_recall_distribution.png"), dpi=200)
    plt.savefig(os.path.join(PROOFS_DIR, "cer_recall_distribution.png"), dpi=200)
    plt.close()

    total_duration = time.time() - start_time
    final_metrics = {
        "experiment": "Bilingual Medical Prescription OCR Benchmark",
        "dataset": "Image-to-Text Bilingual Dataset from Medical Prescriptions (Mendeley Data tg2hm7n2bs/2)",
        "engine": "EasyOCR Bilingual GPU Engine (Bengali + English)",
        "hardware": gpu_name,
        "sample_counts": {
            "total_clean_unique_prescriptions": len(df_all),
            "test_prescriptions_evaluated": len(eval_df)
        },
        "metrics": {
            "mean_cer": round(float(mean_cer), 4),
            "median_cer": round(float(median_cer), 4),
            "mean_wer": round(float(mean_wer), 4),
            "median_wer": round(float(median_wer), 4),
            "mean_levenshtein_similarity": round(float(mean_sim), 4),
            "mean_medication_token_recall": round(float(mean_recall), 4),
            "mean_inference_seconds_per_image": round(float(mean_inf_time), 3),
            "throughput_prescriptions_per_second": round(float(1 / max(0.001, mean_inf_time)), 2)
        },
        "total_runtime_seconds": round(total_duration, 2),
        "clinical_safety_notice": "Handwritten doctor prescriptions exhibit high orthographic variability. Assistive OCR output MUST be verified by a licensed pharmacist before clinical dispensation."
    }

    with open(os.path.join(OUTPUTS_DIR, "metrics.json"), "w", encoding="utf-8") as f:
        json.dump(final_metrics, f, indent=2)
    with open(os.path.join(PROOFS_DIR, "metrics.json"), "w", encoding="utf-8") as f:
        json.dump(final_metrics, f, indent=2)

    with open(os.path.join(RUN_DIR, "run_info.json"), "w", encoding="utf-8") as f:
        json.dump({"run_id": RUN_ID, "metrics": final_metrics}, f, indent=2)

    log(f"Prescription OCR benchmark completed successfully in {total_duration:.2f} seconds.")
    log("="*70)

if __name__ == "__main__":
    main()
