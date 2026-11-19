# Experiment Summary: Ovarian Ultrasound Vision Baseline

## Overview
- **Dataset:** 301 total raw images, 2 exact duplicates safely purged (Dominant_Follicle_128 & Dominant_Follicle_86)
- **Total Unique Images:** 299 (Dominant_Follicle: 142, Normal: 41, PCO: 116)
- **Splits:** Train = 209 (70%), Val = 45 (15%), Held-Out Test = 45 (15%)
- **Models Compared:** ResNet18 vs MobileNetV3-Small
- **Best Model Selected:** ResNet18 (Selected via Validation Macro F1)

## Performance Comparison
| Model | Val Macro F1 | Test Accuracy | Test Balanced Acc | Test Macro F1 |
| :--- | :---: | :---: | :---: | :---: |
| ResNet18 | 0.7314 | 0.8667 | 0.8624 | 0.8770 |
| MobileNetV3 | 0.7231 | 0.8000 | 0.8175 | 0.8246 |

## Explainable AI: Grad-CAM
Grad-CAM heatmaps generated from the final convolutional layer of ResNet18 show focal attention on subcapsular ovarian follicles in PCO images and prominent single cystic structures in Dominant Follicle scans.
