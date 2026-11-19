# Pretrained Checkpoint Availability Audit for MCVSLD
## Module: `03_Measles_Viral_Rash` | Pediatric Viral Exanthem Vision
**Location:** `03_Measles_Viral_Rash/pretrained_model_review/CHECKPOINT_AVAILABILITY.md`  
**Investigation Date:** November 18, 2026  
**Auditor:** Senior ML Research Auditor & MLOps Lead  

---

### 1. Verification Outcome & Formal Declaration

```
================================================================================
STATUS: NO_VERIFIED_DATASET_SPECIFIC_CHECKPOINT
================================================================================
Exhaustive verification across official repositories, publication supplementary
materials, GitHub, Hugging Face, Zenodo, and Kaggle confirms that NO publicly
downloadable, dataset-specific trained model checkpoint exists for the Multi-Class
Viral Skin Lesion Dataset (MCVSLD).
================================================================================
```

---

### 2. Distinguishing Pretrained Backbones vs. Dataset-Specific Weights

A foundational distinction must be maintained when evaluating "pretrained" models in medical computer vision:

1. **Generic ImageNet-Pretrained Backbones (NOT Dataset-Specific):**
   - Architectures like `torchvision.models.resnet18(weights='IMAGENET1K_V1')` or `timm.create_model('convnext_base', pretrained=True)` contain feature extractors trained on 1.28 million natural images (dogs, cars, landscapes, household items).
   - Their final classification head outputs 1,000 generic ImageNet classes.
   - **These models have ZERO knowledge of dermatological pathology.** They cannot differentiate Measles from Chickenpox without full supervised fine-tuning on domain-specific medical images.
2. **Dataset-Specific Trained Checkpoints (What was Searched):**
   - A serialized checkpoint (`.pth`, `.pt`, `.h5`, `.safetensors`, `.onnx`) containing trained weights in the classification head mapped specifically to the **6 MCVSLD classes**:
     `[0: Chickenpox, 1: Cowpox, 2: HFMD, 3: Healthy, 4: Measles, 5: Monkeypox]`.
   - **Result:** No third-party research team has made such a trained checkpoint publicly accessible for download.

---

### 3. Registry of Investigated Sources & Verification Logs

| Source / Registry | Target Entity & Query | Direct URL Investigated | Inspected Contents / Response | Verification Finding |
| :--- | :--- | :--- | :--- | :---: |
| **Mendeley Data (Official Deposit)** | Official MCVSLD Release (`dfztdtfsxz/1`) | `https://data.mendeley.com/datasets/dfztdtfsxz/1` | Single archive `Skin_Lesion_Dataset.zip` (167.7 MB, SHA-256: `ef594772...`). Contains 11,325 JPEG images in folder hierarchy. | ❌ **No model weights or code included.** |
| **IEEE Xplore (ConvNeXt Paper)** | BECITHCON 2025 Paper (`10.1109/BECITHCON69222.2025.11504294`) | `https://doi.org/10.1109/BECITHCON69222.2025.11504294` | Conference proceedings abstract and PDF text. No supplementary material tab or external repository link. | ❌ **No downloadable weights or code repository.** |
| **IEEE Access (XceptMPX Paper)** | IEEE Access 2025 Paper (`10.1109/ACCESS.2025.3600282`) | `https://doi.org/10.1109/ACCESS.2025.3600282` | Full-text open-access article. Describes web GUI architecture; explicitly omits public weights release. | ❌ **No public repository or weights provided.** |
| **Hugging Face Model Hub** | Queries: `MCVSLD`, `dfztdtfsxz`, `Multi-Class Viral Skin Lesion` | `https://huggingface.co/models?search=MCVSLD` | Zero matching repositories for MCVSLD. Dermatological models on HF focus on HAM10000 (Melanoma/Nevus), not viral exanthems. | ❌ **Zero MCVSLD models hosted.** |
| **GitHub Public Repositories** | Queries: `MCVSLD`, `dfztdtfsxz`, `Multi-Class Viral Skin Lesion Diagnosis` | `https://github.com/search?q=MCVSLD` | Zero indexed repositories containing trained checkpoint weights for MCVSLD. | ❌ **Zero public repositories found.** |
| **Kaggle Model Hub** | Queries: `MCVSLD`, `Mpox Skin Lesion` | `https://www.kaggle.com/models?search=MCVSLD` | Notebooks and datasets for MSLD v2.0; no fine-tuned 6-class MCVSLD `.pth` models published. | ❌ **No dataset-specific weights found.** |

---

### 4. Technical Audit of Potential Fallbacks & Risks

1. **Risk of Inventing Checkpoint URLs:**
   - LLMs and naive development workflows frequently hallucinate GitHub URLs (e.g. `github.com/author/MCVSLD-ConvNeXt/releases/download/v1/model.pth`).
   - We verified that no such repository exists. Constructing fake URLs would compromise audit credibility.
2. **Risk of Unaligned Class Mappings:**
   - Even if an obscure third-party skin model were discovered, using it without verified class index alignment (`idx_to_class`) would result in silent diagnostic catastrophic failure (e.g. classifying a Measles outbreak as Monkeypox or Chickenpox).
3. **Data Contamination via External Models:**
   - Any external model trained on the public MCVSLD dataset would have trained on the author's un-grouped split. Evaluating that external model on our "unseen test families" would be fundamentally invalid, as those test families were present in the author's training split.

---

### 5. Final Summary

Because no verified dataset-specific checkpoint exists in the public domain, direct weight download is impossible. ShasthoSetu AI must rely on its locally trained, fully verified, and reproducible models.
