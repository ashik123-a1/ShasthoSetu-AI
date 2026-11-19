# Experiment Summary: Bilingual Medical Prescription OCR Benchmark
## ShasthoSetu AI — OCR & Healthcare NLP Module (04_Prescription_OCR)

---

### 1. Executive Summary
- **Module:** `04_Prescription_OCR` (Bilingual Medical Handwriting OCR)
- **Dataset:** 995 unique handwritten medical prescriptions from Bangabandhu Sheikh Mujibur Rahman Digital University (BDU, CC BY 4.0).
- **Partition:** 70% Train (696), 15% Val (149), 15% Held-Out Test (150). Zero split leakage.
- **Engine Evaluated:** EasyOCR Bilingual GPU Engine (`['bn', 'en']`) on NVIDIA GeForce RTX 5060 Ti.
- **Inference Speed:** **0.673 seconds per prescription page** (1.48 pages/second).

---

### 2. Final Test Metrics (Held-Out Test N=150)
- **Mean Character Error Rate (CER):** **101.07%** (Median: 87.55%)
- **Mean Word Error Rate (WER):** **117.32%** (Median: 99.85%)
- **Normalized Levenshtein Similarity:** **12.96%**
- **Medication Token Recall:** **3.12%**
- **Total Benchmark Runtime:** 103.38 seconds on RTX 5060 Ti.

---

### 3. Artifacts Bundled in PROOFS.zip
- `outputs/ocr_test_predictions.csv` (Per-prescription ground truth vs OCR predictions)
- `outputs/cer_recall_distribution.png` (CER & Token Recall histograms)
- `outputs/metrics.json`
- `outputs/dataset_profile.json`
- `reproduce.ps1` (Hardened reproduction script)
- `model_card.md` & `experiment_summary.md`
