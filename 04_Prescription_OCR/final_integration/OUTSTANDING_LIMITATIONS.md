# ⚠️ ShasthoSetu AI — Outstanding Limitations & Research Boundaries

**Document Version:** 3.0.0 (Final Integration Phase)  
**Date:** 2026-11-18  
**Module:** `04_Prescription_OCR`  

---

## 1. Ground-Truth & Dataset Limitations (Mendeley Data v2)

1. **Narrative Reference Text vs Verbatim Transcription:**
   - The primary limitation of the 1,000-prescription Mendeley dataset is that its reference text is composed of **narrative clinical explanations**, not literal character-by-character visual transcriptions.
   - Standard OCR CER/WER metrics measure semantic narrative alignment rather than genuine character recognition accuracy.
2. **Absence of Token-Level Bounding Boxes:**
   - The dataset provides no bounding-box coordinates linking individual drug names, dosages, or durations to physical image coordinates.
   - Supervised fine-tuning of recognition heads (e.g. TrOCR or CRNN) cannot be performed responsibly without token or line crops; inventing pseudo-boxes would introduce label noise.
3. **Clerical & Duplicate Imperfections in Raw Data:**
   - As documented in the Quarantine Consistency Report, 8 samples required quarantine due to omitted rows, comma typos, or duplicate image files with conflicting descriptions (`0729`/`0775`).

---

## 2. Model & Algorithmic Limitations

1. **Pre-trained Off-the-Shelf OCR Weights:**
   - Neither Baseline v1 nor Enhanced v2 utilizes fine-tuned weights. EasyOCR's recognition head was trained on scene text and printed typography, which inherently struggles on cursive Bengali and Latin doctor handwriting.
2. **Uncertainty & Low Confidence on Cursive Script:**
   - Mean recognition confidence on physician handwriting remains low (~33.2%), necessitating a 100% human-in-the-loop review policy.
3. **Rule-Based Clinical Entity Extraction:**
   - Entity extraction currently uses regex heuristics. Without a formal Clinical Named Entity Recognition (NER) model and live trie-based lexicon lookup against the DGDA Bangladesh drug directory, non-standard abbreviations can be missed.

---

## 3. High-Priority Next Steps & Better Dataset Alternative

### Alternative Dataset: 200 Bounding-Box Prescription Corpus
As identified during research review, Mendeley Data hosts an alternative Bangladeshi dataset comprising **200 prescription images with explicit medicine-name region bounding-box annotations**:
- **Advantage:** Provides precise spatial ground truth for drug name regions.
- **Strategic Direction:** This dataset will be evaluated separately (without blind merging) to train a dedicated Medicine Detection model (e.g. YOLO-v11 or TrOCR crop recognizer).

### Roadmap to Clinical Deployment:
1. **DGDA Pharmacopeia Trie-Search:** Connect candidate recognition to the 15,000+ approved commercial drug brands in Bangladesh.
2. **Vision-Encoder-Decoder Modeling:** Evaluate end-to-end document transformers (`naver-clova-ix/donut-base`) mapping full prescription scans to JSON without cascading detection errors.
3. **Field Piloting in Gazipur:** Deploy the Human-in-the-Loop Assistive Portal to Community Health Workers for pilot user-acceptance testing.
