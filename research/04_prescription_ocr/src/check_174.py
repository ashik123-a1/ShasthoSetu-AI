import os
import pandas as pd

base = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR"
extract_dir = os.path.join(base, "data", "raw", "extracted")
csv_path = os.path.join(extract_dir, "Prescription_Dataset(1000)", "Prescriptions_Dataset.csv")

df = pd.read_csv(csv_path)
row_174 = df[df["image_filename"].str.contains("0174", na=False)]
print(row_174[["image_filename", "description_english", "description_bangla"]])
