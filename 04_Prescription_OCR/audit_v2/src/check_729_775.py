import pandas as pd
df = pd.read_csv(r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR\audit_v2\corrected_annotation_manifest.csv")
print(df[df["prescription_id"].isin([729, 775, "0729", "0775"])][["prescription_id", "split", "quarantine_status"]])
