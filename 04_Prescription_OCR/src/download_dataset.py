import os
import sys
import time
import hashlib
import urllib.request

DOWNLOAD_URL = "https://data.mendeley.com/public-files/datasets/tg2hm7n2bs/files/e176fc83-a6d6-40c5-aaeb-9b3fe24d984a/file_downloaded"
EXPECTED_SHA256 = "d862f6f0af1948a442c12a789f46258f2367348f593afccd49de24e304f211df"
EXPECTED_SIZE = 57488881

TARGET_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR\data\raw"
TARGET_FILE = os.path.join(TARGET_DIR, "Prescription_Dataset_1000.zip")

os.makedirs(TARGET_DIR, exist_ok=True)

if os.path.exists(TARGET_FILE) and os.path.getsize(TARGET_FILE) == EXPECTED_SIZE:
    print(f"File already exists ({EXPECTED_SIZE} bytes). Verifying SHA-256...")
    hasher = hashlib.sha256()
    with open(TARGET_FILE, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    if hasher.hexdigest() == EXPECTED_SHA256:
        print("SHA-256 verified successfully!")
        sys.exit(0)
    else:
        print("Hash mismatch! Redownloading...")

print(f"Downloading {DOWNLOAD_URL} to {TARGET_FILE}...")
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
