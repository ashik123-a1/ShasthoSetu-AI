# Model Card: Ovarian Ultrasound Morphology Classifier

## Model Details
- **Architecture:** ResNet18 (Transfer Learning with PyTorch)
- **Dataset:** Ovarian Ultrasound Dataset (Borna et al., Frontiers in Physiology 2025, doi:10.3389/fphys.2025.1520898)
- **License:** Creative Commons Attribution 4.0 International (CC BY 4.0)
- **Hardware Used:** NVIDIA GeForce RTX 5060 Ti 16GB VRAM (CUDA 12.8 compatible)
- **Task:** 3-Class Ultrasound Morphology Classification (Dominant Follicle, Normal, PCO)
- **Scientific Notice:** RESEARCH ONLY. Ultrasound imaging appearance alone DOES NOT constitute a clinical diagnosis of Polycystic Ovary Syndrome (PCOS). Clinical diagnosis mandates Rotterdam criteria including hyperandrogenism and ovulatory dysfunction.

## Evaluation Results (Held-Out Test Set N=45)
- **Overall Accuracy:** 86.67%
- **Balanced Accuracy:** 86.24%
- **Macro F1-Score:** 87.70%
- **Validation Macro F1 (Checkpoint Selection):** 73.14%

## Confusion Matrix (ResNet18)
Classes: [0: Dominant_Follicle, 1: Normal, 2: PCO]
```
[[17  0  4]
 [ 0  5  1]
 [ 1  0 17]]
```

## Key Dataset Limitations
1. **Severe Imbalance in Normal Class:** The Normal class comprises only 41 images across the entire dataset (29 in Train, 6 in Val, 6 in Test).
2. **Image-Level Grouping:** Multiple frames from the same sonographic sweep could potentially share feature patterns if patient IDs are not explicitly provided in public records.
3. **Clinical Scope:** Ultrasound morphology is an adjunct diagnostic marker, not a standalone diagnostic test for metabolic syndrome.
