# Provenance, Metadata & Usage Rights Audit
## ShasthoSetu AI — 05_Bangla_Voice_AI Module

---

### 1. Dataset Provenance & Attribution
- **Dataset Title:** FLEURS Bengali Speech Recognition Benchmark (`bn_in`)
- **Origin & Host:** Google Research / Hugging Face Datasets (`google/fleurs`)
- **Citation:** Conneau et al., *FLEURS: Few-shot Learning Evaluation of Universal Representations of Speech*, IEEE SLT 2022.
- **Language & Region:** Bengali (`bn` / `bn_in`, South Asian Bengali dialect).
- **Audio Quality:** Studio and mobile acoustic recordings sampled at uncompressed 16,000 Hz (16-bit PCM WAV).
- **Transcripts:** Native-speaker verified Bengali orthographic transcripts with synchronized utterance alignment.

---

### 2. Legal Usage Rights & Licensing Audit
- **License Classification:** Creative Commons Attribution 4.0 International (`CC BY 4.0`).
- **Permitted Uses:** Academic research, commercial development, model evaluation, and software adaptation.
- **Verification Status:** **APPROVED & FULLY COMPLIANT**.

---

### 3. Clinical Safety & Medical Speech Boundary
- **Acoustic Generalization vs. Medical Lexicon:**
  - Standard acoustic models (e.g. Whisper, Wav2Vec2) achieve high transcription accuracy on conversational and formal Bengali.
  - **Clinical Warning:** In specialized medical consultations, physicians use dense pharmacology terms (e.g. *অ্যাজিথ্রোমাইসিন*, *ডেক্সামেথাসন*, *হাইপোগ্লাইসেমিয়া*), mixed English brand names (*Napa Extra*, *Monas 10*), and rapid numeric dosage dictation (*১+০+১*).
  - General ASR models MUST NOT be used for unsupervised clinical charting or prescription transcription without pharmacist or physician review.
- **Module Isolation:** Operates strictly independent of `01_PCOS_Clinical`, `02_PCOS_Ultrasound`, `03_Measles_Viral_Rash`, and `04_Prescription_OCR`.
