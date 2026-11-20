import os, sys, hashlib, zipfile, time, subprocess, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
PROCESSED_DIR = ROOT / "data" / "processed"

RAW_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

URL = "https://data.mendeley.com/public-files/datasets/tg2hm7n2bs/files/e176fc83-a6d6-40c5-aaeb-9b3fe24d984a/file_downloaded"
EXPECTED_SHA256 = "d862f6f0af1948a442c12a789f46258f2367348f593afccd49de24e304f211df"
DEST_ZIP = RAW_DIR / "Prescription_Dataset(1000).zip"

def sha256sum(path, chunk=2**20):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk_data in iter(lambda: f.read(chunk), b""):
            h.update(chunk_data)
    return h.hexdigest()

print("=" * 70)
print("SHASTHOSETU AI: 04_Prescription_OCR Data Ingestion (Mendeley v2)")
print("=" * 70)

if DEST_ZIP.exists():
    actual_hash = sha256sum(DEST_ZIP)
    if actual_hash == EXPECTED_SHA256:
        print(f"✅ Found already verified archive: {DEST_ZIP.name}")
    else:
        print(f"⚠️ Corrupted archive detected ({actual_hash} != {EXPECTED_SHA256}). Re-downloading...")
        DEST_ZIP.unlink()

if not DEST_ZIP.exists():
    tmp = DEST_ZIP.with_suffix(".tmp")
    curl = shutil.which("curl.exe") or shutil.which("curl")
    print(f"⬇️ Downloading Prescription_Dataset(1000).zip via {curl}...")
    t0 = time.perf_counter()
    cmd = [curl, "-L", "-C", "-", "--retry", "5", "--retry-delay", "2", "-o", str(tmp), URL]
    res = subprocess.run(cmd)
    if res.returncode != 0:
        raise RuntimeError(f"Curl failed with return code {res.returncode}")
    
    actual_hash = sha256sum(tmp)
    if actual_hash != EXPECTED_SHA256:
        tmp.unlink(missing_ok=True)
        raise ValueError(f"SHA256 mismatch! Expected {EXPECTED_SHA256}, got {actual_hash}")
        
    tmp.replace(DEST_ZIP)
    elapsed = round(time.perf_counter() - t0, 2)
    sz_mb = round(DEST_ZIP.stat().st_size / (1024**2), 2)
    print(f"✅ Downloaded {sz_mb} MB in {elapsed}s | SHA-256 Verified: {actual_hash}")

print(f"\n📂 Extracting archive to {PROCESSED_DIR}...")
t_ext = time.perf_counter()
with zipfile.ZipFile(DEST_ZIP) as z:
    for m in z.infolist():
        p = Path(m.filename)
        if p.is_absolute() or ".." in p.parts:
            raise ValueError(f"Unsafe zip traversal: {p}")
    z.extractall(PROCESSED_DIR)

ext_sec = round(time.perf_counter() - t_ext, 2)
print(f"✅ Extraction completed in {ext_sec}s.")

# Inspect extracted contents
extracted_files = list(PROCESSED_DIR.rglob("*"))
images = [f for f in extracted_files if f.suffix.lower() in (".jpg", ".jpeg", ".png")]
csvs = [f for f in extracted_files if f.suffix.lower() == ".csv"]

print(f"\n[Extraction Summary]")
print(f"Total Extracted Items: {len(extracted_files)}")
print(f"Total Images: {len(images)}")
print(f"Total CSV Annotation Files: {len(csvs)}")
for c in csvs:
    print(f"  Annotation file: {c.relative_to(ROOT)} ({c.stat().st_size} bytes)")
