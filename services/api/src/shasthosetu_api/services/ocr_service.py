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
    r"(\b\d+(?:\.\d+)?[oO0]*(?:\+\d+(?:\.\d+)?[oO0]*)?|[০-৯]+(?:\.[০-৯]+)?)\s*(mg|ml|gm|g|mcg|iu|%|মি\.গ্রা|মিলিগ্রাম|মলিগিরাম|মলগিরাম|মি\.লি)\b",
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


def _get_easyocr_reader():
    cached = get_cached_model("ocr_easyocr")
    if cached is not None:
        return cached
    import easyocr

    release_ollama_model()
    unload_pytorch_models(except_keys={"ocr_easyocr"})
    record_runtime_status("ocr_easyocr", "LOADING", "M04-EASYOCR-PIPELINE-01", "loading")
    device, dev_label = get_pytorch_device(min_vram_mb=1500.0)
    reader = easyocr.Reader(["bn", "en"], gpu=(device.type == "cuda"), verbose=False)
    set_cached_model("ocr_easyocr", reader)
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


def extract_structured_medicine_candidates(raw_lines: list[str], mean_conf: float) -> list[dict[str, Any]]:
    """Extract provisional medicine fields with explicit uncertainty flags — never auto-trusted."""
    candidates: list[dict[str, Any]] = []
    consumed_lines: set[int] = set()

    for idx, line in enumerate(raw_lines):
        if idx in consumed_lines:
            continue
        m_med = _MED_LINE_RE.search(line)
        if _DOSE_ONLY_PREFIX_RE.search(line) and not m_med:
            consumed_lines.add(idx)
            continue

        m_str = _STRENGTH_RE.search(line)
        m_freq = _FREQ_RE.search(line)
        m_dur = _DUR_RE.search(line)
        m_route = _ROUTE_RE.search(line)

        if m_med or m_str or m_freq:
            consumed_lines.add(idx)
            # Combine context from the immediate next line if dosing sits on line idx+1
            if idx + 1 < len(raw_lines):
                next_line = raw_lines[idx + 1]
                next_is_dose_cont = (
                    not _MED_LINE_RE.search(next_line)
                    and not _STRENGTH_RE.search(next_line)
                    and (
                        bool(_DOSE_ONLY_PREFIX_RE.search(next_line))
                        or bool(_FREQ_RE.search(next_line))
                        or bool(_DUR_RE.search(next_line))
                        or bool(_ROUTE_RE.search(next_line))
                    )
                )
                if next_is_dose_cont:
                    if not m_freq:
                        m_freq = _FREQ_RE.search(next_line)
                    if not m_dur:
                        m_dur = _DUR_RE.search(next_line)
                    if not m_route:
                        m_route = _ROUTE_RE.search(next_line)
                    consumed_lines.add(idx + 1)

            med_name = (m_med.group(0) if m_med else line).strip()[:90]
            strength = f"{m_str.group(1)} {m_str.group(2)}" if m_str else "NEEDS_VERIFICATION"
            freq = m_freq.group(0).strip() if m_freq else "NEEDS_VERIFICATION"
            dur = m_dur.group(0).strip() if m_dur else "NEEDS_VERIFICATION"
            route = m_route.group(0).strip() if m_route else "NEEDS_VERIFICATION"
            dose = "1 unit (Verify)" if freq != "NEEDS_VERIFICATION" else "NEEDS_VERIFICATION"

            candidates.append(
                {
                    "group_index": len(candidates),
                    "medicine_name": med_name,
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

    if not candidates and raw_lines:
        for i, ln in enumerate(raw_lines[:4]):
            m_str = _STRENGTH_RE.search(ln)
            m_freq = _FREQ_RE.search(ln)
            m_dur = _DUR_RE.search(ln)
            m_route = _ROUTE_RE.search(ln)
            candidates.append(
                {
                    "group_index": i,
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
        ocr_reader = _get_easyocr_reader() if page_images else None
        record_runtime_status("ocr_easyocr", "PROCESSING", "M04-EASYOCR-PIPELINE-01", "active")
        for p_idx, img in enumerate(page_images, start=1):
            w, h = img.size
            page_dims.append({"page": p_idx, "width": w, "height": h})
            arr = np.array(img)
            results = ocr_reader.readtext(arr) if ocr_reader else []
            page_boxes: list[dict[str, Any]] = []
            for pts, text, conf in results:
                clean = str(text).strip()
                if not clean:
                    continue
                xs = [float(p[0]) for p in pts]
                ys = [float(p[1]) for p in pts]
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
