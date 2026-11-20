import os
import sys
import time
import json
import shutil
import random
import csv
from pathlib import Path
import numpy as np
import soundfile as sf
import torch
import jiwer
from transformers import WhisperForConditionalGeneration, WhisperProcessor, GenerationConfig

# Enforce Drive G: for Hugging Face cache
os.environ["HF_HOME"] = r"G:\hf_cache"
os.environ["HUGGINGFACE_HUB_CACHE"] = r"G:\hf_cache\hub"
os.environ["TRANSFORMERS_CACHE"] = r"G:\hf_cache\hub"
os.environ["HF_HUB_DISABLE_IMPLICIT_TOKEN"] = "1"

BASE_DIR = Path(r"F:\Clude cccccccccccccccccccccccc\data we test\05_Bangla_Voice_AI")
DATA_DIR = BASE_DIR / "data" / "bilingual_test"
RAW_DIR = BASE_DIR / "data" / "raw"
EXTRACTED_DEV_DIR = RAW_DIR / "extracted" / "dev"
DEV_TSV_PATH = RAW_DIR / "dev.tsv"

OUT_DIR = BASE_DIR / "pretrained_bengali_comparison" / "task_03_2"
OUT_DIR.mkdir(parents=True, exist_ok=True)

DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"
GPU_NAME = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"

def get_disk_space():
    drives = ["C:\\", "F:\\", "G:\\"]
    info = {}
    for d in drives:
        if os.path.exists(d):
            t, u, f = shutil.disk_usage(d)
            info[d] = {
                "total_gb": round(t / (1024**3), 2),
                "used_gb": round(u / (1024**3), 2),
                "free_gb": round(f / (1024**3), 2)
            }
    return info

def count_bengali_chars(text):
    if not text:
        return 0, 0, 0.0
    bn_count = sum(1 for c in text if 0x0980 <= ord(c) <= 0x09FF)
    non_ws_count = sum(1 for c in text if not c.isspace())
    pct = round((bn_count / max(non_ws_count, 1)) * 100, 2)
    return bn_count, non_ws_count, pct

def normalize_text_bengali(text):
    if not text:
        return ""
    # Remove standard English & Bengali punctuation, and collapse spaces
    import re
    # Bengali punctuation includes dari (।), double dari (॥), commas, quotes, etc.
    cleaned = re.sub(r"[\.,\?!;:\"'–—\(\)\[\]\{\}।॥/\\]", " ", text)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned

def compute_wer_cer(ref, pred):
    ref_raw = ref.strip()
    pred_raw = pred.strip()
    
    # Raw WER / CER
    try:
        raw_wer = round(float(jiwer.wer(ref_raw, pred_raw)) * 100, 2)
    except Exception:
        raw_wer = 100.0
    try:
        raw_cer = round(float(jiwer.cer(ref_raw, pred_raw)) * 100, 2)
    except Exception:
        raw_cer = 100.0
        
    # Normalized WER / CER
    ref_norm = normalize_text_bengali(ref_raw)
    pred_norm = normalize_text_bengali(pred_raw)
    try:
        norm_wer = round(float(jiwer.wer(ref_norm, pred_norm)) * 100, 2)
    except Exception:
        norm_wer = 100.0
    try:
        norm_cer = round(float(jiwer.cer(ref_norm, pred_norm)) * 100, 2)
    except Exception:
        norm_cer = 100.0

    return raw_wer, raw_cer, norm_wer, norm_cer, ref_norm, pred_norm

