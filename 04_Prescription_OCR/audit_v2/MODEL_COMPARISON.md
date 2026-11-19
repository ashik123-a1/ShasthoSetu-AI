# ⚖️ ShasthoSetu AI — Model Architecture Comparison & Development Evaluation (Audit V2)

**Audit Version:** 2.0.0  
**Date:** 2026-11-18  
**Evaluation Set:** Validation Split ($N=35$ Development Prescriptions)  
**Hardware:** NVIDIA GeForce RTX 5060 Ti 16GB (CUDA 12.8 / `sm_120`)  

---

## 1. Experimental Setup & Comparative Pipelines

To improve the OCR baseline responsibly without modifying or biasing the held-out test split, we evaluated two architectural configurations exclusively on development data from the **Validation Split**:

```mermaid
flowchart TD
    subgraph "Pipeline 1: Baseline v1 (Off-the-Shelf)"
        A1["Raw Photographic Image"] --> B1["Default CRAFT Detector"]
        B1 --> C1["Unsorted Bounding Boxes (Detection Order)"]
        C1 --> D1["ResNet-BiLSTM Recognizer"]
        D1 --> E1["Fragmented OCR Stream"]
    end

    subgraph "Pipeline 2: Enhanced v2 (Clinical Preprocessing & Reading-Order Sorting)"
        A2["Raw Photographic Image"] --> P2["CLAHE Contrast Equalization + Bilateral Filter"]
        P2 --> B2["Tuned CRAFT Detector (Text=0.6, Link=0.3, Low=0.3)"]
        B2 --> C2["2D Topological Line Grouping (Top-Down, Left-Right)"]
        C2 --> D2["ResNet-BiLSTM Recognizer"]
        D2 --> E2["Spatially Coherent OCR Stream"]
    end
```

---

## 2. Quantitative Benchmark Results on Development Split

The comparison was executed head-to-head across 35 representative validation prescriptions:

| Benchmark Metric | Pipeline 1 (Baseline v1) | Pipeline 2 (Enhanced v2) | Relative Improvement |
| :--- | :---: | :---: | :---: |
| **Mean Inference Latency** | 0.727 seconds | **0.607 seconds** | **16.5% Faster** (Noise reduction) |
| **Mean Detected Text Boxes** | 41.86 boxes | **34.46 boxes** | **17.7% Fewer Spurious Boxes** |
| **Mean Confidence Score** | 0.3148 | 0.3023 | Comparable |
| **Mean Character Error Rate (CER)** | 0.9257 | **0.8804** | **-4.53% Error Reduction** |
| **Median Character Error Rate (CER)** | 0.8694 | **0.8353** | **-3.41% Error Reduction** |
| **Mean Word Error Rate (WER)** | 1.0902 | **1.0337** | **-5.65% Error Reduction** |

---

## 3. Key Technical & Qualitative Findings

### 3.1. Impact of 2D Topological Reading-Order Sorting
In Pipeline 1, EasyOCR returned bounding boxes in arbitrary detection order (frequently jumping between the clinic letterhead, bottom signature, and central prescription body). This broke up contiguous medication lines (e.g. separating `"Tab."` from `"Anuva 50"` and `"1+0+1"`).

In Pipeline 2, our vertical tolerance clustering algorithm (`\Delta y < 0.5 \times \text{height}`) groups tokens into coherent horizontal lines before sorting left-to-right. This ensures that clinical entities remain adjacent, significantly improving downstream entity parsing.

### 3.2. Contrast Enhancement (CLAHE + Bilateral Filtering)
Bangladeshi clinics often feature uneven fluorescent lighting and mobile phone camera shadows. Applying CLAHE (`clipLimit=2.0`, `tileGridSize=(8,8)`) restores faint ballpoint pen ink strokes, while the bilateral filter suppresses textured paper grain. This eliminated spurious detections on blank margins, reducing average box count from 41.86 to 34.46 and boosting throughput to 0.607s per page.

---

## 4. Feasibility of Compact Model Fine-Tuning

We investigated the technical feasibility of fine-tuning a compact recognition model (e.g. TrOCR or CRNN) on this dataset:

1. **Absence of Line-Level / Word-Level Ground Truth:**
   - Mendeley Version 2 provides only full-page images paired with multi-line narrative sentences.
   - It contains **zero bounding-box coordinates** mapping words or lines to image crops.
2. **Scientific Anti-Pattern: Inventing Ground Truth:**
   - Inventing bounding boxes or using unverified heuristic cropping would train the model on pseudo-labels, reinforcing hallucinated transcriptions into model weights.
3. **Conclusion:**
   - Supervised fine-tuning of recognition heads is scientifically deferred until human line-level segmentations are curated.
   - For page-level end-to-end processing, vision-encoder-decoder models (e.g. Donut / Nougat) trained with document-to-JSON objectives represent the optimal future architecture.
