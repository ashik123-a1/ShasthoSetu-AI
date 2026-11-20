# ShasthoSetu AI — Clinical Research & Audited ML/DL Benchmarks (`research/`)

This directory consolidates the **reproducible source code, experiment configurations, split manifests, training curves, Grad-CAM explainability visualizations, and leakage audits** for all **6 clinical AI research prototypes** powering **ShasthoSetu AI**.

> **Storage Separation Note:** To keep Git clones lightweight and fast (~50 MB total), raw medical imagery, audio clips, and multi-megabyte `.pth` / `.joblib` model checkpoints are hosted cleanly on **Hugging Face**:
> [`ashik1236/shasthosetu-clinical-datasets`](https://huggingface.co/datasets/ashik1236/shasthosetu-clinical-datasets) (**35,641 files**, ~2.03 GiB).

---

## 1. Audited Research Modules & Validated Metrics (`FINAL_AUDIT_SIGNOFF.md`)

All metrics below match the cryptographically frozen register verified by [`verify_final_lock.py`](../SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/final_lock/verify_final_lock.py) (`RESEARCH_AUDIT_PASS_WITH_LIMITATIONS — FROZEN`):

| Module Directory | Task & Architecture | Primary Dataset & DOI | Audited Validated Metric | Mandatory Operational Limitation |
| :--- | :--- | :--- | :--- | :--- |
| **[`01_pcos_clinical/`](01_pcos_clinical)** | Clinical Biomarker Tabular Risk (`XGBoost`) | Mendeley [`10.17632/tw34c7hv7z.1`](https://doi.org/10.17632/tw34c7hv7z.1) ($N=88$) | Held-out Bal Acc: **94.44%** (`17/18`) · 50-Fold CV: **88.57%** | Small cohort ($N=88$); clinical proxy features only; strictly non-diagnostic. |
| **[`02_pcos_ultrasound/`](02_pcos_ultrasound)** | Ovarian B-Mode Morphology (`ResNet-18`) | Frontiers [`10.3389/fphys.2025.1520898`](https://doi.org/10.3389/fphys.2025.1520898) ($N=299$) | Test Acc: **86.67%** (`39/45`) | Grouped by perceptual hash (pHash); hospital patient IDs absent; ultrasound alone does not diagnose PCOS. |
| **[`03_viral_rash_grouped/`](03_viral_rash_grouped)** | 6-Class Viral Rash Lesion (`ResNet-18`) | Mendeley MCVSLD [`10.17632/dfztdtfsxz.1`](https://doi.org/10.17632/dfztdtfsxz.1) | Val Img Acc: **84.65%**, F1: **84.22%** · Test Family: **85.09%** | Partitioned across **755 source-photo families** (`0%` leakage); older `99.10%` leaked baseline permanently quarantined. |
| **[`04_prescription_ocr/`](04_prescription_ocr)** | Bilingual Rx Token Triage (`EasyOCR 1.7.2`) | Mendeley Gazipur v2 [`10.17632/tg2hm7n2bs.2`](https://doi.org/10.17632/tg2hm7n2bs.2) ($N=1,000$) | Smoke `0052.jpg`: **44 tokens** · Synthetic Printed ($N=4$): Prec **77.78%**, Rec **100%**, F1 **87.50%** | **Real handwritten CER/WER is `NOT_VALIDATED`**; automated medication reminders locked behind **`HTTP 422`** human confirmation (`SIMULATED_REVIEW_ONLY`). |
| **[`05_bangla_voice_ai/`](05_bangla_voice_ai)** | Bilingual ASR (`whisper-small-bn` + `whisper-base`) | Google FLEURS `bn_in` (`26` clips, `22` speakers) | 26 FLEURS: Norm WER **39.09%**, BN Unicode **98.37%** | General-domain speech; enforces mandatory editable transcript confirmation before clinical chat submission. |
| **[`06_dermoped_pediatric_skin/`](06_dermoped_pediatric_skin)** | Pediatric Lesion (`ResNet-18 EXP_B / EXP_D`) | Zenodo [`10.5281/zenodo.20829589`](https://doi.org/10.5281/zenodo.20829589) (`22` patients) | Test Img Acc (`EXP_B`): **92.73%** | Severe class sample constraint (`19` Chickenpox, only **`3` Pediculosis** patients total); architectural research PoC only. |

---

## 2. Pull Full Datasets from Hugging Face Hub

```bash
pip install huggingface-hub
hf download ashik1236/shasthosetu-clinical-datasets --repo-type dataset --local-dir ./hf_datasets
```

Or use the included audit script to verify dataset manifests, counts, and SHA-256 checksums locally:
```bash
python SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/final_lock/verify_final_lock.py
```

---

## 3. Related Documentation
- Full benchmark & evaluation report: [`../docs/TESTING.md`](../docs/TESTING.md)
- Detailed LLM + ML Model Cards: [`../docs/MODEL_CARDS.md`](../docs/MODEL_CARDS.md)
- Dataset provenance & ethical risk disclosures: [`../docs/DATASETS.md`](../docs/DATASETS.md) and [`../docs/KNOWN_LIMITATIONS.md`](../docs/KNOWN_LIMITATIONS.md)
