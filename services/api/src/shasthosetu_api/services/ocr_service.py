from __future__ import annotations

import hashlib
import io
import json
import re
import time
from pathlib import Path
from typing import Any

import numpy as np
import pypdfium2 as pdfium
from PIL import Image, ImageOps
from pypdf import PdfReader

from ..config import settings
from ..core.security import new_id
from .ml_inference import (
    _clean_brand_name,
    _clean_duration,
    _clean_timing,
    _preprocess_prescription_for_ocr,
)
from .model_manager import (
    get_cached_model,
    get_model_lock,
    get_pytorch_device,
    record_runtime_status,
    release_ollama_model,
    set_cached_model,
    unload_pytorch_models,
)

MAX_OCR_BYTES = 10 * 1024 * 1024  # 10 MB
SUPPORTED_OCR_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}

_MED_LINE_RE = re.compile(
    r"(?:^|\b|\s)(?:rx\.?|tab\.?|tablet|cap\.?|capsule|syp\.?|syrup|susp\.?|inj\.?|ointment|oint\.?|drop|drops|ট্যাবলেট|ট্যাব|টযাব|ক্যাপসুল|ক্যাপ|কযাপ|সিরাপ|ইনজেকশন)[\s:\.\-]+([^\n]{2,65})",
    re.IGNORECASE,
)
_DOSE_ONLY_PREFIX_RE = re.compile(r"^\s*(?:dose|মাত্রা|মাতরা)\s*:", re.IGNORECASE)
_STRENGTH_RE = re.compile(
    r"(\b\d+(?:\.\d+)?[oO0]*(?:\+\d+(?:\.\d+)?[oO0]*)?|[০-৯]+(?:\.[০-৯]+)?)\s*(mg|ml|gm|g|mcg|iu|%|মি\.গ্রা|মিলিগ্রাম|মলিগিরাম|মলগিরাম|মি\.লি)(?:\b|\s|$)",
    re.IGNORECASE,
)
_FREQ_RE = re.compile(
    r"(\b[0-4০-৪]\s*[\+\-\*]\s*[0-4০-৪]\s*[\+\-\*]\s*[0-4০-৪]\b|\b(?:OD|BD|BID|TDS|TID|QDS|QID|SOS|PRN|HS|STAT)\b|once\s+daily|twice\s+daily|three\s+times\s+daily|দিনে\s+[১-৪একদুইতিন]+\s+বার|সকালে|রাতে)",
    re.IGNORECASE,
)
_DUR_RE = re.compile(
    r"(\b\d+\s*(?:days?|weeks?|months?|yr|d|w|m)\b|\b[০-৯]+\s*(?:দিন|সপ্তাহ|মাস|বছর)\b|চলবে)",
    re.IGNORECASE,
)
_ROUTE_RE = re.compile(
    r"\b(oral|po|topical|iv|im|sc|eye\s+drop|ear\s+drop|nasal|after\s+meal|before\s+meal|ac|pc|মুখে|খাবার\s+পর|খাবার\s+আগে|ভরা\s+পেটে|খালি\s+পেটে|বাহ্যিক)\b",
    re.IGNORECASE,
)


def _get_easyocr_reader(lang_mode: str = "en"):
    cache_key = f"ocr_easyocr_{lang_mode}"
    cached = get_cached_model(cache_key)
    if cached is not None:
        return cached
    import easyocr

    release_ollama_model()
    unload_pytorch_models(except_keys={cache_key, "ocr_easyocr"})
    record_runtime_status("ocr_easyocr", "LOADING", "M04-EASYOCR-PIPELINE-01", "loading")
    device, dev_label = get_pytorch_device(min_vram_mb=1500.0)
    langs = ["en"] if lang_mode == "en" else ["bn", "en"]
    reader = easyocr.Reader(langs, gpu=(device.type == "cuda"), verbose=False)
    set_cached_model(cache_key, reader)
    record_runtime_status("ocr_easyocr", "READY", "M04-EASYOCR-PIPELINE-01", dev_label)
    return reader


def _cluster_reading_lines(boxes: list[dict[str, Any]]) -> list[str]:
    """Group detected OCR bounding boxes into natural top-to-bottom, left-to-right lines."""
    if not boxes:
        return []
    ordered = sorted(boxes, key=lambda b: (round(b["y_pct"] / 2.2), b["x_pct"]))
    lines: list[list[dict[str, Any]]] = []
    for box in ordered:
        if not lines:
            lines.append([box])
            continue
        prev_y = lines[-1][0]["y_pct"]
        thresh = max(1.6, lines[-1][0]["h_pct"] * 0.55)
        if abs(box["y_pct"] - prev_y) <= thresh:
            lines[-1].append(box)
        else:
            lines.append([box])
    out: list[str] = []
    for grp in lines:
        grp.sort(key=lambda b: b["x_pct"])
        out.append(" ".join(b["text"] for b in grp).strip())
    return [ln for ln in out if ln]


