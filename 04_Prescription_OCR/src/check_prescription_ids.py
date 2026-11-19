import pandas as pd
manifest = pd.read_csv(r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR\data\processed\split_manifest.csv")
print("Total rows:", len(manifest))
print("Unique prescription_id:", manifest["prescription_id"].nunique())
print("Value counts > 1:", manifest["prescription_id"].value_counts()[manifest["prescription_id"].value_counts() > 1])
