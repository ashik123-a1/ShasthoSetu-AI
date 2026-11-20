# ShasthoSetu AI — Complete System Testing & QA Manual

This document provides exhaustive, step-by-step procedures for testing the **ShasthoSetu Telemedicine & AI Ecosystem** using the curated sample datasets in `testingmainapps/`.

---

## System 1: Safe-OCR & Grounded AI Explanation Workbench
*Directory: `01_prescription_ocr/`*

### Supported Formats
* **Digital or Scanned PDF**: `sample_hospital_prescription_01.pdf`
* **Digital Prescription Image (PNG)**: `sample_hospital_prescription_01.png`
* **Real Handwritten Slip (JPG)**: `sample_bilingual_rx_0052.jpg` (or `sample_bilingual_rx_0001.jpg`)

### Test Instructions
1. Navigate to **Patient Portal** -> **Prescription OCR Review** (`/patient/ocr`) or **Doctor Portal** -> **Prescriptions**.
2. Select either the PDF or JPG/PNG file and click **Analyze with Real AI**.
3. **Observation 1 (Laser Vision Scanning):** Bounding boxes highlight recognized medication tokens across Bengali and English text.
4. **Observation 2 (HTTP 422 Safety Lock):** Note that auto-creating medication reminders is blocked (`HTTP 422`).
5. **Observation 3 (Human Verification Workbench):**
   - Click each checkbox to verify medicine name, dose, frequency, and duration.
   - Once all rows are confirmed, the safety gate unlocks, enabling scheduling and saving to the patient EHR vault.

---

## System 2: Modern PCOS Tracker & Endocrine Vision AI
*Directory: `02_pcos_tracker/`*

### Supported Formats
* **Images Only** (`.jpg`, `.jpeg`, `.png`, `.webp`)
* **Strict Rejection:** Uploading `.pdf` or document files will be blocked with:
  `⚠️ ফাইল ফরম্যাট ত্রুটি: এই ক্লিনিক্যাল ভিশন মডিউলে শুধুমাত্র ছবি (JPG, JPEG, PNG, WEBP) গ্রহণযোগ্য...`

### Test Instructions
1. Navigate to **Patient Portal** -> **PCOS Cycle Tracker** (`/patient/pcos`).
2. **Test Longitudinal Cycle Tracker:**
   - Observe the 4-phase biological progress bar (Menstrual, Follicular, Ovulation, Luteal).
   - Review the 6 preloaded historical cycles (dating back to April 2026) demonstrating oligomenorrhea patterns.
   - Click **+ Log Cycle**, select symptoms, and save a new entry.
3. **Test Ovarian Ultrasound Vision Model (M02 ResNet18):**
   - Under *Real PCOS AI Models*, select **Ultrasound Image ResNet18**.
   - Upload `ultrasound_samples/pcos_positive_scan_01.jpg` (or `dominant_follicle_scan_01.jpg`).
   - Click **Analyze with Real AI** -> View classification probabilities and PCOM warnings.
4. **Test Out-of-Domain Guardrail:**
   - Attempt to upload an unrelated picture (e.g. `04_dermoped_skin/negative_controls_unrelated/negative_control_face_portrait.jpg` or a smartphone photo).
   - Expected Result: Backend domain detector flags high color variance / non-ultrasound characteristics and displays:
     ```
     ⚠️ অসংগতিপূর্ণ বা অ-চিকিৎসাগত ছবি সনাক্ত হয়েছে: এই ছবিটি পিসিওএস আল্ট্রাসাউন্ডের সাথে সঙ্গতিপূর্ণ নয় (সেলফি, মোবাইল ফোন বা সাধারণ রঙিন বস্তুর ছবি গ্রহণযোগ্য নয়)। অনুগ্রহ করে শুধুমাত্র সংশ্লিষ্ট ক্লিনিক্যাল পেলভিক আল্ট্রাসাউন্ড স্ক্যানের স্পষ্ট ছবি আপলোড করুন।
     ```

---

## System 3: Pediatric Care, Vaccines & IMCI Triage
*Directory: `03_pediatric_triage/`*

### Test Instructions
1. Navigate to **Patient Portal** -> **Child Care & Vaccines** (`/patient/childcare`).
2. **Bangladesh National EPI Vaccination Schedule:**
   - Review child dependent profile (Ariyan Hasan, Age: 22 months).
   - Verify timeline display with BCG, Pentavalent (1, 2, 3), OPV, PCV, and MR.
   - Inspect the verified immunization card image: `sample_child_vaccination_card.png`.
3. **IMCI Triage Clinical Decision Support:**
   - Check the 3 reference clinical cases in `pediatric_triage_cases.json`:
     - **RED / Emergency:** High fever (103.8°F), stridor while calm, chest indrawing -> immediate tertiary referral alert.
     - **YELLOW / Urgent:** Persistent diarrhea with some dehydration -> IMCI Plan B ORS regimen.
     - **GREEN / Routine:** Mild rhinorrhea and cough -> safe home hydration counseling.

---

## System 4: DermoPed AI Pediatric Skin & Rash Studio
*Directory: `04_dermoped_skin/`*

