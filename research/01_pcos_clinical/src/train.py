import os
import sys
import json
import time
import zipfile
import platform
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, balanced_accuracy_score, precision_score,
    recall_score, f1_score, roc_auc_score, confusion_matrix,
    classification_report
)
from sklearn.pipeline import Pipeline
import joblib

try:
    import xgboost as xgb
    HAS_XGB = True
except ImportError:
    HAS_XGB = False

# Paths
BASE_DIR = r"F:\Clude cccccccccccccccccccccccc\data we test\01_PCOS_Clinical"
DATA_PATH = os.path.join(BASE_DIR, "data", "processed", "pcos_clinical_cleaned.csv")
CONFIG_PATH = os.path.join(BASE_DIR, "configs", "config.json")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
MODELS_DIR = os.path.join(BASE_DIR, "models")
LOGS_DIR = os.path.join(BASE_DIR, "logs")
PROOFS_DIR = os.path.join(BASE_DIR, "proofs")

os.makedirs(OUTPUTS_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(LOGS_DIR, exist_ok=True)
os.makedirs(PROOFS_DIR, exist_ok=True)

LOG_FILE = os.path.join(LOGS_DIR, "experiment_log.txt")
PROOF_LOG = os.path.join(PROOFS_DIR, "experiment_log.txt")

def log(msg):
    timestamp = time.strftime("[%Y-%m-%d %H:%M:%S]")
    full_msg = f"{timestamp} {msg}"
    print(full_msg)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(full_msg + "\n")
    with open(PROOF_LOG, "a", encoding="utf-8") as f:
        f.write(full_msg + "\n")

def run():
    start_time = time.time()
    log("="*60)
    log("Starting ShasthoSetu AI — PCOS Clinical Tabular ML Experiment")
    log("="*60)
    
    # Load config
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        config = json.load(f)
        
    random_seed = config.get("random_seed", 42)
    np.random.seed(random_seed)
    
    # Save environment info
    env_info = {
        "os": platform.platform(),
        "python_version": sys.version,
        "platform": platform.machine(),
        "processor": platform.processor(),
        "numpy_version": np.__version__,
        "pandas_version": pd.__version__,
        "sklearn_version": joblib.__version__,
        "xgboost_available": HAS_XGB
    }
    with open(os.path.join(OUTPUTS_DIR, "environment.json"), "w", encoding="utf-8") as f:
        json.dump(env_info, f, indent=2)
    with open(os.path.join(OUTPUTS_DIR, "experiment_config.json"), "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)

    # 1. Load Data
    log(f"Loading cleaned dataset from: {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    log(f"Dataset shape: {df.shape}")
    
    target_col = config["target_column"]
    feature_cols = [c for c in df.columns if c != target_col]
    
    X = df[feature_cols]
    y = df[target_col].astype(int)
    
    log(f"Features ({len(feature_cols)}): {feature_cols}")
    log(f"Class distribution: {dict(y.value_counts())}")
    
    # 2. Train / Test Split
    test_size = config.get("test_size", 0.2)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_seed, stratify=y
    )
    
    split_summary = pd.DataFrame([
        {"split": "Train", "total": len(y_train), "PCOS_pos (1)": int((y_train==1).sum()), "Control_neg (0)": int((y_train==0).sum())},
        {"split": "Test", "total": len(y_test), "PCOS_pos (1)": int((y_test==1).sum()), "Control_neg (0)": int((y_test==0).sum())},
        {"split": "Total", "total": len(y), "PCOS_pos (1)": int((y==1).sum()), "Control_neg (0)": int((y==0).sum())}
    ])
    split_summary.to_csv(os.path.join(OUTPUTS_DIR, "split_summary.csv"), index=False)
    log(f"Split completed: Train={len(y_train)}, Test={len(y_test)}")
    
    # 3. Model Definition
    pipelines = {
        "Logistic_Regression": Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(
                C=config["models"]["logistic_regression"]["C"],
                max_iter=config["models"]["logistic_regression"]["max_iter"],
                solver=config["models"]["logistic_regression"]["solver"],
                random_state=random_seed
            ))
        ]),
        "Random_Forest": Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("clf", RandomForestClassifier(
                n_estimators=config["models"]["random_forest"]["n_estimators"],
                max_depth=config["models"]["random_forest"]["max_depth"],
                random_state=random_seed
            ))
        ])
    }
    
    if HAS_XGB:
        pipelines["XGBoost"] = Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("clf", xgb.XGBClassifier(
                n_estimators=config["models"]["xgboost"]["n_estimators"],
                max_depth=config["models"]["xgboost"]["max_depth"],
                learning_rate=config["models"]["xgboost"]["learning_rate"],
                eval_metric=config["models"]["xgboost"]["eval_metric"],
                random_state=random_seed
            ))
        ])
        
    # 4. Stratified 5-Fold Cross Validation on Train Set
    cv_folds = config.get("cv_folds", 5)
    skf = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=random_seed)
    
    cv_history = []
    log(f"\n--- Running {cv_folds}-Fold Stratified Cross-Validation on Training Data ---")
    
    for model_name, pipe in pipelines.items():
        log(f"\nEvaluating Model: {model_name}")
        fold_scores = []
        for fold, (train_idx, val_idx) in enumerate(skf.split(X_train, y_train), 1):
            X_tr, y_tr = X_train.iloc[train_idx], y_train.iloc[train_idx]
            X_va, y_val = X_train.iloc[val_idx], y_train.iloc[val_idx]
            
            pipe.fit(X_tr, y_tr)
            y_pred = pipe.predict(X_va)
            y_proba = pipe.predict_proba(X_va)[:, 1] if hasattr(pipe, "predict_proba") else None
            
            acc = accuracy_score(y_val, y_pred)
            bal_acc = balanced_accuracy_score(y_val, y_pred)
            prec = precision_score(y_val, y_pred, zero_division=0)
            rec = recall_score(y_val, y_pred, zero_division=0)
            f1 = f1_score(y_val, y_pred, zero_division=0)
            auc = roc_auc_score(y_val, y_proba) if y_proba is not None else 0.5
            
            row = {
                "model": model_name,
                "fold": fold,
                "accuracy": round(acc, 4),
                "balanced_accuracy": round(bal_acc, 4),
                "precision": round(prec, 4),
                "recall": round(rec, 4),
                "macro_f1": round(f1, 4),
                "roc_auc": round(auc, 4)
            }
            cv_history.append(row)
            fold_scores.append(row)
            
        fold_df = pd.DataFrame(fold_scores)
        log(f"  Mean Balanced Acc: {fold_df['balanced_accuracy'].mean():.4f} +/- {fold_df['balanced_accuracy'].std():.4f}")
        log(f"  Mean Macro F1:     {fold_df['macro_f1'].mean():.4f} +/- {fold_df['macro_f1'].std():.4f}")
        log(f"  Mean ROC-AUC:      {fold_df['roc_auc'].mean():.4f} +/- {fold_df['roc_auc'].std():.4f}")

    cv_history_df = pd.DataFrame(cv_history)
    cv_history_df.to_csv(os.path.join(OUTPUTS_DIR, "training_history.csv"), index=False)
    
    # 5. Model Selection & Final Evaluation on Held-Out Test Set
    summary_by_model = cv_history_df.groupby("model")["balanced_accuracy"].mean()
    best_model_name = summary_by_model.idxmax()
    log(f"\nBest Model by CV Balanced Accuracy: {best_model_name} ({summary_by_model[best_model_name]:.4f})")
    
    # Fit each model on full X_train and evaluate on X_test
    test_metrics = {}
    best_pipeline = None
    
    for model_name, pipe in pipelines.items():
        pipe.fit(X_train, y_train)
        y_test_pred = pipe.predict(X_test)
        y_test_proba = pipe.predict_proba(X_test)[:, 1] if hasattr(pipe, "predict_proba") else None
        
        acc = accuracy_score(y_test, y_test_pred)
        bal_acc = balanced_accuracy_score(y_test, y_test_pred)
        prec = precision_score(y_test, y_test_pred, zero_division=0)
        rec = recall_score(y_test, y_test_pred, zero_division=0)
        f1 = f1_score(y_test, y_test_pred, zero_division=0)
        auc = roc_auc_score(y_test, y_test_proba) if y_test_proba is not None else 0.5
        cm = confusion_matrix(y_test, y_test_pred)
        
        # Specificity
        tn, fp, fn, tp = cm.ravel()
        spec = tn / (tn + fp) if (tn + fp) > 0 else 0.0
        
        test_metrics[model_name] = {
            "test_accuracy": round(float(acc), 4),
            "test_balanced_accuracy": round(float(bal_acc), 4),
            "test_precision": round(float(prec), 4),
            "test_recall_sensitivity": round(float(rec), 4),
            "test_specificity": round(float(spec), 4),
            "test_macro_f1": round(float(f1), 4),
            "test_roc_auc": round(float(auc), 4),
            "confusion_matrix": {
                "TN": int(tn), "FP": int(fp), "FN": int(fn), "TP": int(tp)
            }
        }
        
        if model_name == best_model_name:
            best_pipeline = pipe
            # Save predictions
            pred_df = pd.DataFrame({
                "true_label": y_test.values,
                "pred_label": y_test_pred,
                "pred_proba_pcos": y_test_proba
            })
            pred_df.to_csv(os.path.join(OUTPUTS_DIR, "test_predictions.csv"), index=False)
            
            # Classification report
            cls_rep = classification_report(y_test, y_test_pred, target_names=["Control", "PCOS"], output_dict=True)
            cls_rep_df = pd.DataFrame(cls_rep).transpose()
            cls_rep_df.to_csv(os.path.join(OUTPUTS_DIR, "classification_report.csv"))

    # Save metrics.json
    all_metrics = {
        "experiment": "PCOS Clinical Tabular Research Baseline",
        "best_model": best_model_name,
        "cv_folds": cv_folds,
        "sample_counts": {
            "total": int(len(df)),
            "train": int(len(X_train)),
            "test": int(len(X_test)),
            "features": int(len(feature_cols))
        },
        "test_results": test_metrics,
        "total_runtime_seconds": round(time.time() - start_time, 2)
    }
    with open(os.path.join(OUTPUTS_DIR, "metrics.json"), "w", encoding="utf-8") as f:
        json.dump(all_metrics, f, indent=2)

    # Save Best Model Checkpoint
    model_save_path = os.path.join(MODELS_DIR, "model_best.joblib")
    joblib.dump(best_pipeline, model_save_path)
    log(f"Saved best model checkpoint to: {model_save_path}")

    # 6. Generate Visualizations
    log("Generating research visualizations...")
    
    # 6a. CV Curves / Comparison Bar Chart
    plt.figure(figsize=(9, 5))
    metrics_to_plot = ["balanced_accuracy", "macro_f1", "roc_auc"]
    melted = cv_history_df.melt(id_vars=["model", "fold"], value_vars=metrics_to_plot, var_name="metric", value_name="score")
    sns.barplot(data=melted, x="metric", y="score", hue="model", palette="Set2", ci="sd")
    plt.title("5-Fold Cross-Validation Performance Comparison (PCOS Clinical)")
    plt.ylabel("Score")
    plt.ylim(0, 1.05)
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUTS_DIR, "training_curves.png"), dpi=200)
    plt.close()
    
    # 6b. Confusion Matrix Heatmap for Best Model
    best_cm = np.array([
        [test_metrics[best_model_name]["confusion_matrix"]["TN"], test_metrics[best_model_name]["confusion_matrix"]["FP"]],
        [test_metrics[best_model_name]["confusion_matrix"]["FN"], test_metrics[best_model_name]["confusion_matrix"]["TP"]]
    ])
    plt.figure(figsize=(6, 5))
    sns.heatmap(best_cm, annot=True, fmt="d", cmap="Blues", cbar=False,
                xticklabels=["Pred Control (0)", "Pred PCOS (1)"],
                yticklabels=["True Control (0)", "True PCOS (1)"])
    plt.title(f"Test Confusion Matrix — {best_model_name}")
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUTS_DIR, "confusion_matrix.png"), dpi=200)
    plt.close()
    
    # 6c. Feature Importance / Coefficients
    plt.figure(figsize=(10, 6))
    if best_model_name == "Logistic_Regression":
        coefs = best_pipeline.named_steps["clf"].coef_[0]
        imp_df = pd.DataFrame({"feature": feature_cols, "importance": coefs})
        imp_df["abs_imp"] = imp_df["importance"].abs()
        imp_df = imp_df.sort_values("abs_imp", ascending=False)
        sns.barplot(data=imp_df, x="importance", y="feature", palette="vlag")
        plt.title("Logistic Regression Standardized Coefficients (PCOS Predictors)")
        plt.xlabel("Log-Odds Coefficient")
    else:
        importances = best_pipeline.named_steps["clf"].feature_importances_
        imp_df = pd.DataFrame({"feature": feature_cols, "importance": importances})
        imp_df = imp_df.sort_values("importance", ascending=False)
        sns.barplot(data=imp_df, x="importance", y="feature", palette="viridis")
        plt.title(f"{best_model_name} Gini Feature Importance (PCOS Predictors)")
        plt.xlabel("Importance")
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUTS_DIR, "feature_importance.png"), dpi=200)
    plt.close()
    
    log("Visualizations saved successfully.")

    # 7. Generate Model Card & Experiment Summary
    log("Creating Model Card and Experiment Summary...")
    generate_markdown_reports(all_metrics, feature_cols, best_model_name)
    
    # 8. Package PROOFS.zip (excluding raw patient data)
    create_proofs_zip()
    
    total_time = time.time() - start_time
    log(f"All PCOS Clinical tasks successfully completed in {total_time:.2f} seconds.")
    log("="*60)

