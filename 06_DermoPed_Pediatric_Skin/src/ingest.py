import os
import sys
import json
import time
import hashlib
import zipfile
import shutil
import subprocess
from pathlib import Path
import requests

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(line_buffering=True)

MODULE_ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = MODULE_ROOT / "configs" / "config.json"
RAW_DIR = MODULE_ROOT / "data" / "raw"
PROCESSED_DIR = MODULE_ROOT / "data" / "processed"

for d in [RAW_DIR, PROCESSED_DIR]:
    d.mkdir(parents=True, exist_ok=True)

CATALOG = {
    'chickenpox': ('chickenpox.zip', '6f4de33ee140aab91ea626eb860a2544', 1),
    'pediculosis': ('pediculosis.zip', '811b59d0589b16f6cd7bb146f14e9d51', 1),
    'morbilliform_exanthema': ('morbilliform_exanthema.zip', 'c134746745c531112229db69c0750093', 2),
    'polymorphous_exanthema': ('polymorphous_exanthema.zip', '0e0a79981294a538cedc92943e45bf88', 2),
    'maculopapular_exanthema': ('maculopapular_exanthema.zip', 'fbc0d3adae7f9b4c6878cae8515aeebf', 3),
    'iatrogenic_drug_induced_exanthema': ('iatrogenic_drug_induced_exanthema.zip', '4be24b1dd1dee6c930321ed8038531a7', 3),
    'scabies': ('scabies.zip', '2b75d20fc0886746855b9890185c7525', 4),
    'viral_exanthema': ('viral_exanthema.zip', '7dbce24d6c4f11a9f4ad21eb45656ad1', 4),
    'urticaria': ('urticaria.zip', 'af4bcdc63e55da0faf64d0aa17954a81', 4)
}

def md5sum(path, chunk=2**20):
    h = hashlib.md5()
    with open(path, 'rb') as f:
        for data in iter(lambda: f.read(chunk), b''):
            h.update(data)
    return h.hexdigest()

def download_archive(filename, expected_md5):
    dest = RAW_DIR / filename
    if dest.exists() and md5sum(dest) == expected_md5:
        print(f"✅ Found verified archive: {filename}")
        return dest

    if dest.exists():
        dest.unlink()

    url = f"https://zenodo.org/records/20829589/files/{filename}?download=1"
    tmp = dest.with_suffix(".download")
    print(f"⬇️ Downloading {filename} from Zenodo...")
    t0 = time.perf_counter()

    curl_bin = shutil.which("curl.exe") or shutil.which("curl")
    if curl_bin:
        print(f"⚡ Using curl for resilient resumable download: {curl_bin}")
        cmd = [curl_bin, "-L", "-C", "-", "--retry", "5", "--retry-delay", "3", "--progress-bar", "-o", str(tmp), url]
        res = subprocess.run(cmd)
        if res.returncode == 0 and tmp.exists():
            actual_md5 = md5sum(tmp)
            if actual_md5 == expected_md5:
                tmp.replace(dest)
                elapsed = round(time.perf_counter() - t0, 2)
                size_mb = round(dest.stat().st_size / (1024**2), 2)
                print(f"✅ {filename} ({size_mb} MB) downloaded via curl in {elapsed}s | MD5 Verified.")
                return dest
            else:
                print(f"⚠️ MD5 mismatch after curl: {actual_md5} != {expected_md5}. Retrying...")
                tmp.unlink(missing_ok=True)

    retries = 3
    for attempt in range(1, retries + 1):
        try:
            with requests.get(url, stream=True, timeout=(30, 300), headers={'User-Agent': 'ShasthoSetu-Local/1.0'}) as r:
                r.raise_for_status()
                with open(tmp, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=2**20):
                        if chunk:
                            f.write(chunk)

            actual_md5 = md5sum(tmp)
            if actual_md5 != expected_md5:
                raise ValueError(f"MD5 mismatch: expected {expected_md5}, got {actual_md5}")

            tmp.replace(dest)
            elapsed = round(time.perf_counter() - t0, 2)
            size_mb = round(dest.stat().st_size / (1024**2), 2)
            print(f"✅ {filename} ({size_mb} MB) downloaded in {elapsed}s | MD5 Verified.")
            return dest
        except Exception as e:
            print(f"⚠️ Attempt {attempt}/{retries} failed for {filename}: {e}")
            if tmp.exists():
                tmp.unlink()
            if attempt == retries:
                raise
            time.sleep(3 * attempt)

def extract_safe(archive_path):
    with zipfile.ZipFile(archive_path) as z:
        for m in z.infolist():
            p = Path(m.filename)
            if p.is_absolute() or '..' in p.parts:
                raise ValueError(f"Unsafe path inside ZIP: {p}")
        z.extractall(PROCESSED_DIR)

def main():
    print("=" * 70)
    print("SHASTHOSETU AI: 06_DermoPed_Pediatric_Skin Data Ingestion")
    print("=" * 70)
    
    with open(CONFIG_PATH, "r") as f:
        cfg = json.load(f)
    
    tier = cfg["dataset"]["tier"]
    selected_classes = [c for c, (_, _, t) in CATALOG.items() if t <= tier]
    print(f"Active Tier: {tier} -> Classes: {selected_classes}")

    for cls in selected_classes:
        fn, expected_md5, _ = CATALOG[cls]
        arch = download_archive(fn, expected_md5)
        print(f"📂 Extracting {fn} to {PROCESSED_DIR}...")
        extract_safe(arch)
        
    print("✅ Ingestion & extraction complete.")

if __name__ == "__main__":
    main()
