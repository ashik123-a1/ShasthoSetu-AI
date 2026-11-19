import os
import sys
import json
import numpy as np
import pandas as pd
from scipy import stats
from sklearn.metrics import accuracy_score, balanced_accuracy_score, f1_score

BASE_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\03_Measles_Viral_Rash"
SEL_DIR = os.path.join(BASE_DIR, "model_selection_final")
CORR_DIR = os.path.join(SEL_DIR, "correction_v1")
os.makedirs(CORR_DIR, exist_ok=True)

CONFIG_PATH = os.path.join(BASE_DIR, "configs", "config.json")
with open(CONFIG_PATH, "r", encoding="utf-8") as f:
    config = json.load(f)

CLASSES = config["classes"]
CLASS_TO_IDX = {c: i for i, c in enumerate(CLASSES)}
IDX_TO_CLASS = {i: c for i, c in enumerate(CLASSES)}

df_res = pd.read_csv(os.path.join(SEL_DIR, "val_predictions_resnet18.csv"))
df_mob = pd.read_csv(os.path.join(SEL_DIR, "val_predictions_mobilenet_v3_small.csv"))

print("Loaded validation predictions: ResNet18 N=", len(df_res), "MobileNetV3 N=", len(df_mob))

# 1. Investigate MSL_41_01
print("\n" + "="*50)
print("CASE STUDY: MSL_41_01")
print("="*50)
r_msl = df_res[df_res["family_id"] == "MSL_41_01"]
m_msl = df_mob[df_mob["family_id"] == "MSL_41_01"]
print("Total crops in MSL_41_01:", len(r_msl))
print("ResNet18 crop votes:\n", r_msl["pred_class"].value_counts().to_dict())
print("MobileNetV3 crop votes:\n", m_msl["pred_class"].value_counts().to_dict())

# 2. Paired analysis on 113 families (default mode)
fam_r = pd.read_csv(os.path.join(SEL_DIR, "val_family_predictions_resnet18.csv"))
fam_m = pd.read_csv(os.path.join(SEL_DIR, "val_family_predictions_mobilenet_v3_small.csv"))

merged_fam = pd.merge(
    fam_r[["family_id", "true_class", "pred_class_majority", "is_correct"]],
    fam_m[["family_id", "pred_class_majority", "is_correct"]],
    on="family_id",
    suffixes=("_resnet18", "_mobilenet")
)

n11 = int(((merged_fam["is_correct_resnet18"] == True) & (merged_fam["is_correct_mobilenet"] == True)).sum())
n00 = int(((merged_fam["is_correct_resnet18"] == False) & (merged_fam["is_correct_mobilenet"] == False)).sum())
n10 = int(((merged_fam["is_correct_resnet18"] == True) & (merged_fam["is_correct_mobilenet"] == False)).sum())
n01 = int(((merged_fam["is_correct_resnet18"] == False) & (merged_fam["is_correct_mobilenet"] == True)).sum())

print("\n" + "="*50)
print("PAIRED CONTINGENCY TABLE (N=113 Families)")
print("="*50)
print(f"Both Models Correct  (n11): {n11}")
print(f"Both Models Incorrect(n00): {n00}")
print(f"ResNet18 Only Correct(n10): {n10}")
print(f"MobileNet Only Correct(n01): {n01}")
print(f"Total Families: {n11 + n00 + n10 + n01}")

# McNemar Exact Test
# Null hypothesis: n10 and n01 come from Binomial(n10+n01, 0.5)
total_discordant = n10 + n01
mcnemar_pval = stats.binomtest(min(n10, n01), total_discordant, 0.5).pvalue
print(f"Discordant pairs: {total_discordant} (ResNet18: {n10}, MobileNetV3: {n01})")
print(f"McNemar Exact Two-Tailed p-value: {mcnemar_pval:.4f}")

# Families where ResNet18 is uniquely correct
res_only_fams = merged_fam[(merged_fam["is_correct_resnet18"] == True) & (merged_fam["is_correct_mobilenet"] == False)]
print("\nResNet18 Uniquely Correct Families (N=6):")
for _, r in res_only_fams.iterrows():
    print(f"  {r['family_id']} (True: {r['true_class']}, ResNet18: {r['pred_class_majority_resnet18']}, MobileNet: {r['pred_class_majority_mobilenet']})")

# Families where MobileNetV3 is uniquely correct
mob_only_fams = merged_fam[(merged_fam["is_correct_resnet18"] == False) & (merged_fam["is_correct_mobilenet"] == True)]
print("\nMobileNetV3 Uniquely Correct Families (N=7):")
for _, r in mob_only_fams.iterrows():
    print(f"  {r['family_id']} (True: {r['true_class']}, ResNet18: {r['pred_class_majority_resnet18']}, MobileNet: {r['pred_class_majority_mobilenet']})")

