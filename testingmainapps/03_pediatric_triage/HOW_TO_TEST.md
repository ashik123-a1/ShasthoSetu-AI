# How to Test: Pediatric Care, Vaccines & Clinical Triage

## Test Workflow
1. Navigate to **Patient Portal** -> **Child Care & Vaccines** (`/patient/childcare`).
2. **Bangladesh National EPI Immunization Timeline:**
   - Verify timeline display with BCG, Pentavalent (1, 2, 3), OPV, PCV, and MR.
   - Inspect dependent profile for Ariyan (Child).
   - Check vaccination card image: `sample_child_vaccination_card.png`.
3. **IMCI Pediatric Triage Case Evaluation:**
   - Review the 3 color-coded triage cases in `pediatric_triage_cases.json`:
     - **RED (Emergency):** High fever + stridor + chest indrawing -> triggers immediate hospital referral alarm.
     - **YELLOW (Urgent):** Dehydration from diarrhea -> triggers IMCI Plan B ORS regimen.
     - **GREEN (Routine):** Mild coryza / runny nose -> safe home care advice.
4. **Pediatric AI Vision Modules (Viral Rash & DermoPed):**
   - Toggle between **Viral Rash 6-Class** and **DermoPed AI**.
   - Note: Strictly accepts image files (rejects PDF/DOCX) and enforces skin domain validation.
