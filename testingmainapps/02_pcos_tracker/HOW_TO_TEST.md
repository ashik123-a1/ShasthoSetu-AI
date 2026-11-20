# How to Test: Women's Health & Modern PCOS Tracker

## System Capabilities
1. **Longitudinal Cycle Tracker**: Visual 4-phase dial (Menstrual, Follicular, Ovulation, Luteal), cycle regularity gauge, symptom toggles, and 6-month historical log.
2. **M01 Clinical XGBoost AI**: 20-feature endocrine/metabolic tabular predictor.
3. **M02 Ultrasound ResNet18 Vision AI**: 3-class ovarian morphology classifier (`Dominant_Follicle`, `Normal`, `PCO`).
4. **Out-of-Domain Guardrail**: Strictly accepts images only (rejects PDF). Detects and rejects non-ultrasound photos (selfies, phone screens, cars, colorful photos) with clear error message.

## How to Test the Ultrasound Vision AI & Guardrail
1. Go to **Patient Portal** -> **PCOS Cycle Tracker** (`/patient/pcos`).
2. Scroll to the **Real PCOS AI Models** section and switch to **Ultrasound Image ResNet18**.
3. **Test True Clinical Scan:**
   - Upload `ultrasound_samples/pcos_positive_scan_01.jpg` (or `dominant_follicle_scan_01.jpg`).
   - Click **Analyze with Real AI**.
   - Result: Successful classification with PCO / Dominant Follicle probability breakdown.
4. **Test Out-of-Domain / Irrelevant Image Guardrail:**
   - Attempt to upload `testingmainapps/04_dermoped_skin/negative_controls_unrelated/negative_control_face_portrait.jpg` (or smartphone/car image).
   - Click **Analyze with Real AI**.
   - **Expected Guardrail Rejection:**
     `⚠️ অসংগতিপূর্ণ বা অ-চিকিৎসাগত ছবি সনাক্ত হয়েছে: এই ছবিটি পিসিওএস আল্ট্রাসাউন্ডের সাথে সঙ্গতিপূর্ণ নয় (সেলফি, মোবাইল ফোন বা সাধারণ রঙিন বস্তুর ছবি গ্রহণযোগ্য নয়)। অনুগ্রহ করে শুধুমাত্র সংশ্লিষ্ট ক্লিনিক্যাল পেলভিক আল্ট্রাসাউন্ড স্ক্যানের স্পষ্ট ছবি আপলোড করুন।`
5. **Test PDF Rejection Guardrail:**
   - Attempt to select a `.pdf` file.
   - Result: File upload is rejected with `⚠️ শুধুমাত্র ছবি (JPG, PNG) গ্রহণযোগ্য। PDF ফাইল শুধুমাত্র 'প্রেসক্রিপশন OCR' মডিউলে আপলোড করা যাবে।`

## How to Test the Longitudinal Tracker
1. View the **4 Biological Phases visual bar** (Menstrual, Follicular, Ovulation, Luteal).
2. Click **+ Log Cycle** to add a new cycle date, length, and toggle symptom chips.
3. Verify that the 6 pre-populated cycles display with symptom tags and clinical notes.
