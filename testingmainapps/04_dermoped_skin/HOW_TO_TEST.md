# How to Test: DermoPed AI Pediatric Skin & Rash Studio

## Models Evaluated
1. **M03 ResNet18 Grouped 755-Family Model**: 6 viral rash classes (`Chickenpox`, `Cowpox`, `HFMD`, `Healthy`, `Measles`, `Monkeypox`).
2. **M06 ResNet18 DermoPed Controlled Model**: Controlled evaluation for pediatric skin lesions (`chickenpox`, `pediculosis`).

## Supported Formats
* **Images Only** (`.jpg`, `.jpeg`, `.png`, `.webp`)
* **Strict Rejection:** Documents (`.pdf`, `.docx`, `.txt`) are rejected with format error.

## Step-by-Step Test Scenarios

### Scenario A: True Positive Skin Lesion Evaluation
1. Open **CyberScan Workbench** on module `6. DermoPed AI` (or `3. Viral Rash AI`).
2. Upload `skin_lesions/chickenpox_lesion_01.png` (or `chickenpox_lesion_02.jpg`).
3. Click **Analyze with Real AI**.
4. Result: Successfully identifies lesion class (`chickenpox` / `Chickenpox`) with probability breakdown and mandatory pediatric clinician review warning banner.

### Scenario B: Out-of-Domain Guardrail Test (User Face Selfie)
1. In the same module, click **Upload** and choose `negative_controls_unrelated/negative_control_face_portrait.jpg`.
2. Click **Analyze with Real AI**.
3. **Expected Guardrail Rejection Output:**
   ```
   ⚠️ অসংগতিপূর্ণ বা অ-চিকিৎসাগত ছবি সনাক্ত হয়েছে: এই ছবিটি চর্মরোগের সাথে সঙ্গতিপূর্ণ নয় (সেলফি, মোবাইল ফোন বা সাধারণ বস্তুর ছবি গ্রহণযোগ্য নয়)। অনুগ্রহ করে শুধুমাত্র সংশ্লিষ্ট আক্রান্ত ত্বকের স্পষ্ট ছবি আপলোড করুন।
   ```

### Scenario C: Out-of-Domain Guardrail Test (Smartphone / Device)
1. Upload `negative_controls_unrelated/negative_control_smartphone.jpg`.
2. Click **Analyze with Real AI**.
3. **Expected Guardrail Rejection Output:**
   The image chrominance detector identifies zero skin pigments and rejects the upload with the non-clinical image error.

### Scenario D: Non-Image File Rejection (PDF Guardrail)
1. Try to select a `.pdf` file in DermoPed AI.
2. Result: Client-side and server-side reject with `⚠️ শুধুমাত্র ছবি (JPG, PNG) গ্রহণযোগ্য। PDF ফাইল শুধুমাত্র 'প্রেসক্রিপশন OCR' মডিউলে আপলোড করা যাবে।`
