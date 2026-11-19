# ShasthoSetu AI — BM25 Metric Root Cause & Programmatic Correction (`AI-QA-METRIC-LOCK-02`)

**Task ID:** `AI-QA-METRIC-LOCK-02`  
**Audit Date:** 2026-11-20  
**Status:** **`AI_QA_PASS_WITH_LIMITATIONS`** *(Agent-reconciled & locked against primary JSON/CSV; awaits independent owner verification)*  
**Verification Script:** [`services/api/evals/verify_rag_metric_lock_02.py`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/services/api/evals/verify_rag_metric_lock_02.py)  
**Locked Machine Outputs:** [`FINAL_RAG_METRICS.json`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/AI_QA_METRIC_LOCK_02/FINAL_RAG_METRICS.json) · [`RAG_PER_QUERY_VERIFIED_METRICS.csv`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/AI_QA_METRIC_LOCK_02/RAG_PER_QUERY_VERIFIED_METRICS.csv)  

---

## 1. Exact Root Cause Investigation From Primary Data

Owner review flagged an exact arithmetic discrepancy in the previously published 20-row table inside [`CORRECTED_RAG_METRICS.md`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/AI_QA_FIX_01/CORRECTED_RAG_METRICS.md) and [`RAG_EVALUATION_REPORT.md`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/AI_RAG_VOICE_OCR_01/RAG_EVALUATION_REPORT.md):
- **Summary row reported:** BM25 Hits@1 = **`16/20`** (`80.00%`), MRR = **`0.854167`** (`41/48`).
- **20-row Markdown table previously showed:** `17` rank-1 + `1` rank-3 (`MX-03`) + `1` rank-4 (`MX-04`) + `1` >5 (`BG-02`), summing to `(17 + 1/3 + 1/4)/20 = 0.879167` (`+0.5/20 = +0.025000`).

Direct inspection of BOTH primary benchmark JSON files confirms:
1. **`rag_benchmark_results.json` (`2026-11-19T17:54:25Z`, lines 863–906, query `EN-06`):**
   - Query: `"What does a doctor mean when writing b.i.d. or p.c. on a medical prescription?"`
   - Target Slug: `bangladesh-prescription-terminology`
   - Stored BM25 `top_5_slugs`: `["ultrasound-pcom-terminology-guide", "bangladesh-prescription-terminology", "medlineplus-consultation-preparation", "bangladesh-prescription-terminology", "medlineplus-general-lab-terms"]`
   - Stored BM25 `rank` = **`2`**, `hit_at_1` = **`false`**, `hit_at_3` = **`true`**, `hit_at_5` = **`true`**, reciprocal rank = `1/2 = 0.5000`.
2. **`pre_fix_rag_benchmark_results.json` (`2026-11-19T15:59:18Z`, preserved untouched):**
   - Already scored `EN-06` at BM25 rank **`2`** (`["ultrasound-pcom-terminology-guide", "bangladesh-prescription-terminology", "medlineplus-consultation-preparation"]`).
3. **Why the Contradiction Occurred (`ISS-013`):**
   - The Python evaluator and `rag_benchmark_results.json["modes_summary"]` were **correct all along** (`16` rank-1 + `EN-06` rank `2` + `MX-03` rank `3` + `MX-04` rank `4` + `BG-02` `>5`).
   - During `AI-QA-FIX-01`, the 20-row ranking table in `CORRECTED_RAG_METRICS.md` was manually transcribed into Markdown and mistyped `EN-06` BM25 as `1 (1.000)` instead of **`2 (0.5000)`**, and that single typo was copied into `RAG_EVALUATION_REPORT.md`.

---

## 2. Programmatically Generated Summary Metrics (`N = 20` Medical Queries)

*(All retrieval quality columns cover the **20 `MEDICAL` queries**; safety probes `N = 6` are excluded. Both `N = 20` medical query latency and `N = 26` all-query latency reported in `modes_summary` are shown separately.)*

| Retrieval Strategy | Hits@1 / 20 | Hits@3 / 20 | Hits@5 / 20 | Recall@1 | Recall@3 | Recall@5 | MRR (Exact Rational = Float) | Med N=20 Avg Latency (ms) | All N=26 Avg / P95 Latency (ms) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Dense Only (`bge-m3`, 1024-d)** | 18 / 20 | 20 / 20 | 20 / 20 | 90.00% | 100.00% | 100.00% | `19/20` = 0.950000 | 236.17 ms | 215.92 / 171.75 ms |
| **BM25 Only (`BM25Okapi`)** | 16 / 20 | 18 / 20 | 19 / 20 | 80.00% | 90.00% | 95.00% | **`41/48` = 0.854167** | 2.57 ms | 2.62 / 3.02 ms |
| **Hybrid RRF (Dense + BM25, $k=60$)** | 19 / 20 | 20 / 20 | 20 / 20 | 95.00% | 100.00% | 100.00% | **`39/40` = 0.975000** | 140.51 ms | 141.88 / 150.42 ms |

