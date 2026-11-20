# ShasthoSetu AI — Clinical Datasets, Provenance & Governance Ledger

This document inventories the clinical research datasets, RAG knowledge guidelines, in-repo QA samples, and cryptographic audit hashes underpinning **ShasthoSetu AI**.

---

## 1. Two-Tier Storage Architecture (GitHub + Hugging Face)

| Storage Location | Purpose & Contents | Size | Link |
| :--- | :--- | :---: | :--- |
| **Hugging Face Hub** | Full audited training/evaluation images, audio clips, CSV splits & lock manifests (`35,641` files across `7` directories) | ~2.03 GiB | [`ashik1236/shasthosetu-clinical-datasets`](https://huggingface.co/datasets/ashik1236/shasthosetu-clinical-datasets) |
| **GitHub (`testingmainapps/`)** | Self-contained 5-system QA sample pack (PDF/JPG prescriptions, pelvic USG, IMCI/EPI cases, lesion images & negative controls, BN/EN/Banglish prompts) | 1.01 MB | [`../testingmainapps/README.md`](../testingmainapps/README.md) |

### Download Full Research Datasets from Hugging Face
```bash
pip install huggingface-hub
hf download ashik1236/shasthosetu-clinical-datasets --repo-type dataset --local-dir ./hf_datasets
```

---

## 2. Canonical Provenance & Primary Academic Sources

| Module ID | Subfolder on HF | Primary Source & DOI | Audited Scope & Partition Protocol |
| :--- | :--- | :--- | :--- |
| **01 PCOS Clinical** | `01_pcos_clinical` | Mendeley Data [`10.17632/tw34c7hv7z.1`](https://doi.org/10.17632/tw34c7hv7z.1) | $N=88$ patient profiles, 44 biomarkers (`pcos_clinical_cleaned.csv`, `11,919` bytes) |
| **02 PCOS Ultrasound** | `02_pcos_ultrasound` | Frontiers in Physiology [`10.3389/fphys.2025.1520898`](https://doi.org/10.3389/fphys.2025.1520898) | $N=299$ unique ovarian B-mode scans deduplicated via perceptual hash (pHash) |
| **03 Viral Skin Rash** | `03_viral_rash_grouped` | Mendeley Data MCVSLD [`10.17632/dfztdtfsxz.1`](https://doi.org/10.17632/dfztdtfsxz.1) | $10,384$ lesion crops partitioned across **755 source-photo families** (`0%` family leakage) |
| **04 Prescription OCR** | `04_prescription_ocr` | Mendeley Data Gazipur v2 [`10.17632/tg2hm7n2bs.2`](https://doi.org/10.17632/tg2hm7n2bs.2) | All `1,000` photos accounted (`697` train + `150` val + `152` test + `1` unannotated `0747`; `992` admissible, `8` quarantined) |
| **05 Bangla Voice ASR** | `05_bangla_voice_benchmark` | Google FLEURS `bn_in` [`arXiv:2205.12446`](https://arxiv.org/abs/2205.12446) | `26` human audio clips across `22` unique sentences & `22` speakers |
| **06 DermoPed Pediatric** | `06_dermoped_pediatric_crops` | Zenodo Record [`10.5281/zenodo.20829589`](https://doi.org/10.5281/zenodo.20829589) | Local subset: `22` patients (`19` Chickenpox + `3` Pediculosis = `656` lesion crops) |
| **07 Bilingual RAG Corpus** | Curated in-repo chunks | DGHS Bangladesh & WHO Guidelines | `14` approved bilingual clinical & platform documents (`35` chunk nodes indexed in BM25 + BGE-M3) |

---

## 3. Verified SHA-256 Audit Lock Ledger

All artifact hashes and reconciliation manifests are verified programmatically by [`verify_final_lock.py`](../SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/final_lock/verify_final_lock.py) and frozen in [`FINAL_AUDIT_SIGNOFF.md`](../SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/final_lock/FINAL_AUDIT_SIGNOFF.md):

- **PCOS Clinical Canonical CSV:** `01_PCOS_Clinical/data/processed/pcos_clinical_cleaned.csv` — `11,919` bytes — SHA-256: `3e38331357da3c4d4501f93e30bb4c5e5acbb3ee0eac23d50035d30b2c5a4661`
- **DermoPed Checkpoint `EXP_B`:** `44,790,027` bytes — SHA-256: `5a98479c66044e3a6ec244bad0133f0fd5a952e7123e53c567e2cdfe7ef348da`
- **DermoPed Checkpoint `EXP_D`:** `44,787,896` bytes — SHA-256: `e9ef59b4bc6de88db6cdf7dd78fe775386baf428fcb3e8bd7ba5a63171f8ee67`

---

## 4. Licensing, Privacy Governance & Takedown Policy

1. **Non-Diagnostic Research Use:** Datasets and benchmarks are published exclusively for academic evaluation and clinical AI safety testing — NOT for autonomous medical diagnosis or prescribing.
2. **Heuristic Privacy Protection:** Direct identifiers in clinical demos are replaced with synthetic personas or regex-masked tokens (`+880 17•• •••12`). Prescription images rely on upstream redactions by the Mendeley authors.
3. **Upstream License Preservation:** Upstream corpora (`01`–`06`) remain under their respective **CC BY 4.0** academic terms; derivative split scripts and audit ledgers created by ShasthoSetu AI follow MIT / open research attribution (with fair-use research disclaimers for web-scraped MCVSLD subsets).
4. **Notice & Takedown Procedure:** Any clinician, institution, or copyright holder requesting redaction or removal of an upstream record can open an issue on [`ashik123-a1/ShasthoSetu-AI`](https://github.com/ashik123-a1/ShasthoSetu-AI/issues) (see [`05_PRIVACY_AND_PUBLIC_RELEASE_RISKS.md`](HF_DATASET_PROVENANCE_AUDIT_01/05_PRIVACY_AND_PUBLIC_RELEASE_RISKS.md)).
