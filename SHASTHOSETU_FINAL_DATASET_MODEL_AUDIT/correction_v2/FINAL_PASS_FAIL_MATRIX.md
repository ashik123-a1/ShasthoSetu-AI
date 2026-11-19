# ⚖️ ShasthoSetu AI — Final Pass / Fail & Compliance Matrix (V2)

**Document Reference:** `SHASTHOSETU_FINAL_DATASET_MODEL_AUDIT/correction_v2/FINAL_PASS_FAIL_MATRIX.md`  
**Audit Scope:** Final Evaluative Decision Across All 6 Research Modules  
**Verification Date:** 2026-11-18  
**Final Audit Verdict:** **`RESEARCH_AUDIT_PASS_WITH_LIMITATIONS`**  

---

## 1. Final Project-Level Decision

$$\mathbf{FINAL\ DECISION:\ RESEARCH\_AUDIT\_PASS\_WITH\_LIMITATIONS}$$

### 1.1 Decision Rationale
The six AI/ML research modules of ShasthoSetu AI meet the evidentiary standards required for a **research prototype and interactive clinical demo codebase**, provided that all documented dataset limitations and scientific constraints are strictly observed. 

1. **All Data Leakage Issues Resolved:** The severe crop-level contamination in Viral Rash (MCVSLD) has been definitively corrected through a verified 755-family grouped partition with **0.00% cross-family leakage**.
2. **Model Metrics Authenticated:** Primary performance metrics across PCOS Clinical (94.44% test / 88.57% CV), PCOS Ultrasound (86.67% test / 85.42% CV), Viral Rash (84.65% val / 84.22% F1), and Bangla Voice AI (39.09% WER / 98.37% BN Unicode) are authenticated against primary prediction manifests and live GPU executions.
3. **Safety Locks Enforced:** In modules lacking verbatim ground truth (Prescription OCR), accuracy claims have been formally retracted to **`NOT_VALIDATED`**, and hard-coded architectural safety gates prevent automated clinical actions (`SIMULATED_REVIEW_ONLY`).
4. **Transparent Artifact Accounting:** All 16 model entries are categorized honestly into genuine local checkpoints, external fine-tunes, pretrained pipelines, historical experiments, or unpersisted baselines. Local disk artifacts and archived proof ZIP differences are reconciled without fabrication.

---

## 2. Granular Module-by-Module Pass / Fail Matrix

| Module Name | Module Domain | Primary Champion Model | Validated Metric | Evidentiary Independence | Scientific Status | Detailed Limitations & Conditions |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **01_PCOS_Clinical** | Tabular Clinical Features | XGBoost Classifier (`M01-XGB-01`) | Test Bal Acc: **94.44%** (17/18)<br>CV Bal Acc: **88.57%** | True Patient Identifier ($N=88$) | **PASS WITH LIMITATIONS** | Small sample size ($N=88$); single clinical center (Mendeley tw34c7hv7z/1); metabolic/hormonal proxy features; not diagnostic without ultrasound & physical exam. |
| **02_PCOS_Ultrasound** | Ovarian Ultrasound Vision | ResNet18 (`M02-RESNET-01`) | Test Accuracy: **86.67%** (39/45)<br>CV Accuracy: **85.42%** | Pseudo-Patient Cluster ($N=244$ dev / 45 test) | **PASS WITH LIMITATIONS** | True clinical patient IDs absent in source dataset; independence enforced via perceptual hash clustering; prototype for morphology triage only. |
| **03_Measles_Viral_Rash** | Viral Skin Lesion Vision | ResNet18 Grouped (`M03-RESNET-GROUPED-01`) | Val Img Acc: **84.65%**<br>Val Macro F1: **84.22%**<br>Measles Recall: **91.94%** (114/124)<br>Val Family Acc: **85.84%** | Source-Photo Family ($N=755$ families; 0% leakage) | **PASS WITH LIMITATIONS** | Grouped weights stored on local disk (absent from earlier historical proof ZIP); family-level grouping confirmed, but patient-level linkage impossible due to MCVSLD metadata limits. Primary research-demo model. |
| **04_Prescription_OCR** | Bilingual Prescription Ingestion | EasyOCR CRAFT+ResNet CTC (`M04-EASYOCR-PIPELINE-01`) | Demo (`0052.jpg`): 44 tokens<br>Full Set: **92.11% Quarantined** | Document Prescription ID ($N=1,000$) | **NOT VALIDATED FOR ACCURACY / PASS ON SAFETY GATE** | Mendeley annotations are clinical narrative summaries, not verbatim OCR text; CER/WER and drug recall marked `NOT_VALIDATED`; automated reminders permanently locked out (`ClinicalSafetyViolationError`). |
| **05_Bangla_Voice_AI** | Bengali Speech-to-Text | Whisper-Small-BN (`M05-WHISPER-SMALL-BN-03`) | 26 FLEURS clips: Norm WER **39.09%**, CER **13.44%**, Bangla Unicode **98.37%** | Cross-Corpus Benchmark (Mozilla CV 11.0 vs FLEURS) | **PASS WITH LIMITATIONS** | External community fine-tune; weights cached on drive `G:\`; prototype draft note generator only (non-actionable); OpenAI Whisper-Base rejected on Bengali (0% Bangla Unicode). |
| **06_DermoPed_Pediatric_Skin** | Pediatric Skin Lesions | ResNet18 EXP_B Controlled (`M06-EXP-B-01`) | Test Img Acc: **92.73%** (102/110)<br>Patient Acc: **75.0%** (3/4) | True Patient Identifier ($N=22$ local subset) | **PASS WITH LIMITATIONS** | Local workspace contains 2-class subset only (Chickenpox & Pediculosis); full 19 GB Zenodo dataset not local; severe small-sample constraint on Pediculosis ($N=4$ patients total). |

---

## 3. Mandatory Research Limitations Before UI & Application Development

Before transitioning from research audit to application development (UI, Dashboards, and Feature Engineering under SRS v2.0), the following scientific boundaries are permanently recorded:

1. **Diagnostic Disclaimer:**
   No model in this repository is certified as an autonomous medical diagnostic device (CE-IVD or FDA SaMD). All predictions surfaced in the interactive UI must carry explicit clinical advisory notices:
   > *"Research Prototype Only — Output requires verification by a registered medical practitioner."*

2. **Viral Rash Interactive Demo Model:**
   `ResNet18 Grouped` is the designated primary research-demo model for Module 03. MobileNetV3 Grouped serves as the secondary lightweight model. The historical 99.10% model must remain strictly archived as forensic evidence of data contamination and must **never** be served in production.

3. **Prescription OCR Deployment Guardrail:**
   Prescription OCR must remain in `SIMULATED_REVIEW_ONLY` state. The UI must display extracted tokens side-by-side with confidence highlighting ($<0.60$ flagged uncertain). Autonomous scheduling or direct patient dispatch of medication reminders is strictly prohibited.

4. **Voice AI Scope Guardrail:**
   Bengali Voice AI (`anuragshas/whisper-small-bn`) is designated for draft clinical note transcription only. Its 39.09% WER and 13.44% CER require manual clinician editing prior to inclusion in electronic medical records.

---

## 4. Final Sign-off Statement

The research datasets, trained model weights, evaluation pipelines, and verification metrics have been rigorously audited, reconciled, and documented. 

**Research Audit Sign-off is GRANTED under `RESEARCH_AUDIT_PASS_WITH_LIMITATIONS`.**  
The project is authorized to proceed to software development (Streamlit UI, Patient, Doctor, Admin, Support Dashboards, and SRS v2.0 feature implementation).
