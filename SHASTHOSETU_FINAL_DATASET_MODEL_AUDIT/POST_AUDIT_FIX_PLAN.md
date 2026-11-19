# ShasthoSetu AI — Post-Audit Research Action & Fix Plan
**Project:** ShasthoSetu AI — Multimodal Clinical Healthcare Platform  
**Auditor:** Senior ML Research Auditor  
**Audit Date:** November 18, 2026  
**Scope:** Research, Datasets, Checkpoints, and Documentation Fixes ONLY (No UI or Feature Development)  

---

## 1. Executive Mandate

This action plan defines the prioritized, evidence-based research corrections required to align all project documentation, experiment archives, and model checkpoints with the certified findings of the Master Dataset & Model Audit.

In strict compliance with user instructions:
- **NO UI, Dashboard, Login, Payment, Support, or Feature Development tasks are included.**
- **NO new model training is scheduled.**
- All recommended actions focus exclusively on data governance, scientific reporting, and experimental integrity.

---

## 2. Prioritized Action Plan

### Priority 1: Documentation & Metric Claims Synchronization (Immediate)
- **Target Files:**
  - `_reports/MASTER_EXPERIMENT_REPORT.md`
  - `_reports/consolidated_metrics.json`
  - `03_Measles_Viral_Rash/README.md`
  - `04_Prescription_OCR/README.md`
  - `05_Bangla_Voice_AI/README.md`
- **Actions:**
  1. **Synchronize Measles Metrics:** Permanently replace legacy 99.10% claims with the verified **Grouped ResNet18 metrics (84.65% Validation Image Accuracy, 85.84% Family Accuracy)**. Clearly designate the historical 99.10% split as `HISTORICAL_CONTAMINATED_ARCHIVE`.
  2. **Synchronize OCR Reporting:** Retract isolated claims of "100% medication recall". Update primary summary to report **96.69% English CER, 103.34% Bangla CER, and 92.11% safety-gate quarantine rate**, noting that the 100% recall was an exploratory single-image demonstration (`0974.jpeg`).
  3. **Synchronize Voice ASR Reporting:** Update Bengali Voice AI from "Untrained / Inactive" to **`BENGALI_MODEL_IMPROVED`** with verified checkpoint `anuragshas/whisper-small-bn` (98.37% Bengali Unicode, 39.09% normalized WER, 13.44% CER on FLEURS, clinical term recall marked `N/A`).
  4. **Synchronize DermoPed Champion:** Confirm EXP_B (Val Macro F1 = 57.76%) as the genuine champion and document the $n=3$ Pediculosis patient limitation.

---

### Priority 2: Infrastructure & Cache Environment Hardening
- **Target Files:**
  - `_shared/` environment scripts
  - `demo/app.py` environment setup
- **Actions:**
  1. **Hardcode Drive `G:` Cache Path:** Set `HF_HOME=G:\hf_cache` across all execution entry points to permanently protect Drive `C:` (3.71–5.17 GB free).
  2. **Whisper Generation Config Pinning:** Ensure that when `anuragshas/whisper-small-bn` is invoked, it programmatically attaches `GenerationConfig.from_pretrained("openai/whisper-small", cache_dir=r"G:\hf_cache\hub")` and enforces `max_new_tokens=440` to prevent multi-byte UTF-8 BPE truncation.

---

### Priority 3: Clinical Safety Guardrails & Disclaimer Standard
- **Target Files:**
  - `_shared/clinical_safety_rules.json` (or central config)
- **Actions:**
  1. **Enforce Non-Actionable Draft State:** Hard-code clinical safety policies:
     - Voice transcription: Strictly labeled as "Non-Actionable Draft Notes — Mandatory Doctor Sign-off".
     - Prescription OCR: Quarantines $\ge 90\%$ of outputs; automated drug dispensing or reminder scheduling permanently blocked.
     - Skin & Ultrasound Vision: Classified as "Image Morphology Exploration — Rotterdam Criteria Confirmation Required".
  2. **Disable Dangerous Automations:** Verify that no code path exists for autonomous prescription generation or direct unattended EHR commits.

---

### Priority 4: Future Research Roadmap (Post-UI Phase)
*(To be addressed only after UI, Dashboard, and Application Features are built)*

1. **True Medical Ground Truth for Prescription OCR:** Collect 100–200 authentic Bangladeshi hospital prescriptions and annotate exact token-level bounding boxes and drug name/dosage entities with local registered physicians.
2. **Clinical Bengali Speech Dataset:** Record genuine physician dictations in local clinical environments (Dhaka Medical College, BSMMU) with mixed medical English-Bangla terminology to evaluate true clinical ASR capability.
3. **DermoPed Disease Re-scoping:** Transition pediatric dermatology research away from the 3-patient Pediculosis class toward balanced clinical pairs (e.g. Chickenpox vs. Morbilliform Exanthema / Measles, 329 MB) available in Zenodo.

---

## 3. Execution Status

All 4 priority areas have been fully mapped in the audit deliverables. Implementation of these research documentation updates can proceed immediately, without altering any underlying trained models or test sets.
