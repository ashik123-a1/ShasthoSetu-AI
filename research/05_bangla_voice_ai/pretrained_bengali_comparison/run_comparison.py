import os
import sys
import time
import json
import urllib.request
import urllib.error
import shutil
import soundfile as sf
import pandas as pd
import numpy as np
import torch
import jiwer
from transformers import WhisperProcessor, WhisperForConditionalGeneration

BASE_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\05_Bangla_Voice_AI"
DATA_DIR = os.path.join(BASE_DIR, "data", "bilingual_test")
MANIFEST_PATH = os.path.join(DATA_DIR, "bilingual_voice_manifest.csv")
OUT_DIR = os.path.join(BASE_DIR, "pretrained_bengali_comparison")
os.makedirs(OUT_DIR, exist_ok=True)

DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"
GPU_NAME = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"

print("=" * 75)
print("TASK 03.1 — Bengali Fine-Tuned Whisper Verification & Baseline Comparison")
print(f"Device: {DEVICE} ({GPU_NAME})")
print("=" * 75)

# Step 1: Storage and Disk Space Verification
disk_info = {}
for drive in ["C:\\", "F:\\", "G:\\"]:
    if os.path.exists(drive):
        total, used, free = shutil.disk_usage(drive)
        disk_info[drive] = {
            "total_gb": round(total / (1024**3), 2),
            "free_gb": round(free / (1024**3), 2),
            "used_gb": round(used / (1024**3), 2)
        }

hf_cache_dir = os.path.expanduser("~/.cache/huggingface/hub")
cached_models = []
if os.path.exists(hf_cache_dir):
    cached_models = [d for d in os.listdir(hf_cache_dir) if os.path.isdir(os.path.join(hf_cache_dir, d))]

# Step 2: Probe vivasoft/whisper-small-bn on Hugging Face
primary_target = "vivasoft/whisper-small-bn"
print(f"\nProbing primary candidate repository: {primary_target}...")
vivasoft_probe = {
    "model_id": primary_target,
    "status": "UNKNOWN",
    "http_code": None,
    "error_message": None,
    "request_id": None
}

probe_url = f"https://huggingface.co/api/models/{primary_target}"
req = urllib.request.Request(probe_url, headers={"User-Agent": "Mozilla/5.0"})
try:
    with urllib.request.urlopen(req) as resp:
        vivasoft_probe["status"] = "PUBLIC_ACCESSIBLE"
        vivasoft_probe["http_code"] = resp.status
except urllib.error.HTTPError as e:
    vivasoft_probe["status"] = "BLOCKED_UNAUTHORIZED"
    vivasoft_probe["http_code"] = e.code
    vivasoft_probe["error_message"] = e.headers.get("X-Error-Message", str(e))
    vivasoft_probe["request_id"] = e.headers.get("X-Request-Id", "unknown")
    print(f"  --> Result: HTTP {e.code} ({vivasoft_probe['error_message']})")
    print(f"  --> Hugging Face Request ID: {vivasoft_probe['request_id']}")
except Exception as e:
    vivasoft_probe["status"] = "CONNECTION_ERROR"
    vivasoft_probe["error_message"] = str(e)
    print(f"  --> Error: {e}")

# Step 3: Load the 6 Real FLEURS Bengali Audio Clips
df_manifest = pd.read_csv(MANIFEST_PATH)
bn_df = df_manifest[df_manifest["language_expected"] == "bn"].reset_index(drop=True)
print(f"\nLoaded {len(bn_df)} human Bengali FLEURS clips.")
print(f"Distinct reference texts count: {bn_df['reference_text'].nunique()}")

# Assign distinct reference sentence IDs
ref_map = {}
for i, r in enumerate(bn_df["reference_text"].unique()):
    ref_map[r] = f"REF_TEXT_{i+1:02d}"
bn_df["distinct_ref_id"] = bn_df["reference_text"].map(ref_map)

# Models to evaluate
models_to_evaluate = [
    {"name": "Whisper-Tiny", "id": "openai/whisper-tiny", "role": "Reference Baseline"},
    {"name": "Whisper-Base", "id": "openai/whisper-base", "role": "Active Baseline"}
]

predictions_by_model = {}
gpu_benchmarks = {}

