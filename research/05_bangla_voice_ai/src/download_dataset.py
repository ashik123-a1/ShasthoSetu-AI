import os
import sys
import time
import urllib.request
import tarfile

BASE_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\05_Bangla_Voice_AI"
RAW_DIR = os.path.join(BASE_DIR, "data", "raw")
EXTRACT_DIR = os.path.join(BASE_DIR, "data", "raw", "extracted")

os.makedirs(RAW_DIR, exist_ok=True)
os.makedirs(EXTRACT_DIR, exist_ok=True)

TSV_URL = "https://huggingface.co/datasets/google/fleurs/raw/main/data/bn_in/dev.tsv"
TAR_URL = "https://huggingface.co/datasets/google/fleurs/resolve/main/data/bn_in/audio/dev.tar.gz"

tsv_path = os.path.join(RAW_DIR, "dev.tsv")
tar_path = os.path.join(RAW_DIR, "dev.tar.gz")

print("Step 1: Downloading dev.tsv annotations...")
t0 = time.time()
req = urllib.request.Request(TSV_URL, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req) as resp, open(tsv_path, "wb") as out:
    out.write(resp.read())
print(f"dev.tsv downloaded in {time.time() - t0:.2f}s ({os.path.getsize(tsv_path)} bytes).")

print(f"\nStep 2: Downloading audio archive from {TAR_URL}...")
t1 = time.time()
req_tar = urllib.request.Request(TAR_URL, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req_tar) as resp, open(tar_path, "wb") as out:
    downloaded = 0
    last_print = 0
    total_size = int(resp.headers.get("Content-Length", 278667500))
    while True:
        chunk = resp.read(65536)
        if not chunk:
            break
        downloaded += len(chunk)
        out.write(chunk)
        now = time.time()
        if now - last_print > 3:
            mb = downloaded / (1024 * 1024)
            pct = (downloaded / total_size) * 100
            print(f"  Downloaded: {mb:.2f} MB ({pct:.1f}%) in {now - t1:.1f}s")
            last_print = now

print(f"Audio download complete in {time.time() - t1:.2f}s ({os.path.getsize(tar_path)} bytes).")

print(f"\nStep 3: Extracting {tar_path} to {EXTRACT_DIR}...")
t2 = time.time()
with tarfile.open(tar_path, "r:gz") as tar:
    tar.extractall(EXTRACT_DIR)
print(f"Extraction complete in {time.time() - t2:.2f}s.")

audio_files = [f for f in os.listdir(EXTRACT_DIR) if f.endswith(".wav")]
print(f"Total audio .wav files extracted: {len(audio_files)}")
