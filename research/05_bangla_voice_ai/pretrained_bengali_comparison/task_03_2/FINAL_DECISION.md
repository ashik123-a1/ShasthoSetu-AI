# Final Technical Decision — TASK 03.2 (Bengali Pretrained ASR Verification)
**Module:** `05_Bangla_Voice_AI`  
**Decision Date:** 2026-11-18  
**Selected & Verified Checkpoint:** [`anuragshas/whisper-small-bn`](https://huggingface.co/anuragshas/whisper-small-bn) (Apache-2.0, trained on Mozilla Common Voice 11.0 Bengali)  
**Hardware Platform:** NVIDIA GeForce RTX 5060 Ti (16 GB VRAM)  
**Cache Location:** `G:\hf_cache\hub`  

---

## 1. Formal Return Code

$$\mathbf{BENGALI\_MODEL\_IMPROVED}$$

---

## 2. Basis for Decision

1. **Unauthenticated Access Diagnosis Completed (`ACCESS_DIAGNOSIS.md`):**
   - Verified no stale/expired Hugging Face credentials exist locally (`HF_TOKEN` unset; `~/.cache/huggingface/token` absent).
   - Unauthenticated probes to `vivasoft/whisper-small-bn` (Model API, web page, and raw config URL) consistently returned `HTTP 401 Unauthorized` (`Invalid username or password.`), and `api/models?author=vivasoft` returned `[]`.
   - Per TASK 03.2 fallback rules, we proceeded without requesting user tokens and selected the verified public Apache-2.0 checkpoint `anuragshas/whisper-small-bn` (`HTTP 200 OK`), cached exclusively on Drive `G:`.

2. **Verified Cross-Corpus Generalization (`SELECTED_MODEL_PROVENANCE.md`):**
   - `anuragshas/whisper-small-bn` was fine-tuned strictly on **Mozilla Common Voice 11.0 (Bengali)**.
   - Our evaluation audio comes strictly from **Google FLEURS (Bengali)** — zero training-test overlap.

3. **Decisive Improvement Over Baseline (`BENGALI_ASR_COMPARISON.md`):**
   - **Smoke Test (6 existing clips, 2 distinct sentences):**
     - Bengali Unicode Script: **0.00% → 97.68%**
     - Corpus Normalized WER: **117.33% → 33.33%** (-84.00 pp)
     - Corpus Normalized CER: **99.31% → 8.97%** (-90.34 pp)
   - **Extended Broader Check (20 distinct sentences, 20 distinct speakers, Seed=42):**
     - Bengali Unicode Script: **0.00% → 98.58%**
     - Corpus Normalized WER: **266.01% → 40.15%** (-225.86 pp)
     - Corpus Normalized CER: **187.96% → 14.16%** (-173.80 pp)
   - **Combined 26 Clips (22 distinct sentences):**
     - Corpus Normalized WER: **242.83% → 39.09%**
     - Corpus Normalized CER: **175.62% → 13.44%**
     - Peak GPU VRAM: **1,097.13 MB** (~1.07 GB on 16 GB RTX 5060 Ti); Median Latency: **2.14 s**.

---

## 3. Bilingual Architecture & Clinical Safety Preservation

Per TASK 03.2 Step 5, **the demo default model has NOT been automatically modified**. When integrating this verified model upon user approval, the following architecture and clinical guardrails MUST be enforced:

| Speech Mode | Engine / Model | Status | Operational Rule |
| :--- | :--- | :--- | :--- |
| **English** | `openai/whisper-base` (existing) | **Preserved** | Keep existing English engine (validated 5.36% WER on synthetic English). Do NOT route English through the Bengali-only checkpoint. |
| **Bengali** | `anuragshas/whisper-small-bn` | **Verified Candidate** | Ready for opt-in Bengali routing once approved. Must use `HF_HOME=G:\hf_cache`, updated `GenerationConfig`, and `max_new_tokens=440` (or audio chunking for >15s). |
| **Mixed Bangla-English** | Dual-mode / Experimental | **Experimental Draft** | Remains strictly experimental until evaluated on real human code-switching clinical speech. |

### Mandatory Clinical Safety Rules:
1. **Editable, Non-Actionable Drafts Only:** With 33%–40% normalized WER (8.97%–14.16% CER) and 0% exact-match rate on out-of-domain speech, human clinician review and manual editing are strictly required before any text is finalized.
2. **Prohibited Automations:** Direct EHR writes, automated prescription generation, and automated medication reminders remain **permanently disabled**.
3. **Honest Scope Disclosure:** Medical-term recall on FLEURS remains **`N/A`**. Real human Bengali clinical dictation benchmarking is still needed before making clinical-domain accuracy claims.

---

## 4. Technical Implementation Notes for Future Integration

If approved to wire `anuragshas/whisper-small-bn` into the ShasthoSetu AI demo app:
1. **Cache Pinning:** Set `HF_HOME=G:\hf_cache` to keep Drive `C:` protected.
2. **Transformers Compatibility:** Attach `GenerationConfig.from_pretrained("openai/whisper-small", cache_dir=r"G:\hf_cache\hub")` before calling `.generate(language="bengali", task="transcribe")`.
3. **Prevent Multi-Byte Truncation:** Always set `max_new_tokens=440` (never `128`) and chunk audio longer than ~15 seconds, as Bengali UTF-8 characters require 2–3 BPE tokens each.
4. **No Local Training Needed Yet:** Because an open Apache-2.0 checkpoint already drops Bengali CER from 175.6% to 13.4% with zero local training cost, immediate GPU fine-tuning is **not required** for the research demo milestone.