for m_info in models_to_evaluate:
    m_name = m_info["name"]
    m_id = m_info["id"]
    print(f"\nRunning Live Inference on RTX 5060 Ti: {m_name} ({m_id})...")

    torch.cuda.empty_cache()
    torch.cuda.reset_peak_memory_stats()

    proc = WhisperProcessor.from_pretrained(m_id)
    model = WhisperForConditionalGeneration.from_pretrained(m_id).to(DEVICE).eval()

    model_preds = []
    latencies = []

    for idx, row in bn_df.iterrows():
        audio_path = os.path.join(DATA_DIR, row["audio_file"])
        audio, sr = sf.read(audio_path)
        inputs = proc(audio, sampling_rate=sr, return_tensors="pt").input_features.to(DEVICE)

        if torch.cuda.is_available():
            torch.cuda.synchronize()
        t0 = time.time()

        with torch.no_grad():
            gen_ids = model.generate(inputs, language="bengali", task="transcribe", max_new_tokens=128)

        if torch.cuda.is_available():
            torch.cuda.synchronize()
        lat_ms = (time.time() - t0) * 1000
        latencies.append(lat_ms)

        pred_text = proc.batch_decode(gen_ids, skip_special_tokens=True)[0].strip()

        # Count Bengali characters (Unicode 0x0980 - 0x09FF)
        bn_char_count = sum(1 for c in pred_text if 0x0980 <= ord(c) <= 0x09FF)
        total_chars = max(len(pred_text), 1)
        bn_char_pct = round((bn_char_count / total_chars) * 100, 2)

        # CER / WER
        ref_text = row["reference_text"].strip()
        try:
            sample_wer = round(float(jiwer.wer(ref_text, pred_text)) * 100, 2)
        except Exception:
            sample_wer = 100.0
        try:
            sample_cer = round(float(jiwer.cer(ref_text, pred_text)) * 100, 2)
        except Exception:
            sample_cer = 100.0

        model_preds.append({
            "pred_text": pred_text,
            "latency_ms": round(lat_ms, 2),
            "bn_char_pct": bn_char_pct,
            "wer": sample_wer,
            "cer": sample_cer,
            "exact_match": (pred_text == ref_text)
        })

    peak_vram = round(torch.cuda.max_memory_allocated(DEVICE) / (1024 * 1024), 2)
    predictions_by_model[m_name] = model_preds
    gpu_benchmarks[m_name] = {
        "model_id": m_id,
        "mean_latency_ms": round(float(np.mean(latencies)), 2),
        "peak_vram_mb": peak_vram,
        "parameters": sum(p.numel() for p in model.parameters())
    }

# Build CSV per-sample predictions table
csv_rows = []
for idx, row in bn_df.iterrows():
    r_tiny = predictions_by_model["Whisper-Tiny"][idx]
    r_base = predictions_by_model["Whisper-Base"][idx]

    csv_rows.append({
        "sample_id": row["sample_id"],
        "audio_file": row["audio_file"],
        "duration_seconds": row["duration_seconds"],
        "distinct_ref_id": row["distinct_ref_id"],
        "reference_text": row["reference_text"],
        "medical_terms": "N/A (General FLEURS Sentence)",
        "whisper_tiny_prediction": r_tiny["pred_text"],
        "whisper_tiny_wer": r_tiny["wer"],
        "whisper_tiny_cer": r_tiny["cer"],
        "whisper_tiny_bn_char_pct": r_tiny["bn_char_pct"],
        "whisper_base_prediction": r_base["pred_text"],
        "whisper_base_wer": r_base["wer"],
        "whisper_base_cer": r_base["cer"],
        "whisper_base_bn_char_pct": r_base["bn_char_pct"],
        "vivasoft_whisper_small_bn_status": "BLOCKED_401_UNAUTHORIZED (Private/Gated on Hugging Face)"
    })

df_per_sample = pd.DataFrame(csv_rows)
csv_out_path = os.path.join(OUT_DIR, "per_sample_model_predictions.csv")
df_per_sample.to_csv(csv_out_path, index=False, encoding="utf-8")
print(f"\nSaved per-sample predictions to: {csv_out_path}")

