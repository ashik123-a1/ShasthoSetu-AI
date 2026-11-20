import os
import sys
import subprocess
import shutil
import pandas as pd
import soundfile as sf
import numpy as np
import scipy.signal

BASE_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\05_Bangla_Voice_AI"
DEV_DIR = os.path.join(BASE_DIR, "data", "raw", "extracted", "dev")
DEV_TSV = os.path.join(BASE_DIR, "data", "raw", "dev.tsv")
TARGET_DIR = os.path.join(BASE_DIR, "data", "bilingual_test")
MANIFEST_PATH = os.path.join(TARGET_DIR, "bilingual_voice_manifest.csv")
SCRATCH_DIR = r"C:\Users\ASHIK_CSE\.gemini\antigravity\scratch"
PS_GEN_SCRIPT = os.path.join(SCRATCH_DIR, "generate_sapi_audio.ps1")

os.makedirs(TARGET_DIR, exist_ok=True)

print("Preparing Bilingual Voice AI Evaluation Cohorts...")

# 1. Cohort: Spoken Bengali (6 authentic FLEURS clips)
# Read dev.tsv
tsv_data = []
with open(DEV_TSV, "r", encoding="utf-8") as f:
    for line in f:
        parts = line.strip().split("\t")
        if len(parts) >= 4:
            tsv_data.append({"fname": parts[1], "raw_text": parts[2], "norm_text": parts[3]})

df_tsv = pd.DataFrame(tsv_data)
# Filter for existing files
df_tsv["exists"] = df_tsv["fname"].apply(lambda x: os.path.exists(os.path.join(DEV_DIR, x)))
df_avail = df_tsv[df_tsv["exists"]].reset_index(drop=True)
bn_samples = df_avail.head(6).copy()

manifest_rows = []

for idx, row in bn_samples.iterrows():
    src_path = os.path.join(DEV_DIR, row["fname"])
    dst_name = f"bn_sample_{idx+1:02d}.wav"
    dst_path = os.path.join(TARGET_DIR, dst_name)
    shutil.copy2(src_path, dst_path)
    
    # Audio metadata
    data, sr = sf.read(dst_path)
    duration = len(data) / sr
    
    manifest_rows.append({
        "sample_id": f"BN_{idx+1:02d}",
        "cohort": "Spoken Bengali",
        "audio_file": dst_name,
        "language_expected": "bn",
        "reference_text": row["norm_text"],
        "duration_seconds": round(duration, 2),
        "medical_terms": ""
    })
print(f"Copied {len(bn_samples)} Spoken Bengali samples.")

# 2. Cohort: Spoken English (Clinical Dictation)
en_phrases = [
    {
        "text": "Patient blood pressure is 120 over 80 and heart rate is 72 beats per minute.",
        "terms": "blood pressure, 120, 80, heart rate, 72"
    },
    {
        "text": "Prescribe Amoxicillin 500 milligrams capsules three times daily after meals for seven days.",
        "terms": "Amoxicillin, 500 milligrams, capsules"
    },
    {
        "text": "Patient presents with high fever productive cough and severe chest discomfort.",
        "terms": "fever, cough, chest discomfort"
    },
    {
        "text": "Urgent referral required transfer patient to intensive care unit immediately.",
        "terms": "referral, intensive care unit, ICU"
    },
    {
        "text": "Order fasting blood sugar serum creatinine lipid profile and 12-lead electrocardiogram.",
        "terms": "fasting blood sugar, creatinine, electrocardiogram, ECG"
    },
    {
        "text": "Pediatric patient has maculopapular rash on face and trunk suspected measles infection.",
        "terms": "maculopapular rash, measles infection"
    }
]

def synthesize_wav(text, out_path):
    temp_wav = os.path.join(SCRATCH_DIR, "temp_synth.wav")
    cmd = [
        "powershell", "-ExecutionPolicy", "Bypass", "-File", PS_GEN_SCRIPT,
        "-Text", text,
        "-OutputFile", temp_wav
    ]
    subprocess.run(cmd, capture_output=True, text=True, check=True)
    data, sr = sf.read(temp_wav)
    if data.ndim > 1:
        data = data.mean(axis=1)
    if sr != 16000:
        target_samples = int(len(data) * 16000 / sr)
        data = scipy.signal.resample(data, target_samples)
        sr = 16000
    data = data.astype(np.float32)
    sf.write(out_path, data, 16000, subtype="PCM_16")
    return len(data) / 16000

for idx, item in enumerate(en_phrases):
    dst_name = f"en_clinical_{idx+1:02d}.wav"
    dst_path = os.path.join(TARGET_DIR, dst_name)
    dur = synthesize_wav(item["text"], dst_path)
    manifest_rows.append({
        "sample_id": f"EN_{idx+1:02d}",
        "cohort": "Spoken English Clinical",
        "audio_file": dst_name,
        "language_expected": "en",
        "reference_text": item["text"],
        "duration_seconds": round(dur, 2),
        "medical_terms": item["terms"]
    })
print(f"Synthesized {len(en_phrases)} Spoken English clinical samples.")

# 3. Cohort: Mixed Bangla-English (Code-Switching)
mix_phrases = [
    {
        "text": "Patient er blood pressure 130 over 80 and temperature 101 degrees Fahrenheit.",
        "terms": "blood pressure, 130, 80, temperature, 101"
    },
    {
        "text": "Cap Moxacil 500 milligram dine tin bar after meal 7 din continue korben.",
        "terms": "Moxacil, 500 milligram, after meal"
    },
    {
        "text": "Patient complaining of acute chest pain emergency ward e admit korte hobe.",
        "terms": "acute chest pain, emergency ward"
    },
    {
        "text": "Fasting blood sugar ebong ECG report shathe niye next week e follow up ashben.",
        "terms": "Fasting blood sugar, ECG report, follow up"
    },
    {
        "text": "Tab Napa Extra 500 milligram SOS basis e fever ashle khaben.",
        "terms": "Napa Extra, 500 milligram, SOS basis, fever"
    },
    {
        "text": "Pediatric patient er viral exanthem rash dekha geche Koplik spots check koren.",
        "terms": "viral exanthem rash, Koplik spots"
    }
]

for idx, item in enumerate(mix_phrases):
    dst_name = f"mix_codeswitch_{idx+1:02d}.wav"
    dst_path = os.path.join(TARGET_DIR, dst_name)
    dur = synthesize_wav(item["text"], dst_path)
    manifest_rows.append({
        "sample_id": f"MIX_{idx+1:02d}",
        "cohort": "Mixed Bangla-English Code-Switching",
        "audio_file": dst_name,
        "language_expected": "mixed",
        "reference_text": item["text"],
        "duration_seconds": round(dur, 2),
        "medical_terms": item["terms"]
    })
print(f"Synthesized {len(mix_phrases)} Mixed Code-Switching samples.")

df_out = pd.DataFrame(manifest_rows)
df_out.to_csv(MANIFEST_PATH, index=False, encoding="utf-8")
print(f"\nSaved manifest with {len(df_out)} samples to: {MANIFEST_PATH}")
