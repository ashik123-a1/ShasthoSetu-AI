import os
import json
import pandas as pd

base_dir = r"F:\Clude cccccccccccccccccccccccc\data we test\04_Prescription_OCR"
orig_pred_path = os.path.join(base_dir, "outputs", "test_predictions.csv")
orig_metrics_path = os.path.join(base_dir, "outputs", "metrics.json")
audit_dir = os.path.join(base_dir, "audit_v2")

df = pd.read_csv(orig_pred_path)
print(f"Loaded original test predictions: {len(df)} rows")

# Store original values
df["original_safety_status"] = df["safety_status"]
df["original_auto_reminder_permitted"] = df["auto_reminder_permitted"]

# Apply Phase 1 Safety Mandate:
# 1. Disable automatic medication reminder approval for 100% of OCR outputs.
# 2. Set reminder_auto_enabled = False by default.
# 3. Set verification_status = UNVERIFIED_REQUIRES_HUMAN_REVIEW.
# 4. Actionable schedule generated = False.
df["verification_status"] = "UNVERIFIED_REQUIRES_HUMAN_REVIEW"
df["reminder_auto_enabled"] = False
df["actionable_schedule_generated"] = False
df["safety_policy_notes"] = df["original_auto_reminder_permitted"].apply(
    lambda x: "Revised from provisional automated pass to mandatory human review pending clinical sign-off" 
    if x else "Flagged for human review due to low OCR confidence or unresolved medication entities"
)

# Audited counts
total = len(df)
auto_permitted_count = int(df["reminder_auto_enabled"].sum())
human_review_count = int((df["verification_status"] == "UNVERIFIED_REQUIRES_HUMAN_REVIEW").sum())

print(f"\n--- Phase 1 Safety Gate Audit Summary ---")
print(f"Total Prescriptions Evaluated: {total}")
print(f"Original Provisionally Permitted: {int(df['original_auto_reminder_permitted'].sum())} (7.89%)")
print(f"Audited Automated Reminders Approved: {auto_permitted_count} (0.00%)")
print(f"Mandatory Human Clinical Review Required: {human_review_count} (100.00%)")

# Save audited CSV
audited_csv_path = os.path.join(audit_dir, "test_predictions_safety_audited.csv")
df.to_csv(audited_csv_path, index=False)
print(f"Saved audited predictions to: {audited_csv_path}")

# Create Safety Gate Audit JSON
safety_metrics = {
    "module": "04_Prescription_OCR",
    "audit_version": "v2",
    "policy": "ZERO_UNVERIFIED_AUTOMATION_MANDATE",
    "evaluation_set_size": total,
    "provisional_baseline_status": {
        "reported_approved_count": int(df["original_auto_reminder_permitted"].sum()),
        "reported_approved_pct": round(float(df["original_auto_reminder_permitted"].mean() * 100), 2),
        "reported_human_review_count": int((~df["original_auto_reminder_permitted"]).sum()),
        "reported_human_review_pct": round(float((~df["original_auto_reminder_permitted"]).mean() * 100), 2)
    },
    "audited_safety_status": {
        "automated_reminder_approved_count": 0,
        "automated_reminder_approved_pct": 0.0,
        "mandatory_human_review_count": total,
        "mandatory_human_review_pct": 100.0,
        "actionable_dosage_schedules_generated": 0
    },
    "clinical_justification": [
        "OCR confidence (CTC sequence probability) does NOT establish pharmacological correctness.",
        "A prescription with high average confidence on printed header text may still misread cursive medication names or dosages.",
        "A 92.11% review routing rate does NOT mean 92.11% had confirmed lethal dosing errors; it means 92.11% did not meet autonomous certainty thresholds.",
        "Under medical safety standards (IEC 62304 / FDA SaMD / WHO AI Health Guidelines), zero autonomous medication schedules may be enacted without clinical human-in-the-loop sign-off."
    ]
}

safety_json_path = os.path.join(audit_dir, "safety_gate_audit.json")
with open(safety_json_path, "w", encoding="utf-8") as f:
    json.dump(safety_metrics, f, indent=2)
print(f"Saved safety gate audit metrics to: {safety_json_path}")
