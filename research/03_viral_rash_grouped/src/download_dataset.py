import os
import sys
import time
import hashlib
import urllib.request

DOWNLOAD_URL = "https://data.mendeley.com/public-files/datasets/dfztdtfsxz/files/bceb2bee-8811-40bd-b7a6-ada174ea97c1/file_downloaded"
EXPECTED_SHA256 = "ef594772ee91281158c5a1685a0b0d900163913f4716aeb4465e256c287c104c"
EXPECTED_SIZE = 167736585

TARGET_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\03_Measles_Viral_Rash\data\raw"
TARGET_FILE = os.path.join(TARGET_DIR, "Skin_Lesion_Dataset.zip")

os.makedirs(TARGET_DIR, exist_ok=True)

if os.path.exists(TARGET_FILE) and os.path.getsize(TARGET_FILE) == EXPECTED_SIZE:
    print(f"File already exists with expected size: {EXPECTED_SIZE} bytes. Verifying hash...")
    hasher = hashlib.sha256()
    with open(TARGET_FILE, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    if hasher.hexdigest() == EXPECTED_SHA256:
        print("SHA-256 verified successfully!")
        sys.exit(0)
    else:
        print("Hash mismatch! Redownloading...")

print(f"Downloading from {DOWNLOAD_URL} to {TARGET_FILE}...")
start_time = time.time()

req = urllib.request.Request(DOWNLOAD_URL, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req) as resp, open(TARGET_FILE, "wb") as out_file:
    hasher = hashlib.sha256()
    downloaded = 0
    last_print = 0
    while True:
        chunk = resp.read(65536)
        if not chunk:
            break
        downloaded += len(chunk)
        hasher.update(chunk)
        out_file.write(chunk)
        
        now = time.time()
        if now - last_print > 3:
            mb = downloaded / (1024 * 1024)
            pct = (downloaded / EXPECTED_SIZE) * 100
            print(f"  Downloaded: {mb:.2f} MB ({pct:.1f}%) in {now - start_time:.1f}s")
            last_print = now

elapsed = time.time() - start_time
calculated_hash = hasher.hexdigest()
print(f"Download complete: {downloaded} bytes in {elapsed:.2f} seconds ({downloaded / (1024 * 1024 * max(0.1, elapsed)):.2f} MB/s).")
print(f"Calculated SHA-256: {calculated_hash}")
print(f"Expected SHA-256:   {EXPECTED_SHA256}")

if calculated_hash != EXPECTED_SHA256:
    print("ERROR: SHA-256 hash mismatch!")
    sys.exit(1)

print("SUCCESS: File integrity verified!")
