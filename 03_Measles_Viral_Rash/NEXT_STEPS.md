# Next Steps & Implementation Roadmap
**Module:** `03_Measles_Viral_Rash`  
**Phase:** Transition to Execution via Drive G or External Cohort  

---

## 1. Prerequisites to Unblock Training

To safely unblock model training for Module 03, the following two steps must be taken:

### Step 1: Storage Allocation via Drive G (12.57 GB Free)
Because Drive `F:` has only **0.90 GB** remaining, all prospective downloads and experiment checkpoints must be directed to:
```
G:\ShasthoSetu_Data\03_Measles_Viral_Rash\
```
Or alternatively, the user can safely free $\ge 5\text{ GB}$ on Drive `F:`.

### Step 2: Formal Scientific Task Definition
The model training must strictly be formulated as:
$$\text{Task: } \text{Chickenpox vs Morbilliform Exanthema (Cutaneous Morphology Classification)}$$
- It must explicitly state that morbilliform patterns can arise from drug reactions, EBV, or enteroviruses, and does not replace measles IgM/PCR laboratory testing.

---

## 2. Experimental Design (Once Storage Unblocked)

1. **Dataset Sources:**
   - Class 0: Chickenpox (DermoPed local archive: 19 patients, 575 curated crops)
   - Class 1: Morbilliform Exanthema (DermoPed Zenodo archive: 329.67 MB, ~20 patients)
2. **Infrastructure:**
   - Environment: `_shared/venv` (PyTorch 2.11.0+cu128)
   - Hardware: NVIDIA GeForce RTX 5060 Ti 16GB
3. **Cross-Validation Strategy:**
   - 5-Fold Stratified Group Cross-Validation (Grouped by `patient_id`).
   - Zero patient leakage across folds.
   - Saliency / Grad-CAM visual maps generated for research inspectability.

---

## 3. Sequential Project Progression

1. **Current Milestone (Completed):**
   - ✅ DermoPed Audit V3 Inconsistencies Corrected (`audit_v3_corrections/`).
   - ✅ Module 03 Dataset, Label, and Storage Audit Completed (`03_Measles_Viral_Rash/`).
   - ✅ RTX 5060 Ti GPU CUDA 12.8 Acceleration Verified (226.42 ms).
2. **Next Immediate Milestone:**
   - Module 04: **Prescription OCR Pipeline** (Text extraction, verification, reminder generation).
   - Module 05: **Bangla Voice AI Pipeline** (Speech-to-text, medical terminology, triage conversational logic).
