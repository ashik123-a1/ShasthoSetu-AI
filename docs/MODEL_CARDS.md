# ShasthoSetu AI — Model Cards & Clinical AI Governance

This registry documents **both** the conversational LLM/Speech foundation stack AND all **6 audited clinical ML/DL research prototypes** evaluated inside ShasthoSetu AI.

---

## 1. Conversational LLM, Embedding & Speech Foundation Models

### Model M01: `qwen2.5:7b` (Alibaba Cloud via Ollama)
- **Role:** Primary Bilingual Clinical Triage & Grounded RAG Synthesizer (`en`, `bn`, `banglish`)
- **Inference Runtime:** Local Ollama HTTP API (`127.0.0.1:11434`, `8,192` token context)
- **Safety Policy:** Wrapped in deterministic `safety_guard.py` prompt-injection (`0.1 ms` block), Code 999 emergency intercept, and non-prescribing output filters.
- **Retrieval Synergy:** Grounded by Hybrid RRF (`MRR 0.9750`, `Recall@1 95.00%`, `Recall@3 100.00%`).

### Model M02: `bge-m3` (BAAI Dense Multilingual Embedder)
- **Role:** 1,024-dimensional dense semantic vector indexing for clinical guidelines in `rag_engine.py` (`FAISS` index)
- **Standalone Retrieval (`N=20` Medical Queries):** `Recall@1 90.00%`, `Recall@3 100.00%`, `MRR 0.9500`

### Model M03: `anuragshas/whisper-small-bn` + `openai/whisper-base` (Bilingual ASR Routing)
- **Role:** Speech-to-Text clinical note drafting with mandatory human-editable confirmation gate
- **Audited Benchmarks (`voice_eval_table.md`):**
  - Frozen `26` FLEURS BN clips (`22` speakers): Norm WER **`39.09%`**, Bengali Unicode Integrity **`98.37%`**
  - `Smoke_Test_6`: Sample-Avg Raw WER **`45.56%`** (Human Bengali FLEURS) · **`8.39%`** (SAPI5 EN Clinical) · **`48.24%`** (SAPI5 Mixed Code-Switch)
- **Boundary:** Never auto-submits raw transcription directly as final medical orders.

### Model M04: `qwen3.8-27b-uncensored:latest` (Red-Team Guardrail Baseline)
- **Role:** Offline adversarial stress-test model validating fail-closed safety defenses (`safety_guard.py`) against jailbreak & unauthorized prescribing prompts.

---

## 2. Six Audited Clinical Research ML/DL Prototypes (`FINAL_AUDIT_SIGNOFF.md`)

All 6 clinical models operate strictly as **non-diagnostic research prototypes** subject to human verification:

| Model ID | Task & Architecture | Reproducible Code | Verified Metric | Critical Limitations & Guardrails |
| :--- | :--- | :--- | :--- | :--- |
| **`M01-XGB-01`** | PCOS Clinical Biomarker Classifier (`XGBoost`) | [`../research/01_pcos_clinical/`](../research/01_pcos_clinical) | Held-out Bal Acc: **94.44%** (`17/18`) · 50-Fold CV: **88.57%** | $N=88$ Mendeley cohort (`11,919` B, SHA-256 locked); proxy biomarkers only. |
| **`M02-RESNET-01`** | PCOS Ovarian Ultrasound (`ResNet-18`) | [`../research/02_pcos_ultrasound/`](../research/02_pcos_ultrasound) | Held-out Test Acc: **86.67%** (`39/45`) | Grouped via perceptual hash (pHash); enforces grayscale B-mode domain guard. |
| **`M03-RESNET-GROUPED`** | 6-Class Viral Rash (`ResNet-18`) | [`../research/03_viral_rash_grouped/`](../research/03_viral_rash_grouped) | Val Img Acc: **84.65%**, F1: **84.22%** · Test Family: **85.09%** | Partitioned by `755` source-photo families (`0%` leak); older `99.10%` model quarantined. |
| **`M04-EASYOCR-PIPE`** | Bilingual Rx Token Triage (`EasyOCR 1.7.2`) | [`../research/04_prescription_ocr/`](../research/04_prescription_ocr) | Printed ($N=4$): **87.50% F1** · Smoke `0052.jpg`: **44 tokens** (`59.3%` conf) | Handwritten CER/WER **`NOT_VALIDATED`**; triggers **`HTTP 422`** until confirmed. |
| **`M05-WHISPER-BN`** | Bangla Voice Clinical Triage ASR | [`../research/05_bangla_voice_ai/`](../research/05_bangla_voice_ai) | `26` FLEURS: **39.09% Norm WER**, **98.37% BN Unicode** | General-domain speech; requires editable transcript confirmation. |
| **`M06-DERMOPED-EXP`** | Pediatric Lesion (`ResNet-18 EXP_B / EXP_D`) | [`../research/06_dermoped_pediatric_skin/`](../research/06_dermoped_pediatric_skin) | Test Img Acc (`EXP_B`): **92.73%** | `22`-patient subset (`19` Chickenpox, **only `3` Pediculosis**); architectural PoC only + chrominance check. |
