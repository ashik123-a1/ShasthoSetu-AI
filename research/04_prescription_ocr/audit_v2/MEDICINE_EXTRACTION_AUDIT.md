# 💊 ShasthoSetu AI — Medicine Extraction Audit & Clinical Entity Parsing (Audit V2)

**Audit Version:** 2.0.0  
**Date:** 2026-11-18  
**Scope:** Evaluation of Medication Entity Extraction, Ground-Truth Limitations, and Clinical Schema Parsing  

---

## 1. Audit of the 6.96% Medicine-Name Recall Metric

In the preliminary baseline report, a medication recall figure of **6.96%** was reported. Following rigorous audit, we formally classify this metric as an **Exploratory, Unvalidated Heuristic Estimate**.

### Why the 6.96% Metric Cannot Be Cited as a Certified Clinical NER Benchmark:
1. **Absence of Ground-Truth Entity Fields in Mendeley Data v2:**
   - The Mendeley dataset provides only two text columns: `description_english` and `description_bangla`.
   - There are **no verified ground-truth annotations** for isolated drug brand names, generic active ingredients, dosage forms, or schedules.
2. **Conflation of OCR Error with Regex Failure:**
   - The 6.96% figure was computed by running regular expressions against the *narrative English description* to guess drug names, and then searching for substrings in the raw OCR output.
   - If the annotator wrote *"The patient is prescribed an alternative injection"*, the regex would fail to resolve a drug name even if the OCR read the doctor's handwriting.
   - Conversely, if the doctor wrote *"Inj. Xgeva 120mg"* and OCR extracted `"Xgeva"`, but the regex failed to parse it from the reference sentence, it was falsely counted as an OCR omission.
3. **Formal Classification:**
   - Classification: `EXPLORATORY_HEURISTIC_ESTIMATE_UNVALIDATED`
   - Clinical Action: Excluded from official performance claims until physician-annotated token-level ground truth is established.

---

## 2. Experimental Structured Clinical Entity Extractor

To transition toward clinical utility without making dangerous automated assumptions, we implemented a structured parsing engine (`audit_v2/src/structured_medical_parser.py`) that maps OCR streams into formal clinical order objects.

### 2.1. Standardized Clinical Schema
Each detected prescription produces a structured document adhering to FHIR `MedicationRequest` principles:

```json
{
  "order_index": 1,
  "medicine_name": {
    "raw_extracted": "Cap Roxim 400",
    "confidence": 0.57,
    "provenance": "Regex-extracted from OCR token",
    "verification_status": "UNVERIFIED_REQUIRES_HUMAN_REVIEW"
  },
  "strength": {
    "raw_extracted": "400 mg",
    "confidence": 0.72,
    "provenance": "OCR numeric token",
    "verification_status": "UNVERIFIED_REQUIRES_HUMAN_REVIEW"
  },
  "dose": {
    "raw_extracted": "1 unit (provisional)",
    "confidence": 0.0,
    "provenance": "Unverified default",
    "verification_status": "UNVERIFIED_REQUIRES_HUMAN_REVIEW"
  },
  "frequency": {
    "raw_extracted": "১+০+১",
    "confidence": 0.61,
    "provenance": "OCR frequency pattern",
    "verification_status": "UNVERIFIED_REQUIRES_HUMAN_REVIEW"
  },
  "duration": {
    "raw_extracted": "UNRESOLVED",
    "confidence": 0.0,
    "provenance": "None",
    "verification_status": "UNVERIFIED_REQUIRES_HUMAN_REVIEW"
  },
  "route_of_administration": {
    "raw_extracted": "Oral",
    "confidence": 0.50,
    "provenance": "OCR route keyword",
    "verification_status": "UNVERIFIED_REQUIRES_HUMAN_REVIEW"
  }
}
```

### 2.2. Clinical Guardrail Enforcements
- **No Hallucinated Doses:** If a duration or frequency pattern is not found in the raw text, it is strictly assigned `"UNRESOLVED"` with confidence `0.0`.
- **Token Provenance:** Every field records the exact raw OCR text fragment from which it was extracted.
- **Fail-Safe Flag:** `actionable_reminder_allowed` is hardcoded to `False` for 100% of parsed records.

---

## 3. Road Map to Certified Clinical Entity Extraction

To establish true clinical validity in subsequent iterations:
1. **DGDA Pharmacopeia Integration:** Link extracted candidates to the 15,000+ approved brand names of the Directorate General of Drug Administration (DGDA) Bangladesh.
2. **Physician Token Annotation:** Have registered Bangladeshi physicians annotate 200 held-out prescriptions with exact bounding boxes for:
   - `[B-DRUG]`, `[I-DRUG]`
   - `[B-STRENGTH]`, `[I-STRENGTH]`
   - `[B-FREQUENCY]`, `[I-FREQUENCY]`
   - `[B-DURATION]`, `[I-DURATION]`
3. **Token-Level F1 Benchmark:** Compute strict Micro-F1 and Macro-F1 against physician annotations rather than substring heuristic search.
