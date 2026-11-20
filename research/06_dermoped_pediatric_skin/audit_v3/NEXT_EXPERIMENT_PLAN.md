# Next DermoPed Research Strategy & Experiment Plan
**Project:** ShasthoSetu AI Pediatric Dermatology Vision Sub-System  
**Phase:** Transition from Tier 1 Exploration to Clinically Grounded Tier 2 Benchmark  
**Guiding Principle:** Master SRS v1.0 Section 16.2 & Medical AI Reproducibility Standards  

---

## 1. Core Lessons Learned from Tier 1 (EXP_A, EXP_B, EXP_D)

1. **Patient Sample Size Rules Generalization:**
   Evaluating on a minority class with only $n=3$ patients (`pediculosis`) created an insurmountable variance problem:
   - 1 training patient (`patient72`, age 5) cannot provide sufficient feature variance.
   - 1 validation patient (`patient71`, age 1) causes validation recall to plunge to $0\%$ when infant features diverge.
   - 1 test patient (`patient74`, age 42) causes test accuracy to surge to $100\%$ purely because adult nits are distinct.
2. **Never Select Models Based on Small Held-Out Test Sets:**
   EXP_D had 100% test accuracy but was completely blind to the validation infant patient ($0\%$ recall). EXP_B achieved the best actual generalization (Val F1 57.76%, Pediculosis recall 15%).
3. **Do Not Repeatedly Tune on the Held-Out Test Set:**
   Continuing to iterate hyperparameters against the same 4 test patients will result in test set contamination. The current test set must remain locked.

---

## 2. Infrastructure & MLOps Strategy

### 2.1 Direct Reuse of the Verified GPU Environment
- **Environment:** `F:\Clude cccccccccccccccccccccccc\data we test\_shared\venv`
- **Binary:** `_shared/venv/Scripts/python.exe`
- **Capabilities:** PyTorch `2.11.0+cu128`, CUDA `12.8`, Native `sm_120` support.
- **Verified Benchmark:** 226.42 ms forward/backward convolution latency on **NVIDIA GeForce RTX 5060 Ti 16GB**.
- **Disk Impact:** **0.00 MB** (Zero additional disk consumption). Avoids exhausting the remaining ~1 GB on Drive F.

---

## 3. Recommended Tier 2 Experiment: Pediatric Exanthem Differential Benchmark

Instead of binary chickenpox vs pediculosis, transition to a clinically urgent differential diagnosis task that directly aligns with Master SRS v1.0 (Measles & Pediatric Fever with Rash):

### 3.1 Proposed Disease Classes
1. **Chickenpox (`chickenpox.zip`):**
   - 19 distinct patients, 575 curated crops.
   - Already downloaded and verified locally.
2. **Morbilliform Exanthema (`morbilliform_exanthema.zip`):**
   - Size: **329.67 MB** (Can be downloaded safely without disk space risk).
   - Clinical Relevance: Pathognomonic clinical rash of **Measles** and acute pediatric viral infections.
   - Patient Diversity: Substantial pediatric cohort from tertiary pediatric care.

### 3.2 Evaluation Methodology: 5-Fold Patient-Stratified Cross-Validation
- Replace the fragile single-split strategy with **Repeated 5-Fold Stratified Group Cross-Validation** (matching `02_PCOS_Ultrasound`).
- Ensures that **every patient** is rotated through validation exactly once.
- Eliminates single-patient score swings.
- Reports mean $\pm$ standard deviation for Macro F1, Sensitivity, and Specificity across all folds.

### 3.3 Strict Research Safeguards
- Non-autonomous decision support classification only.
- Multi-camera and skin-phototype robustness tracking.
- Saliency / Grad-CAM visual explainability maps for clinical verification.
