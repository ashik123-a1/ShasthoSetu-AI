import os
import json
import numpy as np
import pandas as pd

BASE_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\05_Bangla_Voice_AI"
MANIFEST_PATH = os.path.join(BASE_DIR, "data", "processed", "voice_manifest.csv")
SPLIT_MANIFEST_PATH = os.path.join(BASE_DIR, "data", "processed", "split_manifest.csv")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
PROOFS_DIR = os.path.join(BASE_DIR, "proofs")

df = pd.read_csv(MANIFEST_PATH)
print(f"Loaded voice manifest with {len(df)} utterances.")

# Group by speaker to ensure 0% speaker leakage between train, val, test
np.random.seed(42)
unique_speakers = df["speaker_id"].unique()
np.random.shuffle(unique_speakers)

total_spk = len(unique_speakers)
n_train_spk = int(0.70 * total_spk)
n_val_spk = int(0.15 * total_spk)

train_speakers = set(unique_speakers[:n_train_spk])
val_speakers = set(unique_speakers[n_train_spk:n_train_spk + n_val_spk])
test_speakers = set(unique_speakers[n_train_spk + n_val_spk:])

def assign_split(row):
    spk = row["speaker_id"]
    if spk in train_speakers:
        return "train"
    elif spk in val_speakers:
        return "val"
    else:
        return "test"

df["split"] = df.apply(assign_split, axis=1)

# Verify zero speaker leakage
train_set = set(df[df["split"] == "train"]["speaker_id"])
val_set = set(df[df["split"] == "val"]["speaker_id"])
test_set = set(df[df["split"] == "test"]["speaker_id"])

leak_train_val = len(train_set.intersection(val_set))
leak_train_test = len(train_set.intersection(test_set))
leak_val_test = len(val_set.intersection(test_set))

assert leak_train_val == 0, "Speaker leakage between train and val!"
assert leak_train_test == 0, "Speaker leakage between train and test!"
assert leak_val_test == 0, "Speaker leakage between val and test!"

df.to_csv(SPLIT_MANIFEST_PATH, index=False)
print(f"Saved split manifest to {SPLIT_MANIFEST_PATH}")

split_summary = {
    "total_samples": len(df),
    "split_strategy": "Speaker-Independent Grouped Partition (Zero Speaker Leakage)",
    "splits": {
        "train": {
            "utterances": int((df["split"] == "train").sum()),
            "speakers": len(train_set),
            "total_duration_sec": round(float(df[df["split"] == "train"]["duration_seconds"].sum()), 2),
            "total_words": int(df[df["split"] == "train"]["word_count"].sum())
        },
        "val": {
            "utterances": int((df["split"] == "val").sum()),
            "speakers": len(val_set),
            "total_duration_sec": round(float(df[df["split"] == "val"]["duration_seconds"].sum()), 2),
            "total_words": int(df[df["split"] == "val"]["word_count"].sum())
        },
        "test": {
            "utterances": int((df["split"] == "test").sum()),
            "speakers": len(test_set),
            "total_duration_sec": round(float(df[df["split"] == "test"]["duration_seconds"].sum()), 2),
            "total_words": int(df[df["split"] == "test"]["word_count"].sum())
        }
    },
    "speaker_leakage_audit": {
        "train_val_overlap": leak_train_val,
        "train_test_overlap": leak_train_test,
        "val_test_overlap": leak_val_test,
        "verified_zero_leakage": True
    }
}

with open(os.path.join(OUTPUTS_DIR, "split_summary.json"), "w", encoding="utf-8") as f:
    json.dump(split_summary, f, indent=2)
with open(os.path.join(PROOFS_DIR, "split_summary.json"), "w", encoding="utf-8") as f:
    json.dump(split_summary, f, indent=2)

print("\nPartition Summary:")
for split, data in split_summary["splits"].items():
    print(f"  {split.upper()}: {data['utterances']} utterances ({data['speakers']} speakers, {round(data['total_duration_sec']/60, 2)} min)")
print(f"Zero Speaker Leakage Confirmed: {split_summary['speaker_leakage_audit']['verified_zero_leakage']}")
