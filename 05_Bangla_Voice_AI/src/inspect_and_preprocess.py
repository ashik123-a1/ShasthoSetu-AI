import os
import sys
import json
import hashlib
import pandas as pd
import soundfile as sf

BASE_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\05_Bangla_Voice_AI"
RAW_TSV = os.path.join(BASE_DIR, "data", "raw", "dev.tsv")
AUDIO_DIR = os.path.join(BASE_DIR, "data", "raw", "extracted", "dev")
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
PROOFS_DIR = os.path.join(BASE_DIR, "proofs")
CONFIGS_DIR = os.path.join(BASE_DIR, "configs")

os.makedirs(PROCESSED_DIR, exist_ok=True)
os.makedirs(OUTPUTS_DIR, exist_ok=True)
os.makedirs(PROOFS_DIR, exist_ok=True)
os.makedirs(CONFIGS_DIR, exist_ok=True)

print("Starting deep inspection and preprocessing of FLEURS Bengali Voice AI dataset...")

records = []
corrupted = []
sha_set = set()

with open(RAW_TSV, "r", encoding="utf-8") as f:
    for line_idx, line in enumerate(f):
        parts = line.strip().split("\t")
        if len(parts) < 7:
            continue
        
        spk_id = parts[0]
        fname = parts[1]
        raw_text = parts[2]
        norm_text = parts[3]
        phonemes = parts[4]
        num_samples = int(parts[5])
        gender = parts[6]
        
        fpath = os.path.join(AUDIO_DIR, fname)
        if not os.path.exists(fpath):
            corrupted.append({"filename": fname, "error": "File not found on disk"})
            continue
            
        rel_path = os.path.relpath(fpath, BASE_DIR)
        fsize = os.path.getsize(fpath)
        
        # Hash
        h = hashlib.sha256()
        with open(fpath, "rb") as af:
            while chunk := af.read(65536):
                h.update(chunk)
        sha_val = h.hexdigest()
        sha_set.add(sha_val)
        
        # Audio inspection with soundfile
        try:
            info = sf.info(fpath)
            sr = info.samplerate
            channels = info.channels
            duration_sec = info.duration
            fmt = info.format
            subtype = info.subtype
            is_valid = True
        except Exception as e:
            sr, channels, duration_sec, fmt, subtype = 0, 0, 0.0, "", ""
            is_valid = False
            corrupted.append({"filename": fname, "error": str(e)})

        rec = {
            "speaker_id": spk_id,
            "filename": fname,
            "relative_path": rel_path,
            "raw_transcript": raw_text,
            "normalized_transcript": norm_text,
            "char_length": len(norm_text),
            "word_count": len(norm_text.split()),
            "gender": gender,
            "samplerate": sr,
            "channels": channels,
            "duration_seconds": round(duration_sec, 3),
            "audio_format": fmt,
            "subtype": subtype,
            "file_size_bytes": fsize,
            "is_valid": is_valid,
            "sha256": sha_val
        }
        records.append(rec)

print(f"Scanned and validated {len(records)} Bengali audio files.")
print(f"Corrupted or missing files: {len(corrupted)}")
print(f"Unique audio file hashes: {len(sha_set)}")

df = pd.DataFrame(records)
manifest_path = os.path.join(PROCESSED_DIR, "voice_manifest.csv")
df.to_csv(manifest_path, index=False)
print(f"Saved clean voice manifest to {manifest_path}")

total_duration_sec = df["duration_seconds"].sum()
total_hours = total_duration_sec / 3600

profile = {
    "dataset_name": "FLEURS Bengali Speech Recognition Benchmark (bn_in)",
    "source": "Google Research (Conneau et al., 2022) / Hugging Face Datasets",
    "license": "Creative Commons Attribution 4.0 International (CC BY 4.0)",
    "total_audio_utterances": len(df),
    "unique_speakers": int(df["speaker_id"].nunique()),
    "gender_distribution": df["gender"].value_counts().to_dict(),
    "audio_specifications": {
        "samplerate": int(df["samplerate"].iloc[0]),
        "channels": int(df["channels"].iloc[0]),
        "audio_format": str(df["audio_format"].iloc[0]),
        "bit_depth_subtype": str(df["subtype"].iloc[0])
    },
    "duration_statistics": {
        "total_duration_seconds": round(float(total_duration_sec), 2),
        "total_duration_minutes": round(float(total_duration_sec / 60), 2),
        "total_duration_hours": round(float(total_hours), 3),
        "min_duration_seconds": round(float(df["duration_seconds"].min()), 2),
        "max_duration_seconds": round(float(df["duration_seconds"].max()), 2),
        "mean_duration_seconds": round(float(df["duration_seconds"].mean()), 2)
    },
    "transcript_statistics": {
        "total_words": int(df["word_count"].sum()),
        "mean_words_per_utterance": round(float(df["word_count"].mean()), 1),
        "mean_chars_per_utterance": round(float(df["char_length"].mean()), 1)
    }
}

with open(os.path.join(OUTPUTS_DIR, "dataset_profile.json"), "w", encoding="utf-8") as f:
    json.dump(profile, f, indent=2)
with open(os.path.join(PROOFS_DIR, "dataset_profile.json"), "w", encoding="utf-8") as f:
    json.dump(profile, f, indent=2)

print("\nDataset Profile Summary:")
print(f"  Utterances: {len(df)} | Speakers: {profile['unique_speakers']}")
print(f"  Total Duration: {profile['duration_statistics']['total_duration_minutes']} minutes ({profile['duration_statistics']['mean_duration_seconds']}s avg per clip)")
print(f"  Gender: {profile['gender_distribution']}")
