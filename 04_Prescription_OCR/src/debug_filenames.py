import os
import pandas as pd

base = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR"
extract_dir = os.path.join(base, "data", "raw", "extracted")
csv_path = os.path.join(extract_dir, "Prescription_Dataset(1000)", "Prescriptions_Dataset.csv")
images_dir = os.path.join(extract_dir, "images", "Prescription_ images.jpg")

df = pd.read_csv(csv_path)
non_null_fnames = df["image_filename"].dropna().tolist()
print(f"Total non-null in CSV: {len(non_null_fnames)}")
print("First 20 in CSV:", non_null_fnames[:20])
print("Sample middle in CSV:", non_null_fnames[350:370])
print("Last 20 in CSV:", non_null_fnames[-20:])

disk_files = sorted(os.listdir(images_dir))
print(f"\nTotal files in disk: {len(disk_files)}")
print("First 20 on disk:", disk_files[:20])
print("Sample middle on disk:", disk_files[350:370])
print("Last 20 on disk:", disk_files[-20:])

# Let's see what's in df beyond row 357
print("\nRows around 357:")
print(df.iloc[355:362][["image_filename", "description_english"]])
