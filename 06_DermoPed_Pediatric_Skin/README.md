# 06_DermoPed_Pediatric_Skin — ShasthoSetu AI

Pediatric dermatology research pipeline for lesion classification using DermoPed (Zenodo Record 20829589). Conforms to Master SRS v1.0 Section 16.2 & Section 21.

## Dataset Information
- **Official Source:** [DermoPed Zenodo Record 20829589](https://zenodo.org/records/20829589)
- **Paper:** [Nature Scientific Data (s41597-026-08353-2)](https://www.nature.com/articles/s41597-026-08353-2)
- **Curated Crops:** Strictly curated `crops/` (ignoring masks and challenging sets).
- **Patient Grouping:** Patient-level isolation via `GroupShuffleSplit` (Zero patient leakage).

## Directory Structure
- `data/raw/`: Downloaded Zenodo ZIP archives with MD5 checksum verification.
- `data/processed/`: Extracted disease folders (`chickenpox`, `pediculosis`, etc.).
- `src/`:
  - `ingest.py`: Resumable cloud-to-cloud download and safe extraction.
  - `train.py`: Leakage-free patient-disjoint training with backbone freezing (`EXP_D`) and weighted random sampling.
- `configs/`: Hyperparameters (`config.json`).
- `models/`: Best trained PyTorch model checkpoint (`model_best.pth`).
- `outputs/`: Test classification report, confusion matrix, training curves, metrics JSON, patient counts.
- `proofs/`: Model card, historical benchmark comparisons, and proof archives.

## Controlled Experiments History
| Experiment | Sampler | Backbone | Best Val Macro F1 | Val Pediculosis Recall | Test Image Acc | Test Patient Acc | Status |
|---|---|---|---|---|---|---|---|
| **EXP_A (Baseline v1)** | Shuffle | Fully Trainable | 48.37% | 5.0% | 95.45% | 75.0% (3/4) | Severe Overfitting |
| **EXP_B (Controlled v2)** | WeightedRandom | Fully Trainable | 57.76% | 15.0% | 92.73% | 75.0% (3/4) | Recall Tripled (+9.4% F1) |
| **EXP_D (Regularized v3)** | WeightedRandom | Frozen (conv1..l3) + Dropout 0.5 | 43.90% | 0.0% | 100.0% | 100.0% (4/4) | Test 100% (High Val Variance due to n=1 val patient) |

> [!NOTE]
> **Clinical Bottleneck Analysis:**
> The entire Zenodo DermoPed archive contains only 3 pediculosis patients in total:
> - Train: `patient71` (1 patient)
> - Val: `patient72` (1 patient)
> - Test: `patient74` (1 patient)
> Because each split has exactly $n=1$ pediculosis patient, validation recall fluctuates between $0\%$ and $100\%$ depending on that single patient's individual skin features, while the held-out test patient was classified with $100\%$ accuracy (21/21 crops). Claiming clinical diagnostic accuracy on $n=3$ patients would be medically invalid; this module strictly serves as an architectural proof-of-concept for the ShasthoSetu AI research tier.

## Reproduction
Run the provided PowerShell script:
```powershell
.\reproduce.ps1
```
Or run the included Jupyter notebook:
```
ShasthoSetu_DermoPed_Colab_v2_3_1_Reviewed.ipynb
```
