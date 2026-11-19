# ShasthoSetu AI — Corrected Bilingual Prescription OCR Benchmark Report

**Evaluation Date:** 2026-11-19T17:48:33Z  
**OCR Engine:** EasyOCR 1.7.2 (`['bn', 'en']`) + Line-Clustering Post-Processor  
**Scope Boundary:** `N = 4` synthetic printed prescriptions (`Nirmala.ttf` / `arial.ttf`, 7 expected medicine entities) reported strictly separately from the unannotated real prescription smoke test (`0052.jpg`). **Real handwritten prescription OCR accuracy is NOT validated.**

## Quantitative Summary (Synthetic Printed Prescriptions, N = 4)

- **Mean Character Error Rate (CER):** 12.94%
- **Mean Word Error Rate (WER):** 49.31%
- **Entity Matching (Micro):** **TP = 7**, **FP = 2**, **FN = 0** (out of 7 expected medicines)
- **Precision:** **77.78%**
- **Recall:** **100.00%** (bounded mathematically $\le 100\%$)
- **F1 Score:** **87.50%**
- **Average Processing Latency:** 1587.5 ms

## Per-Sample Evaluation Breakdown (Synthetic Printed)

| Sample ID | Script | Condition | CER | WER | Expected | TP / FP / FN | Precision | Recall | F1 | Latency |
|---|---|---|---|---|---|---|---|---|---|---|
| `RX-BN-01` | Bengali | Clean High Contrast | 21.43% | 59.09% | 2 | 2 / 0 / 0 | 100.0% | 100.0% | 100.0% | 5752.8 ms |
| `RX-EN-01` | English | Clean High Contrast | 5.52% | 28.00% | 2 | 2 / 2 / 0 | 50.0% | 100.0% | 66.7% | 244.1 ms |
| `RX-MIX-01` | Mixed (Bangla + English) | Codeswitching Clinical Style | 9.09% | 40.91% | 2 | 2 / 0 / 0 | 100.0% | 100.0% | 100.0% | 225.0 ms |
| `RX-DEG-01` | Mixed (Bangla + English) | Low Contrast & Slight Blur | 15.73% | 69.23% | 1 | 1 / 0 / 0 | 100.0% | 100.0% | 100.0% | 128.0 ms |

### Read-Only Unannotated Clinical Smoke Test (`0052.jpg`)
- **File:** `04_Prescription_OCR\data\raw\extracted\images\Prescription_ images.jpg\0052.jpg` (Genuine clinical image, read-only)
- **Ground Truth Available:** `False` (Mendeley summaries are NOT verbatim transcription truth; no handwritten CER/WER claimed)
- **Mean Token Confidence:** 59.3% (44 tokens, 28 uncertain)
- **Provisional Candidates Detected:** 7
- **Latency:** 884.2 ms
