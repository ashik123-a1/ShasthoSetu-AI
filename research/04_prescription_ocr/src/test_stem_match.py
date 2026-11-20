import os
import pandas as pd

base = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR"
extract_dir = os.path.join(base, "data", "raw", "extracted")
csv_path = os.path.join(extract_dir, "Prescription_Dataset(1000)", "Prescriptions_Dataset.csv")
images_dir = os.path.join(extract_dir, "images", "Prescription_ images.jpg")

df = pd.read_csv(csv_path)
disk_files = os.listdir(images_dir)

# Build map from stem to actual disk file
stem_to_disk = {}
for f in disk_files:
    stem, ext = os.path.splitext(f)
    stem_to_disk[stem] = f

print(f"Total files on disk: {len(disk_files)}")
print(f"Total unique stems on disk: {len(stem_to_disk)}")

clean_df = df.dropna(subset=["image_filename"]).copy()
matched = 0
missing = []
for fname in clean_df["image_filename"]:
    stem, ext = os.path.splitext(str(fname).strip())
    # Also try zero-padding if needed
    if stem in stem_to_disk:
        matched += 1
    else:
        # try int conversion and 4-digit formatting
        try:
            val = int(stem)
            stem_padded = f"{val:04d}"
            if stem_padded in stem_to_disk:
                matched += 1
            else:
                missing.append(fname)
        except:
            missing.append(fname)

print(f"Matched with stem mapping: {matched} / {len(clean_df)}")
print(f"Missing: {missing}")
