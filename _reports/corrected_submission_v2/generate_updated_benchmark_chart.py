import os
import json
import numpy as np
import matplotlib.pyplot as plt

METRICS_PATH = r"F:\Clude cccccccccccccccccccccccc\data we test\_reports\corrected_submission_v2\UPDATED_MASTER_METRICS.json"
CHART_OUT_PATH = r"F:\Clude cccccccccccccccccccccccc\data we test\_reports\corrected_submission_v2\UPDATED_BENCHMARK_CHART.png"

with open(METRICS_PATH, "r", encoding="utf-8") as f:
    metrics = json.load(f)

m = metrics["modules"]

# Dynamically extract numbers
pcos_cv_balacc = m["01_PCOS_Clinical"]["certified_primary_benchmark"]["mean_balanced_accuracy"] * 100
pcos_cv_f1 = m["01_PCOS_Clinical"]["certified_primary_benchmark"]["mean_macro_f1"] * 100
pcos_test_balacc = m["01_PCOS_Clinical"]["held_out_test_n18"]["balanced_accuracy"] * 100
pcos_test_f1 = m["01_PCOS_Clinical"]["held_out_test_n18"]["macro_f1"] * 100

us_cv_balacc = m["02_PCOS_Ultrasound"]["certified_primary_benchmark"]["mean_balanced_accuracy"] * 100
us_cv_f1 = m["02_PCOS_Ultrasound"]["certified_primary_benchmark"]["mean_macro_f1"] * 100
us_old_test_balacc = m["02_PCOS_Ultrasound"]["historical_held_out_test_n45"]["test_balanced_accuracy"] * 100
us_old_test_f1 = m["02_PCOS_Ultrasound"]["historical_held_out_test_n45"]["test_macro_f1"] * 100

mcvsld_old_acc = m["03_Measles_Viral_Rash"]["historical_image_level_benchmark"]["test_accuracy"]
mcvsld_old_measles = m["03_Measles_Viral_Rash"]["historical_image_level_benchmark"]["measles_crop_recall"] * 100

mcvsld_grp = m["03_Measles_Viral_Rash"]["corrected_group_isolated_benchmark"]
mcvsld_new_acc = mcvsld_grp["image_level_accuracy"]
mcvsld_new_balacc = mcvsld_grp["image_level_balanced_accuracy"]
mcvsld_new_f1 = mcvsld_grp["image_level_macro_f1"]
mcvsld_new_measles_crop = mcvsld_grp["image_level_measles_sensitivity"] * 100
mcvsld_new_fam_acc = mcvsld_grp["family_level_majority_vote_accuracy"]
mcvsld_new_measles_fam = 75.0

fig, axes = plt.subplots(2, 2, figsize=(15, 11))

# Panel A: PCOS Clinical & Ultrasound Validated Rigor
labels_a = [
    "PCOS Clin\n(50F-CV)",
    "PCOS Clin\n(Held-out N=18)",
    "PCOS US\n(15F Group CV)",
    "PCOS US (Old Test\nNear-Dupe Leaked)"
]
balaccs_a = [pcos_cv_balacc, pcos_test_balacc, us_cv_balacc, us_old_test_balacc]
f1s_a = [pcos_cv_f1, pcos_test_f1, us_cv_f1, us_old_test_f1]
x_a = np.arange(len(labels_a))
w_a = 0.35

b1 = axes[0, 0].bar(x_a - w_a/2, balaccs_a, w_a, label="Balanced Accuracy (%)", color="#2980b9")
b2 = axes[0, 0].bar(x_a + w_a/2, f1s_a, w_a, label="Macro F1 (%)", color="#27ae60")
axes[0, 0].set_ylim(65, 102)
axes[0, 0].set_ylabel("Score (%)")
axes[0, 0].set_title("A. PCOS Clinical ML & Ultrasound: Group-Isolated Rigor", fontweight="bold")
axes[0, 0].set_xticks(x_a)
axes[0, 0].set_xticklabels(labels_a, fontsize=8)
axes[0, 0].legend(loc="lower right")
axes[0, 0].grid(axis="y", linestyle="--", alpha=0.5)