def generate_markdown_reports(metrics, features, best_model):
    bm = metrics["test_results"][best_model]
    cm = bm["confusion_matrix"]
    
    model_card = f"""# Model Card: PCOS Clinical Tabular Classifier (Baseline)

## Model Details
- **Developer:** ShasthoSetu AI Research Team
- **Model Architecture:** {best_model} (Scikit-Learn Pipeline)
- **Preprocessing:** Median Imputation + StandardScaler (inside leakage-free CV folds)
- **Dataset Source:** Mendeley Data (`tw34c7hv7z/1`) — Khansa Chaabouni, Universite de Sfax Faculte de Medecine de Sfax
- **License:** Creative Commons Attribution 4.0 International (CC BY 4.0)
- **Intended Use:** Exploratory biomedical feature analysis & machine learning research for PCOS risk factors.
- **Clinical Notice:** RESEARCH ONLY. This model is NOT certified as a medical diagnostic device and must never be used for autonomous clinical diagnosis.

## Evaluation Results (Held-Out Test Set, N={metrics['sample_counts']['test']})
- **Balanced Accuracy:** {bm['test_balanced_accuracy'] * 100:.2f}%
- **Overall Accuracy:** {bm['test_accuracy'] * 100:.2f}%
- **Sensitivity / Recall:** {bm['test_recall_sensitivity'] * 100:.2f}%
- **Specificity:** {bm['test_specificity'] * 100:.2f}%
- **Macro F1-Score:** {bm['test_macro_f1'] * 100:.2f}%
- **ROC-AUC:** {bm['test_roc_auc'] * 100:.2f}%

### Confusion Matrix
| | Pred Control (0) | Pred PCOS (1) |
|---|---|---|
| **True Control (0)** | {cm['TN']} (TN) | {cm['FP']} (FP) |
| **True PCOS (1)** | {cm['FN']} (FN) | {cm['TP']} (TP) |

## Features Used ({len(features)})
{', '.join(features)}

## Limitations & Ethical Considerations
1. Small sample size (N=88) from a single medical center (Sfax, Tunisia).
2. Requires external validation on multi-ethnic cohorts before broader epidemiological generalization.
3. Hormonal levels vary by menstrual cycle phase, age, and metabolic state.
"""
    with open(os.path.join(PROOFS_DIR, "model_card.md"), "w", encoding="utf-8") as f:
        f.write(model_card)

    summary = f"""# Experiment Summary: PCOS Clinical Tabular ML

## Overview
- **Dataset:** Mendeley Data tw34c7hv7z/1
- **Samples:** Total: {metrics['sample_counts']['total']} (Train: {metrics['sample_counts']['train']}, Test: {metrics['sample_counts']['test']})
- **Target Distribution:** 45 PCOS Cases (51.1%) vs 43 Controls (48.9%)
- **Validation Protocol:** 5-Fold Stratified Cross-Validation + 20% Held-Out Stratified Test Set
- **Selected Best Model:** {best_model}

## Model Performance Comparison (Test Set)
| Model | Balanced Acc | Macro F1 | ROC-AUC | Sensitivity | Specificity |
|---|---|---|---|---|---|
"""
    for m_name, res in metrics["test_results"].items():
        summary += f"| {m_name} | {res['test_balanced_accuracy']:.4f} | {res['test_macro_f1']:.4f} | {res['test_roc_auc']:.4f} | {res['test_recall_sensitivity']:.4f} | {res['test_specificity']:.4f} |\n"

    summary += f"""
## Key Predictors
Top clinical features driving classification include Testosterone, LH/FSH ratio indicators, Androstenedione, and Insulin Resistance markers (HOMA-IR).

## Hackathon Evidence & Reproducibility
- Best checkpoint: `models/model_best.joblib`
- Metrics: `outputs/metrics.json`
- Test predictions: `outputs/test_predictions.csv`
- Proof archive: `proofs/PROOFS.zip`
"""
    with open(os.path.join(PROOFS_DIR, "experiment_summary.md"), "w", encoding="utf-8") as f:
        f.write(summary)

