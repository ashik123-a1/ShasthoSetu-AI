# 🩺 Model Card: ShasthoSetu Bilingual Prescription OCR Baseline (v1.0)

## Model Details
- **Model Name:** `ShasthoSetu-PrescriptionOCR-Baseline-v1`
- **Model Version:** 1.0.0
- **Organization:** ShasthoSetu AI Clinical Informatics
- **Release Date:** November 2026
- **Architecture:** 
  - Text Detection: Character-Region Awareness for Text Detection (CRAFT)
  - Text Recognition: Deep Residual Network (ResNet) + Bidirectional Long Short-Term Memory (BiLSTM) with Connectionist Temporal Classification (CTC)
- **Supported Languages:** Bilingual (English, Bengali / `বাংলা`)
- **Framework:** EasyOCR v1.7.2, PyTorch v2.11.0+cu128, CUDA 12.8 (`sm_120`)

---

## Intended Use
- **Primary Use Case:** Optical character recognition, text transcription, and preliminary clinical entity parsing for medical prescriptions written in Bangladesh.
- **Intended Users:** Clinical researchers, health informatics developers, and supervised community health workers (CHWs) utilizing the ShasthoSetu mobile/web portal.
- **Deployment Mode:** Human-in-the-Loop (HITL) assistive triaging.

---

## Out-of-Scope & Contraindicated Uses
- ❌ **Unsupervised Medication Dispensing:** This model must NEVER be connected directly to automated pharmaceutical dispensing machinery or robotic pill organizers.
- ❌ **Direct-to-Consumer Unverified Scheduling:** The model MUST NOT directly set automated smartphone dosage alarms or medication reminders without prior user/physician confirmation.
- ❌ **Pediatric Weight-Based Dosing Calculation:** The model must never calculate or modify pediatric dosages dynamically based on OCR outputs.

---

## Factors & Performance Metrics
- **Dataset:** Image-to-Text Bilingual Dataset from Medical Prescriptions (Mendeley Data Version 2, Gazipur, Bangladesh).
- **Test Set Size:** 152 verified, leak-free prescription images.
- **Key Metrics:**
  - Character Error Rate (CER): 1.184 (Mean), 0.868 (Median)
  - Word Error Rate (WER): 1.420 (Mean), 1.000 (Median)
  - Mean Detection Boxes: 41.79 boxes / prescription
  - Mean Recognition Confidence: 0.3320 (33.2%)
  - Medicine Entity Recall: 6.96%
  - Mean Inference Latency: 698 ms per full prescription on NVIDIA GeForce RTX 5060 Ti

---

## Clinical Safety Guardrails
ShasthoSetu AI enforces a mandatory clinical triage policy:
1. **Confidence Thresholding:** Prescriptions with mean OCR confidence $< 0.55$ are automatically assigned `status: "UNVERIFIED_REQUIRES_HUMAN_REVIEW"`.
2. **Missing Entity Protection:** If no confirmed medication entity is resolved with high confidence, automated reminder scheduling is strictly blocked (`auto_reminder_permitted = False`).
3. **Safety Gate Audit Outcome:** In benchmark testing on 152 real-world prescriptions, the safety gate safely intercepted 140 low-confidence prescriptions (92.11%), preventing dangerous hallucinated dosage reminders from reaching patients.

---

## Hardware & Environmental Impact
- **Inference Hardware:** NVIDIA GeForce RTX 5060 Ti (16 GB GDDR7 VRAM, Blackwell architecture)
- **Host CPU:** AMD Ryzen / x64, 32 GB RAM, Windows 10
- **Total Test Inference Compute:** 106.26 seconds
- **Estimated Energy Consumption:** $\approx 0.0035\text{ kWh}$
- **Estimated Carbon Emissions:** $< 0.002\text{ kg CO}_2\text{eq}$
