# ShasthoSetu AI — Corrected Bilingual Prescription OCR Metrics (`AI-QA-FIX-01`)

**Audit Date:** 2026-11-19  
**OCR Pipeline:** [`services/api/src/shasthosetu_api/services/ocr_service.py`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/services/api/src/shasthosetu_api/services/ocr_service.py)  
**Benchmark Script:** [`services/api/evals/eval_ocr.py`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/services/api/evals/eval_ocr.py)  
**Primary JSONs:** [`pre_fix_ocr_benchmark_results.json`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/evidence/AI_RAG_VOICE_OCR_01/pre_fix_ocr_benchmark_results.json), [`ocr_benchmark_results.json`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/evidence/AI_RAG_VOICE_OCR_01/ocr_benchmark_results.json)  

---

## 1. Root Cause of the Invalid `128.6%` / `150%` Recall Bug

Independent QA review flagged two critical defects in the initial OCR benchmark report:
1. **Unbounded Ratio Bug (`total_candidates_found / total_candidates_expected`):** `eval_ocr.py` line 248 previously divided total predicted strings (including unaligned dosage/duration continuation lines that produced False Positives) by expected medicine count (`9 / 7 = 128.57%`). In the prior `RX-EN-01` sample, 4 predicted strings (`2` medicines + `2` dosage lines) divided by `2` expected medicines produced an invalid candidate count ratio (`200%`), while the markdown report separately hallucinated non-existent sample rows (`clean_printed`, `skewed_15deg`) with `150%` recall.
2. **Parser Bugs Fixed in `ocr_service.py`:**
   - Bengali medicine prefixes (`টযাব`, `কযাপ`) failed `_MED_LINE_RE`, so `RX-BN-01` dropped both medicine lines and emitted only the `মাত্রা:` lines (`TP=0, FP=2, FN=2`).
   - `extract_structured_medicine_candidates` initialized `seen_lines` without ever checking `if idx in seen_lines: continue`!

---

## 2. Reconciled Entity Matching: Pre-Fix Baseline vs. Post-Fix Engine (`N = 4` Synthetic Printed Samples)

Entity evaluation uses strict **1-to-1 greedy matching** (`match_medicine_entities` in `eval_ocr.py`, normalized drug token match / `SequenceMatcher >= 0.55`), guaranteeing $\text{Recall} = \frac{\text{TP}}{\text{TP}+\text{FN}} \le 100.0\%$:

### 2.1 Micro Summary Across `N = 4` Synthetic Printed Images (`7` Expected Medicines)

| Run Version | Mean CER | Mean WER | Total Expected | TP | FP | FN | Precision | Recall | F1 Score |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Pre-Fix Baseline** *(recomputed from `pre_fix_ocr_benchmark_results.json`)* | 12.94% | 49.31% | 7 | 5 | 4 | 2 | **55.56%** | **71.43%** | **62.50%** |
| **Post-Fix Engine** *(verified run after `ocr_service.py` fix)* | 12.94% | 49.31% | 7 | **7** | **2** | **0** | **77.78%** | **100.00%** | **87.50%** |

### 2.2 Per-Sample Entity Breakdown (Post-Fix Primary Output)

| Sample ID | Script | Condition | CER | WER | Expected Medicines | TP / FP / FN | Precision | Recall | F1 | Matched Pairs & False Positives |
| :--- | :--- | :--- | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| `RX-BN-01` | Bengali | Clean High Contrast (`Nirmala.ttf`) | 21.43% | 59.09% | `মেটফরমিন`, `ওমেপ্রাজল` | **2 / 0 / 0** *(was 0/2/2)* | 100.0% | 100.0% | 100.0% | `টযাব মটেফরমনি...`, `কযাপ ওমপেরাজল...` |
| `RX-EN-01` | English | Clean High Contrast (`arial.ttf`) | 5.52% | 28.00% | `Paracetamol`, `Azithromycin` | **2 / 2 / 0** | 50.0% | 100.0% | 66.7% | **FP (2):** `"tablet TDS after meals (5 days)"`, `"tablet daily before dinner 3 days)"` *(EasyOCR dropped `"1"`, causing `"tablet"` regex trigger on Dose lines)* |
| `RX-MIX-01` | Mixed | Codeswitching Clinical Style | 9.09% | 40.91% | `Metformin`, `Rosuvastatin` | **2 / 0 / 0** | 100.0% | 100.0% | 100.0% | `Tab Metformin...`, `Tab Rosuvastatin...` |
| `RX-DEG-01` | Mixed | Low Contrast (40% blend) | 15.73% | 69.23% | `Pantoprazole` | **1 / 0 / 0** | 100.0% | 100.0% | 100.0% | `Tab Pantoprazole 40mg` |

*Latency note:* Post-fix `avg_latency_ms = 1,587.48 ms` (weighted by cold EasyOCR model load on first image `RX-BN-01` = 5,752.78 ms; subsequent 3 samples averaged **199.0 ms**). Pre-fix warm average was 944.77 ms.

---

## 3. Real Handwritten Prescription Boundary (`0052.jpg` Read-Only Smoke Test)

- **File Path:** `04_Prescription_OCR/data/raw/extracted/images/Prescription_ images.jpg/0052.jpg` (previously pointed to a non-existent path in `eval_ocr.py`, yielding `null` in the pre-fix JSON!).
- **Smoke Output (Post-Fix):**
  - `mean_confidence`: **59.29%**
  - `token_count`: **44** (`28` flagged uncertain `< 0.75` confidence)
  - `candidates_count`: **7** provisional lines
  - `latency_ms`: **884.17 ms**
- **Explicit Limitation:** No verbatim line-by-line transcription ground truth exists for the Mendeley `04_Prescription_OCR` dataset (which provides clinical narrative summaries rather than token-aligned ground truth). Therefore:
  - **Real handwritten prescription CER, WER, Precision, Recall, and F1 are NOT VALIDATED.**
  - Clean synthetic printed metrics (`12.94%` CER, `87.50%` F1) must **never** be presented as real clinical handwriting accuracy.
  - Because genuine prescriptions show high token uncertainty (`28/44` uncertain tokens on `0052.jpg`), mandatory human review and clinician authorization gates are clinically essential.