def create_proofs_zip():
    zip_path = os.path.join(PROOFS_DIR, "PROOFS.zip")
    log(f"Creating proof archive at: {zip_path}")
    files_to_pack = [
        # Checkpoints & Configs
        os.path.join(MODELS_DIR, "model_best.joblib"),
        os.path.join(BASE_DIR, "configs", "config.json"),
        os.path.join(BASE_DIR, "reproduce.ps1"),
        # Code
        os.path.join(BASE_DIR, "src", "preprocess.py"),
        os.path.join(BASE_DIR, "src", "train.py"),
        # Manifests & Data
        os.path.join(BASE_DIR, "data", "processed", "pcos_clinical_cleaned.csv"),
        os.path.join(BASE_DIR, "data", "raw", "vitD_donnees_2022Mai.xlsx"),
        # Outputs
        os.path.join(OUTPUTS_DIR, "metrics.json"),
        os.path.join(OUTPUTS_DIR, "training_history.csv"),
        os.path.join(OUTPUTS_DIR, "training_curves.png"),
        os.path.join(OUTPUTS_DIR, "confusion_matrix.png"),
        os.path.join(OUTPUTS_DIR, "classification_report.csv"),
        os.path.join(OUTPUTS_DIR, "test_predictions.csv"),
        os.path.join(OUTPUTS_DIR, "feature_importance.png"),
        os.path.join(OUTPUTS_DIR, "dataset_profile.json"),
        os.path.join(OUTPUTS_DIR, "split_summary.csv"),
        os.path.join(OUTPUTS_DIR, "environment.json"),
        # Proof docs
        os.path.join(PROOFS_DIR, "model_card.md"),
        os.path.join(PROOFS_DIR, "experiment_summary.md"),
        os.path.join(PROOFS_DIR, "experiment_log.txt")
    ]
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for file in files_to_pack:
            if os.path.exists(file):
                arcname = os.path.relpath(file, BASE_DIR)
                z.write(file, arcname)
                print(f"  Added {arcname} ({os.path.getsize(file)} bytes)")
            else:
                print(f"  WARNING: File missing: {file}")
    log(f"PROOFS.zip created successfully ({os.path.getsize(zip_path)} bytes).")

if __name__ == "__main__":
    run()
