# ShasthoSetu AI — Prescription OCR Clinical Safety & Verification Audit
**Audited Module:** `04_Prescription_OCR`  
**Dataset:** Image-to-Text Bilingual Dataset from Medical Prescriptions (Mendeley Data `tg2hm7n2bs/2`, CC BY 4.0, BSMRAAU, Bangladesh)  
**Evaluated Engine:** EasyOCR Deep Pipeline (`['bn', 'en']`) on NVIDIA RTX 5060 Ti GPU  
**Audit Date:** 2026-11-18  

---

## 1. Remediation of "12 Approved Prescriptions"

In the preliminary evaluation log, a heuristic filter classified 12 out of 152 held-out prescriptions as *"automated reminder permitted"* because EasyOCR detected a medication string candidate with an average detector bounding-box confidence $> 0.50$.

### Safety Audit & Immediate Correction:
1. **OCR Confidence $\neq$ Transcription Accuracy:**
   - Detector confidence scores quantify the neural network's belief that a text bounding box exists; they provide **zero guarantee** that the transcribed medicine name, dosage, or frequency is clinically correct.
   - For example, an OCR output reading *"Tab Napa 50mg"* instead of *"Tab Napa 500mg"* or misreading *"Inderal"* as *"Imdur"* could lead to lethal dosing errors despite having high bounding box confidence.
2. **Revocation of Automated Approval:**
   - **All 12 previously flagged prescriptions are immediately revoked and marked: `Pending Human Pharmacist Review`.**
   - **100% of OCR outputs (152 / 152 test prescriptions) are locked in a mandatory quarantine workflow.**
   - Automated patient medication reminders are **100% permanently disabled** for unverified OCR outputs.

---

## 2. Authentic Un-Finetuned Handwriting OCR Performance

We report the unvarnished baseline performance of off-the-shelf general OCR on real cursive Bangladeshi doctor prescriptions (Held-Out Test N=152):

| Metric | Measured Value | Clinical Reality |
| :--- | :---: | :--- |
| **Mean Character Error Rate (CER)** | **101.07%** (Median: 87.55%) | High insertion and substitution rate on cursive handwriting |
| **Mean Word Error Rate (WER)** | **117.32%** (Median: 99.85%) | Cursive ligatures and abbreviations cause complete word breaks |
| **Levenshtein String Similarity** | **12.96%** | Low character overlap with true clinical ground truth |
| **Medication Token Recall** | **3.12% – 6.96%** | Most handwritten brand names and dosages fail detection |
| **Inference Throughput** | **1.43 – 1.48 pages/sec** | Fast GPU inference (0.673s – 0.698s/page on RTX 5060 Ti) |

### Key Orthographic Challenges in Bangladeshi Clinical Practice:
- **Cursive Shorthand:** Doctors write with rapid cursive slants, low-contrast ink, and shorthand abbreviations (*"1+0+1"*, *"b/f"*, *"o/d"*).
- **Mixed Bilingual Script:** English pharmaceutical brand names (*Seclo*, *Azithrocin*, *Monas*) are written interspersed with Bengali dosage instructions (*ভরা পেটে*, *দিনে ২ বার*).
- **Paper Quality & Shadows:** Prescriptions photographed by mobile phones in rural clinics suffer from uneven lighting, folds, and clinic stamp artifacts.

---

## 3. Human-in-the-Loop Risk Control Protocol

### Operational Safeguard vs Measured Prevention Rate:
- **Clarification:** The **92.11% (or 100%) human-review routing is an operational procedural constraint**, NOT an experimentally validated *"medication error prevention rate"*.
- It means that whenever the AI fails confidence thresholds or encounters unvalidated medication strings, it ceases autonomous execution and alerts a licensed clinician.
- The system must be presented to hackathon judges as a **"Drafting Assistant for Community Pharmacists"**, where the human pharmacist retains total legal and medical responsibility for dispensing.

```
+-------------------------------------------------------------------------+
|                    PRESCRIPTION OCR SAFETY PIPELINE                     |
+-------------------------------------------------------------------------+
                                    |
                                    v
                     [Mobile Image Upload by Nurse]
                                    |
                                    v
                      [EasyOCR Deep Text Extraction]
                       Throughput: 1.43 pages/sec
                                    |
                                    v
                      [Clinical Entity Parsing]
                 Extracted: Drug Candidates, Sig, Dose
                                    |
                                    v
                       [MANDATORY SAFETY GATE]
                Is prescription verified by pharmacist?
                                    |
                    +---------------+---------------+
                    |                               |
                   NO                              YES
                    |                               |
                    v                               v
       [AUTOMATION STRICTLY BLOCKED]    [EHR Commit & Verified Patient SMS]
       Status: "Pending Pharmacist"
       * Zero auto-reminders sent
       * Image + draft sent to web dashboard
```
