# 01_PCOS_Clinical — ShasthoSetu AI

Exploratory clinical machine learning on hormonal, biochemical, and clinical parameters for Polycystic Ovary Syndrome (PCOS).

## Dataset Information
- **Official Source:** [Mendeley Data — polycystic ovary syndrome (doi:10.17632/tw34c7hv7z.1)](https://data.mendeley.com/datasets/tw34c7hv7z/1)
- **Contributors:** Khansa Chaabouni, Universite de Sfax Faculte de Medecine de Sfax (Tunisia)
- **License:** Creative Commons Attribution 4.0 International (CC BY 4.0)
- **Cohort:** 88 participants (45 PCOS confirmed by Rotterdam criteria, 43 age- and BMI-matched healthy controls).
- **Features:** 20 clinical features (Age, BMI, Testosterone, Androstenedione, SDHEA, FSH, LH, PRL, HOMA-IR, E2, 17-OHP, SBP, DBP, Glucose, Lipids, 25-OH Vitamin D).

## Directory Structure
- `data/raw/`: Original downloaded Excel file (`vitD_donnees_2022Mai.xlsx`, SHA-256 verified)
- `data/processed/`: Standardized, cleaned CSV (`pcos_clinical_cleaned.csv`)
- `src/`:
  - `preprocess.py`: Zero-leakage parsing, missing value handling, column mapping
  - `train.py`: Leakage-free 5-fold CV pipelines (Logistic Regression, Random Forest, XGBoost) and held-out test evaluation
- `configs/`: Hyperparameters (`config.json`)
- `models/`: Best trained model pipeline checkpoint (`model_best.joblib`)
- `outputs/`: Test predictions, confusion matrices, training curves, metrics JSON, feature importances
- `proofs/`: Model card, experiment summary, full logs, and `PROOFS.zip`

## Quick Reproduction
Run the provided PowerShell reproduction script:
```powershell
.\reproduce.ps1
```

Or manually:
```powershell
.\venv\Scripts\Activate.ps1
python src\preprocess.py
python src\train.py
```
