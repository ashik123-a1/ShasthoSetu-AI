# 02_PCOS_Ultrasound — ShasthoSetu AI

Computer vision research baseline for ovarian ultrasound morphology classification (Dominant Follicle, Normal, PCO) using deep transfer learning and explainable Grad-CAM on NVIDIA RTX 5060 Ti (16GB VRAM).

## Dataset Information
- **Source:** [GitHub — HananSaadat/ovarian_ultrasound_dataset](https://github.com/HananSaadat/ovarian_ultrasound_dataset)
- **Reference Paper:** Borna M-R, Saadat H, Sepehri MM, Torkashvand H, Torkashvand L, Pilehvari S. *AI-powered diagnosis of ovarian conditions: insights from a newly introduced ultrasound dataset.* Frontiers in Physiology. 2025. doi:10.3389/fphys.2025.1520898
- **License:** Creative Commons Attribution 4.0 International (CC BY 4.0)
- **Classes:** 3 ovarian morphology conditions:
  - `Dominant_Follicle`: 144 images (142 unique)
  - `Normal`: 41 images (41 unique)
  - `PCO`: 116 images (116 unique)
- **Data Integrity & Deduplication:** 2 exact duplicates purged (`Dominant_Follicle_128.jpg` duplicate of `_1.jpg`, `Dominant_Follicle_86.jpg` duplicate of `_85.jpg`), yielding 299 unique images.

## Architecture & Hardware
- **Models:** ResNet18 (baseline) and MobileNetV3-Small (efficient architecture comparison).
- **GPU:** NVIDIA GeForce RTX 5060 Ti (16GB VRAM, CUDA 12.8 compatible PyTorch).
- **Augmentation:** Applied strictly on training split only (RandomResizedCrop, HorizontalFlip, RandomRotation, ColorJitter).
- **Selection Metric:** Best checkpoint chosen strictly on Validation Macro F1, completely preserving the held-out test set.
- **Explainable AI:** Grad-CAM heatmaps generated from the final convolutional layer to visualize model attention on ovarian cysts and follicles.

## Scientific Disclaimer
This model performs ovarian ultrasound morphological classification. **Ultrasound imaging appearance alone DOES NOT constitute a clinical diagnosis of Polycystic Ovary Syndrome (PCOS).** Clinical diagnosis requires formal Rotterdam consensus criteria, including biochemical/clinical hyperandrogenism and chronic anovulation.

## Quick Reproduction
```powershell
.\reproduce.ps1
```