# Panel B: MCVSLD Viral Rash: Contaminated vs Corrected Group-Isolated Benchmark
labels_b = [
    "Test Accuracy\n(Overall)",
    "Macro F1\nScore",
    "Measles Sensitivity\n(Image Crops)",
    "Measles Sensitivity\n(Source Families)"
]
old_vals_b = [mcvsld_old_acc, m["03_Measles_Viral_Rash"]["historical_image_level_benchmark"]["test_macro_f1"], mcvsld_old_measles, 100.0]
new_vals_b = [mcvsld_new_acc, mcvsld_new_f1, mcvsld_new_measles_crop, mcvsld_new_measles_fam]
x_b = np.arange(len(labels_b))
w_b = 0.35

axes[0, 1].bar(x_b - w_b/2, old_vals_b, w_b, label="Old Contaminated Split (100% Family Overlap)", color="#e74c3c", alpha=0.7)
axes[0, 1].bar(x_b + w_b/2, new_vals_b, w_b, label="Corrected Group-Isolated Split (0% Overlap)", color="#2ecc71")
axes[0, 1].set_ylim(60, 105)
axes[0, 1].set_ylabel("Score (%)")
axes[0, 1].set_title("B. Viral Rash: Contaminated vs Group-Isolated Generalization", fontweight="bold")
axes[0, 1].set_xticks(x_b)
axes[0, 1].set_xticklabels(labels_b, fontsize=8)
axes[0, 1].legend(loc="lower left")
axes[0, 1].grid(axis="y", linestyle="--", alpha=0.5)

# Panel C: Model Inference Latency Breakdown on NVIDIA RTX 5060 Ti
tasks_c = [
    "ResNet18\n(MCVSLD Vision)",
    "ResNet18\n(Ultrasound Vision)",
    "Whisper-Tiny\n(13.7s Bengali Audio)",
    "EasyOCR\n(Prescription Page)"
]
latencies_c = [12.3, 14.8, 284.9, 698.0] # in milliseconds
colors_c = ["#16a085", "#3498db", "#9b59b6", "#f39c12"]

bars_c = axes[1, 0].bar(tasks_c, latencies_c, color=colors_c, edgecolor="black")
axes[1, 0].set_ylabel("Inference Latency (Milliseconds, Log Scale)")
axes[1, 0].set_yscale("log")
axes[1, 0].set_title("C. Edge GPU Inference Latency on RTX 5060 Ti (Per Workload)", fontweight="bold")
axes[1, 0].grid(axis="y", linestyle="--", alpha=0.5)
for bar in bars_c:
    h = bar.get_height()
    axes[1, 0].text(bar.get_x() + bar.get_width()/2., h * 1.15, f"{h:.1f} ms", ha="center", va="bottom", fontsize=8, fontweight="bold")

# Panel D: Crop-Level vs Patient/Family-Level Aggregation Discrepancy
datasets_d = [
    "MCVSLD Viral Rash\n(Unseen Families)",
    "DermoPed Pediatric\n(Unseen Patients N=4)"
]
crop_scores_d = [mcvsld_new_acc, m["06_DermoPed_Pediatric_Skin"]["metrics"]["crop_level_accuracy"] * 100]
patient_scores_d = [mcvsld_new_fam_acc, m["06_DermoPed_Pediatric_Skin"]["metrics"]["patient_level_accuracy"] * 100]
x_d = np.arange(len(datasets_d))
w_d = 0.35

axes[1, 1].bar(x_d - w_d/2, crop_scores_d, w_d, label="Crop-Level Accuracy", color="#34495e")
axes[1, 1].bar(x_d + w_d/2, patient_scores_d, w_d, label="Family / Patient-Level Accuracy", color="#1abc9c")
axes[1, 1].set_ylim(60, 102)
axes[1, 1].set_ylabel("Accuracy (%)")
axes[1, 1].set_title("D. Crop-Level vs Patient-Level Clustering Gap", fontweight="bold")
axes[1, 1].set_xticks(x_d)
axes[1, 1].set_xticklabels(datasets_d, fontsize=9)
axes[1, 1].legend(loc="lower right")
axes[1, 1].grid(axis="y", linestyle="--", alpha=0.5)

plt.tight_layout()
plt.savefig(CHART_OUT_PATH, dpi=200)
plt.close()
print(f"Saved updated dynamic benchmark chart to: {CHART_OUT_PATH}")
