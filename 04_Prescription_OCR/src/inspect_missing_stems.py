import os
import pandas as pd

base = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR"
extract_dir = os.path.join(base, "data", "raw", "extracted")
csv_path = os.path.join(extract_dir, "Prescription_Dataset(1000)", "Prescriptions_Dataset.csv")

df = pd.read_csv(csv_path)
clean = df.dropna(subset=["image_filename"]).copy()

# Look at rows around 184-188, 673-678, 745-750
print("--- Around 185 ---")
print(clean.iloc[182:189][["image_filename", "description_english"]])

print("\n--- Around 674 ---")
print(clean.iloc[672:678][["image_filename", "description_english"]])

print("\n--- Around 747 ---")
print(clean.iloc[744:750][["image_filename", "description_english"]])