# 3. Comprehensive Tie Audit
def evaluate_tie_policies(pred_df, model_name):
    tie_records = []
    
    # We will test 4 policies:
    # Policy 1: Alphabetical (default pandas mode sort)
    # Policy 2: Reverse Alphabetical
    # Policy 3: Priority Order (Measles > Monkeypox > Chickenpox > Cowpox > HFMD > Healthy)
    # Policy 4: Random / Flipped
    
    for fid, g in pred_df.groupby("family_id"):
        true_cls = g["true_class"].iloc[0]
        vc = g["pred_class"].value_counts()
        max_votes = vc.iloc[0]
        tied_classes = sorted(vc[vc == max_votes].index.tolist())
        
        is_tied = (len(tied_classes) > 1)
        if is_tied:
            # Policy 1: Alphabetical
            pol_alpha = sorted(tied_classes)[0]
            # Policy 2: Reverse Alphabetical
            pol_revalpha = sorted(tied_classes, reverse=True)[0]
            # Policy 3: Clinical Priority
            priority_order = ["Measles", "Monkeypox", "Chickenpox", "Cowpox", "HFMD", "Healthy"]
            pol_priority = min(tied_classes, key=lambda x: priority_order.index(x))
            
            tie_records.append({
                "model": model_name,
                "family_id": fid,
                "true_class": true_cls,
                "crop_count": len(g),
                "vote_distribution": str(vc.to_dict()),
                "tied_classes": ", ".join(tied_classes),
                "tie_count": len(tied_classes),
                "max_vote_count": max_votes,
                "policy_alphabetical_pred": pol_alpha,
                "policy_alphabetical_correct": (pol_alpha == true_cls),
                "policy_reverse_alpha_pred": pol_revalpha,
                "policy_reverse_alpha_correct": (pol_revalpha == true_cls),
                "policy_clinical_priority_pred": pol_priority,
                "policy_clinical_priority_correct": (pol_priority == true_cls)
            })
            
    return pd.DataFrame(tie_records)

tie_df_r = evaluate_tie_policies(df_res, "ResNet18")
tie_df_m = evaluate_tie_policies(df_mob, "MobileNetV3")
all_ties_df = pd.concat([tie_df_r, tie_df_m], ignore_index=True)
all_ties_csv = os.path.join(CORR_DIR, "MAJORITY_VOTE_TIE_AUDIT.csv")
all_ties_df.to_csv(all_ties_csv, index=False)
print(f"\nSaved tie audit CSV to: {all_ties_csv}")
print(all_ties_df.to_string())

# 4. Measure Metrics Under Alternative Tie Policies
def get_family_metrics_under_policy(pred_df, policy_type="alphabetical"):
    records = []
    priority_order = ["Measles", "Monkeypox", "Chickenpox", "Cowpox", "HFMD", "Healthy"]
    
    for fid, g in pred_df.groupby("family_id"):
        true_cls = g["true_class"].iloc[0]
        vc = g["pred_class"].value_counts()
        max_votes = vc.iloc[0]
        tied_classes = sorted(vc[vc == max_votes].index.tolist())
        
        if len(tied_classes) == 1:
            pred_cls = tied_classes[0]
        else:
            if policy_type == "alphabetical":
                pred_cls = sorted(tied_classes)[0]
            elif policy_type == "reverse_alphabetical":
                pred_cls = sorted(tied_classes, reverse=True)[0]
            elif policy_type == "clinical_priority":
                pred_cls = min(tied_classes, key=lambda x: priority_order.index(x))
            elif policy_type == "oracle_true_if_tied":
                pred_cls = true_cls if true_cls in tied_classes else sorted(tied_classes)[0]
                
        records.append({
            "family_id": fid,
            "true_class": true_cls,
            "pred_class": pred_cls,
            "is_correct": (true_cls == pred_cls)
        })
    fdf = pd.DataFrame(records)
    acc = accuracy_score(fdf["true_class"], fdf["pred_class"])
    bal_acc = balanced_accuracy_score(fdf["true_class"], fdf["pred_class"])
    f1_m = f1_score(fdf["true_class"], fdf["pred_class"], average="macro", zero_division=0)
    measles_fams = fdf[fdf["true_class"] == "Measles"]
    measles_rec = measles_fams["is_correct"].mean()
    measles_ratio = f"{measles_fams['is_correct'].sum()}/{len(measles_fams)}"
    return {
        "accuracy": round(acc * 100, 2),
        "balanced_accuracy": round(bal_acc * 100, 2),
        "macro_f1": round(f1_m * 100, 2),
        "correct_count": int(fdf["is_correct"].sum()),
        "measles_recall": round(measles_rec * 100, 2),
        "measles_ratio": measles_ratio
    }

print("\n" + "="*50)
print("FAMILY METRICS ACROSS TIE-BREAKING POLICIES")
print("="*50)
for pol in ["alphabetical", "reverse_alphabetical", "clinical_priority", "oracle_true_if_tied"]:
    res_m = get_family_metrics_under_policy(df_res, pol)
    mob_m = get_family_metrics_under_policy(df_mob, pol)
    print(f"Policy: {pol.upper()}")
    print(f"  ResNet18   : Acc={res_m['accuracy']}% ({res_m['correct_count']}/113), Macro F1={res_m['macro_f1']}%, Measles={res_m['measles_ratio']}")
    print(f"  MobileNetV3: Acc={mob_m['accuracy']}% ({mob_m['correct_count']}/113), Macro F1={mob_m['macro_f1']}%, Measles={mob_m['measles_ratio']}")
