# Pretrained Bengali Voice Model Decision & Deployment Directives
**Module:** `05_Bangla_Voice_AI`  
**Decision Date:** 2026-11-18  
**Hardware Platform:** NVIDIA GeForce RTX 5060 Ti (16 GB VRAM)  
**Task:** TASK 03.1 — Formal Decision on Pretrained Bengali Checkpoint vs. Baseline Models  

---

## 1. Formal Technical Decision

Under the criteria established for TASK 03.1, the evaluation of the external model `vivasoft/whisper-small-bn` yields the official outcome:

$$\mathbf{BLOCKED\_WITH\_REASON}$$

### Specific Grounds for Determination:
1. **Repository Access Restriction:** Probing the Hugging Face API (`https://huggingface.co/api/models/vivasoft/whisper-small-bn`) returned `HTTP 401 Unauthorized` with the error `Invalid username or password.` (Request ID: `Root=1-6afd97aa-172adb87350b049f3031bbc1`). The repository is private or gated by the Vivasoft organization and cannot be pulled without authenticated credentials.
2. **Baseline Inadequacy for Bengali Script:** Live GPU benchmarking on 6 human FLEURS Bengali audio clips demonstrated that the existing OpenAI baselines (`whisper-tiny` and `whisper-base`) are fundamentally incapable of transcribing Bengali Unicode script:
   - `openai/whisper-tiny`: **227.78% mean WER**, **0.0% Bengali Unicode characters** (severe repetition loops).
   - `openai/whisper-base`: **120.55% mean WER**, **0.0% Bengali Unicode characters** (script-drift into Romanized Banglish).
3. **Data Leakage in Public Alternatives:** Publicly accessible alternative `Noobbbbb/whisper-small-bn-v2` explicitly lists `google/fleurs` in its training manifest, disqualifying it from serving as an independent benchmark against our FLEURS evaluation set.

---

## 2. Immediate Clinical Safety & Operational Boundaries

To maintain research integrity and medical safety across ShasthoSetu AI, the following operational boundaries are enforced immediately:

1. **English Speech Recognition Maintained:**  
   `openai/whisper-base` remains active as the primary English ASR engine. It achieved **5.36% WER** on synthetic clinical English dictations and processes speech in ~184 ms on the local RTX 5060 Ti GPU.
2. **Bengali Voice Transcription Flagged as Inactive / Draft Only:**  
   Until a verified Bengali fine-tuned checkpoint is integrated, the system will **not** present Bengali speech transcriptions as clinically verified text. 
3. **Mandatory Human-in-the-Loop Protocol:**  
   All speech recognition outputs are strictly classified as **"Editable Draft Notes"**. Direct, automated writing into Electronic Health Records (EHR), automated prescription generation, and automated medication reminder triggers are permanently prohibited in system logic. A licensed clinician must review, edit, and sign off on all text.
4. **No Premature Medical Term Claims:**  
   Medical entity extraction from speech is strictly reported as **`N/A`** on general FLEURS clips.

---

## 3. Storage Allocation Directives

Due to the storage audit findings:
- **Drive `C:` (3.71 GB free):** Storing model weights or caching checkpoints on `C:` is strictly prohibited.
- **Drive `G:` (110.60 GB free):** Designate `G:\hf_cache` as the global storage location for any future Hugging Face models by exporting:
  ```powershell
  $env:HF_HOME = "G:\hf_cache"
  ```

---

## 4. Strategic Next Options (For User Selection)

To resolve the Bengali Voice AI capability cleanly without compromising scientific rigor, the user may choose one of the following three routes:

### Option A: Provide Hugging Face Access Token for Vivasoft
If the user or their team possesses authorized access to `vivasoft/whisper-small-bn`:
- Provide a Hugging Face user access token (`hf_...`) with read permissions.
- The model will be cached directly to `G:\hf_cache` and evaluated against the 6 FLEURS clips.

### Option B: Evaluate an Uncontaminated Public Bengali Checkpoint (Recommended Next Step)
Evaluate an open-source Bengali checkpoint that has **not** been trained on FLEURS:
- **Candidate:** `anuragshas/whisper-small-bn` (trained exclusively on Mozilla Common Voice 11.0 Bengali, ~960 MB, public on Hugging Face).
- **Execution:** Download to `G:\hf_cache`, run identical GPU inference benchmark using `run_comparison.py`, and measure Bengali Unicode character percentage, CER, and WER.

### Option C: Parameter-Efficient Local Fine-Tuning (LoRA / QLoRA)
Fine-tune Whisper-Base or Whisper-Small locally using the available hardware:
- **Hardware Capacity:** NVIDIA GeForce RTX 5060 Ti with 16 GB VRAM has ample headroom for 4-bit / 8-bit QLoRA fine-tuning (peak training VRAM estimated at ~6–8 GB).
- **Dataset:** OpenSLR 53 (Shruti Bengali Speech Corpus, ~229 hours of crowdsourced Bengali audio).
- **Advantage:** Full transparency, verifiable training-validation-test separation, and zero external authentication dependencies.
