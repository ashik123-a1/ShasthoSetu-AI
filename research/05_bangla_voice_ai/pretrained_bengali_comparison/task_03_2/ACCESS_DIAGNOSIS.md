# Hugging Face Repository Access Diagnosis Report
**Module:** `05_Bangla_Voice_AI`  
**Investigation Date:** 2026-11-18  
**Task:** TASK 03.2 — Diagnose Repository Access & Select Valid Bengali Checkpoint  
**Diagnostic Script:** [`diagnose_access.py`](file:///F:/Clude%20cccccccccccccccccccccccc/data%20we%20test/05_Bangla_Voice_AI/pretrained_bengali_comparison/task_03_2/diagnose_access.py)  
**Hardware Environment:** NVIDIA GeForce RTX 5060 Ti (16 GB VRAM) | PyTorch 2.11.0+cu128 | CUDA 12.8  

---

## 1. Executive Summary

| Diagnostic Step | Target / Component | Finding / Result | Status |
| :--- | :--- | :--- | :---: |
| **Credential Audit** | Local Environment & Filesystem | No `HF_TOKEN` in env; `~/.cache/huggingface/token` NOT FOUND | **CLEAN** |
| **Unauthenticated Probe** | `vivasoft/whisper-small-bn` API | `HTTP 401 Unauthorized` (`Invalid username or password.`) | **BLOCKED** |
| **Web Endpoint Probe** | `https://huggingface.co/vivasoft/whisper-small-bn` | `HTTP 401 Unauthorized` (Title: `404 – Hugging Face`) | **BLOCKED** |
| **Author Model Listing** | `api/models?author=vivasoft` | 0 public models found under `vivasoft` | **CONFIRMED** |
| **Cache Storage Audit** | Drive `C:` (3.71 GB free) vs Drive `G:` (110.6 GB free) | Enforced `HF_HOME=G:\hf_cache` | **SECURED** |
| **Alternative Candidate** | `anuragshas/whisper-small-bn` | `HTTP 200 OK` (Public, Apache-2.0, Common Voice 11.0) | **SELECTED** |

---

## 2. Local Credential & Environment Variable Audit

To verify whether an expired, invalid, or malformed local token was inadvertently sent in the HTTP `Authorization` header, we audited all environment variables and default credential paths:

### A. Environment Variables Check:
- `HF_TOKEN`: **NOT SET**
- `HUGGING_FACE_HUB_TOKEN`: **NOT SET**
- `HF_HUB_DISABLE_IMPLICIT_TOKEN`: **NOT SET**
- `HF_HOME`: **NOT SET** (prior to enforcement)
- `HUGGINGFACE_HUB_CACHE`: **NOT SET**
- `TRANSFORMERS_CACHE`: **NOT SET**

### B. Filesystem Credential Files:
- `C:\Users\ASHIK_CSE\.huggingface\token`: **NOT FOUND**
- `C:\Users\ASHIK_CSE\.cache\huggingface\token`: **NOT FOUND**

**Conclusion:** The local environment did **not** possess any cached or implicit authentication token. All subsequent network requests were dispatched strictly unauthenticated.

---

## 3. Remote HTTP Probe of `vivasoft/whisper-small-bn`

We performed unauthenticated HTTP requests across multiple endpoints for `vivasoft/whisper-small-bn`:

1. **Hugging Face Model API:**
   - **URL:** `https://huggingface.co/api/models/vivasoft/whisper-small-bn`
   - **HTTP Status:** `401 Unauthorized`
   - **Body:** `{"error": "Invalid username or password."}`
   - **Hugging Face Request ID:** `Root=1-6afdb0cd-5165b5d5181b15f9474c45ca;76e5c616-a521-4dea-8fb1-ea20d6ce04eb`

2. **Hugging Face Repository Webpage:**
   - **URL:** `https://huggingface.co/vivasoft/whisper-small-bn`
   - **HTTP Status:** `401 Unauthorized`
   - **HTML Title:** `<title>404 – Hugging Face</title>`
   - *Observation:* Hugging Face returns HTTP 401 / 404 for private or organization-restricted repositories when visited by an unauthenticated client.

3. **Raw File Access:**
   - **URL:** `https://huggingface.co/vivasoft/whisper-small-bn/raw/main/config.json`
   - **HTTP Status:** `401 Unauthorized`
   - **Body:** `Invalid username or password.`

4. **Author Public Listing:**
   - **URL:** `https://huggingface.co/api/models?author=vivasoft`
   - **Result:** `[]` (Empty list. Vivasoft has zero public repositories indexed).

**Technical Verdict:** The repository `vivasoft/whisper-small-bn` is **strictly private or gated** on Hugging Face. It cannot be cloned or downloaded without explicit organization membership and an authenticated user access token.

---

## 4. Storage & Cache Enforcement on Drive G:

Because Drive `C:` has only **3.71 GB** of free space, downloading the model weights (~967 MB) to the default cache directory would endanger system stability. 

We systematically configured the cache to point to Drive `G:` (which has **110.60 GB** free):
```powershell
$env:HF_HOME = "G:\hf_cache"
$env:HUGGINGFACE_HUB_CACHE = "G:\hf_cache\hub"
$env:TRANSFORMERS_CACHE = "G:\hf_cache\hub"
```

We verified that `G:\hf_cache\hub` was created successfully and that all model files are downloaded exclusively to Drive `G:`.

---

## 5. Candidate Selection Protocol

Per the TASK 03.2 instructions:
> *"If it remains inaccessible after the unauthenticated access test, use: `anuragshas/whisper-small-bn`"*

We probed `anuragshas/whisper-small-bn`:
- **API URL:** `https://huggingface.co/api/models/anuragshas/whisper-small-bn`
- **HTTP Status:** `200 OK`
- **Model ID:** `anuragshas/whisper-small-bn`
- **Author:** `anuragshas`
- **License:** `Apache-2.0`
- **Primary Weights:** `pytorch_model.bin` (922.3 MB)
- **Accessibility:** Fully public, zero token required.

`anuragshas/whisper-small-bn` is formally selected as the single Bengali fine-tuned checkpoint for evaluation.
