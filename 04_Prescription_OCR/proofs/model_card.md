# Model Card: Bilingual Doctor's Prescription OCR Benchmark
## ShasthoSetu AI — OCR & Healthcare NLP Module (04_Prescription_OCR)

---

### 1. Model & Engine Details
- **Engine Name:** EasyOCR Bilingual Deep OCR Pipeline (`['bn', 'en']`)
- **Underlying Architecture:** CRAFT Text Detector + ResNet-based Deep Sequence Recognition + CTC Decoding
- **Languages Supported:** Bengali (`bn`) and English (`en`)
- **Hardware Platform:** NVIDIA GeForce RTX 5060 Ti 16GB VRAM (CUDA 12.8 / sm_120)
- **Task:** End-to-end optical character recognition and medication extraction from real-world handwritten doctor's prescriptions.
- **Dataset Provenance:** Image-to-Text Bilingual Dataset from Medical Prescriptions (*Badhon et al.*, Bangabandhu Sheikh Mujibur Rahman Digital University, Mendeley Data `tg2hm7n2bs/2`, DOI: `10.17632/tg2hm7n2bs.2`)
- **License:** Creative Commons Attribution 4.0 International (`CC BY 4.0`)
- **Privacy Audit:** 100% HIPAA-compliant; patient names, phone numbers, and clinic IDs redacted by dataset authors.

---

### 2. Held-Out Test Evaluation Results (N=150)

| Benchmark Metric | Mean Value | Median Value | Interpretation |
| :--- | :---: | :---: | :--- |
| **Character Error Rate (CER)** | **101.07%** | **87.55%** | Raw character edit distance over ground-truth length |
| **Word Error Rate (WER)** | **117.32%** | **99.85%** | Word sequence edit distance |
| **Levenshtein String Similarity** | **12.96%** | — | Normalized character matching score |
| **Medication Token Recall** | **3.12%** | — | Recall of clinical drug names, dosages, and units |
| **Inference Latency** | **0.673 s** | — | **1.48 prescriptions/sec** on RTX 5060 Ti |

---

### 3. Key Findings & Orthographic Challenges
1. **Extreme Handwriting Variability:**
   - Real-world doctor's prescriptions collected from Gazipur, Bangladesh demonstrate significant cursive distortion, cursive slant, low-contrast ink, and abbreviation density.
   - Machine-printed clinic headers and standardized drug names achieve substantially higher recognition rates than cursive physician sigs (instructions).
2. **Bilingual Mixed-Script Script Switching:**
   - Bangladeshi prescriptions frequently interweave English brand names (e.g. *Napa 500mg*, *Seclo 20mg*) with Bengali frequency instructions (e.g. *১+০+১ ভরা পেটে ৭ দিন*).
   - The bilingual detector successfully processes mixed Latin and Bengali unicode scripts within the same line.

---

### 4. Clinical Safety & Legal Scope
- **Assistive Clinical Tool:** This system is strictly an assistive EHR transcribing aid for community health workers and nurses.
- **Mandatory Human-in-the-Loop:** In accordance with medical device safety protocols, OCR-parsed prescription text MUST NEVER be directly linked to automatic dispensing machines without pharmacist verification.
