# Model Compatibility & Remote Access Report
**Module:** `05_Bangla_Voice_AI`  
**Investigation Date:** 2026-11-18  
**Hardware Environment:** NVIDIA GeForce RTX 5060 Ti (16 GB VRAM) | CUDA 12.8 | PyTorch 2.11.0+cu128  
**Task:** TASK 03.1 — Verify compatibility of `vivasoft/whisper-small-bn` on Hugging Face before local training  

---

## 1. Executive Summary & Status

| Target / Component | Status | Finding | Action / Impact |
| :--- | :--- | :--- | :--- |
| **`vivasoft/whisper-small-bn`** | **`BLOCKED_WITH_REASON`** | **HTTP 401 Unauthorized** (Private / Gated repository) | Cannot download without organization access credentials. |
| **Drive C: Storage** | **`CRITICAL WARNING`** | **3.71 GB free** (190.83 GB total) | Standard HF cache destination would cause disk-full errors. |
| **Drive F: Storage** | **`MONITORED`** | **13.39 GB free** (309.22 GB total) | Project workspace directory. |
| **Drive G: Storage** | **`RECOMMENDED FOR CACHE`** | **110.60 GB free** (757.00 GB total) | Safe destination for future weights / checkpoints. |
| **Alternative Candidate** (`Noobbbbb/whisper-small-bn-v2`) | **`DISQUALIFIED`** | **Trained on `google/fleurs`** | Contaminated with our 6 evaluation audio clips. |
| **Alternative Candidate** (`anuragshas/whisper-small-bn`) | **`VIABLE FUTURE OPTION`** | Public, trained on Common Voice 11.0 (960 MB) | Uncontaminated with FLEURS; requires cache on G:. |

---

## 2. Storage & Disk Space Audit

Before executing any network pull or inference, local storage was audited across all connected drives:

```json
{
  "C:\\": {
    "total_gb": 190.83,
    "used_gb": 187.12,
    "free_gb": 3.71,
    "status": "CRITICAL_LOW_SPACE"
  },
  "F:\\": {
    "total_gb": 309.22,
    "used_gb": 295.82,
    "free_gb": 13.39,
    "status": "WORKSPACE_OPERATIONAL"
  },
  "G:\\": {
    "total_gb": 757.00,
    "used_gb": 646.40,
    "free_gb": 110.60,
    "status": "SAFE_CACHE_DESTINATION"
  }
}
```

> [!WARNING]
> The default Hugging Face cache directory (`C:\Users\ASHIK_CSE\.cache\huggingface\hub`) resides on Drive `C:`, which has only **3.71 GB** of free space. A Whisper-Small model checkpoint requires ~960 MB to 1.5 GB during download and extraction. If multiple checkpoints are cached on `C:`, drive exhaustion and runtime crashes will occur. Any future model downloads MUST set `HF_HOME=G:\hf_cache`.

---

## 3. Local Hugging Face Cache Inspection

An audit of `C:\Users\ASHIK_CSE\.cache\huggingface\hub` revealed the following cached models:

- `models--openai--whisper-base` (~290 MB) — **Present**
- `models--openai--whisper-tiny` (~150 MB) — **Present**
- `models--bartowski--Qwen2.5-Coder-14B-Instruct-abliterated-GGUF` — **Present**
- `models--smp-hub--resnet34.imagenet` — **Present**

**Finding:** `vivasoft/whisper-small-bn` was **not present** in the local cache.

---

## 4. Remote Probe of `vivasoft/whisper-small-bn`

An automated API probe was dispatched to Hugging Face Hub:
- **API Endpoint:** `https://huggingface.co/api/models/vivasoft/whisper-small-bn`
- **HTTP Status:** `401 Unauthorized`
- **Error Response:** `{"error": "Invalid username or password."}`
- **HF Request ID:** `Root=1-6afd97aa-172adb87350b049f3031bbc1`

### Analysis:
1. The organization `vivasoft` currently lists **0 public models** on Hugging Face.
2. The repository `vivasoft/whisper-small-bn` is either **private** or **gated**, requiring explicit membership or access token authorization from the Vivasoft team.
3. Without a valid Hugging Face access token with organization privileges, this model **cannot be cloned, downloaded, or evaluated**.
4. In accordance with task protocol, this condition triggers the decision: **`BLOCKED_WITH_REASON`**.

---

## 5. Investigation of Alternative Hugging Face Checkpoints

To evaluate whether any publicly available fine-tuned Bengali Whisper model could serve as an immediate drop-in replacement, existing Hugging Face models were audited for data integrity and license compliance:

### Candidate A: `Noobbbbb/whisper-small-bn-v2`
- **Status:** Public (HTTP 200, ~967 MB).
- **Training Data Declaration:** Its official model card explicitly states:
  ```yaml
  datasets:
    - google/fleurs
  ```
- **Contamination Risk:** **CRITICAL**. Our 6 human Bengali test audio clips (`bn_sample_01.wav` to `bn_sample_06.wav`) originate directly from the `google/fleurs` Bengali subset. Benchmarking `Noobbbbb/whisper-small-bn-v2` against these clips would evaluate the model on its own training distribution, yielding artificially deflated WER that constitutes severe data leakage.
- **Verdict:** **DISQUALIFIED** from objective evaluation.

### Candidate B: `anuragshas/whisper-small-bn`
- **Status:** Public (HTTP 200, ~960 MB).
- **Training Data Declaration:** Trained exclusively on Mozilla Common Voice 11.0 (Bengali).
- **Contamination Risk:** None for FLEURS clips.
- **Feasibility:** Viable for future benchmarking if cached on Drive `G:`.

---

## 6. Formal Decision

Under the constraints of TASK 03.1, the evaluation of `vivasoft/whisper-small-bn` is officially marked:

$$\mathbf{BLOCKED\_WITH\_REASON}$$

**Blocking Cause:** `HTTP 401 Unauthorized (Private/Gated Hugging Face Repository)`. No unauthenticated public weights exist for this model identifier.