---

## 3. Programmatically Generated Query-by-Query Table (`N = 20` Medical Queries)

| ID | Lang | Query Text | Target Source Slug | Dense Rank (RR) | BM25 Rank (RR) | Hybrid Rank (RR) |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| `BN-01` | `bn` | পিসিওএস (PCOS) কী এবং এর সাধারণ লক্ষণগুলো কী কী? | `who-medlineplus-pcos-education` | 1 (`1.0000`) | 1 (`1.0000`) | **1 (`1.0000`)** |
| `BN-02` | `bn` | আল্ট্রাসাউন্ড রিপোর্টে PCOM বলতে কী বোঝায়? | `ultrasound-pcom-terminology-guide` | 1 (`1.0000`) | 1 (`1.0000`) | **1 (`1.0000`)** |
| `BN-03` | `bn` | হাম বা হামের র‍্যাশ হলে শিশুদের কী ধরনের যত্ন নিতে হবে? | `who-cdc-measles-viral-rash` | 1 (`1.0000`) | 1 (`1.0000`) | **1 (`1.0000`)** |
| `BN-04` | `bn` | বাংলাদেশে সম্প্রসারিত টিকাদান কর্মসূচি (EPI) কার্ডে কোন কোন টিকা থাকে? | `dghs-unicef-pediatric-health-epi` | 1 (`1.0000`) | 1 (`1.0000`) | **1 (`1.0000`)** |
| `BN-05` | `bn` | ওষুধ খাওয়ার সঠিক নিয়ম এবং ওটিসি ড্রাগ ব্যবহারে কী সতর্কতা অবলম্বন করতে হয়? | `who-medication-literacy-safety` | 1 (`1.0000`) | 1 (`1.0000`) | **1 (`1.0000`)** |
| `BN-06` | `bn` | গর্ভাবস্থায় প্রসবপূর্ব সেবা (ANC) কেন জরুরি? | `who-maternal-healthcare-education` | 1 (`1.0000`) | 1 (`1.0000`) | **1 (`1.0000`)** |
| `EN-01` | `en` | What are the common clinical signs and endocrine features of PCOS? | `who-medlineplus-pcos-education` | 1 (`1.0000`) | 1 (`1.0000`) | **1 (`1.0000`)** |
| `EN-02` | `en` | What does PCOM appearance mean on a pelvic ultrasound scan? | `ultrasound-pcom-terminology-guide` | 1 (`1.0000`) | 1 (`1.0000`) | **1 (`1.0000`)** |
| `EN-03` | `en` | What is the typical progression and rash appearance of measles in children? | `who-cdc-measles-viral-rash` | 1 (`1.0000`) | 1 (`1.0000`) | **1 (`1.0000`)** |
| `EN-04` | `en` | What questions should a patient prepare before seeing a specialist doctor? | `medlineplus-consultation-preparation` | 1 (`1.0000`) | 1 (`1.0000`) | **1 (`1.0000`)** |
| `EN-05` | `en` | Who is eligible to donate whole blood and what are the mandatory interval periods? | `who-blood-donation-safety` | 1 (`1.0000`) | 1 (`1.0000`) | **1 (`1.0000`)** |
| `EN-06` | `en` | What does a doctor mean when writing b.i.d. or p.c. on a medical prescription? | `bangladesh-prescription-terminology` | 1 (`1.0000`) | **2 (`0.5000`)** | **1 (`1.0000`)** |
| `BG-01` | `banglish` | PCOS er symptoms ki ki ar kibhabe bujhte parbo? | `who-medlineplus-pcos-education` | 1 (`1.0000`) | 1 (`1.0000`) | **1 (`1.0000`)** |
| `BG-02` | `banglish` | Bachar shorire lal rash uthle ki kora uchit? | `who-cdc-measles-viral-rash` | 2 (`0.5000`) | **>5 (`0.0000`)** | **1 (`1.0000`)** |
| `BG-03` | `banglish` | Ultrasound report e PCOM dekhale ki pregnancy te shomoshya hoy? | `ultrasound-pcom-terminology-guide` | 1 (`1.0000`) | 1 (`1.0000`) | **1 (`1.0000`)** |
| `BG-04` | `banglish` | Rokto daan korar por ki ki niyom mene cholte hoy? | `who-blood-donation-safety` | 1 (`1.0000`) | 1 (`1.0000`) | **1 (`1.0000`)** |
| `MX-01` | `mixed` | আমার pelvic ultrasound report-এ PCOM লেখা আছে, what does it actually indicate? | `ultrasound-pcom-terminology-guide` | 1 (`1.0000`) | 1 (`1.0000`) | **1 (`1.0000`)** |
| `MX-02` | `mixed` | PCOS diagnosis এর জন্য doctor সাধারণত কী কী blood test suggest করেন? | `who-medlineplus-pcos-education` | 1 (`1.0000`) | 1 (`1.0000`) | **1 (`1.0000`)** |
| `MX-03` | `mixed` | Baby er fever 102 degree এবং high rash উঠেছে, should I go to the hospital? | `who-cdc-measles-viral-rash` | 2 (`0.5000`) | **3 (`0.3333`)** | **2 (`0.5000`)** |
| `MX-04` | `mixed` | Doctor prescription-এ TDS আর post-meal লিখেছেন, এর exact meaning কী? | `bangladesh-prescription-terminology` | 1 (`1.0000`) | **4 (`0.2500`)** | **1 (`1.0000`)** |

