import os
import zipfile
import time

BASE_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR"
RAW_ZIP = os.path.join(BASE_DIR, "data", "raw", "Prescription_Dataset_1000.zip")
EXTRACT_DIR = os.path.join(BASE_DIR, "data", "raw", "extracted")

os.makedirs(EXTRACT_DIR, exist_ok=True)
print(f"Extracting outer zip {RAW_ZIP} to {EXTRACT_DIR}...")
t0 = time.time()
with zipfile.ZipFile(RAW_ZIP, "r") as zf:
    zf.extractall(EXTRACT_DIR)

print(f"Outer extraction complete in {time.time() - t0:.2f}s.")

# Look for inner zip
inner_zip = os.path.join(EXTRACT_DIR, "Prescription_Dataset(1000)", "Prescription_ images.jpg.zip")
images_dir = os.path.join(EXTRACT_DIR, "images")
os.makedirs(images_dir, exist_ok=True)

if os.path.exists(inner_zip):
    print(f"Extracting inner zip {inner_zip} to {images_dir}...")
    t1 = time.time()
    with zipfile.ZipFile(inner_zip, "r") as zf:
        members = zf.infolist()
        total = len(members)
        for idx, m in enumerate(members, 1):
            zf.extract(m, images_dir)
            if idx % 200 == 0 or idx == total:
                print(f"  Extracted {idx}/{total} images ({idx/total*100:.1f}%)")
    print(f"Inner extraction complete in {time.time() - t1:.2f}s.")

print("All extractions completed successfully!")
