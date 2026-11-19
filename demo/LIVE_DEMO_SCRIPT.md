# ShasthoSetu AI — 3-Minute Live Hackathon Demonstration Script
**Presenter Roles:** Lead Presenter (Pitch & Clinical Context) + Technical Co-Presenter (Live Demo Clicks)  
**Demo URL:** `http://localhost:8501` (Launched via `demo/run_demo.ps1`)  
**Hardware Engine:** Local NVIDIA GeForce RTX 5060 Ti 16GB GPU  

---

### [0:00 – 0:30] Introduction & The Core Medical AI Problem
**Lead Presenter Speaks:**
> *"Honorable Judges, in rural Bangladesh, an Upazila clinic doctor sees 100 patients a day—spending under two minutes per person. AI has the potential to relieve this crisis, but 99% of healthcare AI projects fail because of data contamination, cherry-picked metrics, and lack of medical safety gates.*  
> *Today, we present **ShasthoSetu AI (স্বাস্থ্যসেতু)**: a multimodal healthcare research and clinical safety platform running 100% locally on our NVIDIA RTX 5060 Ti GPU, with zero synthetic data and strict human-in-the-loop safeguards."*

---

### [0:30 – 1:05] Demo Part 1: Pediatric Measles Early Warning & Data Audit
**Action on Screen:** *Switch to Tab 3: "🩻 Measles & Viral Skin".*  
**Presenter Clicks:** Select `Sample 1: Measles Maculopapular Rash` $\rightarrow$ Click `Run Classification`.  
**Result Displayed:** Instant 12ms inference $\rightarrow$ `🚨 HIGH PRIORITY ALERT: Measles Pattern Identified (99.1%)`.  
**Technical Co-Presenter Speaks:**
> *"In rural areas, measles outbreaks can kill malnourished children before laboratory results arrive. Our model detects measles with **99.12% sensitivity—detecting 113 out of 114 test crops**.*  
> *Notice our scientific rigor: When auditing the public Mendeley archive, we discovered **305 duplicate images accidentally present in both train and test**. We purged every duplicate before training on our RTX 5060 Ti GPU.*  
> *Crucially, our system does NOT claim an autonomous diagnosis. It triggers an automated community outbreak alert prompting the health worker to check for **Koplik spots in the mouth** and order mandatory serology."*

---

### [1:05 – 1:45] Demo Part 2: Prescription OCR & The 100% Pharmacist Safety Gate
**Action on Screen:** *Switch to Tab 4: "📋 Prescription OCR & Safety Gate".*  
**Presenter Clicks:** Select `Prescription 001 (Mixed Bengali/English)` $\rightarrow$ Image loads.  
**Result Displayed:** Large Red Banner: `⚠️ STATUS: PENDING HUMAN PHARMACIST REVIEW (Automated Reminders 100% Blocked)`.  
**Lead Presenter Speaks:**
> *"Now let's examine the most dangerous area in medical AI: handwritten doctor prescriptions. Off-the-shelf OCR achieves 101% error rates on cursive doctor shorthand. Other teams might hide this and claim 99% accuracy.*  
> *We take the opposite, medically defensible approach:*  
> *Here you see our **Clinical Safety Gate**: all automated medication reminders are **100% blocked**. The AI acts strictly as a first-pass drafting aid. The pharmacist reviews the draft, confirms 'Tab. Napa Extra 500mg', edits the sig, and clicks **Approve for Dispensation**.*  
> *Only upon human pharmacist sign-off is the patient SMS scheduled. This prevents lethal dosage errors."*  
**Presenter Clicks:** Click `✅ Approve for Dispensation` $\rightarrow$ Green confirmation toast appears.

---

### [1:45 – 2:20] Demo Part 3: Local GPU Voice AI on RTX 5060 Ti
**Action on Screen:** *Switch to Tab 5: "🎙️ Bangla Voice AI Console".*  
**Presenter Clicks:** Select `Sample 1: Clinical History & Ward Report` $\rightarrow$ Click `Transcribe on RTX 5060 Ti GPU`.  
**Result Displayed:** Transcription completes in `0.285 seconds` (**48.1x faster than real-time**).  
**Technical Co-Presenter Speaks:**
> *"To eliminate doctor typing fatigue, we integrated local speech recognition. On our local RTX 5060 Ti GPU, Whisper transcribes audio in **285 milliseconds—48 times faster than real-time**, using just 182 MB of VRAM.*  
> *We also report a critical research finding: zero-shot Whisper transcribes Bengali phonetically into Romanized script (*Banglish*). Because of acoustic word confusions, we transparently disclose that a simple script converter cannot solve this without supervised IndicLoRA fine-tuning, and we keep voice dictation air-gapped from medical records."*

---

### [2:20 – 2:50] Demo Part 4: PCOS Endocrine Triage & Ultrasound Group CV
**Action on Screen:** *Switch to Tab 1: "🩺 PCOS Tabular ML" then Tab 2: "🔬 Bedside Ultrasound".*  
**Presenter Clicks:** Tab 1 $\rightarrow$ Click `Case 1: Confirmed PCOS Patient` $\rightarrow$ Click `Run Clinical Triage Inference`.  
**Result Displayed:** Risk Probability: `88.5%` $\rightarrow$ Feature Gain driver: `Estradiol (e2)`.  
**Lead Presenter Speaks:**
> *"For maternal health, our tabular XGBoost model evaluates 20 clinical biomarkers with **88.57% repeated cross-validation balanced accuracy**, discovering that **Estradiol (`e2`)** is the primary diagnostic predictor.  
> *In pelvic ultrasound (Tab 2), we detected that consecutive cine-loop video frames artificially inflated accuracy (0.9981 pixel correlation). We introduced 15-fold Group CV to isolate sweeps, achieving an honest **84.53% balanced accuracy**.*  
> *Again, the system enforces the Rotterdam Criteria: biomarkers and ultrasound must correlate before a clinical diagnosis is confirmed."*

---

### [2:50 – 3:00] Conclusion & Master Proofs
**Action on Screen:** *Switch to Tab 6: "📊 Master Research Audit & Proofs".*  
**Presenter Clicks:** Show the multi-modal matrix and the `Download Omnibus Proofs Package` button.  
**Lead Presenter Concludes:**
> *"Every single model, script, log, and audit from all six modules is locked in our 98 MB Master Proofs package on local disk.*  
> *ShasthoSetu AI is not a fragile prototype with synthetic claims—it is a rigorous, audited, and medically safe foundation ready to empower community health workers across Bangladesh.*  
> *Thank you, and we welcome your questions!"*