_HEADER_RE = re.compile(
    r"(?:\b|^)(?:medicine|composition|dosage|timing|duration|quantity|hospital|ticket|বহির্বিভাগীয়|ফরম|তারিখ|চিকিৎসা)(?:\b|\s|$)",
    re.IGNORECASE,
)
_NUM_PREFIX_RE = re.compile(r"^\d+[\)\.\-]\s*")
_KNOWN_BRANDS_RE = re.compile(
    r"\b(?:abciximab|vomilast|zoclar|gestakind|roxim|maxpro|rolac|tnabil|trilock|afrin|beuflox|paracetamol|napa|ace|sergel|pantobex|monas|fexo|azithromycin|cefixime|amoxicillin|metformin|rosuvastatin|eslor|omidon|emistat)\b",
    re.IGNORECASE,
)


def extract_structured_medicine_candidates(raw_lines: list[str], mean_conf: float) -> list[dict[str, Any]]:
    """Extract provisional medicine fields with column splitting, multi-line generic binding, and uncertainty flags."""
    candidates: list[dict[str, Any]] = []

    for idx, line in enumerate(raw_lines):
        clean_line = line.strip()
        if not clean_line:
            continue
        if _HEADER_RE.search(clean_line) and not _MED_LINE_RE.search(clean_line) and not _KNOWN_BRANDS_RE.search(clean_line):
            continue

        m_med = _MED_LINE_RE.search(clean_line)
        has_num = bool(_NUM_PREFIX_RE.search(clean_line))
        has_brand = bool(_KNOWN_BRANDS_RE.search(clean_line))
        m_freq = _FREQ_RE.search(clean_line)
        m_dur = _DUR_RE.search(clean_line) or re.search(r"\b\d+\s*days\b|\(tot:[^\)]+\)", clean_line, re.IGNORECASE)

        is_primary = bool(m_med) or (has_num and (bool(m_freq) or bool(m_dur) or has_brand)) or (bool(m_freq) and bool(m_dur))

        if is_primary:
            # Segment line into medicine name, frequency, duration
            tokens = clean_line.split()
            med_tokens: list[str] = []
            freq_tokens: list[str] = []
            dur_tokens: list[str] = []

            for t in tokens:
                if _DUR_RE.search(t) or "day" in t.lower() or "tot" in t.lower():
                    dur_tokens.append(t)
                elif _FREQ_RE.search(t):
                    freq_tokens.append(t)
                else:
                    med_tokens.append(t)

            raw_name = " ".join(med_tokens).strip() or clean_line
            name = _clean_brand_name(raw_name)

            m_str = _STRENGTH_RE.search(clean_line) or _STRENGTH_RE.search(name)
            strength = f"{m_str.group(1)} {m_str.group(2)}" if m_str else "NEEDS_VERIFICATION"
            freq = " ".join(freq_tokens).strip() if freq_tokens else (m_freq.group(0).strip() if m_freq else _clean_timing(clean_line))
            dur = " ".join(dur_tokens).strip() if dur_tokens else (m_dur.group(0).strip() if m_dur else _clean_duration(clean_line))
            m_route = _ROUTE_RE.search(clean_line)
            route = m_route.group(0).strip() if m_route else "NEEDS_VERIFICATION"
            dose = "1 unit (Verify)" if freq != "NEEDS_VERIFICATION" else "NEEDS_VERIFICATION"

            candidates.append(
                {
                    "group_index": len(candidates),
                    "medicine_name": name[:90],
                    "strength": strength,
                    "dose": dose,
                    "frequency": freq,
                    "duration": dur,
                    "route": route,
                    "confidence": round(mean_conf, 4),
                    "needs_verification": True,
                    "is_verified": False,
                }
            )
            if len(candidates) >= 8:
                break
        elif candidates:
            # Secondary generic composition or continued dose subline
            m_str = _STRENGTH_RE.findall(clean_line)
            has_chem = m_str or any(
                kw in clean_line.lower()
                for kw in ["acid", "ip", "bp", "usp", "mg", "ml", "doxylamine", "pyridoxine", "clarithromycin", "isoxsuprine"]
            )
            if has_chem and candidates[-1]["strength"] == "NEEDS_VERIFICATION":
                candidates[-1]["strength"] = clean_line[:90]

            if m_freq and candidates[-1]["frequency"] == "NEEDS_VERIFICATION":
                candidates[-1]["frequency"] = m_freq.group(0).strip()

            if m_dur and candidates[-1]["duration"] == "NEEDS_VERIFICATION":
                candidates[-1]["duration"] = m_dur.group(0).strip()

    if not candidates and raw_lines:
        for i, ln in enumerate(raw_lines[:4]):
            if not ln.strip() or _HEADER_RE.search(ln):
                continue
            m_str = _STRENGTH_RE.search(ln)
            m_freq = _FREQ_RE.search(ln)
            m_dur = _DUR_RE.search(ln)
            m_route = _ROUTE_RE.search(ln)
            candidates.append(
                {
                    "group_index": len(candidates),
                    "medicine_name": ln[:90],
                    "strength": f"{m_str.group(1)} {m_str.group(2)}" if m_str else "NEEDS_VERIFICATION",
                    "dose": "NEEDS_VERIFICATION",
                    "frequency": m_freq.group(0).strip() if m_freq else "NEEDS_VERIFICATION",
                    "duration": m_dur.group(0).strip() if m_dur else "NEEDS_VERIFICATION",
                    "route": m_route.group(0).strip() if m_route else "NEEDS_VERIFICATION",
                    "confidence": round(mean_conf, 4),
                    "needs_verification": True,
                    "is_verified": False,
                }
            )
    return candidates


