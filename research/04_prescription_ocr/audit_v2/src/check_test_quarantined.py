import pandas as pd
df = pd.read_csv(r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR\audit_v2\corrected_annotation_manifest.csv")
test_quarantined = df[(df["split"] == "test") & (~df["evaluation_admissible"])]
print("Quarantined in test split:")
print(test_quarantined[["prescription_id", "filename", "quarantine_status", "audit_notes"]])
