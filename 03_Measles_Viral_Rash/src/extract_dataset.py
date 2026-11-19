import os
import zipfile
import time

zip_path = r"F:\Clude cccccccccccccccccccccccc\data we test\03_Measles_Viral_Rash\data\raw\Skin_Lesion_Dataset.zip"
extract_dir = r"F:\Clude cccccccccccccccccccccccc\data we test\03_Measles_Viral_Rash\data\raw\extracted"

os.makedirs(extract_dir, exist_ok=True)
print(f"Extracting {zip_path} to {extract_dir}...")

start_time = time.time()
with zipfile.ZipFile(zip_path, "r") as zf:
    members = zf.infolist()
    total = len(members)
    last_print = 0
    for idx, member in enumerate(members, 1):
        zf.extract(member, extract_dir)
        now = time.time()
        if now - last_print > 3 or idx == total:
            pct = (idx / total) * 100
            print(f"  Extracted {idx}/{total} ({pct:.1f}%) in {now - start_time:.1f}s")
            last_print = now

elapsed = time.time() - start_time
print(f"Extraction completed in {elapsed:.2f} seconds!")