### Supported Formats
* **Images Only** (`.jpg`, `.jpeg`, `.png`)
* **Strict Rejection:** Documents (`.pdf`) and non-skin photos are rejected.

### Test Instructions
1. Open **CyberScan Workbench** on module `6. DermoPed AI` (or `3. Viral Rash AI`).
2. **Valid Skin Lesion Test:**
   - Upload `skin_lesions/chickenpox_lesion_01.png` (or `chickenpox_lesion_02.jpg`).
   - Click **Analyze with Real AI**.
   - Expected Result: Successfully classifies `chickenpox` with mandatory human pediatric review banner.
3. **Irrelevant / Out-of-Domain Image Guardrail Test:**
   - Upload `negative_controls_unrelated/negative_control_face_portrait.jpg` (face selfie) or `negative_control_smartphone.jpg` (electronic object).
   - Click **Analyze with Real AI**.
   - Expected Result: The skin chrominance detector identifies zero dermatological pathology or lack of skin tone and rejects the upload:
     ```
     ⚠️ অসংগতিপূর্ণ বা অ-চিকিৎসাগত ছবি সনাক্ত হয়েছে: এই ছবিটি চর্মরোগের সাথে সঙ্গতিপূর্ণ নয় (সেলফি, মোবাইল ফোন বা সাধারণ বস্তুর ছবি গ্রহণযোগ্য নয়)। অনুগ্রহ করে শুধুমাত্র সংশ্লিষ্ট আক্রান্ত ত্বকের স্পষ্ট ছবি আপলোড করুন।
     ```

---

## System 5: Bilingual & Banglish Grounded RAG Assistant
*Directory: `05_rag_bilingual_assistant/`*

### Test Instructions
1. Navigate to **Patient Portal** -> **Bilingual AI Assistant** (`/patient/assistant`).
2. **Test Bengali Query:**
   - Copy query from `test_queries_bangla.json`:
     `পিসিওএস (PCOS) রোগের প্রাথমিক লক্ষণগুলো কী এবং খাদ্যাভ্যাসে কী পরিবর্তন আনা দরকার?`
   - Expected Result: Response provides Rotterdam criteria guidance with citations to `dgdf-pcos-guideline-2024`.
3. **Test English Clinical Query:**
   - Copy query from `test_queries_english.json`:
     `What are the danger signs in acute pediatric diarrhea requiring immediate hospitalization under IMCI?`
   - Expected Result: Structured summary of IMCI red flags citing `dghs-imci-pediatric-manual-2023`.
4. **Test Banglish Query:**
   - Copy query from `test_queries_banglish.json`:
     `bachhar jor 102 degree hole ar shathe betha thakle ki korbo?`
   - Expected Result: Retrieved pediatric fever guidelines with safe weight-based antipyretic dosing.

---

## 2-Device Telemedicine Call Testing Protocol

To test the live video and audio consultation between **two physical devices** (e.g., Doctor on Laptop and Patient on Mobile/Tablet or second browser):

### Strict Rule: No Call Before Payment
1. **Patient Side (Device 1):**
   - In **Patient Portal** -> **My Appointments** (`/patient/appointments`), unpaid appointments display **`💳 Pay Fee First (৳ 300)`**. The call room is completely locked.
   - Click **Pay Fee First** -> Simulated Checkout modal opens.
   - Select **ShasthoPay MFS** (or Digital Direct Pay) and click **Confirm Simulated Payment (Zero OTP)**.
   - Payment success audio chime plays!

### Post-Payment Transition: Pre-Consultation Intake Form
2. **Intake Form Pops Up Automatically:**
   - The user is **NOT** dumped directly into a raw PDF.
   - The **Pre-Consultation Clinical Intake Form** appears with doctor details and a button to view the receipt PDF if desired.
   - The patient can:
     - Toggle between **🎥 Video Call** and **🎙️ Audio Call**.
     - Optionally enter current symptoms or chief complaints.
     - Optionally upload previous lab report / prescription (supports PDF, JPG, PNG).
     - Optionally record a quick voice message using the microphone.
   - Click **🚀 Submit & Launch Call Room**.

### Cross-Device Connection (Device 1 & Device 2)
3. **Doctor Side (Device 2):**
   - On the second device, log in as Doctor (`doc.farhana@shasthosetu.gov.bd`).
   - Go to **Consultation Workspace** (`/doctor/workspace?appointmentId=apt-demo-9001`).
4. **Patient Side (Device 1):**
   - The patient enters `/patient/consultations?roomId=apt-demo-9001`.
5. **Real-Time Cross-Device Signaling:**
   - Both devices connect via the backend signaling router (`/v1/consultations/rooms/apt-demo-9001`).
   - Top status pill displays **`🟢 2 Devices Synced`**.
   - Click **Start Video Call** (or Audio Call):
     - Calling ringtone tone plays.
     - When connected, chime plays and live camera feeds stream peer-to-peer!
     - In-call chat messages sent on Device 1 appear on Device 2 in real time with notification audio chimes.
     - The doctor immediately sees the patient's submitted pre-call symptoms and report details in the top intake summary banner.
