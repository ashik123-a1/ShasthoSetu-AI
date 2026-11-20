import os
import easyocr
import pandas as pd

base = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR"
extract_dir = os.path.join(base, "data", "raw", "extracted")
csv_path = os.path.join(extract_dir, "Prescription_Dataset(1000)", "Prescriptions_Dataset.csv")
images_dir = os.path.join(extract_dir, "images", "Prescription_ images.jpg")

reader = easyocr.Reader(['en'], gpu=True)

test_stems = ["0185", "0186", "0674", "0675", "0676", "0746", "0747", "0748"]
disk_files = {os.path.splitext(f)[0]: f for f in os.listdir(images_dir)}

for stem in test_stems:
    fname = disk_files.get(stem)
    if fname:
        fpath = os.path.join(images_dir, fname)
        res = reader.readtext(fpath, detail=0)
        print(f"\n--- OCR for {fname} (stem {stem}) ---")
        print("Detected text:", " | ".join(res[:10]))
