import os
import time
import torch
import easyocr
from PIL import Image

base = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR"
extract_dir = os.path.join(base, "data", "raw", "extracted")
images_dir = os.path.join(extract_dir, "images", "Prescription_ images.jpg")

sample_img = os.path.join(images_dir, "0001.jpg")
print(f"Testing OCR on: {sample_img}")

reader = easyocr.Reader(['en', 'bn'], gpu=True)

t0 = time.time()
results = reader.readtext(sample_img)
t1 = time.time()

print(f"OCR finished in {t1 - t0:.2f} seconds.")
print(f"Detected {len(results)} text boxes.")
for i, (bbox, text, conf) in enumerate(results[:15]):
    print(f"[{i+1}] conf={conf:.2f}: {text}")