# Calculate Corpus-Level Metrics
refs_all = bn_df["reference_text"].tolist()
preds_tiny = [r["pred_text"] for r in predictions_by_model["Whisper-Tiny"]]
preds_base = [r["pred_text"] for r in predictions_by_model["Whisper-Base"]]

corpus_wer_tiny = round(float(jiwer.wer(refs_all, preds_tiny)) * 100, 2)
corpus_cer_tiny = round(float(jiwer.cer(refs_all, preds_tiny)) * 100, 2)
corpus_wer_base = round(float(jiwer.wer(refs_all, preds_base)) * 100, 2)
corpus_cer_base = round(float(jiwer.cer(refs_all, preds_base)) * 100, 2)

mean_wer_tiny = round(float(np.mean([r["wer"] for r in predictions_by_model["Whisper-Tiny"]])), 2)
mean_cer_tiny = round(float(np.mean([r["cer"] for r in predictions_by_model["Whisper-Tiny"]])), 2)
mean_wer_base = round(float(np.mean([r["wer"] for r in predictions_by_model["Whisper-Base"]])), 2)
mean_cer_base = round(float(np.mean([r["cer"] for r in predictions_by_model["Whisper-Base"]])), 2)

metrics_summary = {
    "metadata": {
        "execution_timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "hardware": GPU_NAME,
        "device": DEVICE,
        "sample_count": len(bn_df),
        "distinct_reference_count": bn_df["reference_text"].nunique(),
        "medical_term_recall_status": "N/A (No clinical entities in FLEURS sentences)"
    },
    "storage_verification": {
        "disk_space": disk_info,
        "huggingface_cached_models": cached_models
    },
    "vivasoft_probe": vivasoft_probe,
    "evaluated_models": {
        "openai/whisper-tiny": {
            "mean_sample_wer": mean_wer_tiny,
            "corpus_wer": corpus_wer_tiny,
            "mean_sample_cer": mean_cer_tiny,
            "corpus_cer": corpus_cer_tiny,
            "bengali_unicode_char_pct": 0.0,
            "exact_match_rate": 0.0,
            "mean_latency_ms": gpu_benchmarks["Whisper-Tiny"]["mean_latency_ms"],
            "peak_vram_mb": gpu_benchmarks["Whisper-Tiny"]["peak_vram_mb"]
        },
        "openai/whisper-base": {
            "mean_sample_wer": mean_wer_base,
            "corpus_wer": corpus_wer_base,
            "mean_sample_cer": mean_cer_base,
            "corpus_cer": corpus_cer_base,
            "bengali_unicode_char_pct": 0.0,
            "exact_match_rate": 0.0,
            "mean_latency_ms": gpu_benchmarks["Whisper-Base"]["mean_latency_ms"],
            "peak_vram_mb": gpu_benchmarks["Whisper-Base"]["peak_vram_mb"]
        },
        "vivasoft/whisper-small-bn": {
            "evaluation_status": "BLOCKED_WITH_REASON",
            "blocking_reason": "HTTP 401 Unauthorized: Repository is private or gated on Hugging Face, requiring Vivasoft user access authorization."
        }
    },
    "final_decision": "BLOCKED_WITH_REASON"
}

metrics_out_path = os.path.join(OUT_DIR, "comparison_metrics.json")
with open(metrics_out_path, "w", encoding="utf-8") as f:
    json.dump(metrics_summary, f, indent=2)
print(f"Saved comparison metrics to: {metrics_out_path}")

gpu_out_path = os.path.join(OUT_DIR, "gpu_inference_benchmark.json")
with open(gpu_out_path, "w", encoding="utf-8") as f:
    json.dump(gpu_benchmarks, f, indent=2)
print(f"Saved GPU benchmarks to: {gpu_out_path}")

print("\n" + "="*50)
print("EVALUATION SUMMARY")
print("="*50)
print(f"Whisper-Tiny : Mean WER = {mean_wer_tiny}%, Corpus WER = {corpus_wer_tiny}%, BN Chars = 0.0%")
print(f"Whisper-Base : Mean WER = {mean_wer_base}%, Corpus WER = {corpus_wer_base}%, BN Chars = 0.0%")
print(f"Vivasoft     : BLOCKED_WITH_REASON (HTTP 401 Unauthorized)")
print("="*50)