---

## 4. Exact Rational & Decimal Verification Formulas

- **Dense (`N = 20`):** $18$ at rank 1 (`BN-01..EN-06`, `BG-01`, `BG-03..MX-02`, `MX-04`) + $2$ at rank 2 (`BG-02`, `MX-03`)
  $$\text{MRR}_{\text{Dense}} = \frac{18 \times 1 + 2 \times \frac{1}{2}}{20} = \frac{19}{20} = \mathbf{0.950000}, \quad \text{Hits@1} = \frac{18}{20} = \mathbf{90.00\%}$$
- **BM25 (`N = 20`):** $16$ at rank 1 + `EN-06` at rank 2 + `MX-03` at rank 3 + `MX-04` at rank 4 + `BG-02` outside top-5 (`0`)
  $$\text{MRR}_{\text{BM25}} = \frac{16 + \frac{1}{2} + \frac{1}{3} + \frac{1}{4} + 0}{20} = \frac{205/12}{20} = \frac{41}{48} = \mathbf{0.854167}, \quad \text{Hits@1} = \frac{16}{20} = \mathbf{80.00\%}$$
- **Hybrid RRF (`N = 20`):** $19$ at rank 1 + `MX-03` at rank 2
  $$\text{MRR}_{\text{Hybrid}} = \frac{19 \times 1 + 1 \times \frac{1}{2}}{20} = \frac{39}{40} = \mathbf{0.975000}, \quad \text{Hits@1} = \frac{19}{20} = \mathbf{95.00\%}$$

---

## 5. Separated Safety Probes (`N = 6`) & Preserved Subsystems

- **Separated Safety Probes (Excluded from Retrieval MRR/Recall):** `EM-01` & `EM-02` (`EMERGENCY`, target `bd-999-emergency-warnings` verified in [`RAG_CITATION_PROVENANCE_AUDIT.csv`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/AI_QA_FIX_01/RAG_CITATION_PROVENANCE_AUDIT.csv); both `rank = null` in retrieval scoring), `UN-01` & `UN-02` (`UNANSWERABLE`), `INJ-01` & `INJ-02` (`INJECTION`).
- **Provenance Slug Integrity:** All `20` `MEDICAL` targets + `2` `EMERGENCY` targets match slugs in [`RAG_CITATION_PROVENANCE_AUDIT.csv`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/docs/AI_QA_FIX_01/RAG_CITATION_PROVENANCE_AUDIT.csv) (14 approved sources, 35 chunks: 11 `FIRST_PARTY_SYNTHESIZED_SUMMARY` + 3 `FIRST_PARTY_PLATFORM_DOC`).
- **Automated Regression Prevention:** [`eval_rag.py`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/services/api/evals/eval_rag.py) now runs `validate_rag_payload_consistency()` before saving output and renders its per-query Markdown table programmatically; [`test_rag_metric_lock_02.py`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/services/api/tests/test_rag_metric_lock_02.py) parses all 3 Markdown report tables to enforce zero drift.
- **Unchanged Accepted Subsystems:** Reconciled OCR (`N=4` synthetic printed: `TP=7, FP=2, FN=0, P=77.78%, R=100.00%, F1=87.50%`; handwritten `NOT VALIDATED`) and Voice (`N=18` reconciled WAV hashes & predictions; Human BN `Smoke_Test_6` `45.56%` Sample-Avg Raw WER / `45.33%` Corpus) were preserved untouched.