def run_bilingual_ocr_pipeline(file_bytes: bytes, filename: str) -> dict[str, Any]:
    """Validate JPG/PNG/WEBP/PDF, correct orientation, run EasyOCR bn+en, and extract bounding boxes."""
    t0 = time.perf_counter()
    if not file_bytes:
        raise ValueError("Uploaded file is empty.")
    if len(file_bytes) > MAX_OCR_BYTES:
        raise ValueError("Uploaded file exceeds 10 MB limit.")

    ext = Path(filename or "").suffix.lower()
    is_pdf = ext == ".pdf" or file_bytes[:4] == b"%PDF"
    if not is_pdf and ext and ext not in SUPPORTED_OCR_EXTS:
        raise ValueError(f"Unsupported prescription format '{ext}'. Accepted: JPG, PNG, WEBP, PDF.")

    sha256 = hashlib.sha256(file_bytes).hexdigest()
    page_images: list[Image.Image] = []
    pdf_text_lines: list[str] = []
    source_mime = "application/pdf" if is_pdf else "image/jpeg"

    if is_pdf:
        try:
            reader_pdf = PdfReader(io.BytesIO(file_bytes))
            for p in reader_pdf.pages[:5]:
                txt = (p.extract_text() or "").strip()
                if txt:
                    pdf_text_lines.extend([ln.strip() for ln in txt.splitlines() if ln.strip()])
        except Exception:
            pass

        try:
            doc = pdfium.PdfDocument(file_bytes)
            for p_idx in range(min(len(doc), 5)):
                page = doc[p_idx]
                bitmap = page.render(scale=2.0)
                pil_img = bitmap.to_pil().convert("RGB")
                page_images.append(pil_img)
            doc.close()
        except Exception as exc:
            if not pdf_text_lines:
                raise ValueError(f"Invalid or unreadable PDF prescription: {exc}") from exc
    else:
        try:
            probe = Image.open(io.BytesIO(file_bytes))
            probe.verify()
            img = Image.open(io.BytesIO(file_bytes))
            img = ImageOps.exif_transpose(img).convert("RGB")
            fmt = (probe.format or "").upper()
            source_mime = f"image/{fmt.lower()}" if fmt in {"JPEG", "PNG", "WEBP"} else "image/png"
            page_images = [img]
        except Exception as exc:
            raise ValueError(f"Invalid or corrupted image file: {exc}") from exc

    all_boxes: list[dict[str, Any]] = []
    all_lines: list[str] = []
    all_confs: list[float] = []
    page_dims: list[dict[str, int]] = []

    lock = get_model_lock()
    with lock:
        record_runtime_status("ocr_easyocr", "PROCESSING", "M04-EASYOCR-PIPELINE-01", "active")
        for p_idx, img in enumerate(page_images, start=1):
            w, h = img.size
            page_dims.append({"page": p_idx, "width": w, "height": h})
            prep_img, scale_x, scale_y = _preprocess_prescription_for_ocr(img)
            arr = np.array(prep_img)
            reader_en = _get_easyocr_reader("en")
            res_en = reader_en.readtext(arr, mag_ratio=1.5, text_threshold=0.6, low_text=0.3, contrast_ths=0.1, adjust_contrast=0.6) if reader_en else []
            en_conf = sum(c for _, _, c in res_en) / max(1, len(res_en)) if res_en else 0.0
            has_bn = any(any("\u0980" <= ch <= "\u09FF" for ch in t) for _, t, _ in res_en)
            if not has_bn and res_en:
                results = res_en
            else:
                reader_bn = _get_easyocr_reader("bn")
                res_bn = reader_bn.readtext(arr, mag_ratio=1.5, text_threshold=0.6, low_text=0.3, contrast_ths=0.1, adjust_contrast=0.6) if reader_bn else []
                bn_conf = sum(c for _, _, c in res_bn) / max(1, len(res_bn)) if res_bn else 0.0
                results = res_bn if (has_bn or (bn_conf > en_conf and bn_conf >= 0.5)) else res_en

            page_boxes: list[dict[str, Any]] = []
            for pts, text, conf in results:
                clean = str(text).strip()
                if not clean:
                    continue
                xs = [float(p[0]) * scale_x for p in pts]
                ys = [float(p[1]) * scale_y for p in pts]
                x_pct = round(max(0.0, min(98.0, (min(xs) / max(1, w)) * 100.0)), 2)
                y_pct = round(max(0.0, min(98.0, (min(ys) / max(1, h)) * 100.0)), 2)
                w_pct = round(max(1.0, min(100.0 - x_pct, ((max(xs) - min(xs)) / max(1, w)) * 100.0)), 2)
                h_pct = round(max(1.0, min(100.0 - y_pct, ((max(ys) - min(ys)) / max(1, h)) * 100.0)), 2)
                c_val = round(float(conf), 4)
                box = {
                    "page": p_idx,
                    "text": clean,
                    "confidence": c_val,
                    "uncertain": c_val < 0.75,
                    "x_pct": x_pct,
                    "y_pct": y_pct,
                    "w_pct": w_pct,
                    "h_pct": h_pct,
                }
                page_boxes.append(box)
                all_boxes.append(box)
                all_confs.append(c_val)
            all_lines.extend(_cluster_reading_lines(page_boxes))

    # Merge native PDF text if EasyOCR found nothing on a pure digital PDF
    if is_pdf and not all_lines and pdf_text_lines:
        all_lines = pdf_text_lines
        all_confs = [0.85 for _ in pdf_text_lines]

    mean_conf = round(float(sum(all_confs) / len(all_confs)), 4) if all_confs else 0.0
    candidates = extract_structured_medicine_candidates(all_lines, mean_conf)
    uncertain_count = sum(1 for b in all_boxes if b["uncertain"])

    # Normalize stored preview asset to PNG/JPEG bytes (keeps medical_documents mime_type CHECK happy)
    vault_dir = settings.ocr_vault_dir
    vault_dir.mkdir(parents=True, exist_ok=True)
    stored_paths: list[str] = []
    if page_images:
        for p_idx, p_img in enumerate(page_images, start=1):
            fname_out = f"{new_id('ocrimg')}_p{p_idx}.png"
            out_path = vault_dir / fname_out
            p_img.save(out_path, format="PNG")
            stored_paths.append(str(out_path))
        doc_mime = "application/pdf" if is_pdf else ("image/jpeg" if source_mime == "image/jpeg" else "image/png")
    else:
        doc_mime = "application/pdf"

    has_bn = any("\u0980" <= ch <= "\u09FF" for ch in "\n".join(all_lines))
    has_en = any(("a" <= ch <= "z") or ("A" <= ch <= "Z") for ch in "\n".join(all_lines))
    script_mix = "mixed" if (has_bn and has_en) else ("bn" if has_bn else "en")

    record_runtime_status("ocr_easyocr", "READY", "M04-EASYOCR-PIPELINE-01", "ready")
    latency_ms = int((time.perf_counter() - t0) * 1000)

    return {
        "model_id": "M04-EASYOCR-PIPELINE-01",
        "engine_label": "EasyOCR (bn+en) + PyPDFium2" if is_pdf else "EasyOCR (bn+en)",
        "is_pdf": is_pdf,
        "source_mime_type": source_mime,
        "doc_mime_type": doc_mime,
        "sha256": sha256,
        "page_count": max(1, len(page_images)),
        "page_dims": page_dims,
        "stored_paths": stored_paths,
        "script_mix": script_mix,
        "mean_confidence": mean_conf,
        "token_count": len(all_boxes) if all_boxes else len(all_lines),
        "uncertain_tokens_count": uncertain_count,
        "raw_lines": all_lines,
        "raw_text": "\n".join(all_lines),
        "bounding_boxes": all_boxes,
        "candidates": candidates,
        "latency_ms": latency_ms,
        "verification_required": True,
        "reminder_auto_enabled": False,
    }
