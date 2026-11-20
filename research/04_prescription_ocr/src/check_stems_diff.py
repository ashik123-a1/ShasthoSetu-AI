import os
import pandas as pd

base = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR"
extract_dir = os.path.join(base, "data", "raw", "extracted")
csv_path = os.path.join(extract_dir, "Prescription_Dataset(1000)", "Prescriptions_Dataset.csv")
images_dir = os.path.join(extract_dir, "images", "Prescription_ images.jpg")

df = pd.read_csv(csv_path)
clean = df.dropna(subset=["image_filename"]).copy()
clean["clean_stem"] = clean["image_filename"].astype(str).str.replace(",", ".").apply(lambda x: os.path.splitext(x)[0].strip())

disk_stems = set(os.path.splitext(f)[0] for f in os.listdir(images_dir))
csv_stems = set(clean["clean_stem"])

print(f"Total disk stems: {len(disk_stems)}")
print(f"Total unique CSV stems: {len(csv_stems)}")
print(f"Disk stems not in CSV: {disk_stems - csv_stems}")
print(f"CSV stems not in disk: {csv_stems - disk_stems}")

# Check 0185 and 0676 images on disk
for stem in ["0185", "0676", "0063", "0856"]:
    f = [x for x in os.listdir(images_dir) if os.path.splitext(x)[0] == stem]
    print(f"Stem {stem} file on disk: {f}")
