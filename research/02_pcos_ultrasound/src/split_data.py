import os
import json
import pandas as pd
from sklearn.model_selection import train_test_split

BASE_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\02_PCOS_Ultrasound"
MANIFEST_PATH = os.path.join(BASE_DIR, "data", "processed", "dataset_manifest.csv")
CONFIG_PATH = os.path.join(BASE_DIR, "configs", "config.json")
SPLIT_MANIFEST = os.path.join(BASE_DIR, "data", "processed", "split_manifest.csv")
SPLIT_SUMMARY = os.path.join(BASE_DIR, "outputs", "split_summary.csv")

def create_splits():
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        config = json.load(f)
        
    random_seed = config.get("random_seed", 42)
    
    df = pd.read_csv(MANIFEST_PATH)
    total_raw = len(df)
    
    # 1. Deduplicate
    df_clean = df[df["is_duplicate"] == False].copy().reset_index(drop=True)
    dedup_count = total_raw - len(df_clean)
    print(f"Total raw images: {total_raw}, Deduplicated: {dedup_count}, Clean unique images: {len(df_clean)}")
    
    # 2. Stratified Train / Val / Test Split
    # First split off 15% test
    train_val_df, test_df = train_test_split(
        df_clean, test_size=0.15, random_state=random_seed, stratify=df_clean["class_label"]
    )
    # Next split train_val (0.85 of total) into train and val (0.15 of total is ~0.1765 of train_val)
    val_ratio_relative = 0.15 / (0.70 + 0.15)
    train_df, val_df = train_test_split(
        train_val_df, test_size=val_ratio_relative, random_state=random_seed, stratify=train_val_df["class_label"]
    )
    
    train_df = train_df.copy()
    train_df["split"] = "train"
    val_df = val_df.copy()
    val_df["split"] = "val"
    test_df = test_df.copy()
    test_df["split"] = "test"
    
    merged = pd.concat([train_df, val_df, test_df], ignore_index=True)
    merged.to_csv(SPLIT_MANIFEST, index=False)
    
    summary_rows = []
    classes = ["Dominant_Follicle", "Normal", "PCO"]
    for s_name, s_df in [("Train", train_df), ("Val", val_df), ("Test (Held-Out)", test_df), ("Total Unique", merged)]:
        row = {"split": s_name, "total": len(s_df)}
        for c in classes:
            row[c] = int((s_df["class_label"] == c).sum())
        summary_rows.append(row)
        
    sum_df = pd.DataFrame(summary_rows)
    sum_df.to_csv(SPLIT_SUMMARY, index=False)
    
    print("\n--- Split Summary ---")
    print(sum_df.to_string(index=False))
    print(f"\nSaved split manifest to: {SPLIT_MANIFEST}")
    print(f"Saved split summary to: {SPLIT_SUMMARY}")

if __name__ == "__main__":
    create_splits()
