# 📊 ShasthoSetu AI — Final Scientific Evaluation & Metric Governance Report

**Document Version:** 3.0.0 (Final Integration Phase)  
**Date:** 2026-11-18  
**Module:** `04_Prescription_OCR`  
**Evaluation Scope:** Scientific Reclassification of Metrics, Ground-Truth Nature, and Development Architecture Comparison  

---

## 1. Executive Summary & Scientific Reclassification

In previous exploratory stages (Experiment 1 and Audit V2), optical character recognition outputs were compared against the Mendeley Data Version 2 text annotations using standard Character Error Rate (CER) and Word Error Rate (WER).

Following forensic audit, we establish a vital scientific correction:

> [!IMPORTANT]
> **Scientific Reclassification of Metrics:**  
> The ground-truth reference text in Mendeley Data v2 consists of **narrative clinical translations/summaries** (e.g. *"Anuva 50 tablet should be taken once in the morning and once at night..."*), **NOT verbatim transcriptions of the visual characters on the physical prescription**.  
> Therefore, comparing OCR output against these narrative sentences does **NOT** measure raw optical character recognition accuracy or handwriting transcription fidelity.  
> We formally reclassify these metrics as:
> - **`OCR-to-Narrative Text Mismatch Rate`** (formerly reported as CER)
> - **`OCR-to-Narrative Word Mismatch Rate`** (formerly reported as WER)
> - **`Narrative Alignment Error Rate`**

True handwriting recognition CER/WER requires a character-for-character transcription of the physical ink marks (e.g. `"Tab. Anuva 50 1+0+1"`). The reported numbers reflect the semantic and orthographic distance between raw visual handwriting extraction and synthetic clinical prose.

---

## 2. Held-Out Test Evaluation Benchmark (Admissible Test Split: $N=149$)

Evaluated on the 149 strictly admissible, non-quarantined test prescriptions (excluding quarantined IDs `0186`, `0756`, `0757`):

| Evaluation Dimension | Reference Target | Metric Formal Name | Measured Value | Scientific Interpretation |
| :--- | :--- | :--- | :---: | :--- |
| **English Corpus Mismatch** | English Narrative Summary | **Corpus OCR-to-Narrative Text Mismatch** | **0.9669** | Aggregated Levenshtein edit distance over total corpus reference characters |
| **English Corpus NFC Mismatch** | NFC Normalized English | **Corpus NFC Text Mismatch** | **0.9682** | Verifies unicode normalization impact |
| **English Word Mismatch** | English Narrative Summary | **Corpus OCR-to-Narrative Word Mismatch** | **1.1708** | Exceeds 1.0 due to high insertion penalties of boilerplate English grammar |
| **Bangla Corpus Mismatch** | Bangla Narrative Summary | **Corpus Bangla Text Mismatch** | **1.0334** | Measures mismatch against Bengali narrative sentences |
| **Bangla Corpus NFC Mismatch** | NFC Normalized Bangla | **Corpus Bangla NFC Text Mismatch** | **1.0336** | Unicode NFC normalization across Bengali glyphs |
| **Bangla Word Mismatch** | Bangla Narrative Summary | **Corpus Bangla Word Mismatch** | **1.2689** | Word-level mismatch against Bengali narrative |
| **Exact Match Rate** | Both Languages | **Exact Sequence Match** | **0.00% (0 / 149)** | Zero prescriptions matched narrative prose verbatim |
| **Confidence vs Error Correlation** | English Mismatch Rate | **Pearson Correlation ($r$)** | **+0.0753 ($p=0.361$)** | **No linear correlation.** High confidence does NOT guarantee correctness |

### Granular Per-Prescription Distribution (English Mismatch)
- **Mean:** 1.184 (macro-average of per-page ratios)
- **Median ($p_{50}$):** 0.868
- **25th Percentile ($p_{25}$):** 0.742
- **75th Percentile ($p_{75}$):** 1.215
- **90th Percentile ($p_{90}$):** 1.840

---

## 3. Development Split Architecture Comparison ($N=35$ Validation Subset)

To explore pipeline enhancements responsibly, experiments were conducted **strictly on a 35-image development subset of the Validation Split**, keeping the held-out Test split pure and uncompromised.

### ⚠️ Clarification on Model Fine-Tuning
**Neither pipeline was newly fine-tuned.** Both utilize pre-trained off-the-shelf EasyOCR weights. The improvements arise from:
1. Contrast-Limited Adaptive Histogram Equalization (CLAHE) + bilateral edge-preserving smoothing.
2. 2D topological reading-order line grouping (clustering bounding boxes top-to-bottom, left-to-right).
3. Tuned CRAFT detector thresholds (`text_threshold=0.6`, `link_threshold=0.3`, `low_text=0.3`).

### Comparison Table

| Metric | Pipeline 1: Baseline v1 (Raw) | Pipeline 2: Enhanced v2 (Optimized) | Percentage-Point Difference | Relative Improvement |
| :--- | :---: | :---: | :---: | :---: |
| **Mean Validation Mismatch (CER)** | 0.9257 | **0.8804** | **-0.0453 (-4.53 pp)** | **-4.89% relative reduction** |
| **Median Validation Mismatch (CER)** | 0.8694 | **0.8353** | **-0.0341 (-3.41 pp)** | **-3.92% relative reduction** |
| **Mean Validation Word Mismatch (WER)** | 1.0902 | **1.0337** | **-0.0565 (-5.65 pp)** | **-5.18% relative reduction** |
| **Mean Inference Latency** | 0.727 seconds | **0.607 seconds** | **-0.120 seconds** | **16.5% faster throughput** |
| **Mean Detected Boxes** | 41.86 boxes | **34.46 boxes** | **-7.40 boxes** | **17.7% reduction in noise boxes** |

> [!NOTE]
> These performance improvements represent validation development tuning on 35 images. They demonstrate that pre-processing and reading-order sorting structure the extracted text into coherent lines for downstream parsing, but do not replace the fundamental need for domain-specific fine-tuning on handwritten clinical scripts.

---

## 4. Status of Medicine-Brand Recall Metric

The previously reported 6.96% medicine-name recall is formally cataloged as:
- **Classification:** `EXPLORATORY_HEURISTIC_ESTIMATE_UNVALIDATED`
- **Methodology:** Substring regex search against narrative sentences.
- **Limitation:** Conflates OCR recognition errors with grammatical parsing omissions.
- **Standard of Truth:** Certified clinical NER recall will be evaluated only when token-level bounding-box ground truth is curated by licensed clinicians.
