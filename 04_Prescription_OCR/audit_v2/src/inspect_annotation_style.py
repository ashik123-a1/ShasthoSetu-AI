import os
import pandas as pd

base_dir = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR"
raw_dir = os.path.join(base_dir, "data", "raw", "extracted")
csv_path = os.path.join(raw_dir, "Prescription_Dataset(1000)", "Prescriptions_Dataset.csv")

df = pd.read_csv(csv_path).dropna(subset=["image_filename"])

print("--- Inspecting Annotation Text Characteristics ---")
for idx in [0, 1, 10, 50, 100, 250, 500, 750]:
    r = df.iloc[idx]
    print(f"\nRow {idx} (File: {r['image_filename']}):")
    print(f"  English: {str(r['description_english'])}")
    print(f"  Bangla:  {str(r['description_bangla'])}")
