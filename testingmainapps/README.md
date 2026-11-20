# ShasthoSetu AI — 5-System Test Data & QA Verification Suite

This directory (`testingmainapps`) contains comprehensive, ready-to-test benchmark data, sample medical files, and ground-truth records for validating all five core subsystems of **ShasthoSetu AI**:

```
testingmainapps/
├── 01_prescription_ocr/         # Bilingual Prescriptions in PDF, PNG, JPG + Ground Truth JSON
├── 02_pcos_tracker/             # Pelvic USG Scan Images, 6-Month Cycle Logs JSON, Clinical Tabular Features
├── 03_pediatric_triage/         # Pediatric IMCI Clinical Triage Cases, National EPI Vaccine Schedule, Card Image
├── 04_dermoped_skin/            # Pediatric Skin Lesions (Chickenpox/Eczema) + Unrelated Negative Controls
├── 05_rag_bilingual_assistant/  # Bengali, English, and Banglish Test Queries + Grounded Citations
├── README.md                    # Quick Start Guide (This File)
└── DOCUMENTATION.md             # Complete Step-by-Step QA Manual
```

---

## ⚡ Quick Test Summary

| # | System | Supported File Types | Key Guardrails & Features |
|---|--------|----------------------|---------------------------|
| **1** | **Prescription OCR & Grounded AI** | **PDF, JPG, PNG** | Dual-script CRAFT + ResNet-CTC; **HTTP 422 Safety Gate** locks reminders until human verified. |
| **2** | **Women's Health & PCOS Tracker** | **Images Only** (`.jpg`, `.png`) | 4-phase biological cycle dial; **Grayscale ultrasound domain check** (rejects non-USG images). |
| **3** | **Pediatric Care & IMCI Triage** | Data + Images | Red/Yellow/Green danger triage rules; DGHS National EPI timeline and vaccination card. |
| **4** | **DermoPed AI Skin & Rash Studio** | **Images Only** (`.jpg`, `.png`) | **Chrominance guardrail**: rejects selfies, phones, cars, or unrelated objects with a clear error. |
| **5** | **Multilingual RAG Assistant** | Text & Audio | Bengali, English, Banglish dense retrieval (BGE-M3 + BM25 + FAISS) with verified citations. |

---

## 📱 Live 2-Device Telemedicine Calling Rule
* **Rule**: Strictly **no call before payment**. Unpaid appointments require fee payment before accessing the call room.
* **Intake Form**: Immediately after payment, a short preparation form (symptoms, report upload [PDF/JPG/PNG], voice note) is presented.
* **Call Launch**: Submitting the form connects the user directly to the live WebRTC room (`apt-demo-9001`) synced across 2 devices.

*For complete test execution instructions, please refer to [`DOCUMENTATION.md`](./DOCUMENTATION.md).*
