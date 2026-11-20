# How to Test: Safe-OCR & Grounded AI Explanation Workbench

## Supported Formats
* **PDF** (`.pdf`) — Scanned or multi-page digital hospital prescriptions.
* **JPG / JPEG** (`.jpg`, `.jpeg`) — Mobile camera snapshots of prescription slips.
* **PNG** (`.png`) — High-resolution digital medical summaries.

## Test Workflow
1. Navigate to **Patient Portal** -> **Prescription OCR Review** (`/patient/ocr`) or open **CyberScan Workbench** on module `4. Prescription OCR`.
2. Click **Attach File** or **Upload** and choose:
   - `sample_hospital_prescription_01.pdf` OR
   - `sample_hospital_prescription_01.png` OR
   - `sample_bilingual_rx_0052.jpg`
3. Click **Analyze with Real AI**.
4. **Step 2 (CyberScan Laser Vision):**
   - CRAFT neural network detects text bounding boxes.
   - Dual-alphabet EasyOCR (Bengali + English) transcribes medicines, dosage, and duration.
5. **Step 3 (Mandatory Human Verification Gate):**
   - Notice the **HTTP 422 Safety Gate**: Reminder scheduling is strictly locked.
   - Click each checkbox to verify:
     - `[✓] Metformin 500 mg (1+0+1)`
     - `[✓] Myo-Inositol 1000 mg (1+0+0)`
     - `[✓] Vitamin D3 40000 IU (weekly)`
   - Once all rows are verified, click **Confirm & Unlock Medication Routine**.
6. **Step 4 (Medical Grounded AI Explanation):**
   - Inspect grounded explanation in Bengali and English.
   - Click **Save Verified Rx to Patient Vault**.
