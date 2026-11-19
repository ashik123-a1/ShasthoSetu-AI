import os
import pandas as pd

base = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR"
extract_dir = os.path.join(base, "data", "raw", "extracted")
csv_path = os.path.join(extract_dir, "Prescription_Dataset(1000)", "Prescriptions_Dataset.csv")

df = pd.read_csv(csv_path)
clean = df.dropna(subset=["image_filename"])
print(f"Total rows in CSV: {len(df)}")
print(f"Non-null image_filename: {len(clean)}")

# Check duplicate filenames or stems
clean["clean_stem"] = clean["image_filename"].astype(str).str.replace(",", ".").apply(lambda x: os.path.splitext(x)[0].strip())
print("Value counts of clean_stem top 5:")
print(clean["clean_stem"].value_counts().head(10))
print("Any duplicated stems:")
dups = clean[clean["clean_stem"].duplicated(keep=False)]
print(dups[["image_filename", "description_english"]])