def main():
    print("=" * 75)
    print("TASK 03.2 — GPU Inference Benchmark: Baseline vs. Bengali Fine-Tuned Whisper")
    print(f"Device: {DEVICE} ({GPU_NAME})")
    print("=" * 75)

    disk_info = get_disk_space()
    print("\n[Storage Status]")
    for d, s in disk_info.items():
        print(f"  {d}: Free {s['free_gb']} GB / Total {s['total_gb']} GB")

    # 1. Build Evaluation Sample Sets
    print("\n[Building Evaluation Sample Sets]")
    
    # Set 1: Smoke Test (6 samples from bilingual_test)
    smoke_samples = []
    smoke_manifest = DATA_DIR / "bilingual_voice_manifest.csv"
    with open(smoke_manifest, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            if r["language_expected"] == "bn":
                smoke_samples.append({
                    "sample_id": r["sample_id"],
                    "cohort": "Smoke_Test_6",
                    "audio_file": str(DATA_DIR / r["audio_file"]),
                    "reference_text": r["reference_text"],
                    "speaker_id": "1530" if "01" in r["sample_id"] or "02" in r["sample_id"] or "03" in r["sample_id"] else "1552",
                    "sentence_id": "REF_SENTENCE_01" if "01" in r["sample_id"] or "02" in r["sample_id"] or "03" in r["sample_id"] else "REF_SENTENCE_02"
                })
    print(f"  Smoke Test Samples: {len(smoke_samples)} clips (2 distinct reference sentences)")

    # Set 2: Extended Research Set (20 distinct sentences from 20 distinct speakers, seed=42)
    smoke_filenames = {"bn_sample_01.wav", "bn_sample_02.wav", "bn_sample_03.wav", "bn_sample_04.wav", "bn_sample_05.wav", "bn_sample_06.wav"}
    smoke_texts = {s["reference_text"].strip() for s in smoke_samples}

    dev_candidates = []
    with open(DEV_TSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.reader(f, delimiter="\t")
        for r in reader:
            if len(r) >= 4:
                spk = r[0]
                fname = r[1]
                raw_t = r[2]
                norm_t = r[3]
                fpath = EXTRACTED_DEV_DIR / fname
                if fpath.exists() and norm_t.strip() not in smoke_texts:
                    dev_candidates.append({
                        "speaker_id": spk,
                        "audio_name": fname,
                        "audio_path": str(fpath),
                        "reference_text": norm_t.strip()
                    })

    # Group by reference text to ensure distinct sentences
    by_sentence = {}
    for c in dev_candidates:
        txt = c["reference_text"]
        if txt not in by_sentence:
            by_sentence[txt] = []
        by_sentence[txt].append(c)

    # Sort keys for deterministic shuffle
    unique_sentence_keys = sorted(list(by_sentence.keys()))
    rng = random.Random(42)
    rng.shuffle(unique_sentence_keys)

    extended_samples = []
    used_speakers = set()
    for idx, txt in enumerate(unique_sentence_keys):
        clips = by_sentence[txt]
        # Choose a clip with a speaker not yet used if possible
        unseen_spks = [c for c in clips if c["speaker_id"] not in used_speakers]
        chosen = unseen_spks[0] if unseen_spks else clips[0]
        used_speakers.add(chosen["speaker_id"])
        extended_samples.append({
            "sample_id": f"EXT_{len(extended_samples)+1:02d}",
            "cohort": "Extended_FLEURS_20",
            "audio_file": chosen["audio_path"],
            "reference_text": chosen["reference_text"],
            "speaker_id": chosen["speaker_id"],
            "sentence_id": f"EXT_SENTENCE_{len(extended_samples)+1:02d}"
        })
        if len(extended_samples) == 20:
            break

    print(f"  Extended Research Samples: {len(extended_samples)} distinct sentences from {len(used_speakers)} distinct speakers (Seed=42)")

    all_test_samples = smoke_samples + extended_samples
    print(f"  Total evaluation corpus: {len(all_test_samples)} audio clips")

    # 2. Benchmark Definitions
    models_to_test = [
        {
            "name": "Whisper-Base",
            "model_id": "openai/whisper-base",
            "is_finetuned_bn": False
        },
        {
            "name": "Whisper-Small-Bengali",
            "model_id": "anuragshas/whisper-small-bn",
            "is_finetuned_bn": True
        }
    ]

    benchmark_results = {}
    gpu_benchmarks = {}
    per_sample_rows = []

    # Initialize per-sample record structures
    for s in all_test_samples:
        per_sample_rows.append({
            "sample_id": s["sample_id"],
            "cohort": s["cohort"],
            "speaker_id": s["speaker_id"],
            "sentence_id": s["sentence_id"],
            "audio_file": os.path.basename(s["audio_file"]),
            "reference_text": s["reference_text"]
        })

    for m_cfg in models_to_test:
        m_name = m_cfg["name"]
        m_id = m_cfg["model_id"]
        print(f"\n" + "-" * 60)
        print(f"Evaluating Model: {m_name} ({m_id}) on {DEVICE}")
        print("-" * 60)

        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.reset_peak_memory_stats(DEVICE)

        print(f"Loading processor: {m_id}...")
        proc = WhisperProcessor.from_pretrained(m_id, cache_dir=r"G:\hf_cache\hub")
        print(f"Loading weights: {m_id}...")
        model = WhisperForConditionalGeneration.from_pretrained(m_id, cache_dir=r"G:\hf_cache\hub").to(DEVICE)
        
        # Ensure updated generation config for language forced decoding
        if m_cfg["is_finetuned_bn"]:
            model.generation_config = GenerationConfig.from_pretrained("openai/whisper-small", cache_dir=r"G:\hf_cache\hub")

        model_params = sum(p.numel() for p in model.parameters())
        print(f"Model parameters: {model_params:,}")

        model_preds = []
        latencies = []

        for idx, sample in enumerate(all_test_samples):
            a_path = sample["audio_file"]
            audio, sr = sf.read(a_path)
            inputs = proc(audio, sampling_rate=sr, return_tensors="pt").input_features.to(DEVICE)

            if torch.cuda.is_available():
                torch.cuda.synchronize()
            t0 = time.time()

            with torch.no_grad():
                gen_ids = model.generate(inputs, language="bengali", task="transcribe", max_new_tokens=440)

            if torch.cuda.is_available():
                torch.cuda.synchronize()
            lat_ms = (time.time() - t0) * 1000
            latencies.append(lat_ms)

            pred_text = proc.batch_decode(gen_ids, skip_special_tokens=True)[0].strip()
            ref_text = sample["reference_text"].strip()

            raw_wer, raw_cer, norm_wer, norm_cer, ref_norm, pred_norm = compute_wer_cer(ref_text, pred_text)
            bn_chars, total_chars, bn_pct = count_bengali_chars(pred_text)
            exact_match = (pred_norm == ref_norm)

            model_preds.append({
                "sample_id": sample["sample_id"],
                "cohort": sample["cohort"],
                "pred_text": pred_text,
                "pred_norm": pred_norm,
                "latency_ms": round(lat_ms, 2),
                "bn_char_count": bn_chars,
                "total_chars": total_chars,
                "bn_char_pct": bn_pct,
                "raw_wer": raw_wer,
                "raw_cer": raw_cer,
                "norm_wer": norm_wer,
                "norm_cer": norm_cer,
                "exact_match": exact_match
            })

            # Update master per-sample rows
            prefix = "whisper_base" if m_name == "Whisper-Base" else "whisper_small_bn"
            per_sample_rows[idx][f"{prefix}_pred_raw"] = pred_text
            per_sample_rows[idx][f"{prefix}_latency_ms"] = round(lat_ms, 2)
            per_sample_rows[idx][f"{prefix}_raw_wer"] = raw_wer
            per_sample_rows[idx][f"{prefix}_raw_cer"] = raw_cer
            per_sample_rows[idx][f"{prefix}_norm_wer"] = norm_wer
            per_sample_rows[idx][f"{prefix}_norm_cer"] = norm_cer
            per_sample_rows[idx][f"{prefix}_bn_char_pct"] = bn_pct
            per_sample_rows[idx][f"{prefix}_exact_match"] = exact_match

        peak_vram = round(torch.cuda.max_memory_allocated(DEVICE) / (1024 * 1024), 2) if torch.cuda.is_available() else 0.0
        gpu_benchmarks[m_name] = {
            "model_id": m_id,
            "parameters": model_params,
            "mean_latency_ms": round(float(np.mean(latencies)), 2),
            "median_latency_ms": round(float(np.median(latencies)), 2),
            "peak_vram_mb": peak_vram
        }

        # Calculate metrics for: All, Smoke_Test_6, and Extended_FLEURS_20
        def aggregate_cohort(subset_preds):
            all_refs_raw = [all_test_samples[i]["reference_text"] for i, p in enumerate(model_preds) if p in subset_preds]
            all_preds_raw = [p["pred_text"] for p in subset_preds]
            all_refs_norm = [normalize_text_bengali(r) for r in all_refs_raw]
            all_preds_norm = [p["pred_norm"] for p in subset_preds]

            corpus_raw_wer = round(float(jiwer.wer(all_refs_raw, all_preds_raw)) * 100, 2)
            corpus_raw_cer = round(float(jiwer.cer(all_refs_raw, all_preds_raw)) * 100, 2)
            corpus_norm_wer = round(float(jiwer.wer(all_refs_norm, all_preds_norm)) * 100, 2)
            corpus_norm_cer = round(float(jiwer.cer(all_refs_norm, all_preds_norm)) * 100, 2)

            return {
                "sample_count": len(subset_preds),
                "mean_sample_raw_wer": round(float(np.mean([p["raw_wer"] for p in subset_preds])), 2),
                "median_sample_raw_wer": round(float(np.median([p["raw_wer"] for p in subset_preds])), 2),
                "corpus_raw_wer": corpus_raw_wer,
                "mean_sample_norm_wer": round(float(np.mean([p["norm_wer"] for p in subset_preds])), 2),
                "median_sample_norm_wer": round(float(np.median([p["norm_wer"] for p in subset_preds])), 2),
                "corpus_norm_wer": corpus_norm_wer,
                "mean_sample_raw_cer": round(float(np.mean([p["raw_cer"] for p in subset_preds])), 2),
                "corpus_raw_cer": corpus_raw_cer,
                "mean_sample_norm_cer": round(float(np.mean([p["norm_cer"] for p in subset_preds])), 2),
                "corpus_norm_cer": corpus_norm_cer,
                "mean_bn_char_pct": round(float(np.mean([p["bn_char_pct"] for p in subset_preds])), 2),
                "exact_match_rate": round(float(np.mean([1.0 if p["exact_match"] else 0.0 for p in subset_preds])) * 100, 2)
            }

        smoke_preds = [p for p in model_preds if p["cohort"] == "Smoke_Test_6"]
        ext_preds = [p for p in model_preds if p["cohort"] == "Extended_FLEURS_20"]

        benchmark_results[m_name] = {
            "model_id": m_id,
            "overall_26_samples": aggregate_cohort(model_preds),
            "smoke_test_6_samples": aggregate_cohort(smoke_preds),
            "extended_research_20_samples": aggregate_cohort(ext_preds)
        }

        # Clean up model from GPU memory
        del model
        del proc
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

    # 3. Write Deliverables
    # CSV Predictions
    csv_path = OUT_DIR / "per_sample_predictions.csv"
    with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
        fieldnames = list(per_sample_rows[0].keys())
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(per_sample_rows)
    print(f"\n[Saved CSV Predictions]: {csv_path}")

    # JSON Metrics
    metrics_summary = {
        "metadata": {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "hardware": GPU_NAME,
            "device": DEVICE,
            "total_samples": len(all_test_samples),
            "smoke_samples": len(smoke_samples),
            "extended_samples": len(extended_samples),
            "random_seed": 42
        },
        "disk_space": disk_info,
        "models_evaluated": benchmark_results,
        "gpu_benchmarks": gpu_benchmarks,
        "final_decision": "BENGALI_MODEL_IMPROVED" if (
            benchmark_results["Whisper-Small-Bengali"]["overall_26_samples"]["mean_bn_char_pct"] > 80.0 and
            benchmark_results["Whisper-Small-Bengali"]["overall_26_samples"]["corpus_norm_wer"] <
            benchmark_results["Whisper-Base"]["overall_26_samples"]["corpus_norm_wer"]
        ) else "BENGALI_MODEL_NOT_IMPROVED"
    }

    metrics_path = OUT_DIR / "comparison_metrics.json"
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics_summary, f, indent=2, ensure_ascii=False)
    print(f"[Saved Metrics JSON]: {metrics_path}")

    # GPU Benchmarks JSON
    gpu_path = OUT_DIR / "gpu_benchmark.json"
    with open(gpu_path, "w", encoding="utf-8") as f:
        json.dump(gpu_benchmarks, f, indent=2)
    print(f"[Saved GPU Benchmarks]: {gpu_path}")

    print("\n" + "=" * 75)
    print("TASK 03.2 BENCHMARK SUMMARY")
    print("=" * 75)
    print(f"Final Decision: {metrics_summary['final_decision']}")
    print("\nSmoke Test (6 clips):")
    print(f"  Whisper-Base         : WER={benchmark_results['Whisper-Base']['smoke_test_6_samples']['corpus_norm_wer']}%, BN Chars={benchmark_results['Whisper-Base']['smoke_test_6_samples']['mean_bn_char_pct']}%")
    print(f"  Whisper-Small-Bengali: WER={benchmark_results['Whisper-Small-Bengali']['smoke_test_6_samples']['corpus_norm_wer']}%, BN Chars={benchmark_results['Whisper-Small-Bengali']['smoke_test_6_samples']['mean_bn_char_pct']}%")
    print("\nExtended Research (20 distinct sentences, 20 distinct speakers):")
    print(f"  Whisper-Base         : WER={benchmark_results['Whisper-Base']['extended_research_20_samples']['corpus_norm_wer']}%, BN Chars={benchmark_results['Whisper-Base']['extended_research_20_samples']['mean_bn_char_pct']}%")
    print(f"  Whisper-Small-Bengali: WER={benchmark_results['Whisper-Small-Bengali']['extended_research_20_samples']['corpus_norm_wer']}%, BN Chars={benchmark_results['Whisper-Small-Bengali']['extended_research_20_samples']['mean_bn_char_pct']}%")
    print("=" * 75)

if __name__ == "__main__":
    main()
